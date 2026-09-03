<?php

namespace App\Services;

use App\Models\Student;
use App\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentLifecycleService
{
    public function __construct(private TenantContext $tenant) {}

    public function profile(int $id): array
    {
        $student = Student::findOrFail($id);
        $tid = $this->tenant->id();
        $invoices = DB::table('Invoices')->leftJoin('InvoiceItems', 'Invoices.InvoiceId', '=', 'InvoiceItems.InvoiceId')->leftJoin('FeeTypes', 'InvoiceItems.FeeTypeId', '=', 'FeeTypes.FeeTypeId')->where('Invoices.TenantId', $tid)->where('Invoices.StudentId', $id)->select('Invoices.*', 'FeeTypes.FeeTypeName')->distinct()->orderByDesc('Invoices.InvoiceId')->get()->map(function ($invoice) {
            $invoice->PaidAmount = max(0, (float) $invoice->Total - (float) $invoice->Balance);
            $invoice->PaymentStatus = (float) $invoice->Balance <= 0 ? 'paid' : (now()->startOfDay()->gt(\Carbon\Carbon::parse($invoice->DueDate)) ? 'overdue' : ($invoice->PaidAmount > 0 ? 'partially_paid' : 'unpaid'));

            return $invoice;
        });

        return ['student' => $student, 'guardians' => DB::table('Guardians')->join('StudentGuardians', 'Guardians.GuardianId', '=', 'StudentGuardians.GuardianId')->where('StudentGuardians.TenantId', $tid)->where('StudentGuardians.StudentId', $id)->select('Guardians.*', 'StudentGuardians.IsPrimary', 'StudentGuardians.IsFeeResponsible')->get(), 'enrollments' => DB::table('Enrollments')->join('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')->join('AcademicYears', 'Enrollments.AcademicYearId', '=', 'AcademicYears.AcademicYearId')->where('Enrollments.TenantId', $tid)->where('Enrollments.StudentId', $id)->select('Enrollments.*', 'Classes.Name as ClassName', 'AcademicYears.Name as AcademicYearName')->orderByDesc('EnrollmentId')->get(), 'invoices' => $invoices, 'documents' => DB::table('StudentDocuments')->where('TenantId', $tid)->where('StudentId', $id)->get(), 'transfers' => DB::table('StudentTransfers')->where('TenantId', $tid)->where('StudentId', $id)->orderByDesc('StudentTransferId')->get(), 'clearances' => DB::table('StudentClearances')->where('TenantId', $tid)->where('StudentId', $id)->get(), 'graduation' => DB::table('Graduations')->where('TenantId', $tid)->where('StudentId', $id)->first()];
    }

    public function update(int $id, array $data, int $version): Student
    {
        $student = Student::where('Version', $version)->findOrFail($id);
        $before = $student->toArray();
        $student->fill($data);
        $student->Version = $version + 1;
        $student->save();
        $this->audit('Update', 'Students', $id, $before, $student->toArray());

        return $student;
    }

    public function addGuardian(int $studentId, array $data): object
    {
        return DB::transaction(function () use ($studentId, $data) {
            $student = Student::where('TenantId', $this->tenant->id())->findOrFail($studentId);
            if ($data['IsPrimary'] ?? false) {
                DB::table('StudentGuardians')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->update(['IsPrimary' => false]);
            }
            $guardianFields = collect($data)->except(['IsPrimary', 'IsFeeResponsible'])->all();
            $existing = DB::table('Guardians')->where('TenantId', $this->tenant->id())->where(function ($query) use ($data) {
                if (! empty($data['Email'])) {
                    $query->whereRaw('LOWER(Email) = ?', [strtolower(trim($data['Email']))]);
                }
                if (! empty($data['PrimaryPhone'])) {
                    if (! empty($data['Email'])) {
                        $query->orWhere('PrimaryPhone', trim($data['PrimaryPhone']));
                    } else {
                        $query->where('PrimaryPhone', trim($data['PrimaryPhone']));
                    }
                }
            })->first();
            if ($existing) {
                $id = $existing->GuardianId;
                DB::table('Guardians')->where('TenantId', $this->tenant->id())->where('GuardianId', $id)->update($guardianFields);
                $action = 'Link';
            } else {
                $id = DB::table('Guardians')->insertGetId(['TenantId' => $this->tenant->id(), ...$guardianFields], 'GuardianId');
                $action = 'Create';
            }
            DB::table('StudentGuardians')->updateOrInsert(
                ['TenantId' => $this->tenant->id(), 'StudentId' => $student->StudentId, 'GuardianId' => $id],
                ['IsPrimary' => $data['IsPrimary'] ?? false, 'IsFeeResponsible' => $data['IsFeeResponsible'] ?? false]
            );
            $parentUserId = DB::table('Guardians')->where('TenantId', $this->tenant->id())->where('GuardianId', $id)->value('UserId');
            if ($parentUserId) {
                DB::table('UserBranches')->updateOrInsert(['TenantId' => $this->tenant->id(), 'UserId' => $parentUserId, 'BranchId' => $student->BranchId], []);
            }
            $this->audit($action, 'Guardians', $id, null, [...$guardianFields, 'StudentId' => $student->StudentId]);

            return DB::table('Guardians')->where('TenantId', $this->tenant->id())->where('GuardianId', $id)->first();
        });
    }

    public function enroll(int $studentId, array $data): object
    {
        return DB::transaction(function () use ($studentId, $data) {
            $student = Student::lockForUpdate()->findOrFail($studentId);
            $class = DB::table('Classes')->where('TenantId', $this->tenant->id())->where('BranchId', $data['BranchId'])->where('ClassId', $data['ClassId'])->lockForUpdate()->first();
            abort_unless($class, 404);
            abort_unless((int) $class->AcademicYearId === (int) $data['AcademicYearId'], 422, 'Class does not belong to the selected academic year.');
            $count = DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('ClassId', $class->ClassId)->where('Status', 'Active')->count();
            if ($count >= $class->Capacity && ! ($data['OverrideCapacity'] ?? false)) {
                throw ValidationException::withMessages(['ClassId' => 'Class capacity has been reached.']);
            }DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('Status', 'Active')->update(['Status' => 'Completed', 'UpdatedAt' => now()]);
            $id = DB::table('Enrollments')->insertGetId(['TenantId' => $this->tenant->id(), 'BranchId' => $data['BranchId'], 'StudentId' => $studentId, 'ClassId' => $data['ClassId'], 'AcademicYearId' => $data['AcademicYearId'], 'EnrolledAt' => $data['EnrolledAt'], 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()], 'EnrollmentId');
            $student->BranchId = $data['BranchId'];
            $student->save();
            $this->audit('Enroll', 'Enrollments', $id, null, $data);

            return DB::table('Enrollments')->where('EnrollmentId', $id)->first();
        });
    }

    public function promote(int $studentId, array $data): object
    {
        return DB::transaction(function () use ($studentId, $data) {
            $current = DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('Status', 'Active')->lockForUpdate()->first();
            abort_unless($current, 422, 'Student has no active enrollment.');
            $new = $this->enroll($studentId, $data);
            DB::table('PromotionLogs')->insert(['TenantId' => $this->tenant->id(), 'BranchId' => $data['BranchId'], 'StudentId' => $studentId, 'FromClassId' => $current->ClassId, 'ToClassId' => $data['ClassId'], 'FromAcademicYearId' => $current->AcademicYearId, 'ToAcademicYearId' => $data['AcademicYearId'], 'Status' => $data['PromotionStatus'] ?? 'Promoted', 'PromotedByUserId' => $this->tenant->user()->UserId, 'CreatedAt' => now()]);

            return $new;
        });
    }

    public function clearance(int $studentId, array $data): object
    {
        $enrollment = DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->orderByDesc('EnrollmentId')->first();
        abort_unless($enrollment, 422, 'Enrollment is required.');
        $all = collect(['AcademicCleared', 'QuranCleared', 'FinanceCleared', 'DisciplineCleared', 'AssetsCleared'])->every(fn ($x) => $data[$x] ?? false);
        $payload = ['TenantId' => $this->tenant->id(), 'BranchId' => $enrollment->BranchId, 'StudentId' => $studentId, 'EnrollmentId' => $enrollment->EnrollmentId, ...$data, 'Status' => $all ? 'Cleared' : 'Pending', 'ApprovedByUserId' => $all ? $this->tenant->user()->UserId : null, 'ApprovedAt' => $all ? now() : null];
        DB::table('StudentClearances')->updateOrInsert(['TenantId' => $this->tenant->id(), 'StudentId' => $studentId, 'EnrollmentId' => $enrollment->EnrollmentId], $payload);

        return DB::table('StudentClearances')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('EnrollmentId', $enrollment->EnrollmentId)->first();
    }

    public function graduate(int $studentId, array $data): object
    {
        return DB::transaction(function () use ($studentId, $data) {
            $clearance = DB::table('StudentClearances')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('Status', 'Cleared')->latest('StudentClearanceId')->first();
            abort_unless($clearance, 422, 'All clearance sections must be approved before graduation.');
            $number = 'CERT-'.now()->format('Y').'-'.str_pad((string) (DB::table('Graduations')->where('TenantId', $this->tenant->id())->count() + 1), 6, '0', STR_PAD_LEFT);
            $id = DB::table('Graduations')->insertGetId(['TenantId' => $this->tenant->id(), 'BranchId' => $clearance->BranchId, 'StudentId' => $studentId, 'EnrollmentId' => $clearance->EnrollmentId, 'GraduationDate' => $data['GraduationDate'], 'CertificateNo' => $number, 'ClearanceStatus' => 'Cleared', 'ApprovalStatus' => 'Approved', 'ApprovedByUserId' => $this->tenant->user()->UserId, 'Notes' => $data['Notes'] ?? null, 'CreatedAt' => now()], 'GraduationId');
            DB::table('Students')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->update(['Status' => 'Graduated', 'UpdatedAt' => now()]);
            DB::table('Enrollments')->where('EnrollmentId', $clearance->EnrollmentId)->update(['Status' => 'Graduated', 'UpdatedAt' => now()]);

            return DB::table('Graduations')->where('GraduationId', $id)->first();
        });
    }

    public function changeStatus(int $studentId, array $data): Student
    {
        return DB::transaction(function () use ($studentId, $data) {
            $student = Student::lockForUpdate()->findOrFail($studentId);
            $before = $student->toArray();
            $student->Status = $data['Status'];
            $student->Version = ((int) $student->Version) + 1;
            $student->save();
            if (in_array($data['Status'], ['Inactive', 'Suspended'], true)) {
                DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('Status', 'Active')->update(['Status' => $data['Status'], 'UpdatedAt' => now()]);
            }$this->audit('StatusChange', 'Students', $studentId, $before, ['Status' => $data['Status'], 'Reason' => $data['Reason']]);

            return $student;
        });
    }

    public function transfer(int $studentId, array $data): object
    {
        return DB::transaction(function () use ($studentId, $data) {
            $student = Student::lockForUpdate()->findOrFail($studentId);
            if (! empty($data['ToBranchId'])) {
                abort_unless(DB::table('Branches')->where('TenantId', $this->tenant->id())->where('BranchId', $data['ToBranchId'])->exists(), 422, 'Destination branch is invalid.');
            }abort_if(empty($data['ToBranchId']) && empty($data['ExternalDestination']), 422, 'Choose a branch or enter an external destination.');
            $id = DB::table('StudentTransfers')->insertGetId(['TenantId' => $this->tenant->id(), 'StudentId' => $studentId, 'FromBranchId' => $student->BranchId, 'ApprovedByUserId' => $this->tenant->user()->UserId, 'Status' => 'Approved', 'CreatedAt' => now(), ...$data], 'StudentTransferId');
            DB::table('Enrollments')->where('TenantId', $this->tenant->id())->where('StudentId', $studentId)->where('Status', 'Active')->update(['Status' => 'Transferred', 'UpdatedAt' => now()]);
            $student->Status = 'Transferred';
            if (! empty($data['ToBranchId'])) {
                $student->BranchId = $data['ToBranchId'];
            }$student->Version = ((int) $student->Version) + 1;
            $student->save();
            $this->audit('Transfer', 'StudentTransfers', $id, null, $data);

            return DB::table('StudentTransfers')->where('StudentTransferId', $id)->first();
        });
    }

    public function addDocument(int $studentId, array $data): object
    {
        $student = Student::findOrFail($studentId);
        $id = DB::table('StudentDocuments')->insertGetId(['TenantId' => $this->tenant->id(), 'BranchId' => $student->BranchId, 'StudentId' => $studentId, 'UploadedByUserId' => $this->tenant->user()->UserId, 'CreatedAt' => now(), ...$data], 'StudentDocumentId');
        $this->audit('Upload', 'StudentDocuments', $id, null, collect($data)->except('StoragePath')->all());

        return DB::table('StudentDocuments')->where('StudentDocumentId',$id)->first();
    }

    private function audit(string $action,string $entity,int $id,?array $before,?array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $this->tenant->id(), 'UserId' => $this->tenant->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'BeforeData' => $before ? json_encode($before) : null, 'AfterData' => $after ? json_encode($after) : null, 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExaminationController extends Controller
{
    public function types(Request $request, TenantContext $tenant): mixed
    {
        if ($request->isMethod('post')) {
            $data = $request->validate(['TypeName' => ['required', 'string', 'max:80', Rule::unique('ExamTypes', 'TypeName')->where('TenantId', $tenant->id())]]);
            $id = DB::table('ExamTypes')->insertGetId(['TenantId' => $tenant->id(), ...$data], 'ExamTypeId');

            return $this->ok(DB::table('ExamTypes')->where('ExamTypeId', $id)->first(), 'Exam type created.', 201);
        }

        return $this->ok(DB::table('ExamTypes')->where('TenantId', $tenant->id())->orderBy('TypeName')->get(), 'Exam types retrieved.');
    }

    public function exams(Request $request, TenantContext $tenant): mixed
    {
        if ($request->isMethod('post')) {
            $data = $request->validate(['BranchId' => ['required', 'integer'], 'AcademicYearId' => ['required', 'integer'], 'ExamTypeId' => ['required', 'integer'], 'ClassId' => ['required', 'integer'], 'SubjectId' => ['required', 'integer'], 'ExamTitle' => ['required', 'string'], 'MaximumMark' => ['required', 'numeric', 'gt:0'], 'PassMark' => ['required', 'numeric', 'gte:0', 'lte:MaximumMark']]);
            abort_unless(in_array((int) $data['BranchId'], $this->branchIds($tenant), true), 403);
            abort_unless(DB::table('Classes')->where('TenantId', $tenant->id())->where('BranchId', $data['BranchId'])->where('AcademicYearId', $data['AcademicYearId'])->where('ClassId', $data['ClassId'])->exists(), 422, 'Class, branch and academic year do not match.');
            abort_unless(DB::table('Subjects')->where('TenantId', $tenant->id())->where('SubjectId', $data['SubjectId'])->exists(), 422, 'Invalid subject.');
            abort_unless(DB::table('ExamTypes')->where('TenantId', $tenant->id())->where('ExamTypeId', $data['ExamTypeId'])->exists(), 422, 'Invalid exam type.');
            $id = DB::table('Exams')->insertGetId(['TenantId' => $tenant->id(), 'Status' => 'Draft', ...$data], 'ExamId');
            $this->audit($tenant, 'Create', 'Exams', $id, $data);

            return $this->ok(DB::table('Exams')->where('ExamId', $id)->first(), 'Exam created.', 201);
        }
        $rows = DB::table('Exams')->join('Classes', 'Exams.ClassId', '=', 'Classes.ClassId')->join('Subjects', 'Exams.SubjectId', '=', 'Subjects.SubjectId')->leftJoin('ExamSchedules', 'Exams.ExamId', '=', 'ExamSchedules.ExamId')
            ->where('Exams.TenantId', $tenant->id())->whereIn('Exams.BranchId', $this->branchIds($tenant))
            ->when($request->BranchId, fn ($q, $v) => $q->where('Exams.BranchId', $v))->when($request->ClassId, fn ($q, $v) => $q->where('Exams.ClassId', $v))->when($request->Status, fn ($q, $v) => $q->where('Exams.Status', $v))
            ->select('Exams.*', 'Classes.Name as ClassName', 'Subjects.SubjectName', 'ExamSchedules.ExamDate', 'ExamSchedules.StartTime', 'ExamSchedules.EndTime', 'ExamSchedules.RoomName')->orderByDesc('ExamId')->get();

        return $this->ok($rows, 'Exams retrieved.');
    }

    public function schedule(Request $request, int $exam, TenantContext $tenant): mixed
    {
        $data = $request->validate(['ExamDate' => ['required', 'date'], 'StartTime' => ['required', 'date_format:H:i'], 'EndTime' => ['required', 'date_format:H:i', 'after:StartTime'], 'RoomName' => ['nullable', 'string']]);
        $examRow = $this->exam($exam, $tenant);
        abort_if(in_array($examRow->Status, ['Published', 'Locked'], true), 422, 'Published or locked exams cannot be rescheduled.');
        $conflict = DB::table('ExamSchedules')->join('Exams', 'ExamSchedules.ExamId', '=', 'Exams.ExamId')->where('ExamSchedules.TenantId', $tenant->id())->where('ExamSchedules.ExamId', '!=', $exam)->whereDate('ExamDate', $data['ExamDate'])->where('StartTime', '<', $data['EndTime'])->where('EndTime', '>', $data['StartTime'])->where(fn ($q) => $q->where('Exams.ClassId', $examRow->ClassId)->when($data['RoomName'] ?? null, fn ($x, $room) => $x->orWhere('RoomName', $room)))->exists();
        abort_if($conflict, 422, 'The class or room already has an overlapping exam.');
        DB::table('ExamSchedules')->updateOrInsert(['TenantId' => $tenant->id(), 'ExamId' => $examRow->ExamId], $data);
        DB::table('Exams')->where('ExamId', $exam)->update(['Status' => 'Scheduled']);
        $this->audit($tenant, 'Schedule', 'Exams', $exam, $data);

        return $this->ok(DB::table('ExamSchedules')->where('TenantId', $tenant->id())->where('ExamId', $exam)->first(), 'Exam scheduled.', 201);
    }

    public function roster(int $exam, TenantContext $tenant): mixed
    {
        $examRow = $this->exam($exam, $tenant);
        $attendance = DB::table('ExamAttendances')->where('TenantId', $tenant->id())->where('ExamId', $exam)->get()->keyBy('StudentId');
        $marks = DB::table('StudentMarks')->where('TenantId', $tenant->id())->where('ExamId', $exam)->get()->keyBy('StudentId');
        $rows = DB::table('Enrollments')->join('Students', 'Enrollments.StudentId', '=', 'Students.StudentId')->where('Enrollments.TenantId', $tenant->id())->where('Enrollments.ClassId', $examRow->ClassId)->where('Enrollments.AcademicYearId', $examRow->AcademicYearId)->where('Enrollments.Status', 'Active')->select('Students.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->orderBy('Students.FirstName')->get()->map(fn ($student) => [...(array) $student, 'AttendanceStatus' => $attendance[$student->StudentId]->Status ?? 'Present', 'MarksObtained' => $marks[$student->StudentId]->MarksObtained ?? null, 'Remarks' => $marks[$student->StudentId]->Remarks ?? null]);

        return $this->ok($rows, 'Exam roster retrieved.');
    }

    public function attendance(Request $request, int $exam, TenantContext $tenant): mixed
    {
        $examRow = $this->exam($exam, $tenant);
        abort_unless(DB::table('ExamSchedules')->where('TenantId', $tenant->id())->where('ExamId', $exam)->exists(), 422, 'Schedule the exam before taking attendance.');
        $data = $request->validate(['Records' => ['required', 'array', 'min:1'], 'Records.*.StudentId' => ['required', 'integer'], 'Records.*.Status' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused'])]]);
        $enrolled = DB::table('Enrollments')->where('TenantId', $tenant->id())->where('ClassId', $examRow->ClassId)->where('AcademicYearId', $examRow->AcademicYearId)->where('Status', 'Active')->pluck('StudentId')->map(fn ($id) => (int) $id)->all();
        foreach ($data['Records'] as $record) {
            abort_unless(in_array((int) $record['StudentId'], $enrolled, true), 422, 'A student is not actively enrolled in this exam class.');
            DB::table('ExamAttendances')->updateOrInsert(['TenantId' => $tenant->id(), 'ExamId' => $exam, 'StudentId' => $record['StudentId']], ['Status' => $record['Status'], 'CreatedAt' => now()]);
        }
        $this->audit($tenant, 'Attendance', 'Exams', $exam, ['Count' => count($data['Records'])]);

        return $this->ok((object) [], 'Exam attendance saved.');
    }

    public function marks(Request $request, int $exam, TenantContext $tenant): mixed
    {
        $examRow = $this->exam($exam, $tenant);
        abort_if(in_array($examRow->Status, ['Published', 'Locked'], true), 422, 'Published or locked results cannot be edited.');
        $data = $request->validate(['Marks' => ['required', 'array', 'min:1'], 'Marks.*.StudentId' => ['required', 'integer'], 'Marks.*.MarksObtained' => ['required', 'numeric', 'gte:0'], 'Marks.*.Remarks' => ['nullable', 'string']]);
        $roster = DB::table('Enrollments')->where('TenantId', $tenant->id())->where('ClassId', $examRow->ClassId)->where('AcademicYearId', $examRow->AcademicYearId)->where('Status', 'Active')->pluck('StudentId')->map(fn ($id) => (int) $id)->all();
        foreach ($data['Marks'] as $mark) {
            if ($mark['MarksObtained'] > $examRow->MaximumMark) {
                throw ValidationException::withMessages(['Marks' => 'A mark exceeds the configured maximum.']);
            }
            abort_unless(in_array((int) $mark['StudentId'], $roster, true), 422, 'Marks include a student outside this exam class.');
            $attendance = DB::table('ExamAttendances')->where('TenantId', $tenant->id())->where('ExamId', $exam)->where('StudentId', $mark['StudentId'])->value('Status');
            abort_if($attendance === 'Absent', 422, 'Absent students cannot receive marks.');
        }
        DB::transaction(function () use ($data, $examRow, $tenant) {
            foreach ($data['Marks'] as $mark) {
                $existing = DB::table('StudentMarks')->where('TenantId', $tenant->id())->where('ExamId', $examRow->ExamId)->where('StudentId', $mark['StudentId'])->first();
                DB::table('StudentMarks')->updateOrInsert(['TenantId' => $tenant->id(), 'ExamId' => $examRow->ExamId, 'StudentId' => $mark['StudentId']], ['MarksObtained' => $mark['MarksObtained'], 'Grade' => $mark['MarksObtained'] >= $examRow->PassMark ? 'Pass' : 'Fail', 'Remarks' => $mark['Remarks'] ?? null, 'EnteredByUserId' => $tenant->user()->UserId, 'Status' => 'Submitted', 'Version' => ($existing->Version ?? 0) + 1, 'CreatedAt' => $existing->CreatedAt ?? now()]);
            }
            DB::table('Exams')->where('ExamId', $examRow->ExamId)->update(['Status' => 'Submitted']);
        });
        $this->audit($tenant, 'MarksSubmitted', 'Exams', $exam, ['Count' => count($data['Marks'])]);

        return $this->ok((object) [], 'Marks submitted.');
    }

    public function results(int $exam, TenantContext $tenant): mixed
    {
        $this->exam($exam, $tenant);
        $rows = DB::table('StudentMarks')->join('Students', 'StudentMarks.StudentId', '=', 'Students.StudentId')->leftJoin('ExamAttendances', fn ($join) => $join->on('StudentMarks.ExamId', '=', 'ExamAttendances.ExamId')->on('StudentMarks.StudentId', '=', 'ExamAttendances.StudentId'))->where('StudentMarks.TenantId', $tenant->id())->where('StudentMarks.ExamId', $exam)->select('StudentMarks.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'ExamAttendances.Status as AttendanceStatus')->orderByDesc('MarksObtained')->get();
        $rank = 0;
        $previous = null;
        $rows->each(function ($row, $index) use (&$rank, &$previous) {
            if ($previous === null || (float) $row->MarksObtained !== $previous) {
                $rank = $index + 1;
            } $row->Rank = $rank;
            $previous = (float) $row->MarksObtained;
        });

        return $this->ok($rows, 'Exam results retrieved.');
    }

    public function rankings(Request $request, TenantContext $tenant): mixed
    {
        $class = $request->validate(['ClassId' => ['required', 'integer'], 'AcademicYearId' => ['required', 'integer']]);
        abort_unless(DB::table('Classes')->where('TenantId', $tenant->id())->whereIn('BranchId', $this->branchIds($tenant))->where('ClassId', $class['ClassId'])->exists(), 404);
        $rows = DB::table('StudentMarks')->join('Exams', 'StudentMarks.ExamId', '=', 'Exams.ExamId')->join('Students', 'StudentMarks.StudentId', '=', 'Students.StudentId')->where('StudentMarks.TenantId', $tenant->id())->where('Exams.ClassId', $class['ClassId'])->where('Exams.AcademicYearId', $class['AcademicYearId'])->whereIn('Exams.Status', ['Published', 'Locked'])->groupBy('StudentMarks.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->select('StudentMarks.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', DB::raw('SUM(StudentMarks.MarksObtained) as TotalMarks'), DB::raw('AVG((StudentMarks.MarksObtained / Exams.MaximumMark) * 100) as AveragePercentage'), DB::raw('COUNT(StudentMarks.StudentMarkId) as ExamCount'))->orderByDesc('AveragePercentage')->get();
        $rows->each(fn ($row, $index) => $row->Rank = $index + 1);

        return $this->ok($rows, 'Class rankings retrieved.');
    }

    public function transition(Request $request, int $exam, TenantContext $tenant): mixed
    {
        $examRow = $this->exam($exam, $tenant);
        $data = $request->validate(['Action' => ['required', Rule::in(['Approve', 'Publish', 'Lock', 'Reopen'])], 'Reason' => ['nullable', 'string']]);
        if ($data['Action'] === 'Reopen' && ! ($data['Reason'] ?? null)) {
            throw ValidationException::withMessages(['Reason' => 'A reason is required to reopen results.']);
        }
        $allowed = ['Approve' => ['Submitted'], 'Publish' => ['Approved'], 'Lock' => ['Published'], 'Reopen' => ['Approved', 'Published', 'Locked']];
        abort_unless(in_array($examRow->Status, $allowed[$data['Action']], true), 422, "Cannot {$data['Action']} an exam in {$examRow->Status} status.");
        if ($data['Action'] === 'Approve') {
            $expected = DB::table('ExamAttendances')->where('TenantId', $tenant->id())->where('ExamId', $exam)->whereIn('Status', ['Present', 'Late'])->count();
            $marked = DB::table('StudentMarks')->where('TenantId', $tenant->id())->where('ExamId', $exam)->count();
            abort_if($expected === 0 || $marked !== $expected, 422, 'Every present student must have a mark before approval.');
        }
        $status = ['Approve' => 'Approved', 'Publish' => 'Published', 'Lock' => 'Locked', 'Reopen' => 'Submitted'][$data['Action']];
        DB::transaction(function () use ($data, $status, $examRow, $tenant) {
            DB::table('ExamResultActions')->insert(['TenantId' => $tenant->id(), 'ExamId' => $examRow->ExamId, 'Action' => $data['Action'], 'Reason' => $data['Reason'] ?? null, 'RequestedByUserId' => $tenant->user()->UserId, 'ApprovedByUserId' => $tenant->user()->UserId, 'CreatedAt' => now()]);
            DB::table('Exams')->where('ExamId', $examRow->ExamId)->update(['Status' => $status]);
            if ($status === 'Approved') {
                DB::table('StudentMarks')->where('TenantId', $tenant->id())->where('ExamId', $examRow->ExamId)->update(['Status' => 'Approved', 'ApprovedByUserId' => $tenant->user()->UserId, 'ApprovedAt' => now()]);
            }
        });
        $this->audit($tenant, $data['Action'], 'Exams', $exam, $data);

        return $this->ok((object) [], 'Exam status changed to '.$status.'.');
    }

    public function idCard(int $student, TenantContext $tenant): mixed
    {
        $row = DB::table('Students')->join('Enrollments', 'Students.StudentId', '=', 'Enrollments.StudentId')->join('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')->join('Branches', 'Students.BranchId', '=', 'Branches.BranchId')->where('Students.TenantId', $tenant->id())->whereIn('Students.BranchId', $this->branchIds($tenant))->where('Students.StudentId', $student)->where('Enrollments.Status', 'Active')->select('Students.*', 'Classes.Name as ClassName', 'Branches.Name as BranchName')->orderByDesc('EnrollmentId')->first();
        abort_unless($row, 404);
        $row->School = DB::table('TenantSettings')->where('TenantId', $tenant->id())->first();

        return $this->ok($row, 'Student ID card retrieved.');
    }

    public function clearanceCard(int $student, TenantContext $tenant): mixed
    {
        $row = DB::table('Students')->leftJoin('StudentClearances', 'Students.StudentId', '=', 'StudentClearances.StudentId')->where('Students.TenantId', $tenant->id())->whereIn('Students.BranchId', $this->branchIds($tenant))->where('Students.StudentId', $student)->select('Students.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'StudentClearances.*')->orderByDesc('StudentClearanceId')->first();
        abort_unless($row, 404);
        $row->OutstandingBalance = (float) DB::table('Invoices')->where('TenantId', $tenant->id())->where('StudentId', $student)->sum('Balance');
        $row->FinanceCleared = (bool) $row->FinanceCleared && $row->OutstandingBalance === 0.0;
        $row->Status = collect(['AcademicCleared', 'QuranCleared', 'FinanceCleared', 'DisciplineCleared', 'AssetsCleared'])->every(fn ($field) => (bool) $row->{$field}) ? 'Cleared' : 'Pending';

        return $this->ok($row, 'Clearance card retrieved.');
    }

    private function exam(int $id, TenantContext $tenant): object
    {
        $exam = DB::table('Exams')->where('TenantId', $tenant->id())->whereIn('BranchId', $this->branchIds($tenant))->where('ExamId', $id)->first();
        abort_unless($exam, 404);

        return $exam;
    }

    private function branchIds(TenantContext $tenant): array
    {
        return DB::table('UserBranches')->where('TenantId', $tenant->id())->where('UserId', $tenant->user()->UserId)->pluck('BranchId')->map(fn ($id) => (int) $id)->all();
    }

    private function audit(TenantContext $tenant, string $action, string $entity, int $id, array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'AfterData' => json_encode($after), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data, string $message, int $status = 200): mixed
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) []], $status);
    }
}

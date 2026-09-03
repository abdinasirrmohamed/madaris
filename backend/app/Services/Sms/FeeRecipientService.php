<?php

namespace App\Services\Sms;

use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class FeeRecipientService
{
    public function __construct(private PhoneNumberNormalizer $phones) {}

    public function query(int $tenantId, array $filters = []): Builder
    {
        return DB::table('Invoices')->join('Students', 'Invoices.StudentId', '=', 'Students.StudentId')
            ->leftJoin('StudentGuardians', fn ($j) => $j->on('Students.StudentId', '=', 'StudentGuardians.StudentId')->where('StudentGuardians.IsFeeResponsible', true))
            ->leftJoin('Guardians', 'StudentGuardians.GuardianId', '=', 'Guardians.GuardianId')
            ->leftJoin('Enrollments', fn ($j) => $j->on('Students.StudentId', '=', 'Enrollments.StudentId')->where('Enrollments.Status', 'Active'))
            ->leftJoin('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')->leftJoin('Shifts', 'Classes.ShiftId', '=', 'Shifts.ShiftId')
            ->leftJoin('AcademicYears', 'Enrollments.AcademicYearId', '=', 'AcademicYears.AcademicYearId')
            ->leftJoin('InvoiceItems', 'Invoices.InvoiceId', '=', 'InvoiceItems.InvoiceId')->leftJoin('FeeTypes', 'InvoiceItems.FeeTypeId', '=', 'FeeTypes.FeeTypeId')
            ->where('Invoices.TenantId', $tenantId)->where('Invoices.Balance', '>', 0)
            ->when($filters['BranchIds'] ?? null, fn ($q, $v) => $q->whereIn('Invoices.BranchId', $v))
            ->when($filters['AcademicYearId'] ?? null, fn ($q, $v) => $q->where('Enrollments.AcademicYearId', $v))->when($filters['ClassId'] ?? null, fn ($q, $v) => $q->where('Classes.ClassId', $v))
            ->when($filters['LevelId'] ?? null, fn ($q, $v) => $q->where('Levels.LevelId', $v))->when($filters['ShiftId'] ?? null, fn ($q, $v) => $q->where('Shifts.ShiftId', $v))
            ->when($filters['FeeTypeId'] ?? null, fn ($q, $v) => $q->where('FeeTypes.FeeTypeId', $v))->when($filters['DueDate'] ?? null, fn ($q, $v) => $q->whereDate('Invoices.DueDate', '<=', $v))
            ->when($filters['Month'] ?? null, fn ($q, $v) => $q->whereMonth('Invoices.DueDate', $v))->when($filters['Year'] ?? null, fn ($q, $v) => $q->whereYear('Invoices.DueDate', $v));
    }

    public function eligible(int $tenantId, array $filters = []): array
    {
        $rows = $this->query($tenantId, $filters)->select('Invoices.InvoiceId', 'Invoices.StudentId', 'Invoices.InvoiceNo', 'Invoices.Total', 'Invoices.Balance', 'Invoices.DueDate', 'Students.AdmissionNo', 'Students.FirstName', 'Students.MiddleName', 'Students.LastName', 'Guardians.GuardianId', 'Guardians.FullName as ParentName', 'Guardians.PrimaryPhone', 'Guardians.SmsConsent', 'Classes.ClassId', 'Classes.Name as ClassName', 'Levels.LevelId', 'Levels.Name as LevelName', 'Shifts.ShiftId', 'Shifts.Name as ShiftName', 'AcademicYears.AcademicYearId', 'AcademicYears.Name as AcademicYear', 'FeeTypes.FeeTypeId', 'FeeTypes.FeeTypeName')->distinct()->get();

        return $rows->map(function ($r) {
            $paid = max(0, (float) $r->Total - (float) $r->Balance);
            $status = now()->startOfDay()->gt(Carbon::parse($r->DueDate)) ? 'overdue' : ($paid > 0 ? 'partially_paid' : 'unpaid');
            $phone = $this->phones->inspect($r->PrimaryPhone);

            return [...(array) $r, 'StudentName' => trim("$r->FirstName $r->MiddleName $r->LastName"), 'PaidAmount' => $paid, 'RemainingBalance' => (float) $r->Balance, 'PaymentStatus' => $status, 'SmsEligible' => $phone['valid'] && (bool) $r->SmsConsent, 'NormalizedPhone' => $phone['normalized'], 'EligibilityReason' => $r->SmsConsent ? $phone['error'] : 'SMS consent disabled'];
        })->filter(fn ($r) => ($filters['PaymentStatus'] ?? 'all_outstanding') === 'all_outstanding' || $r['PaymentStatus'] === $filters['PaymentStatus'])->values()->all();
    }
}

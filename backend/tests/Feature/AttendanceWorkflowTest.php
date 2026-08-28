<?php

namespace Tests\Feature;

use App\Jobs\SendQueuedSms;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_submission_queues_absence_sms_detects_missing_and_approves_correction(): void
    {
        Queue::fake();
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Attendance', 'Slug' => 'attendance-flow', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Teacher', 'Email' => 'attendance-flow@test.local', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['attendance.take', 'attendance.correct']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        Sanctum::actingAs($user);
        $year = DB::table('AcademicYears')->insertGetId(['TenantId' => $tenant, 'Name' => '2026', 'StartDate' => '2026-01-01', 'EndDate' => '2026-12-31', 'IsDefault' => true, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $level = DB::table('Levels')->insertGetId(['TenantId' => $tenant, 'Name' => 'One', 'Code' => '1', 'SequenceNo' => 1, 'MinimumPromotionScore' => 50, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $shift = DB::table('Shifts')->insertGetId(['TenantId' => $tenant, 'Name' => 'Morning', 'StartTime' => '07:00', 'EndTime' => '12:00', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $class = $this->class($tenant, $branch, $year, $level, $shift, 'A');
        $missing = $this->class($tenant, $branch, $year, $level, $shift, 'B');
        $student = DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => 'A-1', 'FirstName' => 'Ali', 'LastName' => 'Nur', 'Gender' => 'Male', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        DB::table('Enrollments')->insert(['TenantId' => $tenant, 'BranchId' => $branch, 'StudentId' => $student, 'ClassId' => $class, 'AcademicYearId' => $year, 'EnrolledAt' => today(), 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $guardian = DB::table('Guardians')->insertGetId(['TenantId' => $tenant, 'FullName' => 'Parent', 'PrimaryPhone' => '610000000', 'SmsConsent' => true], 'GuardianId');
        DB::table('StudentGuardians')->insert(['TenantId' => $tenant, 'StudentId' => $student, 'GuardianId' => $guardian, 'IsPrimary' => true, 'IsFeeResponsible' => true]);
        $payload = ['BranchId' => $branch, 'ClassId' => $class, 'AttendanceDate' => '2026-08-27', 'Session' => 'Morning', 'Records' => [['StudentId' => $student, 'Status' => 'Absent']]];
        $this->postJson('/api/v1/attendance', $payload)->assertCreated()->assertJsonPath('data.AbsenceSmsQueued', 1);
        Queue::assertPushed(SendQueuedSms::class);
        $this->assertDatabaseHas('SmsLogs', ['TenantId' => $tenant, 'RecipientPhone' => '610000000', 'Status' => 'Queued']);
        $this->postJson('/api/v1/attendance', $payload)->assertUnprocessable();
        $this->getJson('/api/v1/attendance/missing?AttendanceDate=2026-08-27&Session=Morning')->assertOk()->assertJsonFragment(['ClassId' => $missing])->assertJsonMissing(['ClassId' => $class]);
        $attendance = DB::table('Attendance')->value('AttendanceId');
        $correction = $this->postJson("/api/v1/attendance/{$attendance}/corrections", ['RequestedStatus' => 'Sick', 'Reason' => 'Medical certificate received'])->assertCreated()->json('data');
        $this->getJson('/api/v1/attendance/corrections?Status=Pending')->assertOk()->assertJsonFragment(['AttendanceCorrectionId' => $correction['AttendanceCorrectionId']]);
        $this->postJson('/api/v1/attendance/corrections/'.$correction['AttendanceCorrectionId'].'/approve')->assertOk();
        $this->assertDatabaseHas('Attendance', ['AttendanceId' => $attendance, 'Status' => 'Sick']);
    }

    private function class(int $tenant, int $branch, int $year, int $level, int $shift, string $code): int
    {
        return DB::table('Classes')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AcademicYearId' => $year, 'LevelId' => $level, 'ShiftId' => $shift, 'Name' => 'Class '.$code, 'Code' => $code, 'Capacity' => 30, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

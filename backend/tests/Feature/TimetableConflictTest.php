<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TimetableConflictTest extends TestCase
{
    use RefreshDatabase;

    public function test_class_teacher_and_room_conflicts_are_rejected(): void
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Timetable', 'Slug' => 'timetable', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $admin = User::create(['TenantId' => $tenant, 'Name' => 'Academic Admin', 'Email' => 'academic@timetable.test', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['academic.manage']]);
        $teacher = User::create(['TenantId' => $tenant, 'Name' => 'Teacher', 'Email' => 'teacher@timetable.test', 'Password' => 'secret12345', 'Status' => 'Active']);
        DB::table('UserBranches')->insert([['TenantId' => $tenant, 'UserId' => $admin->UserId, 'BranchId' => $branch], ['TenantId' => $tenant, 'UserId' => $teacher->UserId, 'BranchId' => $branch]]);
        Sanctum::actingAs($admin);
        $year = DB::table('AcademicYears')->insertGetId(['TenantId' => $tenant, 'Name' => '2026', 'StartDate' => '2026-01-01', 'EndDate' => '2026-12-31', 'IsDefault' => true, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $level = DB::table('Levels')->insertGetId(['TenantId' => $tenant, 'Name' => 'One', 'Code' => '1', 'SequenceNo' => 1, 'MinimumPromotionScore' => 50, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $shift = DB::table('Shifts')->insertGetId(['TenantId' => $tenant, 'Name' => 'Morning', 'StartTime' => '07:00', 'EndTime' => '12:00', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $classA = $this->class($tenant, $branch, $year, $level, $shift, 'A');
        $classB = $this->class($tenant, $branch, $year, $level, $shift, 'B');
        $subject = DB::table('Subjects')->insertGetId(['TenantId' => $tenant, 'SubjectName' => 'Quran', 'SubjectCode' => 'QR', 'SubjectType' => 'Quran', 'MaximumMark' => 100, 'PassMark' => 50, 'IsActive' => true], 'SubjectId');
        $base = ['BranchId' => $branch, 'SubjectId' => $subject, 'TeacherId' => $teacher->UserId, 'DayOfWeek' => 1, 'StartTime' => '08:00', 'EndTime' => '09:00', 'Room' => 'Room 1'];
        $this->postJson('/api/v1/academic/timetables', [...$base, 'ClassId' => $classA])->assertCreated();
        $this->postJson('/api/v1/academic/timetables', [...$base, 'ClassId' => $classA, 'TeacherId' => null, 'Room' => 'Room 2'])->assertUnprocessable()->assertJsonValidationErrors('ClassId');
        $this->postJson('/api/v1/academic/timetables', [...$base, 'ClassId' => $classB, 'Room' => 'Room 2'])->assertUnprocessable()->assertJsonValidationErrors('TeacherId');
        $this->postJson('/api/v1/academic/timetables', [...$base, 'ClassId' => $classB, 'TeacherId' => null])->assertUnprocessable()->assertJsonValidationErrors('Room');
        $this->postJson('/api/v1/academic/timetables', [...$base, 'ClassId' => $classB, 'StartTime' => '09:00', 'EndTime' => '10:00'])->assertCreated();
    }

    private function class(int $tenant, int $branch, int $year, int $level, int $shift, string $code): int
    {
        return DB::table('Classes')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AcademicYearId' => $year, 'LevelId' => $level, 'ShiftId' => $shift, 'Name' => 'Class '.$code, 'Code' => $code, 'Capacity' => 30, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

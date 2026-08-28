<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExaminationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_exam_schedule_attendance_marks_publication_rankings_and_cards(): void
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Exam School', 'Slug' => 'exam-school', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = $this->branch($tenant, 'A');
        $otherBranch = $this->branch($tenant, 'B');
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Exam Officer', 'Email' => 'exam@test.local', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['examinations.manage']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        Sanctum::actingAs($user);
        [$year, $class] = $this->academic($tenant, $branch);
        [, $otherClass] = $this->academic($tenant, $otherBranch, 'B');
        $subject = DB::table('Subjects')->insertGetId(['TenantId' => $tenant, 'SubjectName' => 'Quran', 'SubjectCode' => 'QRN', 'SubjectType' => 'Quran', 'MaximumMark' => 100, 'PassMark' => 50, 'IsActive' => true]);
        $type = $this->postJson('/api/v1/examinations/types', ['TypeName' => 'Final'])->assertCreated()->json('data.ExamTypeId');
        $present = $this->student($tenant, $branch, 'E-1', 'Amina');
        $absent = $this->student($tenant, $branch, 'E-2', 'Bilal');
        foreach ([$present, $absent] as $student) {
            DB::table('Enrollments')->insert(['TenantId' => $tenant, 'BranchId' => $branch, 'StudentId' => $student, 'ClassId' => $class, 'AcademicYearId' => $year, 'EnrolledAt' => today(), 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        }

        $payload = ['BranchId' => $branch, 'AcademicYearId' => $year, 'ExamTypeId' => $type, 'ClassId' => $class, 'SubjectId' => $subject, 'ExamTitle' => 'Quran Final', 'MaximumMark' => 100, 'PassMark' => 50];
        $exam = $this->postJson('/api/v1/examinations', $payload)->assertCreated()->json('data');
        $this->postJson('/api/v1/examinations', [...$payload, 'BranchId' => $otherBranch, 'ClassId' => $otherClass])->assertForbidden();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/schedule", ['ExamDate' => '2026-09-10', 'StartTime' => '08:00', 'EndTime' => '10:00', 'RoomName' => 'Hall A'])->assertCreated();
        $second = $this->postJson('/api/v1/examinations', [...$payload, 'ExamTitle' => 'Second paper'])->assertCreated()->json('data');
        $this->postJson("/api/v1/examinations/{$second['ExamId']}/schedule", ['ExamDate' => '2026-09-10', 'StartTime' => '09:00', 'EndTime' => '11:00', 'RoomName' => 'Hall B'])->assertUnprocessable();

        $this->getJson("/api/v1/examinations/{$exam['ExamId']}/roster")->assertOk()->assertJsonCount(2, 'data');
        $this->putJson("/api/v1/examinations/{$exam['ExamId']}/attendance", ['Records' => [['StudentId' => $present, 'Status' => 'Present'], ['StudentId' => $absent, 'Status' => 'Absent']]])->assertOk();
        $this->putJson("/api/v1/examinations/{$exam['ExamId']}/marks", ['Marks' => [['StudentId' => $present, 'MarksObtained' => 88], ['StudentId' => $absent, 'MarksObtained' => 70]]])->assertUnprocessable();
        $this->putJson("/api/v1/examinations/{$exam['ExamId']}/marks", ['Marks' => [['StudentId' => $present, 'MarksObtained' => 88, 'Remarks' => 'Excellent']]])->assertOk();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Publish'])->assertUnprocessable();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Approve'])->assertOk();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Publish'])->assertOk();
        $this->getJson("/api/v1/examinations/{$exam['ExamId']}/results")->assertOk()->assertJsonPath('data.0.Rank', 1)->assertJsonPath('data.0.Grade', 'Pass');
        $this->getJson("/api/v1/examinations-rankings?ClassId={$class}&AcademicYearId={$year}")->assertOk()->assertJsonPath('data.0.Rank', 1);
        $this->putJson("/api/v1/examinations/{$exam['ExamId']}/marks", ['Marks' => [['StudentId' => $present, 'MarksObtained' => 90]]])->assertUnprocessable();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Lock'])->assertOk();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Reopen'])->assertUnprocessable();
        $this->postJson("/api/v1/examinations/{$exam['ExamId']}/transition", ['Action' => 'Reopen', 'Reason' => 'Verified correction request'])->assertOk();

        $this->getJson("/api/v1/examinations/cards/id/{$present}")->assertOk()->assertJsonPath('data.ClassName', 'Class A');
        DB::table('StudentClearances')->insert(['TenantId' => $tenant, 'BranchId' => $branch, 'StudentId' => $present, 'EnrollmentId' => DB::table('Enrollments')->where('StudentId', $present)->value('EnrollmentId'), 'AcademicCleared' => true, 'QuranCleared' => true, 'FinanceCleared' => true, 'DisciplineCleared' => true, 'AssetsCleared' => true, 'Status' => 'Cleared', 'CreatedAt' => now()]);
        $this->getJson("/api/v1/examinations/cards/clearance/{$present}")->assertOk()->assertJsonPath('data.Status', 'Cleared');
        $this->assertDatabaseHas('AuditLogs', ['TenantId' => $tenant, 'EntityType' => 'Exams', 'EntityId' => (string) $exam['ExamId']]);
    }

    private function academic(int $tenant, int $branch, string $code = 'A'): array
    {
        $year = DB::table('AcademicYears')->insertGetId(['TenantId' => $tenant, 'Name' => '2026-'.$code, 'StartDate' => '2026-01-01', 'EndDate' => '2026-12-31', 'IsDefault' => $code === 'A', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $level = DB::table('Levels')->insertGetId(['TenantId' => $tenant, 'Name' => 'Level '.$code, 'Code' => 'L'.$code, 'SequenceNo' => 1, 'MinimumPromotionScore' => 50, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $shift = DB::table('Shifts')->insertGetId(['TenantId' => $tenant, 'Name' => 'Shift '.$code, 'StartTime' => '07:00', 'EndTime' => '12:00', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $class = DB::table('Classes')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AcademicYearId' => $year, 'LevelId' => $level, 'ShiftId' => $shift, 'Name' => 'Class '.$code, 'Code' => $code, 'Capacity' => 30, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);

        return [$year, $class];
    }

    private function branch(int $tenant, string $code): int
    {
        return DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Branch '.$code, 'Code' => $code, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function student(int $tenant, int $branch, string $admission, string $name): int
    {
        return DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => $admission, 'FirstName' => $name, 'LastName' => 'Ali', 'Gender' => 'Female', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

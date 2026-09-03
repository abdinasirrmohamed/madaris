<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClassPromotionTest extends TestCase
{
    use RefreshDatabase;

    public function test_class_promotion_workflow(): void
    {
        [$tenant, $branch, $year1, $year2, $class1, $class2, $student1, $student2] = $this->fixture();

        // 1. References
        $this->getJson('/api/v1/academic/promotions/references')
            ->assertOk()
            ->assertJsonPath('data.Branches.0.BranchId', $branch)
            ->assertJsonPath('data.Classes.0.ClassId', $class1);

        // 2. Candidates
        $candRes = $this->getJson("/api/v1/academic/promotions/candidates?BranchId={$branch}&AcademicYearId={$year1}&ClassId={$class1}")
            ->assertOk()
            ->assertJsonPath('data.TotalCandidates', 2)
            ->assertJsonPath('data.SuggestedTargetClassId', $class2)
            ->assertJsonPath('data.Candidates.0.ProposedStatus', 'Promoted');

        // 3. Promote: 1 Promoted to class 2, 1 Retained in class 1
        $payload = [
            'BranchId' => $branch,
            'FromAcademicYearId' => $year1,
            'FromClassId' => $class1,
            'ToAcademicYearId' => $year2,
            'ToClassId' => $class2,
            'OverrideCapacity' => false,
            'Students' => [
                [
                    'StudentId' => $student1,
                    'Action' => 'Promoted',
                    'ToClassId' => $class2,
                    'ToAcademicYearId' => $year2,
                ],
                [
                    'StudentId' => $student2,
                    'Action' => 'Retained',
                    'ToClassId' => $class1,
                    'ToAcademicYearId' => $year2,
                ],
            ],
        ];

        $this->postJson('/api/v1/academic/promotions/promote', $payload)
            ->assertOk()
            ->assertJsonPath('data.PromotedCount', 1)
            ->assertJsonPath('data.RetainedCount', 1);

        // Verify enrollments:
        // Student 1 old enrollment completed, new active in class 2
        $this->assertDatabaseHas('Enrollments', [
            'StudentId' => $student1,
            'ClassId' => $class1,
            'Status' => 'Completed',
        ]);
        $this->assertDatabaseHas('Enrollments', [
            'StudentId' => $student1,
            'ClassId' => $class2,
            'AcademicYearId' => $year2,
            'Status' => 'Active',
        ]);

        // Student 2 old enrollment completed, new active in class 1
        $this->assertDatabaseHas('Enrollments', [
            'StudentId' => $student2,
            'ClassId' => $class1,
            'AcademicYearId' => $year2,
            'Status' => 'Active',
        ]);

        // Promotion logs count
        $this->assertDatabaseCount('PromotionLogs', 2);

        // 4. Logs
        $logRes = $this->getJson('/api/v1/academic/promotions/logs')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('summary.Promoted', 1)
            ->assertJsonPath('summary.Retained', 1);

        $logId = $logRes->json('data.0.PromotionLogId');

        // 5. Revert one promotion
        $this->postJson("/api/v1/academic/promotions/{$logId}/revert")
            ->assertOk();

        $this->assertDatabaseCount('PromotionLogs', 1);
    }

    public function test_missing_exam_mark_blocks_promotion(): void
    {
        [, $branch, $year1, $year2, $class1, $class2, $student1] = $this->fixture();
        DB::table('StudentMarks')->where('StudentId',$student1)->delete();
        $this->postJson('/api/v1/academic/promotions/promote',['BranchId'=>$branch,'FromAcademicYearId'=>$year1,'FromClassId'=>$class1,'ToAcademicYearId'=>$year2,'ToClassId'=>$class2,'Students'=>[['StudentId'=>$student1,'Action'=>'Promoted','ToClassId'=>$class2,'ToAcademicYearId'=>$year2]]])->assertUnprocessable();
        $this->assertDatabaseHas('Enrollments',['StudentId'=>$student1,'ClassId'=>$class1,'Status'=>'Active']);
    }

    private function fixture(): array
    {
        $tenant = DB::table('Tenants')->insertGetId([
            'Name' => 'Promotion Test School',
            'Slug' => 'promo-school',
            'Status' => 'Active',
            'Timezone' => 'Africa/Mogadishu',
            'Currency' => 'USD',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $user = User::create([
            'TenantId' => $tenant,
            'Name' => 'Academic Admin',
            'Email' => 'promo-admin@test.local',
            'Password' => 'secret-password',
            'Status' => 'Active',
            'Permissions' => ['*'],
        ]);
        Sanctum::actingAs($user);

        $branch = DB::table('Branches')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Main Campus',
            'Code' => 'MAIN',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);

        $year1 = DB::table('AcademicYears')->insertGetId([
            'TenantId' => $tenant,
            'Name' => '2025/2026',
            'StartDate' => '2025-08-01',
            'EndDate' => '2026-07-31',
            'IsDefault' => false,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $year2 = DB::table('AcademicYears')->insertGetId([
            'TenantId' => $tenant,
            'Name' => '2026/2027',
            'StartDate' => '2026-08-01',
            'EndDate' => '2027-07-31',
            'IsDefault' => true,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $level1 = DB::table('Levels')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Level 1',
            'Code' => 'L1',
            'SequenceNo' => 1,
            'MinimumPromotionScore' => 50,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $level2 = DB::table('Levels')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Level 2',
            'Code' => 'L2',
            'SequenceNo' => 2,
            'MinimumPromotionScore' => 50,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $shift = DB::table('Shifts')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Morning',
            'StartTime' => '07:30',
            'EndTime' => '12:30',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $class1 = DB::table('Classes')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AcademicYearId' => $year1,
            'LevelId' => $level1,
            'ShiftId' => $shift,
            'Name' => 'Class 1',
            'Code' => 'C1',
            'Capacity' => 30,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $class2 = DB::table('Classes')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AcademicYearId' => $year2,
            'LevelId' => $level2,
            'ShiftId' => $shift,
            'Name' => 'Class 2',
            'Code' => 'C2',
            'Capacity' => 30,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $student1 = DB::table('Students')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AdmissionNo' => 'STU-001',
            'FirstName' => 'Hassan',
            'LastName' => 'Ali',
            'Gender' => 'Male',
            'AdmissionDate' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $student2 = DB::table('Students')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AdmissionNo' => 'STU-002',
            'FirstName' => 'Fatima',
            'LastName' => 'Omar',
            'Gender' => 'Female',
            'AdmissionDate' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        DB::table('Enrollments')->insert([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $student1,
            'ClassId' => $class1,
            'AcademicYearId' => $year1,
            'EnrolledAt' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        DB::table('Enrollments')->insert([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $student2,
            'ClassId' => $class1,
            'AcademicYearId' => $year1,
            'EnrolledAt' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $subject=DB::table('Subjects')->insertGetId(['TenantId'=>$tenant,'SubjectName'=>'Mathematics','SubjectCode'=>'MATH'],'SubjectId');
        $type=DB::table('ExamTypes')->insertGetId(['TenantId'=>$tenant,'TypeName'=>'Final'],'ExamTypeId');
        $exam=DB::table('Exams')->insertGetId(['TenantId'=>$tenant,'BranchId'=>$branch,'AcademicYearId'=>$year1,'ExamTypeId'=>$type,'ClassId'=>$class1,'SubjectId'=>$subject,'ExamTitle'=>'Final Exam','MaximumMark'=>100,'PassMark'=>50,'Status'=>'Published'],'ExamId');
        DB::table('StudentMarks')->insert([
            ['TenantId'=>$tenant,'ExamId'=>$exam,'StudentId'=>$student1,'MarksObtained'=>75,'Grade'=>'Pass','Status'=>'Approved','CreatedAt'=>now()],
            ['TenantId'=>$tenant,'ExamId'=>$exam,'StudentId'=>$student2,'MarksObtained'=>65,'Grade'=>'Pass','Status'=>'Approved','CreatedAt'=>now()],
        ]);

        return [$tenant, $branch, $year1, $year2, $class1, $class2, $student1, $student2];
    }
}

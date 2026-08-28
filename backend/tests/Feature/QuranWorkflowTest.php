<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuranWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_assignment_assessment_reports_and_branch_isolation(): void
    {
        $tenant = $this->tenant('quran-one');
        $branch = $this->branch($tenant, 'A');
        $otherBranch = $this->branch($tenant, 'B');
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Quran Teacher', 'Email' => 'quran@test.local', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['quran.manage']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        Sanctum::actingAs($user);
        $student = $this->student($tenant, $branch, 'Q-1');
        $hiddenStudent = $this->student($tenant, $otherBranch, 'Q-2');

        $this->getJson('/api/v1/quran/surahs')->assertOk()->assertJsonCount(114, 'data')->assertJsonPath('data.0.TotalAyahs', 7);
        $invalid = $this->payload($branch, $student);
        $invalid['ToAyah'] = 8;
        $this->postJson('/api/v1/quran/assignments', $invalid)->assertUnprocessable();
        $this->postJson('/api/v1/quran/assignments', $this->payload($otherBranch, $hiddenStudent))->assertForbidden();

        $assignment = $this->postJson('/api/v1/quran/assignments', $this->payload($branch, $student))->assertCreated()->json('data');
        $this->assertDatabaseHas('AuditLogs', ['TenantId' => $tenant, 'EntityType' => 'QuranAssignments', 'EntityId' => (string) $assignment['QuranAssignmentId']]);
        $this->getJson('/api/v1/quran/assignments')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissing(['AdmissionNo' => 'Q-2']);

        $assessment = ['AssessmentDate' => '2026-08-28', 'AccuracyScore' => 86, 'FluencyScore' => 81, 'TajweedScore' => 79, 'Outcome' => 'Needs revision', 'TeacherNotes' => 'Repeat carefully', 'Mistakes' => [['AyahNo' => 2, 'MistakeType' => 'Tajweed', 'OccurrenceCount' => 3]]];
        $this->postJson("/api/v1/quran/assignments/{$assignment['QuranAssignmentId']}/assessments", $assessment)->assertCreated();
        $this->assertDatabaseHas('QuranAssignments', ['QuranAssignmentId' => $assignment['QuranAssignmentId'], 'Status' => 'Needs revision']);
        $this->getJson('/api/v1/quran/reports/progress')->assertOk()->assertJsonPath('data.0.MistakeCount', 3);
        $this->getJson('/api/v1/quran/reports/mistakes')->assertOk()->assertJsonFragment(['MistakeType' => 'Tajweed', 'Occurrences' => 3]);
    }

    private function payload(int $branch, int $student): array
    {
        return ['BranchId' => $branch, 'StudentId' => $student, 'LessonType' => 'Farbar', 'SurahNo' => 1, 'FromAyah' => 1, 'ToAyah' => 7, 'AssignedDate' => '2026-08-27', 'DueDate' => '2026-08-30', 'RepetitionTarget' => 5, 'Notes' => 'Daily lesson'];
    }

    private function tenant(string $slug): int
    {
        return DB::table('Tenants')->insertGetId(['Name' => $slug, 'Slug' => $slug, 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function branch(int $tenant, string $code): int
    {
        return DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Branch '.$code, 'Code' => $code, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function student(int $tenant, int $branch, string $admission): int
    {
        return DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => $admission, 'FirstName' => 'Ahmed', 'LastName' => 'Ali', 'Gender' => 'Male', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

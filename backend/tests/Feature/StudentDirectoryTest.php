<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guardian_can_link_multiple_students_and_discipline_is_audited(): void
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Directory', 'Slug' => 'directory', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Registrar', 'Email' => 'directory@test.local', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['students.view', 'students.update']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        Sanctum::actingAs($user);
        $first = $this->student($tenant, $branch, 'S-1');
        $second = $this->student($tenant, $branch, 'S-2');
        $guardian = DB::table('Guardians')->insertGetId(['TenantId' => $tenant, 'FullName' => 'Parent One', 'PrimaryPhone' => '610000000', 'SmsConsent' => true], 'GuardianId');
        $this->postJson("/api/v1/guardians/{$guardian}/students", ['StudentId' => $first, 'IsPrimary' => true, 'IsFeeResponsible' => true])->assertOk();
        $this->postJson("/api/v1/guardians/{$guardian}/students", ['StudentId' => $second, 'IsPrimary' => true, 'IsFeeResponsible' => false])->assertOk();
        $this->getJson('/api/v1/guardians')->assertOk()->assertJsonCount(2, 'data.0.Students');
        $record = $this->postJson('/api/v1/discipline', ['BranchId' => $branch, 'StudentId' => $first, 'IncidentDate' => '2026-08-27', 'Category' => 'Attendance', 'Severity' => 'Medium', 'Description' => 'Repeated lateness', 'ActionTaken' => 'Parent contacted'])->assertCreated()->json('data');
        $this->putJson('/api/v1/discipline/'.$record['DisciplineRecordId'], ['Status' => 'Resolved', 'ResolutionNotes' => 'Improved', 'ActionTaken' => 'Counselling'])->assertOk();
        $this->assertDatabaseHas('DisciplineRecords', ['DisciplineRecordId' => $record['DisciplineRecordId'], 'Status' => 'Resolved']);
        $this->assertDatabaseHas('AuditLogs', ['TenantId' => $tenant, 'EntityType' => 'DisciplineRecords', 'Action' => 'Resolve']);
    }

    private function student(int $tenant, int $branch, string $number): int
    {
        return DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => $number, 'FirstName' => 'Student', 'LastName' => $number, 'Gender' => 'Male', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicGraduationTest extends TestCase
{
    use RefreshDatabase;

    public function test_academic_graduation_and_certificate_workflow(): void
    {
        [$tenant, $branch, $year, $class, $studentEligible, $studentWithDebt] = $this->fixture();

        // 1. References
        $this->getJson('/api/v1/academic/graduations/references')
            ->assertOk()
            ->assertJsonPath('data.Branches.0.BranchId', $branch)
            ->assertJsonPath('data.Classes.0.ClassId', $class);

        // 2. Candidates
        $candRes = $this->getJson("/api/v1/academic/graduations/candidates?BranchId={$branch}&AcademicYearId={$year}&ClassId={$class}")
            ->assertOk()
            ->assertJsonPath('data.TotalCandidates', 2);

        $candidates = collect($candRes->json('data.Candidates'));
        $c1 = $candidates->firstWhere('StudentId', $studentEligible);
        $c2 = $candidates->firstWhere('StudentId', $studentWithDebt);

        $this->assertTrue($c1['FinanceCleared']);
        $this->assertTrue($c1['IsEligible']);

        $this->assertFalse($c2['FinanceCleared']);
        $this->assertEquals(75.0, $c2['OutstandingBalance']);
        $this->assertFalse($c2['IsEligible']);

        // 3. Attempting to graduate student with debt without override fails
        $this->postJson('/api/v1/academic/graduations/graduate', [
            'BranchId' => $branch,
            'AcademicYearId' => $year,
            'ClassId' => $class,
            'GraduationDate' => '2026-08-15',
            'OverrideFinancialHold' => false,
            'Students' => [
                ['StudentId' => $studentWithDebt, 'EnrollmentId' => $c2['EnrollmentId'], 'Selected' => true],
            ],
        ])->assertStatus(422);

        // 4. Graduate the eligible student
        $gradRes = $this->postJson('/api/v1/academic/graduations/graduate', [
            'BranchId' => $branch,
            'AcademicYearId' => $year,
            'ClassId' => $class,
            'GraduationDate' => '2026-08-15',
            'OverrideFinancialHold' => false,
            'Students' => [
                ['StudentId' => $studentEligible, 'EnrollmentId' => $c1['EnrollmentId'], 'Selected' => true],
            ],
        ])->assertOk()
            ->assertJsonPath('data.GraduatedCount', 1);

        $gradId = $gradRes->json('data.Graduations.0.GraduationId');
        $certNo = $gradRes->json('data.Graduations.0.CertificateNo');
        $this->assertStringStartsWith('CERT-2026-', $certNo);

        // Student & Enrollment status is now Graduated
        $this->assertDatabaseHas('Students', ['StudentId' => $studentEligible, 'Status' => 'Graduated']);
        $this->assertDatabaseHas('Enrollments', ['EnrollmentId' => $c1['EnrollmentId'], 'Status' => 'Graduated']);
        $this->assertDatabaseHas('Graduations', ['GraduationId' => $gradId, 'CertificateNo' => $certNo]);

        // 5. Certificate details endpoint
        $this->getJson("/api/v1/academic/graduations/{$gradId}/certificate")
            ->assertOk()
            ->assertJsonPath('data.CertificateNo', $certNo)
            ->assertJsonPath('data.StudentName', 'Amina Hassan')
            ->assertJsonPath('data.ClassName', 'Final Year Class');

        // 6. Records listing
        $this->getJson('/api/v1/academic/graduations/records')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('summary.TotalGraduated', 1);

        // 7. Revert
        $this->postJson("/api/v1/academic/graduations/{$gradId}/revert")
            ->assertOk();

        $this->assertDatabaseCount('Graduations', 0);
        $this->assertDatabaseHas('Students', ['StudentId' => $studentEligible, 'Status' => 'Active']);
    }

    private function fixture(): array
    {
        $tenant = DB::table('Tenants')->insertGetId([
            'Name' => 'Al-Hikma Academy',
            'Slug' => 'al-hikma',
            'Status' => 'Active',
            'Timezone' => 'Africa/Mogadishu',
            'Currency' => 'USD',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $user = User::create([
            'TenantId' => $tenant,
            'Name' => 'Academic Director',
            'Email' => 'director@al-hikma.local',
            'Password' => 'secret',
            'Status' => 'Active',
            'Permissions' => ['*'],
        ]);
        Sanctum::actingAs($user);

        $branch = DB::table('Branches')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Mogadishu Campus',
            'Code' => 'MOG',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);

        $year = DB::table('AcademicYears')->insertGetId([
            'TenantId' => $tenant,
            'Name' => '2025/2026',
            'StartDate' => '2025-08-01',
            'EndDate' => '2026-07-31',
            'IsDefault' => true,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $level = DB::table('Levels')->insertGetId([
            'TenantId' => $tenant,
            'Name' => 'Final Secondary',
            'Code' => 'SEC4',
            'SequenceNo' => 4,
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

        $class = DB::table('Classes')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AcademicYearId' => $year,
            'LevelId' => $level,
            'ShiftId' => $shift,
            'Name' => 'Final Year Class',
            'Code' => 'FYC',
            'Capacity' => 30,
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        // Student 1: Paid all fees (balance = 0)
        $s1 = DB::table('Students')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AdmissionNo' => 'GRAD-001',
            'FirstName' => 'Amina',
            'LastName' => 'Hassan',
            'Gender' => 'Female',
            'AdmissionDate' => '2024-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $e1 = DB::table('Enrollments')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $s1,
            'ClassId' => $class,
            'AcademicYearId' => $year,
            'EnrolledAt' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        DB::table('Invoices')->insert([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $s1,
            'InvoiceNo' => 'INV-001',
            'Total' => 150.0,
            'Balance' => 0.0, // Fully paid
            'DueDate' => '2026-05-01',
            'Status' => 'Paid',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        // Student 2: Has unpaid fees (balance = 75)
        $s2 = DB::table('Students')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'AdmissionNo' => 'GRAD-002',
            'FirstName' => 'Mohamed',
            'LastName' => 'Ali',
            'Gender' => 'Male',
            'AdmissionDate' => '2024-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        $e2 = DB::table('Enrollments')->insertGetId([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $s2,
            'ClassId' => $class,
            'AcademicYearId' => $year,
            'EnrolledAt' => '2025-08-01',
            'Status' => 'Active',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        DB::table('Invoices')->insert([
            'TenantId' => $tenant,
            'BranchId' => $branch,
            'StudentId' => $s2,
            'InvoiceNo' => 'INV-002',
            'Total' => 150.0,
            'Balance' => 75.0, // Unpaid tuition / ceremony / exam fee!
            'DueDate' => '2026-05-01',
            'Status' => 'PartiallyPaid',
            'CreatedAt' => now(),
            'UpdatedAt' => now(),
        ]);

        return [$tenant, $branch, $year, $class, $s1, $s2];
    }
}

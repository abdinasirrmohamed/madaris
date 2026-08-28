<?php

namespace Tests\TenantIsolation;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_tenant_is_rejected(): void
    {
        $tenant = $this->tenant('inactive', 'Inactive');
        $branch = $this->branch($tenant, 'I');
        $user = $this->user($tenant, $branch, ['*']);
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/dashboard')->assertForbidden();
    }

    public function test_unassigned_branch_is_rejected(): void
    {
        $tenant = $this->tenant('branch');
        $allowed = $this->branch($tenant, 'A');
        $forbidden = $this->branch($tenant, 'B');
        $user = $this->user($tenant, $allowed, ['*']);
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/students?BranchId='.$forbidden)->assertForbidden();
    }

    public function test_unauthorized_module_api_is_rejected(): void
    {
        $tenant = $this->tenant('restricted');
        $branch = $this->branch($tenant, 'R');
        $user = $this->user($tenant, $branch, []);
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/reports')->assertForbidden();
        $this->postJson('/api/v1/students', [])->assertForbidden();
    }

    public function test_cross_tenant_document_download_is_not_found(): void
    {
        Storage::fake('local');
        $a = $this->tenant('docs-a');
        $aBranch = $this->branch($a, 'A');
        $b = $this->tenant('docs-b');
        $bBranch = $this->branch($b, 'B');
        $user = $this->user($a, $aBranch, ['*']);
        $foreignStudent = $this->student($b, $bBranch, 'B-1');
        Storage::disk('local')->put('student-documents/foreign.pdf', 'secret');
        $document = DB::table('StudentDocuments')->insertGetId(['TenantId' => $b, 'BranchId' => $bBranch, 'StudentId' => $foreignStudent, 'DocumentType' => 'ID', 'OriginalName' => 'foreign.pdf', 'StoragePath' => 'student-documents/foreign.pdf', 'MimeType' => 'application/pdf', 'FileSize' => 6, 'UploadedByUserId' => $user->UserId, 'CreatedAt' => now()], 'StudentDocumentId');
        Sanctum::actingAs($user);
        $this->get('/api/v1/students/'.$foreignStudent.'/documents/'.$document)->assertNotFound();
    }

    public function test_report_metrics_do_not_include_another_tenant(): void
    {
        $a = $this->tenant('reports-a');
        $aBranch = $this->branch($a, 'A');
        $b = $this->tenant('reports-b');
        $bBranch = $this->branch($b, 'B');
        $user = $this->user($a, $aBranch, ['reports.view']);
        $this->student($a, $aBranch, 'A-1');
        $this->student($b, $bBranch, 'B-1');
        $this->student($b, $bBranch, 'B-2');
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/reports')->assertOk()->assertJsonPath('data.Students', 1);
    }

    private function tenant(string $slug, string $status = 'Active'): int
    {
        return DB::table('Tenants')->insertGetId(['Name' => $slug, 'Slug' => $slug, 'Status' => $status, 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function branch(int $tenant, string $code): int
    {
        return DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => $code, 'Code' => $code, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function user(int $tenant, int $branch, array $permissions): User
    {
        $user = User::create(['TenantId' => $tenant, 'Name' => 'User', 'Email' => "{$tenant}-{$branch}@test.local", 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => $permissions]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);

        return $user;
    }

    private function student(int $tenant, int $branch, string $number): int
    {
        return DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => $number, 'FirstName' => 'Student', 'LastName' => $number, 'Gender' => 'Male', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

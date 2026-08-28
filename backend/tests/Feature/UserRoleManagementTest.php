<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserRoleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_creates_user_and_role_permission_is_effective(): void
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Users School', 'Slug' => 'users-school', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $admin = User::create(['TenantId' => $tenant, 'Name' => 'Admin', 'Email' => 'owner@users.test', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['*']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $admin->UserId, 'BranchId' => $branch]);
        $permission = DB::table('Permissions')->insertGetId(['ModuleName' => 'Students', 'ActionName' => 'View', 'PermissionKey' => 'students.view'], 'PermissionId');
        $role = DB::table('Roles')->insertGetId(['TenantId' => $tenant, 'RoleName' => 'Registrar', 'IsSystemRole' => false, 'CreatedAt' => now()], 'RoleId');
        DB::table('RolePermissions')->insert(['RoleId' => $role, 'PermissionId' => $permission]);
        Sanctum::actingAs($admin);
        $created = $this->postJson('/api/v1/users', ['Name' => 'Registrar User', 'Email' => 'registrar@users.test', 'Password' => 'password1234', 'Password_confirmation' => 'password1234', 'BranchIds' => [$branch], 'RoleIds' => [$role]])->assertCreated()->json('data');
        $this->assertDatabaseHas('UserRoles', ['TenantId' => $tenant, 'UserId' => $created['UserId'], 'RoleId' => $role]);
        $this->assertDatabaseHas('UserBranches', ['TenantId' => $tenant, 'UserId' => $created['UserId'], 'BranchId' => $branch]);
        Sanctum::actingAs(User::findOrFail($created['UserId']));
        $this->getJson('/api/v1/students')->assertOk();
        $this->getJson('/api/v1/reports')->assertForbidden();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersonalDashboardSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_role_dashboard_does_not_expose_finance_metrics(): void
    {
        [$tenant, $branch] = $this->school();
        $user = User::create(['TenantId'=>$tenant,'Name'=>'Registrar','Email'=>'registrar@test.local','Password'=>'password1234','Status'=>'Active','Permissions'=>['students.view']]);
        DB::table('UserBranches')->insert(['TenantId'=>$tenant,'UserId'=>$user->UserId,'BranchId'=>$branch]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/dashboard')->assertOk()
            ->assertJsonPath('data.DashboardSections.0', 'students')
            ->assertJsonMissingPath('data.FeesCollectedThisMonth')
            ->assertJsonMissingPath('data.OutstandingInvoices');
    }

    public function test_new_user_must_replace_temporary_password(): void
    {
        [$tenant, $branch] = $this->school();
        $admin = User::create(['TenantId'=>$tenant,'Name'=>'Owner','Email'=>'owner@test.local','Password'=>'password1234','Status'=>'Active','Permissions'=>['*']]);
        DB::table('UserBranches')->insert(['TenantId'=>$tenant,'UserId'=>$admin->UserId,'BranchId'=>$branch]);
        $permission = DB::table('Permissions')->insertGetId(['ModuleName'=>'Students','ActionName'=>'View','PermissionKey'=>'students.view'],'PermissionId');
        $role = DB::table('Roles')->insertGetId(['TenantId'=>$tenant,'RoleName'=>'Registrar','IsSystemRole'=>true,'CreatedAt'=>now()],'RoleId');
        DB::table('RolePermissions')->insert(['RoleId'=>$role,'PermissionId'=>$permission]);
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/users',['Name'=>'New User','Email'=>'new@test.local','Password'=>'temporary12','Password_confirmation'=>'temporary12','BranchIds'=>[$branch],'RoleIds'=>[$role]])->assertCreated()->json('data.UserId');
        $this->assertDatabaseHas('Users',['UserId'=>$id,'MustChangePassword'=>1]);

        $user = User::findOrFail($id);
        Sanctum::actingAs($user);
        $this->putJson('/api/v1/auth/change-password',['CurrentPassword'=>'temporary12','Password'=>'privatepass12','Password_confirmation'=>'privatepass12'])->assertOk();
        $user->refresh();
        $this->assertFalse((bool)$user->MustChangePassword);
        $this->assertTrue(Hash::check('privatepass12',$user->Password));
    }

    private function school(): array
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name'=>'Secure School','Slug'=>'secure-school','Status'=>'Active','Timezone'=>'UTC','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);
        $branch = DB::table('Branches')->insertGetId(['TenantId'=>$tenant,'Name'=>'Main','Code'=>'MAIN','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);
        return [$tenant, $branch];
    }
}

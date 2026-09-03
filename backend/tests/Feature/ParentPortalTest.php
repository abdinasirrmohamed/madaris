<?php

namespace Tests\Feature;

use App\Models\Guardian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ParentPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_only_sees_linked_children_and_can_open_each_child(): void
    {
        $this->seed();
        $tenant=DB::table('Tenants')->first();$branch=DB::table('Branches')->where('TenantId',$tenant->TenantId)->first();
        $user=User::create(['TenantId'=>$tenant->TenantId,'Name'=>'Parent One','Email'=>'parent@test.local','Password'=>'parentpass12','Status'=>'Active','MustChangePassword'=>true,'Permissions'=>[]]);
        $roleId=DB::table('Roles')->insertGetId(['TenantId'=>$tenant->TenantId,'RoleName'=>'Parent','IsSystemRole'=>true,'CreatedAt'=>now()],'RoleId');
        DB::table('UserRoles')->insert(['TenantId'=>$tenant->TenantId,'UserId'=>$user->UserId,'RoleId'=>$roleId]);
        DB::table('UserBranches')->insert(['TenantId'=>$tenant->TenantId,'UserId'=>$user->UserId,'BranchId'=>$branch->BranchId]);
        $guardian=Guardian::create(['TenantId'=>$tenant->TenantId,'UserId'=>$user->UserId,'FullName'=>'Parent One','PrimaryPhone'=>'0611111111','Email'=>'parent@test.local','PortalStatus'=>'Active']);
        $studentIds=[];
        foreach(['Child One','Child Two','Other Child'] as $index=>$name){[$first,$last]=explode(' ',$name);$studentIds[]=DB::table('Students')->insertGetId(['TenantId'=>$tenant->TenantId,'BranchId'=>$branch->BranchId,'AdmissionNo'=>'PORTAL-'.$index,'FirstName'=>$first,'LastName'=>$last,'Gender'=>'Male','AdmissionDate'=>today(),'WelfareStatus'=>'Normal','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()],'StudentId');}
        DB::table('StudentGuardians')->insert(['TenantId'=>$tenant->TenantId,'StudentId'=>$studentIds[0],'GuardianId'=>$guardian->GuardianId,'IsPrimary'=>true,'IsFeeResponsible'=>true]);
        $duplicate=Guardian::create(['TenantId'=>$tenant->TenantId,'FullName'=>' Parent   One ','PrimaryPhone'=>'0622222222','Email'=>'old-parent@test.local','PortalStatus'=>'Disabled']);
        DB::table('StudentGuardians')->insert(['TenantId'=>$tenant->TenantId,'StudentId'=>$studentIds[1],'GuardianId'=>$duplicate->GuardianId,'IsPrimary'=>true,'IsFeeResponsible'=>true]);

        $login=$this->postJson('/api/v1/auth/login',['Email'=>'parent@test.local','Password'=>'parentpass12'])->assertOk()->assertJsonPath('data.user.IsParent',true);
        $token=$login->json('data.token');
        $this->withToken($token)->getJson('/api/v1/parent/me')->assertOk()->assertJsonCount(1,'data.Children');
        $this->withToken($token)->getJson('/api/v1/parent/children/'.$studentIds[0])->assertOk()->assertJsonPath('data.Student.StudentId',$studentIds[0]);
        $this->withToken($token)->getJson('/api/v1/parent/children/'.$studentIds[1])->assertNotFound();
        $this->withToken($token)->getJson('/api/v1/parent/children/'.$studentIds[2])->assertNotFound();
    }
}

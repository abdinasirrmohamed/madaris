<?php
namespace Tests\Feature;
use App\Models\User;use Illuminate\Foundation\Testing\RefreshDatabase;use Illuminate\Support\Facades\DB;use Laravel\Sanctum\Sanctum;use Tests\TestCase;
class PermissionEnforcementTest extends TestCase
{
 use RefreshDatabase;
 public function test_module_permission_is_required_and_wildcard_admin_is_allowed():void
 {
  $tenant=DB::table('Tenants')->insertGetId(['Name'=>'Secure','Slug'=>'secure','Status'=>'Active','Timezone'=>'UTC','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);
  $branch=DB::table('Branches')->insertGetId(['TenantId'=>$tenant,'Name'=>'Main','Code'=>'M','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);
  $restricted=User::create(['TenantId'=>$tenant,'Name'=>'Restricted','Email'=>'restricted@test.local','Password'=>'secret12345','Status'=>'Active','Permissions'=>[]]);DB::table('UserBranches')->insert(['TenantId'=>$tenant,'UserId'=>$restricted->UserId,'BranchId'=>$branch]);
  Sanctum::actingAs($restricted);$this->getJson('/api/v1/students')->assertForbidden();
  $admin=User::create(['TenantId'=>$tenant,'Name'=>'Admin','Email'=>'admin@test.local','Password'=>'secret12345','Status'=>'Active','Permissions'=>['*']]);DB::table('UserBranches')->insert(['TenantId'=>$tenant,'UserId'=>$admin->UserId,'BranchId'=>$branch]);
  Sanctum::actingAs($admin);$this->getJson('/api/v1/students')->assertOk();
 }
}

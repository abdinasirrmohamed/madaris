<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_creates_and_suspends_a_school(): void
    {
        $this->seed();
        $admin = User::create(['TenantId'=>null,'Name'=>'Platform','Email'=>'platform@test.local','Password'=>'secret12345','Status'=>'Active','Permissions'=>['platform.manage']]);
        Sanctum::actingAs($admin);

        $school = $this->postJson('/api/v1/platform/schools', [
            'SchoolName'=>'Second School','BranchName'=>'Main Branch','Currency'=>'USD','Timezone'=>'Africa/Mogadishu','DefaultLanguage'=>'so',
            'OwnerName'=>'School Owner','OwnerEmail'=>'owner@second.test','OwnerPassword'=>'temporary1234',
        ])->assertCreated()->json('data');

        $this->assertDatabaseHas('Tenants',['TenantId'=>$school['TenantId'],'Name'=>'Second School','Status'=>'Active']);
        $this->assertDatabaseHas('Users',['TenantId'=>$school['TenantId'],'Email'=>'owner@second.test','MustChangePassword'=>1]);
        $this->putJson('/api/v1/platform/schools/'.$school['TenantId'].'/status',['Status'=>'Suspended'])->assertOk();
        $this->assertDatabaseHas('Tenants',['TenantId'=>$school['TenantId'],'Status'=>'Suspended']);
    }
}

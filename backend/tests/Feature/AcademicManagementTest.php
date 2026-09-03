<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class AcademicManagementTest extends TestCase
{
    use RefreshDatabase;
    public function test_academic_crud_is_tenant_scoped():void
    {
        $tenantA=$this->tenant('academic-a');$tenantB=$this->tenant('academic-b');$user=$this->user($tenantA);Sanctum::actingAs($user);
        DB::table('Levels')->insert(['TenantId'=>$tenantB,'Name'=>'Foreign','Code'=>'F','SequenceNo'=>1,'MinimumPromotionScore'=>50,'Status'=>'Active']);
        $created=$this->postJson('/api/v1/academic/levels',['Name'=>'Hifdhi One','Code'=>'H1','SequenceNo'=>1,'MinimumPromotionScore'=>60,'LevelPrice'=>125.50,'Status'=>'Active'])->assertCreated()->assertJsonPath('data.LevelPrice',125.5)->json('data');
        $this->getJson('/api/v1/academic/levels')->assertOk()->assertJsonFragment(['Code'=>'H1','LevelPrice'=>125.5])->assertJsonMissing(['Code'=>'F']);
        $this->putJson('/api/v1/academic/levels/'.$created['LevelId'],['Name'=>'Hifdhi One','Code'=>'H1','SequenceNo'=>2,'MinimumPromotionScore'=>65,'LevelPrice'=>150,'Status'=>'Active'])->assertOk()->assertJsonPath('data.SequenceNo',2)->assertJsonPath('data.LevelPrice',150);
        $this->deleteJson('/api/v1/academic/levels/'.$created['LevelId'])->assertOk();
    }
    private function tenant(string $slug):int{return DB::table('Tenants')->insertGetId(['Name'=>$slug,'Slug'=>$slug,'Status'=>'Active','Timezone'=>'UTC','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);}
    private function user(int $tenant):User{return User::create(['TenantId'=>$tenant,'Name'=>'Academic Admin','Email'=>"$tenant@academic.test",'Password'=>'secret','Status'=>'Active','Permissions'=>['academic.manage']]);}
}

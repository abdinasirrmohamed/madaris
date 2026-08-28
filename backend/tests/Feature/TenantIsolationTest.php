<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;
    public function test_user_cannot_list_or_open_another_tenants_student():void
    {
        $a=$this->tenant('a'); $b=$this->tenant('b');
        $user=$this->user($a); Sanctum::actingAs($user);
        $own=$this->student($a,'A-1'); $foreign=$this->student($b,'B-1');
        $this->getJson('/api/v1/students')->assertOk()->assertJsonFragment(['AdmissionNo'=>'A-1'])->assertJsonMissing(['AdmissionNo'=>'B-1']);
        $this->getJson('/api/v1/students/'.$foreign)->assertNotFound();
    }
    private function tenant(string $slug):int{return DB::table('Tenants')->insertGetId(['Name'=>$slug,'Slug'=>$slug,'Status'=>'Active','Timezone'=>'UTC','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);}
    private function user(int $tenant):User{return User::create(['TenantId'=>$tenant,'Name'=>'User','Email'=>"$tenant@example.test",'Password'=>'secret','Status'=>'Active','Permissions'=>['*']]);}
    private function student(int $tenant,string $no):int{$branch=DB::table('Branches')->insertGetId(['TenantId'=>$tenant,'Name'=>'Main','Code'=>'M','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);return DB::table('Students')->insertGetId(['TenantId'=>$tenant,'BranchId'=>$branch,'AdmissionNo'=>$no,'FirstName'=>'Student','LastName'=>$no,'Gender'=>'Male','AdmissionDate'=>today(),'WelfareStatus'=>'Normal','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);}
}

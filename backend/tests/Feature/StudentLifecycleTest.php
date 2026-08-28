<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class StudentLifecycleTest extends TestCase
{
 use RefreshDatabase;
 public function test_guardian_enrollment_capacity_and_promotion_history():void
 {
  $tid=DB::table('Tenants')->insertGetId(['Name'=>'School','Slug'=>'life','Status'=>'Active','Timezone'=>'UTC','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);$branch=DB::table('Branches')->insertGetId(['TenantId'=>$tid,'Name'=>'Main','Code'=>'M','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);$user=User::create(['TenantId'=>$tid,'Name'=>'Admin','Email'=>'life@test.test','Password'=>'secret','Status'=>'Active','Permissions'=>['*']]);DB::table('UserBranches')->insert(['TenantId'=>$tid,'UserId'=>$user->UserId,'BranchId'=>$branch]);Sanctum::actingAs($user);
  $year1=$this->year($tid,'2025');$year2=$this->year($tid,'2026');$level=DB::table('Levels')->insertGetId(['TenantId'=>$tid,'Name'=>'One','Code'=>'1','SequenceNo'=>1,'MinimumPromotionScore'=>50,'Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);$shift=DB::table('Shifts')->insertGetId(['TenantId'=>$tid,'Name'=>'Morning','StartTime'=>'07:00','EndTime'=>'12:00','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);$class1=$this->class($tid,$branch,$year1,$level,$shift,'A',1);$class2=$this->class($tid,$branch,$year2,$level,$shift,'B',30);
  $student=$this->postJson('/api/v1/students',['BranchId'=>$branch,'AdmissionNo'=>'ADM-1','FirstName'=>'Ali','LastName'=>'Nur','Gender'=>'Male','AdmissionDate'=>'2026-01-01','WelfareStatus'=>'Normal','Status'=>'Active'])->assertCreated()->json('data');
  $this->postJson("/api/v1/students/{$student['StudentId']}/guardians",['FullName'=>'Amina Nur','PrimaryPhone'=>'610000000','IsPrimary'=>true,'IsFeeResponsible'=>true])->assertCreated();
  $this->postJson("/api/v1/students/{$student['StudentId']}/enrollments",['BranchId'=>$branch,'AcademicYearId'=>$year1,'ClassId'=>$class1,'EnrolledAt'=>'2026-01-01'])->assertCreated();
  $this->postJson("/api/v1/students/{$student['StudentId']}/promotions",['BranchId'=>$branch,'AcademicYearId'=>$year2,'ClassId'=>$class2,'EnrolledAt'=>'2026-08-01','PromotionStatus'=>'Promoted'])->assertCreated();
  $this->assertDatabaseCount('Enrollments',2);$this->assertDatabaseHas('Enrollments',['StudentId'=>$student['StudentId'],'ClassId'=>$class1,'Status'=>'Completed']);$this->assertDatabaseHas('PromotionLogs',['StudentId'=>$student['StudentId'],'FromClassId'=>$class1,'ToClassId'=>$class2]);
 }
 private function year(int $t,string $n):int{return DB::table('AcademicYears')->insertGetId(['TenantId'=>$t,'Name'=>$n,'StartDate'=>'2026-01-01','EndDate'=>'2026-12-31','IsDefault'=>false,'Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);}
 private function class(int $t,int $b,int $y,int $l,int $s,string $n,int $c):int{return DB::table('Classes')->insertGetId(['TenantId'=>$t,'BranchId'=>$b,'AcademicYearId'=>$y,'LevelId'=>$l,'ShiftId'=>$s,'Name'=>$n,'Code'=>$n,'Capacity'=>$c,'Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);}
}

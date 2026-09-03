<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;use App\Tenancy\TenantContext;use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;use Illuminate\Support\Facades\Hash;use Illuminate\Validation\Rule;
class HrmController extends Controller
{
 public function shifts(TenantContext $t){return $this->ok(DB::table('Shifts')->where('TenantId',$t->id())->where('Status','Active')->orderBy('StartTime')->get(),'Active shifts retrieved.');}
 public function teacherAssignmentOptions(TenantContext $t){
  $tenantId=$t->id();
  return $this->ok([
   'teachers'=>DB::table('Employees')->leftJoin('Teachers','Employees.EmployeeId','=','Teachers.EmployeeId')->where('Employees.TenantId',$tenantId)->where('Employees.IsTeacher',true)->where('Employees.Status','Active')->select('Teachers.TeacherId','Employees.EmployeeId','Employees.FullName','Employees.BranchId','Employees.ShiftId')->orderBy('Employees.FullName')->get(),
   'classes'=>DB::table('Classes')->where('TenantId',$tenantId)->where('Status','Active')->select('ClassId','BranchId','AcademicYearId','ShiftId','Name')->orderBy('Name')->get(),
   'subjects'=>DB::table('Subjects')->where('TenantId',$tenantId)->where('IsActive',true)->select('SubjectId','SubjectName')->orderBy('SubjectName')->get(),
   'academicYears'=>DB::table('AcademicYears')->where('TenantId',$tenantId)->select('AcademicYearId','Name','Status')->orderByDesc('AcademicYearId')->get(),
  ],'Teacher assignment options retrieved.');
 }
 public function teacherAssignments(Request $r,TenantContext $t){
  $tenantId=$t->id();
  if($r->isMethod('post')){
   $d=$r->validate(['EmployeeId'=>['required','integer'],'ClassId'=>['required','integer'],'SubjectId'=>['required','integer'],'AcademicYearId'=>['required','integer']]);
   $teacher=DB::table('Employees')->where('TenantId',$tenantId)->where('EmployeeId',$d['EmployeeId'])->where('IsTeacher',true)->where('Status','Active')->select('EmployeeId','BranchId')->first();
   abort_unless($teacher,422,'Invalid teacher.');
   $class=DB::table('Classes')->where('TenantId',$tenantId)->where('ClassId',$d['ClassId'])->where('Status','Active')->first();
   abort_unless($class,422,'Invalid class.');
   abort_unless(DB::table('Subjects')->where('TenantId',$tenantId)->where('SubjectId',$d['SubjectId'])->where('IsActive',true)->exists(),422,'Invalid subject.');
   abort_unless(DB::table('AcademicYears')->where('TenantId',$tenantId)->where('AcademicYearId',$d['AcademicYearId'])->exists(),422,'Invalid academic year.');
   abort_unless((int)$teacher->BranchId===(int)$class->BranchId,422,'Teacher and class must belong to the same branch.');
   abort_unless((int)$class->AcademicYearId===(int)$d['AcademicYearId'],422,'Class does not belong to the selected academic year.');
   $teacherId=DB::table('Teachers')->where('TenantId',$tenantId)->where('EmployeeId',$teacher->EmployeeId)->value('TeacherId');
   if(!$teacherId)$teacherId=DB::table('Teachers')->insertGetId(['TenantId'=>$tenantId,'EmployeeId'=>$teacher->EmployeeId],'TeacherId');
   $assignment=['TeacherId'=>$teacherId,'ClassId'=>$d['ClassId'],'SubjectId'=>$d['SubjectId'],'AcademicYearId'=>$d['AcademicYearId']];
   $exists=DB::table('TeacherAssignments')->where('TenantId',$tenantId)->where($assignment)->exists();
   abort_if($exists,422,'This teacher assignment already exists.');
   DB::table('TeacherAssignments')->insert(['TenantId'=>$tenantId,'BranchId'=>$class->BranchId,...$assignment]);
   return $this->ok((object)[],'Teacher assignment saved.',201);
  }
  $rows=DB::table('TeacherAssignments')->join('Teachers','TeacherAssignments.TeacherId','=','Teachers.TeacherId')->join('Employees','Teachers.EmployeeId','=','Employees.EmployeeId')->join('Classes','TeacherAssignments.ClassId','=','Classes.ClassId')->leftJoin('Subjects','TeacherAssignments.SubjectId','=','Subjects.SubjectId')->join('AcademicYears','TeacherAssignments.AcademicYearId','=','AcademicYears.AcademicYearId')->where('TeacherAssignments.TenantId',$tenantId)->select('TeacherAssignments.*','Employees.FullName as TeacherName','Classes.Name as ClassName','Subjects.SubjectName','AcademicYears.Name as YearName')->orderBy('Employees.FullName')->get();
  return $this->ok($rows,'Teacher assignments retrieved.');
 }
 public function deleteTeacherAssignment(TenantContext $t,int $assignmentId){
  $deleted=DB::table('TeacherAssignments')->where('TenantId',$t->id())->where('TeacherAssignmentId',$assignmentId)->delete();
  abort_unless($deleted,404,'Teacher assignment not found.');
  return $this->ok((object)[],'Teacher assignment deleted.');
 }
 public function employees(Request $r,TenantContext $t){
  if($r->isMethod('post')){
   $d=$this->validateEmployee($r,$t);
   abort_unless(DB::table('Branches')->where('TenantId',$t->id())->where('BranchId',$d['BranchId'])->exists(),422,'Invalid branch.');
   if(!empty($d['ShiftId']))abort_unless(DB::table('Shifts')->where('TenantId',$t->id())->where('ShiftId',$d['ShiftId'])->where('Status','Active')->exists(),422,'Invalid shift.');
   $createUser=(bool)($d['CreateUser']??false);$password=$d['Password']??null;$roleName=$d['SystemRole']??$this->systemRoleFor($d['EmploymentRole']);
   unset($d['CreateUser'],$d['Password'],$d['SystemRole']);
   $id=DB::transaction(function()use($t,$d,$createUser,$password,$roleName){
    $userId=null;
    if($createUser){
     $userId=DB::table('Users')->insertGetId(['TenantId'=>$t->id(),'Name'=>$d['FullName'],'Email'=>$d['Email'],'Password'=>Hash::make($password),'Status'=>$d['Status']==='Active'?'Active':'Inactive','Permissions'=>json_encode([]),'MustChangePassword'=>true,'CreatedAt'=>now(),'UpdatedAt'=>now()],'UserId');
     DB::table('UserBranches')->insert(['TenantId'=>$t->id(),'UserId'=>$userId,'BranchId'=>$d['BranchId']]);
     $roleId=DB::table('Roles')->where('TenantId',$t->id())->where('RoleName',$roleName)->value('RoleId');
     abort_unless($roleId,422,'The selected system role is not configured.');
     DB::table('UserRoles')->insert(['TenantId'=>$t->id(),'UserId'=>$userId,'RoleId'=>$roleId]);
    }
    $employeeId=DB::table('Employees')->insertGetId(['TenantId'=>$t->id(),'UserId'=>$userId,'CreatedAt'=>now(),...$d],'EmployeeId');
    if($d['IsTeacher']??false)DB::table('Teachers')->insert(['TenantId'=>$t->id(),'EmployeeId'=>$employeeId]);
    return $employeeId;
   });
   return $this->ok(DB::table('Employees')->leftJoin('Shifts','Employees.ShiftId','=','Shifts.ShiftId')->where('Employees.EmployeeId',$id)->select('Employees.*','Shifts.Name as ShiftName')->first(),'Employee created.',201);
  }
  return $this->ok(DB::table('Employees')->leftJoin('Shifts','Employees.ShiftId','=','Shifts.ShiftId')->leftJoin('Users','Employees.UserId','=','Users.UserId')->leftJoin('UserRoles','Users.UserId','=','UserRoles.UserId')->leftJoin('Roles','UserRoles.RoleId','=','Roles.RoleId')->where('Employees.TenantId',$t->id())->select('Employees.*','Shifts.Name as ShiftName','Users.Email as UserEmail','Users.Status as UserStatus','Roles.RoleName as SystemRole')->orderBy('Employees.FullName')->get(),'Employees retrieved.');
 }
 public function updateEmployee(Request $r,TenantContext $t,int $employeeId){
  $employee=DB::table('Employees')->where('TenantId',$t->id())->where('EmployeeId',$employeeId)->first();
  abort_unless($employee,404,'Employee not found.');
  $d=$this->validateEmployee($r,$t,$employeeId,$employee->UserId);
  abort_unless(DB::table('Branches')->where('TenantId',$t->id())->where('BranchId',$d['BranchId'])->exists(),422,'Invalid branch.');
  if(!empty($d['ShiftId']))abort_unless(DB::table('Shifts')->where('TenantId',$t->id())->where('ShiftId',$d['ShiftId'])->where('Status','Active')->exists(),422,'Invalid shift.');
  if(!($d['IsTeacher']??false))$d['ShiftId']=null;
  $createUser=(bool)($d['CreateUser']??false);$password=$d['Password']??null;$roleName=$d['SystemRole']??$this->systemRoleFor($d['EmploymentRole']);
  unset($d['CreateUser'],$d['Password'],$d['SystemRole']);
  DB::transaction(function()use($t,$employeeId,$employee,$d,$createUser,$password,$roleName){
   $userId=$employee->UserId;
   if(!$userId&&$createUser){
    $userId=DB::table('Users')->insertGetId(['TenantId'=>$t->id(),'Name'=>$d['FullName'],'Email'=>$d['Email'],'Password'=>Hash::make($password),'Status'=>$d['Status']==='Active'?'Active':'Inactive','Permissions'=>json_encode([]),'MustChangePassword'=>true,'CreatedAt'=>now(),'UpdatedAt'=>now()],'UserId');
    DB::table('UserBranches')->insert(['TenantId'=>$t->id(),'UserId'=>$userId,'BranchId'=>$d['BranchId']]);
    $roleId=DB::table('Roles')->where('TenantId',$t->id())->where('RoleName',$roleName)->value('RoleId');
    abort_unless($roleId,422,'The selected system role is not configured.');
    DB::table('UserRoles')->insert(['TenantId'=>$t->id(),'UserId'=>$userId,'RoleId'=>$roleId]);
    $d['UserId']=$userId;
   }
   DB::table('Employees')->where('TenantId',$t->id())->where('EmployeeId',$employeeId)->update($d);
   if($userId)DB::table('Users')->where('TenantId',$t->id())->where('UserId',$userId)->update(['Name'=>$d['FullName'],'Email'=>$d['Email'],'Status'=>$d['Status']==='Active'?'Active':'Inactive','UpdatedAt'=>now()]);
   if($d['IsTeacher']??false)DB::table('Teachers')->updateOrInsert(['EmployeeId'=>$employeeId],['TenantId'=>$t->id()]);
   else DB::table('Teachers')->where('TenantId',$t->id())->where('EmployeeId',$employeeId)->delete();
  });
  return $this->ok(DB::table('Employees')->leftJoin('Shifts','Employees.ShiftId','=','Shifts.ShiftId')->where('Employees.TenantId',$t->id())->where('Employees.EmployeeId',$employeeId)->select('Employees.*','Shifts.Name as ShiftName')->first(),'Employee updated.');
 }
 public function deleteEmployee(TenantContext $t,int $employeeId){
  $employee=DB::table('Employees')->where('TenantId',$t->id())->where('EmployeeId',$employeeId)->first();
  abort_unless($employee,404,'Employee not found.');
  DB::transaction(function()use($t,$employee,$employeeId){
   DB::table('Employees')->where('TenantId',$t->id())->where('EmployeeId',$employeeId)->delete();
   if($employee->UserId)DB::table('Users')->where('TenantId',$t->id())->where('UserId',$employee->UserId)->delete();
  });
  return $this->ok((object)[],'Employee deleted.');
 }
 public function attendance(Request $r,TenantContext $t){if($r->isMethod('post')){$d=$r->validate(['BranchId'=>['required','integer'],'AttendanceDate'=>['required','date'],'Records'=>['required','array'],'Records.*.EmployeeId'=>['required','integer'],'Records.*.Status'=>['required',Rule::in(['Present','Absent','Late','Leave','Sick','Holiday'])]]);foreach($d['Records'] as $x)DB::table('EmployeeAttendances')->updateOrInsert(['TenantId'=>$t->id(),'EmployeeId'=>$x['EmployeeId'],'AttendanceDate'=>$d['AttendanceDate']],['BranchId'=>$d['BranchId'],'Status'=>$x['Status'],'CreatedAt'=>now()]);return $this->ok((object)[],'Employee attendance saved.');}return $this->ok(DB::table('EmployeeAttendances')->join('Employees','EmployeeAttendances.EmployeeId','=','Employees.EmployeeId')->where('EmployeeAttendances.TenantId',$t->id())->select('EmployeeAttendances.*','Employees.FullName','Employees.EmployeeNo')->orderByDesc('AttendanceDate')->get(),'Employee attendance retrieved.');}
 public function payroll(Request $r,TenantContext $t){if($r->isMethod('post')){$d=$r->validate(['BranchId'=>['required','integer'],'EmployeeId'=>['required','integer'],'PayPeriodMonth'=>['required','integer','between:1,12'],'PayPeriodYear'=>['required','integer'],'Allowances'=>['nullable','numeric'],'Deductions'=>['nullable','numeric']]);$e=DB::table('Employees')->where('TenantId',$t->id())->where('EmployeeId',$d['EmployeeId'])->first();abort_unless($e,404);$net=$e->BasicSalary+($d['Allowances']??0)-($d['Deductions']??0);$id=DB::table('Payrolls')->insertGetId(['TenantId'=>$t->id(),'BasicSalary'=>$e->BasicSalary,'NetSalary'=>$net,'Status'=>'Pending','CreatedAt'=>now(),...$d],'PayrollId');return $this->ok(DB::table('Payrolls')->where('PayrollId',$id)->first(),'Payroll prepared.',201);}return $this->ok(DB::table('Payrolls')->join('Employees','Payrolls.EmployeeId','=','Employees.EmployeeId')->where('Payrolls.TenantId',$t->id())->select('Payrolls.*','Employees.FullName','Employees.EmployeeNo')->orderByDesc('PayrollId')->get(),'Payroll retrieved.');}
 private function validateEmployee(Request $r,TenantContext $t,?int $employeeId=null,?int $userId=null):array{
  $emailRule=Rule::unique('Users','Email');if($userId)$emailRule=$emailRule->ignore($userId,'UserId');
  return $r->validate(['BranchId'=>['required','integer'],'ShiftId'=>['nullable','integer'],'EmployeeNo'=>['required','string',Rule::unique('Employees','EmployeeNo')->where(fn($q)=>$q->where('TenantId',$t->id()))->ignore($employeeId,'EmployeeId')],'FullName'=>['required','string'],'Gender'=>['nullable',Rule::in(['Male','Female'])],'Phone'=>['nullable','string'],'Email'=>['nullable','email',Rule::requiredIf($r->boolean('CreateUser')),$emailRule],'HireDate'=>['nullable','date'],'BasicSalary'=>['required','numeric','gte:0'],'EmploymentRole'=>['required',Rule::in(['Teacher','Finance Officer','Examiner','Report Viewer','HR Officer','Registrar','Staff'])],'IsTeacher'=>['boolean'],'CreateUser'=>['boolean'],'Password'=>[Rule::requiredIf($r->boolean('CreateUser')&&!$userId),'nullable','string','min:8'],'SystemRole'=>['nullable','string'],'Status'=>['required',Rule::in(['Active','Inactive','Suspended','Terminated'])]]);
 }
 private function systemRoleFor(string $employmentRole):string{return match($employmentRole){'Teacher'=>'Teacher','Finance Officer'=>'Finance Officer','Examiner'=>'Examiner','Report Viewer'=>'Report Viewer','HR Officer'=>'HR Officer','Registrar'=>'Registrar',default=>'Report Viewer'};}
 private function ok(mixed $data,string $message,int $status=200){return response()->json(['success'=>true,'message'=>$message,'data'=>$data,'meta'=>(object)[]],$status);}
}

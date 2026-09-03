<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParentPortalController extends Controller
{
    public function me(Request $request)
    {
        $guardian=$this->guardian($request);$tenant=$this->activeTenant($guardian);
        $payload=$this->guardianPayload($guardian,$tenant);
        $payload['MustChangePassword']=(bool)$request->user()->MustChangePassword;
        return $this->ok($payload,'Parent portal retrieved.');
    }

    public function child(Request $request,int $student)
    {
        $guardian=$this->guardian($request);$tenant=$this->activeTenant($guardian);$this->owns($guardian,$student);
        $profile=DB::table('Students')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->first();abort_unless($profile,404);
        $enrollment=DB::table('Enrollments')->join('Classes','Enrollments.ClassId','=','Classes.ClassId')->join('AcademicYears','Enrollments.AcademicYearId','=','AcademicYears.AcademicYearId')->join('Branches','Enrollments.BranchId','=','Branches.BranchId')->where('Enrollments.TenantId',$guardian->TenantId)->where('Enrollments.StudentId',$student)->select('Enrollments.*','Classes.Name as ClassName','AcademicYears.Name as AcademicYearName','Branches.Name as BranchName')->orderByDesc('EnrollmentId')->first();
        $attendance=DB::table('Attendance')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->orderByDesc('AttendanceDate')->limit(90)->get();
        $attendanceSummary=DB::table('Attendance')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->select('Status',DB::raw('count(*) as Total'))->groupBy('Status')->pluck('Total','Status');
        $marks=DB::table('StudentMarks')->join('Exams','StudentMarks.ExamId','=','Exams.ExamId')->join('Subjects','Exams.SubjectId','=','Subjects.SubjectId')->where('StudentMarks.TenantId',$guardian->TenantId)->where('StudentMarks.StudentId',$student)->where('Exams.Status','Published')->select('StudentMarks.*','Exams.ExamTitle','Exams.MaximumMark','Exams.PassMark','Subjects.SubjectName')->orderByDesc('StudentMarkId')->get();
        $quran=DB::table('QuranAssessments')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->orderByDesc('AssessmentDate')->limit(50)->get();
        $assignments=DB::table('QuranAssignments')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->orderByDesc('AssignedDate')->limit(50)->get();
        $invoices=DB::table('Invoices')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->orderByDesc('InvoiceId')->get();
        $payments=DB::table('Payments')->where('TenantId',$guardian->TenantId)->where('StudentId',$student)->orderByDesc('PaymentId')->get();
        $announcements=DB::table('Announcements')->where('TenantId',$guardian->TenantId)->whereNotNull('PublishedAt')->where(function($query){$query->where('AudienceType','All')->orWhere('AudienceType','Parents')->orWhere('AudienceType','Guardians');})->orderByDesc('PublishedAt')->limit(8)->get();
        $totalAttendance=(int)$attendanceSummary->sum();
        $present=(int)($attendanceSummary['Present']??0);
        $examAverage=$marks->count() ? round($marks->avg(fn($mark)=>(float)$mark->MaximumMark>0?((float)$mark->MarksObtained/(float)$mark->MaximumMark)*100:0),1) : null;
        $quranAverage=$quran->count() ? round($quran->avg(fn($assessment)=>((float)$assessment->AccuracyScore+(float)$assessment->FluencyScore+(float)$assessment->TajweedScore)/3),1) : null;
        $summary=['AttendanceRate'=>$totalAttendance?round(($present/$totalAttendance)*100,1):null,'ExamAverage'=>$examAverage,'QuranAverage'=>$quranAverage,'OutstandingBalance'=>round((float)$invoices->sum('Balance'),2),'PaidTotal'=>round((float)$payments->where('Status','Completed')->sum('Amount'),2),'OpenAssignments'=>$assignments->whereNotIn('Status',['Completed','Passed','Cancelled'])->count()];
        return $this->ok(['School'=>$tenant,'Student'=>$profile,'Enrollment'=>$enrollment,'Attendance'=>$attendance,'AttendanceSummary'=>$attendanceSummary,'ExamResults'=>$marks,'QuranAssessments'=>$quran,'QuranAssignments'=>$assignments,'Invoices'=>$invoices,'Payments'=>$payments,'Announcements'=>$announcements,'Summary'=>$summary],'Child details retrieved.');
    }

    public function enable(Request $request,int $guardian)
    {
        $user=$request->user();abort_unless($user instanceof User,403);
        $data=$request->validate(['Email'=>['nullable','email','max:190'],'Password'=>['required','string','min:10'],'PortalStatus'=>['nullable','in:Active,Disabled']]);
        $row=Guardian::where('TenantId',$user->TenantId)->where('GuardianId',$guardian)->firstOrFail();
        $email=$data['Email']??$row->Email;
        abort_unless($email,422,'Guardian email is required to create a user account.');
        $account=DB::transaction(function()use($row,$user,$data,$email){
            $duplicate=User::where('Email',$email)->when($row->UserId,fn($q)=>$q->where('UserId','!=',$row->UserId))->exists();
            abort_if($duplicate,422,'This email is already used by another user.');
            $account=$row->UserId ? User::find($row->UserId) : null;
            if($account){
                $account->update(['Name'=>$row->FullName,'Email'=>$email,'Password'=>$data['Password'],'MustChangePassword'=>true,'Status'=>($data['PortalStatus']??'Active')==='Active'?'Active':'Suspended']);
                $account->tokens()->delete();
            }else{
                $account=User::create(['TenantId'=>$user->TenantId,'Name'=>$row->FullName,'Email'=>$email,'Password'=>$data['Password'],'MustChangePassword'=>true,'Status'=>'Active','Permissions'=>[]]);
                $row->update(['UserId'=>$account->UserId,'Email'=>$email]);
            }
            $roleId=DB::table('Roles')->where('TenantId',$user->TenantId)->where('RoleName','Parent')->value('RoleId');
            if(!$roleId)$roleId=DB::table('Roles')->insertGetId(['TenantId'=>$user->TenantId,'RoleName'=>'Parent','IsSystemRole'=>true,'CreatedAt'=>now()],'RoleId');
            DB::table('UserRoles')->updateOrInsert(['TenantId'=>$user->TenantId,'UserId'=>$account->UserId,'RoleId'=>$roleId],[]);
            $branches=DB::table('StudentGuardians')->join('Enrollments','StudentGuardians.StudentId','=','Enrollments.StudentId')->where('StudentGuardians.TenantId',$user->TenantId)->where('StudentGuardians.GuardianId',$row->GuardianId)->pluck('Enrollments.BranchId')->unique();
            foreach($branches as $branchId)DB::table('UserBranches')->updateOrInsert(['TenantId'=>$user->TenantId,'UserId'=>$account->UserId,'BranchId'=>$branchId],[]);
            $row->update(['PortalStatus'=>$data['PortalStatus']??'Active']);
            return $account;
        });
        return $this->ok([
            'GuardianId'=>$row->GuardianId,
            'UserId'=>$account->UserId,
            'PortalStatus'=>$row->PortalStatus,
            'Login'=>$account->Email,
        ],'Parent user account created or updated.');
    }

    private function guardian(Request $request): Guardian { $u=$request->user();abort_unless($u instanceof User,403,'User account required.');$g=Guardian::where('TenantId',$u->TenantId)->where('UserId',$u->UserId)->first();abort_unless($g,403,'Parent account required.');return $g; }
    private function activeTenant(Guardian $g){$t=DB::table('Tenants')->where('TenantId',$g->TenantId)->where('Status','Active')->first();abort_unless($t,403,'School account is suspended.');return $t;}
    private function guardianIds(Guardian $g):array{return [(int)$g->GuardianId];}
    private function owns(Guardian $g,int $student):void{abort_unless(DB::table('StudentGuardians')->where('TenantId',$g->TenantId)->whereIn('GuardianId',$this->guardianIds($g))->where('StudentId',$student)->exists(),404);}
    private function guardianPayload(Guardian $g,object $tenant):array{$ids=$this->guardianIds($g);return ['GuardianId'=>$g->GuardianId,'GuardianIds'=>$ids,'UserId'=>$g->UserId,'TenantId'=>$g->TenantId,'FullName'=>$g->FullName,'Email'=>$g->Email,'PrimaryPhone'=>$g->PrimaryPhone,'MustChangePassword'=>false,'School'=>['TenantId'=>$tenant->TenantId,'Name'=>$tenant->Name,'Slug'=>$tenant->Slug],'Children'=>DB::table('StudentGuardians')->join('Students','StudentGuardians.StudentId','=','Students.StudentId')->leftJoin('Enrollments',fn($j)=>$j->on('Students.StudentId','=','Enrollments.StudentId')->where('Enrollments.Status','Active'))->leftJoin('Classes','Enrollments.ClassId','=','Classes.ClassId')->where('StudentGuardians.TenantId',$g->TenantId)->whereIn('StudentGuardians.GuardianId',$ids)->select('Students.StudentId','Students.AdmissionNo','Students.FirstName','Students.MiddleName','Students.LastName','Students.Gender','Students.Status','Students.WelfareStatus','Classes.Name as ClassName','StudentGuardians.IsPrimary','StudentGuardians.IsFeeResponsible')->distinct()->orderBy('Students.FirstName')->get()];}
    private function ok(mixed $data,string $message,int $status=200){return response()->json(['success'=>true,'message'=>$message,'data'=>$data,'meta'=>(object)[]],$status);}
}

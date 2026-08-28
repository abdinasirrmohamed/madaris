<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Services\StudentLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Tenancy\TenantContext;
use App\Domains\Students\Requests\ChangeStudentStatusRequest;
use App\Domains\Students\Requests\TransferStudentRequest;
class StudentLifecycleController extends Controller
{
 public function __construct(private StudentLifecycleService $service){}
 public function profile(int $student){return $this->ok($this->service->profile($student),'Student profile retrieved.');}
 public function update(Request $r,int $student){$data=$r->validate(['Version'=>['required','integer'],'FirstName'=>['required','string','max:100'],'MiddleName'=>['nullable','string','max:100'],'LastName'=>['required','string','max:100'],'Gender'=>['required',Rule::in(['Male','Female'])],'DateOfBirth'=>['nullable','date','before:today'],'Phone'=>['nullable','string','max:30'],'Address'=>['nullable','string','max:255'],'HealthNotes'=>['nullable','string'],'WelfareStatus'=>['required',Rule::in(['Normal','Orphan','Vulnerable','Sponsored'])],'Status'=>['required',Rule::in(['Applicant','Active','Inactive','Graduated','Transferred','Suspended'])]]);$version=$data['Version'];unset($data['Version']);return $this->ok($this->service->update($student,$data,$version),'Student updated.');}
 public function guardian(Request $r,int $student){$data=$r->validate(['FullName'=>['required','string','max:150'],'Gender'=>['nullable',Rule::in(['Male','Female'])],'Relationship'=>['nullable','string','max:50'],'PrimaryPhone'=>['required','string','max:30'],'SecondaryPhone'=>['nullable','string','max:30'],'Email'=>['nullable','email'],'Address'=>['nullable','string'],'NationalId'=>['nullable','string','max:80'],'SmsConsent'=>['boolean'],'IsPrimary'=>['boolean'],'IsFeeResponsible'=>['boolean']]);return $this->ok($this->service->addGuardian($student,$data),'Guardian linked.',201);}
 public function enroll(Request $r,int $student){return $this->ok($this->service->enroll($student,$this->enrollment($r)),'Student enrolled.',201);}
 public function promote(Request $r,int $student){$data=$this->enrollment($r);$data['PromotionStatus']=$r->validate(['PromotionStatus'=>['nullable',Rule::in(['Promoted','Retained'])]])['PromotionStatus']??'Promoted';return $this->ok($this->service->promote($student,$data),'Student promoted.',201);}
 public function clearance(Request $r,int $student){$data=$r->validate(['AcademicCleared'=>['boolean'],'QuranCleared'=>['boolean'],'FinanceCleared'=>['boolean'],'DisciplineCleared'=>['boolean'],'AssetsCleared'=>['boolean'],'Notes'=>['nullable','string']]);return $this->ok($this->service->clearance($student,$data),'Clearance saved.');}
 public function graduate(Request $r,int $student){$data=$r->validate(['GraduationDate'=>['required','date'],'Notes'=>['nullable','string']]);return $this->ok($this->service->graduate($student,$data),'Student graduated.',201);}
 public function status(ChangeStudentStatusRequest $r,int $student){return $this->ok($this->service->changeStatus($student,$r->validated()),'Student status updated.');}
 public function transfer(TransferStudentRequest $r,int $student){return $this->ok($this->service->transfer($student,$r->validated()),'Student transferred.',201);}
 public function document(Request $r,int $student){$data=$r->validate(['DocumentType'=>['required','string','max:80'],'file'=>['required','file','max:10240','mimes:pdf,jpg,jpeg,png,doc,docx']]);$file=$data['file'];$path=$file->store("student-documents/{$student}",'local');$record=$this->service->addDocument($student,['DocumentType'=>$data['DocumentType'],'OriginalName'=>$file->getClientOriginalName(),'StoragePath'=>$path,'MimeType'=>$file->getMimeType()?:'application/octet-stream','FileSize'=>$file->getSize()]);return $this->ok($record,'Student document uploaded.',201);}
 public function download(int $student,int $document,TenantContext $tenant){$row=DB::table('StudentDocuments')->where('TenantId',$tenant->id())->where('StudentId',$student)->where('StudentDocumentId',$document)->first();abort_unless($row,404);abort_unless(Storage::disk('local')->exists($row->StoragePath),404);return Storage::disk('local')->download($row->StoragePath,$row->OriginalName);}
 private function enrollment(Request $r):array{return $r->validate(['BranchId'=>['required','integer'],'AcademicYearId'=>['required','integer'],'ClassId'=>['required','integer'],'EnrolledAt'=>['required','date'],'OverrideCapacity'=>['boolean']]);}
 private function ok(mixed $data,string $message,int $status=200){return response()->json(['success'=>true,'message'=>$message,'data'=>$data,'meta'=>(object)[]],$status);}
}

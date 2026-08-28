<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class StoreStudentRequest extends FormRequest
{
 public function authorize():bool{return true;}
 public function rules():array{return ['BranchId'=>['required','integer'],'AdmissionNo'=>['required','string','max:50',Rule::unique('Students','AdmissionNo')->where(fn($q)=>$q->where('TenantId',$this->user()->TenantId))],'FirstName'=>['required','string','max:100'],'MiddleName'=>['nullable','string','max:100'],'LastName'=>['required','string','max:100'],'Gender'=>['required',Rule::in(['Male','Female'])],'DateOfBirth'=>['nullable','date','before:today'],'Phone'=>['nullable','string','max:30'],'Address'=>['nullable','string','max:255'],'HealthNotes'=>['nullable','string'],'AdmissionDate'=>['required','date'],'WelfareStatus'=>['required',Rule::in(['Normal','Orphan','Vulnerable','Sponsored'])],'Status'=>['required',Rule::in(['Applicant','Active','Inactive','Graduated','Transferred','Suspended'])]];}
}

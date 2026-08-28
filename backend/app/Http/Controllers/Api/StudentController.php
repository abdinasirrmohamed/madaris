<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentRequest;
use App\Models\Student;
use App\Services\StudentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use App\Domains\Students\Resources\StudentResource;

class StudentController extends Controller
{
    public function __construct(private StudentService $service) {}
    public function index(Request $request) { Gate::authorize('viewAny',Student::class);$page=$this->service->list($request->only(['BranchId','Status','search','per_page'])); return response()->json(['success'=>true,'message'=>'Students retrieved.','data'=>StudentResource::collection($page->items())->resolve(),'meta'=>['current_page'=>$page->currentPage(),'last_page'=>$page->lastPage(),'total'=>$page->total()]]); }
    public function store(StoreStudentRequest $request) { Gate::authorize('create',Student::class);$record=$this->service->create($request->validated());return response()->json(['success'=>true,'message'=>'Student created.','data'=>(new StudentResource($record))->resolve(),'meta'=>(object)[]],201); }
    public function show(int $student) { $record=Student::findOrFail($student);Gate::authorize('view',$record); return response()->json(['success'=>true,'message'=>'Student retrieved.','data'=>(new StudentResource($record))->resolve(),'meta'=>(object)[]]); }
}

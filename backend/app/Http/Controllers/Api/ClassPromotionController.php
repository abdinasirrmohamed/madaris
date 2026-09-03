<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClassPromotionController extends Controller
{
    public function references(TenantContext $tenant)
    {
        $tenantId = $tenant->id();
        $branches = $this->branchIds($tenant);

        $academicYears = DB::table('AcademicYears')
            ->where('TenantId', $tenantId)
            ->orderByDesc('IsDefault')
            ->orderByDesc('StartDate')
            ->get();

        $levels = DB::table('Levels')
            ->where('TenantId', $tenantId)
            ->where('Status', 'Active')
            ->orderBy('SequenceNo')
            ->get();

        $classes = DB::table('Classes')
            ->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')
            ->where('Classes.TenantId', $tenantId)
            ->whereIn('Classes.BranchId', $branches)
            ->where('Classes.Status', 'Active')
            ->select(
                'Classes.*',
                'Levels.Name as LevelName',
                'Levels.SequenceNo as LevelSequence',
                'Levels.MinimumPromotionScore'
            )
            ->orderBy('Classes.Name')
            ->get()
            ->map(function ($cls) use ($tenantId) {
                $enrolled = DB::table('Enrollments')
                    ->where('TenantId', $tenantId)
                    ->where('ClassId', $cls->ClassId)
                    ->where('Status', 'Active')
                    ->count();
                $cls->CurrentEnrolled = $enrolled;
                $cls->AvailableSeats = max(0, (int) $cls->Capacity - $enrolled);
                return $cls;
            });

        $userBranches = DB::table('Branches')
            ->where('TenantId', $tenantId)
            ->whereIn('BranchId', $branches)
            ->where('Status', 'Active')
            ->get();

        return $this->ok([
            'Branches' => $userBranches,
            'AcademicYears' => $academicYears,
            'Levels' => $levels,
            'Classes' => $classes,
        ], 'Promotion references retrieved.');
    }

    public function candidates(Request $request, TenantContext $tenant)
    {
        $data = $request->validate([
            'BranchId' => ['required', 'integer'],
            'AcademicYearId' => ['required', 'integer'],
            'ClassId' => ['required', 'integer'],
        ]);

        $tenantId = $tenant->id();
        abort_unless(in_array((int) $data['BranchId'], $this->branchIds($tenant), true), 403);

        $sourceClass = DB::table('Classes')
            ->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')
            ->where('Classes.TenantId', $tenantId)
            ->where('Classes.ClassId', $data['ClassId'])
            ->select(
                'Classes.*',
                'Levels.Name as LevelName',
                'Levels.SequenceNo as LevelSequence',
                'Levels.MinimumPromotionScore'
            )
            ->first();

        abort_unless($sourceClass, 404, 'Fasalka lama helin.');

        // Suggest the next class: find class in same branch with SequenceNo = current + 1
        $suggestedTarget = null;
        if ($sourceClass->LevelSequence) {
            $nextLevelClass = DB::table('Classes')
                ->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')
                ->where('Classes.TenantId', $tenantId)
                ->where('Classes.BranchId', $data['BranchId'])
                ->where('Classes.Status', 'Active')
                ->where('Levels.SequenceNo', '>', $sourceClass->LevelSequence)
                ->orderBy('Levels.SequenceNo')
                ->first();

            if ($nextLevelClass) {
                $suggestedTarget = $nextLevelClass->ClassId;
            }
        }

        // Active students enrolled in this class and year
        $students = DB::table('Enrollments')
            ->join('Students', 'Enrollments.StudentId', '=', 'Students.StudentId')
            ->where('Enrollments.TenantId', $tenantId)
            ->where('Enrollments.BranchId', $data['BranchId'])
            ->where('Enrollments.ClassId', $data['ClassId'])
            ->where('Enrollments.AcademicYearId', $data['AcademicYearId'])
            ->where('Enrollments.Status', 'Active')
            ->where('Students.Status', 'Active')
            ->select(
                'Students.StudentId',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Students.Gender',
                'Students.Status as StudentStatus',
                'Enrollments.EnrollmentId',
                'Enrollments.EnrolledAt'
            )
            ->orderBy('Students.FirstName')
            ->orderBy('Students.LastName')
            ->get();

        $minScore = (float) ($sourceClass->MinimumPromotionScore ?? 50.0);
        $isFinalClass = $suggestedTarget === null;
        $requiredExamIds = DB::table('Exams')->where('TenantId',$tenantId)->where('ClassId',$data['ClassId'])->where('AcademicYearId',$data['AcademicYearId'])->whereIn('Status',['Published','Locked'])->pluck('ExamId');
        $unfinishedExamCount = DB::table('Exams')->where('TenantId',$tenantId)->where('ClassId',$data['ClassId'])->where('AcademicYearId',$data['AcademicYearId'])->whereNotIn('Status',['Published','Locked','Cancelled'])->count();

        // Calculate exam average for each student in this class & academic year
        $studentList = $students->map(function ($st) use ($tenantId, $data, $minScore, $suggestedTarget, $isFinalClass, $requiredExamIds, $unfinishedExamCount) {
            $marks = DB::table('StudentMarks')
                ->join('Exams', 'StudentMarks.ExamId', '=', 'Exams.ExamId')
                ->where('StudentMarks.TenantId', $tenantId)
                ->where('StudentMarks.StudentId', $st->StudentId)
                ->where('Exams.ClassId', $data['ClassId'])
                ->where('Exams.AcademicYearId', $data['AcademicYearId'])->whereIn('Exams.Status',['Published','Locked'])
                ->select('StudentMarks.MarksObtained', 'Exams.MaximumMark', 'StudentMarks.Grade')
                ->get();

            $totalObtained = (float) $marks->sum('MarksObtained');
            $totalMax = (float) $marks->sum('MaximumMark');
            $hasExams = $totalMax > 0;
            $average = $hasExams ? round(($totalObtained / $totalMax) * 100, 1) : null;

            $missingExamCount = max(0,$requiredExamIds->count()-$marks->count());
            $hasPendingExams = $unfinishedExamCount > 0 || $missingExamCount > 0 || !$hasExams;
            $passed = !$hasPendingExams && $average >= $minScore;
            $proposedStatus = $passed ? ($isFinalClass ? 'Graduated' : 'Promoted') : 'Retained';

            return [
                'StudentId' => $st->StudentId,
                'AdmissionNo' => $st->AdmissionNo,
                'StudentName' => trim($st->FirstName . ' ' . $st->LastName),
                'Gender' => $st->Gender,
                'EnrollmentId' => $st->EnrollmentId,
                'EnrolledAt' => $st->EnrolledAt,
                'ExamCount' => $marks->count(),
                'AverageScore' => $average,
                'MinimumPromotionScore' => $minScore,
                'Passed' => $passed,
                'MissingExamCount' => $missingExamCount,
                'UnfinishedExamCount' => $unfinishedExamCount,
                'EligibilityReason' => !$hasExams ? 'No published exam results' : ($unfinishedExamCount ? 'Exams are not yet published or locked' : ($missingExamCount ? 'One or more exam marks are missing' : ($average < $minScore ? 'Average is below the promotion minimum' : 'Eligible'))),
                'ProposedStatus' => $proposedStatus,
                'SuggestedClassId' => $passed && !$isFinalClass ? $suggestedTarget : $data['ClassId'],
            ];
        });

        return $this->ok([
            'SourceClass' => $sourceClass,
            'SuggestedTargetClassId' => $suggestedTarget,
            'IsFinalClass' => $isFinalClass,
            'MinimumPromotionScore' => $minScore,
            'TotalCandidates' => $studentList->count(),
            'Candidates' => $studentList,
        ], 'Promotion candidates retrieved.');
    }

    public function promote(Request $request, TenantContext $tenant)
    {
        $d = $request->validate([
            'BranchId' => ['required', 'integer'],
            'FromAcademicYearId' => ['required', 'integer'],
            'FromClassId' => ['required', 'integer'],
            'ToAcademicYearId' => ['required', 'integer'],
            'ToClassId' => ['nullable', 'integer'],
            'OverrideCapacity' => ['boolean'],
            'Students' => ['required', 'array', 'min:1'],
            'Students.*.StudentId' => ['required', 'integer'],
            'Students.*.Action' => ['required', Rule::in(['Promoted', 'Graduated', 'Retained', 'Leave', 'Skip'])],
            'Students.*.ToClassId' => ['nullable', 'integer'],
            'Students.*.ToAcademicYearId' => ['nullable', 'integer'],
        ]);

        $tenantId = $tenant->id();
        $userId = $tenant->user()->UserId;
        abort_unless(in_array((int) $d['BranchId'], $this->branchIds($tenant), true), 403);

        $overrideCapacity = (bool) ($d['OverrideCapacity'] ?? false);
        $sourceClass = DB::table('Classes')->join('Levels','Classes.LevelId','=','Levels.LevelId')->where('Classes.TenantId',$tenantId)->where('Classes.ClassId',$d['FromClassId'])->select('Classes.*','Levels.SequenceNo','Levels.MinimumPromotionScore')->first();
        abort_unless($sourceClass,404,'Source class not found.');
        $nextClass = DB::table('Classes')->join('Levels','Classes.LevelId','=','Levels.LevelId')->where('Classes.TenantId',$tenantId)->where('Classes.BranchId',$d['BranchId'])->where('Classes.Status','Active')->where('Levels.SequenceNo','>',$sourceClass->SequenceNo)->orderBy('Levels.SequenceNo')->first();
        $isFinalClass = !$nextClass;
        foreach($d['Students'] as $item){
            if(!in_array($item['Action'],['Promoted','Graduated'],true))continue;
            $eligibility=$this->promotionEligibility($tenantId,(int)$item['StudentId'],(int)$d['FromClassId'],(int)$d['FromAcademicYearId'],(float)$sourceClass->MinimumPromotionScore);
            if(!$eligibility['Eligible'])throw ValidationException::withMessages(['Students'=>"Student {$item['StudentId']} cannot advance: {$eligibility['Reason']}."]);
            if($isFinalClass&&$item['Action']!=='Graduated')throw ValidationException::withMessages(['Students'=>'Students passing the final class must be graduated.']);
            if(!$isFinalClass&&$item['Action']==='Graduated')throw ValidationException::withMessages(['Students'=>'Only students in the final class can graduate.']);
        }

        // Group incoming students by target class to verify capacity
        $incomingCounts = [];
        foreach ($d['Students'] as $item) {
            if (in_array($item['Action'], ['Promoted', 'Retained'], true)) {
                $targetClassId = (int) ($item['ToClassId'] ?? $d['ToClassId']);
                $incomingCounts[$targetClassId] = ($incomingCounts[$targetClassId] ?? 0) + 1;
            }
        }

        if (! $overrideCapacity) {
            foreach ($incomingCounts as $clsId => $incomingCount) {
                $targetClass = DB::table('Classes')
                    ->where('TenantId', $tenantId)
                    ->where('ClassId', $clsId)
                    ->first();

                if ($targetClass) {
                    $currentEnrolled = DB::table('Enrollments')
                        ->where('TenantId', $tenantId)
                        ->where('ClassId', $clsId)
                        ->where('Status', 'Active')
                        ->count();

                    $available = (int) $targetClass->Capacity - $currentEnrolled;
                    if ($incomingCount > $available) {
                        throw ValidationException::withMessages([
                            'ToClassId' => "Fasalka '{$targetClass->Name}' ma qaadi karo {$incomingCount} arday (waxaa bannaan {$available} kuraas oo qura, Capacity: {$targetClass->Capacity}). Dooro 'Override Capacity' haddii aad doonayso inaad ku darto.",
                        ]);
                    }
                }
            }
        }

        $promotedCount = 0;
        $retainedCount = 0;
        $leaveCount = 0;
        $graduatedCount = 0;

        DB::transaction(function () use (
            $d,
            $tenantId,
            $userId,
            &$promotedCount,
            &$retainedCount,
            &$leaveCount
            ,&$graduatedCount
        ) {
            foreach ($d['Students'] as $item) {
                $action = $item['Action'];
                $studentId = (int) $item['StudentId'];
                $targetClassId = (int) ($item['ToClassId'] ?? $d['ToClassId']);
                $targetYearId = (int) ($item['ToAcademicYearId'] ?? $d['ToAcademicYearId']);

                if ($action === 'Skip') {
                    continue;
                }

                // Complete current active enrollment in the source class
                DB::table('Enrollments')
                    ->where('TenantId', $tenantId)
                    ->where('StudentId', $studentId)
                    ->where('Status', 'Active')
                    ->update([
                        'Status' => 'Completed',
                        'UpdatedAt' => now(),
                    ]);

                if (in_array($action, ['Promoted', 'Retained'], true)) {
                    // Create new active enrollment
                    DB::table('Enrollments')->insert([
                        'TenantId' => $tenantId,
                        'BranchId' => $d['BranchId'],
                        'StudentId' => $studentId,
                        'ClassId' => $targetClassId,
                        'AcademicYearId' => $targetYearId,
                        'EnrolledAt' => now()->toDateString(),
                        'Status' => 'Active',
                        'CreatedAt' => now(),
                        'UpdatedAt' => now(),
                    ]);

                    // Insert into PromotionLogs
                    DB::table('PromotionLogs')->insert([
                        'TenantId' => $tenantId,
                        'BranchId' => $d['BranchId'],
                        'StudentId' => $studentId,
                        'FromClassId' => $d['FromClassId'],
                        'ToClassId' => $targetClassId,
                        'FromAcademicYearId' => $d['FromAcademicYearId'],
                        'ToAcademicYearId' => $targetYearId,
                        'Status' => $action,
                        'PromotedByUserId' => $userId,
                        'CreatedAt' => now(),
                    ]);

                    if ($action === 'Promoted') {
                        $promotedCount++;
                    } else {
                        $retainedCount++;
                    }
                } elseif ($action === 'Graduated') {
                    DB::table('Students')->where('TenantId',$tenantId)->where('StudentId',$studentId)->update(['Status'=>'Graduated','UpdatedAt'=>now()]);
                    $certificateNo='CERT-'.now()->format('Y').'-'.str_pad((string)(DB::table('Graduations')->where('TenantId',$tenantId)->count()+1),6,'0',STR_PAD_LEFT);
                    DB::table('Graduations')->insert(['TenantId'=>$tenantId,'BranchId'=>$d['BranchId'],'StudentId'=>$studentId,'EnrollmentId'=>DB::table('Enrollments')->where('TenantId',$tenantId)->where('StudentId',$studentId)->where('ClassId',$d['FromClassId'])->where('AcademicYearId',$d['FromAcademicYearId'])->value('EnrollmentId'),'GraduationDate'=>today(),'CertificateNo'=>$certificateNo,'ClearanceStatus'=>'Auto-cleared','ApprovalStatus'=>'Approved','ApprovedByUserId'=>$userId,'Notes'=>'Automatically graduated after passing the final class.','CreatedAt'=>now()]);
                    DB::table('PromotionLogs')->insert(['TenantId'=>$tenantId,'BranchId'=>$d['BranchId'],'StudentId'=>$studentId,'FromClassId'=>$d['FromClassId'],'ToClassId'=>null,'FromAcademicYearId'=>$d['FromAcademicYearId'],'ToAcademicYearId'=>$targetYearId,'Status'=>'Graduated','PromotedByUserId'=>$userId,'CreatedAt'=>now()]);
                    $graduatedCount++;
                } elseif ($action === 'Leave') {
                    DB::table('Students')
                        ->where('TenantId', $tenantId)
                        ->where('StudentId', $studentId)
                        ->update([
                            'Status' => 'Inactive',
                            'UpdatedAt' => now(),
                        ]);

                    $leaveCount++;
                }
            }

            DB::table('AuditLogs')->insert([
                'TenantId' => $tenantId,
                'UserId' => $userId,
                'Action' => 'ClassPromotionExecuted',
                'EntityType' => 'Classes',
                'EntityId' => (string) $d['FromClassId'],
                'AfterData' => json_encode([
                    'FromClassId' => $d['FromClassId'],
                    'ToClassId' => $d['ToClassId'],
                    'FromAcademicYearId' => $d['FromAcademicYearId'],
                    'ToAcademicYearId' => $d['ToAcademicYearId'],
                    'PromotedCount' => $promotedCount,
                    'RetainedCount' => $retainedCount,
                    'LeaveCount' => $leaveCount,
                    'GraduatedCount' => $graduatedCount,
                ]),
                'IpAddress' => request()->ip(),
                'UserAgent' => mb_substr((string) request()->userAgent(), 0, 1000),
                'RequestId' => (string) str()->uuid(),
                'CreatedAt' => now(),
            ]);
        });

        return $this->ok([
            'PromotedCount' => $promotedCount,
            'RetainedCount' => $retainedCount,
            'LeaveCount' => $leaveCount,
            'GraduatedCount' => $graduatedCount,
            'Total' => $promotedCount + $retainedCount + $leaveCount + $graduatedCount,
        ], "Dallacsiintii fasalka waa la fuliyay: {$promotedCount} waa la dallacsiiyay, {$retainedCount} fasalka ayay ku celiyeen.");
    }

    private function promotionEligibility(int $tenantId,int $studentId,int $classId,int $yearId,float $minimum):array
    {
        $exams=DB::table('Exams')->where('TenantId',$tenantId)->where('ClassId',$classId)->where('AcademicYearId',$yearId)->get();
        if($exams->isEmpty())return ['Eligible'=>false,'Reason'=>'no examinations are configured'];
        if($exams->contains(fn($exam)=>!in_array($exam->Status,['Published','Locked','Cancelled'],true)))return ['Eligible'=>false,'Reason'=>'one or more examinations are unfinished'];
        $required=$exams->whereIn('Status',['Published','Locked']);if($required->isEmpty())return ['Eligible'=>false,'Reason'=>'no published examination exists'];
        $marks=DB::table('StudentMarks')->where('TenantId',$tenantId)->where('StudentId',$studentId)->whereIn('ExamId',$required->pluck('ExamId'))->get()->keyBy('ExamId');
        if($marks->count()!==$required->count())return ['Eligible'=>false,'Reason'=>'one or more examination marks are missing'];
        $maximum=(float)$required->sum('MaximumMark');$obtained=(float)$required->sum(fn($exam)=>(float)$marks[$exam->ExamId]->MarksObtained);$average=$maximum>0?round($obtained/$maximum*100,1):0;
        return ['Eligible'=>$average>=$minimum,'Reason'=>$average>=$minimum?'eligible':"average {$average}% is below required {$minimum}%",'Average'=>$average];
    }

    public function logs(Request $request, TenantContext $tenant)
    {
        $tenantId = $tenant->id();
        $branches = $this->branchIds($tenant);

        $q = DB::table('PromotionLogs')
            ->join('Students', 'PromotionLogs.StudentId', '=', 'Students.StudentId')
            ->leftJoin('Classes as FromClass', 'PromotionLogs.FromClassId', '=', 'FromClass.ClassId')
            ->leftJoin('Classes as ToClass', 'PromotionLogs.ToClassId', '=', 'ToClass.ClassId')
            ->leftJoin('AcademicYears as FromYear', 'PromotionLogs.FromAcademicYearId', '=', 'FromYear.AcademicYearId')
            ->leftJoin('AcademicYears as ToYear', 'PromotionLogs.ToAcademicYearId', '=', 'ToYear.AcademicYearId')
            ->leftJoin('Users', 'PromotionLogs.PromotedByUserId', '=', 'Users.UserId')
            ->where('PromotionLogs.TenantId', $tenantId)
            ->whereIn('PromotionLogs.BranchId', $branches)
            ->when($request->Status, fn ($q, $v) => $q->where('PromotionLogs.Status', $v))
            ->when($request->FromClassId, fn ($q, $v) => $q->where('PromotionLogs.FromClassId', $v))
            ->when($request->ToClassId, fn ($q, $v) => $q->where('PromotionLogs.ToClassId', $v))
            ->when($request->FromAcademicYearId, fn ($q, $v) => $q->where('PromotionLogs.FromAcademicYearId', $v))
            ->when($request->ToAcademicYearId, fn ($q, $v) => $q->where('PromotionLogs.ToAcademicYearId', $v))
            ->when($request->Search, function ($q, $v) {
                $q->where(function ($sub) use ($v) {
                    $sub->where('Students.FirstName', 'like', "%{$v}%")
                        ->orWhere('Students.LastName', 'like', "%{$v}%")
                        ->orWhere('Students.AdmissionNo', 'like', "%{$v}%")
                        ->orWhere('FromClass.Name', 'like', "%{$v}%")
                        ->orWhere('ToClass.Name', 'like', "%{$v}%");
                });
            })
            ->select(
                'PromotionLogs.*',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Students.Gender',
                'FromClass.Name as FromClassName',
                'ToClass.Name as ToClassName',
                'FromYear.Name as FromYearName',
                'ToYear.Name as ToYearName',
                'Users.Name as PromotedByName'
            )
            ->orderByDesc('PromotionLogs.PromotionLogId')
            ->paginate(min($request->integer('per_page', 25), 100));

        $q->getCollection()->transform(function ($r) {
            $r->StudentName = trim(($r->FirstName ?? '') . ' ' . ($r->LastName ?? ''));
            unset($r->FirstName, $r->LastName);
            return $r;
        });

        $summary = [
            'Total' => DB::table('PromotionLogs')->where('TenantId', $tenantId)->count(),
            'Promoted' => DB::table('PromotionLogs')->where('TenantId', $tenantId)->where('Status', 'Promoted')->count(),
            'Retained' => DB::table('PromotionLogs')->where('TenantId', $tenantId)->where('Status', 'Retained')->count(),
            'Graduated' => DB::table('PromotionLogs')->where('TenantId', $tenantId)->where('Status', 'Graduated')->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Promotion logs retrieved.',
            'data' => $q->items(),
            'summary' => $summary,
            'meta' => (object) [
                'total' => $q->total(),
                'page' => $q->currentPage(),
                'per_page' => $q->perPage(),
                'last_page' => $q->lastPage(),
            ],
        ]);
    }

    public function revert(TenantContext $tenant, int $id)
    {
        $tenantId = $tenant->id();
        $log = DB::table('PromotionLogs')
            ->where('TenantId', $tenantId)
            ->where('PromotionLogId', $id)
            ->first();

        abort_unless($log, 404, 'Diiwaanka dallacsiinta lama helin.');

        DB::transaction(function () use ($log, $tenantId, $tenant, $id) {
            if ($log->Status === 'Graduated') {
                $enrollmentId = DB::table('Enrollments')->where('TenantId',$tenantId)->where('StudentId',$log->StudentId)->where('ClassId',$log->FromClassId)->where('AcademicYearId',$log->FromAcademicYearId)->value('EnrollmentId');
                DB::table('Graduations')->where('TenantId',$tenantId)->where('StudentId',$log->StudentId)->where('EnrollmentId',$enrollmentId)->delete();
                DB::table('Students')->where('TenantId',$tenantId)->where('StudentId',$log->StudentId)->update(['Status'=>'Active','UpdatedAt'=>now()]);
            }
            // Cancel the newer active enrollment that was created by this promotion
            DB::table('Enrollments')
                ->where('TenantId', $tenantId)
                ->where('StudentId', $log->StudentId)
                ->where('ClassId', $log->ToClassId)
                ->where('AcademicYearId', $log->ToAcademicYearId)
                ->where('Status', 'Active')
                ->delete();

            // Restore previous enrollment back to Active
            DB::table('Enrollments')
                ->where('TenantId', $tenantId)
                ->where('StudentId', $log->StudentId)
                ->where('ClassId', $log->FromClassId)
                ->where('AcademicYearId', $log->FromAcademicYearId)
                ->update([
                    'Status' => 'Active',
                    'UpdatedAt' => now(),
                ]);

            // Remove promotion log
            DB::table('PromotionLogs')
                ->where('PromotionLogId', $id)
                ->delete();

            DB::table('AuditLogs')->insert([
                'TenantId' => $tenantId,
                'UserId' => $tenant->user()->UserId,
                'Action' => 'PromotionReverted',
                'EntityType' => 'PromotionLogs',
                'EntityId' => (string) $id,
                'AfterData' => json_encode($log),
                'IpAddress' => request()->ip(),
                'UserAgent' => mb_substr((string) request()->userAgent(), 0, 1000),
                'RequestId' => (string) str()->uuid(),
                'CreatedAt' => now(),
            ]);
        });

        return $this->ok((object) [], 'Dallacsiintii waa laga noqday, ardaygana waxaa dib loogu celiyay fasalkiisii hore.');
    }

    private function branchIds(TenantContext $tenant): array
    {
        return DB::table('UserBranches')
            ->where('TenantId', $tenant->id())
            ->where('UserId', $tenant->user()->UserId)
            ->pluck('BranchId')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function ok(mixed $data, string $message, int $status = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => (object) [],
        ], $status);
    }
}

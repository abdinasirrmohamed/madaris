<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcademicGraduationController extends Controller
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
            ->get();

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
        ], 'Graduation references retrieved.');
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

        $class = DB::table('Classes')
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

        abort_unless($class, 404, 'Fasalka lama helin.');

        $minScore = (float) ($class->MinimumPromotionScore ?? 50.0);

        // Get all active students enrolled in this class and academic year
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

        $candidates = $students->map(function ($st) use ($tenantId, $data, $minScore) {
            // Check if already graduated
            $alreadyGraduated = DB::table('Graduations')
                ->where('TenantId', $tenantId)
                ->where('StudentId', $st->StudentId)
                ->where('EnrollmentId', $st->EnrollmentId)
                ->first();

            // Academic / Exam evaluation
            $marks = DB::table('StudentMarks')
                ->join('Exams', 'StudentMarks.ExamId', '=', 'Exams.ExamId')
                ->where('StudentMarks.TenantId', $tenantId)
                ->where('StudentMarks.StudentId', $st->StudentId)
                ->where('Exams.ClassId', $data['ClassId'])
                ->where('Exams.AcademicYearId', $data['AcademicYearId'])
                ->select('StudentMarks.MarksObtained', 'Exams.MaximumMark', 'StudentMarks.Grade')
                ->get();

            $totalObtained = (float) $marks->sum('MarksObtained');
            $totalMax = (float) $marks->sum('MaximumMark');
            $hasExams = $totalMax > 0;
            $average = $hasExams ? round(($totalObtained / $totalMax) * 100, 1) : null;
            $courseCompleted = $hasExams ? ($average >= $minScore) : true;

            // Financial evaluation (Invoices and outstanding debt)
            $invoices = DB::table('Invoices')
                ->where('TenantId', $tenantId)
                ->where('StudentId', $st->StudentId)
                ->get();

            $totalInvoiced = (float) $invoices->sum('Total');
            $outstandingBalance = (float) $invoices->sum('Balance');
            $totalPaid = max(0, $totalInvoiced - $outstandingBalance);
            $unpaidInvoicesCount = $invoices->where('Balance', '>', 0)->count();

            // Zero balance requirement
            $financeCleared = $outstandingBalance <= 0.009;

            // Overall eligibility
            $isEligible = $courseCompleted && $financeCleared && ! $alreadyGraduated;

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
                'CourseCompleted' => $courseCompleted,
                'TotalInvoiced' => $totalInvoiced,
                'TotalPaid' => $totalPaid,
                'OutstandingBalance' => $outstandingBalance,
                'UnpaidInvoicesCount' => $unpaidInvoicesCount,
                'FinanceCleared' => $financeCleared,
                'AlreadyGraduated' => (bool) $alreadyGraduated,
                'CertificateNo' => $alreadyGraduated ? $alreadyGraduated->CertificateNo : null,
                'IsEligible' => $isEligible,
                'Selected' => $isEligible,
            ];
        });

        return $this->ok([
            'Class' => $class,
            'TotalCandidates' => $candidates->count(),
            'EligibleCount' => $candidates->where('IsEligible', true)->count(),
            'BlockedFinancialCount' => $candidates->where('FinanceCleared', false)->count(),
            'Candidates' => $candidates,
        ], 'Graduation candidates evaluated.');
    }

    public function graduate(Request $request, TenantContext $tenant)
    {
        $d = $request->validate([
            'BranchId' => ['required', 'integer'],
            'AcademicYearId' => ['required', 'integer'],
            'ClassId' => ['required', 'integer'],
            'GraduationDate' => ['required', 'date'],
            'OverrideFinancialHold' => ['boolean'],
            'Notes' => ['nullable', 'string', 'max:500'],
            'Students' => ['required', 'array', 'min:1'],
            'Students.*.StudentId' => ['required', 'integer'],
            'Students.*.EnrollmentId' => ['required', 'integer'],
            'Students.*.Selected' => ['required', 'boolean'],
        ]);

        $tenantId = $tenant->id();
        $userId = $tenant->user()->UserId;
        abort_unless(in_array((int) $d['BranchId'], $this->branchIds($tenant), true), 403);

        $overrideFinance = (bool) ($d['OverrideFinancialHold'] ?? false);
        $selectedStudents = array_filter($d['Students'], fn ($s) => $s['Selected'] ?? false);

        if (empty($selectedStudents)) {
            throw ValidationException::withMessages([
                'Students' => 'Fadlan dooro ugu yaraan hal arday oo qalin-jabinaya.',
            ]);
        }

        // Financial validation if not overridden
        if (! $overrideFinance) {
            foreach ($selectedStudents as $item) {
                $balance = (float) DB::table('Invoices')
                    ->where('TenantId', $tenantId)
                    ->where('StudentId', $item['StudentId'])
                    ->sum('Balance');

                if ($balance > 0.009) {
                    $stName = DB::table('Students')->where('StudentId', $item['StudentId'])->value('FirstName');
                    throw ValidationException::withMessages([
                        'Students' => "Ardayga {$stName} waxaa lagu leeyahay \${$balance}. Bixi lacagta dhiman ama dooro 'Override Financial Hold' si aad u qalin-jabiso.",
                    ]);
                }
            }
        }

        $graduatedList = [];

        DB::transaction(function () use ($d, $tenantId, $userId, $selectedStudents, &$graduatedList) {
            $currentYear = date('Y', strtotime($d['GraduationDate']));

            foreach ($selectedStudents as $item) {
                $studentId = (int) $item['StudentId'];
                $enrollmentId = (int) $item['EnrollmentId'];

                // Check if already has a graduation entry
                $existing = DB::table('Graduations')
                    ->where('TenantId', $tenantId)
                    ->where('StudentId', $studentId)
                    ->where('EnrollmentId', $enrollmentId)
                    ->first();

                if ($existing) {
                    continue;
                }

                // Generate certificate number
                $count = DB::table('Graduations')->where('TenantId', $tenantId)->count() + 1;
                $certNo = 'CERT-' . $currentYear . '-' . str_pad((string) $count, 6, '0', STR_PAD_LEFT);

                // Update clearances
                DB::table('StudentClearances')->updateOrInsert(
                    [
                        'TenantId' => $tenantId,
                        'StudentId' => $studentId,
                        'EnrollmentId' => $enrollmentId,
                    ],
                    [
                        'BranchId' => $d['BranchId'],
                        'AcademicCleared' => true,
                        'QuranCleared' => true,
                        'FinanceCleared' => true,
                        'DisciplineCleared' => true,
                        'AssetsCleared' => true,
                        'Status' => 'Cleared',
                        'ApprovedByUserId' => $userId,
                        'ApprovedAt' => now(),
                        'Notes' => $d['Notes'] ?? 'Academic graduation approved.',
                        'CreatedAt' => now(),
                    ]
                );

                // Insert into Graduations
                $gradId = DB::table('Graduations')->insertGetId([
                    'TenantId' => $tenantId,
                    'BranchId' => $d['BranchId'],
                    'StudentId' => $studentId,
                    'EnrollmentId' => $enrollmentId,
                    'GraduationDate' => $d['GraduationDate'],
                    'CertificateNo' => $certNo,
                    'ClearanceStatus' => 'Cleared',
                    'ApprovalStatus' => 'Approved',
                    'ApprovedByUserId' => $userId,
                    'Notes' => $d['Notes'] ?? null,
                    'CreatedAt' => now(),
                ], 'GraduationId');

                // Mark student and enrollment as Graduated
                DB::table('Students')
                    ->where('TenantId', $tenantId)
                    ->where('StudentId', $studentId)
                    ->update([
                        'Status' => 'Graduated',
                        'UpdatedAt' => now(),
                    ]);

                DB::table('Enrollments')
                    ->where('TenantId', $tenantId)
                    ->where('EnrollmentId', $enrollmentId)
                    ->update([
                        'Status' => 'Graduated',
                        'UpdatedAt' => now(),
                    ]);

                $graduatedList[] = [
                    'GraduationId' => $gradId,
                    'StudentId' => $studentId,
                    'CertificateNo' => $certNo,
                ];
            }

            DB::table('AuditLogs')->insert([
                'TenantId' => $tenantId,
                'UserId' => $userId,
                'Action' => 'AcademicGraduationExecuted',
                'EntityType' => 'Graduations',
                'EntityId' => (string) ($graduatedList[0]['GraduationId'] ?? '0'),
                'AfterData' => json_encode([
                    'ClassId' => $d['ClassId'],
                    'GraduationDate' => $d['GraduationDate'],
                    'GraduatedCount' => count($graduatedList),
                    'Certificates' => array_column($graduatedList, 'CertificateNo'),
                ]),
                'IpAddress' => request()->ip(),
                'UserAgent' => mb_substr((string) request()->userAgent(), 0, 1000),
                'RequestId' => (string) str()->uuid(),
                'CreatedAt' => now(),
            ]);
        });

        $count = count($graduatedList);
        return $this->ok([
            'GraduatedCount' => $count,
            'Graduations' => $graduatedList,
        ], "Qalin-jabinta waa la xaqiijiyay: {$count} arday ayaa si guul leh u qalin-jabisay waxaana loo soo saaray shahaadooyinkooda.");
    }

    public function records(Request $request, TenantContext $tenant)
    {
        $tenantId = $tenant->id();
        $branches = $this->branchIds($tenant);

        $q = DB::table('Graduations')
            ->join('Students', 'Graduations.StudentId', '=', 'Students.StudentId')
            ->join('Enrollments', 'Graduations.EnrollmentId', '=', 'Enrollments.EnrollmentId')
            ->leftJoin('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')
            ->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')
            ->leftJoin('AcademicYears', 'Enrollments.AcademicYearId', '=', 'AcademicYears.AcademicYearId')
            ->leftJoin('Branches', 'Graduations.BranchId', '=', 'Branches.BranchId')
            ->leftJoin('Users', 'Graduations.ApprovedByUserId', '=', 'Users.UserId')
            ->where('Graduations.TenantId', $tenantId)
            ->whereIn('Graduations.BranchId', $branches)
            ->when($request->BranchId, fn ($q, $v) => $q->where('Graduations.BranchId', $v))
            ->when($request->ClassId, fn ($q, $v) => $q->where('Enrollments.ClassId', $v))
            ->when($request->AcademicYearId, fn ($q, $v) => $q->where('Enrollments.AcademicYearId', $v))
            ->when($request->Search, function ($q, $v) {
                $q->where(function ($sub) use ($v) {
                    $sub->where('Students.FirstName', 'like', "%{$v}%")
                        ->orWhere('Students.LastName', 'like', "%{$v}%")
                        ->orWhere('Students.AdmissionNo', 'like', "%{$v}%")
                        ->orWhere('Graduations.CertificateNo', 'like', "%{$v}%")
                        ->orWhere('Classes.Name', 'like', "%{$v}%");
                });
            })
            ->select(
                'Graduations.*',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Students.Gender',
                'Classes.Name as ClassName',
                'Levels.Name as LevelName',
                'AcademicYears.Name as AcademicYearName',
                'Branches.Name as BranchName',
                'Users.Name as ApprovedByName'
            )
            ->orderByDesc('Graduations.GraduationId')
            ->paginate(min($request->integer('per_page', 25), 100));

        $q->getCollection()->transform(function ($r) {
            $r->StudentName = trim(($r->FirstName ?? '') . ' ' . ($r->LastName ?? ''));
            unset($r->FirstName, $r->LastName);
            return $r;
        });

        $summary = [
            'TotalGraduated' => DB::table('Graduations')->where('TenantId', $tenantId)->count(),
            'TotalCertificates' => DB::table('Graduations')->where('TenantId', $tenantId)->whereNotNull('CertificateNo')->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Graduation records retrieved.',
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

    public function certificate(TenantContext $tenant, int $id)
    {
        $tenantId = $tenant->id();
        $grad = DB::table('Graduations')
            ->join('Students', 'Graduations.StudentId', '=', 'Students.StudentId')
            ->join('Enrollments', 'Graduations.EnrollmentId', '=', 'Enrollments.EnrollmentId')
            ->leftJoin('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')
            ->leftJoin('Levels', 'Classes.LevelId', '=', 'Levels.LevelId')
            ->leftJoin('AcademicYears', 'Enrollments.AcademicYearId', '=', 'AcademicYears.AcademicYearId')
            ->leftJoin('Branches', 'Graduations.BranchId', '=', 'Branches.BranchId')
            ->leftJoin('Users', 'Graduations.ApprovedByUserId', '=', 'Users.UserId')
            ->where('Graduations.TenantId', $tenantId)
            ->where('Graduations.GraduationId', $id)
            ->select(
                'Graduations.*',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Students.Gender',
                'Students.AdmissionDate',
                'Classes.Name as ClassName',
                'Levels.Name as LevelName',
                'AcademicYears.Name as AcademicYearName',
                'Branches.Name as BranchName',
                'Users.Name as ApprovedByName'
            )
            ->first();

        abort_unless($grad, 404, 'Diiwaanka qalin-jabinta lama helin.');

        $school = DB::table('Tenants')->where('TenantId', $tenantId)->first();

        $studentName = trim(($grad->FirstName ?? '') . ' ' . ($grad->LastName ?? ''));

        // Calculate final GPA / Exam marks if recorded
        $marks = DB::table('StudentMarks')
            ->join('Exams', 'StudentMarks.ExamId', '=', 'Exams.ExamId')
            ->where('StudentMarks.TenantId', $tenantId)
            ->where('StudentMarks.StudentId', $grad->StudentId)
            ->select('StudentMarks.MarksObtained', 'Exams.MaximumMark')
            ->get();

        $totalObtained = (float) $marks->sum('MarksObtained');
        $totalMax = (float) $marks->sum('MaximumMark');
        $averageScore = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 1) : 95.0;

        $gradeLabel = 'Mumtaaz (Excellent)';
        if ($averageScore < 70) {
            $gradeLabel = 'Maqbuul (Good)';
        } elseif ($averageScore < 85) {
            $gradeLabel = 'Jayid Jidan (Very Good)';
        }

        $certificateData = [
            'GraduationId' => $grad->GraduationId,
            'CertificateNo' => $grad->CertificateNo,
            'GraduationDate' => $grad->GraduationDate,
            'IssueDate' => date('Y-m-d', strtotime($grad->CreatedAt)),
            'StudentName' => $studentName,
            'AdmissionNo' => $grad->AdmissionNo,
            'Gender' => $grad->Gender,
            'ClassName' => $grad->ClassName,
            'LevelName' => $grad->LevelName ?: 'Heerka Sare',
            'AcademicYear' => $grad->AcademicYearName,
            'SchoolName' => $school->Name ?? 'MADAARIS ACADEMY',
            'BranchName' => $grad->BranchName,
            'ApprovedByName' => $grad->ApprovedByName ?: 'Principal / Director',
            'AverageScore' => $averageScore,
            'GradeLabel' => $gradeLabel,
            'ClearanceStatus' => $grad->ClearanceStatus,
            'VerificationUrl' => url("/verify/certificate/{$grad->CertificateNo}"),
        ];

        return $this->ok($certificateData, 'Certificate details retrieved.');
    }

    public function revert(TenantContext $tenant, int $id)
    {
        $tenantId = $tenant->id();
        $grad = DB::table('Graduations')
            ->where('TenantId', $tenantId)
            ->where('GraduationId', $id)
            ->first();

        abort_unless($grad, 404, 'Diiwaanka qalin-jabinta lama helin.');

        DB::transaction(function () use ($grad, $tenantId, $tenant, $id) {
            // Restore student status to Active
            DB::table('Students')
                ->where('TenantId', $tenantId)
                ->where('StudentId', $grad->StudentId)
                ->update([
                    'Status' => 'Active',
                    'UpdatedAt' => now(),
                ]);

            // Restore enrollment status to Active
            DB::table('Enrollments')
                ->where('TenantId', $tenantId)
                ->where('EnrollmentId', $grad->EnrollmentId)
                ->update([
                    'Status' => 'Active',
                    'UpdatedAt' => now(),
                ]);

            // Delete graduation record
            DB::table('Graduations')->where('GraduationId', $id)->delete();

            DB::table('AuditLogs')->insert([
                'TenantId' => $tenantId,
                'UserId' => $tenant->user()->UserId,
                'Action' => 'GraduationReverted',
                'EntityType' => 'Graduations',
                'EntityId' => (string) $id,
                'AfterData' => json_encode($grad),
                'IpAddress' => request()->ip(),
                'UserAgent' => mb_substr((string) request()->userAgent(), 0, 1000),
                'RequestId' => (string) str()->uuid(),
                'CreatedAt' => now(),
            ]);
        });

        return $this->ok((object) [], 'Qalin-jabintii waa laga noqday, ardaygana waxaa dib loogu celiyay diiwaanka firfircoon.');
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

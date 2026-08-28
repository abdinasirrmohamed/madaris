<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuranController extends Controller
{
    private const AYAH_COUNTS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];

    public function surahs(): mixed
    {
        $rows = DB::table('Surahs')->orderBy('SurahId')->get();
        if ($rows->isEmpty()) {
            $rows = collect(self::AYAH_COUNTS)->map(fn (int $ayahs, int $index) => ['SurahId' => $index + 1, 'NameEnglish' => 'Surah '.($index + 1), 'NameArabic' => null, 'TotalAyahs' => $ayahs]);
        }

        return $this->ok($rows, 'Surah list retrieved.');
    }

    public function assignments(Request $request, TenantContext $tenant): mixed
    {
        $rows = DB::table('QuranAssignments')->join('Students', 'QuranAssignments.StudentId', '=', 'Students.StudentId')
            ->where('QuranAssignments.TenantId', $tenant->id())->whereIn('QuranAssignments.BranchId', $this->branchIds($tenant))
            ->when($request->BranchId, fn ($q, $v) => $q->where('QuranAssignments.BranchId', $v))
            ->when($request->StudentId, fn ($q, $v) => $q->where('QuranAssignments.StudentId', $v))
            ->when($request->LessonType, fn ($q, $v) => $q->where('QuranAssignments.LessonType', $v))
            ->when($request->Status, fn ($q, $v) => $q->where('QuranAssignments.Status', $v))
            ->select('QuranAssignments.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')
            ->orderByDesc('QuranAssignmentId')->paginate(min((int) $request->get('per_page', 25), 100));

        return $this->ok($rows->items(), 'Qur’an assignments retrieved.', ['total' => $rows->total()]);
    }

    public function assign(Request $request, TenantContext $tenant): mixed
    {
        $data = $request->validate([
            'BranchId' => ['required', 'integer'], 'StudentId' => ['required', 'integer'],
            'LessonType' => ['required', Rule::in(['Farbar', 'Subac', 'Dareeris', 'Revision', 'New lesson'])],
            'SurahNo' => ['required', 'integer', 'between:1,114'], 'FromAyah' => ['required', 'integer', 'min:1'],
            'ToAyah' => ['required', 'integer', 'gte:FromAyah'], 'AssignedDate' => ['required', 'date'],
            'DueDate' => ['required', 'date', 'after_or_equal:AssignedDate'], 'RepetitionTarget' => ['required', 'integer', 'min:1'],
            'Notes' => ['nullable', 'string'],
        ]);
        $this->validateAyahRange($data['SurahNo'], $data['FromAyah'], $data['ToAyah']);
        abort_unless(in_array((int) $data['BranchId'], $this->branchIds($tenant), true), 403);
        abort_unless(DB::table('Students')->where('TenantId', $tenant->id())->where('BranchId', $data['BranchId'])->where('StudentId', $data['StudentId'])->where('Status', 'Active')->exists(), 422, 'Student is not active in this branch.');
        $id = DB::table('QuranAssignments')->insertGetId(['TenantId' => $tenant->id(), 'TeacherId' => $tenant->user()->UserId, 'Status' => 'Assigned', 'CreatedAt' => now(), 'UpdatedAt' => now(), ...$data], 'QuranAssignmentId');
        $this->audit($tenant, 'Assign', 'QuranAssignments', $id, $data);

        return $this->ok(DB::table('QuranAssignments')->where('QuranAssignmentId', $id)->first(), 'Qur’an assignment created.', [], 201);
    }

    public function status(Request $request, int $assignment, TenantContext $tenant): mixed
    {
        $data = $request->validate(['Status' => ['required', Rule::in(['Assigned', 'In progress', 'Completed', 'Needs revision', 'Cancelled'])]]);
        $query = DB::table('QuranAssignments')->where('TenantId', $tenant->id())->whereIn('BranchId', $this->branchIds($tenant))->where('QuranAssignmentId', $assignment);
        $before = $query->first();
        abort_unless($before, 404);
        $query->update([...$data, 'UpdatedAt' => now()]);
        $this->audit($tenant, 'StatusChange', 'QuranAssignments', $assignment, ['Before' => $before->Status, ...$data]);

        return $this->ok($query->first(), 'Assignment status updated.');
    }

    public function assess(Request $request, int $assignment, TenantContext $tenant): mixed
    {
        $assignmentRow = DB::table('QuranAssignments')->where('TenantId', $tenant->id())->whereIn('BranchId', $this->branchIds($tenant))->where('QuranAssignmentId', $assignment)->first();
        abort_unless($assignmentRow, 404);
        abort_if(in_array($assignmentRow->Status, ['Completed', 'Cancelled'], true), 422, 'This assignment can no longer be assessed.');
        $data = $request->validate([
            'AssessmentDate' => ['required', 'date', 'after_or_equal:'.$assignmentRow->AssignedDate],
            'AccuracyScore' => ['required', 'numeric', 'between:0,100'], 'FluencyScore' => ['required', 'numeric', 'between:0,100'],
            'TajweedScore' => ['required', 'numeric', 'between:0,100'], 'Outcome' => ['required', Rule::in(['Passed', 'Needs revision', 'Failed'])],
            'TeacherNotes' => ['nullable', 'string'], 'Mistakes' => ['nullable', 'array'],
            'Mistakes.*.AyahNo' => ['required', 'integer', 'between:'.$assignmentRow->FromAyah.','.$assignmentRow->ToAyah],
            'Mistakes.*.MistakeType' => ['required', Rule::in(['Tajweed', 'Makhraj', 'Harakah', 'Omission', 'Addition', 'Hesitation', 'Sequence', 'Other'])],
            'Mistakes.*.OccurrenceCount' => ['required', 'integer', 'min:1'], 'Mistakes.*.Notes' => ['nullable', 'string'],
        ]);
        $id = DB::transaction(function () use ($assignmentRow, $data, $tenant) {
            $mistakes = $data['Mistakes'] ?? [];
            unset($data['Mistakes']);
            $id = DB::table('QuranAssessments')->insertGetId(['TenantId' => $tenant->id(), 'BranchId' => $assignmentRow->BranchId, 'StudentId' => $assignmentRow->StudentId, 'TeacherId' => $tenant->user()->UserId, 'QuranAssignmentId' => $assignmentRow->QuranAssignmentId, 'SurahNo' => $assignmentRow->SurahNo, 'FromAyah' => $assignmentRow->FromAyah, 'ToAyah' => $assignmentRow->ToAyah, 'CreatedAt' => now(), ...$data], 'QuranAssessmentId');
            foreach ($mistakes as $mistake) {
                DB::table('RecitationMistakes')->insert(['TenantId' => $tenant->id(), 'BranchId' => $assignmentRow->BranchId, 'QuranAssessmentId' => $id, 'SurahNo' => $assignmentRow->SurahNo, 'CreatedAt' => now(), ...$mistake]);
            }
            DB::table('QuranAssignments')->where('QuranAssignmentId', $assignmentRow->QuranAssignmentId)->update(['Status' => $data['Outcome'] === 'Passed' ? 'Completed' : 'Needs revision', 'UpdatedAt' => now()]);

            return $id;
        });
        $this->audit($tenant, 'Assess', 'QuranAssessments', $id, $data);

        return $this->ok(DB::table('QuranAssessments')->where('QuranAssessmentId', $id)->first(), 'Assessment recorded.', [], 201);
    }

    public function report(Request $request, TenantContext $tenant): mixed
    {
        $rows = DB::table('QuranAssessments')->join('Students', 'QuranAssessments.StudentId', '=', 'Students.StudentId')
            ->leftJoin('RecitationMistakes', 'QuranAssessments.QuranAssessmentId', '=', 'RecitationMistakes.QuranAssessmentId')
            ->where('QuranAssessments.TenantId', $tenant->id())->whereIn('QuranAssessments.BranchId', $this->branchIds($tenant))
            ->when($request->BranchId, fn ($q, $v) => $q->where('QuranAssessments.BranchId', $v))
            ->when($request->StudentId, fn ($q, $v) => $q->where('QuranAssessments.StudentId', $v))
            ->when($request->From, fn ($q, $v) => $q->whereDate('AssessmentDate', '>=', $v))
            ->when($request->To, fn ($q, $v) => $q->whereDate('AssessmentDate', '<=', $v))
            ->groupBy('QuranAssessments.QuranAssessmentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')
            ->select('QuranAssessments.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', DB::raw('COALESCE(SUM(RecitationMistakes.OccurrenceCount),0) as MistakeCount'))
            ->orderByDesc('AssessmentDate')->get();

        return $this->ok($rows, 'Qur’an progress report retrieved.');
    }

    public function mistakeReport(Request $request, TenantContext $tenant): mixed
    {
        $rows = DB::table('RecitationMistakes')->join('QuranAssessments', 'RecitationMistakes.QuranAssessmentId', '=', 'QuranAssessments.QuranAssessmentId')
            ->where('RecitationMistakes.TenantId', $tenant->id())->whereIn('RecitationMistakes.BranchId', $this->branchIds($tenant))
            ->when($request->StudentId, fn ($q, $v) => $q->where('QuranAssessments.StudentId', $v))
            ->groupBy('RecitationMistakes.MistakeType')->select('RecitationMistakes.MistakeType', DB::raw('SUM(RecitationMistakes.OccurrenceCount) as Occurrences'), DB::raw('COUNT(DISTINCT RecitationMistakes.QuranAssessmentId) as Assessments'))->orderByDesc('Occurrences')->get();

        return $this->ok($rows, 'Recitation mistake report retrieved.');
    }

    private function validateAyahRange(int $surah, int $from, int $to): void
    {
        $maximum = self::AYAH_COUNTS[$surah - 1];
        if ($from > $maximum || $to > $maximum) {
            throw ValidationException::withMessages(['ToAyah' => "Surah {$surah} contains {$maximum} ayahs."]);
        }
    }

    private function branchIds(TenantContext $tenant): array
    {
        return DB::table('UserBranches')->where('TenantId', $tenant->id())->where('UserId', $tenant->user()->UserId)->pluck('BranchId')->map(fn ($id) => (int) $id)->all();
    }

    private function audit(TenantContext $tenant, string $action, string $entity, int $id, array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'AfterData' => json_encode($after), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data, string $message, array $meta = [], int $status = 200): mixed
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) $meta], $status);
    }
}

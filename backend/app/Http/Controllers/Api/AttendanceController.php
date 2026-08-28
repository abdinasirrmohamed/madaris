<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendQueuedSms;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    public function roster(Request $r, TenantContext $tenant)
    {
        $data = $r->validate(['ClassId' => ['required', 'integer'], 'AttendanceDate' => ['required', 'date'], 'Session' => ['nullable', 'string']]);
        $class = DB::table('Classes')->where('TenantId', $tenant->id())->where('ClassId', $data['ClassId'])->firstOrFail();
        $rows = DB::table('Enrollments')->join('Students', 'Enrollments.StudentId', '=', 'Students.StudentId')->where('Enrollments.TenantId', $tenant->id())->where('Enrollments.ClassId', $class->ClassId)->where('Enrollments.Status', 'Active')->select('Students.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.MiddleName', 'Students.LastName')->orderBy('Students.FirstName')->get();
        $existing = DB::table('Attendance')->where('TenantId', $tenant->id())->where('ClassId', $class->ClassId)->where('AttendanceDate', $data['AttendanceDate'])->where('Session', $data['Session'] ?? 'Daily')->get()->keyBy('StudentId');

        return response()->json(['success' => true, 'message' => 'Class roster retrieved.', 'data' => $rows->map(fn ($s) => [...(array) $s, 'Status' => $existing[$s->StudentId]->Status ?? 'Present', 'AttendanceId' => $existing[$s->StudentId]->AttendanceId ?? null]), 'meta' => (object) []]);
    }

    public function report(Request $r, TenantContext $tenant)
    {
        $q = DB::table('Attendance')->join('Students', 'Attendance.StudentId', '=', 'Students.StudentId')->join('Classes', 'Attendance.ClassId', '=', 'Classes.ClassId')->where('Attendance.TenantId', $tenant->id())->when($r->ClassId, fn ($x, $v) => $x->where('Attendance.ClassId', $v))->when($r->StudentId, fn ($x, $v) => $x->where('Attendance.StudentId', $v))->when($r->From, fn ($x, $v) => $x->whereDate('AttendanceDate', '>=', $v))->when($r->To, fn ($x, $v) => $x->whereDate('AttendanceDate', '<=', $v));
        $rows = $q->select('Attendance.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'Classes.Name as ClassName')->orderByDesc('AttendanceDate')->paginate(min((int) $r->get('per_page', 25), 100));

        return response()->json(['success' => true, 'message' => 'Attendance report retrieved.', 'data' => $rows->items(), 'meta' => ['total' => $rows->total(), 'current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage()]]);
    }

    public function store(Request $r, TenantContext $tenant)
    {
        $data = $r->validate(['BranchId' => ['required', 'integer'], 'ClassId' => ['required', 'integer'], 'AttendanceDate' => ['required', 'date'], 'Session' => ['required', 'string', 'max:30'], 'Records' => ['required', 'array', 'min:1'], 'Records.*.StudentId' => ['required', 'integer'], 'Records.*.Status' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused', 'Sick', 'Leave'])]]);
        $class = DB::table('Classes')->where('TenantId', $tenant->id())->where('BranchId', $data['BranchId'])->where('ClassId', $data['ClassId'])->first();
        abort_unless($class, 422, 'Invalid class or branch.');
        $enrolled = DB::table('Enrollments')->where('TenantId', $tenant->id())->where('ClassId', $data['ClassId'])->where('Status', 'Active')->pluck('StudentId')->map(fn ($id) => (int) $id)->all();
        foreach ($data['Records'] as $record) {
            if (! in_array((int) $record['StudentId'], $enrolled, true)) {
                throw ValidationException::withMessages(['Records' => 'One or more students are not actively enrolled in this class.']);
            }
        }$exists = DB::table('Attendance')->where('TenantId', $tenant->id())->where('ClassId', $data['ClassId'])->where('AttendanceDate', $data['AttendanceDate'])->where('Session', $data['Session'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['AttendanceDate' => 'Attendance has already been submitted for this class, date and session.']);
        }$smsIds = DB::transaction(function () use ($data, $tenant) {
            $queued = [];
            foreach ($data['Records'] as $record) {
                DB::table('Attendance')->insert(['TenantId' => $tenant->id(), 'BranchId' => $data['BranchId'], 'ClassId' => $data['ClassId'], 'AttendanceDate' => $data['AttendanceDate'], 'Session' => $data['Session'], 'StudentId' => $record['StudentId'], 'Status' => $record['Status'], 'MarkedBy' => $tenant->user()->UserId, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
                if ($record['Status'] === 'Absent') {
                    $student = DB::table('Students')->where('TenantId', $tenant->id())->where('StudentId', $record['StudentId'])->first();
                    $phones = DB::table('StudentGuardians')->join('Guardians', 'StudentGuardians.GuardianId', '=', 'Guardians.GuardianId')->where('StudentGuardians.TenantId', $tenant->id())->where('StudentGuardians.StudentId', $record['StudentId'])->where('Guardians.SmsConsent', true)->pluck('Guardians.PrimaryPhone')->unique();
                    foreach ($phones as $phone) {
                        $queued[] = DB::table('SmsLogs')->insertGetId(['TenantId' => $tenant->id(), 'RecipientPhone' => $phone, 'MessageBody' => "Attendance alert: {$student->FirstName} {$student->LastName} was absent on {$data['AttendanceDate']} ({$data['Session']}).", 'Status' => 'Queued', 'Attempts' => 0, 'CreatedByUserId' => $tenant->user()->UserId, 'CreatedAt' => now()], 'SmsLogId');
                    }
                }
            }

return $queued;
        });
        foreach ($smsIds as $id) {
            SendQueuedSms::dispatch($id);
        }

return response()->json(['success' => true, 'message' => 'Attendance submitted.', 'data' => ['AbsenceSmsQueued' => count($smsIds)], 'meta' => (object) []], 201);
    }

    public function correction(Request $r, int $attendance, TenantContext $tenant)
    {
        $data = $r->validate(['RequestedStatus' => ['required', Rule::in(['Present', 'Absent', 'Late', 'Excused', 'Sick', 'Leave'])], 'Reason' => ['required', 'string', 'min:5']]);
        $record = DB::table('Attendance')->where('TenantId', $tenant->id())->where('AttendanceId', $attendance)->first();
        abort_unless($record, 404);
        $id = DB::table('AttendanceCorrections')->insertGetId(['TenantId' => $tenant->id(), 'BranchId' => $record->BranchId, 'AttendanceId' => $record->AttendanceId, 'PreviousStatus' => $record->Status, 'RequestedStatus' => $data['RequestedStatus'], 'Reason' => $data['Reason'], 'Status' => 'Pending', 'RequestedByUserId' => $tenant->user()->UserId, 'CreatedAt' => now()], 'AttendanceCorrectionId');

        return response()->json(['success' => true, 'message' => 'Attendance correction submitted for approval.', 'data' => DB::table('AttendanceCorrections')->where('AttendanceCorrectionId', $id)->first(), 'meta' => (object) []], 201);
    }

    public function approve(int $correction, TenantContext $tenant)
    {
        DB::transaction(function () use ($correction, $tenant) {
            $c = DB::table('AttendanceCorrections')->where('TenantId', $tenant->id())->where('AttendanceCorrectionId', $correction)->where('Status', 'Pending')->lockForUpdate()->first();
            abort_unless($c, 404);
            DB::table('Attendance')->where('TenantId', $tenant->id())->where('AttendanceId', $c->AttendanceId)->update(['Status' => $c->RequestedStatus, 'UpdatedAt' => now()]);
            DB::table('AttendanceCorrections')->where('AttendanceCorrectionId', $correction)->update(['Status' => 'Approved', 'ApprovedByUserId' => $tenant->user()->UserId, 'ApprovedAt' => now()]);
        });

        return response()->json(['success' => true, 'message' => 'Attendance correction approved.', 'data' => (object) [], 'meta' => (object) []]);
    }

    public function corrections(Request $r, TenantContext $tenant)
    {
        $rows = DB::table('AttendanceCorrections')->join('Attendance', 'AttendanceCorrections.AttendanceId', '=', 'Attendance.AttendanceId')->join('Students', 'Attendance.StudentId', '=', 'Students.StudentId')->join('Classes', 'Attendance.ClassId', '=', 'Classes.ClassId')->leftJoin('Users', 'AttendanceCorrections.RequestedByUserId', '=', 'Users.UserId')->where('AttendanceCorrections.TenantId', $tenant->id())->when($r->Status, fn ($q, $v) => $q->where('AttendanceCorrections.Status', $v))->select('AttendanceCorrections.*', 'Attendance.AttendanceDate', 'Attendance.Session', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'Classes.Name as ClassName', 'Users.Name as RequestedByName')->orderByDesc('AttendanceCorrectionId')->get();

        return response()->json(['success' => true, 'message' => 'Attendance corrections retrieved.', 'data' => $rows, 'meta' => (object) []]);
    }

    public function reject(Request $r, int $correction, TenantContext $tenant)
    {
        $data = $r->validate(['DecisionNotes' => ['required', 'string', 'min:3']]);
        $updated = DB::table('AttendanceCorrections')->where('TenantId', $tenant->id())->where('AttendanceCorrectionId', $correction)->where('Status', 'Pending')->update(['Status' => 'Rejected', 'ApprovedByUserId' => $tenant->user()->UserId, 'ApprovedAt' => now(), ...$data]);
        abort_unless($updated, 404);

        return response()->json(['success' => true, 'message' => 'Attendance correction rejected.', 'data' => (object) [], 'meta' => (object) []]);
    }

    public function missing(Request $r, TenantContext $tenant)
    {
        $data = $r->validate(['AttendanceDate' => ['required', 'date'], 'Session' => ['required', 'string', 'max:30'], 'BranchId' => ['nullable', 'integer']]);
        $rows = DB::table('Classes')->where('Classes.TenantId', $tenant->id())->when($data['BranchId'] ?? null, fn ($q, $v) => $q->where('Classes.BranchId', $v))->where('Classes.Status','Active')->whereNotExists(fn ($q) => $q->selectRaw('1')->from('Attendance')->whereColumn('Attendance.ClassId','Classes.ClassId')->where('Attendance.TenantId',$tenant->id())->where('Attendance.AttendanceDate',$data['AttendanceDate'])->where('Attendance.Session',$data['Session']))->select('Classes.ClassId','Classes.Name','Classes.Code','Classes.BranchId')->get();

        return response()->json(['success' => true, 'message' => 'Missing attendance submissions retrieved.', 'data' => $rows, 'meta' => ['count' => $rows->count()]]);
    }
}

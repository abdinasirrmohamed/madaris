<?php

namespace App\Domains\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentDirectoryController extends Controller
{
    public function guardians(Request $request, TenantContext $tenant)
    {
        $rows = DB::table('Guardians')->where('TenantId', $tenant->id())->when($request->string('search')->toString(), fn ($q, $v) => $q->where(fn ($x) => $x->where('FullName', 'like', "%{$v}%")->orWhere('PrimaryPhone', 'like', "%{$v}%")))->orderBy('FullName')->get();
        $links = DB::table('StudentGuardians')->join('Students', 'StudentGuardians.StudentId', '=', 'Students.StudentId')->where('StudentGuardians.TenantId', $tenant->id())->select('StudentGuardians.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->get()->groupBy('GuardianId');
        $rows->transform(function ($guardian) use ($links) {
            $guardian->Students = $links->get($guardian->GuardianId, collect())->values();

            return $guardian;
        });

        return $this->ok($rows, 'Guardians retrieved.');
    }

    public function linkGuardian(Request $request, int $guardian, TenantContext $tenant)
    {
        $data = $request->validate(['StudentId' => ['required', 'integer'], 'IsPrimary' => ['boolean'], 'IsFeeResponsible' => ['boolean']]);
        abort_unless(DB::table('Guardians')->where('TenantId', $tenant->id())->where('GuardianId', $guardian)->exists(), 404);
        abort_unless(DB::table('Students')->where('TenantId', $tenant->id())->where('StudentId', $data['StudentId'])->exists(), 404);
        if ($data['IsPrimary'] ?? false) {
            DB::table('StudentGuardians')->where('TenantId', $tenant->id())->where('StudentId', $data['StudentId'])->update(['IsPrimary' => false]);
        }DB::table('StudentGuardians')->updateOrInsert(['TenantId' => $tenant->id(), 'StudentId' => $data['StudentId'], 'GuardianId' => $guardian], ['IsPrimary' => $data['IsPrimary'] ?? false, 'IsFeeResponsible' => $data['IsFeeResponsible'] ?? false]);
        $this->audit($tenant, 'Link', 'StudentGuardians', $guardian, $data);

        return $this->ok((object) [], 'Guardian linked to student.');
    }

    public function discipline(Request $request, TenantContext $tenant)
    {
        if ($request->isMethod('post')) {
            $data = $request->validate(['BranchId' => ['required', 'integer'], 'StudentId' => ['required', 'integer'], 'IncidentDate' => ['required', 'date'], 'Category' => ['required', 'string', 'max:60'], 'Severity' => ['required', Rule::in(['Low', 'Medium', 'High', 'Critical'])], 'Description' => ['required', 'string'], 'ActionTaken' => ['nullable', 'string'], 'FollowUpDate' => ['nullable', 'date', 'after_or_equal:IncidentDate']]);
            abort_unless(DB::table('Students')->where('TenantId', $tenant->id())->where('BranchId', $data['BranchId'])->where('StudentId', $data['StudentId'])->exists(), 404);
            $id = DB::table('DisciplineRecords')->insertGetId(['TenantId' => $tenant->id(), 'ReportedByUserId' => $tenant->user()->UserId, 'Status' => 'Open', 'CreatedAt' => now(), ...$data], 'DisciplineRecordId');
            $this->audit($tenant, 'Create', 'DisciplineRecords', $id, $data);

            return $this->ok(DB::table('DisciplineRecords')->where('DisciplineRecordId', $id)->first(), 'Discipline record created.', 201);
        }

return $this->ok(DB::table('DisciplineRecords')->join('Students', 'DisciplineRecords.StudentId', '=', 'Students.StudentId')->where('DisciplineRecords.TenantId', $tenant->id())->when($request->string('Status')->toString(), fn ($q, $v) => $q->where('DisciplineRecords.Status', $v))->select('DisciplineRecords.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->orderByDesc('IncidentDate')->get(), 'Discipline records retrieved.');
    }

    public function resolve(Request $request, int $discipline, TenantContext $tenant)
    {
        $data = $request->validate(['Status' => ['required', Rule::in(['Open', 'Under Review', 'Resolved', 'Closed'])], 'ResolutionNotes' => ['nullable', 'string'], 'ActionTaken' => ['nullable', 'string']]);
        $query = DB::table('DisciplineRecords')->where('TenantId', $tenant->id())->where('DisciplineRecordId', $discipline);
        abort_unless($query->exists(), 404);
        $resolved = in_array($data['Status'], ['Resolved', 'Closed'], true);
        $query->update([...$data, 'ResolvedByUserId' => $resolved ? $tenant->user()->UserId : null, 'ResolvedAt' => $resolved ? now() : null]);
        $this->audit($tenant, 'Resolve', 'DisciplineRecords', $discipline, $data);

        return $this->ok($query->first(), 'Discipline record updated.');
    }

    private function audit(TenantContext $tenant, string $action, string $entity, int $id, array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'AfterData' => json_encode($after), 'IpAddress' => request()->ip(), 'UserAgent' => request()->userAgent(), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data,string $message,int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) []],$status);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BranchManagementController extends Controller
{
    public function index(TenantContext $tenant)
    {
        $branches = DB::table('Branches')->where('TenantId', $tenant->id())
            ->select('Branches.*')
            ->selectSub(fn ($q) => $q->from('Students')->selectRaw('count(*)')->whereColumn('Students.BranchId', 'Branches.BranchId'), 'StudentCount')
            ->selectSub(fn ($q) => $q->from('Classes')->selectRaw('count(*)')->whereColumn('Classes.BranchId', 'Branches.BranchId'), 'ClassCount')
            ->selectSub(fn ($q) => $q->from('UserBranches')->selectRaw('count(*)')->whereColumn('UserBranches.BranchId', 'Branches.BranchId'), 'UserCount')
            ->orderBy('Name')->get();
        $assignments = DB::table('UserBranches')->where('TenantId', $tenant->id())->get()->groupBy('BranchId')->map(fn ($rows) => $rows->pluck('UserId')->map(fn ($id) => (int) $id)->values());
        $users = DB::table('Users')->where('TenantId', $tenant->id())->select('UserId', 'Name', 'Email', 'Status')->orderBy('Name')->get();
        return $this->ok(['Branches' => $branches, 'Users' => $users, 'Assignments' => $assignments]);
    }

    public function store(Request $request, TenantContext $tenant)
    {
        $data = $this->validated($request, $tenant->id());
        $id = DB::transaction(function () use ($data, $tenant) {
            $id = DB::table('Branches')->insertGetId(['TenantId' => $tenant->id(), ...$data, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'BranchId');
            DB::table('UserBranches')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'BranchId' => $id]);
            return $id;
        });
        return $this->ok(DB::table('Branches')->where('BranchId', $id)->first(), 'Branch created.', 201);
    }

    public function update(Request $request, TenantContext $tenant, int $branch)
    {
        abort_unless(DB::table('Branches')->where('TenantId', $tenant->id())->where('BranchId', $branch)->exists(), 404);
        $data = $this->validated($request, $tenant->id(), $branch);
        DB::table('Branches')->where('TenantId', $tenant->id())->where('BranchId', $branch)->update([...$data, 'UpdatedAt' => now()]);
        return $this->ok(DB::table('Branches')->where('BranchId', $branch)->first(), 'Branch updated.');
    }

    public function assign(Request $request, TenantContext $tenant, int $branch)
    {
        abort_unless(DB::table('Branches')->where('TenantId', $tenant->id())->where('BranchId', $branch)->exists(), 404);
        $data = $request->validate(['UserIds' => ['array'], 'UserIds.*' => [Rule::exists('Users', 'UserId')->where('TenantId', $tenant->id())]]);
        $ids = collect($data['UserIds'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
        DB::transaction(function () use ($tenant, $branch, $ids) {
            DB::table('UserBranches')->where('TenantId', $tenant->id())->where('BranchId', $branch)->delete();
            if ($ids->isNotEmpty()) DB::table('UserBranches')->insert($ids->map(fn ($id) => ['TenantId' => $tenant->id(), 'UserId' => $id, 'BranchId' => $branch])->all());
        });
        return $this->ok(['BranchId' => $branch, 'UserIds' => $ids], 'Branch users updated.');
    }

    private function validated(Request $request, int $tenantId, ?int $branchId = null): array
    {
        return $request->validate([
            'Name' => ['required', 'string', 'max:120'],
            'Code' => ['required', 'string', 'max:30', Rule::unique('Branches', 'Code')->where('TenantId', $tenantId)->ignore($branchId, 'BranchId')],
            'Status' => ['required', Rule::in(['Active', 'Inactive'])],
        ]);
    }

    private function ok(mixed $data, string $message = 'Branch management retrieved.', int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) []], $status);
    }
}

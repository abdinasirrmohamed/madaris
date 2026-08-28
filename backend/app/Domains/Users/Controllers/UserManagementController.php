<?php

namespace App\Domains\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(Request $request, TenantContext $tenant)
    {
        $rows = DB::table('Users')->where('Users.TenantId', $tenant->id())->when($request->string('search')->toString(), fn ($q, $v) => $q->where(fn ($x) => $x->where('Users.Name', 'like', "%{$v}%")->orWhere('Users.Email', 'like', "%{$v}%")))->when($request->integer('RoleId'), fn ($q, $v) => $q->whereExists(fn ($x) => $x->selectRaw('1')->from('UserRoles')->whereColumn('UserRoles.UserId', 'Users.UserId')->where('UserRoles.RoleId', $v)))->select('Users.UserId', 'Users.Name', 'Users.Email', 'Users.Status', 'Users.CreatedAt')->orderBy('Users.Name')->get();
        $ids = $rows->pluck('UserId');
        $roles = DB::table('UserRoles')->join('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId')->where('UserRoles.TenantId', $tenant->id())->whereIn('UserRoles.UserId', $ids)->select('UserRoles.UserId', 'Roles.RoleId', 'Roles.RoleName')->get()->groupBy('UserId');
        $branches = DB::table('UserBranches')->join('Branches', 'UserBranches.BranchId', '=', 'Branches.BranchId')->where('UserBranches.TenantId', $tenant->id())->whereIn('UserBranches.UserId', $ids)->select('UserBranches.UserId', 'Branches.BranchId', 'Branches.Name')->get()->groupBy('UserId');
        $rows->transform(function ($user) use ($roles, $branches) {
            $user->Roles = $roles->get($user->UserId, collect())->values();
            $user->Branches = $branches->get($user->UserId, collect())->values();

            return $user;
        });

        return $this->ok($rows, 'Users retrieved.');
    }

    public function store(Request $request, TenantContext $tenant)
    {
        $data = $this->validated($request, $tenant);
        $id = DB::transaction(function () use ($data, $tenant) {
            $id = DB::table('Users')->insertGetId(['TenantId' => $tenant->id(), 'Name' => $data['Name'], 'Email' => $data['Email'], 'Password' => Hash::make($data['Password']), 'Status' => 'Active', 'Permissions' => json_encode([]), 'CreatedAt' => now(), 'UpdatedAt' => now()], 'UserId');
            $this->syncAccess($id, $data, $tenant);
            $this->audit($tenant, 'Create', 'Users', $id, null, ['Name' => $data['Name'], 'Email' => $data['Email'], 'RoleIds' => $data['RoleIds'], 'BranchIds' => $data['BranchIds']]);

            return $id;
        });

        return $this->ok(User::findOrFail($id), 'User created.', 201);
    }

    public function update(Request $request, int $user, TenantContext $tenant)
    {
        $record = User::where('TenantId', $tenant->id())->findOrFail($user);
        $data = $this->validated($request, $tenant, $user, false);
        $before = $record->only(['Name', 'Email', 'Status']);
        DB::transaction(function () use ($record, $data, $tenant, $before) {
            $record->update(['Name' => $data['Name'], 'Email' => $data['Email']]);
            $this->syncAccess($record->UserId, $data, $tenant);
            $this->audit($tenant, 'Update', 'Users', $record->UserId, $before, ['Name' => $data['Name'], 'Email' => $data['Email'], 'RoleIds' => $data['RoleIds'], 'BranchIds' => $data['BranchIds']]);
        });

        return $this->ok($record->fresh(), 'User updated.');
    }

    public function status(Request $request, int $user, TenantContext $tenant)
    {
        $record = User::where('TenantId', $tenant->id())->findOrFail($user);
        abort_if($record->UserId === $tenant->user()->UserId, 422, 'You cannot suspend your own account.');
        $data = $request->validate(['Status' => ['required', Rule::in(['Active', 'Suspended', 'Inactive'])]]);
        $before = $record->Status;
        $record->update($data);
        if ($data['Status'] !== 'Active') {
            $record->tokens()->delete();
        }$this->audit($tenant, 'StatusChange', 'Users', $user, ['Status' => $before], $data);

        return $this->ok($record, 'User status updated.');
    }

    public function resetPassword(Request $request, int $user, TenantContext $tenant)
    {
        $record = User::where('TenantId', $tenant->id())->findOrFail($user);
        $data = $request->validate(['Password' => ['required', 'string', 'min:10', 'confirmed']]);
        $record->update(['Password' => Hash::make($data['Password'])]);
        $record->tokens()->delete();
        $this->audit($tenant, 'ResetPassword', 'Users', $user, null, ['SessionsRevoked' => true]);

        return $this->ok((object) [], 'Password reset and sessions revoked.');
    }

    public function destroy(int $user, TenantContext $tenant)
    {
        $record = User::where('TenantId', $tenant->id())->findOrFail($user);
        abort_if($record->UserId === $tenant->user()->UserId, 422, 'You cannot archive your own account.');
        $before = $record->Status;
        $record->update(['Status' => 'Inactive']);
        $record->tokens()->delete();
        $this->audit($tenant, 'Archive', 'Users', $user, ['Status' => $before], ['Status' => 'Inactive']);

        return $this->ok((object) [], 'User archived.');
    }

    private function validated(Request $request, TenantContext $tenant, ?int $ignore = null, bool $password = true): array
    {
        $rules = ['Name' => ['required', 'string', 'max:150'], 'Email' => ['required', 'email', 'max:190', Rule::unique('Users', 'Email')->ignore($ignore, 'UserId')], 'BranchIds' => ['required', 'array', 'min:1'], 'BranchIds.*' => ['integer'], 'RoleIds' => ['required', 'array', 'min:1'], 'RoleIds.*' => ['integer']];
        $rules['Password'] = $password ? ['required', 'string', 'min:10', 'confirmed'] : ['nullable'];
        $data = $request->validate($rules);
        foreach ($data['BranchIds'] as $id) {
            abort_unless(DB::table('Branches')->where('TenantId', $tenant->id())->where('BranchId', $id)->exists(), 422, 'Invalid branch assignment.');
        }foreach ($data['RoleIds'] as $id) {
            abort_unless(DB::table('Roles')->where('RoleId', $id)->where(fn ($q) => $q->where('TenantId', $tenant->id())->orWhereNull('TenantId'))->exists(), 422, 'Invalid role assignment.');
        }

return $data;
    }

    private function syncAccess(int $userId, array $data, TenantContext $tenant): void
    {
        DB::table('UserBranches')->where('TenantId', $tenant->id())->where('UserId', $userId)->delete();
        DB::table('UserRoles')->where('TenantId', $tenant->id())->where('UserId', $userId)->delete();
        foreach ($data['BranchIds'] as $id) {
            DB::table('UserBranches')->insert(['TenantId' => $tenant->id(), 'UserId' => $userId, 'BranchId' => $id]);
        }foreach ($data['RoleIds'] as $id) {
            DB::table('UserRoles')->insert(['TenantId' => $tenant->id(), 'UserId' => $userId, 'RoleId' => $id]);
        }
    }

    private function audit(TenantContext $tenant, string $action, string $type, int $id, ?array $before, ?array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'Action' => $action, 'EntityType' => $type, 'EntityId' => (string) $id, 'BeforeData' => $before ? json_encode($before) : null, 'AfterData' => $after ? json_encode($after) : null, 'IpAddress' => request()->ip(), 'UserAgent' => request()->userAgent(), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data,string $message,int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) []],$status);
    }
}

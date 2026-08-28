<?php

namespace App\Domains\Students\Policies;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StudentPolicy
{
    public function before(User $user): ?bool
    {
        return in_array('*', $user->Permissions ?? [], true) ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $this->has($user, 'students.view');
    }

    public function view(User $user, Student $student): bool
    {
        return $user->TenantId === $student->TenantId && $this->has($user, 'students.view');
    }

    public function create(User $user): bool
    {
        return $this->has($user, 'students.create');
    }

    public function update(User $user, Student $student): bool
    {
        return $user->TenantId === $student->TenantId && $this->has($user, 'students.update');
    }

    private function has(User $user, string $permission): bool
    {
        return in_array($permission, $user->Permissions ?? [], true) || DB::table('UserRoles')->join('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId')->join('RolePermissions', 'Roles.RoleId', '=', 'RolePermissions.RoleId')->join('Permissions', 'RolePermissions.PermissionId', '=', 'Permissions.PermissionId')->where('UserRoles.UserId', $user->UserId)->where(fn ($q) => $q->where('Roles.TenantId', $user->TenantId)->orWhereNull('Roles.TenantId'))->where('Permissions.PermissionKey',$permission)->exists();
    }
}

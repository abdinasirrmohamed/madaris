<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::where('Email', $request->Email)->first();
        if (! $user || ! Hash::check($request->Password, $user->Password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials.'], 422);
        } if ($user->Status !== 'Active') {
            abort(403, 'Account suspended.');
        }$payload = $user->only(['UserId', 'TenantId', 'Name', 'Email', 'Status']);
        $payload['Permissions'] = $this->permissions($user);

        return response()->json(['success' => true, 'message' => 'Login successful.', 'data' => ['token' => $user->createToken($request->DeviceName ?? 'web')->plainTextToken, 'user' => $payload], 'meta' => (object) []]);
    }

    public function me(Request $request)
    {
        $payload = $request->user()->only(['UserId', 'TenantId', 'Name', 'Email', 'Status']);
        $payload['Permissions'] = $this->permissions($request->user());

        return response()->json(['success' => true, 'message' => 'Authenticated user.', 'data' => $payload, 'meta' => (object) []]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['success' => true, 'message' => 'Logged out.', 'data' => (object) [], 'meta' => (object) []]);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['success' => true, 'message' => 'All sessions revoked.', 'data' => (object) [], 'meta' => (object) []]);
    }

    private function permissions(User $user): array
    {
        $direct = $user->Permissions ?? [];
        if (in_array('*', $direct, true)) {
            return ['*'];
        }$rolePermissions = DB::table('UserRoles')->join('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId')->join('RolePermissions', 'Roles.RoleId', '=', 'RolePermissions.RoleId')->join('Permissions', 'RolePermissions.PermissionId', '=', 'Permissions.PermissionId')->where('UserRoles.UserId', $user->UserId)->where(fn ($q) => $q->where('Roles.TenantId', $user->TenantId)->orWhereNull('Roles.TenantId'))->pluck('Permissions.PermissionKey')->all();

        return array_values(array_unique([...$direct, ...$rolePermissions]));
    }
}

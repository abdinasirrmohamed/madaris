<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::where('Email', $request->Email)->first();
        if (! $user || ! Hash::check($request->Password, $user->Password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials.'], 422);
        } if ($user->Status !== 'Active') {
            abort(403, 'Account suspended.');
        } if ($user->TenantId && DB::table('Tenants')->where('TenantId', $user->TenantId)->where('Status', 'Active')->doesntExist()) {
            abort(403, 'School account is suspended.');
        }$payload = $this->payload($user);
        $payload['Permissions'] = $this->permissions($user);

        return response()->json(['success' => true, 'message' => 'Login successful.', 'data' => ['token' => $user->createToken($request->DeviceName ?? 'web')->plainTextToken, 'user' => $payload], 'meta' => (object) []]);
    }

    public function me(Request $request)
    {
        $payload = $this->payload($request->user());

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

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'CurrentPassword' => ['required', 'string'],
            'Password' => ['required', 'string', 'min:10', 'confirmed'],
        ]);
        $user = $request->user();
        abort_unless(Hash::check($data['CurrentPassword'], $user->Password), 422, 'Current password is incorrect.');
        $user->update(['Password' => Hash::make($data['Password']), 'MustChangePassword' => false]);
        DB::table('AuditLogs')->insert(['TenantId'=>$user->TenantId,'UserId'=>$user->UserId,'Action'=>'ChangePassword','EntityType'=>'Users','EntityId'=>(string)$user->UserId,'RequestId'=>(string)str()->uuid(),'IpAddress'=>$request->ip(),'UserAgent'=>$request->userAgent(),'CreatedAt'=>now()]);

        return response()->json(['success'=>true,'message'=>'Password changed successfully.','data'=>(object)[],'meta'=>(object)[]]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate(['Name'=>['required','string','max:150'],'PhotoBase64'=>['nullable','string','max:4300000']]);
        $user = $request->user();
        $changes = ['Name'=>$data['Name']];
        if (!empty($data['PhotoBase64'])) {
            abort_unless(preg_match('/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s', $data['PhotoBase64'], $matches), 422, 'Invalid profile photo format.');
            $binary = base64_decode($matches[2], true);
            abort_unless($binary !== false && strlen($binary) <= 3 * 1024 * 1024, 422, 'Profile photo must be 3 MB or smaller.');
            $detected = (new \finfo(FILEINFO_MIME_TYPE))->buffer($binary);
            abort_unless(in_array($detected, ['image/png','image/jpeg','image/webp'], true), 422, 'Profile photo must be PNG, JPG or WebP.');
            if ($user->ProfilePhotoPath) Storage::disk('public')->delete($user->ProfilePhotoPath);
            $extension = ['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'][$detected];
            $changes['ProfilePhotoPath'] = 'profile-photos/'.$user->TenantId.'/'.str()->uuid().'.'.$extension;
            Storage::disk('public')->put($changes['ProfilePhotoPath'], $binary);
        }
        $user->update($changes);
        DB::table('AuditLogs')->insert(['TenantId'=>$user->TenantId,'UserId'=>$user->UserId,'Action'=>'UpdateProfile','EntityType'=>'Users','EntityId'=>(string)$user->UserId,'RequestId'=>(string)str()->uuid(),'IpAddress'=>$request->ip(),'UserAgent'=>$request->userAgent(),'CreatedAt'=>now()]);
        return response()->json(['success'=>true,'message'=>'Profile updated.','data'=>$this->payload($user->fresh()),'meta'=>(object)[]]);
    }

    private function payload(User $user): array
    {
        $payload = $user->only(['UserId','TenantId','Name','Email','Status','MustChangePassword']);
        $payload['ProfilePhotoUrl'] = $user->ProfilePhotoPath ? '/storage/'.$user->ProfilePhotoPath : null;
        $payload['Permissions'] = $this->permissions($user);
        $payload['Roles'] = DB::table('UserRoles')->join('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId')
            ->where('UserRoles.UserId', $user->UserId)->pluck('Roles.RoleName')->values()->all();
        $payload['IsParent'] = in_array('Parent', $payload['Roles'], true)
            && DB::table('Guardians')->where('TenantId', $user->TenantId)->where('UserId', $user->UserId)->exists();
        return $payload;
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

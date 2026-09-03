<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Sms\SmsTemplateDefaults;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlatformController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizePlatform($request);
        $schools = DB::table('Tenants')
            ->leftJoin('TenantSettings', 'Tenants.TenantId', '=', 'TenantSettings.TenantId')
            ->select('Tenants.*', 'TenantSettings.Phone', 'TenantSettings.Email', 'TenantSettings.Address')
            ->selectSub(fn ($q) => $q->from('Branches')->selectRaw('count(*)')->whereColumn('Branches.TenantId', 'Tenants.TenantId'), 'BranchesCount')
            ->selectSub(fn ($q) => $q->from('Users')->selectRaw('count(*)')->whereColumn('Users.TenantId', 'Tenants.TenantId'), 'UsersCount')
            ->selectSub(fn ($q) => $q->from('Students')->selectRaw('count(*)')->whereColumn('Students.TenantId', 'Tenants.TenantId'), 'StudentsCount')
            ->orderByDesc('Tenants.TenantId')->get();

        return response()->json(['success' => true, 'message' => 'Schools retrieved.', 'data' => $schools, 'meta' => (object) []]);
    }

    public function store(Request $request)
    {
        $this->authorizePlatform($request);
        $data = $request->validate([
            'SchoolName' => ['required', 'string', 'max:180'], 'Slug' => ['nullable', 'string', 'max:100', 'alpha_dash', Rule::unique('Tenants', 'Slug')],
            'Phone' => ['nullable', 'string', 'max:40'], 'Email' => ['nullable', 'email', 'max:150'], 'Address' => ['nullable', 'string', 'max:255'],
            'Currency' => ['required', 'string', 'size:3'], 'Timezone' => ['required', 'string', 'max:80'], 'DefaultLanguage' => ['required', Rule::in(['so', 'en', 'ar'])],
            'OwnerName' => ['required', 'string', 'max:150'], 'OwnerEmail' => ['required', 'email', 'max:150', Rule::unique('Users', 'Email')],
            'OwnerPassword' => ['required', 'string', 'min:10'], 'BranchName' => ['required', 'string', 'max:150'],
        ]);
        $result = DB::transaction(function () use ($data) {
            $slug = ($data['Slug'] ?? null) ?: Str::slug($data['SchoolName']);
            $base = $slug ?: 'school';
            $suffix = 2;
            while (DB::table('Tenants')->where('Slug', $slug)->exists()) {
                $slug = $base.'-'.$suffix++;
            }
            $tenantId = DB::table('Tenants')->insertGetId(['Name' => $data['SchoolName'], 'Slug' => $slug, 'Status' => 'Active', 'Timezone' => $data['Timezone'], 'Currency' => strtoupper($data['Currency']), 'CreatedAt' => now(), 'UpdatedAt' => now()], 'TenantId');
            $branchId = DB::table('Branches')->insertGetId(['TenantId' => $tenantId, 'Name' => $data['BranchName'], 'Code' => 'MAIN', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()], 'BranchId');
            DB::table('TenantSettings')->insert(['TenantId' => $tenantId, 'SchoolName' => $data['SchoolName'], 'Phone' => $data['Phone'] ?? null, 'Email' => $data['Email'] ?? null, 'Address' => $data['Address'] ?? null, 'Currency' => strtoupper($data['Currency']), 'Timezone' => $data['Timezone'], 'DefaultLanguage' => $data['DefaultLanguage'], 'ReceiptNumberFormat' => 'RCT-{YYYY}-{SEQ}', 'InvoiceNumberFormat' => 'INV-{YYYY}-{SEQ}', 'AdmissionNumberFormat' => 'ADM-{YYYY}-{SEQ}', 'CertificateNumberFormat' => 'CERT-{YYYY}-{SEQ}', 'AttendanceLockHours' => 24, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
            $roleId = DB::table('Roles')->insertGetId(['TenantId' => $tenantId, 'RoleName' => 'Tenant Owner', 'IsSystemRole' => true, 'CreatedAt' => now()], 'RoleId');
            foreach (DB::table('Permissions')->pluck('PermissionId') as $permissionId) {
                DB::table('RolePermissions')->insert(['RoleId' => $roleId, 'PermissionId' => $permissionId]);
            }
            $ownerId = DB::table('Users')->insertGetId(['TenantId' => $tenantId, 'Name' => $data['OwnerName'], 'Email' => $data['OwnerEmail'], 'Password' => Hash::make($data['OwnerPassword']), 'Status' => 'Active', 'Permissions' => json_encode(['*']), 'MustChangePassword' => true, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'UserId');
            SmsTemplateDefaults::ensure($tenantId, $ownerId);
            DB::table('UserBranches')->insert(['TenantId' => $tenantId, 'UserId' => $ownerId, 'BranchId' => $branchId]);
            DB::table('UserRoles')->insert(['TenantId' => $tenantId, 'UserId' => $ownerId, 'RoleId' => $roleId]);
            DB::table('AcademicYears')->insert(['TenantId' => $tenantId, 'Name' => now()->year.'/'.(now()->year + 1), 'StartDate' => now()->startOfYear()->toDateString(), 'EndDate' => now()->addYear()->endOfYear()->toDateString(), 'IsDefault' => true, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);

            return ['TenantId' => $tenantId, 'OwnerUserId' => $ownerId, 'Slug' => $slug];
        });

        return response()->json(['success' => true, 'message' => 'School and owner account created successfully.', 'data' => $result, 'meta' => (object) []], 201);
    }

    public function status(Request $request, int $tenant)
    {
        $this->authorizePlatform($request);
        $data = $request->validate(['Status' => ['required', Rule::in(['Active', 'Suspended'])]]);
        abort_unless(DB::table('Tenants')->where('TenantId', $tenant)->update(['Status' => $data['Status'], 'UpdatedAt' => now()]), 404);
        if ($data['Status'] === 'Suspended') {
            User::where('TenantId', $tenant)->each(fn ($user) => $user->tokens()->delete());
        }

        return response()->json(['success' => true, 'message' => 'School status updated.', 'data' => (object) [], 'meta' => (object) []]);
    }

    private function authorizePlatform(Request $request): void
    {
        $user = $request->user();
        abort_unless($user && $user->TenantId === null && in_array('platform.manage', $user->Permissions ?? [], true), 403, 'Platform administrator access required.');
    }
}

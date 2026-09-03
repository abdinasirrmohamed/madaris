<?php

namespace Database\Seeders;

use App\Services\Sms\SmsTemplateDefaults;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $permissions = ['students.view', 'students.create', 'students.update', 'students.promote', 'attendance.take', 'attendance.correct', 'academic.manage', 'quran.manage', 'finance.manage', 'accounts.manage', 'examinations.manage', 'hrm.manage', 'sms.configure', 'sms.send', 'sms.view_dashboard', 'sms.view_history', 'sms.send_individual', 'sms.send_bulk', 'sms.retry', 'sms.resend', 'sms.cancel', 'sms.manage_templates', 'sms.manage_schedules', 'sms.manage_settings', 'sms.view_provider_balance', 'sms.export', 'reports.view', 'feedback.manage', 'users.manage', 'roles.manage', 'audit.view', 'settings.manage'];
        $permissionIds = [];
        foreach ($permissions as $key) {
            [$module,$action] = explode('.', $key, 2);
            DB::table('Permissions')->updateOrInsert(['PermissionKey' => $key], ['ModuleName' => ucfirst($module), 'ActionName' => ucfirst($action)]);
            $permissionIds[$key] = DB::table('Permissions')->where('PermissionKey', $key)->value('PermissionId');
        }
        $tenantId = DB::table('Tenants')->insertGetId(['Name' => 'Madaaris Demo School', 'Slug' => 'demo', 'Status' => 'Active', 'Timezone' => 'Africa/Mogadishu', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branchId = DB::table('Branches')->insertGetId(['TenantId' => $tenantId, 'Name' => 'Main Branch', 'Code' => 'MAIN', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        DB::table('AcademicYears')->insert(['TenantId' => $tenantId, 'Name' => '2026/2027', 'StartDate' => '2026-08-01', 'EndDate' => '2027-07-31', 'IsDefault' => true, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        DB::table('TenantSettings')->insert(['TenantId' => $tenantId, 'SchoolName' => 'Madaaris Demo School', 'Currency' => 'USD', 'Timezone' => 'Africa/Mogadishu', 'DefaultLanguage' => 'so', 'ReceiptNumberFormat' => 'RCT-{YYYY}-{SEQ}', 'InvoiceNumberFormat' => 'INV-{YYYY}-{SEQ}', 'AdmissionNumberFormat' => 'ADM-{YYYY}-{SEQ}', 'CertificateNumberFormat' => 'CERT-{YYYY}-{SEQ}', 'AttendanceLockHours' => 24, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        SmsTemplateDefaults::ensure($tenantId);
        $ownerRole = DB::table('Roles')->insertGetId(['TenantId' => $tenantId, 'RoleName' => 'Tenant Owner', 'IsSystemRole' => true, 'CreatedAt' => now()], 'RoleId');
        foreach ($permissionIds as $permissionId) {
            DB::table('RolePermissions')->insert(['RoleId' => $ownerRole, 'PermissionId' => $permissionId]);
        }
        if ($password = env('DEMO_ADMIN_PASSWORD')) {
            $userId = DB::table('Users')->insertGetId(['TenantId' => $tenantId, 'Name' => 'Demo Administrator', 'Email' => env('DEMO_ADMIN_EMAIL', 'admin@madaaris.local'), 'Password' => Hash::make($password), 'Status' => 'Active', 'Permissions' => json_encode(['*']), 'CreatedAt' => now(), 'UpdatedAt' => now()]);
            DB::table('UserBranches')->insert(['TenantId' => $tenantId, 'UserId' => $userId, 'BranchId' => $branchId]);
            DB::table('UserRoles')->insert(['TenantId' => $tenantId, 'UserId' => $userId, 'RoleId' => $ownerRole]);
        }
        $this->call(AccessControlSeeder::class);
        $this->call(PlatformAdminSeeder::class);
        $this->call(DemoUsersSeeder::class);
        $this->call(ComprehensiveDemoSeeder::class);
        $this->call(SmsDefaultsSeeder::class);
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        $smsKeys = ['sms.view_dashboard', 'sms.view_history', 'sms.send_individual', 'sms.send_bulk', 'sms.retry', 'sms.resend', 'sms.cancel', 'sms.manage_templates', 'sms.manage_schedules', 'sms.manage_settings', 'sms.view_provider_balance', 'sms.export'];
        $keys = ['students.view', 'students.create', 'students.update', 'students.promote', 'attendance.take', 'attendance.correct', 'academic.manage', 'quran.manage', 'finance.manage', 'accounts.manage', 'examinations.manage', 'hrm.manage', 'sms.configure', 'sms.send', ...$smsKeys, 'reports.view', 'feedback.manage', 'users.manage', 'roles.manage', 'audit.view', 'settings.manage'];
        $permissions = [];
        foreach ($keys as $key) {
            [$module,$action] = explode('.', $key, 2);
            DB::table('Permissions')->updateOrInsert(['PermissionKey' => $key], ['ModuleName' => ucfirst($module), 'ActionName' => ucfirst($action)]);
            $permissions[$key] = DB::table('Permissions')->where('PermissionKey', $key)->value('PermissionId');
        }
        foreach (DB::table('Tenants')->pluck('TenantId') as $tenantId) {
            $definitions = ['Tenant Owner' => $keys, 'School Administrator' => $keys, 'Registrar' => ['students.view', 'students.create', 'students.update', 'students.promote', 'academic.manage', 'reports.view'], 'Teacher' => ['students.view', 'attendance.take', 'quran.manage', 'examinations.manage'], 'Attendance Officer' => ['students.view', 'attendance.take', 'attendance.correct', 'reports.view'], 'Finance Officer' => ['students.view', 'finance.manage', 'accounts.manage', 'reports.view', 'sms.view_dashboard', 'sms.view_history', 'sms.send_individual', 'sms.send_bulk', 'sms.retry', 'sms.resend', 'sms.cancel', 'sms.export'], 'HR Officer' => ['hrm.manage', 'reports.view'], 'Examiner' => ['students.view', 'examinations.manage', 'reports.view'], 'Report Viewer' => ['students.view', 'reports.view']];
            foreach ($definitions as $name => $roleKeys) {
                DB::table('Roles')->updateOrInsert(['TenantId' => $tenantId, 'RoleName' => $name], ['IsSystemRole' => true, 'CreatedAt' => now()]);
                $roleId = DB::table('Roles')->where('TenantId', $tenantId)->where('RoleName', $name)->value('RoleId');
                foreach ($roleKeys as $key) {
                    DB::table('RolePermissions')->updateOrInsert(['RoleId' => $roleId, 'PermissionId' => $permissions[$key]], []);
                }
            }
            $ownerRole = DB::table('Roles')->where('TenantId', $tenantId)->where('RoleName', 'Tenant Owner')->value('RoleId');
            foreach (DB::table('Users')->where('TenantId', $tenantId)->whereJsonContains('Permissions', '*')->pluck('UserId') as $userId) {
                DB::table('UserRoles')->updateOrInsert(['TenantId' => $tenantId, 'UserId' => $userId, 'RoleId' => $ownerRole], []);
            }
        }
    }
}

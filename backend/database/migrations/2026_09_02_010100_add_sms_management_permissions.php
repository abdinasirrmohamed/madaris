<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $keys = ['sms.view_dashboard', 'sms.view_history', 'sms.send_individual', 'sms.send_bulk', 'sms.retry', 'sms.resend', 'sms.cancel', 'sms.manage_templates', 'sms.manage_schedules', 'sms.manage_settings', 'sms.view_provider_balance', 'sms.export'];

    public function up(): void
    {
        foreach ($this->keys as $key) {
            DB::table('Permissions')->updateOrInsert(['PermissionKey' => $key], ['ModuleName' => 'SMS Management', 'ActionName' => str($key)->after('sms.')->replace('_', ' ')->title()]);
        }
        $permissionIds = DB::table('Permissions')->whereIn('PermissionKey', $this->keys)->pluck('PermissionId');
        $roles = DB::table('Roles')->whereIn('RoleName', ['Super Admin', 'Tenant Owner', 'School Administrator', 'Admin', 'Accountant'])->pluck('RoleId');
        foreach ($roles as $roleId) {
            foreach ($permissionIds as $permissionId) {
                DB::table('RolePermissions')->updateOrInsert(['RoleId' => $roleId, 'PermissionId' => $permissionId]);
            }
        }
    }

    public function down(): void
    {
        $ids = DB::table('Permissions')->whereIn('PermissionKey', $this->keys)->pluck('PermissionId');
        DB::table('RolePermissions')->whereIn('PermissionId', $ids)->delete();
        DB::table('Permissions')->whereIn('PermissionId', $ids)->delete();
    }
};

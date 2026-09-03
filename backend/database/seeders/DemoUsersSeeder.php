<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('DEMO_USER_PASSWORD');
        if (! $password) {
            return;
        }

        $accounts = [
            ['School Administrator', 'School Administrator', 'schooladmin@madaaris.local'],
            ['Registrar', 'Registrar', 'registrar@madaaris.local'],
            ['Teacher', 'Teacher User', 'teacher@madaaris.local'],
            ['Attendance Officer', 'Attendance Officer', 'attendance@madaaris.local'],
            ['Finance Officer', 'Finance Officer', 'finance@madaaris.local'],
            ['HR Officer', 'HR Officer', 'hr@madaaris.local'],
            ['Examiner', 'Examiner', 'examiner@madaaris.local'],
            ['Report Viewer', 'Report Viewer', 'reports@madaaris.local'],
        ];

        foreach (DB::table('Tenants')->pluck('TenantId') as $tenantId) {
            $branchId = DB::table('Branches')->where('TenantId', $tenantId)->orderBy('BranchId')->value('BranchId');
            foreach ($accounts as [$roleName, $name, $email]) {
                $roleId = DB::table('Roles')->where('TenantId', $tenantId)->where('RoleName', $roleName)->value('RoleId');
                if (! $roleId) {
                    continue;
                }
                DB::table('Users')->updateOrInsert(
                    ['Email' => $email],
                    ['TenantId' => $tenantId, 'Name' => $name, 'Password' => Hash::make($password), 'Status' => 'Active', 'Permissions' => json_encode([]), 'MustChangePassword' => false, 'UpdatedAt' => now(), 'CreatedAt' => now()]
                );
                $userId = DB::table('Users')->where('Email', $email)->value('UserId');
                DB::table('UserRoles')->updateOrInsert(['TenantId' => $tenantId, 'UserId' => $userId, 'RoleId' => $roleId], []);
                if ($branchId) {
                    DB::table('UserBranches')->updateOrInsert(['TenantId' => $tenantId, 'UserId' => $userId, 'BranchId' => $branchId], []);
                }
            }
        }
    }
}

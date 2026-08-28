<?php

namespace Database\Seeders;

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
        $permissions=['students.view','students.create','students.update','students.promote','attendance.take','attendance.correct','academic.manage','quran.manage','finance.manage','accounts.manage','examinations.manage','hrm.manage','sms.configure','sms.send','reports.view','feedback.manage','users.manage','roles.manage','audit.view','settings.manage'];
        $permissionIds=[];
        foreach($permissions as $key){[$module,$action]=explode('.',$key,2);$permissionIds[$key]=DB::table('Permissions')->insertGetId(['ModuleName'=>ucfirst($module),'ActionName'=>ucfirst($action),'PermissionKey'=>$key],'PermissionId');}
        $tenantId = DB::table('Tenants')->insertGetId(['Name'=>'Madaaris Demo School','Slug'=>'demo','Status'=>'Active','Timezone'=>'Africa/Mogadishu','Currency'=>'USD','CreatedAt'=>now(),'UpdatedAt'=>now()]);
        $branchId = DB::table('Branches')->insertGetId(['TenantId'=>$tenantId,'Name'=>'Main Branch','Code'=>'MAIN','Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);
        DB::table('AcademicYears')->insert(['TenantId'=>$tenantId,'Name'=>'2026/2027','StartDate'=>'2026-08-01','EndDate'=>'2027-07-31','IsDefault'=>true,'Status'=>'Active','CreatedAt'=>now(),'UpdatedAt'=>now()]);
        DB::table('TenantSettings')->insert(['TenantId'=>$tenantId,'SchoolName'=>'Madaaris Demo School','Currency'=>'USD','Timezone'=>'Africa/Mogadishu','DefaultLanguage'=>'so','ReceiptNumberFormat'=>'RCT-{YYYY}-{SEQ}','InvoiceNumberFormat'=>'INV-{YYYY}-{SEQ}','AdmissionNumberFormat'=>'ADM-{YYYY}-{SEQ}','CertificateNumberFormat'=>'CERT-{YYYY}-{SEQ}','AttendanceLockHours'=>24,'CreatedAt'=>now(),'UpdatedAt'=>now()]);
        $ownerRole=DB::table('Roles')->insertGetId(['TenantId'=>$tenantId,'RoleName'=>'Tenant Owner','IsSystemRole'=>true,'CreatedAt'=>now()],'RoleId');
        foreach($permissionIds as $permissionId)DB::table('RolePermissions')->insert(['RoleId'=>$ownerRole,'PermissionId'=>$permissionId]);
        if ($password = env('DEMO_ADMIN_PASSWORD')) {
            $userId=DB::table('Users')->insertGetId(['TenantId'=>$tenantId,'Name'=>'Demo Administrator','Email'=>env('DEMO_ADMIN_EMAIL','admin@madaaris.local'),'Password'=>Hash::make($password),'Status'=>'Active','Permissions'=>json_encode(['*']),'CreatedAt'=>now(),'UpdatedAt'=>now()]);
            DB::table('UserBranches')->insert(['TenantId'=>$tenantId,'UserId'=>$userId,'BranchId'=>$branchId]);
            DB::table('UserRoles')->insert(['TenantId'=>$tenantId,'UserId'=>$userId,'RoleId'=>$ownerRole]);
        }
        $this->call(AccessControlSeeder::class);
    }
}

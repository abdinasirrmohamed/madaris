<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlatformAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('PLATFORM_ADMIN_EMAIL');
        $password = env('PLATFORM_ADMIN_PASSWORD');
        if (! $email || ! $password) return;

        User::updateOrCreate(
            ['Email' => $email],
            ['TenantId'=>null,'Name'=>'Platform Super Admin','Password'=>Hash::make($password),'Status'=>'Active','Permissions'=>['platform.manage'],'MustChangePassword'=>false],
        );
    }
}

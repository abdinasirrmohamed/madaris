<?php

namespace Database\Seeders;

use App\Services\Sms\SmsTemplateDefaults;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SmsDefaultsSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('Tenants')->pluck('TenantId')->each(
            fn (int $tenantId) => SmsTemplateDefaults::ensure($tenantId)
        );
    }
}

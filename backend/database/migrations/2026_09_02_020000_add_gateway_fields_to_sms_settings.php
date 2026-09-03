<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('SmsSettings', function (Blueprint $t) {
            $t->string('ApiUrl', 500)->nullable()->after('SenderId');
            $t->text('ApiSecret')->nullable()->after('EncryptedCredentials');
            $t->string('ProviderType', 50)->default('generic_http')->after('ProviderName');
            $t->boolean('IsLive')->default(false)->after('IsActive');
        });
    }

    public function down(): void
    {
        Schema::table('SmsSettings', function (Blueprint $t) {
            $t->dropColumn(['ApiUrl', 'ApiSecret', 'ProviderType', 'IsLive']);
        });
    }
};

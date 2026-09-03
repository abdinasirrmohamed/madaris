<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('Guardians', function (Blueprint $table) {
            $table->string('Password')->nullable()->after('NationalId');
            $table->string('PortalStatus')->default('Disabled')->after('Password');
            $table->boolean('MustChangePassword')->default(true)->after('PortalStatus');
            $table->timestamp('LastLoginAt')->nullable()->after('MustChangePassword');
            $table->index(['TenantId', 'Email', 'PortalStatus']);
        });
    }
    public function down(): void
    {
        Schema::table('Guardians', function (Blueprint $table) {
            $table->dropIndex(['TenantId', 'Email', 'PortalStatus']);
            $table->dropColumn(['Password','PortalStatus','MustChangePassword','LastLoginAt']);
        });
    }
};

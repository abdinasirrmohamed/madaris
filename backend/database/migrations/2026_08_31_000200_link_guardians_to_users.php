<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('Guardians', function (Blueprint $table) {
            $table->unsignedBigInteger('UserId')->nullable()->after('TenantId');
            $table->unique('UserId');
            $table->foreign('UserId')->references('UserId')->on('Users')->nullOnDelete();
        });

        foreach (DB::table('Tenants')->pluck('TenantId') as $tenantId) {
            DB::table('Roles')->updateOrInsert(
                ['TenantId' => $tenantId, 'RoleName' => 'Parent'],
                ['IsSystemRole' => true, 'CreatedAt' => now()],
            );
        }
    }

    public function down(): void
    {
        Schema::table('Guardians', function (Blueprint $table) {
            $table->dropForeign(['UserId']);
            $table->dropUnique(['UserId']);
            $table->dropColumn('UserId');
        });
        DB::table('Roles')->where('RoleName', 'Parent')->delete();
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('Employees', function (Blueprint $table) {
            $table->unsignedBigInteger('ShiftId')->nullable()->after('BranchId');
            $table->foreign('ShiftId')->references('ShiftId')->on('Shifts')->nullOnDelete();
            $table->index(['TenantId', 'ShiftId']);
        });
    }

    public function down(): void
    {
        Schema::table('Employees', function (Blueprint $table) {
            $table->dropForeign(['ShiftId']);
            $table->dropIndex(['TenantId', 'ShiftId']);
            $table->dropColumn('ShiftId');
        });
    }
};

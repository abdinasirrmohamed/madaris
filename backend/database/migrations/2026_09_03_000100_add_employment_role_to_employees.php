<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Employees', function (Blueprint $table) {
            $table->string('EmploymentRole', 50)->default('Staff')->after('BasicSalary');
            $table->index(['TenantId', 'EmploymentRole', 'Status']);
        });
    }

    public function down(): void
    {
        Schema::table('Employees', function (Blueprint $table) {
            $table->dropIndex(['TenantId', 'EmploymentRole', 'Status']);
            $table->dropColumn('EmploymentRole');
        });
    }
};

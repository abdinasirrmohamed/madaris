<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['Classes', 'Students', 'Enrollments', 'Attendance', 'QuranAssignments', 'Invoices', 'Payments'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                if (! Schema::hasColumn($table, 'CreatedAt')) {
                    $blueprint->timestamp('CreatedAt')->nullable();
                }
                if (! Schema::hasColumn($table, 'UpdatedAt')) {
                    $blueprint->timestamp('UpdatedAt')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['Classes', 'Students', 'Enrollments', 'Attendance', 'QuranAssignments', 'Invoices', 'Payments'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn(['CreatedAt', 'UpdatedAt']));
        }
    }
};

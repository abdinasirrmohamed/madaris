<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('SmsLogs', function (Blueprint $table) {
            if (! Schema::hasColumn('SmsLogs', 'ProviderResponse')) {
                $table->text('ProviderResponse')->nullable();
            }if (! Schema::hasColumn('SmsLogs', 'FailedAt')) {
                $table->timestamp('FailedAt')->nullable();
            }
        });
        Schema::table('AttendanceCorrections', function (Blueprint $table) {
            if (! Schema::hasColumn('AttendanceCorrections', 'DecisionNotes')) {
                $table->text('DecisionNotes')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('SmsLogs', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('SmsLogs', 'ProviderResponse')) {
                $columns[] = 'ProviderResponse';
            }if (Schema::hasColumn('SmsLogs', 'FailedAt')) {
                $columns[] = 'FailedAt';
            }if ($columns) {
                $table->dropColumn($columns);
            }
        });
        if (Schema::hasColumn('AttendanceCorrections', 'DecisionNotes')) {
            Schema::table('AttendanceCorrections', fn (Blueprint $table) => $table->dropColumn('DecisionNotes'));
        }
    }
};

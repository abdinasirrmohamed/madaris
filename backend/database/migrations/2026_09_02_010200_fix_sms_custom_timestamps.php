<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['SmsProviders', 'SmsJobs', 'SmsQueue', 'SmsSchedules'] as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (! Schema::hasColumn($table, 'CreatedAt')) {
                    $t->timestamp('CreatedAt')->nullable();
                }if (! Schema::hasColumn($table, 'UpdatedAt')) {
                    $t->timestamp('UpdatedAt')->nullable();
                }
            });
        }
    }

    public function down(): void {}
};

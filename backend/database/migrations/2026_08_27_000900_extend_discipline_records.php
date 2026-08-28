<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('DisciplineRecords', function (Blueprint $table) {
            $table->string('Category', 60)->default('Conduct');
            $table->string('Severity', 20)->default('Low');
            $table->string('Status', 20)->default('Open');
            $table->date('FollowUpDate')->nullable();
            $table->text('ResolutionNotes')->nullable();
            $table->unsignedBigInteger('ResolvedByUserId')->nullable();
            $table->timestamp('ResolvedAt')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('DisciplineRecords', fn (Blueprint $table) => $table->dropColumn(['Category', 'Severity', 'Status', 'FollowUpDate', 'ResolutionNotes', 'ResolvedByUserId', 'ResolvedAt']));
    }
};

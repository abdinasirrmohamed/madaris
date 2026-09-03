<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('Levels', function (Blueprint $table) {
            $table->decimal('LevelPrice', 12, 2)->default(0)->after('MinimumPromotionScore');
        });
    }

    public function down(): void
    {
        Schema::table('Levels', fn (Blueprint $table) => $table->dropColumn('LevelPrice'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('Employees')
            ->where('IsTeacher', true)
            ->where('EmploymentRole', 'Staff')
            ->update(['EmploymentRole' => 'Teacher']);
    }

    public function down(): void
    {
        // Existing employee roles are intentionally preserved on rollback.
    }
};

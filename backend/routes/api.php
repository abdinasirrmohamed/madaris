<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    require __DIR__.'/modules/auth.php';
    Route::middleware(['auth:sanctum', 'tenant.active', 'tenant', 'branch'])->group(function () {
        foreach (['dashboard', 'academic', 'students', 'attendance', 'quran', 'finance', 'accounts', 'examinations', 'hrm', 'administration'] as $module) {
            require __DIR__."/modules/{$module}.php";
        }
    });
});

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PlatformController;

Route::prefix('v1')->group(function () {
    require __DIR__.'/modules/auth.php';
    Route::middleware('auth:sanctum')->prefix('platform')->group(function () {
        Route::get('schools', [PlatformController::class, 'index']);
        Route::post('schools', [PlatformController::class, 'store']);
        Route::put('schools/{tenant}/status', [PlatformController::class, 'status']);
    });
    Route::middleware(['auth:sanctum', 'tenant.active', 'tenant', 'branch'])->group(function () {
        foreach (['dashboard', 'academic', 'students', 'attendance', 'quran', 'finance', 'accounts', 'examinations', 'hrm', 'administration'] as $module) {
            require __DIR__."/modules/{$module}.php";
        }
    });
});

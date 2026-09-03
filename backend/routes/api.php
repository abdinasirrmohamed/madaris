<?php

use App\Http\Controllers\Api\ParentPortalController;
use App\Http\Controllers\Api\PlatformController;
use App\Http\Controllers\Api\SmsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('sms/provider/webhook', [SmsController::class, 'webhook'])->middleware('throttle:60,1');
    require __DIR__.'/modules/auth.php';
    Route::middleware('auth:sanctum')->prefix('parent')->group(function () {
        Route::get('me', [ParentPortalController::class, 'me']);
        Route::get('children/{student}', [ParentPortalController::class, 'child']);
    });
    Route::middleware('auth:sanctum')->prefix('platform')->group(function () {
        Route::get('schools', [PlatformController::class, 'index']);
        Route::post('schools', [PlatformController::class, 'store']);
        Route::put('schools/{tenant}/status', [PlatformController::class, 'status']);
    });
    Route::middleware(['auth:sanctum', 'tenant.active', 'tenant', 'branch'])->group(function () {
        foreach (['dashboard', 'academic', 'students', 'attendance', 'quran', 'finance', 'accounts', 'examinations', 'hrm', 'sms', 'administration'] as $module) {
            require __DIR__."/modules/{$module}.php";
        }
    });
});

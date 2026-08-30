<?php

use App\Domains\Users\Controllers\UserManagementController;
use App\Http\Controllers\Api\SystemController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'put'], 'settings', [SystemController::class, 'settings'])->middleware('permission:settings.manage');
Route::get('feedback', [SystemController::class, 'feedback'])->middleware('permission:feedback.manage');
Route::post('feedback', [SystemController::class, 'feedback']);
Route::put('feedback/{feedback}', [SystemController::class, 'respond'])->middleware('permission:feedback.manage');
Route::match(['get', 'post'], 'sms/templates', [SystemController::class, 'smsTemplates'])->middleware('permission:sms.send');
Route::match(['get', 'put'], 'sms/settings', [SystemController::class, 'smsSettings'])->middleware('permission:sms.configure');
Route::post('sms/send', [SystemController::class, 'sendSms'])->middleware('permission:sms.send');
Route::get('sms/logs', [SystemController::class, 'smsLogs'])->middleware('permission:sms.send');
Route::get('users', [UserManagementController::class, 'index'])->middleware('permission:users.manage');
Route::post('users', [UserManagementController::class, 'store'])->middleware('permission:users.manage');
Route::put('users/{user}', [UserManagementController::class, 'update'])->middleware('permission:users.manage');
Route::put('users/{user}/status', [UserManagementController::class, 'status'])->middleware('permission:users.manage');
Route::put('users/{user}/password', [UserManagementController::class, 'resetPassword'])->middleware('permission:users.manage');
Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->middleware('permission:users.manage');
Route::match(['get', 'post'], 'roles', [SystemController::class, 'roles'])->middleware('permission:roles.manage');
Route::get('audit-logs', [SystemController::class, 'audits'])->middleware('permission:audit.view');
Route::get('reports', [SystemController::class, 'reports'])->middleware('permission:reports.view');

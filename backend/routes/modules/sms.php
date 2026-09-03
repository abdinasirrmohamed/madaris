<?php

use App\Http\Controllers\Api\SmsController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:120,1')->prefix('sms')->group(function () {
    Route::get('dashboard', [SmsController::class, 'dashboard'])->middleware('permission:sms.view_dashboard');
    Route::get('references', [SmsController::class, 'references']);
    Route::get('eligible-recipients', [SmsController::class, 'eligible'])->middleware('permission:sms.send_bulk');
    Route::post('preview', [SmsController::class, 'preview']);
    Route::post('send', [SmsController::class, 'send'])->middleware('permission:sms.send_individual');
    Route::post('send-individual-fee-reminder', [SmsController::class, 'individual'])->middleware('permission:sms.send_individual');
    Route::post('send-bulk-fee-reminders', [SmsController::class, 'bulk'])->middleware('permission:sms.send_bulk');
    Route::post('queue/process-all', [SmsController::class, 'processAllQueue'])->middleware('permission:sms.send_bulk');
    Route::post('{id}/send-now', [SmsController::class, 'sendNow'])->middleware('permission:sms.send_individual');
    Route::get('jobs', [SmsController::class, 'jobs'])->middleware('permission:sms.view_history');
    Route::get('jobs/{id}', [SmsController::class, 'job'])->middleware('permission:sms.view_history');
    Route::post('jobs/{id}/cancel', [SmsController::class, 'cancel'])->middleware('permission:sms.cancel');
    Route::get('templates', [SmsController::class, 'templates'])->middleware('permission:sms.manage_templates');
    Route::post('templates', [SmsController::class, 'storeTemplate'])->middleware('permission:sms.manage_templates');
    Route::put('templates/{id}', [SmsController::class, 'updateTemplate'])->middleware('permission:sms.manage_templates');
    Route::delete('templates/{id}', [SmsController::class, 'deleteTemplate'])->middleware('permission:sms.manage_templates');
    Route::get('schedules', [SmsController::class, 'schedules'])->middleware('permission:sms.manage_schedules');
    Route::post('schedules', [SmsController::class, 'storeSchedule'])->middleware('permission:sms.manage_schedules');
    Route::put('schedules/{id}', [SmsController::class, 'updateSchedule'])->middleware('permission:sms.manage_schedules');
    Route::delete('schedules/{id}', [SmsController::class, 'deleteSchedule'])->middleware('permission:sms.manage_schedules');
    Route::get('history', [SmsController::class, 'history'])->middleware('permission:sms.view_history');
    Route::get('history-summary', [SmsController::class, 'historySummary'])->middleware('permission:sms.view_history');
    Route::get('history/{id}', [SmsController::class, 'historyItem'])->middleware('permission:sms.view_history');
    Route::post('{id}/retry', [SmsController::class, 'retry'])->middleware('permission:sms.retry');
    Route::post('{id}/resend', [SmsController::class, 'resend'])->middleware('permission:sms.resend');
    Route::match(['get', 'put'], 'settings', [SmsController::class, 'settings'])->middleware('permission:sms.manage_settings');
    Route::get('provider/balance', [SmsController::class, 'balance'])->middleware('permission:sms.view_provider_balance');
    Route::post('provider/test', [SmsController::class, 'test'])->middleware('permission:sms.manage_settings');
});

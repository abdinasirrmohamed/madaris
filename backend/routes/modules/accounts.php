<?php

use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\AccountOperationsController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], 'accounts', [FinanceController::class, 'accounts'])->middleware('permission:accounts.manage');
Route::match(['get', 'post'], 'accounts/expense-categories', [FinanceController::class, 'categories'])->middleware('permission:accounts.manage');
Route::get('accounts/expenses', [FinanceController::class, 'expenses'])->middleware('permission:accounts.manage');
Route::post('accounts/expenses', [FinanceController::class, 'expense'])->middleware('permission:accounts.manage');
Route::post('accounts/transfers', [FinanceController::class, 'transfer'])->middleware('permission:accounts.manage');
Route::get('account-operations', [AccountOperationsController::class, 'index'])->middleware('permission:accounts.manage');
Route::post('account-operations/movements', [AccountOperationsController::class, 'movement'])->middleware('permission:accounts.manage');
Route::post('account-operations/reconciliations', [AccountOperationsController::class, 'reconcile'])->middleware('permission:accounts.manage');
Route::put('account-operations/payrolls/{payroll}', [AccountOperationsController::class, 'payrollAdjustment'])->middleware('permission:accounts.manage');

<?php

use App\Http\Controllers\Api\FinanceController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], 'accounts', [FinanceController::class, 'accounts'])->middleware('permission:accounts.manage');
Route::match(['get', 'post'], 'accounts/expense-categories', [FinanceController::class, 'categories'])->middleware('permission:accounts.manage');
Route::get('accounts/expenses', [FinanceController::class, 'expenses'])->middleware('permission:accounts.manage');
Route::post('accounts/expenses', [FinanceController::class, 'expense'])->middleware('permission:accounts.manage');
Route::post('accounts/transfers', [FinanceController::class, 'transfer'])->middleware('permission:accounts.manage');

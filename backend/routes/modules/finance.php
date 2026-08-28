<?php

use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\PaymentController;
use Illuminate\Support\Facades\Route;

Route::get('finance/invoices', [FinanceController::class, 'invoices'])->middleware('permission:finance.manage');
Route::post('finance/invoices', [FinanceController::class, 'invoice'])->middleware('permission:finance.manage');
Route::get('finance/invoices/{invoice}', [FinanceController::class, 'invoiceDetails'])->middleware('permission:finance.manage');
Route::post('finance/invoices/{invoice}/adjustments', [FinanceController::class, 'adjustInvoice'])->middleware('permission:finance.manage');
Route::get('finance/payments', [FinanceController::class, 'payments'])->middleware('permission:finance.manage');
Route::post('finance/payments/{payment}/reverse', [FinanceController::class, 'reverse'])->middleware('permission:finance.manage');
Route::get('finance/payments/{payment}/receipt', [FinanceController::class, 'receipt'])->middleware('permission:finance.manage');
Route::match(['get', 'post'], 'finance/fee-types', [FinanceController::class, 'feeTypes'])->middleware('permission:finance.manage');
Route::match(['get', 'post'], 'finance/discounts', [FinanceController::class, 'discounts'])->middleware('permission:finance.manage');
Route::put('finance/discounts/{discount}/status', [FinanceController::class, 'discountStatus'])->middleware('permission:finance.manage');
Route::get('finance/responsible-guardians', [FinanceController::class, 'responsibleGuardians'])->middleware('permission:finance.manage');
Route::post('payments', [PaymentController::class, 'store'])->middleware('permission:finance.manage');

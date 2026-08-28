<?php

use App\Http\Controllers\Api\HrmController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], 'hrm/employees', [HrmController::class, 'employees'])->middleware('permission:hrm.manage');
Route::match(['get', 'post'], 'hrm/attendance', [HrmController::class, 'attendance'])->middleware('permission:hrm.manage');
Route::match(['get', 'post'], 'hrm/payroll', [HrmController::class, 'payroll'])->middleware('permission:hrm.manage');

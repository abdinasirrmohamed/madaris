<?php

use App\Http\Controllers\Api\AttendanceController;
use Illuminate\Support\Facades\Route;

Route::get('attendance/roster', [AttendanceController::class, 'roster'])->middleware('permission:attendance.take');
Route::get('attendance/report', [AttendanceController::class, 'report'])->middleware('permission:attendance.take');
Route::get('attendance/missing', [AttendanceController::class, 'missing'])->middleware('permission:attendance.correct');
Route::get('attendance/corrections', [AttendanceController::class, 'corrections'])->middleware('permission:attendance.correct');
Route::post('attendance', [AttendanceController::class, 'store'])->middleware('permission:attendance.take');
Route::post('attendance/{attendance}/corrections', [AttendanceController::class, 'correction'])->middleware('permission:attendance.correct');
Route::post('attendance/corrections/{correction}/approve', [AttendanceController::class, 'approve'])->middleware('permission:attendance.correct');
Route::post('attendance/corrections/{correction}/reject', [AttendanceController::class, 'reject'])->middleware('permission:attendance.correct');

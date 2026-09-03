<?php

use App\Http\Controllers\Api\HrmController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], 'hrm/employees', [HrmController::class, 'employees'])->middleware('permission:hrm.manage');
Route::put('hrm/employees/{employeeId}', [HrmController::class, 'updateEmployee'])->middleware('permission:hrm.manage');
Route::delete('hrm/employees/{employeeId}', [HrmController::class, 'deleteEmployee'])->middleware('permission:hrm.manage');
Route::get('hrm/shifts', [HrmController::class, 'shifts'])->middleware('permission:hrm.manage');
Route::get('hrm/teacher-assignment-options', [HrmController::class, 'teacherAssignmentOptions'])->middleware('permission:hrm.manage');
Route::match(['get', 'post'], 'hrm/teacher-assignments', [HrmController::class, 'teacherAssignments'])->middleware('permission:hrm.manage');
Route::delete('hrm/teacher-assignments/{assignmentId}', [HrmController::class, 'deleteTeacherAssignment'])->middleware('permission:hrm.manage');
Route::match(['get', 'post'], 'hrm/attendance', [HrmController::class, 'attendance'])->middleware('permission:hrm.manage');
Route::match(['get', 'post'], 'hrm/payroll', [HrmController::class, 'payroll'])->middleware('permission:hrm.manage');

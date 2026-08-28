<?php

use App\Domains\Students\Controllers\StudentDirectoryController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentLifecycleController;
use Illuminate\Support\Facades\Route;

Route::get('students', [StudentController::class, 'index'])->middleware('permission:students.view');
Route::get('students/{student}', [StudentController::class, 'show'])->middleware('permission:students.view');
Route::post('students', [StudentController::class, 'store'])->middleware('permission:students.create');
Route::get('students/{student}/profile', [StudentLifecycleController::class, 'profile'])->middleware('permission:students.view');
Route::put('students/{student}', [StudentLifecycleController::class, 'update'])->middleware('permission:students.update');
Route::post('students/{student}/guardians', [StudentLifecycleController::class, 'guardian'])->middleware('permission:students.update');
Route::post('students/{student}/enrollments', [StudentLifecycleController::class, 'enroll'])->middleware('permission:students.update');
Route::post('students/{student}/promotions', [StudentLifecycleController::class, 'promote'])->middleware('permission:students.promote');
Route::put('students/{student}/clearance', [StudentLifecycleController::class, 'clearance'])->middleware('permission:students.update');
Route::post('students/{student}/graduation', [StudentLifecycleController::class, 'graduate'])->middleware('permission:students.promote');
Route::post('students/{student}/status', [StudentLifecycleController::class, 'status'])->middleware('permission:students.update');
Route::post('students/{student}/transfer', [StudentLifecycleController::class, 'transfer'])->middleware('permission:students.update');
Route::post('students/{student}/documents', [StudentLifecycleController::class, 'document'])->middleware('permission:students.update');
Route::get('students/{student}/documents/{document}', [StudentLifecycleController::class, 'download'])->middleware('permission:students.view');
Route::get('guardians', [StudentDirectoryController::class, 'guardians'])->middleware('permission:students.view');
Route::post('guardians/{guardian}/students', [StudentDirectoryController::class, 'linkGuardian'])->middleware('permission:students.update');
Route::match(['get', 'post'], 'discipline', [StudentDirectoryController::class, 'discipline'])->middleware('permission:students.update');
Route::put('discipline/{discipline}', [StudentDirectoryController::class, 'resolve'])->middleware('permission:students.update');

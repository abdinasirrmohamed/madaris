<?php

use App\Http\Controllers\Api\AcademicController;
use Illuminate\Support\Facades\Route;

Route::get('academic/references/teachers', [AcademicController::class, 'teachers'])->middleware('permission:academic.manage');

Route::get('academic/{resource}', [AcademicController::class, 'index'])->middleware('permission:academic.manage');
Route::post('academic/{resource}', [AcademicController::class, 'store'])->middleware('permission:academic.manage');
Route::put('academic/{resource}/{id}', [AcademicController::class, 'update'])->middleware('permission:academic.manage');
Route::delete('academic/{resource}/{id}', [AcademicController::class, 'destroy'])->middleware('permission:academic.manage');

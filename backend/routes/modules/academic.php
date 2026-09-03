<?php

use App\Http\Controllers\Api\AcademicController;
use App\Http\Controllers\Api\AcademicGraduationController;
use App\Http\Controllers\Api\ClassPromotionController;
use Illuminate\Support\Facades\Route;

Route::get('academic/references/teachers', [AcademicController::class, 'teachers'])->middleware('permission:academic.manage');

Route::prefix('academic/promotions')->group(function () {
    Route::get('references', [ClassPromotionController::class, 'references'])->middleware('permission:academic.manage');
    Route::get('candidates', [ClassPromotionController::class, 'candidates'])->middleware('permission:academic.manage');
    Route::post('promote', [ClassPromotionController::class, 'promote'])->middleware('permission:students.promote');
    Route::get('logs', [ClassPromotionController::class, 'logs'])->middleware('permission:academic.manage');
    Route::post('{id}/revert', [ClassPromotionController::class, 'revert'])->middleware('permission:students.promote');
});

Route::prefix('academic/graduations')->group(function () {
    Route::get('references', [AcademicGraduationController::class, 'references'])->middleware('permission:academic.manage');
    Route::get('candidates', [AcademicGraduationController::class, 'candidates'])->middleware('permission:academic.manage');
    Route::post('graduate', [AcademicGraduationController::class, 'graduate'])->middleware('permission:students.promote');
    Route::get('records', [AcademicGraduationController::class, 'records'])->middleware('permission:academic.manage');
    Route::get('{id}/certificate', [AcademicGraduationController::class, 'certificate'])->middleware('permission:academic.manage');
    Route::post('{id}/revert', [AcademicGraduationController::class, 'revert'])->middleware('permission:students.promote');
});

Route::get('academic/{resource}', [AcademicController::class, 'index'])->middleware('permission:academic.manage');
Route::post('academic/{resource}', [AcademicController::class, 'store'])->middleware('permission:academic.manage');
Route::put('academic/{resource}/{id}', [AcademicController::class, 'update'])->middleware('permission:academic.manage');
Route::delete('academic/{resource}/{id}', [AcademicController::class, 'destroy'])->middleware('permission:academic.manage');

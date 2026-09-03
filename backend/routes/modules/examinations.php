<?php

use App\Http\Controllers\Api\ExaminationController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], 'examinations/types', [ExaminationController::class, 'types'])->middleware('permission:examinations.manage');
Route::match(['get', 'post'], 'examinations', [ExaminationController::class, 'exams'])->middleware('permission:examinations.manage');
Route::get('examinations-report', [ExaminationController::class, 'report'])->middleware('permission:examinations.manage');
Route::post('examinations/{exam}/schedule', [ExaminationController::class, 'schedule'])->middleware('permission:examinations.manage');
Route::get('examinations/{exam}/roster', [ExaminationController::class, 'roster'])->middleware('permission:examinations.manage');
Route::put('examinations/{exam}/attendance', [ExaminationController::class, 'attendance'])->middleware('permission:examinations.manage');
Route::put('examinations/{exam}/marks', [ExaminationController::class, 'marks'])->middleware('permission:examinations.manage');
Route::get('examinations/{exam}/results', [ExaminationController::class, 'results'])->middleware('permission:examinations.manage');
Route::post('examinations/{exam}/transition', [ExaminationController::class, 'transition'])->middleware('permission:examinations.manage');
Route::get('examinations-rankings', [ExaminationController::class, 'rankings'])->middleware('permission:examinations.manage');
Route::get('examinations/cards/id/{student}', [ExaminationController::class, 'idCard'])->middleware('permission:examinations.manage');
Route::get('examinations/cards/clearance/{student}', [ExaminationController::class, 'clearanceCard'])->middleware('permission:examinations.manage');

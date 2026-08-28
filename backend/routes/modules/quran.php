<?php

use App\Http\Controllers\Api\QuranController;
use Illuminate\Support\Facades\Route;

Route::get('quran/assignments', [QuranController::class, 'assignments'])->middleware('permission:quran.manage');
Route::get('quran/surahs', [QuranController::class, 'surahs'])->middleware('permission:quran.manage');
Route::post('quran/assignments', [QuranController::class, 'assign'])->middleware('permission:quran.manage');
Route::put('quran/assignments/{assignment}/status', [QuranController::class, 'status'])->middleware('permission:quran.manage');
Route::post('quran/assignments/{assignment}/assessments', [QuranController::class, 'assess'])->middleware('permission:quran.manage');
Route::get('quran/reports/progress', [QuranController::class, 'report'])->middleware('permission:quran.manage');
Route::get('quran/reports/mistakes', [QuranController::class, 'mistakeReport'])->middleware('permission:quran.manage');

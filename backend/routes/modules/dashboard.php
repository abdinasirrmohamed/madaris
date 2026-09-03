<?php

use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BranchManagementController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard', DashboardController::class);
Route::get('branches', BranchController::class);
Route::get('branch-management', [BranchManagementController::class, 'index'])->middleware('permission:settings.manage');
Route::post('branch-management', [BranchManagementController::class, 'store'])->middleware('permission:settings.manage');
Route::put('branch-management/{branch}', [BranchManagementController::class, 'update'])->middleware('permission:settings.manage');
Route::put('branch-management/{branch}/users', [BranchManagementController::class, 'assign'])->middleware('permission:settings.manage');

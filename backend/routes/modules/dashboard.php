<?php

use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard', DashboardController::class);
Route::get('branches', BranchController::class);

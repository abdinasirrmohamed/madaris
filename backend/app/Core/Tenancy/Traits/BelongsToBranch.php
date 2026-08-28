<?php

namespace App\Core\Tenancy\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToBranch
{
    public static function bootBelongsToBranch(): void
    {
        static::creating(function ($model) {
            abort_unless($model->BranchId, 422, 'BranchId is required.');
        });
    }

    public function scopeForBranch(Builder $query, int $branchId): Builder
    {
        return $query->where($query->qualifyColumn('BranchId'), $branchId);
    }
}

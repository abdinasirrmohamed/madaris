<?php

namespace App\Core\Tenancy\Scopes;

use App\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $context = app(TenantContext::class);
        if ($context->hasTenant()) {
            $builder->where($model->qualifyColumn('TenantId'), $context->id());
        }
    }
}

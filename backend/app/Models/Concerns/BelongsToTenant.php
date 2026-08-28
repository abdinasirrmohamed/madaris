<?php
namespace App\Models\Concerns;

use App\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) { $context = app(TenantContext::class); if ($context->hasTenant()) $builder->where($builder->qualifyColumn('TenantId'), $context->id()); });
        static::creating(function ($model) { $model->TenantId ??= app(TenantContext::class)->id(); });
    }
}

<?php

namespace App\Core\Tenancy\Traits;

use App\Core\Tenancy\Scopes\TenantScope;
use App\Tenancy\TenantContext;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);
        static::creating(function ($model) {
            $model->TenantId ??= app(TenantContext::class)->id();
        });
    }
}

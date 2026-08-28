<?php

namespace App\Core\Tenancy\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $table = 'Tenants';

    protected $primaryKey = 'TenantId';

    const CREATED_AT = 'CreatedAt';

    const UPDATED_AT = 'UpdatedAt';

    protected $guarded = ['TenantId'];
}

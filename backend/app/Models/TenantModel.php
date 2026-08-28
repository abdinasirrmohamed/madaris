<?php
namespace App\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

abstract class TenantModel extends Model
{
    use BelongsToTenant;
    const CREATED_AT = 'CreatedAt'; const UPDATED_AT = 'UpdatedAt';
    protected $guarded = ['TenantId'];
}

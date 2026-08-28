<?php

namespace App\Core\Tenancy\Models;

use App\Models\TenantModel;

class Branch extends TenantModel
{
    protected $table = 'Branches';

    protected $primaryKey = 'BranchId';
}

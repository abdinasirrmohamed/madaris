<?php

namespace App\Core\Tenancy\Models;

use App\Models\TenantModel;

class TenantSetting extends TenantModel
{
    protected $table = 'TenantSettings';

    protected $primaryKey = 'TenantSettingId';
}

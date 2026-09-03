<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Guardian extends Authenticatable
{
    use HasApiTokens;
    protected $table = 'Guardians';
    protected $primaryKey = 'GuardianId';
    public $timestamps = false;
    protected $fillable = ['TenantId','UserId','FullName','PrimaryPhone','SecondaryPhone','Email','Address','Password','PortalStatus','MustChangePassword','LastLoginAt'];
    protected $hidden = ['Password'];
    protected function casts(): array { return ['Password'=>'hashed','MustChangePassword'=>'boolean','LastLoginAt'=>'datetime']; }
}

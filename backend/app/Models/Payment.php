<?php
namespace App\Models;
class Payment extends TenantModel { protected $table='Payments'; protected $primaryKey='PaymentId'; protected function casts(): array { return ['Amount'=>'decimal:2']; } }

<?php
namespace App\Models;
class Invoice extends TenantModel { protected $table='Invoices'; protected $primaryKey='InvoiceId'; protected function casts(): array { return ['Total'=>'decimal:2','Balance'=>'decimal:2']; } }

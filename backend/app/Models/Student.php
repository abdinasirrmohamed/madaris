<?php
namespace App\Models;
class Student extends TenantModel { protected $table='Students'; protected $primaryKey='StudentId'; public function invoices(){return $this->hasMany(Invoice::class,'StudentId');} public function smsQueue(){return $this->hasMany(SmsQueueItem::class,'StudentId');} }

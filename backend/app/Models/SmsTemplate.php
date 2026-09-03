<?php

namespace App\Models;

class SmsTemplate extends TenantModel
{
    protected $table = 'SmsTemplates';

    protected $primaryKey = 'SmsTemplateId';

    protected function casts(): array
    {
        return ['IsActive' => 'boolean', 'IsDefault' => 'boolean'];
    }

    public function queues()
    {
        return $this->hasMany(SmsQueueItem::class, 'SmsTemplateId');
    }
}

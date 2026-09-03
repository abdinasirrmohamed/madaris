<?php

namespace App\Models;

class SmsDeliveryEvent extends TenantModel
{
    protected $table = 'SmsDeliveryEvents';

    protected $primaryKey = 'SmsDeliveryEventId';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['Payload' => 'array', 'OccurredAt' => 'datetime', 'CreatedAt' => 'datetime'];
    }

    public function queueItem()
    {
        return $this->belongsTo(SmsQueueItem::class, 'SmsQueueId');
    }
}

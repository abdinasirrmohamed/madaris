<?php

namespace App\Models;

class SmsLog extends TenantModel
{
    protected $table = 'SmsLogs';

    protected $primaryKey = 'SmsLogId';

    protected function casts(): array
    {
        return ['ScheduledAt' => 'datetime', 'SentAt' => 'datetime', 'DeliveredAt' => 'datetime', 'FailedAt' => 'datetime'];
    }

    public function queueItem()
    {
        return $this->belongsTo(SmsQueueItem::class, 'SmsQueueId');
    }
}

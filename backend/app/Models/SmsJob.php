<?php

namespace App\Models;

class SmsJob extends TenantModel
{
    protected $table = 'SmsJobs';

    protected $primaryKey = 'SmsJobId';

    protected function casts(): array
    {
        return ['Filters' => 'array', 'ScheduledAt' => 'datetime', 'StartedAt' => 'datetime', 'CompletedAt' => 'datetime'];
    }

    public function messages()
    {
        return $this->hasMany(SmsQueueItem::class, 'SmsJobId');
    }
}

<?php

namespace App\Models;

class SmsQueueItem extends TenantModel
{
    protected $table = 'SmsQueue';

    protected $primaryKey = 'SmsQueueId';

    protected function casts(): array
    {
        return ['ScheduledAt' => 'datetime', 'NextRetryAt' => 'datetime'];
    }

    public function job()
    {
        return $this->belongsTo(SmsJob::class, 'SmsJobId');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'StudentId');
    }

    public function guardian()
    {
        return $this->belongsTo(Guardian::class, 'GuardianId');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'InvoiceId');
    }

    public function template()
    {
        return $this->belongsTo(SmsTemplate::class, 'SmsTemplateId');
    }

    public function events()
    {
        return $this->hasMany(SmsDeliveryEvent::class, 'SmsQueueId');
    }
}

<?php

namespace App\Models;

class SmsSchedule extends TenantModel
{
    protected $table = 'SmsSchedules';

    protected $primaryKey = 'SmsScheduleId';

    protected function casts(): array
    {
        return ['IsEnabled' => 'boolean', 'PaymentStatuses' => 'array', 'ClassIds' => 'array', 'LevelIds' => 'array', 'ShiftIds' => 'array', 'FeeTypeIds' => 'array', 'SkipWeekends' => 'boolean', 'CombineSiblings' => 'boolean', 'LastRunAt' => 'datetime', 'NextRunAt' => 'datetime'];
    }
}

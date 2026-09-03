<?php

namespace App\Http\Requests\Sms;

use Illuminate\Foundation\Http\FormRequest;

class ScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['Name' => ['required', 'string', 'max:120'], 'IsEnabled' => ['boolean'], 'DayOfMonth' => ['required', 'integer', 'between:1,28'], 'SendTime' => ['required', 'date_format:H:i'], 'Timezone' => ['required', 'timezone'], 'PaymentStatuses' => ['required', 'array', 'min:1'], 'PaymentStatuses.*' => ['in:unpaid,partially_paid,overdue'], 'ClassIds' => ['nullable', 'array'], 'LevelIds' => ['nullable', 'array'], 'ShiftIds' => ['nullable', 'array'], 'FeeTypeIds' => ['nullable', 'array'], 'SmsTemplateId' => ['required', 'integer'], 'NumberOfReminders' => ['integer', 'between:1,10'], 'DaysBetweenReminders' => ['integer', 'between:1,90'], 'SkipWeekends' => ['boolean'], 'CombineSiblings' => ['boolean'], 'BatchSize' => ['integer', 'between:1,500'], 'MaximumAttempts' => ['integer', 'between:1,10']];
    }
}

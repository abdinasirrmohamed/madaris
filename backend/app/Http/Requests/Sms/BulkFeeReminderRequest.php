<?php

namespace App\Http\Requests\Sms;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkFeeReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['InvoiceIds' => ['nullable', 'array'], 'InvoiceIds.*' => ['integer'], 'SmsTemplateId' => ['required', 'integer'], 'CombineSiblings' => ['boolean'], 'ScheduledAt' => ['nullable', 'date'], 'MessageType' => ['nullable', Rule::in(['fee_created', 'fee_reminder', 'partial_payment', 'payment_overdue', 'payment_received', 'general_announcement'])], 'Filters' => ['nullable', 'array'], 'Filters.AcademicYearId' => ['nullable', 'integer'], 'Filters.ClassId' => ['nullable', 'integer'], 'Filters.LevelId' => ['nullable', 'integer'], 'Filters.ShiftId' => ['nullable', 'integer'], 'Filters.FeeTypeId' => ['nullable', 'integer'], 'Filters.Month' => ['nullable', 'integer', 'between:1,12'], 'Filters.Year' => ['nullable', 'integer', 'between:2020,2200'], 'Filters.PaymentStatus' => ['nullable', Rule::in(['unpaid', 'partially_paid', 'overdue', 'all_outstanding'])], 'Filters.DueDate' => ['nullable', 'date'], 'ForceResend' => ['boolean'], 'ResendReason' => ['nullable', 'required_if:ForceResend,true', 'string', 'max:500']];
    }
}

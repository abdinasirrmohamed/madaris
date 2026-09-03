<?php

namespace App\Http\Requests\Sms;

use App\Services\Sms\SmsTemplateRenderer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['TemplateName' => ['required', 'string', 'max:100'], 'TemplateType' => ['required', Rule::in(['fee_created', 'fee_reminder', 'partial_payment', 'payment_overdue', 'payment_received', 'general_announcement'])], 'Language' => ['required', Rule::in(['so', 'en', 'ar'])], 'TemplateBody' => ['required', 'string', 'max:1500'], 'IsActive' => ['boolean'], 'IsDefault' => ['boolean']];
    }

    public function after(): array
    {
        return [function ($v) {
            try {
                app(SmsTemplateRenderer::class)->validate((string) $this->input('TemplateBody'));
            } catch (\Throwable $e) {
                $v->errors()->add('TemplateBody', $e->getMessage());
            }
        }];
    }
}

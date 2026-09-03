<?php

namespace App\Services\Sms;

use Illuminate\Validation\ValidationException;

class SmsTemplateRenderer
{
    public const VARIABLES = ['school_name', 'parent_name', 'student_name', 'admission_number', 'class_name', 'fee_type', 'month', 'year', 'total_fee', 'paid_amount', 'amount_due', 'remaining_amount', 'due_date', 'payment_status', 'school_phone'];

    public function validate(string $template): void
    {
        preg_match_all('/\{([a-z_]+)\}/i', $template, $matches);
        $unknown = array_values(array_diff(array_unique($matches[1] ?? []), self::VARIABLES));
        if ($unknown) {
            throw ValidationException::withMessages(['Message' => ['Unknown template variables: '.implode(', ', $unknown)]]);
        }
    }

    public function render(string $template, array $data): string
    {
        $this->validate($template);
        $replace = [];
        foreach (self::VARIABLES as $key) {
            $replace['{'.$key.'}'] = (string) ($data[$key] ?? '');
        }

        return strtr($template, $replace);
    }

    public function segments(string $message): int
    {
        $unicode = (bool) preg_match('/[^\x00-\x7F]/', $message);
        $single = $unicode ? 70 : 160;
        $multi = $unicode ? 67 : 153;

        return mb_strlen($message) <= $single ? 1 : (int) ceil(mb_strlen($message) / $multi);
    }
}

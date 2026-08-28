<?php

namespace App\Domains\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeStudentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['Status' => ['required', Rule::in(['Active', 'Inactive', 'Suspended'])], 'Reason' => ['required', 'string', 'max:500']];
    }
}

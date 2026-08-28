<?php

namespace App\Domains\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransferStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['ToBranchId' => ['nullable', 'integer'], 'ExternalDestination' => ['nullable', 'string', 'max:200'], 'TransferDate' => ['required', 'date'], 'Reason' => ['required', 'string', 'max:500']];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->input('ToBranchId') && ! $this->input('ExternalDestination')) {
                $validator->errors()->add('ToBranchId', 'Choose a branch or enter an external destination.');
            }
        });
    }
}

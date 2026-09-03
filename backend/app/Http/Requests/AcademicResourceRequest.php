<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AcademicResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return match ($this->route('resource')) {
            'academic-years' => ['Name' => ['required', 'string', 'max:50'], 'StartDate' => ['required', 'date'], 'EndDate' => ['required', 'date', 'after:StartDate'], 'IsDefault' => ['boolean'], 'Status' => ['required', Rule::in(['Active', 'Inactive', 'Closed'])]],
            'levels' => ['Name' => ['required', 'string', 'max:80'], 'Code' => ['required', 'string', 'max:20'], 'SequenceNo' => ['required', 'integer', 'min:1'], 'MinimumPromotionScore' => ['required', 'numeric', 'between:0,100'], 'LevelPrice' => ['required', 'numeric', 'min:0', 'max:9999999999.99'], 'Status' => ['required', Rule::in(['Active', 'Inactive'])]],
            'shifts' => ['Name' => ['required', 'string', 'max:50'], 'StartTime' => ['required', 'date_format:H:i'], 'EndTime' => ['required', 'date_format:H:i', 'after:StartTime'], 'Status' => ['required', Rule::in(['Active', 'Inactive'])]],
            'subjects' => ['SubjectName' => ['required', 'string', 'max:100'], 'SubjectCode' => ['required', 'string', 'max:20'], 'SubjectType' => ['required', Rule::in(['Academic', 'Quran', 'Other'])], 'MaximumMark' => ['required', 'numeric', 'gt:0'], 'PassMark' => ['required', 'numeric', 'gte:0', 'lte:MaximumMark'], 'IsActive' => ['boolean']],
            'lessons' => ['SubjectId' => ['required', 'integer'], 'LessonTitle' => ['required', 'string', 'max:150'], 'SortOrder' => ['required', 'integer', 'min:0']],
            'classes' => ['BranchId' => ['required', 'integer'], 'AcademicYearId' => ['required', 'integer'], 'LevelId' => ['required', 'integer'], 'ShiftId' => ['required', 'integer'], 'Name' => ['required', 'string', 'max:80'], 'Code' => ['required', 'string', 'max:20'], 'Capacity' => ['required', 'integer', 'min:1'], 'Status' => ['required', Rule::in(['Active', 'Inactive'])]],
            'timetables' => ['BranchId' => ['required', 'integer'], 'ClassId' => ['required', 'integer'], 'SubjectId' => ['required', 'integer'], 'TeacherId' => ['nullable', 'integer'], 'DayOfWeek' => ['required', 'integer', 'between:1,7'], 'StartTime' => ['required', 'date_format:H:i'], 'EndTime' => ['required', 'date_format:H:i', 'after:StartTime'], 'Room' => ['nullable', 'string', 'max:50']],
            default => abort(404),
        };
    }
}

<?php

namespace App\Services;

use App\Tenancy\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcademicService
{
    public function __construct(private TenantContext $tenant) {}

    private const RESOURCES = [
        'academic-years' => ['AcademicYears', 'AcademicYearId'], 'levels' => ['Levels', 'LevelId'],
        'shifts' => ['Shifts', 'ShiftId'], 'subjects' => ['Subjects', 'SubjectId'], 'lessons' => ['Lessons', 'LessonId'], 'classes' => ['Classes', 'ClassId'], 'timetables' => ['TimeTables', 'TimeTableId'],
    ];

    private function config(string $resource): array
    {
        return self::RESOURCES[$resource] ?? abort(404);
    }

    public function list(string $resource, array $filters): array
    {
        [$table,$key] = $this->config($resource);
        if ($resource === 'timetables') {
            return DB::table('TimeTables')->join('Classes', 'TimeTables.ClassId', '=', 'Classes.ClassId')->join('Subjects', 'TimeTables.SubjectId', '=', 'Subjects.SubjectId')->leftJoin('Users', 'TimeTables.TeacherId', '=', 'Users.UserId')->where('TimeTables.TenantId', $this->tenant->id())->select('TimeTables.*', 'Classes.Name as ClassName', 'Subjects.SubjectName', 'Users.Name as TeacherName')->orderBy('DayOfWeek')->orderBy('StartTime')->get()->all();
        }if ($resource === 'lessons') {
            return DB::table('Lessons')->join('Subjects', 'Lessons.SubjectId', '=', 'Subjects.SubjectId')->where('Lessons.TenantId', $this->tenant->id())->select('Lessons.*', 'Subjects.SubjectName')->orderBy('Subjects.SubjectName')->orderBy('SortOrder')->get()->all();
        }if ($resource === 'levels') {
            $tenantId = $this->tenant->id();

            return DB::table('Levels as levels')
                ->where('levels.TenantId', $tenantId)
                ->select('levels.*')
                ->selectSub(
                    DB::table('Classes as classes')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('classes.LevelId', 'levels.LevelId')
                        ->where('classes.TenantId', $tenantId),
                    'ClassesCount'
                )
                ->selectSub(
                    DB::table('Enrollments as enrollments')
                        ->join('Classes as enrolled_classes', 'enrollments.ClassId', '=', 'enrolled_classes.ClassId')
                        ->selectRaw('COUNT(DISTINCT enrollments.StudentId)')
                        ->whereColumn('enrolled_classes.LevelId', 'levels.LevelId')
                        ->where('enrollments.TenantId', $tenantId)
                        ->where('enrollments.Status', 'Active'),
                    'StudentsCount'
                )
                ->orderBy('levels.SequenceNo')
                ->get()
                ->all();
        }$query = DB::table($table)->where('TenantId', $this->tenant->id());
        if (($filters['BranchId'] ?? null) && in_array($resource, ['classes'])) {
            $query->where('BranchId', $filters['BranchId']);
        }
        $rows = $query->orderBy($resource === 'levels' ? 'SequenceNo' : $key)->get();

        return $rows->all();
    }

    public function create(string $resource, array $data): object
    {
        [$table,$key] = $this->config($resource);
        $this->validateReferences($resource, $data);
        if ($resource === 'timetables') {
            $this->validateTimetableConflict($data);
        }

        return DB::transaction(function () use ($resource, $table, $key, $data) {
            if ($resource === 'academic-years' && ($data['IsDefault'] ?? false)) {
                DB::table($table)->where('TenantId', $this->tenant->id())->update(['IsDefault' => false]);
            }
            $now = now();
            if (in_array($table, ['AcademicYears', 'Levels', 'Shifts', 'Classes'])) {
                $data['CreatedAt'] = $now;
                $data['UpdatedAt'] = $now;
            }
            $id = DB::table($table)->insertGetId(['TenantId' => $this->tenant->id(), ...$data], $key);
            $this->audit('Create', $table, $id, null, $data);

            return DB::table($table)->where($key, $id)->first();
        });
    }

    public function update(string $resource, int $id, array $data): object
    {
        [$table,$key] = $this->config($resource);
        $this->validateReferences($resource, $data);
        if ($resource === 'timetables') {
            $this->validateTimetableConflict($data, $id);
        } $query = DB::table($table)->where('TenantId', $this->tenant->id())->where($key, $id);
        $before = $query->first();
        abort_unless($before, 404);

        return DB::transaction(function () use ($resource, $table, $key, $id, $data, $before) {
            if ($resource === 'academic-years' && ($data['IsDefault'] ?? false)) {
                DB::table($table)->where('TenantId', $this->tenant->id())->where($key, '!=', $id)->update(['IsDefault' => false]);
            } if (in_array($table, ['AcademicYears', 'Levels', 'Shifts', 'Classes'])) {
                $data['UpdatedAt'] = now();
            } DB::table($table)->where('TenantId', $this->tenant->id())->where($key, $id)->update($data);
            $this->audit('Update', $table, $id, (array) $before, $data);

            return DB::table($table)->where($key, $id)->first();
        });
    }

    public function delete(string $resource, int $id): void
    {
        [$table,$key] = $this->config($resource);
        $query = DB::table($table)->where('TenantId', $this->tenant->id())->where($key, $id);
        $before = $query->first();
        abort_unless($before, 404);
        try {
            $query->delete();
            $this->audit('Delete', $table, $id, (array) $before, null);
        } catch (QueryException) {
            throw ValidationException::withMessages(['record' => 'This record is already in use and cannot be deleted.']);
        }
    }

    private function validateReferences(string $resource, array $data): void
    {
        if ($resource === 'classes') {
            foreach (['Branches' => ['BranchId', 'BranchId'], 'AcademicYears' => ['AcademicYearId', 'AcademicYearId'], 'Levels' => ['LevelId', 'LevelId'], 'Shifts' => ['ShiftId', 'ShiftId']] as $table => [$field,$key]) {
                abort_unless(DB::table($table)->where('TenantId', $this->tenant->id())->where($key, $data[$field])->exists(), 422, "Invalid $field.");
            }

return;
        }if ($resource === 'lessons') {
            abort_unless(DB::table('Subjects')->where('TenantId', $this->tenant->id())->where('SubjectId', $data['SubjectId'])->exists(), 422, 'Invalid SubjectId.');

            return;
        }if ($resource === 'timetables') {
            $class = DB::table('Classes')->where('TenantId', $this->tenant->id())->where('BranchId', $data['BranchId'])->where('ClassId', $data['ClassId'])->first();
            abort_unless($class, 422, 'Invalid class or branch.');
            abort_unless(DB::table('Subjects')->where('TenantId', $this->tenant->id())->where('SubjectId', $data['SubjectId'])->exists(), 422, 'Invalid subject.');
            if (! empty($data['TeacherId'])) {
                abort_unless(DB::table('Users')->where('TenantId', $this->tenant->id())->where('UserId', $data['TeacherId'])->where('Status', 'Active')->exists(), 422, 'Invalid teacher.');
            }
        }
    }

    private function validateTimetableConflict(array $data, ?int $ignore = null): void
    {
        $overlap = DB::table('TimeTables')->where('TenantId', $this->tenant->id())->where('BranchId', $data['BranchId'])->where('DayOfWeek', $data['DayOfWeek'])->where('StartTime', '<', $data['EndTime'])->where('EndTime', '>', $data['StartTime'])->when($ignore, fn ($q) => $q->where('TimeTableId', '!=', $ignore));
        $conflicts = (clone $overlap)->where('ClassId', $data['ClassId'])->exists();
        if ($conflicts) {
            throw ValidationException::withMessages(['ClassId' => 'This class already has a lesson during the selected time.']);
        }if (! empty($data['TeacherId']) && (clone $overlap)->where('TeacherId', $data['TeacherId'])->exists()) {
            throw ValidationException::withMessages(['TeacherId' => 'This teacher is already assigned during the selected time.']);
        }if (! empty($data['Room']) && (clone $overlap)->where('Room', $data['Room'])->exists()) {
            throw ValidationException::withMessages(['Room' => 'This room is already occupied during the selected time.']);
        }
    }

    private function audit(string $action, string $table, int $id, ?array $before, ?array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $this->tenant->id(), 'UserId' => $this->tenant->user()->UserId, 'Action' => $action, 'EntityType' => $table, 'EntityId' => (string) $id, 'BeforeData' => $before ? json_encode($before) : null, 'AfterData' => $after ? json_encode($after) : null, 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }
}

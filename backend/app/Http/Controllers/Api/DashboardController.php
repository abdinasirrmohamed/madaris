<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class DashboardController extends Controller
{
    public function __invoke(Request $r, TenantContext $tenant)
    {
        $tid = $tenant->id();
        $branch = $r->query('BranchId');
        $scope = fn ($q) => $q->where('TenantId', $tid)->when($branch, fn ($x) => $x->where('BranchId', $branch));
        $permissions = $this->permissions($tenant);
        $all = in_array('*', $permissions, true);
        $can = fn (string ...$keys) => $all || (bool) array_intersect($keys, $permissions);
        $sections = array_values(array_filter([
            $can('students.view', 'students.create', 'students.update') ? 'students' : null,
            $can('academic.manage') ? 'academic' : null,
            $can('attendance.take', 'attendance.correct') ? 'attendance' : null,
            $can('finance.manage', 'accounts.manage') ? 'finance' : null,
            $can('hrm.manage') ? 'hrm' : null,
            $can('quran.manage') ? 'quran' : null,
            $can('examinations.manage') ? 'examinations' : null,
            $can('reports.view') ? 'reports' : null,
            $can('users.manage', 'roles.manage', 'settings.manage') ? 'administration' : null,
        ]));
        $data = [
            'DashboardSections' => $sections,
            'MyRoles' => DB::table('UserRoles')->join('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId')
                ->where('UserRoles.UserId', $tenant->user()->UserId)->pluck('Roles.RoleName')->values(),
            'MyActivity' => DB::table('AuditLogs')->where('TenantId', $tid)->where('UserId', $tenant->user()->UserId)
                ->select('Action', 'EntityType', 'EntityId', 'CreatedAt')->orderByDesc('AuditLogId')->limit(8)->get(),
        ];
        if ($can('students.view', 'students.create', 'students.update', 'students.promote', 'reports.view')) {
            $students = $scope(DB::table('Students'));
            $data += [
                'TotalStudents' => (clone $students)->where('Status', 'Active')->count(),
                'OrphanStudents' => (clone $students)->where('WelfareStatus', 'Orphan')->count(),
                'FreeScholarships' => (clone $students)->where('WelfareStatus', 'Sponsored')->count(),
                'RecentAdmissions' => (clone $students)->orderByDesc('StudentId')->limit(5)->get(),
                'StudentSummaryByClass' => $this->studentSummary($tid, $branch),
            ];
        }
        if ($can('academic.manage', 'students.view', 'reports.view')) {
            $data['TotalClasses'] = $scope(DB::table('Classes'))->where('Status', 'Active')->count();
        }
        if ($can('hrm.manage', 'reports.view')) {
            $data['TotalTeachers'] = $scope(DB::table('Employees'))->where('IsTeacher', true)->where('Status', 'Active')->count();
        }
        if ($can('attendance.take', 'attendance.correct', 'reports.view')) {
            $attendance = $scope(DB::table('Attendance'))->whereDate('AttendanceDate', today());
            $data['PresentToday'] = (clone $attendance)->where('Status', 'Present')->count();
            $data['AbsentToday'] = (clone $attendance)->where('Status', 'Absent')->count();
        }
        if ($can('finance.manage', 'accounts.manage', 'reports.view')) {
            $payments = $scope(DB::table('Payments'))->where('Status', 'Completed');
            $data += [
                'FeesCollectedToday' => (clone $payments)->whereDate('CreatedAt', today())->sum('Amount'),
                'FeesCollectedThisMonth' => (clone $payments)->whereBetween('CreatedAt', [now()->startOfMonth(), now()->endOfMonth()])->sum('Amount'),
                'OutstandingInvoices' => $scope(DB::table('Invoices'))->where('Balance', '>', 0)->sum('Balance'),
                'TotalExpenses' => $scope(DB::table('Expenses'))->where('Status', '!=', 'Draft')->whereBetween('ExpenseDate', [now()->startOfMonth(), now()->endOfMonth()])->sum('Amount'),
                'TotalDiscounts' => DB::table('StudentDiscounts')->where('TenantId', $tid)->where('IsActive', true)->sum('FixedAmount'),
                'RecentPayments' => $scope(DB::table('Payments'))->orderByDesc('PaymentId')->limit(5)->get(),
            ];
        }
        if ($can('quran.manage', 'reports.view')) {
            $data['QuranAssignmentsCompleted'] = $scope(DB::table('QuranAssignments'))->where('Status', 'Completed')->count();
            $data['OverdueQuranAssignments'] = $scope(DB::table('QuranAssignments'))->where('DueDate', '<', today())->whereNotIn('Status', ['Completed', 'Cancelled'])->count();
        }

        return response()->json(['success' => true, 'message' => 'Personal dashboard retrieved.', 'data' => $data, 'meta' => ['filters' => $r->only(['BranchId', 'AcademicYearId', 'ShiftId', 'LevelId', 'ClassId', 'From', 'To'])]]);
    }

    private function permissions(TenantContext $tenant): array
    {
        $direct = $tenant->user()->Permissions ?? [];
        if (in_array('*', $direct, true)) return ['*'];
        $rolePermissions = DB::table('UserRoles')->join('RolePermissions', 'UserRoles.RoleId', '=', 'RolePermissions.RoleId')
            ->join('Permissions', 'RolePermissions.PermissionId', '=', 'Permissions.PermissionId')
            ->where('UserRoles.UserId', $tenant->user()->UserId)->pluck('Permissions.PermissionKey')->all();
        return array_values(array_unique([...$direct, ...$rolePermissions]));
    }

    private function studentSummary(int $tenantId, mixed $branch)
    {
        return DB::table('Enrollments')->join('Classes', 'Enrollments.ClassId', '=', 'Classes.ClassId')
            ->join('Students', 'Enrollments.StudentId', '=', 'Students.StudentId')
            ->where('Enrollments.TenantId', $tenantId)->where('Enrollments.Status', 'Active')->where('Students.Status', 'Active')
            ->when($branch, fn ($q) => $q->where('Enrollments.BranchId', $branch))
            ->groupBy('Classes.ClassId', 'Classes.Name')->orderBy('Classes.Name')
            ->select('Classes.ClassId', 'Classes.Name as ClassName')
            ->selectRaw('COUNT(DISTINCT Students.StudentId) as TotalStudents')
            ->selectRaw("COUNT(DISTINCT CASE WHEN Students.Gender = 'Male' THEN Students.StudentId END) as MaleStudents")
            ->selectRaw("COUNT(DISTINCT CASE WHEN Students.Gender = 'Female' THEN Students.StudentId END) as FemaleStudents")->get();
    }
}

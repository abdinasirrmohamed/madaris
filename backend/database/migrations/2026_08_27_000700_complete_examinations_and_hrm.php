<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('StudentMarks', function (Blueprint $t) {
            $t->unsignedInteger('Version')->default(1);
            $t->unsignedBigInteger('ApprovedByUserId')->nullable();
            $t->timestamp('ApprovedAt')->nullable();
        });
        Schema::create('ExamResultActions', function (Blueprint $t) {
            $t->id('ExamResultActionId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('ExamId')->constrained('Exams', 'ExamId')->cascadeOnDelete();
            $t->string('Action');
            $t->text('Reason')->nullable();
            $t->unsignedBigInteger('RequestedByUserId');
            $t->unsignedBigInteger('ApprovedByUserId')->nullable();
            $t->timestamp('CreatedAt')->useCurrent();
            $t->index(['TenantId', 'ExamId']);
        });
        Schema::create('ExamAttendances', function (Blueprint $t) {
            $t->id('ExamAttendanceId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('ExamId')->constrained('Exams', 'ExamId')->cascadeOnDelete();
            $t->foreignId('StudentId')->constrained('Students', 'StudentId')->cascadeOnDelete();
            $t->string('Status')->default('Present');
            $t->timestamp('CreatedAt')->useCurrent();
            $t->unique(['TenantId', 'ExamId', 'StudentId']);
        });
        Schema::create('EmployeeAttendances', function (Blueprint $t) {
            $t->id('EmployeeAttendanceId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('BranchId')->constrained('Branches', 'BranchId');
            $t->foreignId('EmployeeId')->constrained('Employees', 'EmployeeId')->cascadeOnDelete();
            $t->date('AttendanceDate');
            $t->time('CheckInTime')->nullable();
            $t->time('CheckOutTime')->nullable();
            $t->string('Status')->default('Present');
            $t->timestamp('CreatedAt')->useCurrent();
            $t->unique(['TenantId', 'EmployeeId', 'AttendanceDate']);
        });
        Schema::create('EmployeeDocuments', function (Blueprint $t) {
            $t->id('EmployeeDocumentId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('EmployeeId')->constrained('Employees', 'EmployeeId')->cascadeOnDelete();
            $t->string('DocumentType');
            $t->string('StoragePath');
            $t->string('OriginalName');
            $t->timestamp('CreatedAt')->useCurrent();
        });
        Schema::create('TeacherQualifications', function (Blueprint $t) {
            $t->id('TeacherQualificationId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('TeacherId')->constrained('Teachers', 'TeacherId')->cascadeOnDelete();
            $t->string('Qualification');
            $t->string('Institution')->nullable();
            $t->unsignedSmallInteger('Year')->nullable();
            $t->timestamp('CreatedAt')->useCurrent();
        });
        Schema::create('Payrolls', function (Blueprint $t) {
            $t->id('PayrollId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('BranchId')->constrained('Branches', 'BranchId');
            $t->foreignId('EmployeeId')->constrained('Employees', 'EmployeeId')->cascadeOnDelete();
            $t->unsignedTinyInteger('PayPeriodMonth');
            $t->unsignedSmallInteger('PayPeriodYear');
            $t->decimal('BasicSalary', 12, 2);
            $t->decimal('Allowances', 12, 2)->default(0);
            $t->decimal('Deductions', 12, 2)->default(0);
            $t->decimal('NetSalary', 12, 2);
            $t->string('Status')->default('Pending');
            $t->date('PaidDate')->nullable();
            $t->unsignedBigInteger('AccountId')->nullable();
            $t->timestamp('CreatedAt')->useCurrent();
            $t->unique(['TenantId', 'EmployeeId', 'PayPeriodMonth', 'PayPeriodYear']);
        });
    }

    public function down(): void
    {
        foreach (['Payrolls', 'TeacherQualifications', 'EmployeeDocuments', 'EmployeeAttendances', 'ExamAttendances', 'ExamResultActions'] as $x) {
            Schema::dropIfExists($x);
        }Schema::table('StudentMarks', fn (Blueprint $t) => $t->dropColumn(['Version', 'ApprovedByUserId', 'ApprovedAt']));
    }
};

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveDemoSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(20260828);
        $now = now();
        $tenant = DB::table('Tenants')->where('Slug', 'demo')->first();
        $tenantId = $tenant->TenantId;
        $branchId = DB::table('Branches')->where('TenantId', $tenantId)->value('BranchId');
        $yearId = DB::table('AcademicYears')->where('TenantId', $tenantId)->value('AcademicYearId');
        $adminId = DB::table('Users')->where('TenantId', $tenantId)->value('UserId');

        DB::table('TenantSettings')->where('TenantId', $tenantId)->update([
            'SchoolName' => 'Madaaris Demo School', 'Phone' => '+252 61 555 0100',
            'Email' => 'info@madaaris.local', 'Address' => 'Hodan, Muqdisho, Soomaaliya',
            'DefaultLanguage' => 'so', 'AttendanceLockHours' => 24,
            'AbsenceSmsPolicy' => json_encode(['enabled' => true, 'after' => 1]),
            'QuranGrading' => json_encode(['excellent' => 90, 'good' => 75, 'pass' => 60]),
            'ExamGrading' => json_encode(['A' => 90, 'B' => 80, 'C' => 70, 'D' => 60]),
            'UpdatedAt' => $now,
        ]);

        $levels = [];
        foreach (['Bilowga', 'Dhexe 1', 'Dhexe 2', 'Sare 1', 'Sare 2'] as $i => $name) {
            $levels[] = DB::table('Levels')->insertGetId([
                'TenantId' => $tenantId, 'Name' => $name, 'Code' => 'LVL'.($i + 1),
                'SequenceNo' => $i + 1, 'MinimumPromotionScore' => 50 + $i,
                'Status' => 'Active', 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ], 'LevelId');
        }
        $shifts = [];
        foreach ([['Subax', '07:00', '12:00'], ['Galab', '13:00', '17:30']] as $shift) {
            $shifts[] = DB::table('Shifts')->insertGetId([
                'TenantId' => $tenantId, 'Name' => $shift[0], 'StartTime' => $shift[1],
                'EndTime' => $shift[2], 'Status' => 'Active', 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ], 'ShiftId');
        }
        $classes = [];
        foreach ($levels as $i => $levelId) {
            $classes[] = DB::table('Classes')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'AcademicYearId' => $yearId,
                'LevelId' => $levelId, 'ShiftId' => $shifts[$i % 2], 'Name' => 'Fasalka '.($i + 1),
                'Code' => 'CLS'.($i + 1), 'Capacity' => 30, 'Status' => 'Active',
                'CreatedAt' => $now, 'UpdatedAt' => $now,
            ], 'ClassId');
        }

        $subjects = [];
        foreach ([['Qur\'aan', 'QRN', 'Quran'], ['Carabi', 'ARB', 'Academic'], ['Soomaali', 'SOM', 'Academic'], ['Xisaab', 'MAT', 'Academic'], ['English', 'ENG', 'Academic'], ['Diin', 'ISL', 'Academic']] as $i => $s) {
            $subjectId = DB::table('Subjects')->insertGetId([
                'TenantId' => $tenantId, 'SubjectName' => $s[0], 'SubjectCode' => $s[1],
                'SubjectType' => $s[2], 'MaximumMark' => 100, 'PassMark' => 50, 'IsActive' => true,
            ], 'SubjectId');
            $subjects[] = $subjectId;
            for ($lesson = 1; $lesson <= 3; $lesson++) DB::table('Lessons')->insert([
                'TenantId' => $tenantId, 'SubjectId' => $subjectId,
                'LessonTitle' => $s[0].' - Casharka '.$lesson, 'SortOrder' => $lesson,
            ]);
        }

        $departmentId = DB::table('Departments')->insertGetId(['TenantId' => $tenantId, 'DepartmentName' => 'Waxbarashada'], 'DepartmentId');
        $designationId = DB::table('Designations')->insertGetId(['TenantId' => $tenantId, 'DesignationName' => 'Macallin'], 'DesignationId');
        $employees = [];
        foreach (['Cabdiraxmaan Nuur', 'Maryan Axmed', 'Maxamed Cali', 'Hodan Xasan', 'Yuusuf Aadan', 'Sahra Cabdi', 'Bashiir Warsame', 'Fadumo Maxamed'] as $i => $name) {
            $employees[] = DB::table('Employees')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'EmployeeNo' => sprintf('EMP-%03d', $i + 1),
                'FullName' => $name, 'Gender' => $i % 2 ? 'Female' : 'Male', 'Phone' => '+25261'.sprintf('%07d', 7000000 + $i),
                'Email' => 'employee'.($i + 1).'@madaaris.local', 'DepartmentId' => $departmentId,
                'DesignationId' => $designationId, 'HireDate' => now()->subYears(1 + ($i % 4))->toDateString(),
                'BasicSalary' => 250 + ($i * 25), 'IsTeacher' => $i < 6, 'Status' => 'Active', 'CreatedAt' => $now,
            ], 'EmployeeId');
        }
        foreach ($employees as $i => $employeeId) {
            DB::table('EmployeeAttendances')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'EmployeeId' => $employeeId,
                'AttendanceDate' => now()->toDateString(), 'CheckInTime' => '06:55:00',
                'CheckOutTime' => '12:10:00', 'Status' => $i === 7 ? 'Leave' : 'Present', 'CreatedAt' => $now,
            ]);
            DB::table('Payrolls')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'EmployeeId' => $employeeId,
                'PayPeriodMonth' => now()->month, 'PayPeriodYear' => now()->year,
                'BasicSalary' => 250 + ($i * 25), 'Allowances' => 20, 'Deductions' => $i % 3 === 0 ? 5 : 0,
                'NetSalary' => 270 + ($i * 25) - ($i % 3 === 0 ? 5 : 0), 'Status' => $i < 5 ? 'Paid' : 'Pending',
                'PaidDate' => $i < 5 ? now()->toDateString() : null, 'CreatedAt' => $now,
            ]);
        }

        DB::table('Surahs')->insertOrIgnore([
            ['SurahId' => 1, 'NameArabic' => 'الفاتحة', 'NameEnglish' => 'Al-Fatihah', 'TotalAyahs' => 7, 'JuzNumberStart' => 1],
            ['SurahId' => 2, 'NameArabic' => 'البقرة', 'NameEnglish' => 'Al-Baqarah', 'TotalAyahs' => 286, 'JuzNumberStart' => 1],
            ['SurahId' => 36, 'NameArabic' => 'يس', 'NameEnglish' => 'Ya-Sin', 'TotalAyahs' => 83, 'JuzNumberStart' => 22],
            ['SurahId' => 67, 'NameArabic' => 'الملك', 'NameEnglish' => 'Al-Mulk', 'TotalAyahs' => 30, 'JuzNumberStart' => 29],
            ['SurahId' => 112, 'NameArabic' => 'الإخلاص', 'NameEnglish' => 'Al-Ikhlas', 'TotalAyahs' => 4, 'JuzNumberStart' => 30],
        ]);

        $accountIds = [];
        foreach ([['Cash Box', 'Cash', 'CASH-001', 5000], ['Salaam Bank', 'Bank', 'BANK-001', 12000], ['EVC Plus', 'MobileMoney', 'EVC-001', 3500]] as $a) {
            $accountIds[] = DB::table('Accounts')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'AccountName' => $a[0], 'AccountType' => $a[1],
                'AccountNumber' => $a[2], 'OpeningBalance' => $a[3], 'CurrentBalance' => $a[3], 'IsActive' => true,
            ], 'AccountId');
        }
        $feeTypeId = DB::table('FeeTypes')->insertGetId(['TenantId' => $tenantId, 'FeeTypeName' => 'Monthly Tuition', 'IsActive' => true], 'FeeTypeId');

        $maleFirst = ['Ahmed','Mohamed','Abdullahi','Yusuf','Abdirahman','Hassan','Ali','Omar','Hamza','Ibrahim'];
        $femaleFirst = ['Amina','Hodan','Maryan','Sahra','Fadumo','Hibo','Ikram','Sumaya','Rahma','Nimco'];
        $lastNames = ['Ali','Ahmed','Hassan','Nur','Abdi','Warsame','Mohamed','Omar','Yusuf','Adan'];
        $students = [];
        for ($i = 1; $i <= 50; $i++) {
            $female = $i % 2 === 0;
            $first = ($female ? $femaleFirst : $maleFirst)[($i - 1) % 10];
            $last = $lastNames[($i * 3) % 10];
            $status = $i <= 44 ? 'Active' : ($i <= 47 ? 'Applicant' : ($i <= 49 ? 'Inactive' : 'Graduated'));
            $studentId = DB::table('Students')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'AdmissionNo' => sprintf('ADM-2026-%03d', $i),
                'FirstName' => $first, 'MiddleName' => $lastNames[($i + 2) % 10], 'LastName' => $last,
                'Gender' => $female ? 'Female' : 'Male', 'DateOfBirth' => now()->subYears(7 + ($i % 9))->subDays($i * 7)->toDateString(),
                'Phone' => '+25261'.sprintf('%07d', 1000000 + $i), 'Address' => ['Hodan','Wadajir','Karaan','Yaqshiid','Dharkenley'][$i % 5].', Muqdisho',
                'AdmissionDate' => now()->subMonths($i % 12)->toDateString(),
                'WelfareStatus' => $i % 11 === 0 ? 'Orphan' : ($i % 9 === 0 ? 'Sponsored' : 'Normal'),
                'HealthNotes' => $i % 13 === 0 ? 'Requires regular check-up' : null, 'Status' => $status,
                'CreatedAt' => $now, 'UpdatedAt' => $now,
            ], 'StudentId');
            $students[] = $studentId;
            $guardianId = DB::table('Guardians')->insertGetId([
                'TenantId' => $tenantId, 'FullName' => 'Waalid '.$first.' '.$last, 'Gender' => $female ? 'Male' : 'Female',
                'Relationship' => $i % 4 === 0 ? 'Mother' : 'Father', 'PrimaryPhone' => '+25261'.sprintf('%07d', 2000000 + $i),
                'Email' => 'guardian'.$i.'@example.com', 'Address' => ['Hodan','Wadajir','Karaan'][$i % 3], 'SmsConsent' => true,
            ], 'GuardianId');
            DB::table('StudentGuardians')->insert(['TenantId' => $tenantId, 'StudentId' => $studentId, 'GuardianId' => $guardianId, 'IsPrimary' => true, 'IsFeeResponsible' => true]);
            $classId = $classes[($i - 1) % count($classes)];
            if ($status !== 'Applicant') DB::table('Enrollments')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'StudentId' => $studentId, 'ClassId' => $classId,
                'AcademicYearId' => $yearId, 'EnrolledAt' => now()->subMonths(2)->toDateString(),
                'Status' => $status === 'Active' ? 'Active' : 'Completed', 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ]);
            if ($status === 'Active') for ($d = 0; $d < 5; $d++) DB::table('Attendance')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'StudentId' => $studentId, 'ClassId' => $classId,
                'AttendanceDate' => now()->subDays($d)->toDateString(), 'Session' => 'Daily',
                'Status' => (($i + $d) % 13 === 0) ? 'Absent' : ((($i + $d) % 9 === 0) ? 'Late' : 'Present'),
                'MarkedBy' => $adminId, 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ]);
            $total = [10, 15, 20][($i - 1) % 3];
            $paid = $i <= 30 ? $total : ($i <= 40 ? $total / 2 : 0);
            $invoiceId = DB::table('Invoices')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'StudentId' => $studentId,
                'InvoiceNo' => sprintf('INV-2026-%04d', $i), 'Total' => $total, 'Balance' => $total - $paid,
                'DueDate' => now()->addDays(10 - ($i % 20))->toDateString(),
                'Status' => $paid >= $total ? 'Paid' : ($paid > 0 ? 'PartiallyPaid' : 'Issued'), 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ], 'InvoiceId');
            DB::table('InvoiceItems')->insert(['TenantId' => $tenantId, 'InvoiceId' => $invoiceId, 'FeeTypeId' => $feeTypeId, 'Description' => 'Monthly school fee', 'Amount' => $total]);
            if ($paid > 0) DB::table('Payments')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'StudentId' => $studentId, 'InvoiceId' => $invoiceId,
                'ReceiptNo' => sprintf('RCT-2026-%04d', $i), 'IdempotencyKey' => sprintf('00000000-0000-4000-8000-%012d', $i),
                'Amount' => $paid, 'Method' => ['Cash','Bank','MobileMoney'][$i % 3], 'AccountId' => $accountIds[$i % 3],
                'Status' => 'Completed', 'ReceivedBy' => $adminId, 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ]);
            if ($i % 5 === 0) DB::table('StudentDiscounts')->insert([
                'TenantId' => $tenantId, 'StudentId' => $studentId, 'DiscountType' => 'Percentage', 'Percentage' => 10,
                'Reason' => $i % 10 === 0 ? 'Orphan support' : 'Family discount', 'ApprovedByUserId' => $adminId,
                'StartDate' => now()->startOfMonth()->toDateString(), 'IsActive' => true,
            ]);
            if ($i <= 35) DB::table('QuranAssignments')->insert([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'StudentId' => $studentId, 'TeacherId' => $adminId,
                'LessonType' => $i % 3 === 0 ? 'Revision' : 'New lesson', 'SurahNo' => [1,36,67,112][$i % 4],
                'FromAyah' => 1, 'ToAyah' => $i % 4 === 0 ? 4 : 7, 'AssignedDate' => now()->subDays(3)->toDateString(),
                'DueDate' => now()->addDays(4)->toDateString(), 'RepetitionTarget' => 3,
                'Status' => $i % 6 === 0 ? 'Completed' : 'Assigned', 'Notes' => 'Demo assignment', 'CreatedAt' => $now, 'UpdatedAt' => $now,
            ]);
        }

        $examTypeId = DB::table('ExamTypes')->insertGetId(['TenantId' => $tenantId, 'TypeName' => 'Monthly Test'], 'ExamTypeId');
        foreach (array_slice($classes, 0, 3) as $i => $classId) {
            $examId = DB::table('Exams')->insertGetId([
                'TenantId' => $tenantId, 'BranchId' => $branchId, 'AcademicYearId' => $yearId,
                'ExamTypeId' => $examTypeId, 'ClassId' => $classId, 'SubjectId' => $subjects[$i],
                'ExamTitle' => 'Imtixaanka Billaha '.($i + 1), 'MaximumMark' => 100, 'PassMark' => 50, 'Status' => 'Published',
            ], 'ExamId');
            DB::table('ExamSchedules')->insert(['TenantId' => $tenantId, 'ExamId' => $examId, 'ExamDate' => now()->addDays($i + 2)->toDateString(), 'StartTime' => '08:00', 'EndTime' => '09:30', 'RoomName' => 'Room '.($i + 1)]);
            foreach (array_slice($students, $i * 10, 10) as $j => $studentId) DB::table('StudentMarks')->insert([
                'TenantId' => $tenantId, 'ExamId' => $examId, 'StudentId' => $studentId,
                'MarksObtained' => 45 + (($j * 7 + $i) % 51), 'Grade' => $j > 6 ? 'A' : 'B',
                'Remarks' => 'Demo result', 'EnteredByUserId' => $adminId, 'Status' => 'Published', 'CreatedAt' => $now,
            ]);
        }

        $categoryIds = [];
        foreach (['Utilities','Stationery','Maintenance'] as $name) $categoryIds[] = DB::table('ExpenseCategories')->insertGetId(['TenantId' => $tenantId, 'CategoryName' => $name], 'ExpenseCategoryId');
        foreach ([120, 45, 80, 30, 65] as $i => $amount) DB::table('Expenses')->insert([
            'TenantId' => $tenantId, 'BranchId' => $branchId, 'CategoryId' => $categoryIds[$i % 3], 'AccountId' => $accountIds[0],
            'Amount' => $amount, 'Description' => ['Electricity and water','Books and pens','Classroom repair'][$i % 3],
            'ExpenseDate' => now()->subDays($i * 3)->toDateString(), 'CreatedByUserId' => $adminId, 'Status' => 'Posted',
        ]);
        DB::table('Announcements')->insert(['TenantId' => $tenantId, 'Title' => 'Ku soo dhawaada sanad dugsiyeedka', 'Body' => 'Waxbarashadu waxay bilaabanaysaa waqtigeeda.', 'AudienceType' => 'All', 'PublishedAt' => $now, 'CreatedByUserId' => $adminId]);
        DB::table('Suggestions')->insert(['TenantId' => $tenantId, 'SubmittedByUserId' => $adminId, 'Category' => 'Suggestion', 'Priority' => 'Normal', 'Subject' => 'Maktabadda dugsiga', 'Description' => 'Buugaag dheeraad ah hala keeno.', 'IsAnonymous' => false, 'Status' => 'Open', 'CreatedAt' => $now]);
        DB::table('SmsSettings')->insert(['TenantId' => $tenantId, 'ProviderName' => 'Demo SMS', 'SenderId' => 'MADAARIS', 'IsActive' => false]);
        DB::table('SmsTemplates')->insert(['TenantId' => $tenantId, 'TemplateName' => 'Absence Alert', 'TemplateBody' => 'Waalid, ardayga {student} maanta wuu maqnaa.']);
    }
}

# MADAARIS – Qur’aan School Management System

## 1. Hordhac

Madaaris waa web system loogu talagalay maamulka dugsi Qur’aan. System-ku wuxuu isku xiraa ardayda, waalidiinta, macallimiinta, xifdiga Qur’aanka, imaanshaha, imtixaannada, lacagaha, xisaabaadka, mushaharka, SMS-ka iyo warbixinnada.

System-ku waa **Multi-Tenant**: dugsi kasta wuxuu leeyahay xog, users, branches, settings iyo reports u gaar ah. Xogta dugsi lama arki karo, lama beddeli karo, lamana soo dejisan karo user ka tirsan dugsi kale.

### 1.1 Ujeeddooyinka

- In maamulka dugsigu ka baxo waraaqo iyo Excel kala duwan.
- In la helo hal meel oo laga maamulo dhammaan hawlaha dugsiga.
- In taariikhda ardayga aan la lumin marka la dallacsiiyo ama la beddelo fasalkiisa.
- In lacag kasta yeelato invoice, payment, receipt iyo audit trail.
- In waalidka lagu wargeliyo attendance, lacag, imtixaan iyo horumarka Qur’aanka.
- In xogta dugsi kasta laga ilaaliyo tenants iyo branches kale.

## 2. Technology Stack

| Qaybta | Technology |
|---|---|
| Frontend | Angular, TypeScript, HTML5, CSS3 |
| Backend | PHP 8.3+, Laravel REST API |
| Database | MySQL 8+, InnoDB, utf8mb4 |
| Authentication | Laravel Sanctum |
| Background jobs | Laravel Queue |
| File storage | Local private storage ama S3-compatible storage |
| API format | JSON, versioned under `/api/v1` |
| Naming | SQL tables iyo columns: PascalCase |

Tusaalooyinka SQL naming: `Students`, `StudentId`, `TenantId`, `AdmissionNo`, `CreatedAt`.

## 3. Qaabka guud ee system-ka

```text
Angular Web Application
        |
        | HTTPS / JSON API
        v
Laravel REST API
        |
        +-- Authentication & Permissions
        +-- Tenant & Branch Isolation
        +-- Business Services
        +-- Queue Workers (SMS, exports)
        |
        v
MySQL Database + Private File Storage
```

Frontend-ku si toos ah database uma gelayo. Dhammaan validations, permissions, tenant filtering iyo transactions waxaa fulinaya backend-ka.

## 4. Multi-Tenancy iyo Branches

### 4.1 Tenant

Tenant waa dugsi ama hay’ad madax-bannaan. Dhammaan business tables waa inay leeyihiin `TenantId`, tusaale ahaan:

- `Students.TenantId`
- `Invoices.TenantId`
- `Attendance.TenantId`
- `Employees.TenantId`
- `AuditLogs.TenantId`

### 4.2 Branch

Hal tenant wuxuu yeelan karaa laamo badan. Xogta branch-ku khuseeyo waxay leedahay `BranchId`. User-ka waxaa loo oggolaan karaa hal branch ama dhowr branch.

### 4.3 Xeerarka isolation-ka

1. `TenantId` lagama aqbalayo frontend request-ka; waxaa laga soo saarayaa user-ka authenticated-ka ah.
2. Query kasta waa inuu ku koobnaadaa tenant-ka user-ka.
3. Record route model binding waa inuu tenant scope leeyahay.
4. User-ku wuxuu geli karaa oo keliya branches ku jira `UserBranches`.
5. Unique constraints waa tenant-scoped, tusaale: `TenantId + AdmissionNo`.
6. Upload iyo download documents labaduba tenant scope ayay leeyihiin.
7. Automated tests waa inay caddeeyaan in cross-tenant access uu soo celiyo `404` ama `403`.

## 5. Layout iyo Sidebar

Desktop-ka sidebar-ku wuxuu yaallaa bidix, midabkiisuna waa navy/indigo. Wuxuu yeelanayaa logo-ga dugsiga, magaca system-ka, menus la furi karo, active state, collapsed state iyo Logout. Mobile-ka wuxuu isu beddelayaa drawer.

### 5.1 Sidebar hierarchy

```text
Home

Academic
├── Academic Year
├── Time Table
├── Levels
├── Subjects
├── Lessons
├── Classes
├── Promote Class
├── Graduation
└── Shifts

Students
├── All Students
├── Add Student
├── Graduation
├── Inactive Students
├── Discipline
└── Parents / Guardians

HRM
├── Employees
├── Employee Attendance
├── Attendance Report
├── Teachers
└── Teacher Assignments

Examination
├── Exam Types
├── Add Exam
├── View Exams
├── Manage Exam
├── Mark Sheet
├── Top Students
├── Low-performing Students
├── Exam Schedule
├── ID Card
└── Clearance Card

Attendance
├── Take Attendance
├── View Attendance
├── Exam Attendance
└── Attendance Reports

Islamic Menu
├── Memorization
├── View Memorization
├── Student Memorization Report
├── Student Qur’an Assignment
├── List of Surahs
├── Farbar
├── Subac
├── Dareeris
├── Casharka Qur’aanka
├── Recitation Mistake Types
├── Qur’an Assessments
└── Qur’an Reports

Finance
├── Receive Fee
├── Receipt List
├── Invoices
├── All Charges
├── Single Charge
├── Fee Types
├── Student Discounts
├── Responsible Person Assignment
└── Student Adjustments

Accounts
├── Accounts
├── Account Transfers
├── Deposits
├── Withdrawals
├── Bank Reconciliation
├── Expenses
├── Expense Categories
├── Process Payroll
├── Payroll List
└── Payroll Adjustments

Users
Feedback (Talo iyo Ra’yi)
Reports

Settings
├── Roles & Permissions
├── Profile
├── Announcements
└── Permission/Approval Settings

SMS
├── API Integration
├── Templates
└── Send SMS

Logout
```

Menu item kasta wuxuu leeyahay URL u gaar ah, permission u gaar ah iyo active state. Item uusan user-ku permission u lahayn lama tusayo.

## 6. Dashboard

Dashboard-ku waa bogga ugu horreeya ee login ka dib. Waxaa ku jira tabs ama quick filters: **Overview, Students, Finance, Attendance**.

### 6.1 KPI cards

- Total Students
- Total Classes
- Today Present
- Today Absent
- Orphan Students
- Free/Scholarship Students
- Total Teachers
- Current-month Fee Collection

### 6.2 Charts iyo summaries

- Fee collection 12-kii bilood ee u dambeeyay.
- Income iyo expenses bisha hadda.
- Current month versus previous month.
- Attendance trend.
- Student count by class.
- Outstanding invoices.
- Qur’aan progress summary.

Dashboard data waxaa lagu xaddidayaa tenant, branch, academic year iyo permission-ka user-ka. Cards-ku waa clickable oo waxay furayaan filtered report-ka la xiriira.

## 7. Academic Module

### 7.1 Academic Year

Waxaa lagu kaydiyaa magaca, start/end dates, status iyo current-year flag. Hal tenant wuxuu yeelan karaa hal current academic year markiiba.

### 7.2 Levels, Subjects, Lessons iyo Shifts

- Level-ku wuxuu leeyahay sequence iyo minimum promotion score.
- Subject waxaa lagu xiri karaa level ama class.
- Lesson wuxuu noqon karaa cashar subject ama Qur’aan lesson plan.
- Shift-ku wuxuu leeyahay start/end time.

### 7.3 Classes

Class-ku wuxuu ku xiran yahay branch, academic year, level iyo shift. Wuxuu leeyahay capacity. Enrollment cusub lama oggola marka capacity-ga la gaaro, marka laga reebo user leh override permission; override-ku waa audit event.

### 7.4 Timetable

Timetable-ku wuxuu ka hortagayaa isku dhac teacher, class iyo room isku waqti ah.

### 7.5 Promotion iyo Graduation

Promotion-ku ma overwrite-gareeyo enrollment-kii hore. Enrollment-kii hore wuxuu noqonayaa `Completed`, mid cusubna waa la abuuraa. Promotion log wuxuu hayaa from/to class iyo academic year.

Graduation-ku wuxuu u baahan yahay clearance dhammaystiran: Academic, Qur’aan, Finance, Discipline iyo Assets.

## 8. Student Module

### 8.1 Student registration

Form-ku wuxuu qabtaa:

- Admission number
- First, middle iyo last name
- Gender iyo date of birth
- Phone iyo address
- Admission date
- Branch
- Welfare status: Normal, Orphan, Vulnerable, Sponsored
- Status: Applicant, Active, Inactive, Suspended, Transferred, Graduated
- Health notes iyo photo
- Documents

### 8.2 Guardian/Parent

Guardian waxaa lagu xiri karaa dhowr arday; ardayguna dhowr guardian ayuu yeelan karaa. Waxaa la calaamadin karaa primary guardian, fee-responsible person iyo SMS consent.

### 8.3 Student profile

Profile-ku wuxuu tusayaa:

- Personal details
- Guardians
- Enrollment history
- Attendance summary
- Qur’aan progress
- Invoices iyo payments
- Exam results
- Discipline records
- Documents
- Transfer history
- Clearance iyo graduation certificate

### 8.4 Status iyo transfer

Inactivity ama suspension wuxuu u baahan yahay reason. Transfer wuxuu noqon karaa branch kale ama external school. Current enrollment-ka waxaa loo beddelaa `Transferred`, taariikhdana lama tirtiro.

### 8.5 Discipline

Discipline record wuxuu leeyahay incident date, category, description, action, responsible user, follow-up iyo status. Xogta xasaasiga ah waxaa arki kara roles la oggol yahay oo keliya.

## 9. HRM

- Employee registration iyo employee number.
- Employment type, department, job title iyo basic salary.
- Teacher designation iyo classes/subjects assigned.
- Daily employee attendance.
- Attendance reports iyo lateness/absence filters.
- Payroll preparation, approval, payment iyo adjustments.
- Salary payment waa inuu abuuraa account transaction iyo immutable payroll record.

## 10. Examination

Exam workflow:

```text
Draft → Scheduled → Open for Marks → Published → Closed
```

- Exam types iyo exams.
- Class/subject schedule.
- Mark entry with validation against maximum marks.
- Bulk mark sheet.
- Absent flag iyo remarks.
- Result publication.
- Top iyo low-performing student reports.
- Exam attendance.
- Printable ID card iyo clearance card.

Published result lama beddeli karo ilaa authorized user uu dib u furo; falkaas audit log ayaa laga sameeyaa.

## 11. Attendance

- Class/date roster.
- Status: Present, Absent, Late, Excused.
- Duplicate attendance isla student/date/class lama oggola.
- Teacher-ku wuxuu attendance saxayaa inta lock window-ku furan yahay.
- Ka dib lock window, correction request ayaa la abuuraa.
- Authorized user ayaa approve/reject gareeya correction-ka.
- Original value, requested value, reason iyo approver dhammaantood waa la kaydiyaa.
- Reports: daily, date range, student, class, teacher iyo absence frequency.

## 12. Islamic/Qur’aan Module

### 12.1 Reference data

System-ku wuxuu leeyahay 114 Surah, ayah counts iyo mistake types.

### 12.2 Assignment types

- Farbar
- Subac
- Dareeris
- Revision
- New lesson / Casharka Qur’aanka

Assignment-ku wuxuu leeyahay student, teacher, Surah, from/to ayah, due date, repetition target, notes iyo status.

### 12.3 Assessment

Assessment-ku wuxuu cabbiraa accuracy, fluency iyo tajweed. Outcome: Passed, Needs Revision ama Failed. Khalad kasta waxaa lagu diiwaangeliyaa ayah, mistake type, occurrence count iyo notes.

### 12.4 Reports

- Memorization by student.
- Surah completion.
- Teacher performance.
- Common mistakes.
- Progress over time.
- Students needing revision.

## 13. Finance

### 13.1 Fee workflow

```text
Fee Type/Charge → Invoice → Payment Allocation → Receipt
                         └→ Discount/Adjustment
```

- Invoice wuxuu leeyahay one or more invoice items.
- Partial payment waa la oggol yahay.
- Payment kama badnaan karo invoice balance.
- Request kasta oo payment ah wuxuu leeyahay idempotency key si lacag laba jeer aan loo gelin.
- Receipt number waa unique tenant gudaheeda.
- Refund ama void ma tirtiro payment-kii hore; reversal record ayaa la sameeyaa.
- Discounts iyo adjustments waxay u baahan karaan approval.
- Responsible payer waxaa laga dooran karaa guardians-ka.

## 14. Accounts

Account types: Cash, Bank, Mobile Money, Income, Expense, Receivable iyo Payable.

- Deposits iyo withdrawals.
- Transfer laba account dhexdooda iyadoo transaction database la isticmaalayo.
- Expense iyo category.
- Bank reconciliation against statement balance.
- Ledger transaction kasta wuxuu leeyahay debit iyo credit isu dheellitiran.
- Posted transaction lama edit-gareeyo; reversal ayaa la sameeyaa.
- Payroll posting iyo adjustments.

## 15. Users, Roles iyo Permissions

### 15.1 Roles la soo jeediyay

- Tenant Owner
- School Administrator
- Branch Manager
- Registrar
- Teacher
- Qur’aan Teacher
- Attendance Officer
- Finance Officer
- Accountant
- HR Officer
- Examiner
- Report Viewer

### 15.2 Permission format

Permissions waxaa loo magacaabaa `module.action`, tusaale:

- `students.view`, `students.create`, `students.update`, `students.promote`
- `attendance.take`, `attendance.correct`
- `quran.manage`
- `finance.manage`, `accounts.manage`
- `users.manage`, `roles.manage`
- `reports.view`, `audit.view`, `settings.manage`

Backend-ku permission ayuu xaqiijinayaa request kasta. Frontend-ku wuxuu qarinayaa menu/button-ka aan la oggolayn, laakiin frontend hiding keliya security ma aha.

## 16. Feedback, Reports, Settings iyo SMS

### 16.1 Feedback

User-ku wuxuu gudbin karaa suggestion, complaint, question ama other. Waxaa jira priority, status, assignee, response iyo resolution date. Anonymous feedback waa la taageeraa.

### 16.2 Reports

Reports-ku waxay leeyihiin filters: tenant, authorized branch, academic year, date range, class, student, status iyo teacher. Export formats: CSV/Excel iyo printable PDF. Export weyn waxaa lagu shaqaysiiyaa queue.

### 16.3 Settings

- School name, logo iyo contact.
- Currency, timezone iyo languages: Somali, English, Arabic.
- Number formats: admission, invoice, receipt, certificate.
- Attendance lock hours.
- Current academic year.
- Announcements.
- Approval rules.
- User profile iyo password change.

### 16.4 SMS

- Provider API credentials encrypted at rest.
- Reusable templates.
- Variables sida `{{StudentName}}`, `{{Amount}}`, `{{DueDate}}`.
- Single iyo bulk messages.
- Scheduled delivery.
- Queue retries.
- Delivery status, provider response iyo failure reason.
- SMS waa in loo diraa oo keliya guardian bixiyay consent marka sharcigu sidaas dalbado.

## 17. Database Design Standards

- Tables iyo columns waa PascalCase.
- Primary key: singular table name + `Id`, tusaale `StudentId`.
- Foreign keys waxay raacaan magaca primary key-ga.
- Monetary values: `DECIMAL(14,2)`, waligood `FLOAT` ma aha.
- Timestamps: `CreatedAt`, `UpdatedAt`; soft delete: `DeletedAt`.
- Character set: `utf8mb4`.
- Engine: InnoDB.
- Foreign keys, indexes iyo composite unique constraints waa qasab.
- Historical financial/enrollment/audit records cascade-delete looma adeegsan karo haddii ay baabi’inayaan taariikh sharciyeed.

### 17.1 Core tables

`Tenants`, `TenantSettings`, `Branches`, `Users`, `Roles`, `Permissions`, `UserRoles`, `RolePermissions`, `UserBranches`, `AcademicYears`, `Levels`, `Subjects`, `Lessons`, `Shifts`, `Classes`, `Timetables`, `Students`, `Guardians`, `StudentGuardians`, `Enrollments`, `PromotionLogs`, `StudentDocuments`, `StudentTransfers`, `StudentClearances`, `Graduations`, `Attendance`, `AttendanceCorrections`, `QuranAssignments`, `QuranAssessments`, `RecitationMistakes`, `ExamTypes`, `Exams`, `ExamSchedules`, `ExamMarks`, `Employees`, `EmployeeAttendances`, `TeacherAssignments`, `Payrolls`, `FeeTypes`, `Invoices`, `InvoiceItems`, `Payments`, `PaymentReversals`, `Accounts`, `LedgerTransactions`, `LedgerEntries`, `Expenses`, `AccountTransfers`, `SmsTemplates`, `SmsSettings`, `SmsLogs`, `Suggestions`, `Announcements`, `AuditLogs`.

## 18. API Standards

Successful response:

```json
{
  "success": true,
  "message": "Student created.",
  "data": {},
  "meta": {}
}
```

Validation error uses HTTP `422`; unauthenticated `401`; forbidden `403`; inaccessible/not found `404`; conflict `409`. API-ga waxaa lagu version-gareeyaa `/api/v1`.

List endpoints waxay taageeraan pagination, search, filtering iyo sort. Inputs waxaa lagu validate-gareeyaa backend. Error messages-ku waa inay noqdaan kuwo user-ku fahmi karo.

## 19. Security iyo Audit

- HTTPS production-ka waa qasab.
- Passwords waxaa lagu kaydiyaa secure hash.
- Login throttling iyo account status check.
- Password reset, change password iyo logout-all.
- Sensitive configuration encrypted at rest.
- File upload MIME, extension iyo size validation.
- SQL injection waxaa looga hortagaa query builder/ORM parameter binding.
- XSS waxaa looga hortagaa Angular escaping iyo output sanitization.
- CSRF/CORS/Sanctum configuration waa environment-specific.
- Audit log wuxuu qabtaa user, tenant, action, entity, before/after data, IP, user agent, request ID iyo timestamp.
- Audit logs user caadi ahi ma beddeli karo ama ma tirtiri karo.

## 20. Non-Functional Requirements

- Responsive desktop, tablet iyo mobile.
- Somali-first, English iyo Arabic-ready; Arabic wuxuu taageeraa RTL.
- Accessibility: keyboard navigation, labels, focus state iyo readable contrast.
- Common API requests target: ka yar 500ms xaalad caadi ah.
- Pagination waa qasab marka data badan jiro.
- Daily encrypted backups iyo restore test joogto ah.
- Queue worker monitoring.
- Structured logs iyo error tracking.
- Production health endpoint.

## 21. Testing Strategy

### Backend

- Unit tests business calculations.
- Feature tests API workflows.
- Tenant iyo branch isolation tests.
- Permission tests.
- Enrollment capacity iyo immutable promotion tests.
- Attendance duplicate/correction tests.
- Balanced ledger iyo payment idempotency tests.
- Exam publication tests.
- SMS queue tests.

### Frontend

- Component tests forms iyo validation.
- Route guard iyo permission visibility tests.
- End-to-end tests: registration, attendance, payment/receipt, Qur’aan assessment, exam marks iyo report export.

## 22. Acceptance Criteria

System-ka waxaa loo arkaa inuu diyaar yahay marka:

1. Tenant A uusan geli karin xogta Tenant B.
2. User-ku arko oo keliya branches iyo menus uu fasax u leeyahay.
3. Student registration, guardian linking iyo enrollment capacity shaqeeyaan.
4. Promotion-ku ilaaliyo enrollment history.
5. Transfer, inactivity, graduation, clearance iyo documents shaqeeyaan.
6. Attendance iyo correction approval audit leeyihiin.
7. Qur’aan assignments, assessments iyo mistake reports shaqeeyaan.
8. Invoice, partial payment, receipt, reversal iyo ledger balance shaqeeyaan.
9. Exams, HRM iyo payroll workflows shaqeeyaan.
10. SMS queue, templates iyo delivery logs shaqeeyaan.
11. Reports tenant/branch scoped yihiin oo la export-gareyn karo.
12. Backend automated tests iyo Angular production build pass yihiin.
13. Backup/restore iyo production deployment la tijaabiyay.

## 23. Marxaladaha hirgelinta

1. Foundation: authentication, tenants, branches, roles iyo audit.
2. Academic iyo complete student lifecycle.
3. Attendance iyo Qur’aan.
4. Finance iyo accounts ledger.
5. Examinations iyo HRM/payroll.
6. SMS, feedback, reports iyo settings.
7. Security review, end-to-end testing, backup iyo deployment.

Qaabkan wuxuu system-ka ka dhigayaa mid la ballaarin karo, la xisaabtami karo, ammaan ah, kuna habboon dugsi Qur’aan leh hal ama dhowr laamood.

import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './features/dashboard.component';
import { LoginComponent } from './features/login.component';
import { ShellComponent } from './layout/shell.component';
import { StudentsComponent } from './features/students.component';
import { AcademicComponent } from './features/academic.component';
import { StudentProfileComponent } from './features/student-profile.component';
import { AttendanceComponent } from './features/attendance.component';
import { QuranComponent } from './features/quran.component';
import { FinanceComponent } from './features/finance.component';
import { ExaminationsComponent } from './features/examinations.component';
import { HrmComponent } from './features/hrm.component';
import { SystemComponent } from './features/system.component';
import { UsersComponent } from './features/users.component';
import { StudentOperationsComponent } from './features/student-operations.component';
import { permissionGuard } from './core/auth/guards/permission.guard';
import { Permissions } from './core/permissions/permissions.constants';
import { PlatformComponent } from './features/platform.component';
import { platformGuard } from './core/platform.guard';
import { ParentPortalComponent } from './features/parent-portal.component';
import { SmsManagementComponent } from './features/sms-management.component';
import { ClassPromotionsComponent } from './features/class-promotions.component';
import { AcademicGraduationsComponent } from './features/academic-graduations.component';
import { BranchManagementComponent } from './features/branch-management.component';
import { AccountOperationsComponent } from './features/account-operations.component';
import { ClearanceCardsComponent } from './features/clearance-cards.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'parent', component: ParentPortalComponent, canActivate: [authGuard] },
  { path: 'platform', component: PlatformComponent, canActivate: [authGuard, platformGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'students',
        component: StudentsComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.StudentsView },
      },
      {
        path: 'students/inactive',
        component: StudentOperationsComponent,
        canActivate: [permissionGuard],
        data: { operation: 'inactive', permission: Permissions.StudentsView },
      },
      {
        path: 'students/discipline',
        component: StudentOperationsComponent,
        canActivate: [permissionGuard],
        data: { operation: 'discipline', permission: Permissions.StudentsUpdate },
      },
      {
        path: 'students/guardians',
        component: StudentOperationsComponent,
        canActivate: [permissionGuard],
        data: { operation: 'guardians', permission: Permissions.StudentsView },
      },
      {
        path: 'students/new',
        component: StudentsComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.StudentsCreate, openCreate: true },
      },
      {
        path: 'students/graduation',
        component: AcademicGraduationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.StudentsView,
          section: 'STUDENTS',
          title: 'Student Graduation',
          description: 'Review and approve students who are ready to graduate.',
          icon: '♙',
          backRoute: '/students',
        },
      },
      {
        path: 'students/:id',
        component: StudentProfileComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.StudentsView },
      },
      {
        path: 'academic',
        component: AcademicComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.AcademicManage },
      },
      {
        path: 'academic/promotions',
        component: ClassPromotionsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AcademicManage,
        },
      },
      {
        path: 'academic/graduations',
        component: AcademicGraduationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AcademicManage,
        },
      },
      {
        path: 'academic/:resource',
        component: AcademicComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.AcademicManage },
      },
      {
        path: 'attendance',
        component: AttendanceComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.AttendanceTake },
      },
      {
        path: 'attendance/:view',
        component: AttendanceComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.AttendanceTake },
      },
      {
        path: 'quran',
        component: QuranComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.QuranManage },
      },
      {
        path: 'quran/:view',
        component: QuranComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.QuranManage },
      },
      {
        path: 'finance',
        component: FinanceComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.FinanceManage },
      },
      {
        path: 'finance/:view',
        component: FinanceComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.FinanceManage },
      },
      {
        path: 'accounts/transfers',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Account Transfers',
          description: 'Move funds between school financial accounts.',
          icon: '⇄',
          backRoute: '/finance/accounts',
        },
      },
      {
        path: 'accounts/deposits',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Account Deposits',
          description: 'Record deposits made into school accounts.',
          icon: '↓',
          backRoute: '/finance/accounts',
        },
      },
      {
        path: 'accounts/withdrawals',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Account Withdrawals',
          description: 'Record controlled withdrawals from school accounts.',
          icon: '↑',
          backRoute: '/finance/accounts',
        },
      },
      {
        path: 'accounts/reconciliation',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Bank Reconciliation',
          description: 'Compare account activity with bank records.',
          icon: '✓',
          backRoute: '/finance/accounts',
        },
      },
      {
        path: 'accounts/expense-categories',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Expense Categories',
          description: 'Manage the categories used to classify expenses.',
          icon: '▤',
          backRoute: '/finance/expenses',
        },
      },
      {
        path: 'accounts/payroll-setup',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Payroll Setup',
          description: 'Configure payroll rules, periods and employee salaries.',
          icon: '$',
          backRoute: '/hrm/payroll',
        },
      },
      {
        path: 'accounts/payroll-adjustments',
        component: AccountOperationsComponent,
        canActivate: [permissionGuard],
        data: {
          permission: Permissions.AccountsManage,
          section: 'ACCOUNTS',
          title: 'Payroll Adjustments',
          description: 'Manage payroll allowances and deductions separately.',
          icon: '±',
          backRoute: '/hrm/payroll',
        },
      },
      {
        path: 'examinations',
        component: ExaminationsComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.ExaminationsManage },
      },
      {
        path: 'examinations/clearance-cards',
        component: ClearanceCardsComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.ExaminationsManage },
      },
      {
        path: 'examinations/:view',
        component: ExaminationsComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.ExaminationsManage },
      },
      {
        path: 'hrm',
        component: HrmComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.HrmManage },
      },
      {
        path: 'hrm/:view',
        component: HrmComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.HrmManage },
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.UsersManage },
      },
      {
        path: 'reports',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'reports', permission: Permissions.ReportsView },
      },
      {
        path: 'roles-permissions',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'roles', permission: Permissions.RolesManage },
      },
      {
        path: 'permissions',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'roles', permission: Permissions.RolesManage },
      },
      {
        path: 'settings/announcements',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'settings', permission: Permissions.SettingsManage },
      },
      {
        path: 'settings/fee-permissions',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'settings', permission: Permissions.SettingsManage },
      },
      {
        path: 'settings/system',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'settings', permission: Permissions.SettingsManage },
      },
      {
        path: 'settings/branches',
        component: BranchManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SettingsManage },
      },
      {
        path: 'settings',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'settings', permission: Permissions.SettingsManage },
      },
      { path: 'sms', pathMatch: 'full', redirectTo: 'sms/dashboard' },
      {
        path: 'sms/dashboard',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsViewDashboard, smsView: 'dashboard' },
      },
      {
        path: 'sms/send',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsSendIndividual, smsView: 'send' },
      },
      {
        path: 'sms/bulk-fee-reminder',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsSendBulk, smsView: 'bulk-fee-reminder' },
      },
      {
        path: 'sms/templates',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsManageTemplates, smsView: 'templates' },
      },
      {
        path: 'sms/scheduled-sms',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsManageSchedules, smsView: 'scheduled-sms' },
      },
      {
        path: 'sms/history',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsViewHistory, smsView: 'history' },
      },
      {
        path: 'sms/settings',
        component: SmsManagementComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.SmsManageSettings, smsView: 'settings' },
      },
      { path: 'feedback', component: SystemComponent, data: { initialTab: 'feedback' } },
      {
        path: 'audit',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'audit', permission: Permissions.AuditView },
      },
      { path: 'system', pathMatch: 'full', redirectTo: 'settings' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];

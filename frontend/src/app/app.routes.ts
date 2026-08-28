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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
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
        path: 'attendance',
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
        path: 'finance',
        component: FinanceComponent,
        canActivate: [permissionGuard],
        data: { permission: Permissions.FinanceManage },
      },
      {
        path: 'examinations',
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
        path: 'settings',
        component: SystemComponent,
        canActivate: [permissionGuard],
        data: { initialTab: 'settings', permission: Permissions.SettingsManage },
      },
      { path: 'sms', component: SystemComponent, data: { initialTab: 'sms' } },
      { path: 'feedback', component: SystemComponent, data: { initialTab: 'feedback' } },
      { path: 'audit', component: SystemComponent, data: { initialTab: 'audit' } },
      { path: 'system', pathMatch: 'full', redirectTo: 'settings' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];

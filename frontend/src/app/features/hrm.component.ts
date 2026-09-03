import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `<header class="page">
      <div>
        <p>HUMAN RESOURCES</p>
        <h1>HRM</h1>
        <span>Employees, teachers, attendance and payroll.</span>
      </div>
      @if (tab() === 'employees' || tab() === 'teachers' || tab() === 'teacher-assignments' || tab() === 'payroll') {
        <button (click)="openDrawer()">＋ {{ tab() === 'employees' ? 'Add employee' : tab() === 'teachers' ? 'Add teacher' : tab() === 'teacher-assignments' ? 'Assign teacher' : 'Prepare payroll' }}</button>
      }
    </header>
    <nav>
      <button [class.active]="tab() === 'employees'" (click)="tab.set('employees')">
        Employees</button
      ><button [class.active]="tab() === 'attendance'" (click)="tab.set('attendance')">
        Employee Attendance</button
      ><button [class.active]="tab() === 'attendance-reports'" (click)="selectTab('attendance-reports')">Attendance Reports</button
      ><button [class.active]="tab() === 'teachers'" (click)="tab.set('teachers')">Teachers</button
      ><button [class.active]="tab() === 'teacher-assignments'" (click)="selectTab('teacher-assignments')">Teacher Assignments</button
      ><button [class.active]="tab() === 'payroll'" (click)="tab.set('payroll')">Payroll</button>
    </nav>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    @if (tab() === 'employees') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Number</th>
              <th>Phone</th>
              <th>Job role</th>
              <th>System access</th>
              <th>Shift</th>
              <th>Salary</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (e of employees(); track e.EmployeeId) {
              <tr>
                <td>
                  <b>{{ e.FullName }}</b
                  ><small>{{ e.Email }}</small>
                </td>
                <td>{{ e.EmployeeNo }}</td>
                <td>{{ e.Phone }}</td>
                <td>{{ e.EmploymentRole }}</td>
                <td><span class="access" [class.enabled]="e.UserId">{{ e.UserId ? (e.SystemRole || 'Enabled') : 'Employee only' }}</span></td>
                <td>{{ e.ShiftName || 'Not assigned' }}</td>
                <td>{{ e.BasicSalary | currency: 'USD' }}</td>
                <td>{{ e.Status }}</td>
                <td><div class="actions"><button type="button" class="edit" (click)="editEmployee(e)">Edit</button><button type="button" class="delete" (click)="deleteEmployee(e)">Delete</button></div></td>
              </tr>
            }
          </tbody>
        </table>
        @if (!employees().length) {
          <div class="empty">No employees registered.</div>
        }
      </section>
    }
    @if (tab() === 'attendance') {
      <section class="filters">
        <label>Date<input type="date" [formControl]="attendanceDate" /></label
        ><button (click)="markAll('Present')">All present</button
        ><button (click)="saveAttendance()">Save attendance</button>
      </section>
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Number</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (e of attendanceRows(); track e.EmployeeId) {
              <tr>
                <td>{{ e.FullName }}</td>
                <td>{{ e.EmployeeNo }}</td>
                <td>
                  <select
                    [value]="e.AttendanceStatus"
                    (change)="setAttendance(e.EmployeeId, $event)"
                  >
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Late</option>
                    <option>Leave</option>
                    <option>Sick</option>
                    <option>Holiday</option>
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    @if (tab() === 'attendance-reports') {
      <section class="filters">
        <label>Report date<input type="date" [formControl]="reportDate" /></label>
        <button (click)="loadAttendanceReport()">Apply filter</button>
      </section>
      <section class="card">
        <table><thead><tr><th>Date</th><th>Employee</th><th>Number</th><th>Status</th></tr></thead>
          <tbody>@for (row of filteredAttendanceHistory(); track row.EmployeeAttendanceId) {
            <tr><td>{{ row.AttendanceDate }}</td><td><b>{{ row.FullName }}</b></td><td>{{ row.EmployeeNo }}</td><td><span class="status">{{ row.Status }}</span></td></tr>
          }</tbody>
        </table>
        @if (!filteredAttendanceHistory().length) { <div class="empty">No attendance records found for this date.</div> }
      </section>
    }
    @if (tab() === 'teachers') {
      <section class="card">
        <table><thead><tr><th>Teacher</th><th>Employee number</th><th>Shift</th><th>Salary</th><th>Phone</th><th>User access</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>@for (teacher of teachers(); track teacher.EmployeeId) {
            <tr><td><b>{{ teacher.FullName }}</b><small>{{ teacher.Email }}</small></td><td>{{ teacher.EmployeeNo }}</td><td>{{ teacher.ShiftName || 'Not assigned' }}</td><td>{{ teacher.BasicSalary | currency: 'USD' }}</td><td>{{ teacher.Phone }}</td><td><span class="access" [class.enabled]="teacher.UserId">{{ teacher.UserId ? 'Enabled' : 'Not created' }}</span></td><td>{{ teacher.Status }}</td><td><div class="actions"><button type="button" class="edit" (click)="editEmployee(teacher)">Edit</button><button type="button" class="delete" (click)="deleteEmployee(teacher)">Delete</button></div></td></tr>
          }</tbody>
        </table>
        @if (!teachers().length) { <div class="empty">No teachers registered.</div> }
      </section>
    }
    @if (tab() === 'teacher-assignments') {
      <section class="card">
        <table><thead><tr><th>Teacher</th><th>Class</th><th>Subject</th><th>Academic Year</th><th>Action</th></tr></thead>
          <tbody>@for (assignment of teacherAssignments(); track assignment.TeacherAssignmentId) {
            <tr><td><b>{{ assignment.TeacherName }}</b></td><td>{{ assignment.ClassName }}</td><td>{{ assignment.SubjectName }}</td><td>{{ assignment.YearName }}</td><td><button type="button" class="delete" (click)="deleteTeacherAssignment(assignment)">Delete</button></td></tr>
          }</tbody>
        </table>
        @if (!teacherAssignments().length) { <div class="empty">No teacher assignments registered.</div> }
      </section>
    }
    @if (tab() === 'payroll') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Employee</th>
              <th>Basic</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payroll(); track p.PayrollId) {
              <tr>
                <td>{{ p.PayPeriodMonth }}/{{ p.PayPeriodYear }}</td>
                <td>{{ p.FullName }}</td>
                <td>{{ p.BasicSalary | currency: 'USD' }}</td>
                <td>{{ p.Allowances | currency: 'USD' }}</td>
                <td>{{ p.Deductions | currency: 'USD' }}</td>
                <td>
                  <b>{{ p.NetSalary | currency: 'USD' }}</b>
                </td>
                <td>{{ p.Status }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (!payroll().length) {
          <div class="empty">No payroll periods prepared.</div>
        }
      </section>
    }
    @if (drawer()) {
      <aside class="drawer">
        <header>
          <h2>{{ tab() === 'employees' || tab() === 'teachers' ? (editingEmployeeId() ? 'Edit employee' : tab() === 'teachers' ? 'Add teacher' : 'Add employee') : tab() === 'teacher-assignments' ? 'Assign teacher' : 'Prepare payroll' }}</h2>
          <button (click)="closeDrawer()">×</button>
        </header>
        @if (tab() === 'employees' || tab() === 'teachers') {
          <form [formGroup]="employeeForm" (ngSubmit)="saveEmployee()">
            <label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            >
            <div class="pair">
              <label>Employee number<input formControlName="EmployeeNo" /></label
              ><label>Full name<input formControlName="FullName" /></label>
            </div>
            <div class="pair">
              <label
                >Gender<select formControlName="Gender">
                  <option>Male</option>
                  <option>Female</option>
                </select></label
              ><label>Phone<input formControlName="Phone" /></label>
            </div>
            <label>Email<input type="email" formControlName="Email" /></label>
            <label>Job role<select formControlName="EmploymentRole" (change)="syncEmployeeRole()"><option>Teacher</option><option>Finance Officer</option><option>Examiner</option><option>Report Viewer</option><option>HR Officer</option><option>Registrar</option><option>Staff</option></select></label>
            <div class="pair">
              <label>Hire date<input type="date" formControlName="HireDate" /></label
              ><label>Basic salary<input type="number" formControlName="BasicSalary" /></label>
            </div>
            <label class="check"
              ><input type="checkbox" formControlName="IsTeacher" /> This employee is a teacher</label
            >
            @if (employeeForm.controls.IsTeacher.value) {
              <label>Teacher shift<select formControlName="ShiftId"><option value="">Select shift</option>@for (shift of shifts(); track shift.ShiftId) {<option [value]="shift.ShiftId">{{ shift.Name }} ({{ shift.StartTime }} - {{ shift.EndTime }})</option>}</select></label>
            }
            @if (!editingEmployeeId() || !employeeForm.controls.HasUser.value) {
              <section class="user-access">
                <label class="check"><input type="checkbox" formControlName="CreateUser" /> Give this employee system access</label>
                <p>The employee can be saved without a login. Enable this only when they need to use the system.</p>
                @if (employeeForm.controls.CreateUser.value) {
                  <div class="pair"><label>System role<select formControlName="SystemRole"><option>Teacher</option><option>Finance Officer</option><option>Examiner</option><option>Report Viewer</option><option>HR Officer</option><option>Registrar</option></select></label><label>Temporary password<input type="password" formControlName="Password" minlength="8" /></label></div>
                  <small class="hint">The user must change this password after signing in.</small>
                }
              </section>
            } @else {
              <div class="linked-user">✓ System account linked: {{ employeeForm.controls.Email.value }}</div>
            }
            <label
              >Status<select formControlName="Status">
                <option>Active</option>
                <option>Inactive</option>
                <option>Suspended</option>
                <option>Terminated</option>
              </select></label
            ><button class="primary">{{ editingEmployeeId() ? 'Update employee' : 'Save employee' }}</button>
          </form>
        } @else if (tab() === 'teacher-assignments') {
          <form [formGroup]="teacherAssignmentForm" (ngSubmit)="saveTeacherAssignment()">
            <label>Teacher<select formControlName="EmployeeId" (change)="syncAssignmentClass()">@for (teacher of assignmentTeachers(); track teacher.EmployeeId) {<option [value]="teacher.EmployeeId">{{ teacher.FullName }}</option>}</select></label>
            <label>Academic Year<select formControlName="AcademicYearId" (change)="syncAssignmentClass()">@for (year of assignmentYears(); track year.AcademicYearId) {<option [value]="year.AcademicYearId">{{ year.Name }}</option>}</select></label>
            <label>Class<select formControlName="ClassId">@for (classRow of availableAssignmentClasses(); track classRow.ClassId) {<option [value]="classRow.ClassId">{{ classRow.Name }}</option>}</select></label>
            <label>Subject<select formControlName="SubjectId">@for (subject of assignmentSubjects(); track subject.SubjectId) {<option [value]="subject.SubjectId">{{ subject.SubjectName }}</option>}</select></label>
            <button class="primary">Save assignment</button>
          </form>
        } @else {
          <form [formGroup]="payrollForm" (ngSubmit)="savePayroll()">
            <label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            ><label
              >Employee<select formControlName="EmployeeId">
                @for (e of employees(); track e.EmployeeId) {
                  <option [value]="e.EmployeeId">{{ e.FullName }}</option>
                }
              </select></label
            >
            <div class="pair">
              <label
                >Month<input
                  type="number"
                  min="1"
                  max="12"
                  formControlName="PayPeriodMonth" /></label
              ><label>Year<input type="number" formControlName="PayPeriodYear" /></label>
            </div>
            <div class="pair">
              <label>Allowances<input type="number" formControlName="Allowances" /></label
              ><label>Deductions<input type="number" formControlName="Deductions" /></label>
            </div>
            <button class="primary">Prepare payroll</button>
          </form>
        }
      </aside>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .page {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .page p {
        margin: 0;
        color: #15549c;
        font-size: 10px;
        font-weight: 800;
      }
      .page h1 {
        margin: 5px 0;
      }
      .page span {
        color: #748391;
        font-size: 12px;
      }
      .page > button,
      .primary,
      .filters button {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 11px 15px;
      }
      nav {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 6px;
        margin: 18px 0 10px;
      }
      nav button {
        border: 0;
        background: none;
        padding: 9px 14px;
        color: #687887;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .filters {
        display: flex;
        justify-content: flex-end;
        align-items: end;
        gap: 8px;
        background: white;
        padding: 10px;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      .filters label {
        display: grid;
        gap: 4px;
        font-size: 9px;
      }
      .filters input {
        padding: 8px;
      }
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
        min-height: 350px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #edf1f4;
        font-size: 10px;
      }
      th {
        font-size: 8px;
        color: #748391;
        background: #f8fafc;
      }
      td small {
        display: block;
        color: #7a8792;
      }
      td select {
        padding: 7px;
        border: 1px solid #d6e0e8;
        border-radius: 6px;
      }
      .empty {
        height: 280px;
        display: grid;
        place-items: center;
        color: #758392;
      }
      .empty b,.empty span { display:block; text-align:center; margin:4px; }
      .status { display:inline-block; padding:5px 9px; border-radius:12px; background:#e5f7ef; color:#147a54; font-weight:700; }
      .drawer {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: min(500px, 100%);
        background: white;
        z-index: 20;
        box-shadow: -10px 0 30px #17324c2d;
        overflow: auto;
      }
      .drawer header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      .drawer header button {
        border: 0;
        background: none;
        font-size: 25px;
      }
      .drawer form {
        padding: 20px;
      }
      .drawer label {
        display: grid;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        margin: 12px 0;
      }
      .drawer input,
      .drawer select {
        padding: 10px;
        border: 1px solid #d6e0e8;
        border-radius: 7px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .check {
        display: flex !important;
        align-items: center;
        gap: 8px !important;
      }
      .user-access { margin:16px 0; padding:14px; border:1px solid #dce6f1; border-radius:9px; background:#f7faff; }
      .user-access p { margin:-5px 0 10px; color:#6c7a8d; font-size:9px; line-height:1.5; }
      .hint { display:block; color:#17735f; margin-top:5px; }
      .linked-user { margin:14px 0; padding:11px; border-radius:8px; background:#e7f7f1; color:#147a54; font-size:10px; font-weight:700; }
      .access { display:inline-block; padding:5px 8px; border-radius:12px; background:#f1f3f7; color:#667085; font-weight:700; white-space:nowrap; }
      .access.enabled { background:#e5f7ef; color:#147a54; }
      .actions { display:flex; gap:6px; }
      .primary {
        width: 100%;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      .edit {
        border: 1px solid #211e75;
        border-radius: 6px;
        background: white;
        color: #211e75;
        padding: 6px 10px;
      }
      .delete {
        border: 1px solid #c83b3b;
        border-radius: 6px;
        background: white;
        color: #b42323;
        padding: 6px 10px;
      }
      @media (max-width: 700px) {
        .drawer {
          top: 0;
        }
        .pair {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HrmComponent implements OnInit {
  private dialog = inject(DialogService);
  tab = signal('employees');
  drawer = signal(false);
  editingEmployeeId = signal<number | null>(null);
  message = signal('');
  employees = signal<any[]>([]);
  payroll = signal<any[]>([]);
  branches = signal<any[]>([]);
  shifts = signal<any[]>([]);
  teacherAssignments = signal<any[]>([]);
  assignmentTeachers = signal<any[]>([]);
  assignmentClasses = signal<any[]>([]);
  assignmentSubjects = signal<any[]>([]);
  assignmentYears = signal<any[]>([]);
  attendanceRows = signal<any[]>([]);
  attendanceHistory = signal<any[]>([]);
  today = new Date().toISOString().slice(0, 10);
  attendanceDate = new FormControl(this.today);
  reportDate = new FormControl('');
  employeeForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    ShiftId: new FormControl<any>(''),
    EmployeeNo: new FormControl(''),
    FullName: new FormControl(''),
    Gender: new FormControl('Male'),
    Phone: new FormControl(''),
    Email: new FormControl(''),
    HireDate: new FormControl(this.today),
    BasicSalary: new FormControl(0),
    IsTeacher: new FormControl(false),
    EmploymentRole: new FormControl('Staff'),
    CreateUser: new FormControl(false),
    HasUser: new FormControl(false),
    SystemRole: new FormControl('Report Viewer'),
    Password: new FormControl(''),
    Status: new FormControl('Active'),
  });
  payrollForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    EmployeeId: new FormControl<any>(''),
    PayPeriodMonth: new FormControl(new Date().getMonth() + 1),
    PayPeriodYear: new FormControl(new Date().getFullYear()),
    Allowances: new FormControl(0),
    Deductions: new FormControl(0),
  });
  teacherAssignmentForm = new FormGroup({
    EmployeeId: new FormControl<any>(''),
    ClassId: new FormControl<any>(''),
    SubjectId: new FormControl<any>(''),
    AcademicYearId: new FormControl<any>(''),
  });
  constructor(private api: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const view = params.get('view');
      const views = ['employees', 'attendance', 'attendance-reports', 'teachers', 'teacher-assignments', 'payroll'];
      this.tab.set(views.includes(view || '') ? view! : 'employees');
      if (view === 'attendance-reports') this.loadAttendanceReport();
    });
    this.load();
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      this.employeeForm.patchValue({ BranchId: r.data[0]?.BranchId });
      this.payrollForm.patchValue({ BranchId: r.data[0]?.BranchId });
    });
    this.api.get<any>('/hrm/shifts').subscribe((r) => {
      this.shifts.set(r.data.filter((shift: any) => shift.Status === 'Active'));
    });
    this.loadTeacherAssignments();
  }
  load() {
    this.api.get<any>('/hrm/employees').subscribe((r) => {
      this.employees.set(r.data);
      this.attendanceRows.set(r.data.map((e: any) => ({ ...e, AttendanceStatus: 'Present' })));
    });
    this.api.get<any>('/hrm/payroll').subscribe((r) => this.payroll.set(r.data));
  }
  selectTab(tab: string) {
    this.tab.set(tab);
    if (tab === 'attendance-reports') this.loadAttendanceReport();
    if (tab === 'teacher-assignments') this.loadTeacherAssignments();
  }
  loadTeacherAssignments() {
    this.api.get<any>('/hrm/teacher-assignments').subscribe((r) => this.teacherAssignments.set(r.data));
    this.api.get<any>('/hrm/teacher-assignment-options').subscribe((r) => {
      this.assignmentTeachers.set(r.data.teachers);
      this.assignmentClasses.set(r.data.classes);
      this.assignmentSubjects.set(r.data.subjects);
      this.assignmentYears.set(r.data.academicYears);
      this.resetTeacherAssignmentForm();
    });
  }
  teachers() {
    return this.employees().filter((employee) => !!employee.IsTeacher);
  }
  filteredAttendanceHistory() {
    const date = this.reportDate.value;
    return date ? this.attendanceHistory().filter((row) => String(row.AttendanceDate).slice(0, 10) === date) : this.attendanceHistory();
  }
  loadAttendanceReport() {
    this.api.get<any>('/hrm/attendance').subscribe((response) => this.attendanceHistory.set(response.data));
  }
  saveEmployee() {
    const v: any = this.employeeForm.getRawValue();
    const payload = {
      ...v,
      BranchId: Number(v.BranchId),
      ShiftId: v.IsTeacher && v.ShiftId ? Number(v.ShiftId) : null,
      BasicSalary: Number(v.BasicSalary),
    };
    const request = this.editingEmployeeId()
      ? this.api.put<any>(`/hrm/employees/${this.editingEmployeeId()}`, payload)
      : this.api.post<any>('/hrm/employees', payload);
    request.subscribe((r) => this.done(r));
  }
  editEmployee(employee: any) {
    this.editingEmployeeId.set(employee.EmployeeId);
    this.employeeForm.reset({
      BranchId: employee.BranchId,
      ShiftId: employee.ShiftId ?? '',
      EmployeeNo: employee.EmployeeNo,
      FullName: employee.FullName,
      Gender: employee.Gender ?? 'Male',
      Phone: employee.Phone ?? '',
      Email: employee.Email ?? '',
      HireDate: String(employee.HireDate ?? this.today).slice(0, 10),
      BasicSalary: Number(employee.BasicSalary),
      IsTeacher: !!employee.IsTeacher,
      EmploymentRole: employee.EmploymentRole || (employee.IsTeacher ? 'Teacher' : 'Staff'),
      CreateUser: false,
      HasUser: !!employee.UserId,
      SystemRole: employee.SystemRole || this.systemRoleFor(employee.EmploymentRole),
      Password: '',
      Status: employee.Status,
    });
    this.drawer.set(true);
  }
  openDrawer() {
    this.editingEmployeeId.set(null);
    if (this.tab() === 'employees' || this.tab() === 'teachers') this.resetEmployeeForm(this.tab() === 'teachers');
    if (this.tab() === 'teacher-assignments') this.resetTeacherAssignmentForm();
    this.drawer.set(true);
  }
  closeDrawer() {
    this.drawer.set(false);
    this.editingEmployeeId.set(null);
    if (this.tab() === 'employees' || this.tab() === 'teachers') this.resetEmployeeForm(this.tab() === 'teachers');
  }
  private resetEmployeeForm(asTeacher = false) {
    this.employeeForm.reset({
      BranchId: this.branches()[0]?.BranchId ?? '',
      ShiftId: '',
      EmployeeNo: '',
      FullName: '',
      Gender: 'Male',
      Phone: '',
      Email: '',
      HireDate: this.today,
      BasicSalary: 0,
      IsTeacher: asTeacher,
      EmploymentRole: asTeacher ? 'Teacher' : 'Staff',
      CreateUser: false,
      HasUser: false,
      SystemRole: asTeacher ? 'Teacher' : 'Report Viewer',
      Password: '',
      Status: 'Active',
    });
  }
  syncEmployeeRole() {
    const role = this.employeeForm.controls.EmploymentRole.value || 'Staff';
    this.employeeForm.patchValue({ IsTeacher: role === 'Teacher', SystemRole: this.systemRoleFor(role) });
  }
  private systemRoleFor(role: string | null) {
    return ['Teacher', 'Finance Officer', 'Examiner', 'Report Viewer', 'HR Officer', 'Registrar'].includes(role || '') ? role! : 'Report Viewer';
  }
  async deleteEmployee(employee: any) {
    if (!await this.dialog.confirm('Delete employee', `Delete ${employee.FullName}? Their linked user and teacher assignments will also be removed.`, true)) return;
    this.api.delete<any>(`/hrm/employees/${employee.EmployeeId}`).subscribe((r) => {
      this.message.set(r.message);
      this.load();
      this.loadTeacherAssignments();
    });
  }
  private resetTeacherAssignmentForm() {
    const EmployeeId = this.assignmentTeachers()[0]?.EmployeeId ?? '';
    const AcademicYearId = this.assignmentYears().find((year: any) => year.Status === 'Active')?.AcademicYearId ?? this.assignmentYears()[0]?.AcademicYearId ?? '';
    this.teacherAssignmentForm.reset({
      EmployeeId,
      ClassId: '',
      SubjectId: this.assignmentSubjects()[0]?.SubjectId ?? '',
      AcademicYearId,
    });
    this.syncAssignmentClass();
  }
  availableAssignmentClasses() {
    const teacher = this.assignmentTeachers().find((row: any) => Number(row.EmployeeId) === Number(this.teacherAssignmentForm.controls.EmployeeId.value));
    const yearId = Number(this.teacherAssignmentForm.controls.AcademicYearId.value);
    return this.assignmentClasses().filter((row: any) => Number(row.BranchId) === Number(teacher?.BranchId) && Number(row.AcademicYearId) === yearId);
  }
  syncAssignmentClass() {
    const classes = this.availableAssignmentClasses();
    const selected = Number(this.teacherAssignmentForm.controls.ClassId.value);
    if (!classes.some((row: any) => Number(row.ClassId) === selected)) this.teacherAssignmentForm.patchValue({ ClassId: classes[0]?.ClassId ?? '' });
  }
  saveTeacherAssignment() {
    const v: any = this.teacherAssignmentForm.getRawValue();
    const payload = Object.fromEntries(Object.entries(v).map(([key, value]) => [key, Number(value)]));
    this.api.post<any>('/hrm/teacher-assignments', payload).subscribe((r) => {
      this.message.set(r.message);
      this.closeDrawer();
      this.loadTeacherAssignments();
    });
  }
  async deleteTeacherAssignment(assignment: any) {
    if (!await this.dialog.confirm('Tirtir waajibaadka', 'Ma tirtirtaa waajibaadkan macallinka?', true)) return;
    this.api.delete<any>(`/hrm/teacher-assignments/${assignment.TeacherAssignmentId}`).subscribe((r) => {
      this.message.set(r.message);
      this.loadTeacherAssignments();
    });
  }
  setAttendance(id: number, e: Event) {
    this.attendanceRows.update((rows) =>
      rows.map((x) =>
        x.EmployeeId === id ? { ...x, AttendanceStatus: (e.target as HTMLSelectElement).value } : x,
      ),
    );
  }
  markAll(s: string) {
    this.attendanceRows.update((rows) => rows.map((x) => ({ ...x, AttendanceStatus: s })));
  }
  saveAttendance() {
    this.api
      .post<any>('/hrm/attendance', {
        BranchId: this.branches()[0]?.BranchId,
        AttendanceDate: this.attendanceDate.value,
        Records: this.attendanceRows().map((x) => ({
          EmployeeId: x.EmployeeId,
          Status: x.AttendanceStatus,
        })),
      })
      .subscribe((r) => this.done(r));
  }
  savePayroll() {
    const v: any = this.payrollForm.getRawValue();
    for (const k of [
      'BranchId',
      'EmployeeId',
      'PayPeriodMonth',
      'PayPeriodYear',
      'Allowances',
      'Deductions',
    ])
      v[k] = Number(v[k]);
    this.api.post<any>('/hrm/payroll', v).subscribe((r) => this.done(r));
  }
  done(r: any) {
    this.message.set(r.message);
    this.closeDrawer();
    this.load();
  }
}

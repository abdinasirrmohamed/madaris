import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';

type Resource =
  'academic-years' | 'levels' | 'shifts' | 'subjects' | 'lessons' | 'classes' | 'timetables';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: ` <header class="page academic-page">
      <div>
        <h1>{{ pageTitle() }}</h1>
        <span>{{ pageDescription() }}</span>
      </div>
      <button (click)="openCreate()">＋ Add New</button>
    </header>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    <section class="content">
      <article class="table-card">
        <header>
          <h2>All {{ label() }}</h2>
          <label><input [formControl]="search" placeholder="Search" /></label>
        </header>
        @if (loading()) {
          <div class="empty">Loading records…</div>
        } @else if (!filtered().length) {
          <div class="empty">
            <b>No {{ label().toLowerCase() }} found</b
            ><span>Use “Add {{ label() }}” to create the first record.</span>
          </div>
        } @else {
          <table [class.levels-table]="resource() === 'levels'" class="academic-table">
            <thead>
              <tr>
                @if (resource() === 'levels') {
                  <th>#</th><th>Level Name</th><th>Level Price</th><th>Classes</th><th>Students</th><th class="action-heading">Action</th>
                } @else {
                  @for (column of columns(); track column.key) { <th>{{ column.label }}</th> }
                  <th>Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track identity(row); let index = $index) {
                <tr>
                  @if (resource() === 'levels') {
                    <td>{{ index + 1 }}</td><td class="level-name">{{ row.Name }}</td>
                    <td class="level-price">$ {{ money(row.LevelPrice) }}</td>
                    <td><span class="count-badge classes-badge">{{ row.ClassesCount || 0 }} {{ row.ClassesCount === 1 ? 'Class' : 'Classes' }}</span></td>
                    <td><span class="count-badge students-badge">{{ row.StudentsCount || 0 }} {{ row.StudentsCount === 1 ? 'Student' : 'Students' }}</span></td>
                  } @else {
                    @for (column of columns(); track column.key) {
                      <td>@if (column.key === 'Status' || column.key === 'IsActive') { <span class="status">{{ display(row, column.key) }}</span> } @else { {{ display(row, column.key) }} }</td>
                    }
                  }
                  <td class="actions">
                    <button (click)="edit(row)">✎ Edit</button><button class="delete" (click)="remove(row)">▣ Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </article>
      @if (formOpen()) {
        <aside class="drawer">
          <header>
            <div>
              <small>{{ editingId() ? 'EDIT' : 'NEW RECORD' }}</small>
              <h2>{{ editingId() ? 'Update' : 'Add' }} {{ label() }}</h2>
            </div>
            <button (click)="formOpen.set(false)">×</button>
          </header>
          <form [formGroup]="form" (ngSubmit)="save()">
            @switch (resource()) {
              @case ('academic-years') {
                <label>Name<input formControlName="Name" placeholder="2026/2027" /></label>
                <div class="pair">
                  <label>Start date<input type="date" formControlName="StartDate" /></label
                  ><label>End date<input type="date" formControlName="EndDate" /></label>
                </div>
                <label class="check"
                  ><input type="checkbox" formControlName="IsDefault" /> Default academic
                  year</label
                >
              }
              @case ('levels') {
                <div class="pair">
                  <label>Level name<input formControlName="Name" /></label
                  ><label>Code<input formControlName="Code" /></label>
                </div>
                <div class="pair">
                  <label>Sequence<input type="number" formControlName="SequenceNo" /></label
                  ><label
                    >Promotion score<input type="number" formControlName="MinimumPromotionScore"
                  /></label>
                </div>
              }
              @case ('shifts') {
                <label>Shift name<input formControlName="Name" placeholder="Morning" /></label>
                <div class="pair">
                  <label>Start time<input type="time" formControlName="StartTime" /></label
                  ><label>End time<input type="time" formControlName="EndTime" /></label>
                </div>
              }
              @case ('subjects') {
                <div class="pair">
                  <label>Subject name<input formControlName="SubjectName" /></label
                  ><label>Code<input formControlName="SubjectCode" /></label>
                </div>
                <label
                  >Subject type<select formControlName="SubjectType">
                    <option>Academic</option>
                    <option>Quran</option>
                    <option>Other</option>
                  </select></label
                >
                <div class="pair">
                  <label>Maximum mark<input type="number" formControlName="MaximumMark" /></label
                  ><label>Pass mark<input type="number" formControlName="PassMark" /></label>
                </div>
              }
              @case ('classes') {
                <label
                  >Branch<select formControlName="BranchId">
                    @for (x of branches(); track x.BranchId) {
                      <option [value]="x.BranchId">{{ x.Name }}</option>
                    }
                  </select></label
                ><label
                  >Academic year<select formControlName="AcademicYearId">
                    @for (x of years(); track x.AcademicYearId) {
                      <option [value]="x.AcademicYearId">{{ x.Name }}</option>
                    }
                  </select></label
                >
                <div class="pair">
                  <label
                    >Level<select formControlName="LevelId">
                      @for (x of levels(); track x.LevelId) {
                        <option [value]="x.LevelId">{{ x.Name }}</option>
                      }
                    </select></label
                  ><label
                    >Shift<select formControlName="ShiftId">
                      @for (x of shifts(); track x.ShiftId) {
                        <option [value]="x.ShiftId">{{ x.Name }}</option>
                      }
                    </select></label
                  >
                </div>
                <div class="pair">
                  <label>Class name<input formControlName="Name" /></label
                  ><label>Code<input formControlName="Code" /></label>
                </div>
                <label>Capacity<input type="number" formControlName="Capacity" /></label>
              }
              @case ('lessons') {
                <label
                  >Subject<select formControlName="SubjectId">
                    @for (x of subjects(); track x.SubjectId) {
                      <option [value]="x.SubjectId">{{ x.SubjectName }}</option>
                    }
                  </select></label
                >
                <label>Lesson title<input formControlName="LessonTitle" /></label>
                <label>Sort order<input type="number" min="0" formControlName="SortOrder" /></label>
              }
              @case ('timetables') {
                <label
                  >Branch<select formControlName="BranchId">
                    @for (x of branches(); track x.BranchId) {
                      <option [value]="x.BranchId">{{ x.Name }}</option>
                    }
                  </select></label
                >
                <div class="pair">
                  <label
                    >Class<select formControlName="ClassId">
                      @for (x of classes(); track x.ClassId) {
                        <option [value]="x.ClassId">{{ x.Name }}</option>
                      }
                    </select></label
                  ><label
                    >Subject<select formControlName="SubjectId">
                      @for (x of subjects(); track x.SubjectId) {
                        <option [value]="x.SubjectId">{{ x.SubjectName }}</option>
                      }
                    </select></label
                  >
                </div>
                <label
                  >Teacher<select formControlName="TeacherId">
                    <option value="">Unassigned</option>
                    @for (x of teachers(); track x.UserId) {
                      <option [value]="x.UserId">{{ x.Name }}</option>
                    }
                  </select></label
                >
                <div class="pair">
                  <label
                    >Day<select formControlName="DayOfWeek">
                      @for (day of days; track day.value) {
                        <option [value]="day.value">{{ day.label }}</option>
                      }
                    </select></label
                  ><label>Room<input formControlName="Room" /></label>
                </div>
                <div class="pair">
                  <label>Start time<input type="time" formControlName="StartTime" /></label
                  ><label>End time<input type="time" formControlName="EndTime" /></label>
                </div>
              }
            }
            @if (['academic-years', 'levels', 'shifts', 'classes'].includes(resource())) {
              <label
                >Status<select formControlName="Status">
                  <option>Active</option>
                  <option>Inactive</option>
                </select></label
              >
            }
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
            <footer>
              <button type="button" (click)="formOpen.set(false)">Cancel</button
              ><button class="primary" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save record' }}
              </button>
            </footer>
          </form>
        </aside>
      }
    </section>`,
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
      .academic-page { background:#fff; border-left:4px solid #2186d5; border-radius:12px; padding:16px 18px; box-shadow:0 5px 20px #183b5b0d; }
      .academic-page h1 { font-size:15px; color:#11115f; margin:0 0 3px; }
      .academic-page > button { background:#2186d5; font-weight:700; }
      .page p {
        font-size: 10px;
        font-weight: 800;
        color: #1554a1;
        margin: 0;
      }
      .page h1 {
        margin: 5px 0;
        font-size: 27px;
      }
      .page span {
        font-size: 12px;
        color: #74828f;
      }
      .page > button {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 11px 15px;
      }
      .tabs {
        display: flex;
        gap: 5px;
        margin: 20px 0 10px;
        background: white;
        border: 1px solid #dbe5ee;
        padding: 7px;
        border-radius: 9px;
      }
      .academic-page + .content, .academic-page + .notice { margin-top:16px; }
      .tabs button {
        border: 0;
        background: transparent;
        padding: 9px 15px;
        border-radius: 6px;
        color: #5f6f7f;
        font-size: 11px;
        font-weight: 700;
      }
      .tabs .active {
        background: #211e75;
        color: white;
      }
      .content {
        position: relative;
      }
      .table-card {
        background: white;
        border: 1px solid #dbe5ee;
        border-radius: 9px;
        overflow: auto;
        min-height: 260px;
      }
      .table-card > header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px;
        border-bottom: 1px solid #e2eaf1;
      }
      .table-card h2 {
        margin: 0;
        font-size: 15px;
      }
      .table-card header label {
        border: 1px solid #d8e2eb;
        border-radius: 7px;
        padding: 7px 10px;
      }
      .table-card header input {
        border: 0;
        outline: 0;
        font-size: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 13px 14px;
        border-bottom: 1px solid #edf1f4;
        font-size: 11px;
      }
      th {
        font-size: 9px;
        color: #718090;
        background: #f8fafc;
      }
      .status {
        background: #e4f7ef;
        color: #168259;
        border-radius: 12px;
        padding: 5px 8px;
      }
      .actions button {
        border: 0;
        background: #eaf2fb;
        color: #18549a;
        border-radius: 5px;
        padding: 5px 8px;
        margin-right: 5px;
        font-size: 9px;
      }
      .actions .delete {
        background: #fff0ef;
        color: #b83228;
      }
      .levels-table th { color:#11133f; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
      .levels-table td { padding-top:12px; padding-bottom:12px; }
      .levels-table .level-name, .levels-table .level-price { color:#08085b; font-weight:800; }
      .levels-table .action-heading, .levels-table .actions { text-align:right; white-space:nowrap; }
      .count-badge { display:inline-block; border-radius:16px; padding:6px 10px; font-size:9px; font-weight:800; }
      .classes-badge { background:#dff3ff; color:#075d91; }
      .students-badge { background:#d9f8e6; color:#08743c; }
      .levels-table .actions button { background:#211e75; color:white; font-size:10px; font-weight:700; padding:7px 9px; }
      .levels-table .actions .delete { background:#ff1717; color:white; }
      .academic-table th { color:#11133f; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
      .academic-table .actions { text-align:right; white-space:nowrap; }
      .academic-table .actions button { background:#211e75; color:white; font-size:10px; font-weight:700; padding:7px 9px; }
      .academic-table .actions .delete { background:#ff1717; color:white; }
      .empty {
        display: grid;
        place-items: center;
        align-content: center;
        height: 270px;
        color: #7a8895;
        gap: 7px;
      }
      .empty b {
        color: #243747;
      }
      .drawer {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: 430px;
        background: white;
        box-shadow: -10px 0 30px #17324c2a;
        z-index: 10;
        overflow: auto;
      }
      .drawer > header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      .drawer h2 {
        margin: 3px 0;
      }
      .drawer small {
        color: #1554a1;
        font-weight: 800;
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
        font-size: 11px;
        font-weight: 650;
        margin-bottom: 15px;
      }
      .drawer input,
      .drawer select {
        padding: 10px;
        border: 1px solid #d7e1e9;
        border-radius: 7px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .check {
        display: flex !important;
        grid-template-columns: auto 1fr;
      }
      .drawer footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid #e3e9ee;
        padding-top: 16px;
      }
      .drawer footer button {
        border: 1px solid #d5dfe7;
        background: white;
        border-radius: 7px;
        padding: 10px 14px;
      }
      .drawer footer .primary {
        background: #211e75;
        color: white;
      }
      .form-error {
        color: #b42318;
        font-size: 11px;
      }
      .notice {
        background: #e7f8ef;
        color: #147a52;
        border-radius: 6px;
        padding: 10px;
        font-size: 11px;
      }
      @media (max-width: 700px) {
        .page span {
          display: none;
        }
        .tabs {
          overflow: auto;
        }
        .drawer {
          top: 0;
          width: 100%;
        }
        .pair {
          grid-template-columns: 1fr;
        }
        .table-card header label {
          display: none;
        }
      }
    `,
  ],
})
export class AcademicComponent implements OnInit {
  tabs: { key: Resource; label: string }[] = [
    { key: 'academic-years', label: 'Academic Years' },
    { key: 'levels', label: 'Levels' },
    { key: 'shifts', label: 'Shifts' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'lessons', label: 'Lessons' },
    { key: 'classes', label: 'Classes' },
    { key: 'timetables', label: 'Timetables' },
  ];
  resource = signal<Resource>('academic-years');
  rows = signal<any[]>([]);
  loading = signal(true);
  formOpen = signal(false);
  saving = signal(false);
  editingId = signal<number | null>(null);
  message = signal('');
  formError = signal('');
  search = new FormControl('');
  form = new FormGroup<Record<string, FormControl>>({});
  branches = signal<any[]>([]);
  years = signal<any[]>([]);
  levels = signal<any[]>([]);
  shifts = signal<any[]>([]);
  subjects = signal<any[]>([]);
  classes = signal<any[]>([]);
  teachers = signal<any[]>([]);
  days = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];
  constructor(private api: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const requested = params.get('resource') as Resource | null;
      this.resource.set(requested && this.tabs.some((tab) => tab.key === requested) ? requested : 'academic-years');
      this.load();
    });
    this.loadReferences();
  }
  select(r: Resource) {
    this.resource.set(r);
    this.load();
  }
  label() {
    return this.tabs.find((t) => t.key === this.resource())!.label;
  }
  pageTitle() {
    const titles: Record<Resource, string> = {
      'academic-years': 'Academic Year', levels: 'Level', shifts: 'Shift', subjects: 'Subject',
      lessons: 'Lesson', classes: 'Class', timetables: 'Timetable',
    };
    return titles[this.resource()];
  }
  pageDescription() {
    const descriptions: Record<Resource, string> = {
      'academic-years': 'Manage academic years, dates and the active school year.',
      levels: 'Manage levels, fees, classes and active students.',
      shifts: 'Manage school shifts and their operating hours.',
      subjects: 'Manage subjects, codes, marks and subject types.',
      lessons: 'Manage lessons and their assigned subjects.',
      classes: 'Manage classes, capacity, levels and shifts.',
      timetables: 'Manage class schedules, teachers, rooms and lesson times.',
    };
    return descriptions[this.resource()];
  }
  columns() {
    const map: any = {
      'academic-years': [
        ['Name', 'Name'],
        ['StartDate', 'Start'],
        ['EndDate', 'End'],
        ['IsDefault', 'Default'],
        ['Status', 'Status'],
      ],
      levels: [
        ['Name', 'Name'],
        ['Code', 'Code'],
        ['SequenceNo', 'Sequence'],
        ['MinimumPromotionScore', 'Promotion score'],
        ['Status', 'Status'],
      ],
      shifts: [
        ['Name', 'Name'],
        ['StartTime', 'Starts'],
        ['EndTime', 'Ends'],
        ['Status', 'Status'],
      ],
      subjects: [
        ['SubjectName', 'Subject'],
        ['SubjectCode', 'Code'],
        ['SubjectType', 'Type'],
        ['MaximumMark', 'Maximum'],
        ['IsActive', 'Status'],
      ],
      lessons: [
        ['SubjectName', 'Subject'],
        ['LessonTitle', 'Lesson'],
        ['SortOrder', 'Order'],
      ],
      classes: [
        ['Name', 'Class'],
        ['Code', 'Code'],
        ['Capacity', 'Capacity'],
        ['Status', 'Status'],
      ],
      timetables: [
        ['DayOfWeek', 'Day'],
        ['ClassName', 'Class'],
        ['SubjectName', 'Subject'],
        ['TeacherName', 'Teacher'],
        ['StartTime', 'Starts'],
        ['EndTime', 'Ends'],
        ['Room', 'Room'],
      ],
    };
    return map[this.resource()].map((x: string[]) => ({ key: x[0], label: x[1] }));
  }
  identity(r: any) {
    return r[this.idKey()];
  }
  idKey() {
    return (
      {
        'academic-years': 'AcademicYearId',
        levels: 'LevelId',
        shifts: 'ShiftId',
        subjects: 'SubjectId',
        lessons: 'LessonId',
        classes: 'ClassId',
        timetables: 'TimeTableId',
      } as any
    )[this.resource()];
  }
  display(row: any, key: string) {
    if (key === 'DayOfWeek')
      return this.days.find((x) => x.value === Number(row[key]))?.label ?? row[key];
    if (typeof row[key] === 'boolean' || key === 'IsDefault' || key === 'IsActive')
      return row[key] ? 'Yes' : 'No';
    return row[key] ?? '—';
  }
  money(value: unknown) {
    return Number(value || 0).toFixed(2);
  }
  filtered() {
    const q = (this.search.value || '').toLowerCase();
    return this.rows().filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }
  load() {
    this.loading.set(true);
    this.api.get<any>('/academic/' + this.resource()).subscribe({
      next: (r) => {
        this.rows.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  loadReferences() {
    for (const r of ['academic-years', 'levels', 'shifts', 'subjects', 'classes'] as Resource[])
      this.api.get<any>('/academic/' + r).subscribe((x) => {
        if (r === 'academic-years') this.years.set(x.data);
        if (r === 'levels') this.levels.set(x.data);
        if (r === 'shifts') this.shifts.set(x.data);
        if (r === 'subjects') this.subjects.set(x.data);
        if (r === 'classes') this.classes.set(x.data);
      });
    this.api.get<any>('/branches').subscribe((response) => this.branches.set(response.data));
    this.api
      .get<any>('/academic/references/teachers')
      .subscribe((response) => this.teachers.set(response.data));
  }
  openCreate() {
    this.editingId.set(null);
    this.buildForm();
    this.formOpen.set(true);
  }
  edit(row: any) {
    this.editingId.set(this.identity(row));
    this.buildForm(row);
    this.formOpen.set(true);
  }
  buildForm(v: any = {}) {
    const controls: any = {};
    const add = (n: string, d: any = '', required = true) =>
      (controls[n] = new FormControl(v[n] ?? d, required ? Validators.required : []));
    switch (this.resource()) {
      case 'academic-years':
        add('Name');
        add('StartDate');
        add('EndDate');
        add('IsDefault', false, false);
        add('Status', 'Active');
        break;
      case 'levels':
        add('Name');
        add('Code');
        add('SequenceNo', 1);
        add('MinimumPromotionScore', 50);
        add('Status', 'Active');
        break;
      case 'shifts':
        add('Name');
        add('StartTime', '07:00');
        add('EndTime', '12:00');
        add('Status', 'Active');
        break;
      case 'subjects':
        add('SubjectName');
        add('SubjectCode');
        add('SubjectType', 'Academic');
        add('MaximumMark', 100);
        add('PassMark', 50);
        add('IsActive', true, false);
        break;
      case 'lessons':
        add('SubjectId', this.subjects()[0]?.SubjectId);
        add('LessonTitle');
        add('SortOrder', 0);
        break;
      case 'classes':
        add('BranchId', 1);
        add('AcademicYearId', this.years()[0]?.AcademicYearId);
        add('LevelId', this.levels()[0]?.LevelId);
        add('ShiftId', this.shifts()[0]?.ShiftId);
        add('Name');
        add('Code');
        add('Capacity', 30);
        add('Status', 'Active');
        break;
      case 'timetables':
        add('BranchId', this.branches()[0]?.BranchId);
        add('ClassId', this.classes()[0]?.ClassId);
        add('SubjectId', this.subjects()[0]?.SubjectId);
        add('TeacherId', '', false);
        add('DayOfWeek', 1);
        add('StartTime', '08:00');
        add('EndTime', '09:00');
        add('Room', '', false);
    }
    this.form = new FormGroup(controls);
  }
  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    const path = '/academic/' + this.resource();
    const call = this.editingId()
      ? this.api.put<any>(path + '/' + this.editingId(), this.form.getRawValue())
      : this.api.post<any>(path, this.form.getRawValue());
    call.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.message.set(r.message);
        this.load();
        this.loadReferences();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(
          e.error?.message ||
            Object.values(e.error?.errors || {})
              .flat()
              .join(' ') ||
            'Unable to save record.',
        );
      },
    });
  }
  remove(row: any) {
    if (!confirm('Delete this record?')) return;
    this.api.delete<any>('/academic/' + this.resource() + '/' + this.identity(row)).subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.load();
      },
      error: (e) => this.message.set(e.error?.message || 'Record could not be deleted.'),
    });
  }
}

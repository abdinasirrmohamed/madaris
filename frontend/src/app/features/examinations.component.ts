import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
import { ActivatedRoute } from '@angular/router';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <header class="page">
      <div>
        <small>EXAMINATIONS</small>
        <h1>Exam management</h1>
        <p>Create, schedule, mark, publish and lock examinations.</p>
      </div>
      <button (click)="showForm.set(true)">＋ Add exam</button>
    </header>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    @if (view() === 'list') {
      <section class="report-filters" [formGroup]="reportForm">
        <label>Class <b>*</b><select formControlName="ClassId"><option value="">Select class</option>@for (x of reportClasses(); track x.ClassId) {<option [value]="x.ClassId">{{ x.Name }}</option>}</select></label>
        <label>Exam type <b>*</b><select formControlName="ExamTypeId"><option value="">Select exam type</option>@for (x of types(); track x.ExamTypeId) {<option [value]="x.ExamTypeId">{{ x.TypeName }}</option>}</select></label>
        <label>Academic year <b>*</b><select formControlName="AcademicYearId"><option value="">Select academic year</option>@for (x of years(); track x.AcademicYearId) {<option [value]="x.AcademicYearId">{{ x.Name }}</option>}</select></label>
        <button type="button" (click)="loadReport()">⌕ Filter</button>
      </section>
      @if (report()) {
        <section class="result-options"><b>Show / Hide Result Details:</b>@for (column of reportColumns; track column.key) {<label><input type="checkbox" [checked]="column.visible" (change)="toggleColumn(column.key)" /> {{ column.label }}</label>}<button type="button" (click)="printReport()">Print</button></section>
        <section class="exam-report">
          <header><h2>Exam Report</h2><p>Academic year: {{ report().AcademicYear.Name }}</p><p>Class: {{ report().Class.Name }} | Exam type: {{ report().ExamType.TypeName }}</p><b>Pass mark: {{ report().PassTotal }} / {{ report().MaximumTotal }}</b></header>
          <div class="report-scroll"><table><thead><tr><th>#</th><th>Student name</th>@for (subject of report().Subjects; track subject.ExamId) {<th>{{ subject.SubjectName }}</th>}@if(columnVisible('total')){<th>Total</th>}@if(columnVisible('average')){<th>AVG</th>}@if(columnVisible('percentage')){<th>Percentage</th>}@if(columnVisible('grade')){<th>Grade</th>}@if(columnVisible('position')){<th>Position</th>}@if(columnVisible('status')){<th>Status</th>}</tr></thead>
            <tbody>@for (student of report().Rows; track student.StudentId; let i = $index) {<tr><td>{{ i + 1 }}</td><td><b>{{ student.FirstName }} {{ student.LastName }}</b><small>{{ student.AdmissionNo }}</small></td>@for (subject of student.Subjects; track subject.ExamId) {<td>{{ subject.Mark ?? '—' }}</td>}@if(columnVisible('total')){<td>{{ student.Total }}</td>}@if(columnVisible('average')){<td>{{ student.Average }}</td>}@if(columnVisible('percentage')){<td>{{ student.Percentage }}%</td>}@if(columnVisible('grade')){<td>{{ student.Grade }}</td>}@if(columnVisible('position')){<td><b>{{ student.Position }}</b></td>}@if(columnVisible('status')){<td><span class="result-status" [class.passed]="student.Status === 'Passed'" [class.failed]="student.Status === 'Failed'">{{ student.Status }}</span></td>}</tr>}</tbody>
          </table></div>
          @if (!report().Rows.length) {<div class="empty">No enrolled students found.</div>}
        </section>
      } @else {<div class="report-placeholder"><b>Select class, exam type and academic year</b><span>The complete exam report will appear here.</span></div>}
    } @else if (view() === 'mark-sheets') {
      <section class="report-filters mark-filters" [formGroup]="reportForm">
        <label>Class <b>*</b><select formControlName="ClassId"><option value="">Select class</option>@for (x of reportClasses(); track x.ClassId) {<option [value]="x.ClassId">{{ x.Name }}</option>}</select></label>
        <label>Exam type <b>*</b><select formControlName="ExamTypeId"><option value="">Select exam type</option>@for (x of types(); track x.ExamTypeId) {<option [value]="x.ExamTypeId">{{ x.TypeName }}</option>}</select></label>
        <label>Academic year <b>*</b><select formControlName="AcademicYearId"><option value="">Select academic year</option>@for (x of years(); track x.AcademicYearId) {<option [value]="x.AcademicYearId">{{ x.Name }}</option>}</select></label>
        <button type="button" (click)="loadReport()">Filter students</button>
        @if (report()) {<label>Student <b>*</b><select [formControl]="markSheetStudentId"><option value="">Select student</option>@for (student of report().Rows; track student.StudentId) {<option [value]="student.StudentId">{{ student.FirstName }} {{ student.MiddleName }} {{ student.LastName }}</option>}</select></label>}
      </section>
      @if (markSheetStudent()) {
        <div class="sheet-actions"><button type="button" (click)="printReport()">Print Mark Sheet</button></div>
        <article class="mark-sheet">
          <div class="sheet-border">
            <header class="school-head"><img [src]="schoolLogo()" alt="School logo" /><div><h1>{{ report().School?.SchoolName || 'Madaaris Qur’an School' }}</h1><strong>{{ report().School?.Phone || report().School?.Email || '' }}</strong></div></header>
            <div class="blue-rule"></div><h3 class="section-title">Student Profile</h3>
            <section class="student-profile"><dl><div><dt>Student ID:</dt><dd>{{ markSheetStudent().AdmissionNo }}</dd></div><div><dt>Student Name:</dt><dd>{{ studentFullName(markSheetStudent()) }}</dd></div><div><dt>Phone:</dt><dd>{{ markSheetStudent().Phone || '—' }}</dd></div><div><dt>Address / Date of Birth / Age:</dt><dd>{{ markSheetStudent().Address || '—' }} / {{ markSheetStudent().DateOfBirth || '—' }} / {{ studentAge(markSheetStudent()) }}</dd></div><div><dt>Guardian Name:</dt><dd>{{ markSheetStudent().GuardianName || '—' }}</dd></div><div><dt>Guardian Phone:</dt><dd>{{ markSheetStudent().GuardianPhone || '—' }}</dd></div><div><dt>Orphan:</dt><dd>{{ markSheetStudent().WelfareStatus === 'Orphan' ? 'Yes' : 'No' }}</dd></div><div><dt>Class:</dt><dd>{{ report().Class.Name }}</dd></div></dl><div class="student-photo">@if(markSheetStudent().PhotoPath){<img [src]="studentPhoto(markSheetStudent())" alt="Student photo" />}@else{<span>{{ studentInitials(markSheetStudent()) }}</span>}</div></section>
            <section class="sheet-results"><div class="result-heading"><b>Exam Result</b><b>Rank: {{ markSheetStudent().Position }}/{{ report().Rows.length }}</b></div><table><thead><tr><th>Subject</th><th>{{ report().ExamType.TypeName }}</th><th>Total</th></tr></thead><tbody>@for(subject of markSheetStudent().Subjects; track subject.ExamId){<tr><td>{{ subject.SubjectName }}</td><td>{{ subject.Mark ?? '—' }}</td><td>{{ subject.MaximumMark }}</td></tr>}<tr class="strong"><td>TOTAL</td><td>{{ markSheetStudent().Total }}</td><td>{{ report().MaximumTotal }}</td></tr><tr><td>AVERAGE</td><td colspan="2">{{ markSheetStudent().Percentage }}%</td></tr><tr><td>GRADE</td><td colspan="2">{{ markSheetStudent().Grade }}</td></tr><tr><td>Status</td><td colspan="2" class="sheet-status" [class.pass]="markSheetStudent().Status === 'Passed'">{{ markSheetStudent().Status }}</td></tr></tbody></table></section>
            <footer class="sheet-footer"><b>Head of Examinations</b><div></div><small>{{ report().School?.Address || 'Madaaris School Management System' }}</small></footer>
          </div>
        </article>
      } @else {<div class="report-placeholder"><b>Select the report filters and student</b><span>The printable student mark sheet will appear here.</span></div>}
    } @else {
    <section class="card">
      <table>
        <thead>
          <tr>
            <th>Exam</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Marks</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (e of exams(); track e.ExamId) {
            <tr>
              <td>
                <b>{{ e.ExamTitle }}</b>
              </td>
              <td>{{ e.ClassName }}</td>
              <td>{{ e.SubjectName }}</td>
              <td>{{ e.PassMark }} / {{ e.MaximumMark }}</td>
              <td>{{ e.Status }}</td>
              <td>
                <button (click)="schedule(e)">Schedule</button
                ><button (click)="openMarks(e)">Marks</button
                ><button (click)="transition(e)">Status</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!exams().length) {
        <div class="empty">No examinations created.</div>
      }
    </section>
    }
    @if (selected()) {
      <section class="card marks">
        <header>
          <div>
            <h3>{{ selected().ExamTitle }} · mark sheet</h3>
            <small>Maximum {{ selected().MaximumMark }}, pass {{ selected().PassMark }}</small>
          </div>
          <button (click)="submitMarks()">Submit marks</button
          ><button (click)="selected.set(null)">Close</button>
        </header>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Mark</th>
              <th>Remarks</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            @for (m of markRows(); track m.StudentId) {
              <tr>
                <td>
                  {{ m.FirstName }} {{ m.LastName }}<small>{{ m.AdmissionNo }}</small>
                </td>
                <td>
                  <input
                    type="number"
                    [max]="selected().MaximumMark"
                    [value]="m.MarksObtained"
                    (input)="setValue(m.StudentId, 'MarksObtained', $event)"
                  />
                </td>
                <td>
                  <input [value]="m.Remarks" (input)="setValue(m.StudentId, 'Remarks', $event)" />
                </td>
                <td>{{ m.MarksObtained >= selected().PassMark ? 'Pass' : 'Fail' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    @if (showForm()) {
      <aside class="exam-toast">
        <header>
          <h2>Create exam</h2>
          <button (click)="showForm.set(false)">×</button>
        </header>
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>Title<input formControlName="ExamTitle" /></label
          ><label
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
          ><label
            >Exam type<select formControlName="ExamTypeId">
              @for (x of types(); track x.ExamTypeId) {
                <option [value]="x.ExamTypeId">{{ x.TypeName }}</option>
              }</select
            ><button type="button" (click)="addType()">Add type</button></label
          ><label
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
          <div>
            <label>Maximum<input type="number" formControlName="MaximumMark" /></label
            ><label>Pass<input type="number" formControlName="PassMark" /></label>
          </div>
          <button class="primary">Create exam</button>
        </form>
      </aside>
    }
  `,
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
      .page small {
        color: #15549c;
        font-weight: 800;
      }
      .page h1 {
        margin: 5px 0;
      }
      .page p {
        color: #748391;
      }
      .page > button,
      .primary,
      .marks header > button {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 10px 14px;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      .report-filters { display:grid; grid-template-columns:repeat(3,minmax(180px,1fr)) auto; align-items:end; gap:18px; margin-top:18px; padding:20px; border:1px solid #dbe5ed; border-radius:9px; background:#fff; }
      .report-filters label { display:grid; gap:7px; color:#263752; font-size:10px; }
      .report-filters label b { color:#dc3545; }
      .report-filters select { width:100%; padding:10px; border:1px solid #cdd8e4; border-radius:6px; background:white; }
      .report-filters button { padding:11px 18px; border:0; border-radius:7px; background:#4d35df; color:#fff; font-weight:700; }
      .result-options { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:18px; padding:13px; border:1px solid #dbe5ed; border-radius:8px; background:#fff; font-size:9px; }
      .result-options label { display:flex; align-items:center; gap:4px; }
      .result-options button { margin-left:auto; padding:8px 13px; border:0; border-radius:6px; background:#211e75; color:#fff; }
      .exam-report { margin-top:12px; background:#fff; border:1px solid #dbe5ed; border-radius:8px; overflow:hidden; }
      .exam-report > header { padding:18px; text-align:center; }
      .exam-report h2,.exam-report p { margin:4px; }
      .exam-report header b { font-size:10px; }
      .report-scroll { overflow:auto; }
      .exam-report table th,.exam-report table td { border:1px solid #cfd7e2; }
      .result-status { color:#a16b00; font-weight:800; }.result-status.passed{color:#138a28}.result-status.failed{color:#d52d2d}
      .report-placeholder { min-height:280px; margin-top:14px; display:grid; place-content:center; gap:7px; text-align:center; color:#748391; background:#fff; border:1px dashed #cbd6e2; border-radius:9px; }.report-placeholder b{color:#243457}
      .mark-filters{grid-template-columns:repeat(4,minmax(150px,1fr))}.mark-filters>label:last-child{grid-column:1/-1}.sheet-actions{display:flex;justify-content:flex-end;margin:14px 0}.sheet-actions button{padding:10px 15px;border:0;border-radius:7px;background:#211e75;color:#fff;font-weight:700}
      .mark-sheet{width:min(780px,100%);margin:0 auto 30px;padding:9px;background:#173780;box-shadow:0 18px 40px #17234b28}.sheet-border{min-height:980px;padding:22px 30px;background:#fffefa;border:4px double #18296f;outline:2px solid #18296f;outline-offset:-10px}.school-head{display:flex;align-items:center;gap:25px;padding:10px 8px}.school-head img{width:145px;height:125px;object-fit:contain}.school-head>div{flex:1;text-align:center}.school-head h1{margin:0;color:#27634f;font-size:34px;line-height:1.25}.school-head strong{display:block;margin-top:10px;font-size:24px;color:#090909}.blue-rule{height:7px;margin:2px 0 10px;background:#12506d}.section-title{margin:0;padding:5px;background:#21386f;color:#fff;text-align:center;font-size:13px}.student-profile{display:grid;grid-template-columns:1fr 160px;border:1px solid #333}.student-profile dl{margin:0}.student-profile dl div{display:grid;grid-template-columns:195px 1fr;min-height:27px;border-bottom:1px solid #444}.student-profile dl div:last-child{border-bottom:0}.student-profile dt,.student-profile dd{margin:0;padding:5px;font-size:11px}.student-profile dt{font-weight:800;border-right:1px solid #444}.student-photo{display:grid;place-items:center;margin:9px;border:1px solid #333;border-radius:3px;overflow:hidden;background:#eef2f7}.student-photo img{width:100%;height:100%;object-fit:cover}.student-photo span{display:grid;place-items:center;width:80px;height:80px;border-radius:50%;background:#21386f;color:#fff;font-size:24px;font-weight:800}.sheet-results{margin-top:9px}.result-heading{display:grid;grid-template-columns:1fr 2fr;background:#21386f;color:#fff}.result-heading b{padding:8px}.sheet-results table th{background:#21386f;color:#fff;font-size:11px}.sheet-results table th,.sheet-results table td{padding:8px;border:1px solid #333;font-size:11px}.sheet-results .strong td{font-weight:900}.sheet-status{text-align:center!important;background:#b42318;color:#fff;font-weight:900}.sheet-status.pass{background:#0a9138}.sheet-footer{text-align:center;margin-top:30px}.sheet-footer b{display:block}.sheet-footer div{width:70%;height:28px;margin:auto;border-bottom:1px solid #777}.sheet-footer small{display:block;margin-top:10px}
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
        min-height: 250px;
        margin-top: 12px;
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
      td button {
        border: 0;
        background: #e8f1fb;
        color: #15549c;
        border-radius: 5px;
        padding: 6px;
        margin: 2px;
      }
      .marks header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px;
      }
      .marks header div {
        flex: 1;
      }
      .marks h3 {
        margin: 0;
      }
      .marks input {
        padding: 7px;
        border: 1px solid #d6e0e8;
        border-radius: 5px;
      }
      .empty {
        height: 220px;
        display: grid;
        place-items: center;
        color: #758392;
      }
      aside.exam-toast {
        position: fixed;
        right: 24px;
        top: 70px;
        width: min(440px, calc(100% - 32px));
        max-height: calc(100vh - 90px);
        background: white;
        z-index: 40;
        border:1px solid #dbe5ed;
        border-radius:12px;
        box-shadow: 0 18px 55px #17324c3b;
        overflow: auto;
      }
      aside > header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      aside header button {
        border: 0;
        background: none;
        font-size: 25px;
      }
      form {
        padding: 20px;
      }
      form label {
        display: grid;
        gap: 5px;
        font-size: 10px;
        font-weight: 700;
        margin: 12px 0;
      }
      form input,
      form select {
        padding: 10px;
        border: 1px solid #d6e0e8;
        border-radius: 7px;
      }
      form > div {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .primary {
        width: 100%;
      }
      @media(max-width:850px){.report-filters,.mark-filters{grid-template-columns:1fr}.report-filters button{width:100%}.student-profile{grid-template-columns:1fr}.student-photo{height:190px}.school-head h1{font-size:24px}.school-head img{width:90px}.student-profile dl div{grid-template-columns:145px 1fr}}
      @media print{.page,.report-filters,.result-options,.sheet-actions{display:none!important}.exam-report{border:0;margin:0}.exam-report table{font-size:9px}.mark-sheet{width:100%;margin:0;box-shadow:none}.sheet-border{min-height:100vh}}
    `,
  ],
})
export class ExaminationsComponent implements OnInit {
  private dialog = inject(DialogService);
  exams = signal<any[]>([]);
  selected = signal<any>(null);
  markRows = signal<any[]>([]);
  showForm = signal(false);
  message = signal('');
  view = signal('list');
  branches = signal<any[]>([]);
  years = signal<any[]>([]);
  types = signal<any[]>([]);
  classes = signal<any[]>([]);
  subjects = signal<any[]>([]);
  report = signal<any>(null);
  markSheetStudentId = new FormControl<any>('');
  reportColumns = [
    { key: 'total', label: 'Total', visible: true }, { key: 'average', label: 'AVG', visible: true },
    { key: 'percentage', label: 'Percentage', visible: true }, { key: 'grade', label: 'Grade', visible: true },
    { key: 'position', label: 'Position', visible: true }, { key: 'status', label: 'Status', visible: true },
  ];
  reportForm = new FormGroup({
    ClassId: new FormControl<any>(''),
    ExamTypeId: new FormControl<any>(''),
    AcademicYearId: new FormControl<any>(''),
  });
  form = new FormGroup({
    BranchId: new FormControl<any>(''),
    AcademicYearId: new FormControl<any>(''),
    ExamTypeId: new FormControl<any>(''),
    ClassId: new FormControl<any>(''),
    SubjectId: new FormControl<any>(''),
    ExamTitle: new FormControl(''),
    MaximumMark: new FormControl(100),
    PassMark: new FormControl(50),
  });
  constructor(private api: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe(params=>{const view=params.get('view')||'list';this.view.set(view);if(view==='new')this.showForm.set(true)});
    this.load();
    const refs: any[] = [
      ['/branches', this.branches],
      ['/academic/academic-years', this.years],
      ['/examinations/types', this.types],
      ['/academic/classes', this.classes],
      ['/academic/subjects', this.subjects],
    ];
    for (const [p, s] of refs)
      this.api.get<any>(p).subscribe((r) => {
        s.set(r.data);
        if (p === '/branches') this.form.patchValue({ BranchId: r.data[0]?.BranchId });
        if (p === '/academic/classes' && !this.reportForm.controls.ClassId.value) this.reportForm.patchValue({ ClassId: r.data[0]?.ClassId ?? '' });
        if (p === '/examinations/types' && !this.reportForm.controls.ExamTypeId.value) this.reportForm.patchValue({ ExamTypeId: r.data[0]?.ExamTypeId ?? '' });
        if (p === '/academic/academic-years' && !this.reportForm.controls.AcademicYearId.value) this.reportForm.patchValue({ AcademicYearId: r.data.find((x:any)=>x.Status==='Active')?.AcademicYearId ?? r.data[0]?.AcademicYearId ?? '' });
      });
  }
  reportClasses() { return this.classes(); }
  loadReport() {
    const v: any = this.reportForm.getRawValue();
    if (!v.ClassId || !v.ExamTypeId || !v.AcademicYearId) { this.message.set('Select class, exam type and academic year.'); return; }
    this.api.get<any>('/examinations-report', { ClassId: String(v.ClassId), ExamTypeId: String(v.ExamTypeId), AcademicYearId: String(v.AcademicYearId) }).subscribe({
      next: (r) => { this.report.set(r.data); this.markSheetStudentId.setValue(r.data.Rows[0]?.StudentId ?? ''); this.message.set(''); },
      error: (e) => { this.report.set(null); this.message.set(e.error?.message || 'Exam report could not be loaded.'); },
    });
  }
  columnVisible(key: string) { return this.reportColumns.find((column) => column.key === key)?.visible !== false; }
  toggleColumn(key: string) { const column = this.reportColumns.find((item) => item.key === key); if (column) column.visible = !column.visible; }
  printReport() { window.print(); }
  markSheetStudent() { return this.report()?.Rows?.find((student:any) => Number(student.StudentId) === Number(this.markSheetStudentId.value)) || null; }
  studentFullName(student:any) { return [student.FirstName, student.MiddleName, student.LastName].filter(Boolean).join(' '); }
  studentInitials(student:any) { return `${student.FirstName?.[0] || ''}${student.LastName?.[0] || ''}`.toUpperCase(); }
  studentAge(student:any) { if (!student.DateOfBirth) return 'Age unavailable'; const born = new Date(student.DateOfBirth); const now = new Date(); let age = now.getFullYear() - born.getFullYear(); if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--; return `${age} Years Old`; }
  studentPhoto(student:any) { const path = String(student.PhotoPath || ''); return path.startsWith('http') || path.startsWith('/') ? path : `/storage/${path}`; }
  schoolLogo() { const path = String(this.report()?.School?.LogoPath || ''); if (!path) return '/assets/branding/madaaris-logo-transparent.png'; return path.startsWith('http') || path.startsWith('/') ? path : `/storage/${path}`; }
  load() {
    this.api.get<any>('/examinations').subscribe((r) => this.exams.set(r.data));
  }
  async addType() {
    const TypeName = await this.dialog.prompt('Exam type name');
    if (TypeName)
      this.api.post<any>('/examinations/types', { TypeName }).subscribe((r) => {
        this.message.set(r.message);
        this.api.get<any>('/examinations/types').subscribe((x) => this.types.set(x.data));
      });
  }
  save() {
    const v: any = this.form.getRawValue();
    for (const k of [
      'BranchId',
      'AcademicYearId',
      'ExamTypeId',
      'ClassId',
      'SubjectId',
      'MaximumMark',
      'PassMark',
    ])
      v[k] = Number(v[k]);
    this.api.post<any>('/examinations', v).subscribe((r) => {
      this.message.set(r.message);
      this.showForm.set(false);
      this.load();
    });
  }
  async schedule(e: any) {
    const ExamDate = await this.dialog.prompt('Exam date', new Date().toISOString().slice(0, 10), 'date');
    if (ExamDate)
      this.api.post<any>(`/examinations/${e.ExamId}/schedule`, { ExamDate }).subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  openMarks(e: any) {
    this.selected.set(e);
    this.api
      .get<any>('/attendance/roster', {
        ClassId: String(e.ClassId),
        AttendanceDate: new Date().toISOString().slice(0, 10),
        Session: 'Exam',
      })
      .subscribe((r) =>
        this.markRows.set(r.data.map((x: any) => ({ ...x, MarksObtained: 0, Remarks: '' }))),
      );
  }
  setValue(id: number, key: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.markRows.update((rows) =>
      rows.map((x) =>
        x.StudentId === id
          ? { ...x, [key]: key === 'MarksObtained' ? Number(input.value) : input.value }
          : x,
      ),
    );
  }
  submitMarks() {
    this.api
      .put<any>(`/examinations/${this.selected().ExamId}/marks`, {
        Marks: this.markRows().map((x) => ({
          StudentId: x.StudentId,
          MarksObtained: x.MarksObtained,
          Remarks: x.Remarks,
        })),
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  async transition(e: any) {
    const Action = await this.dialog.prompt('Approve, Publish, Lock or Reopen');
    if (!Action) return;
    const Reason = Action === 'Reopen' ? await this.dialog.prompt('Reason') : null;
    this.api
      .post<any>(`/examinations/${e.ExamId}/transition`, { Action, Reason })
      .subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
}

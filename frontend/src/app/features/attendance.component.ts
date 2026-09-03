import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from '../core/dialog.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<header class="page">
      <div>
        <p>ATTENDANCE</p>
        <h1>Student attendance</h1>
        <span>Load an assigned class, mark students and submit one verified session.</span>
      </div>
    </header>
    <nav>
      <button [class.active]="tab() === 'take'" (click)="tab.set('take')">Take attendance</button
      ><button [class.active]="tab() === 'report'" (click)="tab.set('report'); loadReport()">
        Attendance report</button
      ><button
        [class.active]="tab() === 'corrections'"
        (click)="tab.set('corrections'); loadCorrections(); loadMissing()"
      >
        Corrections & missing
      </button>
    </nav>
    @if (message()) {
      <p class="notice" [class.error]="isError()">{{ message() }}</p>
    }
    @if (tab() === 'take') {
      <section class="filters">
        <label
          >Class<select [formControl]="classId">
            <option value="">Select class</option>
            @for (c of classes(); track c.ClassId) {
              <option [value]="c.ClassId">{{ c.Name }}</option>
            }
          </select></label
        ><label>Date<input type="date" [formControl]="date" /></label
        ><label
          >Session<select [formControl]="session">
            <option>Daily</option>
            <option>Morning</option>
            <option>Afternoon</option>
          </select></label
        ><button (click)="loadRoster()">Load students</button>
      </section>
      <section class="card">
        <header>
          <div>
            <h2>Class roster</h2>
            <small>{{ roster().length }} active students</small>
          </div>
          @if (roster().length) {
            <div class="bulk">
              <button (click)="markAll('Present')">All present</button
              ><button (click)="markAll('Absent')">All absent</button>
            </div>
          }
        </header>
        @if (loading()) {
          <div class="empty">Loading roster…</div>
        } @else if (!roster().length) {
          <div class="empty">
            <b>Select a class to begin</b><span>Only active enrollments are loaded.</span>
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Admission</th>
                <th>Student</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (s of roster(); track s.StudentId; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td>{{ s.AdmissionNo }}</td>
                  <td>
                    <b>{{ s.FirstName }} {{ s.MiddleName }} {{ s.LastName }}</b>
                  </td>
                  <td>
                    <div class="statuses">
                      @for (st of statuses; track st) {
                        <button
                          [class.selected]="s.Status === st"
                          [class.absent]="st === 'Absent'"
                          (click)="setStatus(s.StudentId, st)"
                        >
                          {{ st }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <footer><button class="submit" (click)="submit()">Submit attendance</button></footer>
        }
      </section>
    } @else if (tab() === 'report') {
      <section class="filters">
        <label>From<input type="date" [formControl]="from" /></label
        ><label>To<input type="date" [formControl]="to" /></label
        ><label
          >Class<select [formControl]="reportClass">
            <option value="">All classes</option>
            @for (c of classes(); track c.ClassId) {
              <option [value]="c.ClassId">{{ c.Name }}</option>
            }
          </select></label
        ><button (click)="loadReport()">Apply filters</button>
      </section>
      <section class="card">
        @if (!report().length) {
          <div class="empty">No attendance records match these filters.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Class</th>
                <th>Session</th>
                <th>Status</th>
                <th>Correction</th>
              </tr>
            </thead>
            <tbody>
              @for (r of report(); track r.AttendanceId) {
                <tr>
                  <td>{{ r.AttendanceDate }}</td>
                  <td>
                    {{ r.FirstName }} {{ r.LastName }}<small>{{ r.AdmissionNo }}</small>
                  </td>
                  <td>{{ r.ClassName }}</td>
                  <td>{{ r.Session }}</td>
                  <td>
                    <span class="badge" [class.red]="r.Status === 'Absent'">{{ r.Status }}</span>
                  </td>
                  <td><button class="correct" (click)="correct(r)">Request correction</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    } @else {
      <section class="filters">
        <label>Date<input type="date" [formControl]="date" /></label
        ><label
          >Session<select [formControl]="session">
            <option>Daily</option>
            <option>Morning</option>
            <option>Afternoon</option>
          </select></label
        ><span></span><button (click)="loadMissing(); loadCorrections()">Refresh</button>
      </section>
      <section class="card compact">
        <header>
          <div>
            <h2>Missing attendance submissions</h2>
            <small>{{ missing().length }} active classes</small>
          </div>
        </header>
        @if (!missing().length) {
          <div class="empty small">
            All active classes have submitted, or no active classes exist.
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Class</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              @for (row of missing(); track row.ClassId) {
                <tr>
                  <td>{{ row.Code }}</td>
                  <td>
                    <b>{{ row.Name }}</b>
                  </td>
                  <td>{{ row.BranchId }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
      <section class="card corrections">
        <header>
          <div>
            <h2>Correction requests</h2>
            <small>Approve or reject pending changes</small>
          </div>
        </header>
        @if (!corrections().length) {
          <div class="empty small">No correction requests found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Class</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Requested by</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (row of corrections(); track row.AttendanceCorrectionId) {
                <tr>
                  <td>{{ row.AttendanceDate }}</td>
                  <td>
                    <b>{{ row.FirstName }} {{ row.LastName }}</b
                    ><small>{{ row.AdmissionNo }}</small>
                  </td>
                  <td>{{ row.ClassName }}</td>
                  <td>{{ row.PreviousStatus }} → {{ row.RequestedStatus }}</td>
                  <td>{{ row.Reason }}</td>
                  <td>{{ row.RequestedByName }}</td>
                  <td>
                    <span class="badge" [class.red]="row.Status === 'Rejected'">{{
                      row.Status
                    }}</span>
                  </td>
                  <td>
                    @if (row.Status === 'Pending') {
                      <div class="actions">
                        <button (click)="approve(row)">Approve</button
                        ><button class="danger" (click)="reject(row)">Reject</button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .page p {
        font-size: 10px;
        color: #1554a1;
        font-weight: 800;
        margin: 0;
      }
      .page h1 {
        margin: 5px 0;
      }
      .page span {
        color: #748290;
        font-size: 12px;
      }
      nav {
        display: flex;
        gap: 5px;
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
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 10px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 13px;
        margin-bottom: 10px;
      }
      .filters label {
        display: grid;
        gap: 5px;
        font-size: 9px;
        font-weight: 700;
      }
      .filters input,
      .filters select {
        border: 1px solid #d5dfe7;
        border-radius: 6px;
        padding: 9px;
      }
      .filters > button {
        align-self: end;
        background: #15549c;
        color: white;
        border: 0;
        border-radius: 6px;
        padding: 10px 14px;
      }
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
        min-height: 340px;
      }
      .card > header {
        display: flex;
        justify-content: space-between;
        padding: 14px;
      }
      .card h2 {
        font-size: 14px;
        margin: 0;
      }
      .card small,
      td small {
        display: block;
        color: #788693;
      }
      .bulk button,
      .correct {
        border: 1px solid #cfdbe5;
        background: white;
        border-radius: 6px;
        padding: 7px 9px;
        font-size: 9px;
        margin-left: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-top: 1px solid #edf1f4;
        font-size: 10px;
      }
      th {
        font-size: 8px;
        color: #758493;
        background: #f8fafc;
      }
      .statuses {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .statuses button {
        border: 1px solid #d5e0e8;
        background: white;
        border-radius: 12px;
        padding: 5px 8px;
        font-size: 8px;
      }
      .statuses .selected {
        background: #16865b;
        color: white;
        border-color: #16865b;
      }
      .statuses .selected.absent {
        background: #c7352d;
        border-color: #c7352d;
      }
      .card footer {
        text-align: right;
        padding: 14px;
      }
      .submit {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 11px 16px;
      }
      .empty {
        height: 270px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 7px;
        color: #768592;
      }
      .badge {
        background: #e3f6ee;
        color: #157a54;
        padding: 5px 8px;
        border-radius: 12px;
      }
      .badge.red {
        background: #feeceb;
        color: #b62c24;
      }
      .notice {
        background: #e5f7ee;
        color: #147b55;
        padding: 10px;
        border-radius: 7px;
      }
      .notice.error {
        background: #feeceb;
        color: #b42318;
      }
      .card header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
      }
      .card header h2 {
        margin: 0 0 3px;
        font-size: 13px;
      }
      .card header small,
      td small {
        display: block;
        color: #788796;
      }
      .compact {
        min-height: 130px;
        margin-bottom: 10px;
      }
      .corrections {
        min-height: 240px;
      }
      .empty.small {
        height: 90px;
      }
      .actions {
        display: flex;
        gap: 5px;
      }
      .actions button {
        border: 0;
        border-radius: 5px;
        padding: 6px 9px;
        background: #16865b;
        color: white;
      }
      .actions .danger {
        background: #c7352d;
      }
      @media (max-width: 700px) {
        .filters {
          grid-template-columns: 1fr;
        }
        .statuses {
          min-width: 260px;
        }
      }
    `,
  ],
})
export class AttendanceComponent implements OnInit {
  private dialog = inject(DialogService);
  tab = signal('take');
  classes = signal<any[]>([]);
  roster = signal<any[]>([]);
  report = signal<any[]>([]);
  corrections = signal<any[]>([]);
  missing = signal<any[]>([]);
  loading = signal(false);
  message = signal('');
  isError = signal(false);
  statuses = ['Present', 'Absent', 'Late', 'Excused', 'Sick', 'Leave'];
  classId = new FormControl<any>('');
  date = new FormControl(new Date().toISOString().slice(0, 10));
  session = new FormControl('Daily');
  from = new FormControl(new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  to = new FormControl(new Date().toISOString().slice(0, 10));
  reportClass = new FormControl<any>('');
  constructor(private api: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const view = params.get('view');
      const next = view === 'reports' || view === 'history' ? 'report' : view === 'corrections' ? 'corrections' : 'take';
      this.tab.set(next);
      if (next === 'report') this.loadReport();
      if (next === 'corrections') { this.loadCorrections(); this.loadMissing(); }
    });
    this.api.get<any>('/academic/classes').subscribe((r) => this.classes.set(r.data));
  }
  loadRoster() {
    if (!this.classId.value) return;
    this.loading.set(true);
    this.api
      .get<any>('/attendance/roster', {
        ClassId: String(this.classId.value),
        AttendanceDate: this.date.value!,
        Session: this.session.value!,
      })
      .subscribe({
        next: (r) => {
          this.roster.set(r.data);
          this.loading.set(false);
          this.message.set('');
        },
        error: (e) => {
          this.loading.set(false);
          this.show(e, true);
        },
      });
  }
  setStatus(id: number, status: string) {
    this.roster.update((rows) =>
      rows.map((r) => (r.StudentId === id ? { ...r, Status: status } : r)),
    );
  }
  markAll(status: string) {
    this.roster.update((rows) => rows.map((r) => ({ ...r, Status: status })));
  }
  submit() {
    const cls = this.classes().find((c) => c.ClassId == this.classId.value);
    this.api
      .post<any>('/attendance', {
        BranchId: cls.BranchId,
        ClassId: Number(this.classId.value),
        AttendanceDate: this.date.value,
        Session: this.session.value,
        Records: this.roster().map((r) => ({ StudentId: r.StudentId, Status: r.Status })),
      })
      .subscribe({ next: (r) => this.show(r, false), error: (e) => this.show(e, true) });
  }
  loadReport() {
    const p: any = { From: this.from.value!, To: this.to.value! };
    if (this.reportClass.value) p.ClassId = String(this.reportClass.value);
    this.api.get<any>('/attendance/report', p).subscribe((r) => this.report.set(r.data));
  }
  async correct(row: any) {
    const status = await this.dialog.choose('Dooro xaaladda cusub', [
      { value: 'Present', label: 'Jooga' },
      { value: 'Absent', label: 'Maqan' },
      { value: 'Late', label: 'Daahay' },
      { value: 'Excused', label: 'La cudurdaartay' },
      { value: 'Sick', label: 'Xanuunsan' },
      { value: 'Leave', label: 'Fasax' },
    ], row.Status);
    if (!status || !this.statuses.includes(status)) return;
    const reason = await this.dialog.prompt('Sababta sixitaanka');
    if (!reason) return;
    this.api
      .post<any>(`/attendance/${row.AttendanceId}/corrections`, {
        RequestedStatus: status,
        Reason: reason,
      })
      .subscribe({ next: (r) => this.show(r, false), error: (e) => this.show(e, true) });
  }
  loadCorrections() {
    this.api.get<any>('/attendance/corrections').subscribe({
      next: (r) => this.corrections.set(r.data),
      error: (e) => this.show(e, true),
    });
  }
  loadMissing() {
    this.api
      .get<any>('/attendance/missing', {
        AttendanceDate: this.date.value!,
        Session: this.session.value!,
      })
      .subscribe({ next: (r) => this.missing.set(r.data), error: (e) => this.show(e, true) });
  }
  approve(row: any) {
    this.api
      .post<any>(`/attendance/corrections/${row.AttendanceCorrectionId}/approve`, {})
      .subscribe({
        next: (r) => {
          this.show(r, false);
          this.loadCorrections();
          this.loadReport();
        },
        error: (e) => this.show(e, true),
      });
  }
  async reject(row: any) {
    const notes = await this.dialog.prompt('Reason for rejection');
    if (!notes) return;
    this.api
      .post<any>(`/attendance/corrections/${row.AttendanceCorrectionId}/reject`, {
        DecisionNotes: notes,
      })
      .subscribe({
        next: (r) => {
          this.show(r, false);
          this.loadCorrections();
        },
        error: (e) => this.show(e, true),
      });
  }
  show(value: any, error: boolean) {
    this.isError.set(error);
    this.message.set(value.error?.message || value.message || 'Operation failed.');
  }
}

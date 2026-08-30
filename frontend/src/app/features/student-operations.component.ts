import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<header class="page">
      <div>
        <small>STUDENT LIFECYCLE</small>
        <h1>{{ title() }}</h1>
        <p>Tenant-scoped student welfare, family and conduct management.</p>
      </div>
      @if (tab() === 'discipline') {
        <button (click)="drawer.set(true)">＋ Add incident</button>
      }
    </header>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    <nav>
      <a routerLink="/students">All Students</a
      ><a routerLink="/students/inactive" [class.active]="tab() === 'inactive'">Inactive</a
      ><a routerLink="/students/discipline" [class.active]="tab() === 'discipline'">Discipline</a
      ><a routerLink="/students/guardians" [class.active]="tab() === 'guardians'"
        >Parents / Guardians</a
      >
    </nav>
    @if (tab() === 'inactive') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Admission</th>
              <th>Student</th>
              <th>Phone</th>
              <th>Welfare</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of students(); track s.StudentId) {
              <tr>
                <td>{{ s.AdmissionNo }}</td>
                <td>
                  <b>{{ s.FirstName }} {{ s.LastName }}</b>
                </td>
                <td>{{ s.Phone || '—' }}</td>
                <td>{{ s.WelfareStatus }}</td>
                <td>
                  <span class="badge">{{ s.Status }}</span>
                </td>
                <td>
                  <button (click)="reactivate(s)">Reactivate</button>
                  <a [routerLink]="['/students', s.StudentId]">Profile</a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">No inactive students.</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    @if (tab() === 'guardians') {
      <section class="toolbar">
        <input [formControl]="search" placeholder="Search parent name or phone" /><button
          (click)="loadGuardians()"
        >
          Search
        </button>
      </section>
      <section class="cards">
        @for (g of guardians(); track g.GuardianId) {
          <article>
            <h3>{{ g.FullName }}</h3>
            <p>{{ g.PrimaryPhone }} · {{ g.Relationship || 'Guardian' }}</p>
            <small
              >{{ g.Email || 'No email' }} · SMS
              {{ g.SmsConsent ? 'allowed' : 'not allowed' }}</small
            >
            <h4>Linked students</h4>
            @for (s of g.Students; track s.StudentId) {
              <a [routerLink]="['/students', s.StudentId]"
                >{{ s.AdmissionNo }} · {{ s.FirstName }} {{ s.LastName }}</a
              >
            } @empty {
              <span>No linked students</span>
            }
            <button (click)="link(g)">Link another student</button>
          </article>
        } @empty {
          <div class="empty">No guardians found.</div>
        }
      </section>
    }
    @if (tab() === 'discipline') {
      <section class="toolbar">
        <select [formControl]="status">
          <option value="">All statuses</option>
          <option>Open</option>
          <option>Under Review</option>
          <option>Resolved</option>
          <option>Closed</option></select
        ><button (click)="loadDiscipline()">Filter</button>
      </section>
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (d of discipline(); track d.DisciplineRecordId) {
              <tr>
                <td>{{ d.IncidentDate }}</td>
                <td>
                  <b>{{ d.FirstName }} {{ d.LastName }}</b
                  ><small>{{ d.AdmissionNo }}</small>
                </td>
                <td>{{ d.Category }}</td>
                <td>{{ d.Severity }}</td>
                <td>{{ d.Description }}</td>
                <td>
                  <span class="badge">{{ d.Status }}</span>
                </td>
                <td><button (click)="resolve(d)">Update</button></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">No discipline records.</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    @if (drawer()) {
      <aside class="drawer">
        <header>
          <h2>Record discipline incident</h2>
          <button (click)="drawer.set(false)">×</button>
        </header>
        <form [formGroup]="form" (ngSubmit)="saveDiscipline()">
          <label
            >Student<select formControlName="StudentId">
              @for (s of allStudents(); track s.StudentId) {
                <option [value]="s.StudentId">
                  {{ s.AdmissionNo }} · {{ s.FirstName }} {{ s.LastName }}
                </option>
              }
            </select></label
          ><label
            >Branch<select formControlName="BranchId">
              @for (b of branches(); track b.BranchId) {
                <option [value]="b.BranchId">{{ b.Name }}</option>
              }
            </select></label
          >
          <div class="pair">
            <label>Incident date<input type="date" formControlName="IncidentDate" /></label
            ><label>Follow-up date<input type="date" formControlName="FollowUpDate" /></label>
          </div>
          <div class="pair">
            <label>Category<input formControlName="Category" /></label
            ><label
              >Severity<select formControlName="Severity">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select></label
            >
          </div>
          <label>Description<textarea formControlName="Description"></textarea></label
          ><label>Action taken<textarea formControlName="ActionTaken"></textarea></label
          ><button class="primary">Save incident</button>
        </form>
      </aside>
    } `,
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
        margin: 0;
        color: #758392;
      }
      .page > button,
      .primary,
      .toolbar button {
        border: 0;
        background: #211e75;
        color: white;
        border-radius: 7px;
        padding: 10px 14px;
      }
      nav {
        display: flex;
        gap: 5px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 6px;
        margin: 17px 0 10px;
      }
      nav a {
        text-decoration: none;
        color: #687887;
        padding: 9px 12px;
        font-size: 10px;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        background: white;
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      .toolbar input {
        flex: 1;
      }
      .toolbar input,
      .toolbar select {
        padding: 9px;
        border: 1px solid #d8e1e8;
        border-radius: 6px;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .cards article {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 16px;
        display: grid;
      }
      .cards h3 {
        margin: 0;
        color: #174f92;
      }
      .cards p,
      .cards small {
        color: #758392;
      }
      .cards a {
        display: block;
        color: #15549c;
        text-decoration: none;
        font-size: 10px;
        padding: 4px;
      }
      .cards button,
      .card button {
        justify-self: start;
        border: 0;
        background: #e7f0fb;
        color: #15549c;
        padding: 7px 9px;
        border-radius: 6px;
        margin-top: 8px;
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
      td small {
        display: block;
        color: #748391;
      }
      .badge {
        background: #fff1dc;
        color: #a85b00;
        padding: 5px 8px;
        border-radius: 12px;
      }
      .empty {
        text-align: center;
        padding: 50px;
        color: #758392;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      aside {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: min(520px, 100%);
        background: white;
        z-index: 30;
        box-shadow: -10px 0 30px #17324c2d;
        overflow: auto;
      }
      aside header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        background: #211e75;
        color: white;
      }
      aside header button {
        border: 0;
        background: none;
        color: white;
        font-size: 25px;
      }
      aside form {
        padding: 20px;
      }
      aside label {
        display: grid;
        gap: 6px;
        margin: 11px 0;
        font-size: 10px;
        font-weight: 700;
      }
      aside input,
      aside select,
      aside textarea {
        padding: 10px;
        border: 1px solid #d7e0e8;
        border-radius: 7px;
      }
      aside textarea {
        min-height: 65px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }
      @media (max-width: 760px) {
        .cards {
          grid-template-columns: 1fr;
        }
        .pair {
          grid-template-columns: 1fr;
        }
        .page p {
          display: none;
        }
        nav {
          overflow: auto;
        }
      }
    `,
  ],
})
export class StudentOperationsComponent implements OnInit {
  tab = signal('inactive');
  students = signal<any[]>([]);
  allStudents = signal<any[]>([]);
  guardians = signal<any[]>([]);
  discipline = signal<any[]>([]);
  branches = signal<any[]>([]);
  drawer = signal(false);
  message = signal('');
  search = new FormControl('');
  status = new FormControl('');
  form = new FormGroup({
    BranchId: new FormControl<any>(''),
    StudentId: new FormControl<any>(''),
    IncidentDate: new FormControl(new Date().toISOString().slice(0, 10)),
    Category: new FormControl('Conduct'),
    Severity: new FormControl('Low'),
    Description: new FormControl(''),
    ActionTaken: new FormControl(''),
    FollowUpDate: new FormControl(''),
  });
  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
  ) {}
  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.tab.set(data['operation'] || 'inactive');
      this.load();
    });
    this.api.get<any>('/students', { per_page: '100' }).subscribe((r) => {
      this.allStudents.set(r.data);
      this.form.patchValue({ StudentId: r.data[0]?.StudentId });
    });
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      this.form.patchValue({ BranchId: r.data[0]?.BranchId });
    });
  }
  title() {
    return (
      {
        inactive: 'Inactive Students',
        guardians: 'Parents / Guardians',
        discipline: 'Student Discipline',
      } as any
    )[this.tab()];
  }
  load() {
    if (this.tab() === 'inactive')
      this.api
        .get<any>('/students', { Status: 'Inactive', per_page: '100' })
        .subscribe((r) => this.students.set(r.data));
    if (this.tab() === 'guardians') this.loadGuardians();
    if (this.tab() === 'discipline') this.loadDiscipline();
  }
  loadGuardians() {
    this.api
      .get<any>('/guardians', { search: this.search.value || '' })
      .subscribe((r) => this.guardians.set(r.data));
  }
  loadDiscipline() {
    const params: any = {};
    if (this.status.value) params.Status = this.status.value;
    this.api.get<any>('/discipline', params).subscribe((r) => this.discipline.set(r.data));
  }
  reactivate(s: any) {
    const Reason = prompt('Reason for reactivation', 'Returned to school');
    if (Reason)
      this.api
        .post<any>(`/students/${s.StudentId}/status`, { Status: 'Active', Reason })
        .subscribe((r) => {
          this.message.set(r.message);
          this.load();
        });
  }
  link(g: any) {
    const StudentId = Number(prompt('Enter the student ID to link'));
    if (StudentId)
      this.api
        .post<any>(`/guardians/${g.GuardianId}/students`, {
          StudentId,
          IsPrimary: false,
          IsFeeResponsible: false,
        })
        .subscribe((r) => {
          this.message.set(r.message);
          this.loadGuardians();
        });
  }
  saveDiscipline() {
    const v: any = this.form.getRawValue();
    if (!v.FollowUpDate) v.FollowUpDate = null;
    this.api
      .post<any>('/discipline', {
        ...v,
        BranchId: Number(v.BranchId),
        StudentId: Number(v.StudentId),
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.drawer.set(false);
        this.loadDiscipline();
      });
  }
  resolve(d: any) {
    const Status = prompt('Status: Open, Under Review, Resolved or Closed', d.Status);
    const ResolutionNotes = prompt('Resolution / follow-up notes', d.ResolutionNotes || '');
    if (Status)
      this.api
        .put<any>(`/discipline/${d.DisciplineRecordId}`, {
          Status,
          ResolutionNotes,
          ActionTaken: d.ActionTaken,
        })
        .subscribe((r) => {
          this.message.set(r.message);
          this.loadDiscipline();
        });
  }
}

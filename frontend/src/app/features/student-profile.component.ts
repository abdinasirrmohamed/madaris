import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DialogService } from '../core/dialog.service';
import { CurrencyPipe } from '@angular/common';
import { ToastService } from '../core/toast.service';
import { PermissionService } from '../core/permissions/permission.service';
@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe],
  template: `<a routerLink="/students" class="back">← Back to students</a>
    @if (loading()) {
      <div class="state">Loading profile…</div>
    } @else if (profile()) {
      <header class="hero">
        <div class="photo">{{ initials() }}</div>
        <div>
          <small>{{ profile().student.AdmissionNo }}</small>
          <h1>
            {{ profile().student.FirstName }} {{ profile().student.MiddleName }}
            {{ profile().student.LastName }}
          </h1>
          <p>
            {{ profile().student.Gender }} · {{ profile().student.WelfareStatus }} ·
            <b>{{ profile().student.Status }}</b>
          </p>
        </div>
        <span></span><button (click)="mode.set('edit')">Edit student</button
        ><button (click)="mode.set('enroll')">Enroll / Promote</button>
      </header>
      @if (message()) {
        <p class="notice">{{ message() }}</p>
      }
      <section class="actions">
        <button (click)="changeStatus('Inactive')">Mark inactive</button>
        <button (click)="changeStatus('Active')">Reactivate</button>
        <button (click)="transfer()">Transfer student</button>
        <label
          >Upload document
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            (change)="uploadDocument($event)"
        /></label>
      </section>
      <nav>
        <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button
        ><button [class.active]="tab() === 'enrollment'" (click)="tab.set('enrollment')">
          Enrollment history</button
        ><button [class.active]="tab() === 'clearance'" (click)="tab.set('clearance')">
          Clearance & graduation
        </button>
      </nav>
      @if (tab() === 'overview') {
        <section class="grid">
          <article>
            <h3>Personal information</h3>
            <dl>
              <dt>Phone</dt>
              <dd>{{ profile().student.Phone || '—' }}</dd>
              <dt>Address</dt>
              <dd>{{ profile().student.Address || '—' }}</dd>
              <dt>Date of birth</dt>
              <dd>{{ profile().student.DateOfBirth || '—' }}</dd>
              <dt>Admission date</dt>
              <dd>{{ profile().student.AdmissionDate }}</dd>
              <dt>Health notes</dt>
              <dd>{{ profile().student.HealthNotes || '—' }}</dd>
            </dl>
          </article>
          <article>
            <h3>Guardians</h3>
            @for (g of profile().guardians; track g.GuardianId) {
              <div class="guardian">
                <b>{{ g.FullName }}</b
                ><span>{{ g.Relationship }} · {{ g.PrimaryPhone }}</span
                ><small
                  >{{ g.IsPrimary ? 'Primary guardian' : '' }}
                  {{ g.IsFeeResponsible ? '· Fee responsible' : '' }}</small
                >
              </div>
            } @empty {
              <p>No guardian linked.</p>
            }
          </article>
          <article>
            <h3>Lacagaha ardayga</h3>
            @for (invoice of profile().invoices; track invoice.InvoiceId) {
              <div class="guardian invoice-row">
                <b>{{ invoice.InvoiceNo }} · {{ invoice.FeeTypeName || 'School fee' }}</b
                ><span
                  >Wadarta {{ invoice.Total | currency: 'USD' }} · La bixiyey
                  {{ invoice.PaidAmount | currency: 'USD' }} · Hadhaaga
                  {{ invoice.Balance | currency: 'USD' }}</span
                ><small>{{ invoice.DueDate }} · {{ invoice.PaymentStatus }}</small>
                @if (invoice.Balance > 0 && permissions.has('sms.send_individual')) {
                  <button (click)="openFeeReminder(invoice)">Send Fee Reminder</button>
                }
              </div>
            } @empty {
              <p>Wax lacag ah lama diiwaangelin.</p>
            }
          </article>
          <article>
            <h3>Documents</h3>
            @for (d of profile().documents; track d.StudentDocumentId) {
              <a
                class="document"
                [href]="'/api/v1/students/' + id + '/documents/' + d.StudentDocumentId"
                >{{ d.DocumentType }} · {{ d.OriginalName }}</a
              >
            } @empty {
              <p>No documents uploaded.</p>
            }
          </article>
          <article>
            <h3>Transfer history</h3>
            @for (t of profile().transfers; track t.StudentTransferId) {
              <div class="guardian">
                <b>{{ t.TransferDate }} · {{ t.Status }}</b
                ><span>{{ t.ExternalDestination || 'Branch #' + t.ToBranchId }}</span
                ><small>{{ t.Reason }}</small>
              </div>
            } @empty {
              <p>No transfers recorded.</p>
            }
          </article>
        </section>
      }
      @if (tab() === 'enrollment') {
        <article class="card">
          <h3>Enrollment history</h3>
          <table>
            <thead>
              <tr>
                <th>Academic year</th>
                <th>Class</th>
                <th>Enrolled</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (e of profile().enrollments; track e.EnrollmentId) {
                <tr>
                  <td>{{ e.AcademicYearName }}</td>
                  <td>{{ e.ClassName }}</td>
                  <td>{{ e.EnrolledAt }}</td>
                  <td>{{ e.Status }}</td>
                </tr>
              }
            </tbody>
          </table>
        </article>
      }
      @if (tab() === 'clearance') {
        <section class="grid">
          <article>
            <h3>Graduation clearance</h3>
            <form [formGroup]="clearance">
              <label
                ><input type="checkbox" formControlName="AcademicCleared" /> Academic
                clearance</label
              ><label
                ><input type="checkbox" formControlName="QuranCleared" /> Qur'an clearance</label
              ><label
                ><input type="checkbox" formControlName="FinanceCleared" /> Finance clearance</label
              ><label
                ><input type="checkbox" formControlName="DisciplineCleared" /> Discipline
                clearance</label
              ><label
                ><input type="checkbox" formControlName="AssetsCleared" /> Assets/books
                clearance</label
              ><button (click)="saveClearance()" type="button">Save clearance</button>
            </form>
          </article>
          <article>
            <h3>Graduation</h3>
            @if (profile().graduation) {
              <p>
                Certificate: <b>{{ profile().graduation.CertificateNo }}</b>
              </p>
              <p>Graduated {{ profile().graduation.GraduationDate }}</p>
            } @else {
              <label>Graduation date<input type="date" [formControl]="graduationDate" /></label
              ><button (click)="graduate()">Approve graduation</button>
            }
          </article>
        </section>
      }
      @if (mode()) {
        <aside class="drawer">
          <header>
            <h2>{{ mode() === 'edit' ? 'Edit student' : 'Enrollment / Promotion' }}</h2>
            <button (click)="mode.set(null)">×</button>
          </header>
          @if (mode() === 'edit') {
            <form [formGroup]="editForm">
              <div class="pair">
                <label>First name<input formControlName="FirstName" /></label
                ><label>Middle name<input formControlName="MiddleName" /></label>
              </div>
              <label>Last name<input formControlName="LastName" /></label>
              <div class="pair">
                <label
                  >Gender<select formControlName="Gender">
                    <option>Male</option>
                    <option>Female</option>
                  </select></label
                ><label>Phone<input formControlName="Phone" /></label>
              </div>
              <label>Address<input formControlName="Address" /></label
              ><label
                >Welfare<select formControlName="WelfareStatus">
                  <option>Normal</option>
                  <option>Orphan</option>
                  <option>Vulnerable</option>
                  <option>Sponsored</option>
                </select></label
              ><label
                >Status<select formControlName="Status">
                  <option>Applicant</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Transferred</option>
                  <option>Suspended</option>
                </select></label
              ><button type="button" (click)="saveStudent()">Save student</button>
            </form>
          } @else {
            <form [formGroup]="enrollForm">
              <label
                >Branch<select formControlName="BranchId">
                  @for (b of branches(); track b.BranchId) {
                    <option [value]="b.BranchId">{{ b.Name }}</option>
                  }
                </select></label
              ><label
                >Academic year<select formControlName="AcademicYearId">
                  @for (y of years(); track y.AcademicYearId) {
                    <option [value]="y.AcademicYearId">{{ y.Name }}</option>
                  }
                </select></label
              ><label
                >Class<select formControlName="ClassId">
                  @for (c of classes(); track c.ClassId) {
                    <option [value]="c.ClassId">{{ c.Name }} · {{ c.Capacity }} places</option>
                  }
                </select></label
              ><label>Enrollment date<input type="date" formControlName="EnrolledAt" /></label
              ><button type="button" (click)="enroll()">
                {{ profile().enrollments.length ? 'Promote student' : 'Enroll student' }}
              </button>
            </form>
          }
        </aside>
      }
      @if (reminderInvoice()) {
        <div class="reminder-modal" (click)="reminderInvoice.set(null)">
          <section (click)="$event.stopPropagation()">
            <header>
              <h2>Send Fee Reminder</h2>
              <button (click)="reminderInvoice.set(null)">×</button>
            </header>
            <div class="reminder-body">
              <dl>
                <dt>Ardayga</dt>
                <dd>{{ studentName() }}</dd>
                <dt>Waalidka</dt>
                <dd>{{ feeGuardian()?.FullName || '—' }}</dd>
                <dt>Telefoon</dt>
                <dd>{{ feeGuardian()?.PrimaryPhone || '—' }}</dd>
                <dt>Due date</dt>
                <dd>{{ reminderInvoice().DueDate }}</dd>
                <dt>Wadarta</dt>
                <dd>{{ reminderInvoice().Total | currency: 'USD' }}</dd>
                <dt>La bixiyey</dt>
                <dd>{{ reminderInvoice().PaidAmount | currency: 'USD' }}</dd>
                <dt>Hadhaaga</dt>
                <dd>{{ reminderInvoice().Balance | currency: 'USD' }}</dd>
              </dl>
              <label
                >SMS Template<select
                  [formControl]="reminderTemplate"
                  (change)="previewFeeReminder()"
                >
                  @for (t of smsTemplates(); track t.SmsTemplateId) {
                    <option [value]="t.SmsTemplateId">{{ t.TemplateName }}</option>
                  }
                </select></label
              ><label
                >Fariinta hordhaceeda<textarea
                  rows="6"
                  readonly
                  [value]="reminderPreview()"
                ></textarea
                ><small>{{ reminderPreview().length }} xaraf</small></label
              >
              @if (!feeGuardian()?.PrimaryPhone) {
                <p class="validation">Waalidku ma laha telefoon; SMS lama diri karo.</p>
              }
              <footer>
                <button (click)="reminderInvoice.set(null)">Jooji</button
                ><button
                  class="send"
                  [disabled]="!feeGuardian()?.PrimaryPhone || !reminderTemplate.value"
                  (click)="sendFeeReminder()"
                >
                  Dir SMS
                </button>
              </footer>
            </div>
          </section>
        </div>
      }
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .back {
        color: #16539a;
        text-decoration: none;
        font-size: 11px;
      }
      .hero {
        display: flex;
        align-items: center;
        gap: 14px;
        background: linear-gradient(130deg, #211e75, #164e8c);
        color: white;
        border-radius: 10px;
        padding: 22px;
        margin: 12px 0;
      }
      .hero .photo {
        width: 62px;
        height: 62px;
        border-radius: 50%;
        background: white;
        color: #211e75;
        display: grid;
        place-items: center;
        font-size: 20px;
        font-weight: 800;
      }
      .hero h1 {
        margin: 2px 0;
      }
      .hero p {
        margin: 0;
        color: #d7e2f3;
      }
      .hero span {
        flex: 1;
      }
      .hero button,
      .card button,
      article button,
      .drawer button {
        border: 0;
        border-radius: 7px;
        padding: 10px 13px;
      }
      .hero button {
        background: white;
        color: #211e75;
      }
      nav {
        background: white;
        border: 1px solid #dbe4ec;
        border-radius: 8px;
        padding: 6px;
        margin-bottom: 12px;
      }
      nav button {
        border: 0;
        background: none;
        padding: 9px 14px;
        color: #697988;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .grid article,
      .card {
        background: white;
        border: 1px solid #dbe4ec;
        border-radius: 9px;
        padding: 18px;
      }
      .grid h3,
      .card h3 {
        color: #174f92;
        font-size: 13px;
      }
      dl {
        display: grid;
        grid-template-columns: 130px 1fr;
        font-size: 11px;
      }
      dt,
      dd {
        padding: 8px;
        border-bottom: 1px solid #edf1f4;
        margin: 0;
      }
      dt {
        color: #788591;
      }
      .guardian {
        display: grid;
        border-bottom: 1px solid #edf1f4;
        padding: 10px 0;
        font-size: 11px;
      }
      .guardian span,
      .guardian small {
        color: #758490;
        margin-top: 3px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #e8edf2;
        font-size: 11px;
      }
      .grid form label {
        display: block;
        margin: 11px 0;
        font-size: 11px;
      }
      .grid input[type='date'] {
        display: block;
        margin-top: 8px;
        padding: 9px;
      }
      .grid article button {
        background: #211e75;
        color: white;
        margin-top: 10px;
      }
      .drawer {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: 430px;
        background: white;
        z-index: 20;
        box-shadow: -10px 0 30px #17324c2d;
        padding: 20px;
      }
      .drawer header {
        display: flex;
        justify-content: space-between;
      }
      .drawer header button {
        background: none;
        font-size: 25px;
      }
      .drawer label {
        display: grid;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        margin: 12px 0;
      }
      .drawer input,
      .drawer select {
        padding: 10px;
        border: 1px solid #d7e1e9;
        border-radius: 7px;
      }
      .drawer form > button {
        background: #211e75;
        color: white;
        width: 100%;
        margin-top: 12px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .notice {
        background: #e6f8ee;
        color: #147c55;
        padding: 10px;
        border-radius: 7px;
      }
      .actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        margin: 0 0 12px;
      }
      .actions button,
      .actions label {
        border: 1px solid #d7e1e9;
        background: white;
        border-radius: 7px;
        padding: 8px 10px;
        font-size: 10px;
      }
      .actions label {
        cursor: pointer;
      }
      .actions input {
        display: none;
      }
      .document {
        display: block;
        padding: 9px 0;
        border-bottom: 1px solid #edf1f4;
        color: #16539a;
        font-size: 11px;
      }
      .invoice-row button {
        justify-self: start;
        background: #211e75;
        color: white;
        margin-top: 7px;
      }
      .reminder-modal {
        position: fixed;
        inset: 0;
        z-index: 6000;
        display: grid;
        place-items: center;
        padding: 20px;
        background: #10182899;
        backdrop-filter: blur(8px);
      }
      .reminder-modal > section {
        width: min(540px, 100%);
        max-height: calc(100vh - 40px);
        overflow: auto;
        border-radius: 14px;
        background: white;
        box-shadow: 0 30px 90px #0007;
      }
      .reminder-modal header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 22px;
        border-bottom: 1px solid #e2e8ef;
      }
      .reminder-modal h2 {
        margin: 0;
      }
      .reminder-modal header button {
        border: 0;
        background: none;
        font-size: 24px;
      }
      .reminder-body {
        padding: 20px;
      }
      .reminder-body label {
        display: grid;
        gap: 6px;
        margin: 14px 0;
        font-size: 10px;
        font-weight: 700;
      }
      .reminder-body select,
      .reminder-body textarea {
        padding: 10px;
        border: 1px solid #d5dee7;
        border-radius: 8px;
      }
      .reminder-body footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .reminder-body .send {
        background: #211e75;
        color: white;
      }
      .validation {
        padding: 9px;
        border-radius: 7px;
        background: #fff1f2;
        color: #b42318;
        font-size: 10px;
      }
      .state {
        padding: 80px;
        text-align: center;
      }
      @media (max-width: 720px) {
        .grid {
          grid-template-columns: 1fr;
        }
        .hero {
          flex-wrap: wrap;
        }
        .hero span {
          display: none;
        }
        .drawer {
          top: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class StudentProfileComponent implements OnInit {
  private dialog = inject(DialogService);
  id = 0;
  profile = signal<any>(null);
  loading = signal(true);
  tab = signal('overview');
  mode = signal<'edit' | 'enroll' | null>(null);
  reminderInvoice = signal<any>(null);
  smsTemplates = signal<any[]>([]);
  reminderPreview = signal('');
  reminderTemplate = new FormControl<any>('');
  message = signal('');
  branches = signal<any[]>([]);
  years = signal<any[]>([]);
  classes = signal<any[]>([]);
  graduationDate = new FormControl(new Date().toISOString().slice(0, 10));
  clearance = new FormGroup({
    AcademicCleared: new FormControl(false),
    QuranCleared: new FormControl(false),
    FinanceCleared: new FormControl(false),
    DisciplineCleared: new FormControl(false),
    AssetsCleared: new FormControl(false),
    Notes: new FormControl(''),
  });
  editForm = new FormGroup({
    Version: new FormControl(1),
    FirstName: new FormControl(''),
    MiddleName: new FormControl(''),
    LastName: new FormControl(''),
    Gender: new FormControl('Male'),
    DateOfBirth: new FormControl(''),
    Phone: new FormControl(''),
    Address: new FormControl(''),
    HealthNotes: new FormControl(''),
    WelfareStatus: new FormControl('Normal'),
    Status: new FormControl('Active'),
  });
  enrollForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    AcademicYearId: new FormControl<any>(''),
    ClassId: new FormControl<any>(''),
    EnrolledAt: new FormControl(new Date().toISOString().slice(0, 10)),
  });
  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService,
    public permissions: PermissionService,
  ) {}
  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      this.enrollForm.patchValue({ BranchId: r.data[0]?.BranchId });
    });
    this.api.get<any>('/academic/academic-years').subscribe((r) => this.years.set(r.data));
    this.api.get<any>('/academic/classes').subscribe((r) => this.classes.set(r.data));
  }
  load() {
    this.api.get<any>(`/students/${this.id}/profile`).subscribe((r) => {
      this.profile.set(r.data);
      this.loading.set(false);
      this.editForm.patchValue(r.data.student);
      const c = r.data.clearances.at(-1);
      if (c) this.clearance.patchValue(c);
    });
  }
  initials() {
    const s = this.profile().student;
    return s.FirstName[0] + s.LastName[0];
  }
  saveStudent() {
    this.api.put<any>(`/students/${this.id}`, this.editForm.getRawValue()).subscribe((r) => {
      this.message.set(r.message);
      this.mode.set(null);
      this.load();
    });
  }
  enroll() {
    const endpoint = this.profile().enrollments.length ? 'promotions' : 'enrollments';
    this.api
      .post<any>(`/students/${this.id}/${endpoint}`, {
        ...this.enrollForm.getRawValue(),
        BranchId: Number(this.enrollForm.value.BranchId),
        AcademicYearId: Number(this.enrollForm.value.AcademicYearId),
        ClassId: Number(this.enrollForm.value.ClassId),
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.mode.set(null);
        this.load();
      });
  }
  saveClearance() {
    this.api
      .put<any>(`/students/${this.id}/clearance`, this.clearance.getRawValue())
      .subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  graduate() {
    this.api
      .post<any>(`/students/${this.id}/graduation`, { GraduationDate: this.graduationDate.value })
      .subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  async changeStatus(Status: 'Active' | 'Inactive') {
    const Reason = await this.dialog.prompt(`Reason for changing status to ${Status}`);
    if (!Reason) return;
    this.api.post<any>(`/students/${this.id}/status`, { Status, Reason }).subscribe((r) => {
      this.message.set(r.message);
      this.load();
    });
  }
  async transfer() {
    const destination = await this.dialog.prompt(
      'Destination branch ID, or enter 0 for an external school',
      '0',
      'number',
    );
    const ExternalDestination = Number(destination)
      ? null
      : await this.dialog.prompt('External school or destination');
    const Reason = await this.dialog.prompt('Transfer reason');
    if ((!destination && !ExternalDestination) || !Reason) return;
    this.api
      .post<any>(`/students/${this.id}/transfer`, {
        ToBranchId: destination ? Number(destination) : null,
        ExternalDestination,
        TransferDate: new Date().toISOString().slice(0, 10),
        Reason,
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  async uploadDocument(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const DocumentType = await this.dialog.prompt('Document type', 'Student document');
    if (!DocumentType) return;
    const body = new FormData();
    body.append('DocumentType', DocumentType);
    body.append('file', file);
    this.api.post<any>(`/students/${this.id}/documents`, body).subscribe((r) => {
      this.message.set(r.message);
      this.load();
    });
  }
  studentName() {
    const s = this.profile().student;
    return [s.FirstName, s.MiddleName, s.LastName].filter(Boolean).join(' ');
  }
  feeGuardian() {
    return (
      this.profile().guardians.find((g: any) => g.IsFeeResponsible) ||
      this.profile().guardians.find((g: any) => g.IsPrimary) ||
      this.profile().guardians[0]
    );
  }
  openFeeReminder(invoice: any) {
    this.reminderInvoice.set(invoice);
    this.reminderPreview.set('Fariinta waa la diyaarinayaa…');
    this.api.get<any>('/sms/references').subscribe({
      next: (r) => {
        const templates = r.data.Templates || [];
        this.smsTemplates.set(templates);
        this.reminderTemplate.setValue(
          templates.find((t: any) => t.IsDefault)?.SmsTemplateId ||
            templates[0]?.SmsTemplateId ||
            '',
        );
        this.previewFeeReminder();
      },
      error: (e) =>
        this.toast.show(e.error?.message || 'SMS templates lama soo saari karin.', 'error'),
    });
  }
  previewFeeReminder() {
    if (!this.reminderInvoice() || !this.reminderTemplate.value) return;
    this.api
      .post<any>('/sms/preview', {
        InvoiceIds: [this.reminderInvoice().InvoiceId],
        SmsTemplateId: Number(this.reminderTemplate.value),
        CombineSiblings: false,
        MessageType: 'fee_reminder',
        Filters: {},
      })
      .subscribe({
        next: (r) => this.reminderPreview.set(r.data.Messages?.[0]?.MessageBody || ''),
        error: (e) => this.toast.show(e.error?.message || 'Fariinta lama diyaarin karin.', 'error'),
      });
  }
  sendFeeReminder() {
    this.api
      .post<any>('/sms/send-individual-fee-reminder', {
        InvoiceIds: [this.reminderInvoice().InvoiceId],
        SmsTemplateId: Number(this.reminderTemplate.value),
        CombineSiblings: false,
        MessageType: 'fee_reminder',
        Filters: {},
      })
      .subscribe({
        next: (r) => {
          this.toast.show(r.message);
          this.reminderInvoice.set(null);
        },
        error: (e) => this.toast.show(e.error?.message || 'SMS lama diri karin.', 'error'),
      });
  }
}

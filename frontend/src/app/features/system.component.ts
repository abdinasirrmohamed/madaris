import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<header class="page">
      <div>
        <small>SYSTEM ADMINISTRATION</small>
        <h1>{{ title() }}</h1>
        <p>Tenant-scoped configuration, communications, security and reporting.</p>
      </div>
    </header>
    <nav>
      @for (x of tabs; track x.key) {
        <button [class.active]="tab() === x.key" [routerLink]="x.path" (click)="select(x.key)">
          {{ x.label }}
        </button>
      }
    </nav>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    @if (tab() === 'settings') {
      <section class="panel">
        <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
          <div class="grid">
            <label>School name<input formControlName="SchoolName" /></label
            ><label>Phone<input formControlName="Phone" /></label
            ><label>Email<input formControlName="Email" /></label
            ><label>Address<input formControlName="Address" /></label
            ><label>Currency<input formControlName="Currency" /></label
            ><label>Timezone<input formControlName="Timezone" /></label
            ><label
              >Default language<select formControlName="DefaultLanguage">
                <option value="so">Somali</option>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select></label
            ><label
              >Attendance lock hours<input
                type="number"
                formControlName="AttendanceLockHours" /></label
            ><label>Receipt format<input formControlName="ReceiptNumberFormat" /></label
            ><label>Invoice format<input formControlName="InvoiceNumberFormat" /></label
            ><label>Admission format<input formControlName="AdmissionNumberFormat" /></label
            ><label>Certificate format<input formControlName="CertificateNumberFormat" /></label>
          </div>
          <button class="primary">Save settings</button>
        </form>
      </section>
    }
    @if (tab() === 'feedback') {
      <section class="split">
        <form class="panel" [formGroup]="feedbackForm" (ngSubmit)="submitFeedback()">
          <h3>Submit feedback</h3>
          <label
            >Category<select formControlName="Category">
              <option>Suggestion</option>
              <option>Complaint</option>
              <option>Question</option>
              <option>Other</option>
            </select></label
          ><label
            >Priority<select formControlName="Priority">
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select></label
          ><label>Subject<input formControlName="Subject" /></label
          ><label>Description<textarea formControlName="Description"></textarea></label
          ><label class="check"
            ><input type="checkbox" formControlName="IsAnonymous" /> Submit anonymously</label
          ><button class="primary">Submit</button>
        </form>
        <section class="panel">
          <h3>Feedback records</h3>
          @for (f of feedback(); track f.SuggestionId) {
            <article class="item">
              <b>{{ f.Subject }}</b
              ><span>{{ f.Category }} · {{ f.Priority }} · {{ f.Status }}</span>
              <p>{{ f.Description }}</p>
              <button (click)="respond(f)">Respond</button>
            </article>
          } @empty {
            <p>No feedback submitted.</p>
          }
        </section>
      </section>
    }
    @if (tab() === 'sms') {
      <section class="split">
        <form class="panel" [formGroup]="smsForm" (ngSubmit)="queueSms()">
          <h3>Send SMS</h3>
          <label>Recipient phone<input formControlName="RecipientPhone" /></label
          ><label
            >Template<select (change)="useTemplate($event)">
              <option value="">Write custom message</option>
              @for (t of templates(); track t.SmsTemplateId) {
                <option [value]="t.SmsTemplateId">{{ t.TemplateName }}</option>
              }
            </select></label
          ><label>Message<textarea formControlName="MessageBody"></textarea></label
          ><label>Schedule time<input type="datetime-local" formControlName="ScheduledAt" /></label
          ><button class="primary">Queue SMS</button
          ><button type="button" (click)="addTemplate()">Add template</button
          ><button type="button" (click)="provider()">Configure provider</button>
        </form>
        <section class="panel">
          <h3>Delivery records</h3>
          @for (s of smsLogs(); track s.SmsLogId) {
            <article class="item">
              <b>{{ s.RecipientPhone }}</b
              ><span>{{ s.Status }} · attempts {{ s.Attempts }}</span>
              <p>{{ s.MessageBody }}</p>
            </article>
          } @empty {
            <p>No messages queued.</p>
          }
        </section>
      </section>
    }
    @if (tab() === 'reports') {
      <section class="metrics">
        @for (x of reportEntries(); track x[0]) {
          <article>
            <span>{{ x[0] }}</span
            ><strong>{{ x[1] }}</strong
            ><button (click)="exportReport(x[0])">Export CSV</button>
          </article>
        }
      </section>
    }
    @if (tab() === 'users') {
      <section class="split">
        <form class="panel" [formGroup]="userForm" (ngSubmit)="createUser()">
          <h3>Create user</h3>
          <label>Name<input formControlName="Name" /></label
          ><label>Email<input type="email" formControlName="Email" /></label
          ><label>Temporary password<input type="password" formControlName="Password" /></label
          ><label
            >Branch<select formControlName="BranchId">
              @for (b of branches(); track b.BranchId) {
                <option [value]="b.BranchId">{{ b.Name }}</option>
              }
            </select></label
          ><label
            >Role<select formControlName="RoleId">
              <option value="">No role</option>
              @for (r of roles(); track r.RoleId) {
                <option [value]="r.RoleId">{{ r.RoleName }}</option>
              }
            </select></label
          ><button class="primary">Create user</button>
        </form>
        <section class="panel">
          <h3>Users</h3>
          @for (u of users(); track u.UserId) {
            <article class="item">
              <b>{{ u.Name }}</b
              ><span>{{ u.Email }} · {{ u.Status }}</span>
            </article>
          }
        </section>
      </section>
    }
    @if (tab() === 'roles') {
      <section class="split">
        <form class="panel" [formGroup]="roleForm" (ngSubmit)="createRole()">
          <h3>Create role</h3>
          <label>Role name<input formControlName="RoleName" /></label>
          <h4>Permissions</h4>
          @for (p of permissions(); track p.PermissionId) {
            <label class="check"
              ><input
                type="checkbox"
                [checked]="selectedPermissions().includes(p.PermissionId)"
                (change)="togglePermission(p.PermissionId)"
              />{{ p.PermissionKey }}</label
            >
          }
          <button class="primary">Create role</button>
        </form>
        <section class="panel">
          <h3>Roles</h3>
          @for (r of roles(); track r.RoleId) {
            <article class="item">
              <b>{{ r.RoleName }}</b
              ><span>{{ r.IsSystemRole ? 'System role' : 'Custom role' }}</span>
            </article>
          }
        </section>
      </section>
    }
    @if (tab() === 'audit') {
      <section class="panel table">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th>Request</th>
            </tr>
          </thead>
          <tbody>
            @for (a of audits(); track a.AuditLogId) {
              <tr>
                <td>{{ a.CreatedAt }}</td>
                <td>{{ a.UserName || 'System' }}</td>
                <td>{{ a.Action }}</td>
                <td>{{ a.EntityType }}</td>
                <td>{{ a.EntityId }}</td>
                <td>{{ a.RequestId }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } `,
  styles: [
    `
      :host {
        display: block;
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
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 6px;
        margin: 16px 0 10px;
      }
      nav button {
        border: 0;
        background: none;
        padding: 9px 12px;
        color: #687887;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .panel {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 18px;
      }
      .panel h3 {
        color: #164f92;
      }
      .grid,
      .split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
      label {
        display: grid;
        gap: 5px;
        font-size: 10px;
        font-weight: 700;
        margin: 10px 0;
      }
      input,
      select,
      textarea {
        padding: 9px;
        border: 1px solid #d6e0e8;
        border-radius: 6px;
      }
      textarea {
        min-height: 75px;
      }
      .check {
        display: flex;
        align-items: center;
      }
      .primary {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 10px 14px;
      }
      .item {
        border-bottom: 1px solid #e8edf2;
        padding: 10px 0;
        display: grid;
        font-size: 10px;
      }
      .item span {
        color: #748391;
        margin-top: 4px;
      }
      .item p {
        margin: 5px 0;
      }
      .item button {
        justify-self: start;
        border: 0;
        background: #e8f1fb;
        color: #15549c;
        padding: 5px 8px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .metrics article {
        background: linear-gradient(135deg, #211e75, #155b98);
        color: white;
        border-radius: 9px;
        padding: 18px;
        display: grid;
      }
      .metrics strong {
        font-size: 28px;
        margin: 7px 0;
      }
      .metrics button {
        border: 0;
        border-radius: 5px;
        padding: 6px;
      }
      .table {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 10px;
        border-bottom: 1px solid #edf1f4;
        font-size: 9px;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      @media (max-width: 800px) {
        .grid,
        .split,
        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SystemComponent implements OnInit {
  tabs = [
    { key: 'settings', label: 'Settings', path: '/settings' },
    { key: 'feedback', label: 'Feedback', path: '/feedback' },
    { key: 'sms', label: 'SMS', path: '/sms' },
    { key: 'reports', label: 'Reports', path: '/reports' },
    { key: 'users', label: 'Users', path: '/users' },
    { key: 'roles', label: 'Roles & permissions', path: '/roles-permissions' },
    { key: 'audit', label: 'Audit', path: '/audit' },
  ];
  tab = signal('settings');
  message = signal('');
  feedback = signal<any[]>([]);
  templates = signal<any[]>([]);
  smsLogs = signal<any[]>([]);
  reports = signal<any>({});
  users = signal<any[]>([]);
  roles = signal<any[]>([]);
  permissions = signal<any[]>([]);
  audits = signal<any[]>([]);
  branches = signal<any[]>([]);
  selectedPermissions = signal<number[]>([]);
  settingsForm = new FormGroup({
    SchoolName: new FormControl(''),
    Phone: new FormControl(''),
    Email: new FormControl(''),
    Address: new FormControl(''),
    Currency: new FormControl('USD'),
    Timezone: new FormControl('Africa/Mogadishu'),
    DefaultLanguage: new FormControl('so'),
    ReceiptNumberFormat: new FormControl('RCT-{YYYY}-{SEQ}'),
    InvoiceNumberFormat: new FormControl('INV-{YYYY}-{SEQ}'),
    AdmissionNumberFormat: new FormControl('ADM-{YYYY}-{SEQ}'),
    CertificateNumberFormat: new FormControl('CERT-{YYYY}-{SEQ}'),
    AttendanceLockHours: new FormControl(24),
  });
  feedbackForm = new FormGroup({
    Category: new FormControl('Suggestion'),
    Priority: new FormControl('Normal'),
    Subject: new FormControl(''),
    Description: new FormControl(''),
    IsAnonymous: new FormControl(false),
  });
  smsForm = new FormGroup({
    RecipientPhone: new FormControl(''),
    MessageBody: new FormControl(''),
    ScheduledAt: new FormControl(''),
    SmsTemplateId: new FormControl<any>(null),
  });
  userForm = new FormGroup({
    Name: new FormControl(''),
    Email: new FormControl(''),
    Password: new FormControl(''),
    BranchId: new FormControl<any>(''),
    RoleId: new FormControl<any>(''),
  });
  roleForm = new FormGroup({ RoleName: new FormControl('') });
  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}
  ngOnInit() {
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      this.userForm.patchValue({ BranchId: r.data[0]?.BranchId });
    });
    this.select(this.route.snapshot.data['initialTab'] || 'settings');
  }
  title() {
    return this.tabs.find((x) => x.key === this.tab())?.label;
  }
  select(t: string) {
    this.tab.set(t);
    const map: any = {
      settings: () =>
        this.api.get<any>('/settings').subscribe((r) => this.settingsForm.patchValue(r.data)),
      feedback: () => this.api.get<any>('/feedback').subscribe((r) => this.feedback.set(r.data)),
      sms: () => {
        this.api.get<any>('/sms/templates').subscribe((r) => this.templates.set(r.data));
        this.api.get<any>('/sms/logs').subscribe((r) => this.smsLogs.set(r.data));
      },
      reports: () => this.api.get<any>('/reports').subscribe((r) => this.reports.set(r.data)),
      users: () => {
        this.api.get<any>('/users').subscribe((r) => this.users.set(r.data));
        this.loadRoles();
      },
      roles: () => this.loadRoles(),
      audit: () => this.api.get<any>('/audit-logs').subscribe((r) => this.audits.set(r.data)),
    };
    map[t]?.();
  }
  saveSettings() {
    this.api
      .put<any>('/settings', this.settingsForm.getRawValue())
      .subscribe((r) => this.message.set(r.message));
  }
  submitFeedback() {
    this.api.post<any>('/feedback', this.feedbackForm.getRawValue()).subscribe((r) => {
      this.message.set(r.message);
      this.select('feedback');
    });
  }
  respond(f: any) {
    const Response = prompt('Response');
    const Status = prompt('Status: Assigned, In progress, Resolved or Closed', 'Resolved');
    if (Response && Status)
      this.api.put<any>(`/feedback/${f.SuggestionId}`, { Response, Status }).subscribe((r) => {
        this.message.set(r.message);
        this.select('feedback');
      });
  }
  useTemplate(e: Event) {
    const id = Number((e.target as HTMLSelectElement).value);
    const t = this.templates().find((x) => x.SmsTemplateId === id);
    if (t) this.smsForm.patchValue({ SmsTemplateId: id, MessageBody: t.TemplateBody });
  }
  queueSms() {
    const v: any = this.smsForm.getRawValue();
    if (!v.ScheduledAt) v.ScheduledAt = null;
    this.api.post<any>('/sms/send', v).subscribe((r) => {
      this.message.set(r.message);
      this.select('sms');
    });
  }
  addTemplate() {
    const TemplateName = prompt('Template name'),
      TemplateBody = prompt('Template text');
    if (TemplateName && TemplateBody)
      this.api.post<any>('/sms/templates', { TemplateName, TemplateBody }).subscribe((r) => {
        this.message.set(r.message);
        this.select('sms');
      });
  }
  provider() {
    const ProviderName = prompt('Provider name'),
      ApiKey = prompt('API key'),
      SenderId = prompt('Sender ID');
    if (ProviderName && ApiKey && SenderId)
      this.api
        .put<any>('/sms/settings', { ProviderName, ApiKey, SenderId, IsActive: true })
        .subscribe((r) => this.message.set(r.message));
  }
  reportEntries() {
    return Object.entries(this.reports());
  }
  exportReport(name: string) {
    const rows = [
      [name, 'Count'],
      [name, String(this.reports()[name])],
    ];
    const blob = new Blob([rows.map((x) => x.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  createUser() {
    const v: any = this.userForm.getRawValue();
    this.api
      .post<any>('/users', {
        Name: v.Name,
        Email: v.Email,
        Password: v.Password,
        BranchIds: [Number(v.BranchId)],
        RoleIds: v.RoleId ? [Number(v.RoleId)] : [],
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.select('users');
      });
  }
  loadRoles() {
    this.api.get<any>('/roles').subscribe((r) => {
      this.roles.set(r.data.roles);
      this.permissions.set(r.data.permissions);
    });
  }
  togglePermission(id: number) {
    this.selectedPermissions.update((x) =>
      x.includes(id) ? x.filter((v) => v !== id) : [...x, id],
    );
  }
  createRole() {
    if (!this.roleForm.value.RoleName || !this.selectedPermissions().length) {
      this.message.set('Enter a role name and select at least one permission.');
      return;
    }
    this.api
      .post<any>('/roles', {
        RoleName: this.roleForm.value.RoleName,
        PermissionIds: this.selectedPermissions(),
      })
      .subscribe((r) => {
        this.message.set(r.message);
        this.roleForm.reset();
        this.selectedPermissions.set([]);
        this.select('roles');
      });
  }
}

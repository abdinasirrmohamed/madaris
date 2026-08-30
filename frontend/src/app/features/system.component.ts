import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ActivatedRoute } from '@angular/router';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<header class="page">
      <div>
        <small>SYSTEM ADMINISTRATION</small>
        <h1>{{ title() }}</h1>
        <p>Tenant-scoped configuration, communications, security and reporting.</p>
      </div>
    </header>
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
      <section class="report-hero">
        <div><small>REPORTING CENTER</small><h2>School insights at a glance</h2><p>Explore the information available to your role and export it when needed.</p></div>
        <button (click)="exportAllReports()">⇩ Export summary</button>
      </section>
      <section class="report-filters">
        <label>Branch<select [formControl]="reportBranch"><option value="">All branches</option>@for (b of branches(); track b.BranchId) {<option [value]="b.BranchId">{{ b.Name }}</option>}</select></label>
        <label>From date<input type="date" [formControl]="reportFrom" /></label>
        <label>To date<input type="date" [formControl]="reportTo" /></label>
        <button class="primary" (click)="loadReports()">Apply filters</button>
      </section>

      <section class="report-stats">
        <article><i class="blue">▥</i><div><span>Total records</span><strong>{{ reportTotal() }}</strong><small>Across accessible datasets</small></div></article>
        <article><i class="green">✓</i><div><span>Available reports</span><strong>{{ reportEntries().length }}</strong><small>Based on your permissions</small></div></article>
        <article><i class="purple">↗</i><div><span>Largest dataset</span><strong>{{ largestReport()[1] }}</strong><small>{{ reportLabel(largestReport()[0]) }}</small></div></article>
        <article><i class="orange">◷</i><div><span>Date range</span><strong class="range">{{ reportRange() }}</strong><small>Current reporting period</small></div></article>
      </section>

      <section class="report-dashboard">
        <article class="chart-card">
          <header><div><small>DATA DISTRIBUTION</small><h3>Records by report</h3></div><span>Live data</span></header>
          <div class="bar-chart">
            @for (entry of reportEntries(); track entry[0]) {
              <div class="bar-row"><label>{{ reportLabel(entry[0]) }}</label><div class="track"><i [style.width.%]="barWidth(entry[1])" [style.background]="reportColor(entry[0])"></i></div><b>{{ entry[1] }}</b></div>
            } @empty { <div class="chart-empty">No report data is available for the selected filters.</div> }
          </div>
        </article>
        <article class="overview-card">
          <header><small>OVERVIEW</small><h3>Dataset coverage</h3></header>
          <div class="donut" [style.background]="donutBackground()"><div><strong>{{ reportEntries().length }}</strong><span>Reports</span></div></div>
          <div class="legend"><span><i></i>Operational records</span><span><i></i>Role-filtered access</span></div>
        </article>
      </section>

      <section class="report-list">
        <header><div><small>REPORT CATALOG</small><h3>All available reports</h3></div><label class="report-search">⌕ <input [formControl]="reportSearch" placeholder="Search reports" /></label></header>
        <div class="report-table">
          <div class="report-row report-head"><span>Report</span><span>Category</span><span>Records</span><span>Share</span><span>Action</span></div>
          @for (entry of filteredReportEntries(); track entry[0]) {
            <div class="report-row">
              <div class="report-name"><i [style.background]="reportColor(entry[0])">{{ reportIcon(entry[0]) }}</i><div><b>{{ reportLabel(entry[0]) }}</b><small>{{ reportDescription(entry[0]) }}</small></div></div>
              <span class="category">{{ reportCategory(entry[0]) }}</span><strong>{{ entry[1] }}</strong>
              <div class="mini-progress"><i [style.width.%]="barWidth(entry[1])" [style.background]="reportColor(entry[0])"></i></div>
              <button (click)="exportReport(entry[0])">⇩ CSV</button>
            </div>
          } @empty { <div class="report-empty">No reports match your search.</div> }
        </div>
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
      .report-filters { display:flex; align-items:end; gap:10px; margin-bottom:12px; padding:12px; border:1px solid #dbe5ed; border-radius:9px; background:white; }
      .report-filters label { flex:1; margin:0; }
      .report-filters button { padding:10px 13px; border:1px solid #d4dfe9; border-radius:7px; background:white; }
      .report-filters .primary { background:#211e75; color:white; }
      .report-hero { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:14px; padding:23px 26px; border-radius:15px; color:white; background:linear-gradient(120deg,#171554,#25218b 58%,#087b83); box-shadow:0 12px 30px #17245a22; }
      .report-hero::after { content:''; position:absolute; width:210px; height:210px; right:10%; border:35px solid #ffffff08; border-radius:50%; }
      .report-hero>div,.report-hero>button { position:relative; z-index:1; }.report-hero small,.chart-card header small,.overview-card header small,.report-list header small { color:#48d9c5; font-size:8px; font-weight:900; letter-spacing:.15em; }.report-hero h2 { margin:5px 0; font-size:23px; }.report-hero p { margin:0; color:#cbd2ec; font-size:10px; }.report-hero button { padding:10px 14px; border:1px solid #ffffff33; border-radius:8px; background:#ffffff14; color:white; font-size:10px; font-weight:800; }
      .report-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:11px; margin-bottom:12px; }.report-stats article { display:flex; align-items:center; gap:12px; padding:16px; border:1px solid #dfe7ef; border-radius:12px; background:white; box-shadow:0 5px 18px #20374b08; }.report-stats i { width:42px; height:42px; flex:0 0 42px; display:grid; place-items:center; border-radius:12px; color:white; font-style:normal; font-size:17px; }.report-stats .blue{background:#2182e8}.report-stats .green{background:#0aa77f}.report-stats .purple{background:#7145d6}.report-stats .orange{background:#ed8b22}.report-stats span,.report-stats small{display:block;color:#788794;font-size:8px}.report-stats strong{display:block;margin:2px 0;color:#142f4b;font-size:20px}.report-stats strong.range{font-size:11px;line-height:25px}
      .report-dashboard { display:grid; grid-template-columns:minmax(0,2fr) minmax(230px,.75fr); gap:12px; margin-bottom:12px; }.chart-card,.overview-card,.report-list { border:1px solid #dfe7ef; border-radius:13px; background:white; box-shadow:0 5px 18px #20374b08; }.chart-card,.overview-card{padding:18px}.chart-card header,.report-list>header{display:flex;align-items:center;justify-content:space-between}.chart-card h3,.overview-card h3,.report-list h3{margin:4px 0;color:#183756;font-size:14px}.chart-card header>span{padding:5px 8px;border-radius:10px;background:#e8f7f3;color:#087e68;font-size:8px;font-weight:800}.bar-chart{display:grid;gap:11px;margin-top:18px;max-height:255px;overflow:auto;padding-right:4px}.bar-row{display:grid;grid-template-columns:125px minmax(90px,1fr) 38px;align-items:center;gap:10px}.bar-row label{margin:0;color:#52677a;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track,.mini-progress{height:8px;overflow:hidden;border-radius:10px;background:#edf2f6}.track i,.mini-progress i{display:block;height:100%;min-width:3px;border-radius:10px;transition:width .4s ease}.bar-row b{text-align:right;color:#24435e;font-size:10px}.chart-empty,.report-empty{padding:35px;text-align:center;color:#82919e;font-size:10px}
      .overview-card{text-align:center}.overview-card header{text-align:left}.donut{width:145px;height:145px;margin:20px auto 15px;border-radius:50%;display:grid;place-items:center}.donut>div{width:92px;height:92px;border-radius:50%;display:grid;place-content:center;background:white;box-shadow:0 0 0 1px #edf1f5}.donut strong,.donut span{display:block}.donut strong{font-size:27px;color:#172f4b}.donut span{font-size:8px;color:#798894}.legend{display:grid;gap:7px;text-align:left;color:#718190;font-size:8px}.legend i{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#386ee8}.legend span+span i{background:#19b89b}
      .report-list{overflow:hidden}.report-list>header{padding:16px 18px;border-bottom:1px solid #e9eef3}.report-search{height:34px;width:210px;margin:0;padding:0 10px;display:flex;align-items:center;gap:7px;border:1px solid #dce5ec;border-radius:8px;color:#84929e}.report-search input{width:100%;padding:0;border:0;outline:0;font-size:9px}.report-table{overflow:auto}.report-row{min-width:690px;display:grid;grid-template-columns:minmax(220px,1.4fr) 110px 70px minmax(100px,.7fr) 70px;align-items:center;gap:12px;padding:11px 18px;border-bottom:1px solid #edf1f4;font-size:9px}.report-head{color:#7c8996;background:#f8fafc;font-size:8px;font-weight:800;text-transform:uppercase}.report-name{display:flex;align-items:center;gap:10px}.report-name>i{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;color:white;font-style:normal;font-size:14px}.report-name b,.report-name small{display:block}.report-name b{color:#25415b}.report-name small{margin-top:3px;color:#8997a3;font-size:7px}.category{justify-self:start;padding:5px 8px;border-radius:10px;background:#eef3f8;color:#536b80;font-size:8px;font-weight:700}.report-row>button{padding:7px;border:1px solid #d9e3ea;border-radius:7px;background:white;color:#1d5c99;font-size:8px;font-weight:800}.report-row>button:hover{background:#eaf4ff}
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
        .report-stats{grid-template-columns:1fr 1fr}.report-dashboard{grid-template-columns:1fr}.report-filters{flex-wrap:wrap}.report-filters label{min-width:140px}.report-hero{align-items:flex-start;flex-direction:column}.report-search{width:150px}
      }
      @media(max-width:520px){.report-stats{grid-template-columns:1fr}.report-list>header{align-items:flex-start;gap:10px;flex-direction:column}.report-search{width:100%}}
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
  reportBranch = new FormControl<any>('');
  reportFrom = new FormControl('');
  reportTo = new FormControl('');
  reportSearch = new FormControl('');
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
      reports: () => this.loadReports(),
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
  reportEntries(): Array<[string, number]> {
    return Object.entries(this.reports()).map(([name, count]) => [name, Number(count)]);
  }
  filteredReportEntries() {
    const query = (this.reportSearch.value || '').trim().toLowerCase();
    return query ? this.reportEntries().filter(([name]) => this.reportLabel(name).toLowerCase().includes(query) || this.reportCategory(name).toLowerCase().includes(query)) : this.reportEntries();
  }
  reportTotal() {
    return this.reportEntries().reduce((total, [, count]) => total + count, 0);
  }
  largestReport(): [string, number] {
    return this.reportEntries().reduce<[string, number]>((largest, entry) => entry[1] > largest[1] ? entry : largest, ['', 0]);
  }
  barWidth(count: number) {
    const maximum = Math.max(1, ...this.reportEntries().map(([, value]) => value));
    return Math.max(count ? 5 : 0, Math.round((count / maximum) * 100));
  }
  reportRange() {
    if (!this.reportFrom.value && !this.reportTo.value) return 'All time';
    return `${this.reportFrom.value || 'Start'} – ${this.reportTo.value || 'Today'}`;
  }
  reportLabel(name: string) {
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  reportCategory(name: string) {
    if (['Invoices', 'Payments', 'Expenses'].includes(name)) return 'Finance';
    if (['Students', 'Attendance'].includes(name)) return 'Students';
    if (name.startsWith('Quran')) return 'Qur’an';
    if (name === 'Employees') return 'HRM';
    if (name === 'Exams') return 'Examinations';
    if (name === 'SmsLogs') return 'Communication';
    return 'Administration';
  }
  reportDescription(name: string) {
    const descriptions: Record<string, string> = {
      Students: 'Registered student records', Attendance: 'Student attendance entries', QuranAssignments: 'Memorization assignments', QuranAssessments: 'Qur’an assessment results', Invoices: 'Issued fee invoices', Payments: 'Received student payments', Expenses: 'Recorded school expenses', Employees: 'Employee and teacher records', Exams: 'Created examination records', SmsLogs: 'SMS delivery activity', Users: 'System user accounts', AuditLogs: 'Security and activity history',
    };
    return descriptions[name] || 'School operational records';
  }
  reportIcon(name: string) {
    const icons: Record<string, string> = { Students:'♙', Attendance:'✓', QuranAssignments:'☾', QuranAssessments:'★', Invoices:'▤', Payments:'$', Expenses:'↘', Employees:'♟', Exams:'✎', SmsLogs:'✉', Users:'♙', AuditLogs:'◷' };
    return icons[name] || '▥';
  }
  reportColor(name: string) {
    const colors = ['#2878e3','#0ba882','#7146d5','#e58a23','#d84973','#07889a','#4c64c7','#18a1c4'];
    const index = Math.max(0, this.reportEntries().findIndex(([key]) => key === name));
    return colors[index % colors.length];
  }
  donutBackground() {
    return 'conic-gradient(#386ee8 0 62%, #19b89b 62% 88%, #e9eef4 88% 100%)';
  }
  loadReports() {
    const params: any = {};
    if (this.reportBranch.value) params.BranchId = String(this.reportBranch.value);
    if (this.reportFrom.value) params.From = this.reportFrom.value;
    if (this.reportTo.value) params.To = this.reportTo.value;
    this.api.get<any>('/reports', params).subscribe((r) => this.reports.set(r.data));
  }
  exportAllReports() {
    const rows = [['Dataset', 'Count'], ...this.reportEntries().map(([name, count]) => [name, String(count)])];
    this.downloadCsv('madaaris-report-summary.csv', rows);
  }
  exportReport(name: string) {
    const rows = [
      [name, 'Count'],
      [name, String(this.reports()[name])],
    ];
    this.downloadCsv(name + '.csv', rows);
  }
  private downloadCsv(name: string, rows: string[][]) {
    const blob = new Blob([rows.map((x) => x.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
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
        Password_confirmation: v.Password,
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

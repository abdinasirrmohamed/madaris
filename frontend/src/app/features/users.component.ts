import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { DialogService } from '../core/dialog.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <header class="page">
      <div>
        <small>ACCESS CONTROL</small>
        <h1>Users</h1>
        <p>Create school users, assign branches and control their roles.</p>
      </div>
      <div class="head-actions">
        <a routerLink="/roles-permissions">🔒 Roles & Permissions</a
        ><button (click)="openCreate()">⊕ Add New</button>
      </div>
    </header>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    <section class="role-filters">
      <button [class.active]="roleFilter() === 0" (click)="roleFilter.set(0); page.set(1)">
        👥 All
      </button>
      @for (r of roles(); track r.RoleId) {
        <button
          [class.active]="roleFilter() === r.RoleId"
          (click)="roleFilter.set(r.RoleId); page.set(1)"
        >
          {{ r.RoleName }}
        </button>
      }
    </section>
    <section class="card">
      <header>
        <h2>👥 User Accounts</h2>
        <div>
          <button routerLink="/roles-permissions">🔒 Add Permission</button
          ><button class="primary" (click)="openCreate()">⊕ Add New</button>
        </div>
      </header>
      <section class="tools">
        <label
          >Show
          <select [value]="pageSize()" (change)="changePageSize($event)">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          entries</label
        ><label
          >Search:
          <input [value]="searchText()" (input)="changeSearch($event)" placeholder="Name or email"
        /></label>
      </section>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username / Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (u of visibleUsers(); track u.UserId) {
              <tr>
                <td>
                  <b>{{ u.Name }}</b>
                </td>
                <td>{{ u.Email }}</td>
                <td>{{ roleNames(u) }}</td>
                <td>{{ branchNames(u) }}</td>
                <td>
                  <span class="status" [class.off]="u.Status !== 'Active'">✓ {{ u.Status }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button title="Edit" (click)="openEdit(u)">✎</button
                    ><button class="key" title="Reset password" (click)="resetPassword(u)">
                      🔑</button
                    ><button class="toggle" title="Activate or suspend" (click)="toggle(u)">
                      {{ u.Status === 'Active' ? '⏸' : '▶' }}</button
                    ><button class="trash" title="Archive" (click)="archive(u)">■</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">No users match the selected filters.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer>
        <span
          >Showing {{ rangeStart() }} to {{ rangeEnd() }} of {{ filtered().length }} entries</span
        >
        <div>
          <button [disabled]="page() === 1" (click)="page.update((x) => x - 1)">Previous</button
          ><b>{{ page() }}</b
          ><button [disabled]="page() >= pageCount()" (click)="page.update((x) => x + 1)">
            Next
          </button>
        </div>
      </footer>
    </section>
    @if (drawer()) {
      <div class="backdrop" (click)="drawer.set(false)"></div>
      <aside class="drawer">
        <header>
          <div>
            <small>{{ editing() ? 'EDIT USER' : 'NEW USER' }}</small>
            <h2>{{ editing() ? 'Update user account' : 'Create user account' }}</h2>
          </div>
          <button (click)="drawer.set(false)">×</button>
        </header>
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>Full name<input formControlName="Name" /></label
          ><label>Email address<input type="email" formControlName="Email" /></label>
          @if (!editing()) {
            <div class="pair">
              <label>Password<input type="password" formControlName="Password" /><small>Minimum 10 characters</small></label
              ><label
                >Confirm password<input type="password" formControlName="Password_confirmation"
              /><small>Repeat the same password</small></label>
            </div>
          }
          <fieldset>
            <legend>Assigned branches</legend>
            @for (b of branches(); track b.BranchId) {
              <label class="check"
                ><input
                  type="checkbox"
                  [checked]="selectedBranches().includes(b.BranchId)"
                  (change)="toggleBranch(b.BranchId)"
                />{{ b.Name }}</label
              >
            }
          </fieldset>
          <fieldset>
            <legend>Assigned roles</legend>
            @for (r of roles(); track r.RoleId) {
              <label class="check"
                ><input
                  type="checkbox"
                  [checked]="selectedRoles().includes(r.RoleId)"
                  (change)="toggleRole(r.RoleId)"
                />{{ r.RoleName }}</label
              >
            }
          </fieldset>
          @if (formError()) {
            <p class="form-error">{{ formError() }}</p>
          }
          <button class="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save user' }}
          </button>
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
        margin: 0;
        color: #748391;
      }
      .head-actions {
        display: flex;
        gap: 8px;
      }
      .head-actions a,
      .head-actions button,
      .card header button {
        border: 0;
        border-radius: 8px;
        padding: 10px 13px;
        text-decoration: none;
        background: #6e35c7;
        color: white;
        font-size: 10px;
      }
      .head-actions button,
      .card header .primary {
        background: #211e75;
      }
      .role-filters {
        display: flex;
        justify-content: flex-end;
        gap: 7px;
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin: 16px 0;
      }
      .role-filters button {
        border: 0;
        border-radius: 8px;
        padding: 9px 13px;
        background: #43d6bb;
        color: white;
      }
      .role-filters button:nth-child(odd) {
        background: #6e35c7;
      }
      .role-filters .active {
        background: #211e75 !important;
      }
      .card {
        background: white;
        border: 1px solid #e2e7ec;
        border-radius: 8px;
        overflow: hidden;
      }
      .card > header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #211e75;
        color: white;
        padding: 13px 16px;
      }
      .card h2 {
        font-size: 14px;
        margin: 0;
      }
      .card header div {
        display: flex;
        gap: 8px;
      }
      .tools {
        display: flex;
        justify-content: space-between;
        padding: 18px;
        font-size: 10px;
      }
      .tools label {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .tools input,
      .tools select {
        border: 1px solid #d9e0e6;
        border-radius: 5px;
        padding: 8px;
      }
      .tools input {
        width: 190px;
      }
      .table {
        overflow: auto;
        padding: 0 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 13px;
        border-bottom: 1px solid #e8edf1;
        font-size: 10px;
      }
      .status {
        display: inline-block;
        background: #48d1b2;
        color: white;
        border-radius: 15px;
        padding: 6px 9px;
      }
      .status.off {
        background: #f59e0b;
      }
      .actions {
        display: flex;
        gap: 6px;
      }
      .actions button {
        border: 0;
        border-radius: 8px;
        padding: 7px 9px;
        background: #211e75;
        color: white;
      }
      .actions .key {
        background: #f5a313;
      }
      .actions .toggle {
        background: #55c817;
      }
      .actions .trash {
        background: #f52222;
      }
      .empty {
        text-align: center;
        color: #758392;
        padding: 50px;
      }
      .card > footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 17px;
        font-size: 10px;
      }
      .card > footer div {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .card > footer button {
        border: 0;
        background: none;
      }
      .card > footer b {
        background: #fff1dc;
        padding: 8px 11px;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      .form-error {
        margin: 12px 0 0;
        padding: 10px 12px;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fff1f2;
        color: #b42318;
        font-size: 10px;
        font-weight: 700;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: #11182788;
        z-index: 39;
      }
      aside {
        position: fixed;
        right: 0;
        top: 0;
        bottom: 0;
        width: min(500px, 100%);
        background: white;
        z-index: 40;
        overflow: auto;
        box-shadow: -15px 0 40px #10203033;
      }
      aside > header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        background: #211e75;
        color: white;
      }
      aside h2 {
        margin: 4px 0;
      }
      aside header button {
        border: 0;
        background: none;
        color: white;
        font-size: 26px;
      }
      aside form {
        padding: 20px;
      }
      aside label {
        display: grid;
        gap: 6px;
        margin: 12px 0;
        font-size: 10px;
        font-weight: 700;
      }
      aside input {
        padding: 10px;
        border: 1px solid #d7e0e7;
        border-radius: 7px;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }
      fieldset {
        border: 1px solid #dce4ea;
        border-radius: 8px;
        margin: 15px 0;
      }
      legend {
        font-size: 10px;
        font-weight: 800;
      }
      .check {
        display: flex !important;
        align-items: center;
        gap: 8px !important;
      }
      .submit {
        width: 100%;
        border: 0;
        background: #211e75;
        color: white;
        border-radius: 8px;
        padding: 12px;
      }
      @media (max-width: 760px) {
        .page,
        .tools,
        .card > footer {
          align-items: stretch;
          flex-direction: column;
          gap: 10px;
        }
        .head-actions {
          flex-wrap: wrap;
        }
        .role-filters {
          justify-content: flex-start;
          overflow: auto;
        }
        .pair {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UsersComponent implements OnInit {
  private dialog = inject(DialogService);
  users = signal<any[]>([]);
  roles = signal<any[]>([]);
  branches = signal<any[]>([]);
  roleFilter = signal(0);
  page = signal(1);
  drawer = signal(false);
  editing = signal<any>(null);
  saving = signal(false);
  message = signal('');
  formError = signal('');
  selectedBranches = signal<number[]>([]);
  selectedRoles = signal<number[]>([]);
  searchText = signal('');
  pageSize = signal(10);
  form = new FormGroup({
    Name: new FormControl('', Validators.required),
    Email: new FormControl('', [Validators.required, Validators.email]),
    Password: new FormControl('', Validators.minLength(10)),
    Password_confirmation: new FormControl('', Validators.minLength(10)),
  });
  filtered = computed(() => {
    const q = this.searchText().toLowerCase();
    return this.users().filter(
      (u) =>
        (!this.roleFilter() || u.Roles.some((r: any) => r.RoleId === this.roleFilter())) &&
        (!q || u.Name.toLowerCase().includes(q) || u.Email.toLowerCase().includes(q)),
    );
  });
  visibleUsers = computed(() => {
    const size = this.pageSize(),
      start = (this.page() - 1) * size;
    return this.filtered().slice(start, start + size);
  });
  constructor(private api: ApiService, private toasts: ToastService) {}
  ngOnInit() {
    this.load();
    this.api.get<any>('/branches').subscribe((r) => this.branches.set(r.data));
    this.api.get<any>('/roles').subscribe((r) => this.roles.set(r.data.roles));
  }
  load() {
    this.api.get<any>('/users').subscribe((r) => this.users.set(r.data));
  }
  roleNames(u: any) {
    return u.Roles.map((r: any) => r.RoleName).join(', ') || 'No role';
  }
  branchNames(u: any) {
    return u.Branches.map((b: any) => b.Name).join(', ') || 'No branch';
  }
  pageCount() {
    return Math.max(1, Math.ceil(this.filtered().length / this.pageSize()));
  }
  rangeStart() {
    return this.filtered().length ? (this.page() - 1) * this.pageSize() + 1 : 0;
  }
  rangeEnd() {
    return Math.min(this.page() * this.pageSize(), this.filtered().length);
  }
  changeSearch(event: Event) {
    this.searchText.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }
  changePageSize(event: Event) {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(1);
  }
  openCreate() {
    this.editing.set(null);
    this.formError.set('');
    this.form.reset({ Name: '', Email: '', Password: '', Password_confirmation: '' });
    this.selectedBranches.set(this.branches()[0] ? [this.branches()[0].BranchId] : []);
    this.selectedRoles.set(this.roles()[0] ? [this.roles()[0].RoleId] : []);
    this.drawer.set(true);
  }
  openEdit(u: any) {
    this.editing.set(u);
    this.formError.set('');
    this.form.patchValue({ Name: u.Name, Email: u.Email, Password: '', Password_confirmation: '' });
    this.selectedBranches.set(u.Branches.map((b: any) => b.BranchId));
    this.selectedRoles.set(u.Roles.map((r: any) => r.RoleId));
    this.drawer.set(true);
  }
  toggleBranch(id: number) {
    this.selectedBranches.update((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  toggleRole(id: number) {
    this.selectedRoles.update((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  save() {
    this.formError.set('');
    if (this.form.controls.Name.invalid || this.form.controls.Email.invalid) {
      this.formError.set('Enter a valid full name and email address.');
      return;
    }
    if (!this.editing() && this.form.controls.Password.invalid) {
      this.formError.set('Password must contain at least 10 characters.');
      return;
    }
    if (!this.editing() && this.form.controls.Password_confirmation.invalid) {
      this.formError.set('Password confirmation must contain at least 10 characters.');
      return;
    }
    if (!this.selectedBranches().length || !this.selectedRoles().length) {
      this.formError.set('Select at least one branch and one role.');
      return;
    }
    if (!this.editing() && (!this.form.value.Password || !this.form.value.Password_confirmation)) {
      this.formError.set('Enter and confirm a password of at least 10 characters.');
      return;
    }
    if (!this.editing() && this.form.value.Password !== this.form.value.Password_confirmation) {
      this.formError.set('Passwords do not match.');
      return;
    }
    this.saving.set(true);
    const payload: any = {
      ...this.form.getRawValue(),
      BranchIds: this.selectedBranches(),
      RoleIds: this.selectedRoles(),
    };
    const call = this.editing()
      ? this.api.put<any>(`/users/${this.editing().UserId}`, payload)
      : this.api.post<any>('/users', payload);
    call.subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.toasts.show(r.message);
        this.drawer.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => {
        const validation = Object.values(e.error?.errors || {}).flat().join(' ');
        this.formError.set(validation || e.error?.message || 'Unable to save user.');
        this.toasts.show(validation || e.error?.message || 'Unable to save user.', 'error');
        this.saving.set(false);
      },
    });
  }
  async toggle(u: any) {
    const Status = u.Status === 'Active' ? 'Suspended' : 'Active';
    if (await this.dialog.confirm('Change user status', `${Status} ${u.Name}?`))
      this.api.put<any>(`/users/${u.UserId}/status`, { Status }).subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
  async resetPassword(u: any) {
    const Password = await this.dialog.prompt(`New password for ${u.Name} (minimum 10 characters)`, '', 'password');
    if (!Password) return;
    const confirmation = await this.dialog.prompt('Confirm the new password', '', 'password');
    if (Password !== confirmation) {
      this.message.set('Passwords do not match.');
      return;
    }
    this.api
      .put<any>(`/users/${u.UserId}/password`, { Password, Password_confirmation: confirmation })
      .subscribe((r) => this.message.set(r.message));
  }
  async archive(u: any) {
    if (await this.dialog.confirm('Archive user', `Archive ${u.Name}? The user will lose access.`, true))
      this.api.delete<any>(`/users/${u.UserId}`).subscribe((r) => {
        this.message.set(r.message);
        this.load();
      });
  }
}

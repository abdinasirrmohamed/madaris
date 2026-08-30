import { Component, EventEmitter, Output, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { AppLanguage, LanguageService } from '../../core/language.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<header>
    <button class="menu" (click)="toggleMenu.emit()">☰</button
    ><label class="search">⌕ <input placeholder="Search by name" /></label><span class="grow"></span
    ><select class="language" [value]="language.current()" (change)="changeLanguage($event)">
      <option value="so">Soomaali</option><option value="en">English</option><option value="ar">العربية</option>
    </select><span class="version">Version 1.0</span><button class="bell" title="Notifications" (click)="showNotifications()">♧</button>
    <button class="avatar" (click)="openProfile()">@if (auth.user()?.ProfilePhotoUrl) {<img [src]="auth.user()?.ProfilePhotoUrl" alt="Profile" />} @else { {{ initials() }} }</button>
    <button class="user" (click)="openProfile()">
      <b>{{ auth.user()?.Name }}</b
      ><small>{{ auth.user()?.Email }}</small>
    </button>
  </header>
  @if (profileOpen()) {
    <div class="profile-backdrop" (click)="profileOpen.set(false)"></div>
    <aside class="profile-modal">
      <header><div><small>MY PROFILE</small><h2>Edit profile</h2></div><button (click)="profileOpen.set(false)">×</button></header>
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <label class="photo-picker">
          @if (photoPreview() || auth.user()?.ProfilePhotoUrl) {<img [src]="photoPreview() || auth.user()?.ProfilePhotoUrl" alt="Profile preview" />} @else {<span>{{ initials() }}</span>}
          <b>Choose profile photo</b><small>PNG, JPG or WebP · maximum 3 MB</small>
          <input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" />
        </label>
        <label>Full name<input formControlName="Name" /></label>
        <label>Email<input [value]="auth.user()?.Email" disabled /></label>
        @if (profileError()) {<p class="profile-error">{{ profileError() }}</p>}
        <button class="save" [disabled]="profileSaving()">{{ profileSaving() ? 'Saving…' : 'Save profile' }}</button>
      </form>
    </aside>
  }`,
  styles: [
    `
      header {
        height: 44px;
        background: #171541;
        color: white;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
      }
      button {
        border: 0;
        color: white;
      }
      .menu {
        background: #103d57;
        border-radius: 3px;
        padding: 6px 9px;
      }
      .search {
        height: 28px;
        width: 270px;
        border-radius: 7px;
        background: #175a8d;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 8px;
      }
      .search input {
        background: none;
        border: 0;
        outline: 0;
        color: white;
        width: 100%;
        font-size: 10px;
      }
      .grow {
        flex: 1;
      }
      .version {
        font-size: 8px;
      }
      .language {
        border: 1px solid #ffffff38;
        border-radius: 6px;
        padding: 5px 7px;
        background: #25217e;
        color: white;
        font-size: 9px;
        outline: none;
      }
      .bell {
        background: none;
      }
      .avatar {
        width: 27px;
        height: 27px;
        background: #c5265a;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
        padding: 0;
        overflow: hidden;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .user {
        display: grid;
        font-size: 9px;
        padding: 0;
        background: none;
        text-align: left;
      }
      .user small {
        color: #c2c8dd;
      }
      .profile-backdrop { position:fixed; inset:0; z-index:1100; background:#07132980; backdrop-filter:blur(5px); }
      .profile-modal { position:fixed; top:50%; left:50%; z-index:1101; width:min(460px,calc(100vw - 28px)); transform:translate(-50%,-50%); overflow:hidden; border-radius:15px; background:white; color:#18302e; box-shadow:0 25px 80px #06112777; }
      .profile-modal > header { height:auto; padding:17px 20px; background:#211e75; }
      .profile-modal h2 { margin:3px 0 0; font-size:18px; }
      .profile-modal header small { color:#65ddcc; font-size:8px; font-weight:800; }
      .profile-modal header button { margin-left:auto; background:none; font-size:25px; }
      .profile-modal form { padding:20px; }
      .profile-modal form > label:not(.photo-picker) { display:grid; gap:5px; margin-top:13px; font-size:10px; font-weight:700; }
      .profile-modal form > label input { padding:11px; border:1px solid #d6e1ea; border-radius:8px; }
      .photo-picker { display:grid; place-items:center; gap:5px; padding:16px; border:1px dashed #a9bfd3; border-radius:12px; background:#f7fafc; cursor:pointer; text-align:center; }
      .photo-picker img,.photo-picker > span { width:92px; height:92px; border-radius:50%; object-fit:cover; display:grid; place-items:center; background:#211e75; color:white; font-size:25px; font-weight:800; box-shadow:0 7px 20px #17244a2b; }
      .photo-picker small { color:#758392; font-size:8px; }
      .photo-picker input { display:none; }
      .profile-error { padding:9px; border-radius:7px; background:#fff1f2; color:#b42318; font-size:9px; }
      .profile-modal .save { width:100%; margin-top:18px; padding:12px; border-radius:8px; background:#211e75; font-weight:800; }
      @media (max-width: 760px) {
        .search {
          width: 170px;
        }
        .version,
        .user {
          display: none;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();
  profileOpen = signal(false);
  profileSaving = signal(false);
  profileError = signal('');
  photoPreview = signal<string | null>(null);
  private photo: File | null = null;
  profileForm = new FormGroup({ Name: new FormControl('', [Validators.required, Validators.maxLength(150)]) });
  constructor(public auth: AuthService, public language: LanguageService, private api: ApiService, private toasts: ToastService) {}
  changeLanguage(event: Event) {
    this.language.set((event.target as HTMLSelectElement).value as AppLanguage);
  }
  showNotifications() {
    this.toasts.show('You have no new notifications.', 'info');
  }
  initials() {
    return (this.auth.user()?.Name || 'MA')
      .split(' ')
      .map((x) => x[0])
      .slice(0, 2)
      .join('');
  }
  openProfile() {
    this.profileError.set(''); this.photoPreview.set(null); this.photo = null;
    this.profileForm.patchValue({ Name: this.auth.user()?.Name || '' });
    this.profileOpen.set(true);
  }
  selectPhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { this.profileError.set('Profile photo must be 3 MB or smaller.'); return; }
    this.photo = file;
    const reader = new FileReader(); reader.onload = () => this.photoPreview.set(String(reader.result)); reader.readAsDataURL(file);
  }
  saveProfile() {
    if (this.profileForm.invalid) { this.profileError.set('Enter a valid full name.'); return; }
    const body = { Name: this.profileForm.value.Name || '', PhotoBase64: this.photo ? this.photoPreview() : null };
    this.profileSaving.set(true); this.profileError.set('');
    this.api.post<any>('/auth/profile', body).subscribe({
      next: r => { this.profileSaving.set(false); this.auth.updateUser(r.data); this.profileOpen.set(false); this.toasts.show(r.message); },
      error: e => { this.profileSaving.set(false); const validation=Object.values(e.error?.errors||{}).flat().join(' '); this.profileError.set(validation || e.error?.message || 'Unable to update profile.'); },
    });
  }
}

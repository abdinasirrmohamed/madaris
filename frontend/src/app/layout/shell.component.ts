import { Component, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent, ReactiveFormsModule],
  template: `<div class="shell" [class.compact]="collapsed()" [class.mobile-open]="mobileOpen()">
    <div class="overlay" (click)="mobileOpen.set(false)"></div>
    <app-sidebar
      [collapsed]="collapsed()"
      (logout)="auth.logout()"
      (closeMobile)="mobileOpen.set(false)"
    />
    <section>
      <app-header (toggleMenu)="toggleNavigation()" />
      <main><router-outlet /></main>
      <app-footer />
    </section>
    @if (auth.user()?.MustChangePassword) {
      <div class="password-gate">
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <small>SECURITY REQUIRED</small><h2>Change temporary password</h2>
          <p>You must choose a private password before continuing.</p>
          <label>Current password<input type="password" formControlName="CurrentPassword" /></label>
          <label>New password<input type="password" formControlName="Password" /></label>
          <label>Confirm new password<input type="password" formControlName="Password_confirmation" /></label>
          @if (passwordError()) { <p class="password-error">{{ passwordError() }}</p> }
          <button [disabled]="passwordSaving()">{{ passwordSaving() ? 'Saving…' : 'Change password' }}</button>
        </form>
      </div>
    }
    <div class="toast-stack">
      @for (toast of toasts.messages(); track toast.id) {
        <button [class]="toast.kind" (click)="toasts.dismiss(toast.id)">{{ toast.text }} <b>×</b></button>
      }
    </div>
    @if (routeLoading()) {
      <div class="route-loader" aria-live="polite" aria-label="Loading page">
        <div class="loader-card">
          <img src="/assets/branding/madaaris-logo-transparent.png" alt="" />
          <div class="loader-copy"><small>MADAARIS</small><strong>Loading screen… {{ routeProgress() }}%</strong></div>
          <div class="loader-track"><i [style.width.%]="routeProgress()"></i></div>
          <span>Preparing your workspace</span>
        </div>
      </div>
    }
  </div>`,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 232px minmax(0, 1fr);
        min-height: 100vh;
        background: #eff4f8;
        color: #18302e;
        transition: grid-template-columns 0.28s cubic-bezier(.2,.8,.2,1);
      }
      .shell > app-sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        z-index: 30;
      }
      .shell > section {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .compact {
        grid-template-columns: 68px minmax(0, 1fr);
      }
      main {
        padding: 18px;
        flex: 1;
      }
      .overlay {
        display: none;
      }
      .password-gate { position:fixed; inset:0; z-index:3000; display:grid; place-items:center; padding:20px; background:#09132b99; backdrop-filter:blur(7px); }
      .password-gate form { width:min(430px,100%); padding:28px; border-radius:16px; background:white; box-shadow:0 25px 80px #07142b66; }
      .password-gate small { color:#155b98; font-weight:800; }
      .password-gate h2 { margin:5px 0; color:#211e75; }
      .password-gate p { color:#68788a; font-size:11px; }
      .password-gate label { display:grid; gap:5px; margin-top:14px; font-size:10px; font-weight:700; }
      .password-gate input { padding:11px; border:1px solid #d6e0e8; border-radius:8px; }
      .password-gate button { width:100%; margin-top:18px; padding:12px; border:0; border-radius:8px; background:#211e75; color:white; font-weight:800; }
      .password-gate .password-error { padding:9px; border-radius:7px; background:#fff1f2; color:#b42318; }
      .toast-stack { position:fixed; top:58px; right:18px; z-index:4000; display:grid; gap:8px; width:min(360px,calc(100vw - 36px)); }
      .toast-stack button { display:flex; justify-content:space-between; padding:12px 14px; border:0; border-radius:9px; background:#e8f7ef; color:#147a54; box-shadow:0 9px 28px #11243a30; text-align:left; font-size:10px; font-weight:700; }
      .toast-stack button.error { background:#fff1f2; color:#b42318; }
      .toast-stack button.info { background:#e9f4ff; color:#15549c; }
      .route-loader { position:fixed; inset:0; z-index:5000; display:grid; place-items:center; padding:22px; background:rgba(5,10,28,.72); backdrop-filter:blur(7px); animation:loaderFade .16s ease-out; }
      .loader-card { width:min(470px,100%); padding:28px 30px 24px; border:1px solid #ffffff24; border-radius:18px; background:linear-gradient(145deg,#15134b,#211e75); box-shadow:0 28px 90px #0009, inset 0 1px #ffffff1c; color:white; }
      .loader-card img { display:block; width:72px; height:62px; margin:0 auto 8px; object-fit:contain; filter:drop-shadow(0 7px 10px #0008); animation:logoFloat 1.2s ease-in-out infinite alternate; }
      .loader-copy { display:grid; gap:3px; text-align:center; }
      .loader-copy small { color:#52d8c5; font-size:9px; font-weight:800; letter-spacing:.18em; }
      .loader-copy strong { font-size:18px; }
      .loader-track { height:12px; margin:19px 0 10px; padding:2px; overflow:hidden; border:1px solid #50e0ca; border-radius:20px; background:#08072c; box-shadow:0 0 15px #32d8bf44; }
      .loader-track i { position:relative; display:block; height:100%; min-width:6%; overflow:hidden; border-radius:15px; background:linear-gradient(90deg,#25c5b0,#2186d5,#6d3be7); box-shadow:0 0 15px #36ddc8; transition:width .22s ease; }
      .loader-track i::after { content:""; position:absolute; inset:0; background:repeating-linear-gradient(120deg,transparent 0 12px,#ffffff38 12px 20px); animation:loaderStripes .55s linear infinite; }
      .loader-card > span { display:block; color:#bdc7e5; text-align:center; font-size:9px; }
      @keyframes loaderStripes { to { transform:translateX(32px); } }
      @keyframes logoFloat { to { transform:translateY(-4px); } }
      @keyframes loaderFade { from { opacity:0; } }
      @media (prefers-reduced-motion:reduce) { .loader-card img,.loader-track i::after { animation:none; } }
      @media (max-width: 760px) {
        .shell {
          display: block;
        }
        .shell > app-sidebar {
          position: fixed;
          left: -230px;
          top: 0;
          width: 220px;
          transition: left 0.2s;
        }
        .shell.mobile-open > app-sidebar {
          left: 0;
        }
        .mobile-open .overlay {
          display: block;
          position: fixed;
          inset: 0;
          background: #11182788;
          z-index: 20;
        }
        main {
          padding: 12px;
        }
      }
    `,
  ],
})
export class ShellComponent {
  collapsed = signal(false);
  mobileOpen = signal(false);
  passwordSaving = signal(false);
  passwordError = signal('');
  passwordForm = new FormGroup({
    CurrentPassword: new FormControl('', Validators.required),
    Password: new FormControl('', [Validators.required, Validators.minLength(10)]),
    Password_confirmation: new FormControl('', [Validators.required, Validators.minLength(10)]),
  });
  routeLoading = signal(false);
  routeProgress = signal(0);
  private progressTimers: number[] = [];
  constructor(public auth: AuthService, private api: ApiService, public toasts: ToastService, router: Router) {
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) this.startRouteLoader();
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) this.finishRouteLoader();
    });
  }
  toggleNavigation() {
    if (matchMedia('(max-width:760px)').matches) this.mobileOpen.update((x) => !x);
    else this.collapsed.update((x) => !x);
  }
  changePassword() {
    this.passwordError.set('');
    if (this.passwordForm.invalid) { this.passwordError.set('Complete all fields; the new password needs at least 10 characters.'); return; }
    if (this.passwordForm.value.Password !== this.passwordForm.value.Password_confirmation) { this.passwordError.set('New passwords do not match.'); return; }
    this.passwordSaving.set(true);
    this.api.put<any>('/auth/change-password', this.passwordForm.getRawValue()).subscribe({
      next: () => { this.passwordSaving.set(false); this.auth.markPasswordChanged(); this.toasts.show('Password changed successfully.'); },
      error: (e) => { this.passwordSaving.set(false); this.passwordError.set(e.error?.message || 'Unable to change password.'); },
    });
  }
  private startRouteLoader() {
    this.clearProgressTimers();
    this.routeProgress.set(12);
    this.routeLoading.set(true);
    this.progressTimers.push(window.setTimeout(() => this.routeProgress.set(38), 90));
    this.progressTimers.push(window.setTimeout(() => this.routeProgress.set(68), 220));
    this.progressTimers.push(window.setTimeout(() => this.routeProgress.set(86), 420));
  }
  private finishRouteLoader() {
    if (!this.routeLoading()) return;
    this.clearProgressTimers();
    this.routeProgress.set(100);
    this.progressTimers.push(window.setTimeout(() => this.routeLoading.set(false), 220));
  }
  private clearProgressTimers() {
    this.progressTimers.forEach(timer => window.clearTimeout(timer));
    this.progressTimers = [];
  }
}

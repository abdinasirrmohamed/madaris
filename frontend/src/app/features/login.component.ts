import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

// Calm, accessible sign-in experience for desktop and mobile.

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-shell">
      <section class="brand-panel">
        <div class="brand-content">
          <img class="logo" src="/assets/branding/madaaris-logo-transparent.png" alt="Madaaris logo" />
          <p class="kicker">MADARIS SCHOOL SYSTEM</p>
          <h1>Maamul dugsi<br /><span>si fudud.</span></h1>
          <p class="brand-copy">Hal meel uga maamul ardayda, macallimiinta, lacagaha iyo horumarka dugsigaaga.</p>
          <div class="trust"><b>✓</b><p><strong>Ammaan & la isku halayn karo</strong><small>Xogta dugsigaaga si buuxda ayaa loo ilaaliyaa</small></p></div>
        </div>
        <blockquote>“Barashada Qur'aanku waa iftiin.”</blockquote>
      </section>

      <section class="form-panel">
        <div class="mobile-brand"><img src="/assets/branding/madaaris-logo-transparent.png" alt="" /><strong>Madaaris</strong></div>
        <div class="card">
          <header>
            <span class="welcome">👋</span>
            <p class="eyebrow">SOO DHAWOOW</p>
            <h2>Gal akoonkaaga</h2>
            <p class="muted">Geli email-ka iyo password-ka si aad u sii wadato.</p>
          </header>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="email">Email address</label>
            <div class="field" [class.invalid]="form.controls.Email.touched && form.controls.Email.invalid">
              <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
              <input id="email" type="email" formControlName="Email" placeholder="admin@school.so" autocomplete="email" />
            </div>
            @if (form.controls.Email.touched && form.controls.Email.invalid) { <small class="field-error">Fadlan geli email sax ah.</small> }

            <div class="password-title"><label for="password">Password</label><small>Akawnkaaga gaarka ah</small></div>
            <div class="field" [class.invalid]="form.controls.Password.touched && form.controls.Password.invalid">
              <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
              <input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="Password" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="show" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Qari' : 'Muuji' }}</button>
            </div>
            @if (error()) { <div class="error" role="alert"><b>!</b>{{ error() }}</div> }
            <button class="submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <i></i><span>Waa lagu gelinayaa…</span> } @else { <span>Gal dashboard-ka</span><b>→</b> }
            </button>
          </form>
          <p class="secure">◆ &nbsp; Gelitaankaaga waa ammaan oo la ilaaliyay</p>
        </div>
        <footer>© {{ year }} Madaaris · School Management System</footer>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#112d2a}*{box-sizing:border-box}
    .login-shell{min-height:100vh;display:grid;grid-template-columns:minmax(420px,.92fr) minmax(520px,1.08fr);background:#f7faf9;overflow:hidden}
    .brand-panel{position:relative;padding:clamp(42px,7vh,76px) clamp(44px,7vw,104px);color:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:linear-gradient(145deg,#042f2b,#075d54 62%,#087368)}
    .brand-panel:before{content:'';position:absolute;width:460px;height:460px;border:1px solid #ffffff18;border-radius:50%;right:-250px;top:-190px;box-shadow:0 0 0 70px #ffffff08,0 0 0 140px #ffffff05}.brand-panel:after{content:'';position:absolute;inset:auto -10% -25% 15%;height:50%;background:radial-gradient(ellipse,#22c5a62c,transparent 65%)}
    .brand-content,blockquote{position:relative;z-index:1}.logo{width:115px;height:96px;object-fit:contain;filter:drop-shadow(0 12px 18px #001b1880);margin-bottom:32px}.kicker{color:#72dfcf;letter-spacing:.18em;font-size:11px;font-weight:850;margin:0 0 18px}
    h1{font-size:clamp(43px,5vw,68px);letter-spacing:-.055em;line-height:1.04;margin:0}h1 span{color:#e7bd69}.brand-copy{max-width:490px;margin:24px 0 38px;color:#c1ded9;font-size:16px;line-height:1.75}
    .trust{display:flex;gap:14px;align-items:center;padding-top:25px;border-top:1px solid #ffffff1c;max-width:470px}.trust>b{flex:0 0 38px;height:38px;display:grid;place-items:center;border-radius:12px;color:#062f2b;background:#72dfcf}.trust p{margin:0}.trust strong,.trust small{display:block}.trust strong{font-size:13px;margin-bottom:4px}.trust small{color:#94c7c0;font-size:11px}
    blockquote{margin:35px 0 0;padding-left:17px;border-left:3px solid #e7bd69;color:#deece9;font:italic 18px Georgia,serif}
    .form-panel{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px;background:radial-gradient(circle at 100% 0,#0da58b0d,transparent 35%),radial-gradient(circle at 30% 100%,#dba94612,transparent 30%)}.card{width:min(100%,440px);animation:enter .65s cubic-bezier(.2,.8,.2,1) both}
    header{margin-bottom:34px}.welcome{display:grid;place-items:center;width:42px;height:42px;background:#eaf8f5;border-radius:14px;font-size:20px;margin-bottom:20px}.eyebrow{margin:0 0 9px;color:#078274;font-weight:850;letter-spacing:.16em;font-size:11px}.card h2{font-size:34px;letter-spacing:-.04em;margin:0 0 10px;color:#103632}.muted{color:#718783;margin:0;line-height:1.6;font-size:14px}
    form>label,.password-title label{display:block;font-size:13px;font-weight:750;margin:20px 0 9px;color:#294743}.password-title{display:flex;align-items:end;justify-content:space-between;margin-top:21px}.password-title label{margin:0}.password-title small{font-size:10px;color:#94a5a2}
    .field{height:54px;display:flex;align-items:center;gap:11px;border:1px solid #d9e5e2;border-radius:13px;background:#fff;padding:0 15px;transition:.2s}.field:focus-within{border-color:#0b8a7c;box-shadow:0 0 0 4px #0b8a7c16;transform:translateY(-1px)}.field.invalid{border-color:#d85b52}.field svg{width:19px;height:19px;fill:none;stroke:#78908c;stroke-width:1.7}.field input{min-width:0;flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:14px;color:#173a36}.field input::placeholder{color:#a9b8b5}.show{border:0;background:none;color:#087c70;font-size:11px;font-weight:800;cursor:pointer;padding:6px}.field-error{display:block;color:#b23a33;font-size:11px;margin-top:6px}
    .error{display:flex;align-items:center;gap:9px;color:#a72d25;background:#fff0ef;border:1px solid #ffd2ce;padding:11px 13px;border-radius:10px;font-size:12px;margin-top:16px}.error b{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;background:#c8463d;color:#fff}
    .submit{position:relative;width:100%;height:55px;margin-top:27px;padding:0 18px;border:0;border-radius:13px;background:linear-gradient(100deg,#08786d,#079383);box-shadow:0 12px 26px #08786d30;color:#fff;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:.2s}.submit>b{position:absolute;right:19px;font-size:21px}.submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 30px #08786d42}.submit:disabled{opacity:.62;cursor:not-allowed}.submit i{width:18px;height:18px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    .secure{text-align:center;color:#869793;font-size:10px;margin-top:22px}.secure:first-letter{color:#0b9b8b}.mobile-brand{display:none}.form-panel footer{position:absolute;bottom:25px;color:#9aa9a6;font-size:10px}
    @keyframes enter{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.login-shell{grid-template-columns:1fr}.brand-panel{display:none}.form-panel{min-height:100vh;padding:34px 24px 70px}.mobile-brand{display:flex;align-items:center;gap:9px;position:absolute;top:24px;left:26px;color:#075d54}.mobile-brand img{width:43px;height:37px;object-fit:contain}.mobile-brand strong{font-size:18px}.card{margin-top:45px}}
    @media(max-width:480px){.form-panel{padding-inline:20px}.card h2{font-size:30px}header{margin-bottom:28px}.welcome{margin-bottom:14px}.password-title small{display:none}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
  `],
})
export class LoginComponent {
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  readonly year = new Date().getFullYear();
  form = new FormGroup({
    Email: new FormControl('', [Validators.required, Validators.email]),
    Password: new FormControl('', Validators.required),
    DeviceName: new FormControl('Madaaris Web'),
  });
  constructor(private auth: AuthService, private router: Router) {}
  submit() {
    if (this.form.invalid || this.loading()) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.auth.user()?.TenantId === null ? '/platform' : '/dashboard'),
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Gelitaanka ma suurtagelin. Dib u hubi xogtaada.'); },
    });
  }
}

import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <div class="orb"></div>
      <section class="card">
        <header>
          <div class="logo-ring"><img src="/assets/branding/madaaris-logo-transparent.png" alt="Madaaris logo" /></div>
          <p class="brand">MADARIS SCHOOL MANAGEMENT</p>
          <h1>Ku soo dhawoow</h1>
          <p class="intro">Geli xogtaada si aad u gasho nidaamka maamulka dugsiga.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="email">Email-kaaga</label>
          <div class="field" [class.invalid]="form.controls.Email.touched && form.controls.Email.invalid">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 20v-3a6 6 0 0112 0v3"/></svg>
            <input id="email" type="email" formControlName="Email" placeholder="admin@school.so" autocomplete="email" />
          </div>
          @if (form.controls.Email.touched && form.controls.Email.invalid) { <small class="field-error">Fadlan geli email sax ah.</small> }

          <label for="password">Furaha sirta</label>
          <div class="field" [class.invalid]="form.controls.Password.touched && form.controls.Password.invalid">
            <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
            <input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="Password" placeholder="Geli furaha sirta" autocomplete="current-password" />
            <button type="button" class="show" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Qari' : 'Muuji' }}</button>
          </div>

          <label class="remember"><input type="checkbox" /> <span>I xasuuso</span></label>
          @if (error()) { <div class="error" role="alert"><b>!</b><span>{{ error() }}</span></div> }

          <button class="submit" [disabled]="form.invalid || loading()">
            @if (loading()) { <i></i><span>Waa lagu gelinayaa…</span> } @else { <span>Gal Nidaamka</span> }
          </button>
        </form>
      </section>
      <footer>© {{ year }} Madaaris School Management System <span>•</span> Version 1.0</footer>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#10213a}*{box-sizing:border-box}
    .login-page{position:relative;isolation:isolate;min-height:100vh;display:grid;place-items:center;padding:55px 20px 75px;overflow:hidden;background-color:#fbfdff;background-image:linear-gradient(#dbe9fb 1px,transparent 1px),linear-gradient(90deg,#dbe9fb 1px,transparent 1px);background-size:172px 172px}
    .login-page:before,.login-page:after{content:'';position:absolute;z-index:-2;border-radius:50%;filter:blur(1px)}.login-page:before{width:540px;height:540px;background:#e8f2ff;left:50%;top:50%;transform:translate(-50%,-46%)}.login-page:after{width:410px;height:410px;border:1px solid #d6e7fb;left:50%;top:50%;transform:translate(-50%,-46%)}
    .card{position:relative;width:min(100%,500px);min-height:590px;padding:37px 44px 42px;border:1px solid #bcd8f8;border-radius:24px;background:rgba(249,252,255,.92);box-shadow:0 24px 70px #1d64b31a;backdrop-filter:blur(10px);animation:enter .6s cubic-bezier(.2,.8,.2,1) both}
    header{text-align:center}.logo-ring{width:92px;height:92px;margin:0 auto 16px;display:grid;place-items:center;border-radius:50%;background:#fff;box-shadow:0 10px 30px #1d64b315}.logo-ring img{width:80px;height:70px;object-fit:contain;filter:drop-shadow(0 5px 7px #1c3c6b25)}.brand{margin:0 0 21px;color:#1267e8;font-size:10px;font-weight:900;letter-spacing:.03em}h1{margin:0;color:#0e1f39;font-size:31px;letter-spacing:-.045em;text-shadow:0 2px 2px #13345a28}.intro{margin:7px 0 37px;color:#71859e;font-size:11px}
    form>label:not(.remember){display:block;margin:18px 0 8px;color:#49627f;font-size:10px;font-weight:800}.field{height:52px;display:flex;align-items:center;gap:12px;padding:0 15px;border:1px solid #bfd6f5;border-radius:9px;background:#eef5ff;transition:border-color .2s,box-shadow .2s,transform .2s}.field:focus-within{border-color:#2879ed;box-shadow:0 0 0 4px #2879ed18;transform:translateY(-1px)}.field.invalid{border-color:#dc5b55}.field svg{width:18px;height:18px;fill:none;stroke:#1671f4;stroke-width:1.7}.field input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#17385f;font:inherit;font-size:11px}.field input::placeholder{color:#7f98b7}.show{border:0;background:transparent;color:#176bdc;font-size:9px;font-weight:850;cursor:pointer}.remember{display:flex;align-items:center;gap:8px;margin:20px 0 0;color:#6c829d;font-size:9px;font-weight:700}.remember input{appearance:none;width:18px;height:18px;margin:0;border:1px solid #b8d2f3;border-radius:6px;background:white;cursor:pointer}.remember input:checked{background:#2074e9;border-color:#2074e9;box-shadow:inset 0 0 0 4px white}.field-error{display:block;margin-top:5px;color:#b43a32;font-size:9px}.error{display:flex;align-items:center;gap:8px;margin-top:13px;padding:9px 11px;border:1px solid #ffd1ce;border-radius:8px;background:#fff0ef;color:#a72d25;font-size:9px}.error b{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#c9443b;color:white}
    .submit{width:100%;height:53px;margin-top:21px;border:0;border-radius:9px;background:linear-gradient(90deg,#2479ef,#1769df);box-shadow:0 13px 28px #1769df3d;color:white;font:inherit;font-size:11px;font-weight:850;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;transition:transform .2s,box-shadow .2s}.submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 17px 32px #1769df4d}.submit:disabled{opacity:.62;cursor:not-allowed}.submit i{width:17px;height:17px;border:2px solid #ffffff55;border-top-color:white;border-radius:50%;animation:spin .7s linear infinite}
    footer{position:absolute;bottom:24px;color:#7892b3;font-size:8px;text-align:center}footer span{margin:0 9px;color:#9bb5d5}@keyframes enter{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:560px){.login-page{padding:20px 14px 60px;background-size:110px 110px}.card{min-height:0;padding:28px 22px 31px;border-radius:19px}.logo-ring{width:78px;height:78px}.logo-ring img{width:68px;height:61px}h1{font-size:27px}.intro{margin-bottom:27px}footer{bottom:16px}.login-page:before{width:430px;height:430px}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  `],
})
export class LoginComponent {
  loading=signal(false);error=signal('');showPassword=signal(false);readonly year=new Date().getFullYear();
  form=new FormGroup({Email:new FormControl('',[Validators.required,Validators.email]),Password:new FormControl('',Validators.required),DeviceName:new FormControl('Madaaris Web')});
  constructor(private auth:AuthService,private router:Router){}
  submit(){if(this.form.invalid||this.loading()){this.form.markAllAsTouched();return}this.loading.set(true);this.error.set('');this.auth.login(this.form.getRawValue()).subscribe({next:()=>this.router.navigateByUrl(this.auth.user()?.TenantId===null?'/platform':'/dashboard'),error:e=>{this.loading.set(false);this.error.set(e.error?.message||'Gelitaanka ma suurtagelin. Dib u hubi xogtaada.')}})}
}

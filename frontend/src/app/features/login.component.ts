import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<main class="login">
    <section class="brand">
      <img class="mark" src="/assets/branding/madaaris-logo.png" alt="Madaaris logo" />
      <h1>Madaaris</h1>
      <p>Qur'an School Management System</p>
      <blockquote>“Barashada Qur’aanku waa iftiin.”</blockquote>
    </section>
    <section class="card">
      <p class="eyebrow">SOO DHAWOOW</p>
      <h2>Gal akoonkaaga</h2>
      <p class="muted">Enter your school account details to continue.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label
          >Email address<input
            type="email"
            formControlName="Email"
            placeholder="admin@school.so" /></label
        ><label
          >Password<input type="password" formControlName="Password" placeholder="••••••••"
        /></label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button [disabled]="form.invalid || loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }} <span>→</span>
        </button>
      </form>
      <small>Protected by secure tenant isolation</small>
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f4f7f6;
      }
      .login {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
      }
      .brand {
        background: linear-gradient(150deg, #063b38, #0a6159);
        color: white;
        padding: 12vh 10vw;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .mark {
        width: 128px;
        height: 94px;
        object-fit: contain;
        border: 1px solid #62bcae;
        border-radius: 18px;
        background: white;
      }
      .brand h1 {
        font-size: 54px;
        margin: 24px 0 2px;
      }
      .brand p {
        color: #b5d8d3;
      }
      .brand blockquote {
        margin: 80px 0 0;
        border-left: 2px solid #d6ac62;
        padding-left: 20px;
        font-size: 20px;
      }
      .card {
        align-self: center;
        margin: 40px auto;
        padding: 48px;
        width: min(420px, calc(100% - 48px));
        background: white;
        border-radius: 20px;
        box-shadow: 0 16px 50px #1233;
      }
      .eyebrow {
        color: #08756a;
        font-weight: 800;
        letter-spacing: 0.12em;
      }
      .card h2 {
        font-size: 30px;
        margin-bottom: 6px;
      }
      .muted,
      small {
        color: #71807c;
      }
      .card label {
        display: grid;
        gap: 8px;
        margin: 24px 0 0;
        font-weight: 650;
      }
      .card input {
        padding: 14px;
        border: 1px solid #d8e1df;
        border-radius: 10px;
        font: inherit;
      }
      .card button {
        width: 100%;
        margin: 28px 0 20px;
        padding: 15px;
        border: 0;
        border-radius: 10px;
        background: #08756a;
        color: white;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
      }
      .error {
        color: #b42318;
      }
      @media (max-width: 760px) {
        .login {
          grid-template-columns: 1fr;
        }
        .brand {
          display: none;
        }
        .card {
          padding: 30px;
        }
      }
    `,
  ],
})
export class LoginComponent {
  loading = signal(false);
  error = signal('');
  form = new FormGroup({
    Email: new FormControl('', [Validators.required, Validators.email]),
    Password: new FormControl('', Validators.required),
    DeviceName: new FormControl('Madaaris Web'),
  });
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}
  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.message || 'Unable to sign in.');
      },
    });
  }
}

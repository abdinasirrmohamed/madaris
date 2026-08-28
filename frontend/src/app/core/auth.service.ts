import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthenticatedUser } from './auth/models/authenticated-user.model';
import { ApiResponse } from './models/api-response.model';
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthenticatedUser | null>(
    JSON.parse(localStorage.getItem('madaaris_user') || 'null'),
  );
  constructor(
    private api: ApiService,
    private router: Router,
  ) {}
  login(value: unknown) {
    return this.api
      .post<ApiResponse<{ token: string; user: AuthenticatedUser }>>('/auth/login', value)
      .pipe(
        tap((r) => {
          localStorage.setItem('madaaris_token', r.data.token);
          localStorage.setItem('madaaris_user', JSON.stringify(r.data.user));
          this.user.set(r.data.user);
        }),
      );
  }
  logout() {
    this.api
      .post('/auth/logout', {})
      .subscribe({ complete: () => this.clear(), error: () => this.clear() });
  }
  clear() {
    localStorage.removeItem('madaaris_token');
    localStorage.removeItem('madaaris_user');
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }
  token() {
    return localStorage.getItem('madaaris_token');
  }
}

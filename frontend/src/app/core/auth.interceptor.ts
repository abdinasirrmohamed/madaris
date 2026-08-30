import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  return next(
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      : req,
  ).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) auth.clear();
      return throwError(() => error);
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  return user?.TenantId === null && user.Permissions.includes('platform.manage')
    ? true
    : inject(Router).createUrlTree(['/dashboard']);
};

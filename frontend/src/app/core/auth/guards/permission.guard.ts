import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../../permissions/permission.service';
export const permissionGuard: CanActivateFn = (route) => {
  const required = route.data['permission'] as string | undefined;
  return inject(PermissionService).has(required)
    ? true
    : inject(Router).createUrlTree(['/dashboard'], { queryParams: { forbidden: '1' } });
};

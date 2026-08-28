import { Injectable, computed } from '@angular/core';
import { AuthService } from '../auth.service';
@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly permissions = computed(() => this.auth.user()?.Permissions ?? []);
  constructor(private auth: AuthService) {}
  has(permission?: string): boolean {
    if (!permission) return true;
    const values = this.permissions();
    return values.includes('*') || values.includes(permission);
  }
  hasAny(permissions: string[]): boolean {
    return permissions.some((p) => this.has(p));
  }
}

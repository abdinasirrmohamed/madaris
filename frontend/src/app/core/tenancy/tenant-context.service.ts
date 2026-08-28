import { Injectable, computed, signal } from '@angular/core';
import { AuthService } from '../auth.service';
export interface BranchContext {
  BranchId: number;
  Name?: string;
}
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  readonly selectedBranch = signal<BranchContext | null>(null);
  readonly tenantId = computed(() => this.auth.user()?.TenantId ?? null);
  constructor(private auth: AuthService) {}
  selectBranch(branch: BranchContext | null) {
    this.selectedBranch.set(branch);
  }
  clear() {
    this.selectedBranch.set(null);
  }
}

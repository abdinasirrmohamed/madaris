export interface AuthenticatedUser {
  UserId: number;
  TenantId: number;
  Name: string;
  Email: string;
  Status: string;
  Permissions: string[];
  Branches?: Array<{ BranchId: number; Name?: string }>;
}

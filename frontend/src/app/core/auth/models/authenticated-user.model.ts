export interface AuthenticatedUser {
  UserId: number;
  TenantId: number | null;
  Name: string;
  Email: string;
  Status: string;
  Permissions: string[];
  MustChangePassword?: boolean;
  ProfilePhotoUrl?: string | null;
  Branches?: Array<{ BranchId: number; Name?: string }>;
}

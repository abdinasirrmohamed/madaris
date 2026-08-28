# Architecture and database

Requests flow from Angular through `/api/v1` to a small Laravel controller, validation, tenant/branch middleware, service, Eloquent model, and MySQL. `TenantContext` is request-scoped as a singleton. `BelongsToTenant` applies an automatic global scope and supplies `TenantId` on creation. The frontend never selects a tenant ID.

Core tables use PascalCase names and columns. Tenant-owned indexes start with `TenantId`; uniqueness is tenant-relative for admission, invoice, receipt, class, and idempotency numbers. Branch-specific records include `BranchId`. Financial posting locks the invoice and creates the payment plus balance/status update inside one database transaction.

Implemented core schema: `Tenants`, `Branches`, `UserBranches`, `Users`, `AcademicYears`, `Levels`, `Shifts`, `Classes`, `Students`, `Enrollments`, `Attendance`, `QuranAssignments`, `Invoices`, `Payments`, and `AuditLogs`.

The supplied Madaaris MySQL design is incorporated through a second baseline migration covering access control, guardians, discipline, subjects and timetables, HR/teachers, examinations, Qur'an progress, fee details, accounts/expenses, announcements, feedback, and SMS. Where it conflicts with already secured workflows, the application-safe structure is authoritative; the mapping is documented in `database/README.md`.

The broader product brief remains the delivery roadmap. Sidebar items without an implemented route are intentionally non-navigating; they are not presented as completed workflows.

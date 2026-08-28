# Madaaris Current-State Audit and Implementation Roadmap

Date: 2026-08-27

## 1. Audit result

The repository is a working MVP, not an empty project. Existing behavior must be preserved while the architecture is improved incrementally.

### Working foundation

- Separate Angular `frontend/` and Laravel `backend/` applications.
- Sanctum authentication with login, logout and logout-all.
- Server-derived tenant context and branch-access middleware.
- PascalCase business tables and columns.
- Live tenant-scoped dashboard metrics.
- Academic CRUD foundation.
- Student registration, guardians, enrollment capacity, profile, immutable promotion, status, transfer, documents, clearance and graduation.
- Attendance capture, reporting and correction approval.
- Qur’an assignments, assessments and mistake records.
- Invoices, partial payments, receipts, reversals and balanced ledger entries.
- Basic accounts, expenses and transfers.
- Basic examinations, HRM and payroll.
- Users, roles, permissions, settings, feedback, SMS queue records, reports and audit views.
- Angular production build succeeds.
- Laravel suite succeeds: 7 tests and 27 assertions at audit time.

## 2. Structural gaps

### Frontend

- Feature pages are mostly large single-file components rather than page/component/service/model folders.
- The layout is a single shell component instead of header/sidebar/footer/breadcrumb components.
- Users, reports, roles, settings, feedback, SMS and audit share one implementation component even though URLs are separate.
- Missing guest and permission guards.
- Missing tenant context, permission service, notification service and export service.
- Missing typed API, pagination and domain models.
- Route configuration is centralized and not feature-lazy.
- Sidebar entries are incomplete and do not yet filter by permission.
- Somali/English/Arabic translation assets are absent.
- Frontend automated coverage is minimal.

### Backend

- Controllers, services and models remain under generic folders rather than `Core/` and `Domains/`.
- Several controllers contain validation and business logic that should be Requests, Actions and Services.
- Routes remain in one `api.php` rather than domain route files.
- Policies and API Resources are incomplete.
- Permission middleware is applied only to part of the API surface.
- Forgot/reset/change password and optional MFA are not complete.
- Tenant active-state middleware and a reusable branch model trait are absent.
- Audit coverage is not yet universal.
- SMS has a development gateway abstraction but no production vendor adapter.
- Large report exports, signed exports and export auditing are incomplete.

### Domain gaps

- Timetable conflict rules.
- Bulk promotion eligibility and approval.
- Student discipline screens and workflows.
- Parent/guardian directory and shared-guardian linking UI.
- Attendance Sick/Leave states, sessions, absence SMS and missing-submission alerts.
- Full 114-Surah seed and configurable lesson/mistake reference data.
- Exam attendance, approval, locking, reopening and transcript workflows.
- Employee documents, qualifications, assignments and workload.
- Scholarships, discounts, payment allocation, payers and adjustments.
- Deposits, withdrawals, reconciliation and complete payroll posting.
- User password reset, suspension/reactivation and session inspection.
- Detailed filtered PDF/Excel/CSV reports.

### Documentation and deployment gaps

- Requested `docs/` hierarchy is incomplete.
- OpenAPI specification is absent.
- Canonical `database/schema/Madaaris.sql` and separated seed SQL files are absent.
- Docker Compose, Dockerfiles, Nginx, PHP and Supervisor production files are incomplete.
- Backup and restore scripts/procedures require implementation and testing.

## 3. Environment findings

- Backend example environment includes MySQL variables and uses database name `Madaaris` in documentation.
- Local development currently supports SQLite for fast automated tests.
- Production target remains MySQL 8, InnoDB and utf8mb4.
- SMS-provider-specific variables are not yet defined because no production provider has been selected.
- Frontend environment files and a documented production API origin are still required.

## 4. Implementation sequence

### Phase 1 — Core architecture

1. Add Angular typed core models, permission service/guard, tenant context and notification/error handling.
2. Split the shell into sidebar/header/footer components and create a permission-aware navigation model.
3. Introduce feature routes without changing current URLs.
4. Add Laravel `Core/Tenancy`, active-tenant middleware, authorization policies and common API resources.
5. Split route definitions into `routes/modules/` while retaining `/api/v1`.

Exit criteria: login, dashboard and all existing module URLs work; tenant and permission tests still pass.

### Phase 2 — Academic and students

1. Restructure Academic and Students into pages, components, services and models.
2. Complete timetables and conflict detection.
3. Add parent directory, discipline, inactive and graduation pages.
4. Add bulk promotion preview, capacity checks and approval.
5. Extend student profile tabs and signed private downloads.

Exit criteria: full student lifecycle and academic tests pass without history loss.

### Phase 3 — Attendance and Qur’an

1. Complete attendance states, sessions, corrections and alerts.
2. Queue absence SMS messages.
3. Seed all Surahs and configurable Qur’an reference data.
4. Complete memorization views, progress reports and intervention lists.

Exit criteria: duplication, correction, tenant isolation and Qur’an progression tests pass.

### Phase 4 — Finance and accounts

1. Add charges, scholarships, discounts, payer assignment and adjustments.
2. Make payment allocation explicit.
3. Complete deposits, withdrawals, reconciliation and payroll posting.
4. Protect all posted financial records with reversal-only corrections.

Exit criteria: every posted transaction balances and all payment requests are idempotent.

### Phase 5 — Examinations and HRM

1. Add exam attendance, approval, publication, locking, reopening and transcripts.
2. Add employee documents, qualifications, teacher assignments and workload.
3. Complete payroll approval, payment and adjustments.

Exit criteria: mark limits, publication locks and payroll ledger tests pass.

### Phase 6 — Administration and communication

1. Separate Users, Roles, Reports, Settings, Feedback, SMS and Audit into real feature components.
2. Complete reset/change password, suspension, session inspection and optional MFA foundation.
3. Add production SMS gateway configuration and delivery callbacks.
4. Add announcements and tenant branding/languages.

Exit criteria: every menu and API action is permission-controlled and audited.

### Phase 7 — Reports, documentation and deployment

1. Add filtered, queued and audited PDF/Excel/CSV exports.
2. Produce OpenAPI documentation and database reference material.
3. Complete Docker, Nginx, PHP, Supervisor, backup and restore assets.
4. Run security, performance, tenant-isolation and end-to-end acceptance tests.

## 5. Refactoring rules

- Preserve working routes and database history during migration.
- Move one feature at a time; do not scaffold empty domains.
- Keep Laravel as the business and authorization source of truth.
- Never accept a frontend-supplied `TenantId` as authority.
- Do not hard-code tenant, branch, role, academic, account or student identifiers.
- Run Laravel tests and Angular production build after every meaningful batch.
- No module is complete without validation, authorization, tenant isolation, audit coverage and automated tests.

## 6. Immediate implementation batch

The first code batch will implement:

1. Typed Angular auth/API models.
2. Permission service and route guard.
3. Tenant context service.
4. Permission-aware sidebar navigation model.
5. Active-tenant middleware and tests.

This provides the security foundation required before deeper feature separation.

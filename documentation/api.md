# API v1

All protected routes require `Authorization: Bearer <token>` and return `{ success, message, data, meta }`.

- `POST /api/v1/auth/login` — `Email`, `Password`, optional `DeviceName`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/dashboard` — optional branch and academic filters
- `GET /api/v1/students` — `search`, `Status`, `BranchId`, `per_page`
- `POST /api/v1/students` — validated student registration
- `GET /api/v1/students/{id}` — tenant-scoped profile record
- `POST /api/v1/attendance` — class/date/session plus record array; database uniqueness prevents duplicates
- `POST /api/v1/payments` — `InvoiceId`, UUID `IdempotencyKey`, `Amount`, `Method`

Validation failures return 422, authentication failures 401, authorization failures 403, and missing tenant-scoped resources 404.

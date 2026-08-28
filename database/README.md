# Database

The executable schema is maintained as Laravel migrations in `backend/database/migrations`. MySQL must use the `Madaaris` database, InnoDB, and utf8mb4.

The user-supplied MySQL schema was adopted as the module baseline in `2026_08_27_000200_extend_schema_from_provided_baseline.php`. It was adapted instead of executed verbatim because the running API already uses explicit primary keys such as `StudentId`, and because the supplied SQL omitted branches from tenant-owned operational records.

Important mappings:

- Supplied `ClassRooms` maps to the existing `Classes` table.
- Supplied `AttendanceRecords` maps to the existing duplicate-safe `Attendance` table.
- Supplied `Receipts` maps to immutable completed `Payments`; `ReceiptNo` is retained.
- Supplied student `FullName` maps to `FirstName`, `MiddleName`, and `LastName`.
- Supplied tenant `Id` maps to `TenantId` and user `Id` maps to `UserId`.
- Branch-specific operational records gained `BranchId`.
- SMS API credentials are stored as `EncryptedCredentials`, not plaintext `ApiKey`.
- Payment idempotency, invoice row locking, audit request IDs, and tenant-first indexes are retained from the secure application architecture.

The migration adds the supplied RBAC, subjects, lessons, timetables, promotions, guardians, discipline, HR, teachers, examinations, Surah/Qur'an reference structures, discounts, accounts, expenses, announcements, feedback, and SMS structures.

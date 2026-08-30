# Madaaris — Qur'an School Management Platform

Madaaris is a multilingual, multi-tenant school management platform for Qur'an schools. It combines an Angular web application with a Laravel REST API and isolates every school's data by tenant and branch.

## Highlights

- Platform Super Admin for registering, activating and suspending schools
- Isolated tenants, branches, users, roles and permissions
- Role-specific personal dashboards and report access
- Student registration, guardians, enrollment, lifecycle, discipline and graduation
- Academic years, levels, shifts, subjects, lessons, classes and timetables
- Student and employee attendance, corrections and reports
- Qur'an assignments, memorization progress, assessments and mistake reports
- Examinations, schedules, mark sheets, rankings and student cards
- Invoices, fee collection, official receipts, discounts and adjustments
- Accounts, transfers, expenses, payroll and double-entry ledger support
- Reporting dashboard with statistics, charts, search and CSV exports
- Editable profiles, profile photos and forced temporary-password replacement
- Somali, English and Arabic UI with persistent selection and Arabic RTL
- Responsive layout, collapsible sidebar, route loader and toast feedback
- Sanctum authentication, permission enforcement, branch scoping and audit logs

## Technology and requirements

- Angular 22, TypeScript 6 and RxJS 7
- Laravel 12, PHP 8.2+ and Laravel Sanctum
- Node.js 22+, npm and Composer 2
- MySQL 8+ using InnoDB and utf8mb4

PHP requires PDO MySQL, mbstring, openssl, tokenizer, XML, ctype, JSON and fileinfo.

## Installation

```bash
git clone https://github.com/abdinasirrmohamed/madaris.git
cd madaris/backend
composer install
cp .env.example .env
php artisan key:generate
```

Create a MySQL database and update `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=Madaaris
DB_USERNAME=root
DB_PASSWORD=
```

Create the schema and install the frontend:

```bash
php artisan migrate --seed
php artisan storage:link

cd ../frontend
npm install
```

## Platform Super Admin

Set credentials in `backend/.env`. Never commit a real password:

```env
PLATFORM_ADMIN_EMAIL=platform@example.com
PLATFORM_ADMIN_PASSWORD=use-a-strong-unique-password
```

Create or update the platform administrator:

```bash
cd backend
php artisan db:seed --class=Database\\Seeders\\PlatformAdminSeeder --force
```

After login, the platform administrator is redirected to `/platform`. Creating a school automatically provisions its tenant settings, main branch, initial academic year, Tenant Owner role and owner account. The owner must replace the temporary password after first login.

## Running locally

Start the Laravel API on the port expected by the Angular proxy:

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8010
```

In another terminal:

```bash
cd frontend
npm start
```

Open `http://localhost:4200`. The frontend proxies `/api` to `http://127.0.0.1:8010`.

## Verification

```bash
cd backend
php artisan test

cd ../frontend
npm run build
```

The backend suite covers authentication, permissions, tenant isolation, academics, attendance, student lifecycle, finance, Qur'an, examinations, users and platform onboarding.

## Production build

```bash
cd frontend
npm ci
npm run build

cd ../backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Serve `frontend/dist/frontend/browser` as the frontend and `backend/public` as the API web root behind HTTPS. Configure CORS, queue workers, backups and all secrets for the deployment environment.

## Documentation

- [Somali system documentation](documentation/MADAARIS_SYSTEM_DOCUMENTATION_SO.md)
- [Architecture and database notes](documentation/architecture.md)
- [API reference](documentation/api.md)
- [Deployment guide](deployment/README.md)

## Security

- Never commit `.env`, database dumps, API keys or production credentials.
- Use and rotate a unique Platform Super Admin password.
- Keep tenant and branch middleware enabled for school APIs.
- Run migrations and automated tests before deployment.

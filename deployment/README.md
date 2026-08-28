# Deployment

Use PHP 8.3+, MySQL 8, HTTPS, a process supervisor for Laravel queues, and a scheduler entry running `php artisan schedule:run` every minute. Point the web root at `backend/public`; serve `frontend/dist/frontend/browser` as the SPA and proxy `/api` to Laravel.

Set `APP_ENV=production`, `APP_DEBUG=false`, a unique `APP_KEY`, database credentials, trusted frontend origins, mail/SMS credentials, queue and cache stores. Never commit `.env`. Grant the web process write access only to `backend/storage` and `backend/bootstrap/cache`.

After deploying, run migrations in maintenance-safe mode, cache configuration/routes/views, restart queue workers, verify `/up`, perform a tenant-isolation smoke test, and verify backups with a restore drill.

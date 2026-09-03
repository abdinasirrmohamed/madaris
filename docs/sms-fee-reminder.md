# SMS Fee Reminder

The SMS module uses real `Invoices`, `Students`, `StudentGuardians`, `Guardians`, enrollments and academic references. An invoice is eligible only when its backend-calculated balance is greater than zero. Phone numbers are normalized to Somalia's `252XXXXXXXXX` format before queueing.

## Configuration

Copy the `SMS_*` values from `backend/.env.example` into `backend/.env`. Keep `SMS_ENABLED=false` while testing; messages are queued, processed and logged without calling an external provider. For production set the provider URL/key/secret, sender ID, callback URL and a strong webhook secret, then run `php artisan config:clear`.

The generic HTTP adapter sends JSON fields `to`, `message`, `sender_id`, `api_secret`, and `callback_url`, and expects `message_id` in the JSON response. Adapt `HttpSmsGateway` if your provider uses a different contract. Provider secrets are never returned by the settings API.

The delivery callback is `POST /api/v1/sms/provider/webhook`. Providers must send an `X-SMS-Signature` containing the hex HMAC-SHA256 of the raw request body using `SMS_WEBHOOK_SECRET`.

## Workers and scheduler

Run the durable database queue worker:

```sh
php artisan queue:work --queue=default --tries=3
```

Run Laravel's scheduler continuously (or invoke it every minute from cron/Task Scheduler):

```sh
php artisan schedule:work
```

The monthly scheduler uses a distributed cache lock, queues messages in small jobs, prevents duplicate idempotency keys and retries after approximately 1, 5 and 15 minutes, up to the configured maximum.

## Provider connection checklist

1. Keep `SMS_ENABLED=false`, create templates/settings, and test manual, individual and bulk flows.
2. Enter the provider endpoint and credentials only in `backend/.env` (or submit a new API key through the protected settings screen).
3. Configure the provider callback URL and webhook secret.
4. Start the queue worker and scheduler.
5. Set `SMS_ENABLED=true`, clear cached config, send a test SMS, and verify `sent` then `delivered` in SMS History.

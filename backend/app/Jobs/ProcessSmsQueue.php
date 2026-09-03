<?php

namespace App\Jobs;

use App\Contracts\SmsGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProcessSmsQueue implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [60, 300, 900];

    public function __construct(public int $smsQueueId, public bool $force = false) {}

    public function handle(SmsGateway $gateway): void
    {
        $row = DB::transaction(function () {
            $q = DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->lockForUpdate()->first();
            if (! $q || ! in_array($q->Status, ['queued', 'retrying', 'failed'], true)) {
                return null;
            }

            // If not forced, check if scheduled for the future (allow 60 seconds buffer for clock differences)
            if (! $this->force && $q->ScheduledAt && now()->addSeconds(60)->lt($q->ScheduledAt)) {
                return null;
            }

            DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->update([
                'Status' => 'processing',
                'Attempts' => DB::raw('Attempts + 1'),
                'UpdatedAt' => now(),
            ]);

            DB::table('SmsLogs')->where('SmsQueueId', $this->smsQueueId)->update([
                'Status' => 'processing',
                'UpdatedAt' => now(),
            ]);

            return $q;
        });

        if (! $row) {
            return;
        }

        try {
            $settings = DB::table('SmsSettings')->where('TenantId', $row->TenantId)->first();
            $config = (array) ($settings ?? (object) []);

            if ($settings?->EncryptedCredentials) {
                try {
                    $config['ApiKey'] = Crypt::decryptString($settings->EncryptedCredentials);
                } catch (Throwable) {
                    $config['ApiKey'] = $settings->EncryptedCredentials;
                }
            }

            if ($settings?->ApiSecret) {
                try {
                    $config['ApiSecret'] = Crypt::decryptString($settings->ApiSecret);
                } catch (Throwable) {
                    $config['ApiSecret'] = $settings->ApiSecret;
                }
            }

            $result = $gateway->send($row->RecipientPhone, $row->MessageBody, $config);
            $provider = $settings->ProviderName ?? config('sms.provider', 'SMS Gateway');

            DB::transaction(function () use ($result, $provider) {
                DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->update([
                    'Status' => 'sent',
                    'ProviderMessageId' => $result['provider_id'],
                    'ProviderResponse' => $result['response'],
                    'LastError' => null,
                    'UpdatedAt' => now(),
                ]);

                DB::table('SmsLogs')->where('SmsQueueId', $this->smsQueueId)->update([
                    'Status' => 'sent',
                    'ProviderName' => $provider,
                    'ProviderMessageId' => $result['provider_id'],
                    'ProviderResponse' => $result['response'],
                    'FailedReason' => null,
                    'SentAt' => now(),
                    'UpdatedAt' => now(),
                ]);

                $this->finishJob();
            });
        } catch (Throwable $e) {
            $current = DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->first();
            $attempts = (int) ($current?->Attempts ?? 1);
            $maxAttempts = (int) ($current?->MaximumAttempts ?? 3);
            $final = $attempts >= $maxAttempts || $this->force;
            $delay = [1 => 1, 2 => 5, 3 => 15][$attempts] ?? 15;
            $errorMsg = mb_substr($e->getMessage(), 0, 1000);

            DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->update([
                'Status' => $final ? 'failed' : 'retrying',
                'LastError' => $errorMsg,
                'NextRetryAt' => $final ? null : now()->addMinutes($delay),
                'UpdatedAt' => now(),
            ]);

            DB::table('SmsLogs')->where('SmsQueueId', $this->smsQueueId)->update([
                'Status' => $final ? 'failed' : 'retrying',
                'FailedReason' => $errorMsg,
                'FailedAt' => $final ? now() : null,
                'UpdatedAt' => now(),
            ]);

            $this->finishJob();

            if (! $final && ! $this->force) {
                throw $e;
            }
        }
    }

    private function finishJob(): void
    {
        $jobId = DB::table('SmsQueue')->where('SmsQueueId', $this->smsQueueId)->value('SmsJobId');
        if (! $jobId) {
            return;
        }

        $pending = DB::table('SmsQueue')->where('SmsJobId', $jobId)->whereIn('Status', ['queued', 'processing', 'retrying'])->exists();
        if (! $pending) {
            $failed = DB::table('SmsQueue')->where('SmsJobId', $jobId)->where('Status', 'failed')->exists();
            DB::table('SmsJobs')->where('SmsJobId', $jobId)->update([
                'Status' => $failed ? 'failed' : 'completed',
                'CompletedAt' => now(),
                'UpdatedAt' => now(),
            ]);
        }
    }
}

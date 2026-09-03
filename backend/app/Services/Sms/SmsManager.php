<?php

namespace App\Services\Sms;

use App\Jobs\ProcessSmsQueue;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class SmsManager
{
    public function __construct(private FeeRecipientService $recipients, private SmsTemplateRenderer $renderer) {}

    public function preview(int $tenantId, array $data): array
    {
        $template = $this->template($tenantId, $data['SmsTemplateId'] ?? null, $data['Message'] ?? null);
        $rows = $this->selectedRecipients($tenantId, $data);
        $messages = $this->buildMessages($tenantId, $rows, $template, (bool) ($data['CombineSiblings'] ?? true));
        $segments = array_sum(array_map(fn ($m) => $this->renderer->segments($m['MessageBody']), $messages));
        $cost = (float) (DB::table('SmsSettings')->where('TenantId', $tenantId)->value('EstimatedSegmentCost') ?? 0);

        return ['RecipientCount' => count($messages), 'StudentCount' => count($rows), 'SmsCount' => $segments, 'EstimatedCost' => $cost ? $segments * $cost : null, 'Messages' => $messages, 'Template' => $template];
    }

    public function queueManual(
        int $tenantId,
        int $userId,
        string $phone,
        string $message,
        ?Carbon $scheduled = null,
        string $type = 'general_announcement',
        ?int $studentId = null,
        ?int $guardianId = null,
        ?int $invoiceId = null
    ): array
    {
        $phone = app(PhoneNumberNormalizer::class)->normalize($phone);
        $this->renderer->validate($message);
        $isImmediate = ($scheduled === null || $scheduled->lte(now()->addSeconds(30)));
        $scheduled ??= now();
        $segments = $this->renderer->segments($message);

        return DB::transaction(function () use ($tenantId, $userId, $phone, $message, $scheduled, $type, $segments, $studentId, $guardianId, $invoiceId, $isImmediate) {
            $jobId = DB::table('SmsJobs')->insertGetId(['ReferenceNo' => (string) str()->uuid(), 'TenantId' => $tenantId, 'JobType' => 'manual', 'Status' => 'queued', 'RecipientCount' => 1, 'SmsCount' => $segments, 'ScheduledAt' => $scheduled, 'CreatedByUserId' => $userId, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'SmsJobId');
            $key = 'manual-'.str()->uuid();
            $queueId = DB::table('SmsQueue')->insertGetId([
                'TenantId' => $tenantId,
                'SmsJobId' => $jobId,
                'StudentId' => $studentId,
                'GuardianId' => $guardianId,
                'InvoiceId' => $invoiceId,
                'RecipientPhone' => $phone,
                'MessageBody' => $message,
                'MessageType' => $type,
                'Priority' => 'normal',
                'MaximumAttempts' => config('sms.max_retries', 3),
                'ScheduledAt' => $scheduled,
                'Status' => 'queued',
                'IdempotencyKey' => $key,
                'CreatedByUserId' => $userId,
                'CreatedAt' => now(),
                'UpdatedAt' => now()
            ], 'SmsQueueId');
            DB::table('SmsLogs')->insert([
                'TenantId' => $tenantId,
                'SmsQueueId' => $queueId,
                'SmsJobId' => $jobId,
                'StudentId' => $studentId,
                'GuardianId' => $guardianId,
                'InvoiceId' => $invoiceId,
                'RecipientPhone' => $phone,
                'MessageBody' => $message,
                'MessageType' => $type,
                'Status' => 'queued',
                'Attempts' => 0,
                'IdempotencyKey' => $key,
                'ScheduledAt' => $scheduled,
                'ScheduledAtActual' => $scheduled,
                'CreatedByUserId' => $userId,
                'CreatedAt' => now(),
                'UpdatedAt' => now()
            ]);

            DB::afterCommit(function () use ($queueId, $isImmediate, $scheduled) {
                if ($isImmediate) {
                    try {
                        ProcessSmsQueue::dispatchSync($queueId, true);
                    } catch (Throwable) {
                    }
                } else {
                    ProcessSmsQueue::dispatch($queueId)->delay($scheduled);
                }
            });

            $this->audit($tenantId, $userId, 'Manual SMS queued', $jobId, ['recipient_count' => 1]);

            return ['SmsJobId' => $jobId, 'SmsQueueId' => $queueId, 'SmsCount' => $segments];
        });
    }

    public function queue(int $tenantId, int $userId, array $data, string $jobType = 'fee_reminder'): array
    {
        $settings = DB::table('SmsSettings')->where('TenantId', $tenantId)->first();
        if ($settings && ! $settings->IsActive) {
            throw ValidationException::withMessages(['Sms' => ['SMS module is disabled.']]);
        }
        $preview = $this->preview($tenantId, $data);
        if (! $preview['Messages']) {
            throw ValidationException::withMessages(['Recipients' => ['No eligible recipients selected.']]);
        }
        if (count($preview['Messages']) > config('sms.max_recipients', 5000)) {
            throw ValidationException::withMessages(['Recipients' => ['Maximum recipients per job exceeded.']]);
        }
        $scheduled = isset($data['ScheduledAt']) && $data['ScheduledAt'] ? Carbon::parse($data['ScheduledAt']) : now();
        if ($scheduled->lt(now()->subMinute())) {
            throw ValidationException::withMessages(['ScheduledAt' => ['Scheduled time cannot be in the past.']]);
        }

        return DB::transaction(function () use ($tenantId, $userId, $data, $jobType, $preview, $scheduled, $settings) {
            $jobId = DB::table('SmsJobs')->insertGetId(['ReferenceNo' => (string) str()->uuid(), 'TenantId' => $tenantId, 'BranchId' => $data['BranchId'] ?? null, 'JobType' => $jobType, 'Status' => 'queued', 'Filters' => json_encode(collect($data)->except(['Message'])->all()), 'RecipientCount' => $preview['RecipientCount'], 'SmsCount' => $preview['SmsCount'], 'EstimatedCost' => $preview['EstimatedCost'], 'ScheduledAt' => $scheduled, 'CreatedByUserId' => $userId, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'SmsJobId');
            $queued = [];
            foreach ($preview['Messages'] as $message) {
                $key = $message['IdempotencyKey'];
                $existing = DB::table('SmsQueue')->where('TenantId', $tenantId)->where('IdempotencyKey', $key)->first();
                if ($existing && ! ($data['ForceResend'] ?? false)) {
                    continue;
                }if ($existing) {
                    $key .= '-resend-'.str()->uuid();
                }
                $queueId = DB::table('SmsQueue')->insertGetId(['TenantId' => $tenantId, 'SmsJobId' => $jobId, 'StudentId' => $message['StudentId'], 'GuardianId' => $message['GuardianId'], 'InvoiceId' => $message['InvoiceId'], 'SmsTemplateId' => $data['SmsTemplateId'] ?? null, 'RecipientPhone' => $message['RecipientPhone'], 'MessageBody' => $message['MessageBody'], 'MessageType' => $data['MessageType'] ?? 'fee_reminder', 'Priority' => $data['Priority'] ?? 'normal', 'Attempts' => 0, 'MaximumAttempts' => $settings->MaximumAttempts ?? config('sms.max_retries', 3), 'ScheduledAt' => $scheduled, 'Status' => 'queued', 'IdempotencyKey' => $key, 'CreatedByUserId' => $userId, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'SmsQueueId');
                DB::table('SmsLogs')->insert(['TenantId' => $tenantId, 'SmsQueueId' => $queueId, 'SmsJobId' => $jobId, 'StudentId' => $message['StudentId'], 'GuardianId' => $message['GuardianId'], 'InvoiceId' => $message['InvoiceId'], 'RecipientPhone' => $message['RecipientPhone'], 'MessageBody' => $message['MessageBody'], 'MessageType' => $data['MessageType'] ?? 'fee_reminder', 'Status' => 'queued', 'Attempts' => 0, 'IdempotencyKey' => $key, 'ScheduledAt' => $scheduled, 'ScheduledAtActual' => $scheduled, 'CreatedByUserId' => $userId, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
                $queued[] = $queueId;
            }
            if (! $queued) {
                DB::table('SmsJobs')->where('SmsJobId', $jobId)->update(['Status' => 'cancelled', 'CancelReason' => 'All selected reminders were duplicates.', 'UpdatedAt' => now()]);
                throw ValidationException::withMessages(['Recipients' => ['These reminders were already queued or sent. Use resend with a reason to send again.']]);
            }
            DB::afterCommit(function () use ($queued, $scheduled) {
                $isImmediate = $scheduled->lte(now()->addSeconds(30));
                if ($isImmediate && count($queued) <= 25) {
                    foreach ($queued as $id) {
                        try {
                            ProcessSmsQueue::dispatchSync($id, true);
                        } catch (Throwable) {
                        }
                    }
                } else {
                    collect($queued)->each(fn ($id) => ProcessSmsQueue::dispatch($id)->delay($scheduled));
                }
            });
            $this->audit($tenantId, $userId, 'SMS job created', $jobId, ['recipient_count' => count($queued), 'filters' => $data]);

            return ['SmsJobId' => $jobId, 'QueuedCount' => count($queued), 'SkippedDuplicates' => $preview['RecipientCount'] - count($queued), 'SmsCount' => $preview['SmsCount'], 'EstimatedCost' => $preview['EstimatedCost']];
        });
    }

    private function selectedRecipients(int $tenantId, array $data): array
    {
        $rows = $this->recipients->eligible($tenantId, $data['Filters'] ?? $data);
        $ids = array_map('intval', $data['InvoiceIds'] ?? []);
        if ($ids) {
            $rows = array_values(array_filter($rows, fn ($r) => in_array((int) $r['InvoiceId'], $ids, true)));
        }

        return array_values(array_filter($rows, fn ($r) => $r['SmsEligible'] && (float) $r['RemainingBalance'] > 0 && $r['PaymentStatus'] !== 'paid'));
    }

    private function template(int $tenantId, ?int $templateId, ?string $message): string
    {
        if ($message) {
            $this->renderer->validate($message);

            return $message;
        }$q = DB::table('SmsTemplates')->where('TenantId', $tenantId)->where('IsActive', true);
        $row = $templateId ? (clone $q)->where('SmsTemplateId', $templateId)->first() : (clone $q)->where('TemplateType', 'fee_reminder')->orderByDesc('IsDefault')->first();
        if (! $row) {
            throw ValidationException::withMessages(['SmsTemplateId' => ['An active SMS template is required.']]);
        }

        return $row->TemplateBody;
    }

    private function buildMessages(int $tenantId, array $rows, string $template, bool $combine): array
    {
        $tenant = DB::table('Tenants')->where('TenantId', $tenantId)->first();
        $settings = DB::table('TenantSettings')->where('TenantId', $tenantId)->first();
        if (! $combine) {
            return array_map(fn ($r) => $this->message($r, $this->renderer->render($template, $this->variables($r, $tenant, $settings)), 'student-'.$r['StudentId'].'_fee-'.$r['InvoiceId'].'_'.date('M-Y', strtotime($r['DueDate'])).'_fee-reminder'), $rows);
        }$groups = collect($rows)->groupBy(fn ($r) => $r['GuardianId'].'|'.$r['NormalizedPhone']);

        return $groups->map(function ($children) use ($tenant, $settings) {
            $first = $children->first();
            $lines = $children->values()->map(fn ($r, $i) => ($i + 1).'. '.$r['StudentName'].' — '.number_format($r['RemainingBalance'], 2))->implode("\n");
            $total = $children->sum('RemainingBalance');
            $due = $children->max('DueDate');
            $body = 'Mudane/Marwo '.$first['ParentName'].", waxaa ku maqan lacagaha:\n".$lines."\nWadarta: ".number_format($total, 2).".\nFadlan bixi kahor ".$due.".\nMahadsanid — ".($settings->SchoolName ?? $tenant->Name).'.';
            $ids = $children->pluck('InvoiceId')->sort()->implode('-');

            return $this->message($first, $body, 'parent-'.$first['GuardianId'].'_fees-'.$ids.'_fee-reminder');
        })->values()->all();
    }

    private function message(array $r, string $body, string $key): array
    {
        return ['StudentId' => $r['StudentId'], 'GuardianId' => $r['GuardianId'], 'InvoiceId' => $r['InvoiceId'], 'RecipientPhone' => $r['NormalizedPhone'], 'MessageBody' => $body, 'IdempotencyKey' => strtolower(str_replace(' ', '-', $key))];
    }

    private function variables(array $r, object $tenant, ?object $settings): array
    {
        return ['school_name' => $settings->SchoolName ?? $tenant->Name, 'school_phone' => $settings->Phone ?? '', 'parent_name' => $r['ParentName'], 'student_name' => $r['StudentName'], 'admission_number' => $r['AdmissionNo'], 'class_name' => $r['ClassName'], 'fee_type' => $r['FeeTypeName'], 'month' => date('F', strtotime($r['DueDate'])), 'year' => date('Y', strtotime($r['DueDate'])), 'total_fee' => number_format($r['Total'], 2), 'paid_amount' => number_format($r['PaidAmount'], 2), 'amount_due' => number_format($r['RemainingBalance'], 2), 'remaining_amount' => number_format($r['RemainingBalance'], 2), 'due_date' => $r['DueDate'], 'payment_status' => $r['PaymentStatus']];
    }

    private function audit(int $tenantId, int $userId, string $action, int $id, array $data): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenantId, 'UserId' => $userId, 'Action' => $action, 'EntityType' => 'SmsJobs', 'EntityId' => (string) $id, 'AfterData' => json_encode($data), 'IpAddress' => request()?->ip(), 'UserAgent' => mb_substr((string) request()?->userAgent(), 0, 1000), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }
}

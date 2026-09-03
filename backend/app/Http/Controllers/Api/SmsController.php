<?php

namespace App\Http\Controllers\Api;

use App\Contracts\SmsGateway;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sms\BulkFeeReminderRequest;
use App\Http\Requests\Sms\ScheduleRequest;
use App\Http\Requests\Sms\TemplateRequest;
use App\Jobs\ProcessSmsQueue;
use App\Services\Sms\FeeRecipientService;
use App\Services\Sms\PhoneNumberNormalizer;
use App\Services\Sms\SmsManager;
use App\Services\Sms\SmsTemplateRenderer;
use App\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Throwable;

class SmsController extends Controller
{
    public function __construct(
        private SmsManager $manager,
        private FeeRecipientService $recipients,
        private SmsTemplateRenderer $renderer,
        private PhoneNumberNormalizer $phones
    ) {}

    public function dashboard(Request $r, TenantContext $t)
    {
        $q = DB::table('SmsLogs')->where('TenantId', $t->id());
        $total = (clone $q)->count();
        $delivered = (clone $q)->where('Status', 'delivered')->count();
        $failed = (clone $q)->where('Status', 'failed')->count();
        $monthly = (clone $q)->where('MessageType', 'fee_reminder')->whereMonth('CreatedAt', now()->month)->whereYear('CreatedAt', now()->year)->count();
        $eligible = $this->recipients->eligible($t->id(), ['BranchIds' => $this->branches($t)]);
        $usage = (clone $q)->where('CreatedAt', '>=', now()->subMonths(11)->startOfMonth())->get(['CreatedAt'])->groupBy(fn ($x) => Carbon::parse($x->CreatedAt)->format('Y-m'))->map(fn ($items, $month) => ['Month' => $month, 'Total' => $items->count()])->values();

        return $this->ok([
            'TotalSms' => $total,
            'SentToday' => (clone $q)->whereDate('CreatedAt', today())->count(),
            'Delivered' => $delivered,
            'Pending' => (clone $q)->whereIn('Status', ['queued', 'processing', 'retrying'])->count(),
            'Failed' => $failed,
            'MonthlyFeeReminders' => $monthly,
            'MissingPhones' => collect($eligible)->whereNull('PrimaryPhone')->count(),
            'InvalidPhones' => collect($eligible)->where('SmsEligible', false)->whereNotNull('PrimaryPhone')->count(),
            'SuccessPercentage' => $total ? round($delivered / $total * 100, 1) : 0,
            'FailurePercentage' => $total ? round($failed / $total * 100, 1) : 0,
            'Recent' => (clone $q)->orderByDesc('SmsLogId')->limit(10)->get(),
            'Usage' => $usage
        ], 'SMS dashboard retrieved.');
    }

    public function eligible(Request $r, TenantContext $t)
    {
        $filters = $r->only(['AcademicYearId', 'Month', 'Year', 'ClassId', 'LevelId', 'ShiftId', 'FeeTypeId', 'PaymentStatus', 'DueDate']);
        $filters['BranchIds'] = $this->branches($t);
        $rows = $this->recipients->eligible($t->id(), $filters);

        return $this->ok(array_slice($rows, 0, 500), 'Eligible fee reminder recipients retrieved.', ['total' => count($rows)]);
    }

    public function references(TenantContext $t)
    {
        $id = $t->id();
        $branches = $this->branches($t);

        return $this->ok([
            'AcademicYears' => DB::table('AcademicYears')->where('TenantId', $id)->get(),
            'Classes' => DB::table('Classes')->where('TenantId', $id)->whereIn('BranchId', $branches)->where('Status', 'Active')->get(),
            'Levels' => DB::table('Levels')->where('TenantId', $id)->where('Status', 'Active')->get(),
            'Shifts' => DB::table('Shifts')->where('TenantId', $id)->where('Status', 'Active')->get(),
            'FeeTypes' => DB::table('FeeTypes')->where('TenantId', $id)->where('IsActive', true)->get(),
            'Templates' => DB::table('SmsTemplates')->where('TenantId', $id)->where('IsActive', true)->get()
        ], 'SMS references retrieved.');
    }

    public function preview(BulkFeeReminderRequest $r, TenantContext $t)
    {
        $data = $r->validated();
        $data['Filters']['BranchIds'] = $this->branches($t);

        return $this->ok($this->manager->preview($t->id(), $data), 'SMS preview generated.');
    }

    public function send(Request $r, TenantContext $t)
    {
        $d = $r->validate([
            'RecipientPhone' => ['required', 'string'],
            'MessageBody' => ['required', 'string', 'max:1500'],
            'ScheduledAt' => ['nullable', 'date'],
            'MessageType' => ['nullable', 'string'],
            'StudentId' => ['nullable', 'integer'],
            'GuardianId' => ['nullable', 'integer'],
            'InvoiceId' => ['nullable', 'integer'],
        ]);

        return $this->ok($this->manager->queueManual(
            $t->id(),
            $t->user()->UserId,
            $d['RecipientPhone'],
            $d['MessageBody'],
            isset($d['ScheduledAt']) ? Carbon::parse($d['ScheduledAt']) : null,
            $d['MessageType'] ?? 'general_announcement',
            $d['StudentId'] ?? null,
            $d['GuardianId'] ?? null,
            $d['InvoiceId'] ?? null
        ), 'SMS queued.', [], 201);
    }

    public function individual(BulkFeeReminderRequest $r, TenantContext $t)
    {
        $d = $r->validated();
        abort_unless(count($d['InvoiceIds'] ?? []) === 1, 422, 'Exactly one invoice is required.');
        $d['CombineSiblings'] = false;
        $d['Filters']['BranchIds'] = $this->branches($t);

        return $this->ok($this->manager->queue($t->id(), $t->user()->UserId, $d, 'individual_fee_reminder'), 'Individual fee reminder queued.', [], 201);
    }

    public function bulk(BulkFeeReminderRequest $r, TenantContext $t)
    {
        $d = $r->validated();
        $d['Filters']['BranchIds'] = $this->branches($t);

        return $this->ok($this->manager->queue($t->id(), $t->user()->UserId, $d, 'bulk_fee_reminder'), 'Bulk fee reminders queued.', [], 201);
    }

    public function processAllQueue(Request $r, TenantContext $t)
    {
        $pending = DB::table('SmsQueue')
            ->where('TenantId', $t->id())
            ->whereIn('Status', ['queued', 'retrying'])
            ->orderBy('SmsQueueId')
            ->get();

        $processed = 0;
        $sent = 0;
        $failed = 0;

        foreach ($pending as $item) {
            try {
                ProcessSmsQueue::dispatchSync($item->SmsQueueId, true);
                $status = DB::table('SmsQueue')->where('SmsQueueId', $item->SmsQueueId)->value('Status');
                if ($status === 'sent' || $status === 'delivered') {
                    $sent++;
                } else {
                    $failed++;
                }
                $processed++;
            } catch (Throwable) {
                $failed++;
                $processed++;
            }
        }

        $this->audit($r, $t, 'All queued SMS processed', 'SmsQueue', 0, [
            'total' => count($pending),
            'sent' => $sent,
            'failed' => $failed,
        ]);

        return $this->ok([
            'Processed' => $processed,
            'Sent' => $sent,
            'Failed' => $failed,
        ], "Farsamayntii safka waa dhammaatay: {$sent} la diray, {$failed} fashilantay.");
    }

    public function sendNow(Request $r, TenantContext $t, int $id)
    {
        $log = DB::table('SmsLogs')->where('TenantId', $t->id())->where('SmsLogId', $id)->first();
        abort_unless($log, 404, 'Fariinta lama helin.');

        $queueId = $log->SmsQueueId;
        if (! $queueId) {
            $queueId = DB::table('SmsQueue')->where('TenantId', $t->id())->where('IdempotencyKey', $log->IdempotencyKey)->value('SmsQueueId');
        }
        abort_unless($queueId, 422, 'Fariintan safka kuma jirto.');

        try {
            ProcessSmsQueue::dispatchSync($queueId, true);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fariinta lama diri karin: ' . $e->getMessage(),
            ], 422);
        }

        $updated = DB::table('SmsLogs')->where('SmsLogId', $id)->first();
        $this->audit($r, $t, 'Queued SMS sent immediately', 'SmsLogs', $id, ['status' => $updated?->Status]);

        return $this->ok($updated, 'Fariinta si toos ah ayaa loo diray.');
    }

    public function jobs(Request $r, TenantContext $t)
    {
        $q = DB::table('SmsJobs')
            ->leftJoin('Users', 'SmsJobs.CreatedByUserId', '=', 'Users.UserId')
            ->where('SmsJobs.TenantId', $t->id())
            ->when($r->Status, fn ($q, $v) => $q->where('SmsJobs.Status', $v))
            ->select('SmsJobs.*', 'Users.Name as CreatedByName')
            ->orderByDesc('SmsJobId')
            ->paginate(min($r->integer('per_page', 25), 100));

        return $this->page($q, 'SMS jobs retrieved.');
    }

    public function job(TenantContext $t, int $id)
    {
        $job = DB::table('SmsJobs')->where('TenantId', $t->id())->where('SmsJobId', $id)->first();
        abort_unless($job, 404);
        $job->Messages = DB::table('SmsQueue')->where('TenantId', $t->id())->where('SmsJobId', $id)->get();

        return $this->ok($job, 'SMS job retrieved.');
    }

    public function cancel(Request $r, TenantContext $t, int $id)
    {
        $d = $r->validate(['Reason' => ['required', 'string', 'max:500']]);
        $job = DB::table('SmsJobs')->where('TenantId', $t->id())->where('SmsJobId', $id)->whereIn('Status', ['queued', 'processing'])->first();
        abort_unless($job, 422, 'Only pending SMS jobs can be cancelled.');
        DB::transaction(fn () => [
            DB::table('SmsJobs')->where('SmsJobId', $id)->update(['Status' => 'cancelled', 'CancelReason' => $d['Reason'], 'UpdatedAt' => now()]),
            DB::table('SmsQueue')->where('SmsJobId', $id)->whereIn('Status', ['queued', 'retrying'])->update(['Status' => 'cancelled', 'UpdatedAt' => now()]),
            DB::table('SmsLogs')->where('SmsJobId', $id)->whereIn('Status', ['queued', 'retrying'])->update(['Status' => 'cancelled', 'UpdatedAt' => now()])
        ]);
        $this->audit($r, $t, 'SMS job cancelled', 'SmsJobs', $id, $d);

        return $this->ok((object) [], 'SMS job cancelled.');
    }

    public function templates(TenantContext $t)
    {
        return $this->ok(DB::table('SmsTemplates')->leftJoin('Users', 'SmsTemplates.CreatedByUserId', '=', 'Users.UserId')->where('SmsTemplates.TenantId', $t->id())->select('SmsTemplates.*', 'Users.Name as CreatedByName')->orderByDesc('IsDefault')->orderBy('TemplateName')->get(), 'SMS templates retrieved.');
    }

    public function storeTemplate(TemplateRequest $r, TenantContext $t)
    {
        $d = $r->validated();
        if ($d['IsDefault'] ?? false) {
            DB::table('SmsTemplates')->where('TenantId', $t->id())->where('TemplateType', $d['TemplateType'])->update(['IsDefault' => false, 'UpdatedAt' => now()]);
        }
        $id = DB::table('SmsTemplates')->insertGetId([...$d, 'TenantId' => $t->id(), 'CreatedByUserId' => $t->user()->UserId, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'SmsTemplateId');
        $this->audit($r, $t, 'SMS template created', 'SmsTemplates', $id, $d);

        return $this->ok(DB::table('SmsTemplates')->where('SmsTemplateId', $id)->first(), 'SMS template created.', [], 201);
    }

    public function updateTemplate(TemplateRequest $r, TenantContext $t, int $id)
    {
        $d = $r->validated();
        if ($d['IsDefault'] ?? false) {
            DB::table('SmsTemplates')->where('TenantId', $t->id())->where('TemplateType', $d['TemplateType'])->where('SmsTemplateId', '!=', $id)->update(['IsDefault' => false, 'UpdatedAt' => now()]);
        }
        $updated = DB::table('SmsTemplates')->where('TenantId', $t->id())->where('SmsTemplateId', $id)->update([...$d, 'UpdatedAt' => now()]);
        abort_unless($updated, 404);
        $this->audit($r, $t, 'SMS template updated', 'SmsTemplates', $id, $d);

        return $this->ok(DB::table('SmsTemplates')->where('SmsTemplateId', $id)->first(), 'SMS template updated.');
    }

    public function deleteTemplate(Request $r, TenantContext $t, int $id)
    {
        $deleted = DB::table('SmsTemplates')->where('TenantId', $t->id())->where('SmsTemplateId', $id)->delete();
        abort_unless($deleted, 404);
        $this->audit($r, $t, 'SMS template deleted', 'SmsTemplates', $id, []);

        return $this->ok((object) [], 'SMS template deleted.');
    }

    public function schedules(TenantContext $t)
    {
        return $this->ok(DB::table('SmsSchedules')->leftJoin('SmsTemplates', 'SmsSchedules.SmsTemplateId', '=', 'SmsTemplates.SmsTemplateId')->leftJoin('Users', 'SmsSchedules.CreatedByUserId', '=', 'Users.UserId')->where('SmsSchedules.TenantId', $t->id())->select('SmsSchedules.*', 'SmsTemplates.TemplateName', 'Users.Name as CreatedByName')->orderByDesc('SmsScheduleId')->get(), 'SMS schedules retrieved.');
    }

    public function storeSchedule(ScheduleRequest $r, TenantContext $t)
    {
        $d = $this->scheduleData($r->validated());
        $id = DB::table('SmsSchedules')->insertGetId([...$d, 'TenantId' => $t->id(), 'CreatedByUserId' => $t->user()->UserId, 'CreatedAt' => now(), 'UpdatedAt' => now()], 'SmsScheduleId');
        $this->audit($r, $t, 'SMS schedule created', 'SmsSchedules', $id, $d);

        return $this->ok(DB::table('SmsSchedules')->where('SmsScheduleId', $id)->first(), 'SMS schedule created.', [], 201);
    }

    public function updateSchedule(ScheduleRequest $r, TenantContext $t, int $id)
    {
        $d = $this->scheduleData($r->validated());
        $updated = DB::table('SmsSchedules')->where('TenantId', $t->id())->where('SmsScheduleId', $id)->update([...$d, 'UpdatedAt' => now()]);
        abort_unless($updated, 404);
        $this->audit($r, $t, 'SMS schedule updated', 'SmsSchedules', $id, $d);

        return $this->ok(DB::table('SmsSchedules')->where('SmsScheduleId', $id)->first(), 'SMS schedule updated.');
    }

    public function deleteSchedule(Request $r, TenantContext $t, int $id)
    {
        $deleted = DB::table('SmsSchedules')->where('TenantId', $t->id())->where('SmsScheduleId', $id)->delete();
        abort_unless($deleted, 404);
        $this->audit($r, $t, 'SMS schedule deleted', 'SmsSchedules', $id, []);

        return $this->ok((object) [], 'SMS schedule deleted.');
    }

    public function historySummary(TenantContext $t)
    {
        $tenantId = $t->id();
        $q = DB::table('SmsLogs')->where('TenantId', $tenantId);

        return $this->ok([
            'Total' => (clone $q)->count(),
            'Queued' => (clone $q)->whereIn('Status', ['queued', 'retrying'])->count(),
            'Processing' => (clone $q)->where('Status', 'processing')->count(),
            'Sent' => (clone $q)->where('Status', 'sent')->count(),
            'Delivered' => (clone $q)->where('Status', 'delivered')->count(),
            'Failed' => (clone $q)->where('Status', 'failed')->count(),
        ], 'SMS history summary retrieved.');
    }

    public function history(Request $r, TenantContext $t)
    {
        $q = DB::table('SmsLogs')
            ->leftJoin('Students', 'SmsLogs.StudentId', '=', 'Students.StudentId')
            ->leftJoin('Classes', 'Students.ClassId', '=', 'Classes.ClassId')
            ->leftJoin('Guardians', 'SmsLogs.GuardianId', '=', 'Guardians.GuardianId')
            ->leftJoin('Users', 'SmsLogs.CreatedByUserId', '=', 'Users.UserId')
            ->where('SmsLogs.TenantId', $t->id())
            ->when($r->Status, fn ($q, $v) => $q->where('SmsLogs.Status', $v))
            ->when($r->MessageType, fn ($q, $v) => $q->where('SmsLogs.MessageType', $v))
            ->when($r->Phone, fn ($q, $v) => $q->where('SmsLogs.RecipientPhone', 'like', '%' . $v . '%'))
            ->when($r->From, fn ($q, $v) => $q->whereDate('SmsLogs.CreatedAt', '>=', $v))
            ->when($r->To, fn ($q, $v) => $q->whereDate('SmsLogs.CreatedAt', '<=', $v))
            ->when($r->Search, function ($q, $v) {
                $q->where(function ($sub) use ($v) {
                    $sub->where('SmsLogs.RecipientPhone', 'like', "%{$v}%")
                        ->orWhere('SmsLogs.MessageBody', 'like', "%{$v}%")
                        ->orWhere('Students.FirstName', 'like', "%{$v}%")
                        ->orWhere('Students.LastName', 'like', "%{$v}%")
                        ->orWhere('Students.AdmissionNo', 'like', "%{$v}%")
                        ->orWhere('Guardians.FullName', 'like', "%{$v}%");
                });
            })
            ->select(
                'SmsLogs.*',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Classes.Name as ClassName',
                'Guardians.FullName as ParentName',
                'Users.Name as SentByName'
            )
            ->orderByDesc('SmsLogId')
            ->paginate(min($r->integer('per_page', 25), 100));

        $q->getCollection()->transform(function ($row) {
            $studentName = trim(($row->FirstName ?? '') . ' ' . ($row->LastName ?? ''));
            $row->StudentName = $studentName ?: null;
            unset($row->FirstName, $row->LastName);

            return $row;
        });

        return $this->page($q, 'SMS history retrieved.');
    }

    public function historyItem(TenantContext $t, int $id)
    {
        $row = DB::table('SmsLogs')
            ->leftJoin('Students', 'SmsLogs.StudentId', '=', 'Students.StudentId')
            ->leftJoin('Classes', 'Students.ClassId', '=', 'Classes.ClassId')
            ->leftJoin('Guardians', 'SmsLogs.GuardianId', '=', 'Guardians.GuardianId')
            ->leftJoin('Users', 'SmsLogs.CreatedByUserId', '=', 'Users.UserId')
            ->where('SmsLogs.TenantId', $t->id())
            ->where('SmsLogs.SmsLogId', $id)
            ->select(
                'SmsLogs.*',
                'Students.AdmissionNo',
                'Students.FirstName',
                'Students.LastName',
                'Classes.Name as ClassName',
                'Guardians.FullName as ParentName',
                'Users.Name as SentByName'
            )
            ->first();

        abort_unless($row, 404);

        $row->StudentName = trim(($row->FirstName ?? '') . ' ' . ($row->LastName ?? '')) ?: null;
        unset($row->FirstName, $row->LastName);

        $row->Queue = $row->SmsQueueId
            ? DB::table('SmsQueue')->where('TenantId', $t->id())->where('SmsQueueId', $row->SmsQueueId)->first()
            : null;
        $row->DeliveryEvents = $row->SmsQueueId
            ? DB::table('SmsDeliveryEvents')->where('TenantId', $t->id())->where('SmsQueueId', $row->SmsQueueId)->orderBy('OccurredAt')->get()
            : [];

        return $this->ok($row, 'SMS history record retrieved.');
    }

    public function retry(Request $r, TenantContext $t, int $id)
    {
        $row = DB::table('SmsQueue')->where('TenantId', $t->id())->where('SmsQueueId', $id)->where('Status', 'failed')->first();
        abort_unless($row, 422, 'Kaliya fariimaha fashilantay ayaa dib loo tijaabin karaa.');

        DB::table('SmsQueue')->where('SmsQueueId', $id)->update(['Status' => 'retrying', 'Attempts' => 0, 'NextRetryAt' => now(), 'LastError' => null, 'UpdatedAt' => now()]);
        DB::table('SmsLogs')->where('SmsQueueId', $id)->update(['Status' => 'retrying', 'FailedReason' => null, 'FailedAt' => null, 'UpdatedAt' => now()]);

        try {
            ProcessSmsQueue::dispatchSync($id, true);
        } catch (Throwable) {
        }

        $this->audit($r, $t, 'Failed SMS retried', 'SmsQueue', $id, []);

        return $this->ok((object) [], 'Fariintii dib ayaa loo diray.');
    }

    public function resend(Request $r, TenantContext $t, int $id)
    {
        $d = $r->validate(['Reason' => ['required', 'string', 'max:500']]);
        $log = DB::table('SmsLogs')->where('TenantId', $t->id())->where('SmsLogId', $id)->first();
        abort_unless($log, 404);

        $result = $this->manager->queueManual(
            $t->id(),
            $t->user()->UserId,
            $log->RecipientPhone,
            $log->MessageBody,
            null,
            $log->MessageType ?? 'general_announcement',
            $log->StudentId,
            $log->GuardianId,
            $log->InvoiceId
        );

        $this->audit($r, $t, 'SMS resent', 'SmsLogs', $id, ['reason' => $d['Reason'], 'new' => $result]);

        return $this->ok($result, 'Fariinta dib ayaa loo diray.', [], 201);
    }

    public function settings(Request $r, TenantContext $t)
    {
        if ($r->isMethod('put')) {
            $d = $r->validate([
                'ProviderName' => ['nullable', 'string', 'max:80'],
                'ProviderType' => ['nullable', 'string', 'max:50'],
                'SenderId' => ['required', 'string', 'max:30'],
                'ApiUrl' => ['nullable', 'string', 'max:500'],
                'ApiKey' => ['nullable', 'string'],
                'ApiSecret' => ['nullable', 'string'],
                'IsActive' => ['boolean'],
                'IsLive' => ['boolean'],
                'AutomaticRemindersEnabled' => ['boolean'],
                'ReminderDay' => ['integer', 'between:1,28'],
                'ReminderTime' => ['date_format:H:i'],
                'Timezone' => ['timezone'],
                'CombineSiblings' => ['boolean'],
                'BatchSize' => ['integer', 'between:1,500'],
                'MaximumAttempts' => ['integer', 'between:1,10'],
                'EstimatedSegmentCost' => ['nullable', 'numeric', 'gte:0'],
            ]);

            $before = DB::table('SmsSettings')->where('TenantId', $t->id())->first();
            $save = collect($d)->except(['ApiKey', 'ApiSecret'])->all();

            if (! empty($d['ApiKey'])) {
                $save['EncryptedCredentials'] = Crypt::encryptString($d['ApiKey']);
            }
            if (! empty($d['ApiSecret'])) {
                $save['ApiSecret'] = Crypt::encryptString($d['ApiSecret']);
            }

            DB::table('SmsSettings')->updateOrInsert(['TenantId' => $t->id()], [...$save, 'UpdatedAt' => now()]);
            $this->audit($r, $t, 'SMS settings updated', 'SmsSettings', $t->id(), ['before' => $before, 'after' => collect($save)->except(['EncryptedCredentials', 'ApiSecret'])]);
        }

        $row = DB::table('SmsSettings')->where('TenantId', $t->id())->first();
        if ($row) {
            $row->CredentialsConfigured = (bool) $row->EncryptedCredentials;
            $row->SecretConfigured = (bool) $row->ApiSecret;
            unset($row->EncryptedCredentials, $row->ApiSecret);
        }

        return $this->ok($row, 'SMS settings retrieved.');
    }

    public function balance(TenantContext $t, SmsGateway $gateway)
    {
        return $this->ok(['Balance' => $gateway->balance($this->providerConfig($t->id()))], 'SMS provider balance retrieved.');
    }

    public function test(Request $r, TenantContext $t, SmsGateway $gateway)
    {
        $d = $r->validate([
            'RecipientPhone' => ['required', 'string'],
            'Message' => ['nullable', 'string', 'max:300'],
        ]);

        $settings = DB::table('SmsSettings')->where('TenantId', $t->id())->first();
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

        $phone = app(PhoneNumberNormalizer::class)->normalize($d['RecipientPhone']);
        $message = $d['Message'] ?: 'Tijaabo Madaaris SMS: Adeegga SMS-ka wuxuu u shaqeynayaa si sax ah.';

        try {
            $result = $gateway->send($phone, $message, $config);

            // Also record in logs
            DB::table('SmsLogs')->insert([
                'TenantId' => $t->id(),
                'RecipientPhone' => $phone,
                'MessageBody' => $message,
                'MessageType' => 'general_announcement',
                'Status' => 'sent',
                'Attempts' => 1,
                'ProviderName' => $settings->ProviderName ?? 'Test SMS',
                'ProviderMessageId' => $result['provider_id'],
                'ProviderResponse' => $result['response'],
                'IdempotencyKey' => 'test-' . str()->uuid(),
                'SentAt' => now(),
                'CreatedByUserId' => $t->user()->UserId,
                'CreatedAt' => now(),
                'UpdatedAt' => now(),
            ]);

            return $this->ok([
                'Success' => true,
                'ProviderId' => $result['provider_id'],
                'Response' => json_decode($result['response'], true) ?? $result['response'],
            ], 'Fariintii tijaabada ahayd si guul leh ayaa loo diray.');
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fariinta tijaabada ah waa la diri waayay: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function webhook(Request $r)
    {
        $secret = (string) config('sms.webhook_secret');
        abort_if($secret === '', 503, 'SMS webhook is not configured.');
        $signature = (string) $r->header('X-SMS-Signature');
        abort_unless(hash_equals(hash_hmac('sha256', $r->getContent(), $secret), $signature), 401, 'Invalid webhook signature.');
        $d = $r->validate(['message_id' => ['required', 'string'], 'status' => ['required', 'string'], 'occurred_at' => ['nullable', 'date'], 'reason' => ['nullable', 'string']]);
        $queue = DB::table('SmsQueue')->where('ProviderMessageId', $d['message_id'])->first();
        abort_unless($queue, 404);
        $map = ['accepted' => 'sent', 'sent' => 'sent', 'delivered' => 'delivered', 'rejected' => 'failed', 'invalid_number' => 'failed', 'expired' => 'failed'];
        $mapped = $map[strtolower($d['status'])] ?? 'failed';
        $occurred = isset($d['occurred_at']) ? Carbon::parse($d['occurred_at']) : now();
        DB::transaction(function () use ($queue, $d, $mapped, $occurred) {
            DB::table('SmsDeliveryEvents')->updateOrInsert(['TenantId' => $queue->TenantId, 'ProviderMessageId' => $d['message_id'], 'ProviderStatus' => $d['status'], 'OccurredAt' => $occurred], ['SmsQueueId' => $queue->SmsQueueId, 'MappedStatus' => $mapped, 'Payload' => json_encode(request()->all()), 'CreatedAt' => now()]);
            DB::table('SmsQueue')->where('SmsQueueId', $queue->SmsQueueId)->update(['Status' => $mapped, 'LastError' => $mapped === 'failed' ? ($d['reason'] ?? $d['status']) : null, 'UpdatedAt' => now()]);
            DB::table('SmsLogs')->where('SmsQueueId', $queue->SmsQueueId)->update(['Status' => $mapped, 'DeliveredAt' => $mapped === 'delivered' ? $occurred : null, 'DeliveredAtActual' => $mapped === 'delivered' ? $occurred : null, 'FailedReason' => $mapped === 'failed' ? ($d['reason'] ?? $d['status']) : null, 'UpdatedAt' => now()]);
        });

        return response()->json(['success' => true]);
    }

    private function branches(TenantContext $t): array
    {
        return DB::table('UserBranches')->where('TenantId', $t->id())->where('UserId', $t->user()->UserId)->pluck('BranchId')->map(fn ($v) => (int) $v)->all();
    }

    private function providerConfig(int $tenantId): array
    {
        $s = DB::table('SmsSettings')->where('TenantId', $tenantId)->first();
        $c = (array) ($s ?? (object) []);
        if ($s?->EncryptedCredentials) {
            try {
                $c['ApiKey'] = Crypt::decryptString($s->EncryptedCredentials);
            } catch (Throwable) {
                $c['ApiKey'] = $s->EncryptedCredentials;
            }
        }
        if ($s?->ApiSecret) {
            try {
                $c['ApiSecret'] = Crypt::decryptString($s->ApiSecret);
            } catch (Throwable) {
                $c['ApiSecret'] = $s->ApiSecret;
            }
        }

        return $c;
    }

    private function scheduleData(array $d): array
    {
        foreach (['PaymentStatuses', 'ClassIds', 'LevelIds', 'ShiftIds', 'FeeTypeIds'] as $k) {
            $d[$k] = isset($d[$k]) ? json_encode($d[$k]) : null;
        }

        return $d;
    }

    private function audit(Request $r, TenantContext $t, string $action, string $entity, int $id, array $data): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $t->id(), 'UserId' => $t->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'AfterData' => json_encode($data), 'IpAddress' => $r->ip(), 'UserAgent' => mb_substr((string) $r->userAgent(), 0, 1000), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data, string $message, array $meta = [], int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) $meta], $status);
    }

    private function page($p, string $message)
    {
        return $this->ok($p->items(), $message, ['total' => $p->total(), 'page' => $p->currentPage(), 'per_page' => $p->perPage(), 'last_page' => $p->lastPage()]);
    }
}

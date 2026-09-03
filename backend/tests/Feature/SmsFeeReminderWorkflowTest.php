<?php

namespace Tests\Feature;

use App\Contracts\SmsGateway;
use App\Jobs\ProcessSmsQueue;
use App\Models\User;
use App\Services\LogSmsGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class SmsFeeReminderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_fee_reminder_preview_queue_duplicate_delivery_and_paid_exclusion(): void
    {
        Queue::fake();
        [$tenant,$invoice,$template] = $this->fixture();
        $this->getJson('/api/v1/sms/eligible-recipients')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.NormalizedPhone', '252612345678')->assertJsonPath('data.0.RemainingBalance', 40);
        $payload = ['InvoiceIds' => [$invoice], 'SmsTemplateId' => $template, 'CombineSiblings' => true, 'MessageType' => 'fee_reminder', 'Filters' => ['PaymentStatus' => 'all_outstanding']];
        $this->postJson('/api/v1/sms/preview', $payload)->assertOk()->assertJsonPath('data.RecipientCount', 1)->assertJsonPath('data.SmsCount', 3);
        $this->postJson('/api/v1/sms/send-bulk-fee-reminders', $payload)->assertCreated()->assertJsonPath('data.QueuedCount', 1);
        Queue::assertPushed(ProcessSmsQueue::class);
        $this->postJson('/api/v1/sms/send-bulk-fee-reminders', $payload)->assertUnprocessable();
        $queue = DB::table('SmsQueue')->first();
        (new ProcessSmsQueue($queue->SmsQueueId))->handle(new LogSmsGateway);
        $this->assertDatabaseHas('SmsQueue', ['SmsQueueId' => $queue->SmsQueueId, 'Status' => 'sent']);
        $sent = DB::table('SmsQueue')->where('SmsQueueId', $queue->SmsQueueId)->first();
        Config::set('sms.webhook_secret', 'secret');
        $body = json_encode(['message_id' => $sent->ProviderMessageId, 'status' => 'delivered']);
        $signature = hash_hmac('sha256', $body, 'secret');
        $this->call('POST', '/api/v1/sms/provider/webhook', [], [], [], ['HTTP_X_SMS_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'], $body)->assertOk();
        $this->assertDatabaseHas('SmsQueue', ['SmsQueueId' => $queue->SmsQueueId, 'Status' => 'delivered']);
        DB::table('Invoices')->where('InvoiceId', $invoice)->update(['Balance' => 0, 'Status' => 'Paid']);
        $this->getJson('/api/v1/sms/eligible-recipients')->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_individual_reminder_can_be_queued(): void
    {
        Queue::fake();
        [, $invoice, $template] = $this->fixture();
        $this->postJson('/api/v1/sms/send-individual-fee-reminder', ['InvoiceIds' => [$invoice], 'SmsTemplateId' => $template, 'Filters' => []])->assertCreated()->assertJsonPath('data.QueuedCount', 1);
        $this->assertDatabaseHas('SmsJobs', ['JobType' => 'individual_fee_reminder', 'Status' => 'queued']);
    }

    public function test_failed_message_is_marked_for_retry_and_can_be_manually_retried(): void
    {
        Queue::fake();
        [, $invoice, $template] = $this->fixture();
        $this->postJson('/api/v1/sms/send-individual-fee-reminder', ['InvoiceIds' => [$invoice], 'SmsTemplateId' => $template, 'Filters' => []])->assertCreated();
        $queue = DB::table('SmsQueue')->first();
        $gateway = new class implements SmsGateway
        {
            public function send(string $recipient, string $message, array $configuration): array
            {
                throw new RuntimeException('Provider unavailable');
            }

            public function status(string $providerMessageId, array $configuration): array
            {
                return [];
            }

            public function balance(array $configuration): ?float
            {
                return null;
            }
        };
        try {
            (new ProcessSmsQueue($queue->SmsQueueId))->handle($gateway);
            $this->fail('A provider exception was expected.');
        } catch (RuntimeException) {
        }
        $this->assertDatabaseHas('SmsQueue', ['SmsQueueId' => $queue->SmsQueueId, 'Status' => 'retrying', 'Attempts' => 1]);
        DB::table('SmsQueue')->where('SmsQueueId', $queue->SmsQueueId)->update(['Status' => 'failed']);
        $this->postJson('/api/v1/sms/'.$queue->SmsQueueId.'/retry')->assertOk();
        $this->assertDatabaseHas('SmsQueue', ['SmsQueueId' => $queue->SmsQueueId, 'Status' => 'retrying', 'Attempts' => 0]);
    }

    public function test_due_monthly_schedule_queues_real_outstanding_invoice(): void
    {
        Queue::fake();
        [$tenant,, $template] = $this->fixture();
        $user = auth()->user();
        DB::table('SmsSchedules')->insert(['TenantId' => $tenant, 'Name' => 'Monthly fees', 'IsEnabled' => true, 'DayOfMonth' => now('Africa/Mogadishu')->day, 'SendTime' => '00:00', 'Timezone' => 'Africa/Mogadishu', 'PaymentStatuses' => json_encode(['unpaid', 'partially_paid', 'overdue']), 'SmsTemplateId' => $template, 'NumberOfReminders' => 1, 'DaysBetweenReminders' => 7, 'SkipWeekends' => false, 'CombineSiblings' => true, 'BatchSize' => 50, 'MaximumAttempts' => 3, 'CreatedByUserId' => $user->UserId, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $this->artisan('sms:run-schedules')->assertSuccessful();
        $this->assertDatabaseHas('SmsJobs', ['TenantId' => $tenant, 'JobType' => 'scheduled_fee_reminder']);
        $this->assertNotNull(DB::table('SmsSchedules')->value('LastRunAt'));
    }

    public function test_process_all_queue_and_gateway_settings(): void
    {
        [$tenant,,] = $this->fixture();

        // Test settings update
        $this->putJson('/api/v1/sms/settings', [
            'SenderId' => 'MADAARIS_TEST',
            'ProviderName' => 'Hormuud SMS',
            'ProviderType' => 'hormuud',
            'ApiUrl' => 'https://api.test-hormuud.local/sms/send',
            'ApiKey' => 'test-api-key-12345',
            'IsLive' => false,
            'IsActive' => true,
        ])->assertOk()->assertJsonPath('data.SenderId', 'MADAARIS_TEST')->assertJsonPath('data.CredentialsConfigured', true);

        // Queue a manual message (immediate dispatch executed it)
        $this->postJson('/api/v1/sms/send', [
            'RecipientPhone' => '0612345678',
            'MessageBody' => 'Tijaabo fariin toos ah',
        ])->assertCreated();

        // Mark as queued to test process-all
        DB::table('SmsQueue')->update(['Status' => 'queued']);

        // Process all queue
        $this->postJson('/api/v1/sms/queue/process-all')->assertOk()->assertJsonPath('data.Processed', 1)->assertJsonPath('data.Sent', 1);

        // History summary
        $this->getJson('/api/v1/sms/history-summary')->assertOk()->assertJsonPath('data.Total', 1);
    }

    private function fixture(): array
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'SMS School', 'Slug' => 'sms-school', 'Status' => 'Active', 'Timezone' => 'Africa/Mogadishu', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Admin', 'Email' => 'sms@test.local', 'Password' => 'secret-password', 'Status' => 'Active', 'Permissions' => ['*']]);
        Sanctum::actingAs($user);
        $branch = DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        $year = DB::table('AcademicYears')->insertGetId(['TenantId' => $tenant, 'Name' => '2026', 'StartDate' => '2026-01-01', 'EndDate' => '2026-12-31', 'IsDefault' => true, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $level = DB::table('Levels')->insertGetId(['TenantId' => $tenant, 'Name' => 'One', 'Code' => 'L1', 'SequenceNo' => 1, 'MinimumPromotionScore' => 50, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $shift = DB::table('Shifts')->insertGetId(['TenantId' => $tenant, 'Name' => 'Morning', 'StartTime' => '07:00', 'EndTime' => '12:00', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $class = DB::table('Classes')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AcademicYearId' => $year, 'LevelId' => $level, 'ShiftId' => $shift, 'Name' => 'Class 1', 'Code' => 'C1', 'Capacity' => 30, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $student = DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => 'A1', 'FirstName' => 'Ali', 'LastName' => 'Nur', 'Gender' => 'Male', 'AdmissionDate' => '2026-01-01', 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        DB::table('Enrollments')->insert(['TenantId' => $tenant, 'BranchId' => $branch, 'StudentId' => $student, 'ClassId' => $class, 'AcademicYearId' => $year, 'EnrolledAt' => '2026-01-01', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $guardian = DB::table('Guardians')->insertGetId(['TenantId' => $tenant, 'FullName' => 'Ahmed', 'PrimaryPhone' => '0612345678', 'SmsConsent' => true]);
        DB::table('StudentGuardians')->insert(['TenantId' => $tenant, 'StudentId' => $student, 'GuardianId' => $guardian, 'IsPrimary' => true, 'IsFeeResponsible' => true]);
        $invoice = DB::table('Invoices')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'StudentId' => $student, 'InvoiceNo' => 'INV-1', 'Total' => 100, 'Balance' => 40, 'DueDate' => '2026-08-01', 'Status' => 'Partially paid', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $fee = DB::table('FeeTypes')->insertGetId(['TenantId' => $tenant, 'FeeTypeName' => 'Monthly', 'IsActive' => true]);
        DB::table('InvoiceItems')->insert(['TenantId' => $tenant, 'InvoiceId' => $invoice, 'FeeTypeId' => $fee, 'Amount' => 100]);
        $template = DB::table('SmsTemplates')->insertGetId(['TenantId' => $tenant, 'TemplateName' => 'Reminder', 'TemplateType' => 'fee_reminder', 'Language' => 'so', 'TemplateBody' => 'Mudane {parent_name}, {student_name} waxaa ku maqan {amount_due}. Bixi {due_date}. Mahadsanid {school_name}.', 'IsActive' => true, 'IsDefault' => true, 'CreatedByUserId' => $user->UserId, 'CreatedAt' => now(), 'UpdatedAt' => now()]);

        return [$tenant, $invoice, $template];
    }
}

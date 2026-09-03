<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('SmsProviders', function (Blueprint $t) {
            $t->id('SmsProviderId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->string('Name', 80);
            $t->string('Driver', 80)->default('http');
            $t->boolean('IsDefault')->default(false);
            $t->boolean('IsActive')->default(true);
            $t->timestamp('CreatedAt')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
            $t->unique(['TenantId', 'Name']);
        });
        Schema::create('SmsJobs', function (Blueprint $t) {
            $t->id('SmsJobId');
            $t->uuid('ReferenceNo')->unique();
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('BranchId')->nullable()->constrained('Branches', 'BranchId')->nullOnDelete();
            $t->string('JobType', 40);
            $t->string('Status', 24)->default('queued');
            $t->json('Filters')->nullable();
            $t->unsignedInteger('RecipientCount')->default(0);
            $t->unsignedInteger('SmsCount')->default(0);
            $t->decimal('EstimatedCost', 12, 4)->nullable();
            $t->timestamp('ScheduledAt')->nullable();
            $t->timestamp('StartedAt')->nullable();
            $t->timestamp('CompletedAt')->nullable();
            $t->text('CancelReason')->nullable();
            $t->unsignedBigInteger('CreatedByUserId')->nullable();
            $t->timestamp('CreatedAt')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
            $t->index(['TenantId', 'Status', 'ScheduledAt']);
        });
        Schema::create('SmsQueue', function (Blueprint $t) {
            $t->id('SmsQueueId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('SmsJobId')->nullable()->constrained('SmsJobs', 'SmsJobId')->cascadeOnDelete();
            $t->foreignId('StudentId')->nullable()->constrained('Students', 'StudentId')->nullOnDelete();
            $t->foreignId('GuardianId')->nullable()->constrained('Guardians', 'GuardianId')->nullOnDelete();
            $t->foreignId('InvoiceId')->nullable()->constrained('Invoices', 'InvoiceId')->nullOnDelete();
            $t->foreignId('SmsTemplateId')->nullable()->constrained('SmsTemplates', 'SmsTemplateId')->nullOnDelete();
            $t->string('RecipientPhone', 30);
            $t->text('MessageBody');
            $t->string('MessageType', 40);
            $t->string('Priority', 16)->default('normal');
            $t->unsignedInteger('Attempts')->default(0);
            $t->unsignedInteger('MaximumAttempts')->default(3);
            $t->timestamp('ScheduledAt')->nullable();
            $t->timestamp('NextRetryAt')->nullable();
            $t->string('ProviderMessageId')->nullable();
            $t->text('ProviderResponse')->nullable();
            $t->text('LastError')->nullable();
            $t->string('Status', 24)->default('queued');
            $t->string('IdempotencyKey', 191);
            $t->unsignedBigInteger('CreatedByUserId')->nullable();
            $t->timestamp('CreatedAt')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
            $t->unique(['TenantId', 'IdempotencyKey']);
            $t->index(['TenantId', 'Status', 'ScheduledAt']);
            $t->index(['TenantId', 'NextRetryAt']);
            $t->index(['TenantId', 'RecipientPhone']);
            $t->index('ProviderMessageId');
        });
        Schema::create('SmsSchedules', function (Blueprint $t) {
            $t->id('SmsScheduleId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->string('Name', 120);
            $t->boolean('IsEnabled')->default(true);
            $t->unsignedTinyInteger('DayOfMonth')->default(1);
            $t->time('SendTime')->default('08:00');
            $t->string('Timezone', 80)->default('Africa/Mogadishu');
            $t->json('PaymentStatuses');
            $t->json('ClassIds')->nullable();
            $t->json('LevelIds')->nullable();
            $t->json('ShiftIds')->nullable();
            $t->json('FeeTypeIds')->nullable();
            $t->foreignId('SmsTemplateId')->nullable()->constrained('SmsTemplates', 'SmsTemplateId')->nullOnDelete();
            $t->unsignedTinyInteger('NumberOfReminders')->default(1);
            $t->unsignedSmallInteger('DaysBetweenReminders')->default(7);
            $t->boolean('SkipWeekends')->default(true);
            $t->boolean('CombineSiblings')->default(true);
            $t->unsignedSmallInteger('BatchSize')->default(50);
            $t->unsignedTinyInteger('MaximumAttempts')->default(3);
            $t->timestamp('LastRunAt')->nullable();
            $t->timestamp('NextRunAt')->nullable();
            $t->unsignedBigInteger('CreatedByUserId')->nullable();
            $t->timestamp('CreatedAt')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
            $t->index(['TenantId', 'IsEnabled', 'NextRunAt']);
        });
        Schema::create('SmsDeliveryEvents', function (Blueprint $t) {
            $t->id('SmsDeliveryEventId');
            $t->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $t->foreignId('SmsQueueId')->nullable()->constrained('SmsQueue', 'SmsQueueId')->nullOnDelete();
            $t->string('ProviderMessageId')->nullable();
            $t->string('ProviderStatus', 80);
            $t->string('MappedStatus', 24);
            $t->json('Payload')->nullable();
            $t->timestamp('OccurredAt')->nullable();
            $t->timestamp('CreatedAt')->useCurrent();
            $t->unique(['TenantId', 'ProviderMessageId', 'ProviderStatus', 'OccurredAt'], 'sms_delivery_event_unique');
            $t->index('ProviderMessageId');
        });
        Schema::table('SmsTemplates', function (Blueprint $t) {
            $t->string('TemplateType', 40)->default('fee_reminder');
            $t->string('Language', 5)->default('so');
            $t->boolean('IsActive')->default(true);
            $t->boolean('IsDefault')->default(false);
            $t->unsignedBigInteger('CreatedByUserId')->nullable();
            $t->timestamp('CreatedAt')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
        });
        Schema::table('SmsSettings', function (Blueprint $t) {
            $t->boolean('AutomaticRemindersEnabled')->default(true);
            $t->unsignedTinyInteger('ReminderDay')->default(1);
            $t->time('ReminderTime')->default('08:00');
            $t->string('Timezone', 80)->default('Africa/Mogadishu');
            $t->boolean('CombineSiblings')->default(true);
            $t->unsignedSmallInteger('BatchSize')->default(50);
            $t->unsignedTinyInteger('MaximumAttempts')->default(3);
            $t->decimal('EstimatedSegmentCost', 12, 4)->nullable();
            $t->timestamp('UpdatedAt')->nullable();
        });
        Schema::table('SmsLogs', function (Blueprint $t) {
            $t->foreignId('SmsQueueId')->nullable()->constrained('SmsQueue', 'SmsQueueId')->nullOnDelete();
            $t->foreignId('SmsJobId')->nullable()->constrained('SmsJobs', 'SmsJobId')->nullOnDelete();
            $t->foreignId('StudentId')->nullable()->constrained('Students', 'StudentId')->nullOnDelete();
            $t->foreignId('GuardianId')->nullable()->constrained('Guardians', 'GuardianId')->nullOnDelete();
            $t->foreignId('InvoiceId')->nullable()->constrained('Invoices', 'InvoiceId')->nullOnDelete();
            $t->string('MessageType', 40)->default('general_announcement');
            $t->string('ProviderName', 80)->nullable();
            $t->string('IdempotencyKey', 191)->nullable();
            $t->timestamp('ScheduledAtActual')->nullable();
            $t->timestamp('DeliveredAtActual')->nullable();
            $t->timestamp('UpdatedAt')->nullable();
            $t->index(['TenantId', 'RecipientPhone']);
            $t->index(['TenantId', 'MessageType']);
            $t->index(['TenantId', 'ProviderMessageId']);
            $t->index(['TenantId', 'StudentId']);
            $t->index(['TenantId', 'GuardianId']);
            $t->index(['TenantId', 'InvoiceId']);
        });
        foreach (DB::table('Tenants')->pluck('TenantId') as $tenantId) {
            DB::table('SmsTemplates')->updateOrInsert(['TenantId' => $tenantId, 'TemplateName' => 'Xusuusinta lacagta'], ['TemplateType' => 'fee_reminder', 'Language' => 'so', 'TemplateBody' => 'Mudane/Marwo {parent_name}, waxaa lagu xasuusinayaa in lacagta dugsiga ee ardayga {student_name}, bisha {month} {year}, ay ka maqan tahay {amount_due}. Fadlan bixi kahor {due_date}. Mahadsanid — {school_name}.', 'IsActive' => true, 'IsDefault' => true, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
            DB::table('SmsTemplates')->updateOrInsert(['TenantId' => $tenantId, 'TemplateName' => 'Xaqiijinta lacag-bixinta'], ['TemplateType' => 'payment_received', 'Language' => 'so', 'TemplateBody' => 'Mudane/Marwo {parent_name}, waxaan xaqiijinay inaan ka guddoonnay {paid_amount}, oo ah lacagta ardayga {student_name}. Hadhaaga waa {amount_due}. Mahadsanid — {school_name}.', 'IsActive' => true, 'IsDefault' => true, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('SmsLogs', fn (Blueprint $t) => $t->dropColumn(['SmsQueueId', 'SmsJobId', 'StudentId', 'GuardianId', 'InvoiceId', 'MessageType', 'ProviderName', 'IdempotencyKey', 'ScheduledAtActual', 'DeliveredAtActual', 'UpdatedAt']));
        Schema::table('SmsSettings', fn (Blueprint $t) => $t->dropColumn(['AutomaticRemindersEnabled', 'ReminderDay', 'ReminderTime', 'Timezone', 'CombineSiblings', 'BatchSize', 'MaximumAttempts', 'EstimatedSegmentCost', 'UpdatedAt']));
        Schema::table('SmsTemplates', fn (Blueprint $t) => $t->dropColumn(['TemplateType', 'Language', 'IsActive', 'IsDefault', 'CreatedByUserId', 'CreatedAt', 'UpdatedAt']));
        foreach (['SmsDeliveryEvents', 'SmsSchedules', 'SmsQueue', 'SmsJobs', 'SmsProviders'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};

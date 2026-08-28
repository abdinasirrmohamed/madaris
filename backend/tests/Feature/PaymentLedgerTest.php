<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_is_idempotent_allocated_and_balanced(): void
    {
        $t = DB::table('Tenants')->insertGetId(['Name' => 'Finance', 'Slug' => 'fin', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $b = DB::table('Branches')->insertGetId(['TenantId' => $t, 'Name' => 'Main', 'Code' => 'M', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $u = User::create(['TenantId' => $t, 'Name' => 'Cashier', 'Email' => 'cash@test.test', 'Password' => 'secret', 'Status' => 'Active', 'Permissions' => ['finance.manage']]);
        DB::table('UserBranches')->insert(['TenantId' => $t, 'UserId' => $u->UserId, 'BranchId' => $b]);
        Sanctum::actingAs($u);
        $s = DB::table('Students')->insertGetId(['TenantId' => $t, 'BranchId' => $b, 'AdmissionNo' => 'F-1', 'FirstName' => 'Ali', 'LastName' => 'Nur', 'Gender' => 'Male', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $i = DB::table('Invoices')->insertGetId(['TenantId' => $t, 'BranchId' => $b, 'StudentId' => $s, 'InvoiceNo' => 'INV-1', 'Total' => 100, 'Balance' => 100, 'DueDate' => today(), 'Status' => 'Issued', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $a = DB::table('Accounts')->insertGetId(['TenantId' => $t, 'BranchId' => $b, 'AccountName' => 'Cash', 'AccountType' => 'Cash', 'OpeningBalance' => 0, 'CurrentBalance' => 0, 'IsActive' => true]);
        $key = (string) str()->uuid();
        $payload = ['InvoiceId' => $i, 'AccountId' => $a, 'IdempotencyKey' => $key, 'Amount' => 40, 'Method' => 'Cash'];
        $this->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->assertDatabaseCount('Payments', 1);
        $this->assertDatabaseHas('Invoices', ['InvoiceId' => $i, 'Balance' => 60, 'Status' => 'Partially paid']);
        $tx = DB::table('LedgerTransactions')->first();
        $this->assertEquals(DB::table('LedgerEntries')->where('LedgerTransactionId', $tx->LedgerTransactionId)->sum('Debit'), DB::table('LedgerEntries')->where('LedgerTransactionId', $tx->LedgerTransactionId)->sum('Credit'));
    }
}

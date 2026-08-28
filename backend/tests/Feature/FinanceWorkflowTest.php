<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_discount_invoice_adjustment_payment_receipt_and_reversal_are_consistent(): void
    {
        $tenant = DB::table('Tenants')->insertGetId(['Name' => 'Finance Flow', 'Slug' => 'finance-flow', 'Status' => 'Active', 'Timezone' => 'UTC', 'Currency' => 'USD', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        $branch = $this->branch($tenant, 'A');
        $otherBranch = $this->branch($tenant, 'B');
        $user = User::create(['TenantId' => $tenant, 'Name' => 'Finance Admin', 'Email' => 'finance-flow@test.local', 'Password' => 'secret12345', 'Status' => 'Active', 'Permissions' => ['finance.manage', 'accounts.manage']]);
        DB::table('UserBranches')->insert(['TenantId' => $tenant, 'UserId' => $user->UserId, 'BranchId' => $branch]);
        Sanctum::actingAs($user);
        $student = $this->student($tenant, $branch, 'F-1');
        $hiddenStudent = $this->student($tenant, $otherBranch, 'F-2');
        $feeType = $this->postJson('/api/v1/finance/fee-types', ['FeeTypeName' => 'Monthly tuition'])->assertCreated()->json('data.FeeTypeId');
        $this->postJson('/api/v1/finance/discounts', ['StudentId' => $student, 'DiscountType' => 'Percentage', 'Percentage' => 10, 'Reason' => 'Scholarship award'])->assertCreated();

        $invoicePayload = ['BranchId' => $branch, 'StudentId' => $student, 'DueDate' => '2026-09-01', 'Items' => [['FeeTypeId' => $feeType, 'Description' => 'August tuition', 'Amount' => 100]]];
        $invoice = $this->postJson('/api/v1/finance/invoices', $invoicePayload)->assertCreated()->assertJsonPath('data.Subtotal', 100)->assertJsonPath('data.DiscountTotal', 10)->assertJsonPath('data.Total', 90)->json('data');
        $this->postJson('/api/v1/finance/invoices', [...$invoicePayload, 'BranchId' => $otherBranch, 'StudentId' => $hiddenStudent])->assertForbidden();
        $this->postJson("/api/v1/finance/invoices/{$invoice['InvoiceId']}/adjustments", ['AdjustmentType' => 'Debit', 'Amount' => 10, 'Reason' => 'Late registration charge'])->assertCreated()->assertJsonPath('data.Total', 100);

        $cash = DB::table('Accounts')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AccountName' => 'Cash desk', 'AccountType' => 'Cash', 'OpeningBalance' => 0, 'CurrentBalance' => 0, 'IsActive' => true]);
        $payment = $this->postJson('/api/v1/payments', ['InvoiceId' => $invoice['InvoiceId'], 'AccountId' => $cash, 'IdempotencyKey' => (string) str()->uuid(), 'Amount' => 40, 'Method' => 'Cash'])->assertCreated()->json('data');
        $this->postJson("/api/v1/finance/invoices/{$invoice['InvoiceId']}/adjustments", ['AdjustmentType' => 'Credit', 'Amount' => 70, 'Reason' => 'Invalid excessive credit'])->assertUnprocessable();
        $this->postJson("/api/v1/finance/invoices/{$invoice['InvoiceId']}/adjustments", ['AdjustmentType' => 'Credit', 'Amount' => 10, 'Reason' => 'Approved correction'])->assertCreated()->assertJsonPath('data.Balance', 50);
        $this->getJson("/api/v1/finance/payments/{$payment['PaymentId']}/receipt")->assertOk()->assertJsonPath('data.ReceiptNo', $payment['ReceiptNo'])->assertJsonPath('data.InvoiceBalance', 50);

        $this->postJson("/api/v1/finance/payments/{$payment['PaymentId']}/reverse", ['Type' => 'Refund', 'Amount' => 25, 'Reason' => 'Guardian refund request'])->assertOk();
        $this->postJson("/api/v1/finance/payments/{$payment['PaymentId']}/reverse", ['Type' => 'Refund', 'Amount' => 20, 'Reason' => 'Exceeds remaining refundable'])->assertUnprocessable();
        $this->assertDatabaseHas('Payments', ['PaymentId' => $payment['PaymentId'], 'ReversedAmount' => 25, 'Status' => 'Partially refunded']);
        $this->assertDatabaseHas('Invoices', ['InvoiceId' => $invoice['InvoiceId'], 'Balance' => 75]);
        $this->assertDatabaseHas('AuditLogs', ['TenantId' => $tenant, 'EntityType' => 'Payments', 'EntityId' => (string) $payment['PaymentId']]);
        foreach (DB::table('LedgerTransactions')->get() as $transaction) {
            $this->assertEquals(DB::table('LedgerEntries')->where('LedgerTransactionId', $transaction->LedgerTransactionId)->sum('Debit'), DB::table('LedgerEntries')->where('LedgerTransactionId', $transaction->LedgerTransactionId)->sum('Credit'));
        }
    }

    private function branch(int $tenant, string $code): int
    {
        return DB::table('Branches')->insertGetId(['TenantId' => $tenant, 'Name' => 'Branch '.$code, 'Code' => $code, 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }

    private function student(int $tenant, int $branch, string $admission): int
    {
        return DB::table('Students')->insertGetId(['TenantId' => $tenant, 'BranchId' => $branch, 'AdmissionNo' => $admission, 'FirstName' => 'Amina', 'LastName' => 'Ali', 'Gender' => 'Female', 'AdmissionDate' => today(), 'WelfareStatus' => 'Normal', 'Status' => 'Active', 'CreatedAt' => now(), 'UpdatedAt' => now()]);
    }
}

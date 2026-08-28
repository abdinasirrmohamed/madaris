<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(private TenantContext $tenant) {}

    public function post(array $data): Payment
    {
        return DB::transaction(function () use ($data) {
            $existing = Payment::where('IdempotencyKey', $data['IdempotencyKey'])->first();
            if ($existing) {
                return $existing;
            }
            $invoice = Invoice::lockForUpdate()->findOrFail($data['InvoiceId']);
            $allowed = DB::table('UserBranches')->where('TenantId', $this->tenant->id())->where('UserId', $this->tenant->user()->UserId)->where('BranchId', $invoice->BranchId)->exists();
            abort_unless($allowed, 403, 'You do not have access to this invoice branch.');
            if ((float) $data['Amount'] <= 0 || (float) $data['Amount'] > (float) $invoice->Balance) {
                throw ValidationException::withMessages(['Amount' => 'Amount must be positive and cannot exceed the invoice balance.']);
            }$account = DB::table('Accounts')->where('TenantId', $this->tenant->id())->where('BranchId', $invoice->BranchId)->where('AccountId', $data['AccountId'])->lockForUpdate()->first();
            abort_unless($account, 422, 'Destination account is invalid.');
            $receivable = DB::table('Accounts')->where('TenantId', $this->tenant->id())->where('BranchId', $invoice->BranchId)->where('AccountType', 'Receivable')->lockForUpdate()->first();
            if (! $receivable) {
                $rid = DB::table('Accounts')->insertGetId(['TenantId' => $this->tenant->id(), 'BranchId' => $invoice->BranchId, 'AccountName' => 'Student Receivables', 'AccountType' => 'Receivable', 'OpeningBalance' => 0, 'CurrentBalance' => 0, 'IsActive' => true], 'AccountId');
                $receivable = DB::table('Accounts')->where('AccountId', $rid)->first();
            }$payment = Payment::create([...$data, 'StudentId' => $invoice->StudentId, 'BranchId' => $invoice->BranchId, 'ReceiptNo' => 'RCT-'.now()->format('Ymd').'-'.str_pad((string) (Payment::count() + 1), 6, '0', STR_PAD_LEFT), 'ReceivedBy' => $this->tenant->user()->UserId, 'Status' => 'Completed']);
            $invoice->Balance = (float) $invoice->Balance - (float) $payment->Amount;
            $invoice->Status = $invoice->Balance == 0 ? 'Paid' : 'Partially paid';
            $invoice->save();
            DB::table('Accounts')->where('AccountId', $account->AccountId)->increment('CurrentBalance', $payment->Amount);
            DB::table('Accounts')->where('AccountId', $receivable->AccountId)->decrement('CurrentBalance', $payment->Amount);
            $tx = DB::table('LedgerTransactions')->insertGetId(['TenantId' => $this->tenant->id(), 'BranchId' => $invoice->BranchId, 'ReferenceType' => 'Payment', 'ReferenceId' => $payment->PaymentId, 'Description' => 'Student fee '.$payment->ReceiptNo, 'TransactionDate' => today(), 'Status' => 'Posted', 'PostedByUserId' => $this->tenant->user()->UserId, 'CreatedAt' => now()], 'LedgerTransactionId');
            DB::table('LedgerEntries')->insert([['TenantId' => $this->tenant->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $account->AccountId, 'Debit' => $payment->Amount, 'Credit' => 0, 'Memo' => 'Fee received'], ['TenantId' => $this->tenant->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $receivable->AccountId, 'Debit' => 0, 'Credit' => $payment->Amount, 'Memo' => 'Invoice receivable cleared']]);
            DB::table('AuditLogs')->insert(['TenantId' => $this->tenant->id(), 'UserId' => $this->tenant->user()->UserId, 'Action' => 'Create', 'EntityType' => 'Payments', 'EntityId' => (string) $payment->PaymentId, 'AfterData' => json_encode(['InvoiceId' => $invoice->InvoiceId, 'Amount' => $payment->Amount, 'ReceiptNo' => $payment->ReceiptNo]), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);

            return $payment;
        });
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    public function invoices(Request $r, TenantContext $t)
    {
        $rows = DB::table('Invoices')->join('Students', 'Invoices.StudentId', '=', 'Students.StudentId')
            ->where('Invoices.TenantId', $t->id())->whereIn('Invoices.BranchId', $this->branchIds($t))
            ->when($r->BranchId, fn ($q, $v) => $q->where('Invoices.BranchId', $v))
            ->when($r->StudentId, fn ($q, $v) => $q->where('Invoices.StudentId', $v))
            ->when($r->Status, fn ($q, $v) => $q->where('Invoices.Status', $v))
            ->select('Invoices.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->orderByDesc('InvoiceId')->paginate(25);

        return $this->ok($rows->items(), 'Invoices retrieved.', ['total' => $rows->total()]);
    }

    public function invoice(Request $r, TenantContext $t)
    {
        $d = $r->validate(['BranchId' => ['required', 'integer'], 'StudentId' => ['required', 'integer'], 'DueDate' => ['required', 'date'], 'Items' => ['required', 'array', 'min:1'], 'Items.*.FeeTypeId' => ['required', 'integer'], 'Items.*.Description' => ['nullable', 'string'], 'Items.*.Amount' => ['required', 'numeric', 'gt:0']]);
        abort_unless(in_array((int) $d['BranchId'], $this->branchIds($t), true), 403);
        abort_unless(DB::table('Students')->where('TenantId', $t->id())->where('BranchId', $d['BranchId'])->where('StudentId', $d['StudentId'])->exists(), 404);
        $feeTypeIds = collect($d['Items'])->pluck('FeeTypeId')->unique();
        abort_unless(DB::table('FeeTypes')->where('TenantId', $t->id())->where('IsActive', true)->whereIn('FeeTypeId', $feeTypeIds)->count() === $feeTypeIds->count(), 422, 'One or more fee types are invalid.');
        $invoice = DB::transaction(function () use ($d, $t) {
            $subtotal = (float) collect($d['Items'])->sum('Amount');
            $discount = DB::table('StudentDiscounts')->where('TenantId', $t->id())->where('StudentId', $d['StudentId'])->where('IsActive', true)
                ->where(fn ($q) => $q->whereNull('StartDate')->orWhereDate('StartDate', '<=', today()))
                ->where(fn ($q) => $q->whereNull('EndDate')->orWhereDate('EndDate', '>=', today()))->get()
                ->sum(fn ($row) => $row->DiscountType === 'Percentage' ? $subtotal * ((float) $row->Percentage / 100) : (float) $row->FixedAmount);
            $discount = min($subtotal, round($discount, 2));
            $total = $subtotal - $discount;
            $no = 'INV-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('Invoices')->where('TenantId', $t->id())->count() + 1), 6, '0', STR_PAD_LEFT);
            $id = DB::table('Invoices')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $d['BranchId'], 'StudentId' => $d['StudentId'], 'InvoiceNo' => $no, 'Subtotal' => $subtotal, 'DiscountTotal' => $discount, 'AdjustmentTotal' => 0, 'Total' => $total, 'Balance' => $total, 'DueDate' => $d['DueDate'], 'Status' => 'Issued', 'CreatedAt' => now(), 'UpdatedAt' => now()], 'InvoiceId');
            foreach ($d['Items'] as $x) {
                DB::table('InvoiceItems')->insert(['TenantId' => $t->id(), 'InvoiceId' => $id, ...$x]);
            }
            $receivable = $this->account($t, $d['BranchId'], 'Student Receivables', 'Receivable');
            $income = $this->account($t, $d['BranchId'], 'Fee Income', 'Income');
            DB::table('Accounts')->where('AccountId', $receivable)->increment('CurrentBalance', $total);
            DB::table('Accounts')->where('AccountId', $income)->increment('CurrentBalance', $total);
            $transaction = DB::table('LedgerTransactions')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $d['BranchId'], 'ReferenceType' => 'Invoice', 'ReferenceId' => $id, 'Description' => 'Student invoice '.$no, 'TransactionDate' => today(), 'Status' => 'Posted', 'PostedByUserId' => $t->user()->UserId, 'CreatedAt' => now()], 'LedgerTransactionId');
            DB::table('LedgerEntries')->insert([['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $receivable, 'Debit' => $total, 'Credit' => 0, 'Memo' => 'Student receivable'], ['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $income, 'Debit' => 0, 'Credit' => $total, 'Memo' => 'Fee income']]);
            $this->audit($t, 'Create', 'Invoices', $id, ['Subtotal' => $subtotal, 'DiscountTotal' => $discount, 'Total' => $total]);

            return DB::table('Invoices')->where('InvoiceId', $id)->first();
        });

        return $this->ok($invoice, 'Invoice issued.', [], 201);
    }

    public function invoiceDetails(int $invoice, TenantContext $t)
    {
        $row = DB::table('Invoices')->join('Students', 'Invoices.StudentId', '=', 'Students.StudentId')->where('Invoices.TenantId', $t->id())->whereIn('Invoices.BranchId', $this->branchIds($t))->where('InvoiceId', $invoice)->select('Invoices.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->first();
        abort_unless($row, 404);
        $row->Items = DB::table('InvoiceItems')->join('FeeTypes', 'InvoiceItems.FeeTypeId', '=', 'FeeTypes.FeeTypeId')->where('InvoiceItems.TenantId', $t->id())->where('InvoiceId', $invoice)->select('InvoiceItems.*', 'FeeTypes.FeeTypeName')->get();
        $row->Adjustments = DB::table('InvoiceAdjustments')->where('TenantId', $t->id())->where('InvoiceId', $invoice)->orderBy('InvoiceAdjustmentId')->get();
        $row->Payments = DB::table('Payments')->where('TenantId', $t->id())->where('InvoiceId', $invoice)->orderBy('PaymentId')->get();

        return $this->ok($row, 'Invoice details retrieved.');
    }

    public function adjustInvoice(Request $r, int $invoice, TenantContext $t)
    {
        $d = $r->validate(['AdjustmentType' => ['required', Rule::in(['Credit', 'Debit'])], 'Amount' => ['required', 'numeric', 'gt:0'], 'Reason' => ['required', 'string', 'min:5']]);
        $result = DB::transaction(function () use ($invoice, $d, $t) {
            $row = DB::table('Invoices')->where('TenantId', $t->id())->whereIn('BranchId', $this->branchIds($t))->where('InvoiceId', $invoice)->lockForUpdate()->first();
            abort_unless($row, 404);
            $paid = (float) $row->Total - (float) $row->Balance;
            $change = $d['AdjustmentType'] === 'Debit' ? (float) $d['Amount'] : -(float) $d['Amount'];
            $newTotal = (float) $row->Total + $change;
            abort_if($newTotal < $paid || $newTotal < 0, 422, 'Credit cannot reduce the invoice below the amount already paid.');
            $newBalance = $newTotal - $paid;
            $id = DB::table('InvoiceAdjustments')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $row->BranchId, 'InvoiceId' => $invoice, 'ApprovedByUserId' => $t->user()->UserId, 'CreatedAt' => now(), ...$d], 'InvoiceAdjustmentId');
            DB::table('Invoices')->where('InvoiceId', $invoice)->update(['AdjustmentTotal' => DB::raw('AdjustmentTotal + '.$change), 'Total' => $newTotal, 'Balance' => $newBalance, 'Status' => $newBalance == 0 ? 'Paid' : ($paid > 0 ? 'Partially paid' : 'Issued'), 'UpdatedAt' => now()]);
            $receivable = $this->account($t, $row->BranchId, 'Student Receivables', 'Receivable');
            $income = $this->account($t, $row->BranchId, 'Fee Income', 'Income');
            $transaction = DB::table('LedgerTransactions')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $row->BranchId, 'ReferenceType' => 'InvoiceAdjustment', 'ReferenceId' => $id, 'Description' => $d['AdjustmentType'].' adjustment on '.$row->InvoiceNo, 'TransactionDate' => today(), 'Status' => 'Posted', 'PostedByUserId' => $t->user()->UserId, 'CreatedAt' => now()], 'LedgerTransactionId');
            if ($d['AdjustmentType'] === 'Debit') {
                DB::table('LedgerEntries')->insert([['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $receivable, 'Debit' => $d['Amount'], 'Credit' => 0], ['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $income, 'Debit' => 0, 'Credit' => $d['Amount']]]);
                DB::table('Accounts')->whereIn('AccountId', [$receivable, $income])->increment('CurrentBalance', $d['Amount']);
            } else {
                DB::table('LedgerEntries')->insert([['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $income, 'Debit' => $d['Amount'], 'Credit' => 0], ['TenantId' => $t->id(), 'LedgerTransactionId' => $transaction, 'AccountId' => $receivable, 'Debit' => 0, 'Credit' => $d['Amount']]]);
                DB::table('Accounts')->whereIn('AccountId', [$receivable, $income])->decrement('CurrentBalance', $d['Amount']);
            }
            $this->audit($t, 'Adjust', 'Invoices', $invoice, ['InvoiceAdjustmentId' => $id, ...$d]);

            return DB::table('Invoices')->where('InvoiceId', $invoice)->first();
        });

        return $this->ok($result, 'Invoice adjustment posted.', [], 201);
    }

    public function payments(Request $r, TenantContext $t)
    {
        $rows = DB::table('Payments')->join('Students', 'Payments.StudentId', '=', 'Students.StudentId')->where('Payments.TenantId', $t->id())->whereIn('Payments.BranchId', $this->branchIds($t))->when($r->StudentId, fn ($q, $v) => $q->where('Payments.StudentId', $v))->select('Payments.*', 'Students.FirstName', 'Students.LastName', 'Students.AdmissionNo')->orderByDesc('PaymentId')->paginate(25);

        return $this->ok($rows->items(), 'Payments retrieved.', ['total' => $rows->total()]);
    }

    public function reverse(Request $r, int $payment, TenantContext $t)
    {
        $d = $r->validate(['Type' => ['required', Rule::in(['Void', 'Refund'])], 'Amount' => ['required', 'numeric', 'gt:0'], 'Reason' => ['required', 'string', 'min:5']]);
        $result = DB::transaction(function () use ($d, $payment, $t) {
            $p = DB::table('Payments')->where('TenantId', $t->id())->whereIn('BranchId', $this->branchIds($t))->where('PaymentId', $payment)->lockForUpdate()->first();
            abort_unless($p, 404);
            abort_unless(in_array($p->Status, ['Completed', 'Partially refunded'], true), 422, 'Only completed payments can be reversed.');
            abort_if((float) $d['Amount'] > (float) $p->Amount - (float) $p->ReversedAmount, 422, 'Reversal exceeds the remaining refundable amount.');
            $id = DB::table('PaymentReversals')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $p->BranchId, 'PaymentId' => $p->PaymentId, 'Type' => $d['Type'], 'Amount' => $d['Amount'], 'Reason' => $d['Reason'], 'Status' => 'Completed', 'ProcessedByUserId' => $t->user()->UserId, 'CreatedAt' => now()], 'PaymentReversalId');
            DB::table('Invoices')->where('TenantId', $t->id())->where('InvoiceId', $p->InvoiceId)->increment('Balance', $d['Amount']);
            DB::table('Invoices')->where('InvoiceId', $p->InvoiceId)->update(['Status' => 'Partially paid', 'UpdatedAt' => now()]);
            $reversed = (float) $p->ReversedAmount + (float) $d['Amount'];
            DB::table('Payments')->where('PaymentId', $payment)->update(['ReversedAmount' => $reversed, 'Status' => $reversed === (float) $p->Amount ? ($d['Type'] === 'Void' ? 'Voided' : 'Refunded') : 'Partially refunded', 'UpdatedAt' => now()]);
            $this->reversalLedger($t, $p, $d, $id);
            $this->audit($t, $d['Type'], 'Payments', $payment, ['PaymentReversalId' => $id, ...$d]);

            return DB::table('PaymentReversals')->where('PaymentReversalId', $id)->first();
        });

        return $this->ok($result, $d['Type'].' completed.');
    }

    public function receipt(int $payment, TenantContext $t)
    {
        $row = DB::table('Payments')->join('Invoices', 'Payments.InvoiceId', '=', 'Invoices.InvoiceId')->join('Students', 'Payments.StudentId', '=', 'Students.StudentId')->leftJoin('Accounts', 'Payments.AccountId', '=', 'Accounts.AccountId')->where('Payments.TenantId', $t->id())->whereIn('Payments.BranchId', $this->branchIds($t))->where('PaymentId', $payment)->select('Payments.*', 'Invoices.InvoiceNo', 'Invoices.Total as InvoiceTotal', 'Invoices.Balance as InvoiceBalance', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'Accounts.AccountName')->first();
        abort_unless($row, 404);
        $row->School = DB::table('TenantSettings')->where('TenantId', $t->id())->first();
        $row->Reversals = DB::table('PaymentReversals')->where('TenantId', $t->id())->where('PaymentId', $payment)->get();

        return $this->ok($row, 'Receipt retrieved.');
    }

    public function feeTypes(Request $r, TenantContext $t)
    {
        if ($r->isMethod('post')) {
            $d = $r->validate(['FeeTypeName' => ['required', 'string', 'max:100']]);
            $id = DB::table('FeeTypes')->insertGetId(['TenantId' => $t->id(), 'FeeTypeName' => $d['FeeTypeName'], 'IsActive' => true], 'FeeTypeId');

            return $this->ok(DB::table('FeeTypes')->where('FeeTypeId', $id)->first(), 'Fee type created.', [], 201);
        }

        return $this->ok(DB::table('FeeTypes')->where('TenantId', $t->id())->orderBy('FeeTypeName')->get(), 'Fee types retrieved.');
    }

    public function discounts(Request $r, TenantContext $t)
    {
        if ($r->isMethod('post')) {
            $d = $r->validate(['StudentId' => ['required', 'integer'], 'DiscountType' => ['required', Rule::in(['Percentage', 'Fixed'])], 'Percentage' => ['nullable', 'required_if:DiscountType,Percentage', 'numeric', 'between:0.01,100'], 'FixedAmount' => ['nullable', 'required_if:DiscountType,Fixed', 'numeric', 'gt:0'], 'Reason' => ['required', 'string', 'min:3'], 'StartDate' => ['nullable', 'date'], 'EndDate' => ['nullable', 'date', 'after_or_equal:StartDate']]);
            $student = DB::table('Students')->where('TenantId', $t->id())->whereIn('BranchId', $this->branchIds($t))->where('StudentId', $d['StudentId'])->first();
            abort_unless($student, 404);
            $id = DB::table('StudentDiscounts')->insertGetId(['TenantId' => $t->id(), 'ApprovedByUserId' => $t->user()->UserId, 'IsActive' => true, ...$d], 'StudentDiscountId');
            $this->audit($t, 'Create', 'StudentDiscounts', $id, $d);

            return $this->ok(DB::table('StudentDiscounts')->where('StudentDiscountId', $id)->first(), 'Student discount created.', [], 201);
        }
        $rows = DB::table('StudentDiscounts')->join('Students', 'StudentDiscounts.StudentId', '=', 'Students.StudentId')->where('StudentDiscounts.TenantId', $t->id())->whereIn('Students.BranchId', $this->branchIds($t))->select('StudentDiscounts.*', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName')->orderByDesc('StudentDiscountId')->get();

        return $this->ok($rows, 'Student discounts retrieved.');
    }

    public function discountStatus(Request $r, int $discount, TenantContext $t)
    {
        $d = $r->validate(['IsActive' => ['required', 'boolean']]);
        $updated = DB::table('StudentDiscounts')->join('Students', 'StudentDiscounts.StudentId', '=', 'Students.StudentId')->where('StudentDiscounts.TenantId', $t->id())->whereIn('Students.BranchId', $this->branchIds($t))->where('StudentDiscountId', $discount)->update(['IsActive' => $d['IsActive']]);
        abort_unless($updated, 404);
        $this->audit($t, 'StatusChange', 'StudentDiscounts', $discount, $d);

        return $this->ok(DB::table('StudentDiscounts')->where('StudentDiscountId', $discount)->first(), 'Discount status updated.');
    }

    public function responsibleGuardians(TenantContext $t)
    {
        $rows = DB::table('StudentGuardians')->join('Guardians', 'StudentGuardians.GuardianId', '=', 'Guardians.GuardianId')->join('Students', 'StudentGuardians.StudentId', '=', 'Students.StudentId')->where('StudentGuardians.TenantId', $t->id())->where('StudentGuardians.IsFeeResponsible', true)->whereIn('Students.BranchId', $this->branchIds($t))->select('StudentGuardians.StudentId', 'Students.AdmissionNo', 'Students.FirstName', 'Students.LastName', 'Guardians.GuardianId', 'Guardians.FullName', 'Guardians.PrimaryPhone', 'Guardians.Email')->get();

        return $this->ok($rows, 'Fee-responsible guardians retrieved.');
    }

    public function accounts(Request $r, TenantContext $t)
    {
        if ($r->isMethod('post')) {
            $d = $r->validate(['BranchId' => ['required', 'integer'], 'AccountName' => ['required', 'string', 'max:100'], 'AccountType' => ['required', Rule::in(['Cash', 'Bank', 'MobileMoney', 'Income', 'Expense', 'Receivable', 'Payable'])], 'AccountNumber' => ['nullable', 'string'], 'OpeningBalance' => ['nullable', 'numeric']]);
            $id = DB::table('Accounts')->insertGetId(['TenantId' => $t->id(), 'CurrentBalance' => $d['OpeningBalance'] ?? 0, 'IsActive' => true, ...$d], 'AccountId');

            return $this->ok(DB::table('Accounts')->where('AccountId', $id)->first(), 'Account created.', [], 201);
        }

        return $this->ok(DB::table('Accounts')->where('TenantId', $t->id())->where('IsActive', true)->orderBy('AccountName')->get(), 'Accounts retrieved.');
    }

    public function expense(Request $r, TenantContext $t)
    {
        $d = $r->validate(['BranchId' => ['required', 'integer'], 'CategoryId' => ['required', 'integer'], 'AccountId' => ['required', 'integer'], 'Amount' => ['required', 'numeric', 'gt:0'], 'Description' => ['nullable', 'string'], 'ExpenseDate' => ['required', 'date']]);
        $id = DB::transaction(function () use ($d, $t) {
            $account = DB::table('Accounts')->where('TenantId', $t->id())->where('AccountId', $d['AccountId'])->lockForUpdate()->first();
            abort_unless($account, 404);
            abort_if($account->CurrentBalance < $d['Amount'], 422, 'Insufficient account balance.');
            $id = DB::table('Expenses')->insertGetId(['TenantId' => $t->id(), 'CreatedByUserId' => $t->user()->UserId, 'Status' => 'Posted', ...$d], 'ExpenseId');
            DB::table('Accounts')->where('AccountId', $account->AccountId)->decrement('CurrentBalance', $d['Amount']);

            return $id;
        });

        return $this->ok(DB::table('Expenses')->where('ExpenseId', $id)->first(), 'Expense posted.', [], 201);
    }

    public function categories(Request $r, TenantContext $t)
    {
        if ($r->isMethod('post')) {
            $d = $r->validate(['CategoryName' => ['required', 'string', 'max:100']]);
            $id = DB::table('ExpenseCategories')->insertGetId(['TenantId' => $t->id(), ...$d], 'ExpenseCategoryId');

            return $this->ok(DB::table('ExpenseCategories')->where('ExpenseCategoryId', $id)->first(), 'Expense category created.', [], 201);
        }

        return $this->ok(DB::table('ExpenseCategories')->where('TenantId', $t->id())->orderBy('CategoryName')->get(), 'Expense categories retrieved.');
    }

    public function expenses(TenantContext $t)
    {
        return $this->ok(DB::table('Expenses')->join('ExpenseCategories', 'Expenses.CategoryId', '=', 'ExpenseCategories.ExpenseCategoryId')->join('Accounts', 'Expenses.AccountId', '=', 'Accounts.AccountId')->where('Expenses.TenantId', $t->id())->select('Expenses.*', 'ExpenseCategories.CategoryName', 'Accounts.AccountName')->orderByDesc('ExpenseDate')->get(), 'Expenses retrieved.');
    }

    public function transfer(Request $r, TenantContext $t)
    {
        $d = $r->validate(['BranchId' => ['required', 'integer'], 'FromAccountId' => ['required', 'integer', 'different:ToAccountId'], 'ToAccountId' => ['required', 'integer'], 'Amount' => ['required', 'numeric', 'gt:0'], 'TransferDate' => ['required', 'date'], 'Notes' => ['nullable', 'string']]);
        $result = DB::transaction(function () use ($d, $t) {
            $from = DB::table('Accounts')->where('TenantId', $t->id())->where('AccountId', $d['FromAccountId'])->lockForUpdate()->first();
            $to = DB::table('Accounts')->where('TenantId', $t->id())->where('AccountId', $d['ToAccountId'])->lockForUpdate()->first();
            abort_unless($from && $to, 404);
            abort_if($from->CurrentBalance < $d['Amount'], 422, 'Insufficient source account balance.');
            $id = DB::table('AccountTransfers')->insertGetId(['TenantId' => $t->id(), 'CreatedByUserId' => $t->user()->UserId, 'CreatedAt' => now(), ...$d], 'AccountTransferId');
            DB::table('Accounts')->where('AccountId', $from->AccountId)->decrement('CurrentBalance', $d['Amount']);
            DB::table('Accounts')->where('AccountId', $to->AccountId)->increment('CurrentBalance', $d['Amount']);
            $tx = DB::table('LedgerTransactions')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $d['BranchId'], 'ReferenceType' => 'Transfer', 'ReferenceId' => $id, 'Description' => 'Account transfer', 'TransactionDate' => $d['TransferDate'], 'Status' => 'Posted', 'PostedByUserId' => $t->user()->UserId, 'CreatedAt' => now()], 'LedgerTransactionId');
            DB::table('LedgerEntries')->insert([['TenantId' => $t->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $to->AccountId, 'Debit' => $d['Amount'], 'Credit' => 0], ['TenantId' => $t->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $from->AccountId, 'Debit' => 0, 'Credit' => $d['Amount']]]);

            return DB::table('AccountTransfers')->where('AccountTransferId', $id)->first();
        });

        return $this->ok($result, 'Account transfer posted.', [], 201);
    }

    private function reversalLedger(TenantContext $t, object $p, array $d, int $id): void
    {
        $cash = DB::table('Accounts')->where('TenantId', $t->id())->where('AccountId', $p->AccountId)->first();
        $recv = DB::table('Accounts')->where('TenantId', $t->id())->where('BranchId', $p->BranchId)->where('AccountType', 'Receivable')->first();
        if (! $cash || ! $recv) {
            return;
        }$tx = DB::table('LedgerTransactions')->insertGetId(['TenantId' => $t->id(), 'BranchId' => $p->BranchId, 'ReferenceType' => $d['Type'], 'ReferenceId' => $id, 'Description' => $d['Type'].' receipt '.$p->ReceiptNo, 'TransactionDate' => today(), 'Status' => 'Posted', 'PostedByUserId' => $t->user()->UserId, 'CreatedAt' => now()], 'LedgerTransactionId');
        DB::table('LedgerEntries')->insert([['TenantId' => $t->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $recv->AccountId, 'Debit' => $d['Amount'], 'Credit' => 0], ['TenantId' => $t->id(), 'LedgerTransactionId' => $tx, 'AccountId' => $cash->AccountId, 'Debit' => 0, 'Credit' => $d['Amount']]]);
        DB::table('Accounts')->where('AccountId', $cash->AccountId)->decrement('CurrentBalance', $d['Amount']);
        DB::table('Accounts')->where('AccountId', $recv->AccountId)->increment('CurrentBalance', $d['Amount']);
    }

    private function branchIds(TenantContext $tenant): array
    {
        return DB::table('UserBranches')->where('TenantId', $tenant->id())->where('UserId', $tenant->user()->UserId)->pluck('BranchId')->map(fn ($id) => (int) $id)->all();
    }

    private function account(TenantContext $tenant, int $branch, string $name, string $type): int
    {
        $id = DB::table('Accounts')->where('TenantId', $tenant->id())->where('BranchId', $branch)->where('AccountType', $type)->value('AccountId');
        if ($id) {
            return (int) $id;
        }

        return DB::table('Accounts')->insertGetId(['TenantId' => $tenant->id(), 'BranchId' => $branch, 'AccountName' => $name, 'AccountType' => $type, 'OpeningBalance' => 0, 'CurrentBalance' => 0, 'IsActive' => true], 'AccountId');
    }

    private function audit(TenantContext $tenant, string $action, string $entity, int $id, array $after): void
    {
        DB::table('AuditLogs')->insert(['TenantId' => $tenant->id(), 'UserId' => $tenant->user()->UserId, 'Action' => $action, 'EntityType' => $entity, 'EntityId' => (string) $id, 'AfterData' => json_encode($after), 'RequestId' => (string) str()->uuid(), 'CreatedAt' => now()]);
    }

    private function ok(mixed $data, string $message, array $meta = [], int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) $meta], $status);
    }
}

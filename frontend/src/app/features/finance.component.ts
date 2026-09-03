import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from '../core/dialog.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `<header class="page">
      <div>
        <p>FINANCE & ACCOUNTS</p>
        <h1>Financial management</h1>
        <span>Billing, collection, immutable receipts, accounts and expenses.</span>
      </div>
      @if (tab() !== 'receive-fee') { <button (click)="openAction()">＋ {{ actionLabel() }}</button> }
    </header>
    <nav>
      @for (t of tabs; track t.key) {
        <button [class.active]="tab() === t.key" (click)="select(t.key)">{{ t.label }}</button>
      }
    </nav>
    @if (message()) {
      <p class="notice">{{ message() }}</p>
    }
    @if (tab() === 'fee-types') {
      <section class="card"><table><thead><tr><th>Fee type</th><th>Status</th></tr></thead><tbody>@for(f of feeTypes();track f.FeeTypeId){<tr><td><b>{{f.FeeTypeName}}</b></td><td><span class="badge">{{f.IsActive?'Active':'Inactive'}}</span></td></tr>}</tbody></table>@if(!feeTypes().length){<div class="empty">No fee types configured.</div>}</section>
    }
    @if (tab() === 'fee-responsibilities') {
      <section class="card"><table><thead><tr><th>Guardian</th><th>Phone</th><th>Student</th><th>Admission No</th></tr></thead><tbody>@for(r of responsibleGuardians();track r.GuardianId + '-' + r.StudentId){<tr><td><b>{{r.FullName}}</b></td><td>{{r.PrimaryPhone}}</td><td>{{r.FirstName}} {{r.LastName}}</td><td>{{r.AdmissionNo}}</td></tr>}</tbody></table>@if(!responsibleGuardians().length){<div class="empty">No fee responsibilities assigned.</div>}</section>
    }
    @if (tab() === 'invoices') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Student</th>
              <th>Due date</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (i of invoices(); track i.InvoiceId) {
              <tr>
                <td>
                  <b>{{ i.InvoiceNo }}</b>
                </td>
                <td>
                  {{ i.FirstName }} {{ i.LastName }}<small>{{ i.AdmissionNo }}</small>
                </td>
                <td>{{ i.DueDate }}</td>
                <td>{{ i.Total | currency: 'USD' }}</td>
                <td>{{ i.Balance | currency: 'USD' }}</td>
                <td>
                  <span class="badge">{{ i.Status }}</span>
                </td>
                <td><button class="small" (click)="adjust(i)">Adjustment</button></td>
              </tr>
            }
          </tbody>
        </table>
        @if (!invoices().length) {
          <div class="empty">No invoices issued.</div>
        }
      </section>
    }
    @if (tab() === 'receive-fee') {
      <section class="receive-layout">
        <form class="receive-form" [formGroup]="paymentForm" (ngSubmit)="savePayment()">
          <header><div><small>NEW PAYMENT</small><h2>Receive student fee</h2><p>Record a payment and generate an official receipt.</p></div><span>$</span></header>
          <label>Unpaid invoice<select formControlName="InvoiceId">@for (i of unpaid(); track i.InvoiceId) {<option [value]="i.InvoiceId">{{ i.InvoiceNo }} · {{ i.FirstName }} {{ i.LastName }} · balance {{ i.Balance | currency:'USD' }}</option>}</select></label>
          <div class="form-pair"><label>Destination account<select formControlName="AccountId">@for (a of paymentAccounts(); track a.AccountId) {<option [value]="a.AccountId">{{ a.AccountName }}</option>}</select></label><label>Payment method<select formControlName="Method"><option>Cash</option><option>Bank</option><option>Mobile money</option><option>Account transfer</option><option>Other</option></select></label></div>
          <label>Amount received<input type="number" min="0.01" formControlName="Amount" placeholder="0.00" /></label>
          <div class="receive-note">A unique receipt number will be generated automatically after saving this payment.</div>
          <button class="primary">Post payment and create receipt</button>
        </form>
        <aside class="receive-help"><i>✓</i><h3>Secure fee collection</h3><p>Payments are posted to the selected account and cannot be silently changed.</p><ul><li>Automatic official receipt</li><li>Updated invoice balance</li><li>Complete audit history</li></ul><button type="button" (click)="select('payments')">View receipt list →</button></aside>
      </section>
    }
    @if (tab() === 'payments') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Student</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments(); track p.PaymentId) {
              <tr>
                <td>
                  <b>{{ p.ReceiptNo }}</b>
                </td>
                <td>{{ p.FirstName }} {{ p.LastName }}</td>
                <td>{{ p.Method }}</td>
                <td>{{ p.Amount | currency: 'USD' }}</td>
                <td>
                  <span class="badge">{{ p.Status }}</span>
                </td>
                <td>
                  <button class="small" (click)="showReceipt(p)">Receipt</button>
                  <button class="small" [disabled]="p.Status !== 'Completed'" (click)="reverse(p)">
                    Void / refund
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!payments().length) {
          <div class="empty">No payments posted.</div>
        }
      </section>
    }
    @if (tab() === 'discounts') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Value</th>
              <th>Period</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (d of discounts(); track d.StudentDiscountId) {
              <tr>
                <td>
                  <b>{{ d.FirstName }} {{ d.LastName }}</b
                  ><small>{{ d.AdmissionNo }}</small>
                </td>
                <td>{{ d.DiscountType }}</td>
                <td>
                  {{
                    d.DiscountType === 'Percentage'
                      ? d.Percentage + '%'
                      : (d.FixedAmount | currency: 'USD')
                  }}
                </td>
                <td>{{ d.StartDate || 'Immediate' }} – {{ d.EndDate || 'Open' }}</td>
                <td>{{ d.Reason }}</td>
                <td>
                  <span class="badge">{{ d.IsActive ? 'Active' : 'Inactive' }}</span>
                </td>
                <td>
                  <button class="small" (click)="toggleDiscount(d)">
                    {{ d.IsActive ? 'Deactivate' : 'Activate' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!discounts().length) {
          <div class="empty">No student discounts configured.</div>
        }
      </section>
    }
    @if (tab() === 'accounts') {
      <section class="account-grid">
        @for (a of accounts(); track a.AccountId) {
          <article>
            <span>{{ a.AccountType }}</span>
            <h3>{{ a.AccountName }}</h3>
            <strong>{{ a.CurrentBalance | currency: 'USD' }}</strong
            ><small>{{ a.AccountNumber || 'No account number' }}</small>
          </article>
        } @empty {
          <div class="empty">No financial accounts configured.</div>
        }
      </section>
    }
    @if (tab() === 'expenses') {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Account</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (e of expenses(); track e.ExpenseId) {
              <tr>
                <td>{{ e.ExpenseDate }}</td>
                <td>{{ e.CategoryName }}</td>
                <td>{{ e.AccountName }}</td>
                <td>{{ e.Description }}</td>
                <td>{{ e.Amount | currency: 'USD' }}</td>
                <td>{{ e.Status }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (!expenses().length) {
          <div class="empty">No expenses posted.</div>
        }
      </section>
    }
    @if (receipt()) {
      <aside class="receipt">
        <div class="receipt-paper">
          <div class="school-head">
            <img class="school-mark" src="/assets/branding/madaaris-logo-transparent.png" alt="School logo" />
            <div>
              <h2>{{ receipt().School?.SchoolName || 'Madaaris School' }}</h2>
              <strong>{{ receipt().School?.Phone || receipt().School?.Email || '' }}</strong>
              <small>{{ receipt().School?.Address || '' }}</small>
            </div>
          </div>
          <div class="receipt-rule"></div>
          <p class="receipt-date">Date: {{ receipt().PaymentDate || receipt().CreatedAt | date: 'dd-MM-yyyy h:mm a' }}</p>
          <h3 class="voucher-title">RECEIPT VOUCHER</h3>
          <table class="voucher-table">
            <tbody>
              <tr><th>Receipt No</th><td>{{ receipt().ReceiptNo }}</td><th>Invoice</th><td>{{ receipt().InvoiceNo }}</td></tr>
              <tr><th>Student Name</th><td colspan="3">{{ receipt().FirstName }} {{ receipt().LastName }} · {{ receipt().AdmissionNo }}</td></tr>
              <tr><th>Payment Method</th><td>{{ receipt().Method }} · {{ receipt().AccountName }}</td><th>Amount Paid</th><td><b>{{ receipt().Amount | currency: 'USD' }}</b></td></tr>
              <tr><th>Status</th><td>{{ receipt().Status }}</td><th>Balance</th><td><b>{{ receipt().InvoiceBalance | currency: 'USD' }}</b></td></tr>
            </tbody>
          </table>
          <div class="signature">Signature: <span></span></div>
          <div class="receipt-foot">
            <p>Please keep this receipt as proof of payment. Thank you!</p>
            <strong>Contact Us: {{ receipt().School?.Phone || receipt().School?.Email || 'Madaaris' }}</strong>
            <small>Generated by Madaaris School Management System</small>
          </div>
        </div>
        <footer class="receipt-actions">
          <button (click)="receipt.set(null)">✕ Close</button>
          <button (click)="printReceipt()">▣ Print</button>
          <button class="pdf" (click)="printReceipt()">⇩ PDF</button>
        </footer>
        <header>
          <div>
            <small>OFFICIAL RECEIPT</small>
            <h2>{{ receipt().ReceiptNo }}</h2>
          </div>
          <button (click)="receipt.set(null)">×</button>
        </header>
        <div class="receipt-body">
          <h3>{{ receipt().School?.SchoolName }}</h3>
          <p>{{ receipt().School?.Address }}</p>
          <dl>
            <dt>Student</dt>
            <dd>
              {{ receipt().FirstName }} {{ receipt().LastName }} · {{ receipt().AdmissionNo }}
            </dd>
            <dt>Invoice</dt>
            <dd>{{ receipt().InvoiceNo }}</dd>
            <dt>Method / account</dt>
            <dd>{{ receipt().Method }} · {{ receipt().AccountName }}</dd>
            <dt>Amount received</dt>
            <dd>
              <strong>{{ receipt().Amount | currency: 'USD' }}</strong>
            </dd>
            <dt>Reversed</dt>
            <dd>{{ receipt().ReversedAmount | currency: 'USD' }}</dd>
            <dt>Remaining invoice balance</dt>
            <dd>{{ receipt().InvoiceBalance | currency: 'USD' }}</dd>
            <dt>Status</dt>
            <dd>{{ receipt().Status }}</dd>
          </dl>
          <button class="primary" (click)="printReceipt()">Print receipt</button>
        </div>
      </aside>
    }
    @if (drawer()) {
      <aside class="drawer">
        <header>
          <h2>{{ actionLabel() }}</h2>
          <button (click)="drawer.set(false)">×</button>
        </header>
        @if (tab() === 'invoices') {
          <form [formGroup]="invoiceForm" (ngSubmit)="saveInvoice()">
            <label
              >Student<select formControlName="StudentId">
                @for (s of students(); track s.StudentId) {
                  <option [value]="s.StudentId">
                    {{ s.AdmissionNo }} · {{ s.FirstName }} {{ s.LastName }}
                  </option>
                }
              </select></label
            ><label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            ><label
              >Fee type<select formControlName="FeeTypeId">
                @for (f of feeTypes(); track f.FeeTypeId) {
                  <option [value]="f.FeeTypeId">{{ f.FeeTypeName }}</option>
                }</select
              ><button type="button" class="inline" (click)="addFeeType()">
                Add fee type
              </button></label
            ><label>Description<input formControlName="Description" /></label
            ><label>Amount<input type="number" min="0.01" formControlName="Amount" /></label
            ><label>Due date<input type="date" formControlName="DueDate" /></label
            ><button class="primary">Issue invoice</button>
          </form>
        }
        @if (tab() === 'payments') {
          <form [formGroup]="paymentForm" (ngSubmit)="savePayment()">
            <label
              >Unpaid invoice<select formControlName="InvoiceId">
                @for (i of unpaid(); track i.InvoiceId) {
                  <option [value]="i.InvoiceId">
                    {{ i.InvoiceNo }} · {{ i.FirstName }} · balance
                    {{ i.Balance | currency: 'USD' }}
                  </option>
                }
              </select></label
            ><label
              >Destination account<select formControlName="AccountId">
                @for (a of paymentAccounts(); track a.AccountId) {
                  <option [value]="a.AccountId">{{ a.AccountName }}</option>
                }
              </select></label
            ><label
              >Payment method<select formControlName="Method">
                <option>Cash</option>
                <option>Bank</option>
                <option>Mobile money</option>
                <option>Account transfer</option>
                <option>Other</option>
              </select></label
            ><label>Amount<input type="number" min="0.01" formControlName="Amount" /></label
            ><button class="primary">Post payment and receipt</button>
          </form>
        }
        @if (tab() === 'discounts') {
          <form [formGroup]="discountForm" (ngSubmit)="saveDiscount()">
            <label
              >Student<select formControlName="StudentId">
                @for (s of students(); track s.StudentId) {
                  <option [value]="s.StudentId">
                    {{ s.AdmissionNo }} · {{ s.FirstName }} {{ s.LastName }}
                  </option>
                }
              </select></label
            ><label
              >Discount type<select formControlName="DiscountType">
                <option>Percentage</option>
                <option>Fixed</option>
              </select></label
            >
            @if (discountForm.value.DiscountType === 'Percentage') {
              <label
                >Percentage<input type="number" min="0.01" max="100" formControlName="Percentage"
              /></label>
            } @else {
              <label
                >Fixed amount<input type="number" min="0.01" formControlName="FixedAmount"
              /></label>
            }
            <label>Reason<input formControlName="Reason" /></label
            ><label>Start date<input type="date" formControlName="StartDate" /></label
            ><label>End date<input type="date" formControlName="EndDate" /></label
            ><button class="primary">Create discount</button>
          </form>
        }
        @if (tab() === 'accounts') {
          <form [formGroup]="accountForm" (ngSubmit)="saveAccount()">
            <label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            ><label>Account name<input formControlName="AccountName" /></label
            ><label
              >Account type<select formControlName="AccountType">
                <option>Cash</option>
                <option>Bank</option>
                <option>MobileMoney</option>
                <option>Income</option>
                <option>Expense</option>
                <option>Receivable</option>
                <option>Payable</option>
              </select></label
            ><label>Account number<input formControlName="AccountNumber" /></label
            ><label>Opening balance<input type="number" formControlName="OpeningBalance" /></label
            ><button class="primary">Create account</button>
          </form>
          <form [formGroup]="transferForm" (ngSubmit)="saveTransfer()">
            <h3>Transfer between accounts</h3>
            <label
              >From account<select formControlName="FromAccountId">
                @for (a of paymentAccounts(); track a.AccountId) {
                  <option [value]="a.AccountId">
                    {{ a.AccountName }} · {{ a.CurrentBalance | currency: 'USD' }}
                  </option>
                }
              </select></label
            >
            <label
              >To account<select formControlName="ToAccountId">
                @for (a of paymentAccounts(); track a.AccountId) {
                  <option [value]="a.AccountId">{{ a.AccountName }}</option>
                }
              </select></label
            >
            <label>Amount<input type="number" min="0.01" formControlName="Amount" /></label>
            <label>Date<input type="date" formControlName="TransferDate" /></label>
            <label>Notes<input formControlName="Notes" /></label>
            <button class="primary">Transfer funds</button>
          </form>
        }
        @if (tab() === 'expenses') {
          <form [formGroup]="expenseForm" (ngSubmit)="saveExpense()">
            <label
              >Branch<select formControlName="BranchId">
                @for (b of branches(); track b.BranchId) {
                  <option [value]="b.BranchId">{{ b.Name }}</option>
                }
              </select></label
            ><label
              >Category<select formControlName="CategoryId">
                @for (c of categories(); track c.ExpenseCategoryId) {
                  <option [value]="c.ExpenseCategoryId">{{ c.CategoryName }}</option>
                }</select
              ><button type="button" class="inline" (click)="addCategory()">
                Add category
              </button></label
            ><label
              >Pay from account<select formControlName="AccountId">
                @for (a of paymentAccounts(); track a.AccountId) {
                  <option [value]="a.AccountId">
                    {{ a.AccountName }} · {{ a.CurrentBalance | currency: 'USD' }}
                  </option>
                }
              </select></label
            ><label>Amount<input type="number" formControlName="Amount" /></label
            ><label>Description<input formControlName="Description" /></label
            ><label>Expense date<input type="date" formControlName="ExpenseDate" /></label
            ><button class="primary">Post expense</button>
          </form>
        }
      </aside>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .page {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .page p {
        margin: 0;
        color: #1554a1;
        font-size: 10px;
        font-weight: 800;
      }
      .page h1 {
        margin: 5px 0;
      }
      .page span {
        color: #758392;
        font-size: 12px;
      }
      .page > button,
      .primary {
        background: #211e75;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 11px 15px;
      }
      nav {
        display: flex;
        gap: 5px;
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        padding: 6px;
        margin: 18px 0 10px;
      }
      nav button {
        border: 0;
        background: none;
        padding: 9px 14px;
        color: #687887;
      }
      nav .active {
        background: #211e75;
        color: white;
        border-radius: 6px;
      }
      .card {
        background: white;
        border: 1px solid #dbe5ed;
        border-radius: 8px;
        overflow: auto;
        min-height: 350px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #edf1f4;
        font-size: 10px;
      }
      th {
        font-size: 8px;
        color: #748391;
        background: #f8fafc;
      }
      td small {
        display: block;
        color: #7a8792;
      }
      .badge {
        background: #e5f7ef;
        color: #147b55;
        padding: 5px 8px;
        border-radius: 12px;
      }
      .small {
        border: 0;
        background: #fff0e9;
        color: #ac4719;
        border-radius: 6px;
        padding: 6px 8px;
      }
      .account-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .account-grid article {
        background: linear-gradient(135deg, #211e75, #155b98);
        color: white;
        border-radius: 9px;
        padding: 18px;
        display: grid;
      }
      .account-grid span,
      .account-grid small {
        color: #cad8ec;
        font-size: 9px;
      }
      .account-grid h3 {
        margin: 8px 0;
      }
      .account-grid strong {
        font-size: 23px;
        margin-bottom: 8px;
      }
      .empty {
        height: 280px;
        display: grid;
        place-items: center;
        color: #758392;
      }
      .drawer {
        position: fixed;
        right: 0;
        top: 44px;
        bottom: 0;
        width: min(480px, 100%);
        background: white;
        z-index: 20;
        box-shadow: -10px 0 30px #17324c2d;
        overflow: auto;
      }
      .receipt {
        position: fixed;
        inset: 70px 20px 20px auto;
        width: min(480px, calc(100% - 40px));
        background: white;
        z-index: 30;
        box-shadow: 0 10px 40px #122a4250;
        border-radius: 10px;
        overflow: auto;
      }
      .receipt header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      .receipt header h2 {
        margin: 4px 0;
      }
      .receipt header button {
        border: 0;
        background: none;
        font-size: 25px;
      }
      .receipt-body {
        padding: 24px;
      }
      .receipt-body h3,
      .receipt-body p {
        text-align: center;
      }
      .receipt-body dl {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 10px;
        padding: 16px 0;
      }
      .receipt-body dt {
        color: #758392;
      }
      .receipt-body dd {
        margin: 0;
        text-align: right;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt,
        .receipt * {
          visibility: visible;
        }
        .receipt {
          position: absolute;
          inset: 0;
          width: 100%;
          box-shadow: none;
        }
        .receipt header button,
        .receipt .primary {
          display: none;
        }
      }
      .drawer header {
        display: flex;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e1e8ee;
      }
      .drawer h2 {
        margin: 0;
      }
      .drawer header button {
        border: 0;
        background: none;
        font-size: 25px;
      }
      .drawer form {
        padding: 20px;
      }
      .drawer label {
        display: grid;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        margin: 12px 0;
      }
      .drawer input,
      .drawer select {
        border: 1px solid #d6e0e8;
        border-radius: 7px;
        padding: 10px;
      }
      .primary {
        width: 100%;
        margin-top: 12px;
      }
      .inline {
        border: 0;
        background: #e8f1fb;
        color: #15549c;
        padding: 6px;
        margin-top: 4px;
      }
      .notice {
        background: #e5f7ee;
        color: #147a54;
        padding: 10px;
        border-radius: 7px;
      }
      .receive-layout { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(250px,.55fr); gap:14px; align-items:start; }
      .receive-form,.receive-help { padding:22px; border:1px solid #dce5ed; border-radius:13px; background:white; box-shadow:0 7px 22px #18324c0c; }
      .receive-form>header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid #e8edf2; }
      .receive-form header small { color:#155b98; font-size:8px; font-weight:900; letter-spacing:.14em; }.receive-form h2{margin:4px 0;color:#211e75}.receive-form header p{margin:0;color:#748391;font-size:10px}.receive-form header>span{width:46px;height:46px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#211e75,#155b98);color:white;font-size:21px;font-weight:900}
      .receive-form>label,.form-pair label{display:grid;gap:6px;margin:13px 0;font-size:10px;font-weight:750}.receive-form input,.receive-form select{padding:11px;border:1px solid #d6e0e8;border-radius:8px;background:white}.form-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.receive-note{padding:10px 12px;border-radius:8px;background:#edf7ff;color:#34617e;font-size:9px}
      .receive-help{color:white;background:linear-gradient(145deg,#171541,#211e75 65%,#155b98);border:0}.receive-help>i{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#52d8c5;color:#171541;font-style:normal;font-weight:900}.receive-help h3{margin:18px 0 7px}.receive-help p,.receive-help li{color:#c7cce4;font-size:9px;line-height:1.7}.receive-help ul{padding-left:17px}.receive-help button{margin-top:12px;padding:9px 11px;border:1px solid #ffffff30;border-radius:7px;background:#ffffff10;color:white;font-size:9px;font-weight:800}
      @media (max-width: 700px) {
        .receive-layout,.form-pair { grid-template-columns:1fr; }
        .account-grid {
          grid-template-columns: 1fr;
        }
        .drawer {
          top: 0;
        }
      }
    `,
  ],
})
export class FinanceComponent implements OnInit {
  private dialog = inject(DialogService);
  tabs = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'receive-fee', label: 'Receive fee' },
    { key: 'payments', label: 'Payments & receipts' },
    { key: 'discounts', label: 'Student discounts' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'expenses', label: 'Expenses' },
  ];
  tab = signal('invoices');
  drawer = signal(false);
  message = signal('');
  invoices = signal<any[]>([]);
  payments = signal<any[]>([]);
  discounts = signal<any[]>([]);
  receipt = signal<any>(null);
  accounts = signal<any[]>([]);
  expenses = signal<any[]>([]);
  students = signal<any[]>([]);
  branches = signal<any[]>([]);
  feeTypes = signal<any[]>([]);
  responsibleGuardians = signal<any[]>([]);
  categories = signal<any[]>([]);
  today = new Date().toISOString().slice(0, 10);
  invoiceForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    StudentId: new FormControl<any>(''),
    FeeTypeId: new FormControl<any>(''),
    Description: new FormControl('Tuition fee'),
    Amount: new FormControl(0),
    DueDate: new FormControl(this.today),
  });
  paymentForm = new FormGroup({
    InvoiceId: new FormControl<any>(''),
    AccountId: new FormControl<any>(''),
    Method: new FormControl('Cash'),
    Amount: new FormControl(0),
  });
  discountForm = new FormGroup({
    StudentId: new FormControl<any>(''),
    DiscountType: new FormControl('Percentage'),
    Percentage: new FormControl<any>(10),
    FixedAmount: new FormControl<any>(null),
    Reason: new FormControl(''),
    StartDate: new FormControl<any>(null),
    EndDate: new FormControl<any>(null),
  });
  accountForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    AccountName: new FormControl(''),
    AccountType: new FormControl('Cash'),
    AccountNumber: new FormControl(''),
    OpeningBalance: new FormControl(0),
  });
  transferForm = new FormGroup({
    FromAccountId: new FormControl<any>(''),
    ToAccountId: new FormControl<any>(''),
    Amount: new FormControl(0),
    TransferDate: new FormControl(this.today),
    Notes: new FormControl(''),
  });
  expenseForm = new FormGroup({
    BranchId: new FormControl<any>(''),
    CategoryId: new FormControl<any>(''),
    AccountId: new FormControl<any>(''),
    Amount: new FormControl(0),
    Description: new FormControl(''),
    ExpenseDate: new FormControl(this.today),
  });
  constructor(private api: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const view = params.get('view');
      const aliases: Record<string,string> = {'all-charges':'invoices','single-charge':'invoices','fee-types':'fee-types','scholarships':'discounts','fee-responsibilities':'fee-responsibilities','student-adjustments':'invoices'};
      this.tab.set(view && this.tabs.some((item) => item.key === view) ? view : aliases[view || ''] || 'invoices');
      if (view === 'single-charge') this.drawer.set(true);
      this.loadAll();
    });
    this.api.get<any>('/students', { per_page: '100' }).subscribe((r) => this.students.set(r.data));
    this.api.get<any>('/branches').subscribe((r) => {
      this.branches.set(r.data);
      for (const f of [this.invoiceForm, this.accountForm, this.expenseForm])
        f.patchValue({ BranchId: r.data[0]?.BranchId });
    });
  }
  select(t: string) {
    this.tab.set(t);
    this.loadAll();
  }
  actionLabel() {
    return (
      {
        invoices: 'Issue invoice',
        payments: 'Receive payment',
        discounts: 'Create discount',
        accounts: 'Create account',
        expenses: 'Post expense',
        'fee-types': 'Add fee type',
        'fee-responsibilities': 'Fee responsibilities',
      } as any
    )[this.tab()];
  }
  openAction() {
    if(this.tab()==='fee-types'){this.addFeeType();return}
    if(this.tab()==='fee-responsibilities')return;
    this.drawer.set(true);
  }
  loadAll() {
    this.api.get<any>('/finance/invoices').subscribe((r) => this.invoices.set(r.data));
    this.api.get<any>('/finance/payments').subscribe((r) => this.payments.set(r.data));
    this.api.get<any>('/finance/discounts').subscribe((r) => this.discounts.set(r.data));
    this.api.get<any>('/accounts').subscribe((r) => this.accounts.set(r.data));
    this.api.get<any>('/finance/fee-types').subscribe((r) => this.feeTypes.set(r.data));
    this.api.get<any>('/finance/responsible-guardians').subscribe((r) => this.responsibleGuardians.set(r.data));
    this.api.get<any>('/accounts/expense-categories').subscribe((r) => this.categories.set(r.data));
    this.api.get<any>('/accounts/expenses').subscribe((r) => this.expenses.set(r.data));
  }
  unpaid() {
    return this.invoices().filter((i) => Number(i.Balance) > 0);
  }
  paymentAccounts() {
    return this.accounts().filter((a) => ['Cash', 'Bank', 'MobileMoney'].includes(a.AccountType));
  }
  saveInvoice() {
    const v: any = this.invoiceForm.getRawValue();
    this.api
      .post<any>('/finance/invoices', {
        BranchId: Number(v.BranchId),
        StudentId: Number(v.StudentId),
        DueDate: v.DueDate,
        Items: [
          { FeeTypeId: Number(v.FeeTypeId), Description: v.Description, Amount: Number(v.Amount) },
        ],
      })
      .subscribe((r) => this.done(r));
  }
  savePayment() {
    const v: any = this.paymentForm.getRawValue();
    this.api
      .post<any>('/payments', {
        InvoiceId: Number(v.InvoiceId),
        AccountId: Number(v.AccountId),
        IdempotencyKey: crypto.randomUUID(),
        Amount: Number(v.Amount),
        Method: v.Method,
      })
      .subscribe((r) => this.done(r));
  }
  saveDiscount() {
    const v: any = this.discountForm.getRawValue();
    this.api
      .post<any>('/finance/discounts', {
        ...v,
        StudentId: Number(v.StudentId),
        Percentage: v.DiscountType === 'Percentage' ? Number(v.Percentage) : null,
        FixedAmount: v.DiscountType === 'Fixed' ? Number(v.FixedAmount) : null,
        StartDate: v.StartDate || null,
        EndDate: v.EndDate || null,
      })
      .subscribe({ next: (r) => this.done(r), error: (e) => this.failed(e) });
  }
  toggleDiscount(d: any) {
    this.api
      .put<any>(`/finance/discounts/${d.StudentDiscountId}/status`, { IsActive: !d.IsActive })
      .subscribe({ next: (r) => this.done(r), error: (e) => this.failed(e) });
  }
  async adjust(invoice: any) {
    const type = await this.dialog.prompt('Adjustment type: Credit or Debit', 'Credit');
    if (!type || !['Credit', 'Debit'].includes(type)) return;
    const amount = await this.dialog.prompt('Adjustment amount', '', 'number');
    const reason = await this.dialog.prompt('Reason for adjustment');
    if (!amount || !reason) return;
    this.api
      .post<any>(`/finance/invoices/${invoice.InvoiceId}/adjustments`, {
        AdjustmentType: type,
        Amount: Number(amount),
        Reason: reason,
      })
      .subscribe({ next: (r) => this.done(r), error: (e) => this.failed(e) });
  }
  showReceipt(payment: any) {
    this.api
      .get<any>(`/finance/payments/${payment.PaymentId}/receipt`)
      .subscribe({ next: (r) => this.receipt.set(r.data), error: (e) => this.failed(e) });
  }
  printReceipt() {
    window.print();
  }
  saveAccount() {
    const v: any = this.accountForm.getRawValue();
    this.api
      .post<any>('/accounts', {
        ...v,
        BranchId: Number(v.BranchId),
        OpeningBalance: Number(v.OpeningBalance),
      })
      .subscribe((r) => this.done(r));
  }
  saveTransfer() {
    const v: any = this.transferForm.getRawValue();
    const from = this.accounts().find((a) => a.AccountId === Number(v.FromAccountId));
    this.api
      .post<any>('/accounts/transfers', {
        ...v,
        BranchId: Number(from?.BranchId),
        FromAccountId: Number(v.FromAccountId),
        ToAccountId: Number(v.ToAccountId),
        Amount: Number(v.Amount),
      })
      .subscribe((r) => this.done(r));
  }
  saveExpense() {
    const v: any = this.expenseForm.getRawValue();
    this.api
      .post<any>('/accounts/expenses', {
        ...v,
        BranchId: Number(v.BranchId),
        CategoryId: Number(v.CategoryId),
        AccountId: Number(v.AccountId),
        Amount: Number(v.Amount),
      })
      .subscribe((r) => this.done(r));
  }
  async addFeeType() {
    const name = await this.dialog.prompt('Fee type name');
    if (name)
      this.api.post<any>('/finance/fee-types', { FeeTypeName: name }).subscribe((r) => {
        this.message.set(r.message);
        this.loadAll();
      });
  }
  async addCategory() {
    const name = await this.dialog.prompt('Expense category name');
    if (name)
      this.api.post<any>('/accounts/expense-categories', { CategoryName: name }).subscribe((r) => {
        this.message.set(r.message);
        this.loadAll();
      });
  }
  async reverse(p: any) {
    const type = await this.dialog.prompt('Type Void or Refund', 'Refund');
    if (!type || !['Void', 'Refund'].includes(type)) return;
    const amount = await this.dialog.prompt('Amount', p.Amount, 'number');
    const reason = await this.dialog.prompt('Reason');
    if (amount && reason)
      this.api
        .post<any>(`/finance/payments/${p.PaymentId}/reverse`, {
          Type: type,
          Amount: Number(amount),
          Reason: reason,
        })
        .subscribe({ next: (r) => this.done(r), error: (e) => this.failed(e) });
  }
  done(r: any) {
    this.message.set(r.message);
    this.drawer.set(false);
    this.loadAll();
  }
  failed(e: any) {
    this.message.set(
      e.error?.message ||
        Object.values(e.error?.errors || {})
          .flat()
          .join(' ') ||
        'Operation failed.',
    );
  }
}

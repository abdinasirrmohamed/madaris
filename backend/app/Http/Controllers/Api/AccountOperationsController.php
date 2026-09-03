<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccountOperationsController extends Controller
{
    public function index(TenantContext $tenant)
    {
        $branches = $this->branchIds($tenant);
        $accounts = DB::table('Accounts')->where('TenantId',$tenant->id())->whereIn('BranchId',$branches)->where('IsActive',true)->orderBy('AccountName')->get();
        $transfers = DB::table('AccountTransfers as t')->join('Accounts as f','t.FromAccountId','=','f.AccountId')->join('Accounts as a','t.ToAccountId','=','a.AccountId')->where('t.TenantId',$tenant->id())->whereIn('t.BranchId',$branches)->select('t.*','f.AccountName as FromAccountName','a.AccountName as ToAccountName')->orderByDesc('t.AccountTransferId')->limit(100)->get();
        $movements = DB::table('LedgerTransactions as t')->join('LedgerEntries as e','t.LedgerTransactionId','=','e.LedgerTransactionId')->join('Accounts as a','e.AccountId','=','a.AccountId')->where('t.TenantId',$tenant->id())->whereIn('t.BranchId',$branches)->whereIn('t.ReferenceType',['Deposit','Withdrawal'])->whereColumn('e.AccountId','t.ReferenceId')->select('t.*','a.AccountName','e.Debit','e.Credit')->orderByDesc('t.LedgerTransactionId')->limit(100)->get();
        $reconciliations = DB::table('AccountReconciliations as r')->join('Accounts as a','r.AccountId','=','a.AccountId')->where('r.TenantId',$tenant->id())->whereIn('r.BranchId',$branches)->select('r.*','a.AccountName')->orderByDesc('r.AccountReconciliationId')->limit(100)->get();
        $categories = DB::table('ExpenseCategories')->where('TenantId',$tenant->id())->orderBy('CategoryName')->get();
        $employees = DB::table('Employees')->where('TenantId',$tenant->id())->whereIn('BranchId',$branches)->where('Status','Active')->orderBy('FullName')->get();
        $payrolls = DB::table('Payrolls as p')->join('Employees as e','p.EmployeeId','=','e.EmployeeId')->where('p.TenantId',$tenant->id())->whereIn('p.BranchId',$branches)->select('p.*','e.FullName','e.EmployeeNo')->orderByDesc('p.PayrollId')->get();
        return $this->ok(compact('accounts','transfers','movements','reconciliations','categories','employees','payrolls'));
    }

    public function movement(Request $request,TenantContext $tenant)
    {
        $data=$request->validate(['Type'=>['required',Rule::in(['Deposit','Withdrawal'])],'AccountId'=>['required','integer'],'Amount'=>['required','numeric','gt:0'],'TransactionDate'=>['required','date'],'Description'=>['required','string','min:3']]);
        $result=DB::transaction(function()use($data,$tenant){
            $account=DB::table('Accounts')->where('TenantId',$tenant->id())->whereIn('BranchId',$this->branchIds($tenant))->where('AccountId',$data['AccountId'])->lockForUpdate()->first();abort_unless($account,404);
            abort_if($data['Type']==='Withdrawal'&&(float)$account->CurrentBalance<(float)$data['Amount'],422,'Insufficient account balance.');
            $offsetType=$data['Type']==='Deposit'?'Income':'Expense';$offsetName=$data['Type']==='Deposit'?'Other Deposit Income':'Cash Withdrawal Expense';
            $offset=DB::table('Accounts')->where('TenantId',$tenant->id())->where('BranchId',$account->BranchId)->where('AccountName',$offsetName)->value('AccountId');
            if(!$offset)$offset=DB::table('Accounts')->insertGetId(['TenantId'=>$tenant->id(),'BranchId'=>$account->BranchId,'AccountName'=>$offsetName,'AccountType'=>$offsetType,'OpeningBalance'=>0,'CurrentBalance'=>0,'IsActive'=>true],'AccountId');
            $tx=DB::table('LedgerTransactions')->insertGetId(['TenantId'=>$tenant->id(),'BranchId'=>$account->BranchId,'ReferenceType'=>$data['Type'],'ReferenceId'=>$account->AccountId,'Description'=>$data['Description'],'TransactionDate'=>$data['TransactionDate'],'Status'=>'Posted','PostedByUserId'=>$tenant->user()->UserId,'CreatedAt'=>now()],'LedgerTransactionId');
            if($data['Type']==='Deposit'){DB::table('LedgerEntries')->insert([['TenantId'=>$tenant->id(),'LedgerTransactionId'=>$tx,'AccountId'=>$account->AccountId,'Debit'=>$data['Amount'],'Credit'=>0],['TenantId'=>$tenant->id(),'LedgerTransactionId'=>$tx,'AccountId'=>$offset,'Debit'=>0,'Credit'=>$data['Amount']]]);DB::table('Accounts')->where('AccountId',$account->AccountId)->increment('CurrentBalance',$data['Amount']);}
            else{DB::table('LedgerEntries')->insert([['TenantId'=>$tenant->id(),'LedgerTransactionId'=>$tx,'AccountId'=>$offset,'Debit'=>$data['Amount'],'Credit'=>0],['TenantId'=>$tenant->id(),'LedgerTransactionId'=>$tx,'AccountId'=>$account->AccountId,'Debit'=>0,'Credit'=>$data['Amount']]]);DB::table('Accounts')->where('AccountId',$account->AccountId)->decrement('CurrentBalance',$data['Amount']);}
            return DB::table('LedgerTransactions')->where('LedgerTransactionId',$tx)->first();
        });return $this->ok($result,$data['Type'].' posted.',201);
    }

    public function reconcile(Request $request,TenantContext $tenant)
    {
        $data=$request->validate(['AccountId'=>['required','integer'],'StatementDate'=>['required','date'],'StatementBalance'=>['required','numeric'],'Notes'=>['nullable','string']]);
        $account=DB::table('Accounts')->where('TenantId',$tenant->id())->whereIn('BranchId',$this->branchIds($tenant))->where('AccountId',$data['AccountId'])->first();abort_unless($account,404);
        $difference=round((float)$data['StatementBalance']-(float)$account->CurrentBalance,2);$id=DB::table('AccountReconciliations')->insertGetId(['TenantId'=>$tenant->id(),'BranchId'=>$account->BranchId,'BookBalance'=>$account->CurrentBalance,'Difference'=>$difference,'Status'=>abs($difference)<0.01?'Reconciled':'Difference found','ReconciledByUserId'=>$tenant->user()->UserId,'CreatedAt'=>now(),...$data],'AccountReconciliationId');
        return $this->ok(DB::table('AccountReconciliations')->where('AccountReconciliationId',$id)->first(),'Reconciliation saved.',201);
    }

    public function payrollAdjustment(Request $request,TenantContext $tenant,int $payroll)
    {
        $data=$request->validate(['Allowances'=>['required','numeric','min:0'],'Deductions'=>['required','numeric','min:0']]);
        $row=DB::table('Payrolls')->where('TenantId',$tenant->id())->whereIn('BranchId',$this->branchIds($tenant))->where('PayrollId',$payroll)->where('Status','Pending')->first();abort_unless($row,404,'Only pending payroll can be adjusted.');
        $net=(float)$row->BasicSalary+(float)$data['Allowances']-(float)$data['Deductions'];abort_if($net<0,422,'Deductions cannot exceed salary and allowances.');
        DB::table('Payrolls')->where('PayrollId',$payroll)->update([...$data,'NetSalary'=>$net]);return $this->ok(DB::table('Payrolls')->where('PayrollId',$payroll)->first(),'Payroll adjusted.');
    }
    private function branchIds(TenantContext $tenant):array{return DB::table('UserBranches')->where('TenantId',$tenant->id())->where('UserId',$tenant->user()->UserId)->pluck('BranchId')->map(fn($id)=>(int)$id)->all();}
    private function ok(mixed $data,string $message='Account operations retrieved.',int $status=200){return response()->json(['success'=>true,'message'=>$message,'data'=>$data,'meta'=>(object)[]],$status);}
}

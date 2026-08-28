<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
class BranchController extends Controller { public function __invoke(TenantContext $tenant){$rows=DB::table('Branches')->join('UserBranches','Branches.BranchId','=','UserBranches.BranchId')->where('Branches.TenantId',$tenant->id())->where('UserBranches.UserId',$tenant->user()->UserId)->select('Branches.*')->orderBy('Branches.Name')->get();return response()->json(['success'=>true,'message'=>'Branches retrieved.','data'=>$rows,'meta'=>(object)[]]);} }

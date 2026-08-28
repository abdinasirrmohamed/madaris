<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CheckBranchAccess
{
    public function handle(Request $request, Closure $next)
    {
        $branchId = $request->input('BranchId') ?? $request->query('BranchId');
        if ($branchId) {
            $allowed = DB::table('UserBranches')->where('TenantId', $request->user()->TenantId)->where('UserId', $request->user()->UserId)->where('BranchId', $branchId)->exists();
            abort_unless($allowed, 403, 'You do not have access to this branch.');
        }
        return $next($request);
    }
}

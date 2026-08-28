<?php

namespace App\Core\Tenancy\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class EnsureTenantIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->user()?->TenantId;
        abort_unless($tenantId, 403, 'A tenant account is required.');
        $active = DB::table('Tenants')->where('TenantId', $tenantId)->where('Status', 'Active')->exists();
        abort_unless($active, 403, 'This school account is inactive.');

        return $next($request);
    }
}

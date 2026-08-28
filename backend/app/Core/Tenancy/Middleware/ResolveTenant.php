<?php

namespace App\Core\Tenancy\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ResolveTenant
{
    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->TenantId, 403, 'A tenant account is required.');
        abort_if($request->user()->Status !== 'Active', 403, 'This account is suspended.');
        $this->context->set($request->user());

        return $next($request);
    }
}

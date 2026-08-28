<?php

namespace App\Core\Tenancy\Services;

use App\Models\User;

class TenantContext
{
    private ?int $tenantId = null;

    private ?User $user = null;

    public function set(User $user): void
    {
        $this->user = $user;
        $this->tenantId = $user->TenantId;
    }

    public function id(): int
    {
        abort_if(! $this->tenantId, 401, 'Tenant context is unavailable.');

        return $this->tenantId;
    }

    public function hasTenant(): bool
    {
        return $this->tenantId !== null;
    }

    public function user(): User
    {
        abort_if(! $this->user, 401);

        return $this->user;
    }

    public function clear(): void
    {
        $this->tenantId = null;
        $this->user = null;
    }
}

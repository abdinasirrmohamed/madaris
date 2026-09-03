<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('AccountReconciliations', function (Blueprint $table) {
            $table->id('AccountReconciliationId');
            $table->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $table->foreignId('BranchId')->constrained('Branches', 'BranchId');
            $table->foreignId('AccountId')->constrained('Accounts', 'AccountId');
            $table->date('StatementDate');
            $table->decimal('BookBalance', 14, 2);
            $table->decimal('StatementBalance', 14, 2);
            $table->decimal('Difference', 14, 2);
            $table->string('Status')->default('Reconciled');
            $table->text('Notes')->nullable();
            $table->unsignedBigInteger('ReconciledByUserId');
            $table->timestamp('CreatedAt')->useCurrent();
            $table->index(['TenantId', 'AccountId', 'StatementDate']);
        });
    }
    public function down(): void { Schema::dropIfExists('AccountReconciliations'); }
};

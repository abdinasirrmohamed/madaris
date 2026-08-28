<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Invoices', function (Blueprint $table) {
            $table->decimal('Subtotal', 14, 2)->default(0)->after('InvoiceNo');
            $table->decimal('DiscountTotal', 14, 2)->default(0)->after('Subtotal');
            $table->decimal('AdjustmentTotal', 14, 2)->default(0)->after('DiscountTotal');
        });
        DB::table('Invoices')->update(['Subtotal' => DB::raw('Total')]);
        Schema::table('Payments', fn (Blueprint $table) => $table->decimal('ReversedAmount', 14, 2)->default(0)->after('Amount'));
        Schema::create('InvoiceAdjustments', function (Blueprint $table) {
            $table->id('InvoiceAdjustmentId');
            $table->foreignId('TenantId')->constrained('Tenants', 'TenantId')->cascadeOnDelete();
            $table->foreignId('BranchId')->constrained('Branches', 'BranchId');
            $table->foreignId('InvoiceId')->constrained('Invoices', 'InvoiceId')->cascadeOnDelete();
            $table->string('AdjustmentType');
            $table->decimal('Amount', 14, 2);
            $table->text('Reason');
            $table->unsignedBigInteger('ApprovedByUserId');
            $table->timestamp('CreatedAt')->useCurrent();
            $table->index(['TenantId', 'InvoiceId']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('InvoiceAdjustments');
        Schema::table('Payments', fn (Blueprint $table) => $table->dropColumn('ReversedAmount'));
        Schema::table('Invoices', fn (Blueprint $table) => $table->dropColumn(['Subtotal', 'DiscountTotal', 'AdjustmentTotal']));
    }
};

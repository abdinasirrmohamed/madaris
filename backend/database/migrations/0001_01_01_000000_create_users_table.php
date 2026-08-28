<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('Users', function (Blueprint $table) {
            $table->id('UserId');
            $table->unsignedBigInteger('TenantId')->nullable()->index();
            $table->string('Name');
            $table->string('Email')->unique();
            $table->timestamp('EmailVerifiedAt')->nullable();
            $table->string('Password');
            $table->string('Status')->default('Active');
            $table->json('Permissions')->nullable();
            $table->rememberToken();
            $table->timestamp('CreatedAt')->nullable();
            $table->timestamp('UpdatedAt')->nullable();
        });

        Schema::create('PasswordResetTokens', function (Blueprint $table) {
            $table->string('Email')->primary();
            $table->string('Token');
            $table->timestamp('CreatedAt')->nullable();
        });

        Schema::create('Sessions', function (Blueprint $table) {
            $table->string('Id')->primary();
            $table->unsignedBigInteger('UserId')->nullable()->index();
            $table->string('IpAddress', 45)->nullable();
            $table->text('UserAgent')->nullable();
            $table->longText('Payload');
            $table->integer('LastActivity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Users');
        Schema::dropIfExists('PasswordResetTokens');
        Schema::dropIfExists('Sessions');
    }
};

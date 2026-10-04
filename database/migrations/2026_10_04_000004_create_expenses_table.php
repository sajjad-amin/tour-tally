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
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tour_id')->constrained('tours')->cascadeOnDelete();
            $table->foreignUuid('paid_by')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('added_by')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('category');
            $table->text('description');
            $table->date('date');
            $table->enum('status', ['pending', 'approved', 'edit_requested', 'delete_requested', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

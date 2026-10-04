<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Backfill existing paid_by to expense_payers if any exists
        if (Schema::hasColumn('expenses', 'paid_by') && Schema::hasTable('expense_payers')) {
            $existingExpenses = DB::table('expenses')->whereNotNull('paid_by')->get();
            foreach ($existingExpenses as $expense) {
                $alreadyExists = DB::table('expense_payers')
                    ->where('expense_id', $expense->id)
                    ->where('user_id', $expense->paid_by)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('expense_payers')->insert([
                        'id' => (string) Str::uuid(),
                        'expense_id' => $expense->id,
                        'user_id' => $expense->paid_by,
                        'amount' => $expense->amount,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 2. Rename description to title, add notes, and drop paid_by
        Schema::disableForeignKeyConstraints();

        Schema::table('expenses', function (Blueprint $table) {
            $table->renameColumn('description', 'title');
            $table->text('notes')->nullable();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['paid_by']);
            $table->dropColumn('paid_by');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignUuid('paid_by')->nullable()->constrained('users')->cascadeOnDelete();
            $table->renameColumn('title', 'description');
            $table->dropColumn('notes');
        });
    }
};

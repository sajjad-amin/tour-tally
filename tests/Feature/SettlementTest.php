<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\ExpensePayer;
use App\Models\ExpenseSplit;
use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettlementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    protected function createUser(string $name, string $email): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        return $user;
    }

    protected function createTourWithThreeMembers(): array
    {
        $alice = $this->createUser('Alice', 'alice@tourtally.test');
        $bob = $this->createUser('Bob', 'bob@tourtally.test');
        $charlie = $this->createUser('Charlie', 'charlie@tourtally.test');

        $tour = Tour::create([
            'name' => 'Sajek Valley Expedition',
            'destination' => 'Sajek',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
            'status' => 'active',
            'created_by' => $alice->id,
        ]);

        TourMember::create(['tour_id' => $tour->id, 'user_id' => $alice->id, 'role' => 'admin', 'status' => 'joined']);
        TourMember::create(['tour_id' => $tour->id, 'user_id' => $bob->id, 'role' => 'member', 'status' => 'joined']);
        TourMember::create(['tour_id' => $tour->id, 'user_id' => $charlie->id, 'role' => 'member', 'status' => 'joined']);

        return [$tour, $alice, $bob, $charlie];
    }

    public function test_settlement_only_includes_approved_expenses(): void
    {
        [$tour, $alice, $bob, $charlie] = $this->createTourWithThreeMembers();

        // 1. Approved expense: Alice paid $300, split 100 each
        $approvedExpense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $alice->id,
            'amount' => 300.00,
            'category' => 'Hotel',
            'title' => 'Resort booking',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $approvedExpense->id, 'user_id' => $alice->id, 'amount' => 300.00]);
        ExpenseSplit::create(['expense_id' => $approvedExpense->id, 'user_id' => $alice->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $approvedExpense->id, 'user_id' => $bob->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $approvedExpense->id, 'user_id' => $charlie->id, 'amount_owed' => 100.00]);

        // 2. Pending expense: Bob paid $90, split 30 each (must NOT be counted)
        $pendingExpense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $bob->id,
            'amount' => 90.00,
            'category' => 'Food',
            'title' => 'Unapproved Dinner',
            'date' => '2026-11-02',
            'status' => 'pending',
        ]);
        ExpensePayer::create(['expense_id' => $pendingExpense->id, 'user_id' => $bob->id, 'amount' => 90.00]);
        ExpenseSplit::create(['expense_id' => $pendingExpense->id, 'user_id' => $alice->id, 'amount_owed' => 30.00]);
        ExpenseSplit::create(['expense_id' => $pendingExpense->id, 'user_id' => $bob->id, 'amount_owed' => 30.00]);
        ExpenseSplit::create(['expense_id' => $pendingExpense->id, 'user_id' => $charlie->id, 'amount_owed' => 30.00]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/settlements");

        $response->assertStatus(200)
            ->assertJsonPath('total_approved_expenses', 300)
            ->assertJsonPath('approved_expenses_count', 1);

        $memberBalances = collect($response->json('member_balances'));

        $aliceBal = $memberBalances->firstWhere('user.id', $alice->id);
        $bobBal = $memberBalances->firstWhere('user.id', $bob->id);
        $charlieBal = $memberBalances->firstWhere('user.id', $charlie->id);

        // Alice paid 300, owes 100 -> net +200
        $this->assertEquals(300.00, $aliceBal['total_paid']);
        $this->assertEquals(100.00, $aliceBal['total_owed']);
        $this->assertEquals(200.00, $aliceBal['net_balance']);
        $this->assertEquals('credit', $aliceBal['status']);

        // Bob paid 0, owes 100 -> net -100
        $this->assertEquals(0.00, $bobBal['total_paid']);
        $this->assertEquals(100.00, $bobBal['total_owed']);
        $this->assertEquals(-100.00, $bobBal['net_balance']);
        $this->assertEquals('debt', $bobBal['status']);

        // Charlie paid 0, owes 100 -> net -100
        $this->assertEquals(0.00, $charlieBal['total_paid']);
        $this->assertEquals(100.00, $charlieBal['total_owed']);
        $this->assertEquals(-100.00, $charlieBal['net_balance']);
        $this->assertEquals('debt', $charlieBal['status']);

        // Suggested transactions: Bob pays Alice $100, Charlie pays Alice $100
        $transactions = $response->json('suggested_transactions');
        $this->assertCount(2, $transactions);
        $this->assertEquals(100.00, $transactions[0]['amount']);
        $this->assertEquals($alice->id, $transactions[0]['to']['id']);
        $this->assertEquals(100.00, $transactions[1]['amount']);
        $this->assertEquals($alice->id, $transactions[1]['to']['id']);
    }

    public function test_settlement_with_multiple_payers_for_single_expense(): void
    {
        [$tour, $alice, $bob, $charlie] = $this->createTourWithThreeMembers();

        // Single expense: $300 bill, paid by Alice ($200) and Bob ($100), split equally $100 each
        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $alice->id,
            'amount' => 300.00,
            'category' => 'Food',
            'title' => 'Group Feast',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount' => 200.00]);
        ExpensePayer::create(['expense_id' => $expense->id, 'user_id' => $bob->id, 'amount' => 100.00]);

        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $bob->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $charlie->id, 'amount_owed' => 100.00]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/settlements");

        $response->assertStatus(200);

        $memberBalances = collect($response->json('member_balances'));
        $aliceBal = $memberBalances->firstWhere('user.id', $alice->id);
        $bobBal = $memberBalances->firstWhere('user.id', $bob->id);
        $charlieBal = $memberBalances->firstWhere('user.id', $charlie->id);

        // Alice: paid 200, owes 100 => net +100
        $this->assertEquals(200.00, $aliceBal['total_paid']);
        $this->assertEquals(100.00, $aliceBal['total_owed']);
        $this->assertEquals(100.00, $aliceBal['net_balance']);

        // Bob: paid 100, owes 100 => net 0 (settled)
        $this->assertEquals(100.00, $bobBal['total_paid']);
        $this->assertEquals(100.00, $bobBal['total_owed']);
        $this->assertEquals(0.00, $bobBal['net_balance']);

        // Charlie: paid 0, owes 100 => net -100 (debt)
        $this->assertEquals(0.00, $charlieBal['total_paid']);
        $this->assertEquals(100.00, $charlieBal['total_owed']);
        $this->assertEquals(-100.00, $charlieBal['net_balance']);

        // Suggested transaction: Charlie pays Alice $100 directly
        $transactions = $response->json('suggested_transactions');
        $this->assertCount(1, $transactions);
        $this->assertEquals($charlie->id, $transactions[0]['from']['id']);
        $this->assertEquals($alice->id, $transactions[0]['to']['id']);
        $this->assertEquals(100.00, $transactions[0]['amount']);
    }

    public function test_settlement_with_advance_deposit_tour_fund(): void
    {
        [$tour, $alice, $bob, $charlie] = $this->createTourWithThreeMembers();

        // Advance deposit: Charlie gives Alice $500 as tour fund
        // payer = Charlie, split = Alice
        $deposit = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $charlie->id,
            'amount' => 500.00,
            'category' => 'Others',
            'title' => 'Advance Deposit / Tour Fund',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $deposit->id, 'user_id' => $charlie->id, 'amount' => 500.00]);
        ExpenseSplit::create(['expense_id' => $deposit->id, 'user_id' => $alice->id, 'amount_owed' => 500.00]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/settlements");

        $response->assertStatus(200);

        $memberBalances = collect($response->json('member_balances'));
        $aliceBal = $memberBalances->firstWhere('user.id', $alice->id);
        $charlieBal = $memberBalances->firstWhere('user.id', $charlie->id);

        // Charlie paid 500, owes 0 => +500
        $this->assertEquals(500.00, $charlieBal['net_balance']);
        // Alice paid 0, owes 500 => -500
        $this->assertEquals(-500.00, $aliceBal['net_balance']);

        $transactions = $response->json('suggested_transactions');
        $this->assertCount(1, $transactions);
        $this->assertEquals($alice->id, $transactions[0]['from']['id']);
        $this->assertEquals($charlie->id, $transactions[0]['to']['id']);
        $this->assertEquals(500.00, $transactions[0]['amount']);
    }

    public function test_settlement_minimizes_chained_debts(): void
    {
        [$tour, $alice, $bob, $charlie] = $this->createTourWithThreeMembers();

        // Transaction 1: Alice pays $100 for Bob
        $exp1 = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $alice->id,
            'amount' => 100.00,
            'category' => 'Transport',
            'title' => 'Bus for Bob',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $exp1->id, 'user_id' => $alice->id, 'amount' => 100.00]);
        ExpenseSplit::create(['expense_id' => $exp1->id, 'user_id' => $bob->id, 'amount_owed' => 100.00]);

        // Transaction 2: Bob pays $100 for Charlie
        $exp2 = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $bob->id,
            'amount' => 100.00,
            'category' => 'Activity',
            'title' => 'Paragliding for Charlie',
            'date' => '2026-11-02',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $exp2->id, 'user_id' => $bob->id, 'amount' => 100.00]);
        ExpenseSplit::create(['expense_id' => $exp2->id, 'user_id' => $charlie->id, 'amount_owed' => 100.00]);

        // Net balances:
        // Alice: paid 100, owed 0 => +100
        // Bob: paid 100, owed 100 => 0 (settled)
        // Charlie: paid 0, owed 100 => -100

        $response = $this->actingAs($bob, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/settlements");

        $response->assertStatus(200);

        $transactions = $response->json('suggested_transactions');

        // Bob should be bypassed! Charlie should pay Alice $100 directly.
        $this->assertCount(1, $transactions);
        $this->assertEquals($charlie->id, $transactions[0]['from']['id']);
        $this->assertEquals($alice->id, $transactions[0]['to']['id']);
        $this->assertEquals(100.00, $transactions[0]['amount']);
    }

    public function test_non_member_cannot_access_tour_settlements(): void
    {
        [$tour] = $this->createTourWithThreeMembers();
        $stranger = $this->createUser('Outsider', 'outsider@tourtally.test');

        $response = $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/settlements");

        $response->assertStatus(403);
    }
}

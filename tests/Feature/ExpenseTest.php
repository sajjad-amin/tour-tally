<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\ExpensePayer;
use App\Models\ExpenseSplit;
use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use App\Notifications\TourExpenseNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ExpenseTest extends TestCase
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

    protected function createTourWithMembers(): array
    {
        $creator = $this->createUser('Creator User', 'creator@tourtally.test');
        $member1 = $this->createUser('Member One', 'member1@tourtally.test');
        $member2 = $this->createUser('Member Two', 'member2@tourtally.test');

        $tour = Tour::create([
            'name' => 'Cox\'s Bazar Winter Getaway',
            'destination' => 'Cox\'s Bazar',
            'description' => 'Beach holiday and seafood exploration.',
            'start_date' => '2026-12-10',
            'end_date' => '2026-12-15',
            'status' => 'active',
            'created_by' => $creator->id,
        ]);

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $member1->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $member2->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        return [$tour, $creator, $member1, $member2];
    }

    public function test_active_member_can_create_expense_with_splits_inside_transaction(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 300.00,
            'paid_by' => $creator->id,
            'category' => 'Food & Dining',
            'title' => 'Seafood dinner at Inani Beach.',
            'date' => '2026-12-11',
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 100.00],
                ['user_id' => $member1->id, 'amount' => 100.00],
                ['user_id' => $member2->id, 'amount' => 100.00],
            ],
        ];

        $response = $this->actingAs($member1, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('expense.status', 'pending')
            ->assertJsonPath('expense.amount', '300.00')
            ->assertJsonPath('expense.category', 'Food & Dining')
            ->assertJsonPath('expense.title', 'Seafood dinner at Inani Beach.')
            ->assertJsonPath('expense.added_by.id', $member1->id)
            ->assertJsonPath('expense.added_by_id', $member1->id)
            ->assertJsonCount(1, 'expense.payers')
            ->assertJsonPath('expense.payers.0.user.id', $creator->id)
            ->assertJsonCount(3, 'expense.splits');

        // Check Expense table
        $this->assertDatabaseHas('expenses', [
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 300.00,
            'status' => 'pending',
            'category' => 'Food & Dining',
            'title' => 'Seafood dinner at Inani Beach.',
        ]);

        // Check ExpensePayer table
        $this->assertDatabaseHas('expense_payers', [
            'user_id' => $creator->id,
            'amount' => 300.00,
        ]);

        // Check ExpenseSplit table
        $this->assertDatabaseHas('expense_splits', [
            'user_id' => $creator->id,
            'amount_owed' => 100.00,
        ]);
        $this->assertDatabaseHas('expense_splits', [
            'user_id' => $member1->id,
            'amount_owed' => 100.00,
        ]);
        $this->assertDatabaseHas('expense_splits', [
            'user_id' => $member2->id,
            'amount_owed' => 100.00,
        ]);
    }

    public function test_can_create_expense_with_multiple_payers(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 200.00,
            'category' => 'Hotel',
            'title' => 'Resort Booking Shared Payment',
            'notes' => 'Paid via card and cash',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $creator->id, 'amount' => 150.00],
                ['user_id' => $member1->id, 'amount' => 50.00],
            ],
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 100.00],
                ['user_id' => $member1->id, 'amount' => 100.00],
            ],
        ];

        $response = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('expense.status', 'pending')
            ->assertJsonPath('expense.amount', '200.00')
            ->assertJsonPath('expense.title', 'Resort Booking Shared Payment')
            ->assertJsonPath('expense.notes', 'Paid via card and cash')
            ->assertJsonCount(2, 'expense.payers')
            ->assertJsonCount(2, 'expense.splits');

        $this->assertDatabaseHas('expense_payers', [
            'user_id' => $creator->id,
            'amount' => 150.00,
        ]);
        $this->assertDatabaseHas('expense_payers', [
            'user_id' => $member1->id,
            'amount' => 50.00,
        ]);
    }

    public function test_can_update_expense_with_new_payers_and_splits(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 100.00,
            'category' => 'Food',
            'title' => 'Old Dinner',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 100.00,
        ]);

        $updatePayload = [
            'amount' => 150.00,
            'category' => 'Food',
            'title' => 'Updated Grand Dinner',
            'notes' => 'Added dessert',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $member1->id, 'amount' => 100.00],
                ['user_id' => $creator->id, 'amount' => 50.00],
            ],
            'splits' => [
                ['user_id' => $member1->id, 'amount' => 75.00],
                ['user_id' => $creator->id, 'amount' => 75.00],
            ],
        ];

        $response = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}", $updatePayload);

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'pending')
            ->assertJsonPath('expense.added_by.id', $member1->id)
            ->assertJsonPath('expense.title', 'Updated Grand Dinner')
            ->assertJsonPath('expense.notes', 'Added dessert')
            ->assertJsonPath('expense.amount', '150.00')
            ->assertJsonCount(2, 'expense.payers')
            ->assertJsonCount(2, 'expense.splits');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'added_by' => $member1->id,
            'status' => 'pending',
            'title' => 'Updated Grand Dinner',
            'amount' => 150.00,
        ]);
        $this->assertDatabaseCount('expense_payers', 2);
        $this->assertDatabaseCount('expense_splits', 2);
    }

    public function test_expense_creation_by_member_notifies_tour_admins(): void
    {
        Notification::fake();

        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 120.00,
            'paid_by' => $member1->id,
            'category' => 'Food',
            'title' => 'Lunch',
            'date' => '2026-12-11',
            'splits' => [
                ['user_id' => $member1->id, 'amount' => 60.00],
                ['user_id' => $creator->id, 'amount' => 60.00],
            ],
        ];

        $this->actingAs($member1, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload)
            ->assertStatus(201);

        Notification::assertSentTo(
            $creator,
            TourExpenseNotification::class,
            function ($n) {
                return $n->actionType === 'expense_created';
            }
        );

        Notification::assertNotSentTo($member2, TourExpenseNotification::class);
    }

    public function test_expense_creation_by_admin_notifies_payer_and_split_members(): void
    {
        Notification::fake();

        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 150.00,
            'paid_by' => $member1->id, // payer is member1 (different from creator)
            'category' => 'Transport',
            'title' => 'Bus tickets',
            'date' => '2026-12-11',
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 50.00],
                ['user_id' => $member1->id, 'amount' => 50.00],
                ['user_id' => $member2->id, 'amount' => 50.00],
            ],
        ];

        $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload)
            ->assertStatus(201);

        // Creator should not notify himself, but should notify member1 and member2
        Notification::assertSentTo($member1, TourExpenseNotification::class);
        Notification::assertSentTo($member2, TourExpenseNotification::class);
        Notification::assertNotSentTo($creator, TourExpenseNotification::class);
    }

    public function test_tour_admin_can_approve_member_expense_and_creator_is_notified(): void
    {
        Notification::fake();

        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 100.00,
            'category' => 'Food',
            'title' => 'Dinner buffet',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 50.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 50.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved')
            ->assertJsonPath('message', 'Expense approved successfully.');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'approved',
        ]);

        Notification::assertSentTo(
            $member1,
            TourExpenseNotification::class,
            fn ($n) => $n->actionType === 'expense_approved'
        );
    }

    public function test_other_member_can_approve_expense_created_by_admin(): void
    {
        Notification::fake();

        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id, // Admin created it
            'amount' => 100.00,
            'category' => 'Hotel',
            'title' => 'Room booking',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 50.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 50.00,
        ]);

        // Regular member1 can approve because creator is an admin
        $response = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved');

        Notification::assertSentTo(
            $creator,
            TourExpenseNotification::class,
            fn ($n) => $n->actionType === 'expense_approved'
        );
    }

    public function test_user_cannot_approve_their_own_expense_when_other_members_exist(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 50.00,
            'category' => 'Transport',
            'title' => 'Gas',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 50.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 50.00,
        ]);

        // Creator attempts to self-approve
        $response = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You cannot approve your own expense. It must be approved by another tour member or admin.');
    }

    public function test_regular_member_cannot_approve_another_regular_members_expense(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id, // Regular member created it
            'amount' => 60.00,
            'category' => 'Food',
            'title' => 'Snacks',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 60.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 30.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member2->id,
            'amount_owed' => 30.00,
        ]);

        // Member2 tries to approve Member1's expense -> forbidden (only tour admin can approve)
        $response = $this->actingAs($member2, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Only a Tour Admin can approve this expense.');
    }

    public function test_approving_delete_requested_expense_permanently_deletes_it_and_splits(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 90.00,
            'category' => 'Food',
            'title' => 'Cancelled booking',
            'date' => '2026-12-11',
            'status' => 'delete_requested',
        ]);
        $payer = ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 90.00,
        ]);
        $split = ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 90.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('deleted', true)
            ->assertJsonPath('message', 'Expense permanently deleted upon approval of deletion request.');

        // Record must be completely removed from DB
        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
        $this->assertDatabaseMissing('expense_payers', ['id' => $payer->id]);
        $this->assertDatabaseMissing('expense_splits', ['id' => $split->id]);
    }

    public function test_rejecting_pending_expense_marks_it_rejected_and_notifies_creator(): void
    {
        Notification::fake();

        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 500.00,
            'category' => 'Luxury',
            'title' => 'Invalid private expenditure',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 500.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'rejected')
            ->assertJsonPath('message', 'Expense has been rejected.');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'rejected',
        ]);

        Notification::assertSentTo(
            $member1,
            TourExpenseNotification::class,
            fn ($n) => $n->actionType === 'expense_rejected'
        );
    }

    public function test_rejecting_delete_requested_expense_restores_status_to_approved(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 80.00,
            'category' => 'Transport',
            'title' => 'Taxi fare',
            'date' => '2026-12-11',
            'status' => 'delete_requested',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 80.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved')
            ->assertJsonPath('message', 'Expense deletion request was rejected. The expense remains approved.');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'approved',
        ]);
    }

    public function test_involved_user_can_request_edit_and_admins_are_notified(): void
    {
        Notification::fake();

        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 120.00,
            'category' => 'Dinner',
            'title' => 'Restaurant bill',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 120.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 60.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 60.00,
        ]);

        // Member1 is in splits, so they have the right to request edit
        $response = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/request-edit");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'edit_requested')
            ->assertJsonPath('message', 'Edit request submitted successfully and is awaiting review.');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'edit_requested',
        ]);

        Notification::assertSentTo(
            $creator,
            TourExpenseNotification::class,
            fn ($n) => $n->actionType === 'expense_edit_requested'
        );
    }

    public function test_uninvolved_non_admin_cannot_request_edit_or_delete(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 100.00,
            'category' => 'Tour Guide',
            'title' => 'Private tour guide',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 100.00,
        ]);

        // Member2 is neither creator, payer, split debtor, nor admin
        $resEdit = $this->actingAs($member2, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/request-edit");
        $resEdit->assertStatus(403);

        $resDelete = $this->actingAs($member2, 'sanctum')
            ->deleteJson("/api/tours/{$tour->id}/expenses/{$expense->id}");
        $resDelete->assertStatus(403);
    }

    public function test_expense_creation_fails_and_rolls_back_if_sum_of_splits_does_not_match_amount(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 300.00,
            'paid_by' => $creator->id,
            'category' => 'Transport',
            'title' => 'Jeep hire across hills',
            'date' => '2026-12-12',
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 100.00],
                ['user_id' => $member1->id, 'amount' => 100.00],
                ['user_id' => $member2->id, 'amount' => 50.00], // Sum is 250, not 300
            ],
        ];

        $response = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'The sum of splits ($250.00) does not match the total expense amount ($300.00).',
            ]);

        // Database must have no expenses or splits saved
        $this->assertDatabaseCount('expenses', 0);
        $this->assertDatabaseCount('expense_splits', 0);
    }

    public function test_expense_creation_fails_if_sum_of_payers_does_not_match_amount(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $payload = [
            'amount' => 200.00,
            'category' => 'Food',
            'title' => 'Feast',
            'date' => '2026-12-12',
            'payers' => [
                ['user_id' => $creator->id, 'amount' => 100.00], // Sum is 100, not 200
            ],
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 100.00],
                ['user_id' => $member1->id, 'amount' => 100.00],
            ],
        ];

        $response = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payload);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'The sum of payer allocations ($100.00) does not match the total expense amount ($200.00).',
            ]);

        $this->assertDatabaseCount('expenses', 0);
        $this->assertDatabaseCount('expense_payers', 0);
    }

    public function test_non_member_cannot_access_or_create_expenses(): void
    {
        [$tour] = $this->createTourWithMembers();
        $stranger = $this->createUser('Stranger User', 'stranger@tourtally.test');

        // Cannot view
        $resView = $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/expenses");
        $resView->assertStatus(403);

        // Cannot create
        $resCreate = $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", [
                'amount' => 50.00,
                'paid_by' => $stranger->id,
                'category' => 'Transport',
                'title' => 'Unauthorized trip',
                'date' => '2026-12-12',
                'splits' => [
                    ['user_id' => $stranger->id, 'amount' => 50.00],
                ],
            ]);
        $resCreate->assertStatus(403);
    }

    public function test_delete_request_updates_status_to_delete_requested_without_deleting_record(): void
    {
        Notification::fake();

        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 150.00,
            'category' => 'Hotel',
            'title' => 'Room deposit',
            'date' => '2026-12-10',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 150.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 75.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 75.00,
        ]);

        $response = $this->actingAs($member1, 'sanctum')
            ->deleteJson("/api/tours/{$tour->id}/expenses/{$expense->id}");

        $response->assertStatus(200)
            ->assertJsonPath('expense.status', 'delete_requested')
            ->assertJsonPath('message', 'Expense deletion has been requested and is awaiting review.');

        // Verify the record STILL exists in database with status 'delete_requested'
        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'delete_requested',
            'added_by' => $member1->id,
            'amount' => 150.00,
        ]);

        // Splits must still exist
        $this->assertDatabaseCount('expense_splits', 2);
        $this->assertDatabaseCount('expense_payers', 1);

        // Tour Admin should be notified
        Notification::assertSentTo(
            $creator,
            TourExpenseNotification::class,
            fn ($n) => $n->actionType === 'expense_delete_requested'
        );
    }

    public function test_can_list_tour_expenses_ordered_by_date_desc(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        // Older expense
        $exp1 = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 50.00,
            'category' => 'Snacks',
            'title' => 'Road trip snacks',
            'date' => '2026-12-10',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $exp1->id,
            'user_id' => $creator->id,
            'amount' => 50.00,
        ]);

        // Newer expense
        $exp2 = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 200.00,
            'category' => 'Resort',
            'title' => 'Night stay',
            'date' => '2026-12-14',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $exp2->id,
            'user_id' => $member1->id,
            'amount' => 200.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/expenses");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'expenses')
            ->assertJsonPath('expenses.0.title', 'Night stay')
            ->assertJsonPath('expenses.1.title', 'Road trip snacks');
    }

    public function test_can_get_single_expense_details(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 80.00,
            'category' => 'Activity',
            'title' => 'Speedboat ride',
            'date' => '2026-12-12',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 80.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 40.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 40.00,
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/expenses/{$expense->id}");

        $response->assertStatus(200)
            ->assertJsonPath('expense.id', $expense->id)
            ->assertJsonPath('expense.title', 'Speedboat ride')
            ->assertJsonCount(1, 'expense.payers')
            ->assertJsonPath('expense.payers.0.user.id', $creator->id)
            ->assertJsonPath('expense.payers.0.user.name', $creator->name)
            ->assertJsonCount(2, 'expense.splits');
    }

    public function test_cannot_create_expense_with_payer_or_split_user_not_in_tour(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();
        $stranger = $this->createUser('Outsider', 'outsider@tourtally.test');

        // Case 1: Payer not in tour
        $payloadPayer = [
            'amount' => 100.00,
            'paid_by' => $stranger->id,
            'category' => 'Others',
            'title' => 'Invalid payer',
            'date' => '2026-12-10',
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 100.00],
            ],
        ];

        $resPayer = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payloadPayer);

        $resPayer->assertStatus(422)
            ->assertJsonPath('message', 'The user ('.$stranger->id.') in payer allocation is not an active member of this tour.');

        // Case 2: Split member not in tour
        $payloadSplit = [
            'amount' => 100.00,
            'paid_by' => $creator->id,
            'category' => 'Others',
            'title' => 'Invalid split user',
            'date' => '2026-12-10',
            'splits' => [
                ['user_id' => $stranger->id, 'amount' => 100.00],
            ],
        ];

        $resSplit = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/expenses", $payloadSplit);

        $resSplit->assertStatus(422);
    }

    public function test_member_editing_approved_expense_creates_proposed_changes_and_status_becomes_edit_requested_then_approved_applies_changes(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 100.00,
            'category' => 'Food',
            'title' => 'Initial dinner',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 100.00,
        ]);

        $updatePayload = [
            'amount' => 120.00,
            'category' => 'Food',
            'title' => 'Updated dinner with extras',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $creator->id, 'amount' => 120.00],
            ],
            'splits' => [
                ['user_id' => $member1->id, 'amount' => 60.00],
                ['user_id' => $member2->id, 'amount' => 60.00],
            ],
        ];

        // Member1 updates the approved expense -> stores proposed_changes, keeps original columns
        $resUpdate = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}", $updatePayload);

        $resUpdate->assertStatus(200)
            ->assertJsonPath('expense.status', 'edit_requested')
            ->assertJsonPath('expense.added_by.id', $member1->id)
            ->assertJsonPath('expense.amount', '100.00') // Original amount unchanged until approved
            ->assertJsonPath('expense.title', 'Initial dinner')
            ->assertJsonPath('expense.proposed_changes.amount', 120)
            ->assertJsonPath('expense.proposed_changes.title', 'Updated dinner with extras');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'added_by' => $member1->id,
            'status' => 'edit_requested',
            'amount' => 100.00,
            'title' => 'Initial dinner',
        ]);

        // Member1 cannot self-approve their edit request
        $resSelfApprove = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resSelfApprove->assertStatus(403)
            ->assertJsonPath('message', 'You cannot approve your own expense. It must be approved by another tour member or admin.');

        // Member2 (regular member) cannot approve Member1's update (only admin can approve member)
        $resMemberApprove = $this->actingAs($member2, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resMemberApprove->assertStatus(403)
            ->assertJsonPath('message', 'Only a Tour Admin can approve this expense.');

        // Creator (Tour Admin) approves Member1's edit request -> applies proposed changes
        $resAdminApprove = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resAdminApprove->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved')
            ->assertJsonPath('expense.amount', '120.00')
            ->assertJsonPath('expense.title', 'Updated dinner with extras')
            ->assertJsonPath('expense.proposed_changes', null);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'approved',
            'amount' => 120.00,
            'title' => 'Updated dinner with extras',
            'proposed_changes' => null,
        ]);
        $this->assertDatabaseCount('expense_splits', 2);
        $this->assertDatabaseHas('expense_splits', ['user_id' => $member1->id, 'amount_owed' => 60.00]);
        $this->assertDatabaseHas('expense_splits', ['user_id' => $member2->id, 'amount_owed' => 60.00]);
    }

    public function test_admin_editing_expense_sets_added_by_to_admin_and_regular_member_can_approve(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 80.00,
            'category' => 'Transport',
            'title' => 'Bus tickets',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 80.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount_owed' => 80.00,
        ]);

        $updatePayload = [
            'amount' => 90.00,
            'category' => 'Transport',
            'title' => 'Bus tickets + luggage fee',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $member1->id, 'amount' => 90.00],
            ],
            'splits' => [
                ['user_id' => $creator->id, 'amount' => 90.00],
            ],
        ];

        // Admin updates the expense -> status becomes edit_requested with proposed_changes
        $resUpdate = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}", $updatePayload);

        $resUpdate->assertStatus(200)
            ->assertJsonPath('expense.status', 'edit_requested')
            ->assertJsonPath('expense.added_by.id', $creator->id)
            ->assertJsonPath('expense.amount', '80.00')
            ->assertJsonPath('expense.proposed_changes.amount', 90);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'added_by' => $creator->id,
            'status' => 'edit_requested',
            'amount' => 80.00,
        ]);

        // Admin cannot self-approve their update
        $resAdminSelf = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resAdminSelf->assertStatus(403);

        // Regular Member1 CAN approve Admin's update -> applies proposed_changes
        $resMemberApprove = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resMemberApprove->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved')
            ->assertJsonPath('expense.amount', '90.00')
            ->assertJsonPath('expense.title', 'Bus tickets + luggage fee')
            ->assertJsonPath('expense.proposed_changes', null);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'approved',
            'amount' => 90.00,
            'proposed_changes' => null,
        ]);
    }

    public function test_rejecting_edit_requested_expense_clears_proposed_changes_and_reverts_to_approved(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 100.00,
            'category' => 'Food',
            'title' => 'Original dinner',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 100.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 100.00,
        ]);

        // Member1 proposes an edit
        $updatePayload = [
            'amount' => 150.00,
            'category' => 'Food',
            'title' => 'Expensive dinner',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $creator->id, 'amount' => 150.00],
            ],
            'splits' => [
                ['user_id' => $member1->id, 'amount' => 150.00],
            ],
        ];

        $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}", $updatePayload)
            ->assertStatus(200)
            ->assertJsonPath('expense.status', 'edit_requested');

        // Creator (Tour Admin) rejects the edit request
        $resReject = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/reject");

        $resReject->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved')
            ->assertJsonPath('expense.amount', '100.00')
            ->assertJsonPath('expense.title', 'Original dinner')
            ->assertJsonPath('expense.proposed_changes', null);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'approved',
            'amount' => 100.00,
            'title' => 'Original dinner',
            'proposed_changes' => null,
        ]);
    }

    public function test_editing_pending_expense_overwrites_directly_without_proposed_changes(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 50.00,
            'category' => 'Snacks',
            'title' => 'Initial snacks',
            'date' => '2026-12-11',
            'status' => 'pending',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 50.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 50.00,
        ]);

        $updatePayload = [
            'amount' => 75.00,
            'category' => 'Snacks',
            'title' => 'More snacks',
            'date' => '2026-12-11',
            'payers' => [
                ['user_id' => $member1->id, 'amount' => 75.00],
            ],
            'splits' => [
                ['user_id' => $member1->id, 'amount' => 75.00],
            ],
        ];

        // Member1 updates the pending expense -> directly overwrites, status remains pending
        $resUpdate = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}", $updatePayload);

        $resUpdate->assertStatus(200)
            ->assertJsonPath('expense.status', 'pending')
            ->assertJsonPath('expense.amount', '75.00')
            ->assertJsonPath('expense.title', 'More snacks')
            ->assertJsonPath('expense.proposed_changes', null);

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'pending',
            'amount' => 75.00,
            'title' => 'More snacks',
            'proposed_changes' => null,
        ]);
    }

    public function test_admin_delete_request_can_be_approved_by_regular_member_and_permanently_deletes(): void
    {
        [$tour, $creator, $member1] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $member1->id,
            'amount' => 150.00,
            'category' => 'Hotel',
            'title' => 'Cottage advance',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $creator->id,
            'amount' => 150.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount_owed' => 150.00,
        ]);

        // Admin requests deletion
        $resDelete = $this->actingAs($creator, 'sanctum')
            ->deleteJson("/api/tours/{$tour->id}/expenses/{$expense->id}");

        $resDelete->assertStatus(200)
            ->assertJsonPath('expense.status', 'delete_requested');

        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'status' => 'delete_requested',
            'added_by' => $creator->id,
        ]);

        // Admin cannot self-approve their deletion request
        $resAdminSelf = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resAdminSelf->assertStatus(403);

        // Regular member approves Admin's deletion request -> permanently deleted
        $resApprove = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");

        $resApprove->assertStatus(200)
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
        $this->assertDatabaseCount('expense_payers', 0);
        $this->assertDatabaseCount('expense_splits', 0);
    }

    public function test_member_delete_request_cannot_be_approved_by_another_regular_member(): void
    {
        [$tour, $creator, $member1, $member2] = $this->createTourWithMembers();

        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $creator->id,
            'amount' => 70.00,
            'category' => 'Food',
            'title' => 'Breakfast buffet',
            'date' => '2026-12-11',
            'status' => 'approved',
        ]);
        ExpensePayer::create([
            'expense_id' => $expense->id,
            'user_id' => $member1->id,
            'amount' => 70.00,
        ]);
        ExpenseSplit::create([
            'expense_id' => $expense->id,
            'user_id' => $member2->id,
            'amount_owed' => 70.00,
        ]);

        // Member1 requests deletion
        $resDelete = $this->actingAs($member1, 'sanctum')
            ->deleteJson("/api/tours/{$tour->id}/expenses/{$expense->id}");

        $resDelete->assertStatus(200);

        // Member1 cannot self-approve
        $resSelf = $this->actingAs($member1, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resSelf->assertStatus(403);

        // Member2 (regular member) cannot approve Member1's delete request
        $resMember2 = $this->actingAs($member2, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resMember2->assertStatus(403)
            ->assertJsonPath('message', 'Only a Tour Admin can approve this expense.');

        // Creator (Admin) can approve -> permanently deletes
        $resAdmin = $this->actingAs($creator, 'sanctum')
            ->putJson("/api/tours/{$tour->id}/expenses/{$expense->id}/approve");
        $resAdmin->assertStatus(200)
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
    }
}

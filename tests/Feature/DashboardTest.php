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

class DashboardTest extends TestCase
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

    public function test_dashboard_returns_active_tour_prioritized(): void
    {
        $alice = $this->createUser('Alice', 'alice@tourtally.test');
        $bob = $this->createUser('Bob', 'bob@tourtally.test');

        // Active tour
        $activeTour = Tour::create([
            'name' => 'Sylhet Monsoon Tour',
            'destination' => 'Sylhet, Bangladesh',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
            'status' => 'active',
            'created_by' => $alice->id,
        ]);
        TourMember::create(['tour_id' => $activeTour->id, 'user_id' => $alice->id, 'role' => 'admin', 'status' => 'joined']);
        TourMember::create(['tour_id' => $activeTour->id, 'user_id' => $bob->id, 'role' => 'member', 'status' => 'joined']);

        // Log an approved expense
        $expense = Expense::create([
            'tour_id' => $activeTour->id,
            'added_by' => $alice->id,
            'amount' => 400.00,
            'category' => 'Transport',
            'title' => 'Train Tickets',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount' => 400.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount_owed' => 200.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $bob->id, 'amount_owed' => 200.00]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('has_active_tour', true)
            ->assertJsonPath('active_tour.id', $activeTour->id)
            ->assertJsonPath('active_tour.name', 'Sylhet Monsoon Tour')
            ->assertJsonPath('active_tour.destination', 'Sylhet, Bangladesh')
            ->assertJsonPath('active_tour.total_expense', 400)
            ->assertJsonPath('active_tour.user_paid', 400)
            ->assertJsonPath('active_tour.user_owed', 200)
            ->assertJsonPath('active_tour.user_balance', 200)
            ->assertJsonPath('active_tour.user_status', 'credit')
            ->assertJsonCount(1, 'active_tour.recent_expenses');
    }

    public function test_dashboard_falls_back_to_upcoming_tours_and_lifetime_stats_when_no_active_tour(): void
    {
        $alice = $this->createUser('Alice', 'alice@tourtally.test');

        // 1. Planning upcoming tour
        $planningTour = Tour::create([
            'name' => 'Bandarban Trekking',
            'destination' => 'Bandarban',
            'start_date' => '2026-12-10',
            'end_date' => '2026-12-15',
            'status' => 'planning',
            'created_by' => $alice->id,
        ]);
        TourMember::create(['tour_id' => $planningTour->id, 'user_id' => $alice->id, 'role' => 'admin', 'status' => 'joined']);

        // 2. Completed tour with past expenses
        $completedTour = Tour::create([
            'name' => 'Past Chittagong Trip',
            'destination' => 'Chittagong',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-04',
            'status' => 'completed',
            'created_by' => $alice->id,
        ]);
        TourMember::create(['tour_id' => $completedTour->id, 'user_id' => $alice->id, 'role' => 'admin', 'status' => 'joined']);

        $expense = Expense::create([
            'tour_id' => $completedTour->id,
            'added_by' => $alice->id,
            'amount' => 500.00,
            'category' => 'Food',
            'title' => 'Mezban Dinner',
            'date' => '2026-09-02',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount' => 500.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount_owed' => 500.00]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson('/api/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('has_active_tour', false)
            ->assertJsonCount(1, 'upcoming_tours')
            ->assertJsonPath('upcoming_tours.0.id', $planningTour->id)
            ->assertJsonPath('lifetime_stats.completed_tours_count', 1)
            ->assertJsonPath('lifetime_stats.total_tours_count', 2)
            ->assertJsonPath('lifetime_stats.lifetime_paid', 500)
            ->assertJsonPath('lifetime_stats.lifetime_spent', 500);
    }

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/dashboard')
            ->assertStatus(401);
    }
}

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
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExportTest extends TestCase
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
            'name' => 'Coxs Bazar Expedition',
            'destination' => 'Coxs Bazar',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
            'status' => 'active',
            'created_by' => $alice->id,
        ]);

        $tmAlice = TourMember::create(['tour_id' => $tour->id, 'user_id' => $alice->id, 'role' => 'admin', 'status' => 'joined']);
        $tmBob = TourMember::create(['tour_id' => $tour->id, 'user_id' => $bob->id, 'role' => 'member', 'status' => 'joined']);
        $tmCharlie = TourMember::create(['tour_id' => $tour->id, 'user_id' => $charlie->id, 'role' => 'member', 'status' => 'joined']);

        // Approved expense: Alice paid 300, split 100 each
        $expense = Expense::create([
            'tour_id' => $tour->id,
            'added_by' => $alice->id,
            'amount' => 300.00,
            'category' => 'Hotel',
            'title' => 'Resort booking',
            'date' => '2026-11-01',
            'status' => 'approved',
        ]);
        ExpensePayer::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount' => 300.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $alice->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $bob->id, 'amount_owed' => 100.00]);
        ExpenseSplit::create(['expense_id' => $expense->id, 'user_id' => $charlie->id, 'amount_owed' => 100.00]);

        return [$tour, $alice, $bob, $charlie, $tmAlice, $tmBob, $tmCharlie];
    }

    public function test_export_text_returns_formatted_statement_without_currency_symbols(): void
    {
        [$tour, $alice, $bob, $charlie] = $this->createTourWithThreeMembers();

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/export/text");

        $response->assertStatus(200)
            ->assertJsonStructure(['text', 'tour_id', 'tour_name']);

        $text = $response->json('text');

        // Check statement content
        $this->assertStringContainsString('Tour Settlement Statement', $text);
        $this->assertStringContainsString($tour->name, $text);
        $this->assertStringContainsString('300.00', $text);
        $this->assertStringContainsString('Alice', $text);
        $this->assertStringContainsString('Bob', $text);
        $this->assertStringContainsString('Charlie', $text);

        // Verify NO currency symbols are present in the text statement
        $this->assertStringNotContainsString('$', $text);
        $this->assertStringNotContainsString('৳', $text);
        $this->assertStringNotContainsString('USD', $text);
        $this->assertStringNotContainsString('BDT', $text);
    }

    public function test_export_group_pdf_returns_valid_pdf_stream(): void
    {
        [$tour, $alice] = $this->createTourWithThreeMembers();

        $response = $this->actingAs($alice, 'sanctum')
            ->get("/api/tours/{$tour->id}/export/pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('settlement-summary-', $response->headers->get('Content-Disposition'));
    }

    public function test_export_pos_receipt_returns_58mm_pdf_for_member(): void
    {
        [$tour, $alice, $bob] = $this->createTourWithThreeMembers();

        $response = $this->actingAs($alice, 'sanctum')
            ->get("/api/tours/{$tour->id}/export/pos/{$bob->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString("receipt-{$bob->id}.pdf", $response->headers->get('Content-Disposition'));
    }

    public function test_export_pos_receipt_resolves_tour_member_id(): void
    {
        [$tour, $alice, , , , $tmBob] = $this->createTourWithThreeMembers();

        $response = $this->actingAs($alice, 'sanctum')
            ->get("/api/tours/{$tour->id}/export/pos/{$tmBob->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_export_pos_receipt_supports_direct_print_via_tinypos(): void
    {
        [$tour, $alice, $bob] = $this->createTourWithThreeMembers();

        Http::fake([
            'pos.sayem.top/*' => Http::response([
                'status' => 'success',
                'job_id' => 'pos-job-999',
                'message' => 'Print job queued',
            ], 200),
        ]);

        $response = $this->actingAs($alice, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/export/pos/{$bob->id}/print");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('job_id', 'pos-job-999');
    }

    public function test_get_printer_status(): void
    {
        [$tour, $alice] = $this->createTourWithThreeMembers();

        Http::fake([
            'pos.sayem.top/*' => Http::response([
                'status' => 'online',
                'connected' => true,
                'printer' => [
                    'printer_name' => 'X6',
                ],
            ], 200),
        ]);

        $response = $this->actingAs($alice, 'sanctum')
            ->getJson('/api/tours/thermal-printer/status');

        $response->assertStatus(200)
            ->assertJsonPath('connected', true)
            ->assertJsonPath('printer.printer_name', 'X6');
    }

    public function test_stop_print_job(): void
    {
        [$tour, $alice] = $this->createTourWithThreeMembers();

        Http::fake([
            'pos.sayem.top/*' => Http::response([
                'status' => 'success',
                'message' => 'Active thermal printing stopped immediately.',
            ], 200),
        ]);

        $response = $this->actingAs($alice, 'sanctum')
            ->postJson('/api/tours/thermal-printer/stop', ['job_id' => 'job-123']);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }

    public function test_non_member_cannot_access_exports(): void
    {
        [$tour] = $this->createTourWithThreeMembers();
        $stranger = $this->createUser('Outsider', 'outsider@tourtally.test');

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/tours/{$tour->id}/export/text")
            ->assertStatus(403);

        $this->actingAs($stranger, 'sanctum')
            ->get("/api/tours/{$tour->id}/export/pdf")
            ->assertStatus(403);
    }
}

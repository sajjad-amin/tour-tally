<?php

namespace Tests\Feature;

use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TourTest extends TestCase
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

    public function test_user_can_create_tour_and_is_assigned_admin_member(): void
    {
        $creator = $this->createUser('Alice Explorer', 'alice@tourtally.test');

        $response = $this->actingAs($creator, 'sanctum')->postJson('/api/tours', [
            'name' => 'Sajek Valley Expedition',
            'destination' => 'Sajek, Rangamati',
            'description' => 'A weekend in the clouds.',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-04',
            'status' => 'planning',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('tour.name', 'Sajek Valley Expedition')
            ->assertJsonPath('tour.destination', 'Sajek, Rangamati')
            ->assertJsonPath('tour.is_admin', true)
            ->assertJsonPath('tour.members_count', 1);

        $tourId = $response->json('tour.id');

        $this->assertDatabaseHas('tours', [
            'id' => $tourId,
            'name' => 'Sajek Valley Expedition',
            'created_by' => $creator->id,
        ]);

        $this->assertDatabaseHas('tour_members', [
            'tour_id' => $tourId,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);
    }

    public function test_user_can_view_their_joined_and_invited_tours(): void
    {
        $user = $this->createUser('Bob Traveler', 'bob@tourtally.test');
        $otherUser = $this->createUser('Charlie Guide', 'charlie@tourtally.test');

        // Tour 1: User created (joined)
        $tour1 = Tour::create([
            'name' => 'Bandarban Trekking',
            'destination' => 'Bandarban',
            'status' => 'planning',
            'created_by' => $user->id,
        ]);
        TourMember::create([
            'tour_id' => $tour1->id,
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        // Tour 2: Other created, User invited
        $tour2 = Tour::create([
            'name' => 'Sylhet Tea Gardens',
            'destination' => 'Sreemangal',
            'status' => 'planning',
            'created_by' => $otherUser->id,
        ]);
        TourMember::create([
            'tour_id' => $tour2->id,
            'user_id' => $otherUser->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);
        TourMember::create([
            'tour_id' => $tour2->id,
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'invited',
        ]);

        // Tour 3: Unrelated tour
        $tour3 = Tour::create([
            'name' => 'Coxs Bazar Beach',
            'destination' => 'Coxs Bazar',
            'status' => 'active',
            'created_by' => $otherUser->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/tours');

        $response->assertStatus(200);
        $tourNames = collect($response->json('tours'))->pluck('name');
        $this->assertTrue($tourNames->contains('Bandarban Trekking'));
        $this->assertTrue($tourNames->contains('Sylhet Tea Gardens'));
        $this->assertFalse($tourNames->contains('Coxs Bazar Beach'));
    }

    public function test_non_member_cannot_view_tour_details(): void
    {
        $creator = $this->createUser('Dave Explorer', 'dave@tourtally.test');
        $stranger = $this->createUser('Eve Stranger', 'eve@tourtally.test');

        $tour = Tour::create([
            'name' => 'Secret Cave Expedition',
            'created_by' => $creator->id,
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        $res = $this->actingAs($stranger, 'sanctum')->getJson("/api/tours/{$tour->id}");
        $res->assertStatus(403);
    }

    public function test_tour_admin_can_update_tour_and_non_admin_is_forbidden(): void
    {
        $creator = $this->createUser('Frank Leader', 'frank@tourtally.test');
        $member = $this->createUser('Grace Member', 'grace@tourtally.test');

        $tour = Tour::create([
            'name' => 'Original Tour Name',
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
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        // Regular member cannot update
        $resMember = $this->actingAs($member, 'sanctum')->putJson("/api/tours/{$tour->id}", [
            'name' => 'Hacked Tour Name',
        ]);
        $resMember->assertStatus(403);

        // Tour Admin can update
        $resAdmin = $this->actingAs($creator, 'sanctum')->putJson("/api/tours/{$tour->id}", [
            'name' => 'Updated Tour Name',
            'destination' => 'Saint Martin Island',
        ]);
        $resAdmin->assertStatus(200)
            ->assertJsonPath('tour.name', 'Updated Tour Name')
            ->assertJsonPath('tour.destination', 'Saint Martin Island');
    }

    public function test_tour_admin_can_invite_user_by_email_or_username(): void
    {
        $creator = $this->createUser('Helen Admin', 'helen@tourtally.test');
        $invitee = $this->createUser('Ivan Invitee', 'ivan@tourtally.test');

        $tour = Tour::create([
            'name' => 'Winter Camp 2026',
            'created_by' => $creator->id,
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        // Non-existent user fails
        $resNotFound = $this->actingAs($creator, 'sanctum')->postJson("/api/tours/{$tour->id}/members/invite", [
            'email_or_username' => 'ghost@doesnotexist.com',
        ]);
        $resNotFound->assertStatus(404);

        // Invite by email
        $resInvite = $this->actingAs($creator, 'sanctum')->postJson("/api/tours/{$tour->id}/members/invite", [
            'email_or_username' => 'ivan@tourtally.test',
            'role' => 'member',
        ]);
        $resInvite->assertStatus(201)
            ->assertJsonPath('member.status', 'invited')
            ->assertJsonPath('member.email', 'ivan@tourtally.test');

        $this->assertDatabaseHas('tour_members', [
            'tour_id' => $tour->id,
            'user_id' => $invitee->id,
            'status' => 'invited',
        ]);

        // Duplicate invite fails
        $resDuplicate = $this->actingAs($creator, 'sanctum')->postJson("/api/tours/{$tour->id}/members/invite", [
            'email_or_username' => 'ivan@tourtally.test',
        ]);
        $resDuplicate->assertStatus(422);
    }

    public function test_invited_user_can_accept_and_reject_invitation(): void
    {
        $creator = $this->createUser('Jack Leader', 'jack@tourtally.test');
        $userAccept = $this->createUser('Kelly Joiner', 'kelly@tourtally.test');
        $userReject = $this->createUser('Leo Decliner', 'leo@tourtally.test');

        $tour = Tour::create([
            'name' => 'River Cruise Tour',
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
            'user_id' => $userAccept->id,
            'role' => 'member',
            'status' => 'invited',
        ]);

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $userReject->id,
            'role' => 'member',
            'status' => 'invited',
        ]);

        // Kelly accepts
        $resAccept = $this->actingAs($userAccept, 'sanctum')->postJson("/api/tours/{$tour->id}/members/accept");
        $resAccept->assertStatus(200);
        $this->assertDatabaseHas('tour_members', [
            'tour_id' => $tour->id,
            'user_id' => $userAccept->id,
            'status' => 'joined',
        ]);

        // Leo rejects
        $resReject = $this->actingAs($userReject, 'sanctum')->postJson("/api/tours/{$tour->id}/members/reject");
        $resReject->assertStatus(200);
        $this->assertDatabaseMissing('tour_members', [
            'tour_id' => $tour->id,
            'user_id' => $userReject->id,
        ]);
    }

    public function test_admin_can_remove_member_and_cannot_remove_creator(): void
    {
        $creator = $this->createUser('Mia Creator', 'mia@tourtally.test');
        $member = $this->createUser('Noah Member', 'noah@tourtally.test');

        $tour = Tour::create([
            'name' => 'Hill Tracts Expedition',
            'created_by' => $creator->id,
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);
        $noahMembership = TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        // Cannot remove creator
        $resRemoveCreator = $this->actingAs($creator, 'sanctum')->deleteJson("/api/tours/{$tour->id}/members/{$creator->id}");
        $resRemoveCreator->assertStatus(422);

        // Remove Noah
        $resRemove = $this->actingAs($creator, 'sanctum')->deleteJson("/api/tours/{$tour->id}/members/{$noahMembership->id}");
        $resRemove->assertStatus(200);
        $this->assertDatabaseMissing('tour_members', [
            'id' => $noahMembership->id,
        ]);
    }

    public function test_joined_member_cannot_leave_tour_on_their_own(): void
    {
        $creator = $this->createUser('Leader Sarah', 'sarah@tourtally.test');
        $joinedMember = $this->createUser('Joined John', 'john@tourtally.test');

        $tour = Tour::create([
            'name' => 'Coxs Bazar Trip',
            'created_by' => $creator->id,
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);
        $johnMembership = TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $joinedMember->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        // John attempts to remove himself -> should be blocked
        $resSelfLeave = $this->actingAs($joinedMember, 'sanctum')->deleteJson("/api/tours/{$tour->id}/members/{$johnMembership->id}");
        $resSelfLeave->assertStatus(422)
            ->assertJsonPath('message', 'Once joined, you cannot leave a tour on your own. Please contact a Tour Admin to be removed.');
    }

    public function test_tours_index_supports_search_custom_sorting_and_pagination(): void
    {
        $user = $this->createUser('Multi Explorer', 'multi@tourtally.test');

        // Create Completed tour
        $completedTour = Tour::create([
            'name' => 'Old Completed Journey',
            'destination' => 'Chittagong',
            'status' => 'completed',
            'start_date' => '2026-01-01',
            'created_by' => $user->id,
        ]);
        TourMember::create(['tour_id' => $completedTour->id, 'user_id' => $user->id, 'role' => 'admin', 'status' => 'joined']);

        // Create Planning tour
        $planningTour = Tour::create([
            'name' => 'Upcoming Planning Expedition',
            'destination' => 'Sylhet',
            'status' => 'planning',
            'start_date' => '2026-12-01',
            'created_by' => $user->id,
        ]);
        TourMember::create(['tour_id' => $planningTour->id, 'user_id' => $user->id, 'role' => 'admin', 'status' => 'joined']);

        // Create Active tour
        $activeTour = Tour::create([
            'name' => 'Right Now Active Adventure',
            'destination' => 'Sajek',
            'status' => 'active',
            'start_date' => '2026-10-01',
            'created_by' => $user->id,
        ]);
        TourMember::create(['tour_id' => $activeTour->id, 'user_id' => $user->id, 'role' => 'admin', 'status' => 'joined']);

        // 1. Check custom sorting: Active must be first, then Planning, then Completed
        $resSort = $this->actingAs($user, 'sanctum')->getJson('/api/tours?per_page=10');
        $resSort->assertStatus(200);
        $statuses = collect($resSort->json('tours'))->pluck('status')->toArray();
        $this->assertEquals(['active', 'planning', 'completed'], $statuses);

        // 2. Check search by destination
        $resSearch = $this->actingAs($user, 'sanctum')->getJson('/api/tours?search=Sylhet');
        $resSearch->assertStatus(200)
            ->assertJsonPath('tours.0.name', 'Upcoming Planning Expedition')
            ->assertJsonPath('meta.total', 1);

        // 3. Check pagination meta
        $resPage = $this->actingAs($user, 'sanctum')->getJson('/api/tours?per_page=2&page=1');
        $resPage->assertStatus(200)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_deleting_tour_updates_joined_counts_in_api_response(): void
    {
        $creator = $this->createUser('Solo Admin', 'soloadmin@tourtally.test');

        $tour = Tour::create([
            'name' => 'Single Tour',
            'created_by' => $creator->id,
            'status' => 'planning',
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        // Before delete: joined count should be 1
        $resBefore = $this->actingAs($creator, 'sanctum')->getJson('/api/tours');
        $resBefore->assertStatus(200)
            ->assertJsonPath('counts.joined', 1)
            ->assertJsonPath('counts.pending', 0);

        // Delete tour
        $resDelete = $this->actingAs($creator, 'sanctum')->deleteJson("/api/tours/{$tour->id}");
        $resDelete->assertStatus(200);

        // After delete: joined count must be 0
        $resAfter = $this->actingAs($creator, 'sanctum')->getJson('/api/tours');
        $resAfter->assertStatus(200)
            ->assertJsonPath('counts.joined', 0)
            ->assertJsonPath('counts.pending', 0)
            ->assertJsonCount(0, 'tours');
    }

    public function test_admin_can_search_user_by_exact_email(): void
    {
        $admin = $this->createUser('Admin User', 'adminsearch@tourtally.test');
        $targetUser = $this->createUser('Found Person', 'foundperson@tourtally.test');

        $tour = Tour::create([
            'name' => 'Search Test Tour',
            'created_by' => $admin->id,
            'status' => 'planning',
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/members/search", [
                'email' => 'foundperson@tourtally.test',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('user.email', 'foundperson@tourtally.test')
            ->assertJsonPath('user.name', 'Found Person')
            ->assertJsonPath('user.is_already_member', false)
            ->assertJsonPath('user.is_already_invited', false);
    }

    public function test_search_user_returns_404_when_user_not_found(): void
    {
        $admin = $this->createUser('Admin User', 'adminsearch2@tourtally.test');

        $tour = Tour::create([
            'name' => 'Search Test Tour 2',
            'created_by' => $admin->id,
            'status' => 'planning',
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/members/search", [
                'email' => 'doesnotexist@tourtally.test',
            ]);

        $res->assertStatus(404)
            ->assertJsonPath('message', 'User with this email not found.');
    }

    public function test_search_user_flags_already_member_or_invited(): void
    {
        $admin = $this->createUser('Admin User', 'adminsearch3@tourtally.test');
        $member = $this->createUser('Existing Member', 'existing@tourtally.test');

        $tour = Tour::create([
            'name' => 'Search Test Tour 3',
            'created_by' => $admin->id,
            'status' => 'planning',
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'joined',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/tours/{$tour->id}/members/search", [
                'email' => 'existing@tourtally.test',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('user.is_already_member', true);
    }
}

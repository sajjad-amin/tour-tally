<?php

namespace Tests\Feature;

use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use App\Notifications\TourInvitationNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NotificationTest extends TestCase
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

    protected function createTour(User $creator, string $name = 'Cox\'s Bazar Trip'): Tour
    {
        $tour = Tour::create([
            'name' => $name,
            'destination' => 'Cox\'s Bazar',
            'created_by' => $creator->id,
            'status' => 'planning',
        ]);

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $creator->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        return $tour;
    }

    public function test_inviting_member_creates_database_notification(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $invitee = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $tour = $this->createTour($admin, 'Saint Martin Island');

        $response = $this->actingAs($admin, 'sanctum')->postJson("/api/tours/{$tour->id}/members/invite", [
            'email_or_username' => 'bob@tourtally.test',
            'role' => 'member',
        ]);

        $response->assertStatus(201);

        // Check notification in database
        $this->assertEquals(1, $invitee->notifications()->count());
        $this->assertEquals(1, $invitee->unreadNotifications()->count());

        $notification = $invitee->notifications()->first();
        $this->assertEquals('tour_invitation', $notification->data['type']);
        $this->assertEquals($tour->id, $notification->data['tour_id']);
        $this->assertEquals("/tours/{$tour->id}", $notification->data['action_url']);
        $this->assertEquals($admin->id, $notification->data['inviter_id']);
    }

    public function test_can_fetch_paginated_notifications_and_unread_list(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $user = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $tour1 = $this->createTour($admin, 'Tour Alpha');
        $tour2 = $this->createTour($admin, 'Tour Beta');

        $user->notify(new TourInvitationNotification($tour1, $admin));
        $user->notify(new TourInvitationNotification($tour2, $admin));

        // GET /api/notifications
        $indexResponse = $this->actingAs($user, 'sanctum')->getJson('/api/notifications');
        $indexResponse->assertStatus(200)
            ->assertJsonCount(2, 'notifications')
            ->assertJsonPath('unread_count', 2)
            ->assertJsonStructure([
                'notifications',
                'unread_count',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        // GET /api/notifications/unread
        $unreadResponse = $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread?limit=1');
        $unreadResponse->assertStatus(200)
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('unread_count', 2);
    }

    public function test_can_mark_single_notification_as_read(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $user = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $tour = $this->createTour($admin, 'Tour Gamma');

        $user->notify(new TourInvitationNotification($tour, $admin));
        $notification = $user->notifications()->first();

        $this->assertNull($notification->read_at);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/notifications/{$notification->id}/read");
        $response->assertStatus(200)
            ->assertJsonPath('unread_count', 0);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_can_mark_all_notifications_as_read(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $user = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $tour1 = $this->createTour($admin, 'Tour 1');
        $tour2 = $this->createTour($admin, 'Tour 2');

        $user->notify(new TourInvitationNotification($tour1, $admin));
        $user->notify(new TourInvitationNotification($tour2, $admin));

        $this->assertEquals(2, $user->unreadNotifications()->count());

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/notifications/read-all');
        $response->assertStatus(200)
            ->assertJsonPath('unread_count', 0);

        $this->assertEquals(0, $user->unreadNotifications()->count());
        $this->assertEquals(2, $user->notifications()->count());
    }

    public function test_can_clear_all_notifications_without_affecting_other_users(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $user1 = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $user2 = $this->createUser('Charlie Explorer', 'charlie@tourtally.test');
        $tour = $this->createTour($admin, 'Tour Delta');

        $user1->notify(new TourInvitationNotification($tour, $admin));
        $user2->notify(new TourInvitationNotification($tour, $admin));

        $this->assertEquals(1, $user1->notifications()->count());
        $this->assertEquals(1, $user2->notifications()->count());

        $response = $this->actingAs($user1, 'sanctum')->deleteJson('/api/notifications/clear-all');
        $response->assertStatus(200)
            ->assertJsonPath('unread_count', 0);

        $this->assertEquals(0, $user1->notifications()->count());
        $this->assertEquals(1, $user2->notifications()->count());
    }

    public function test_accepting_invite_dispatches_tour_member_joined_notification_to_tour_admins(): void
    {
        $admin = $this->createUser('Admin Alice', 'alice@tourtally.test');
        $invitee = $this->createUser('Bob Explorer', 'bob@tourtally.test');
        $tour = $this->createTour($admin, 'Cox\'s Bazar Tour');

        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $invitee->id,
            'role' => 'member',
            'status' => 'invited',
        ]);

        $this->assertEquals(0, $admin->notifications()->count());

        $response = $this->actingAs($invitee, 'sanctum')->postJson("/api/tours/{$tour->id}/members/accept");
        $response->assertStatus(200);

        $this->assertEquals(1, $admin->notifications()->count());
        $notification = $admin->notifications()->first();
        $this->assertEquals('tour_member_joined', $notification->data['type']);
        $this->assertEquals($tour->id, $notification->data['tour_id']);
        $this->assertEquals("/tours/{$tour->id}/members", $notification->data['action_url']);
        $this->assertStringContainsString('Bob Explorer', $notification->data['message']);

        // Verify Bob did not receive a notification about his own acceptance
        $this->assertEquals(0, $invitee->notifications()->count());
    }
}

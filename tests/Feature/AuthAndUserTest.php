<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAndUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_can_login_with_username_field(): void
    {
        $response = $this->postJson('/api/login', [
            'username' => 'admin',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'roles'],
            ]);
    }

    public function test_admin_can_login_with_email_field(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'roles'],
            ]);
    }

    public function test_user_cannot_login_with_incorrect_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_registration_requires_email_verification_and_does_not_auto_login(): void
    {
        Setting::set('is_registration_open', true);

        $response = $this->postJson('/api/register', [
            'name' => 'New Explorer',
            'email' => 'explorer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('user.email', 'explorer@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'explorer@example.com',
            'email_verified_at' => null,
        ]);

        // Standard registration must not be logged in or have a token issued
        $this->assertGuest();
        $this->assertArrayNotHasKey('token', $response->json());

        // Attempting to log in before verification must return 403
        $loginAttempt = $this->postJson('/api/login', [
            'email' => 'explorer@example.com',
            'password' => 'password123',
        ]);

        $loginAttempt->assertStatus(403)
            ->assertJsonPath('email_verified', false);
    }

    public function test_registration_blocked_when_closed(): void
    {
        Setting::set('is_registration_open', false);

        $response = $this->postJson('/api/register', [
            'name' => 'Blocked User',
            'email' => 'blocked@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('registration_open', false);
    }

    public function test_regular_user_cannot_access_user_management(): void
    {
        $regularUser = User::create([
            'name' => 'Regular User',
            'email' => 'regular@example.com',
            'password' => 'password',
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $regularUser->assignRole('User');

        $response = $this->actingAs($regularUser, 'sanctum')->getJson('/api/users');
        $response->assertStatus(403);
    }

    public function test_server_admin_can_manage_users(): void
    {
        $admin = User::where('email', 'admin')->first();

        // 1. List users
        $listResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/users');
        $listResponse->assertStatus(200);

        // 2. Create user
        $createResponse = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Created Member',
            'email' => 'member@example.com',
            'password' => 'password123',
            'role' => 'User',
        ]);
        $createResponse->assertStatus(201);
        $userId = $createResponse->json('user.id');

        // 3. Update user
        $updateResponse = $this->actingAs($admin, 'sanctum')->putJson("/api/users/{$userId}", [
            'name' => 'Updated Member Name',
        ]);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('user.name', 'Updated Member Name');

        // 4. Delete user
        $deleteResponse = $this->actingAs($admin, 'sanctum')->deleteJson("/api/users/{$userId}");
        $deleteResponse->assertStatus(200);

        // 5. Toggle registration
        $toggleResponse = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/settings/toggle-registration');
        $toggleResponse->assertStatus(200);
    }

    public function test_user_can_update_profile_and_metadata(): void
    {
        $user = User::create([
            'name' => 'John Profile',
            'email' => 'john.profile@example.com',
            'password' => 'password',
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/profile', [
            'name' => 'John Updated',
            'phone' => '+1234567890',
            'whatsapp_link' => 'https://wa.me/1234567890',
            'messenger_link' => 'https://m.me/johnupdated',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.name', 'John Updated')
            ->assertJsonPath('user.phone', '+1234567890')
            ->assertJsonPath('user.whatsapp_link', 'https://wa.me/1234567890')
            ->assertJsonPath('user.messenger_link', 'https://m.me/johnupdated');

        $user->refresh();
        $this->assertEquals('+1234567890', $user->metadata['phone']);
        $this->assertEquals('https://wa.me/1234567890', $user->metadata['whatsapp_link']);
        $this->assertEquals('https://m.me/johnupdated', $user->metadata['messenger_link']);
    }

    public function test_user_can_change_password(): void
    {
        $user = User::create([
            'name' => 'Password User',
            'email' => 'password.user@example.com',
            'password' => Hash::make('oldpassword'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/password', [
            'current_password' => 'oldpassword',
            'password' => 'newsecretpassword',
            'password_confirmation' => 'newsecretpassword',
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertTrue(Hash::check('newsecretpassword', $user->password));
    }

    public function test_oauth_user_without_password_can_set_password_without_current_password(): void
    {
        $user = User::create([
            'name' => 'OAuth User',
            'email' => 'oauth.user@example.com',
            'google_id' => 'google-123456',
            'password' => null,
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $this->assertFalse($user->has_password);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/password', [
            'password' => 'firstsecretpassword',
            'password_confirmation' => 'firstsecretpassword',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('has_password', true);

        $user->refresh();
        $this->assertTrue($user->has_password);
        $this->assertTrue(Hash::check('firstsecretpassword', $user->password));
    }

    public function test_user_with_existing_password_requires_current_password(): void
    {
        $user = User::create([
            'name' => 'Standard User',
            'email' => 'standard.user@example.com',
            'password' => Hash::make('existingsecret'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/password', [
            'password' => 'newsecretpassword',
            'password_confirmation' => 'newsecretpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_user_can_request_password_reset_link(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        $user = User::create([
            'name' => 'Reset Request User',
            'email' => 'reset.request@example.com',
            'password' => Hash::make('oldpassword'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'reset.request@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'message']);

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $user,
            \Illuminate\Auth\Notifications\ResetPassword::class
        );
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::create([
            'name' => 'Reset Password User',
            'email' => 'reset.pw@example.com',
            'password' => Hash::make('oldsecretpassword'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $token = \Illuminate\Support\Facades\Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'reset.pw@example.com',
            'password' => 'brandnewpassword123',
            'password_confirmation' => 'brandnewpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'message']);

        $user->refresh();
        $this->assertTrue(Hash::check('brandnewpassword123', $user->password));
    }

    public function test_standard_user_can_delete_account_with_password(): void
    {
        $user = User::create([
            'name' => 'Delete Me',
            'email' => 'delete.me@example.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_standard_user_cannot_delete_account_without_valid_password(): void
    {
        $user = User::create([
            'name' => 'Delete Me Standard',
            'email' => 'delete.standard@example.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        // Missing password
        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Wrong password
        $responseWrong = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'password' => 'wrongpass',
        ]);
        $responseWrong->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_google_oauth_user_must_confirm_email_to_delete_account(): void
    {
        $user = User::create([
            'name' => 'Google Delete User',
            'email' => 'google.delete@example.com',
            'google_id' => 'google-del-987654',
            'password' => null,
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        // Missing email confirmation
        $resMissing = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', []);
        $resMissing->assertStatus(422)
            ->assertJsonValidationErrors(['email_confirmation']);

        // Wrong email confirmation
        $resWrong = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'email_confirmation' => 'wrong.email@example.com',
        ]);
        $resWrong->assertStatus(422)
            ->assertJsonValidationErrors(['email_confirmation']);

        // Correct email confirmation
        $resSuccess = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'email_confirmation' => 'google.delete@example.com',
        ]);
        $resSuccess->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_google_user_who_sets_password_must_provide_password_to_delete_account(): void
    {
        $user = User::create([
            'name' => 'Google User With Password',
            'email' => 'google.withpw@example.com',
            'google_id' => 'google-del-112233',
            'password' => Hash::make('newlycreatedpw123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $user->assignRole('User');

        // Missing password must fail
        $resMissing = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', []);
        $resMissing->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Wrong password must fail
        $resWrong = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'password' => 'wrongpass',
        ]);
        $resWrong->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Correct password must succeed
        $resSuccess = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/account', [
            'password' => 'newlycreatedpw123',
        ]);
        $resSuccess->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_can_search_sort_and_paginate_users(): void
    {
        $admin = User::where('role', 'admin')->first() ?? User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@tour.test',
        ]);
        if (! $admin->hasRole('Server Admin')) {
            $admin->assignRole('Server Admin');
        }

        // Create specific test users
        $userA = User::create([
            'name' => 'Alice Wonderland',
            'email' => 'alice@test.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $userA->assignRole('User');

        $userB = User::create([
            'name' => 'Bob Builder',
            'email' => 'bob@test.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $userB->assignRole('User');

        // Test search
        $searchRes = $this->actingAs($admin, 'sanctum')->getJson('/api/users?search=Alice');
        $searchRes->assertStatus(200)
            ->assertJsonPath('users.0.email', 'alice@test.com');

        // Test pagination
        $pageRes = $this->actingAs($admin, 'sanctum')->getJson('/api/users?per_page=1&page=1');
        $pageRes->assertStatus(200)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.current_page', 1);

        // Test sorting
        $sortRes = $this->actingAs($admin, 'sanctum')->getJson('/api/users?sort_by=name&sort_dir=asc');
        $sortRes->assertStatus(200);
        $names = collect($sortRes->json('users'))->pluck('name')->toArray();
        $sortedNames = $names;
        sort($sortedNames);
        $this->assertEquals($sortedNames, $names);
    }

    public function test_admin_can_update_user_full_profile_and_metadata(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (! $admin) {
            $admin = User::factory()->create(['role' => 'admin']);
            $admin->assignRole('Server Admin');
        }

        $targetUser = User::create([
            'name' => 'Original Name',
            'email' => 'original@test.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => null,
        ]);
        $targetUser->assignRole('User');

        $updateRes = $this->actingAs($admin, 'sanctum')->putJson("/api/users/{$targetUser->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@test.com',
            'role' => 'Server Admin',
            'phone' => '+8801700000000',
            'whatsapp_link' => 'https://wa.me/8801700000000',
            'messenger_link' => 'https://m.me/updated',
            'email_verified' => true,
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', 'updated@test.com')
            ->assertJsonPath('user.phone', '+8801700000000')
            ->assertJsonPath('user.whatsapp_link', 'https://wa.me/8801700000000')
            ->assertJsonPath('user.messenger_link', 'https://m.me/updated')
            ->assertJsonPath('user.role', 'admin');

        $targetUser->refresh();
        $this->assertEquals('Updated Name', $targetUser->name);
        $this->assertEquals('updated@test.com', $targetUser->email);
        $this->assertNotNull($targetUser->email_verified_at);
        $this->assertTrue($targetUser->hasRole('Server Admin'));
        $this->assertEquals('https://wa.me/8801700000000', $targetUser->whatsapp_link);
    }

    public function test_admin_delete_user_validates_confirmation_text(): void
    {
        $admin = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
        if (! $admin->hasRole('Server Admin')) {
            $admin->assignRole('Server Admin');
        }

        $targetUser = User::create([
            'name' => 'To Be Deleted',
            'email' => 'delete.me@test.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $targetUser->assignRole('User');

        // Cannot delete self
        $selfDelRes = $this->actingAs($admin, 'sanctum')->deleteJson("/api/users/{$admin->id}", [
            'confirmation' => 'CONFIRM DELETE',
        ]);
        $selfDelRes->assertStatus(422)
            ->assertJsonPath('message', 'You cannot delete your own account.');

        // Wrong confirmation text
        $wrongConfRes = $this->actingAs($admin, 'sanctum')->deleteJson("/api/users/{$targetUser->id}", [
            'confirmation' => 'WRONG TEXT',
        ]);
        $wrongConfRes->assertStatus(422)
            ->assertJsonValidationErrors(['confirmation']);

        // Correct confirmation text
        $correctDelRes = $this->actingAs($admin, 'sanctum')->deleteJson("/api/users/{$targetUser->id}", [
            'confirmation' => 'CONFIRM DELETE',
        ]);
        $correctDelRes->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $targetUser->id]);
    }
}


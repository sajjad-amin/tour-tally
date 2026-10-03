<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_google_redirect_endpoint_initiates_oauth_flow(): void
    {
        $response = $this->get('/api/auth/google/redirect');

        // Redirects to accounts.google.com
        $response->assertStatus(302);
        $this->assertStringContainsString('accounts.google.com', $response->headers->get('Location'));
    }

    public function test_google_callback_creates_new_user_when_registration_is_open(): void
    {
        Setting::set('is_registration_open', true);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn('google-uid-12345');
        $socialiteUser->shouldReceive('getName')->andReturn('Google Adventurer');
        $socialiteUser->shouldReceive('getNickname')->andReturn('adventurer');
        $socialiteUser->shouldReceive('getEmail')->andReturn('adventurer@example.com');
        $socialiteUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/avatar.jpg');

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('http://localhost:5173/dashboard?auth_token=', $location);

        // Verify user in database
        $this->assertDatabaseHas('users', [
            'email' => 'adventurer@example.com',
            'google_id' => 'google-uid-12345',
            'avatar' => 'https://lh3.googleusercontent.com/avatar.jpg',
        ]);

        $createdUser = User::where('email', 'adventurer@example.com')->first();
        $this->assertTrue($createdUser->hasRole('User'));
        $this->assertNotNull($createdUser->email_verified_at);
        $this->assertAuthenticatedAs($createdUser);
    }

    public function test_google_callback_rejects_new_user_when_registration_is_closed(): void
    {
        Setting::set('is_registration_open', false);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn('google-uid-99999');
        $socialiteUser->shouldReceive('getName')->andReturn('Blocked User');
        $socialiteUser->shouldReceive('getNickname')->andReturn('blocked');
        $socialiteUser->shouldReceive('getEmail')->andReturn('unregistered@example.com');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $this->assertEquals('http://localhost:5173/login?error=registration_closed', $response->headers->get('Location'));

        $this->assertDatabaseMissing('users', [
            'email' => 'unregistered@example.com',
        ]);
        $this->assertGuest();
    }

    public function test_google_callback_logs_in_existing_user_and_links_google_id(): void
    {
        Setting::set('is_registration_open', false); // Even if registration is closed, existing user can log in!

        $existingUser = User::create([
            'name' => 'Existing Traveler',
            'email' => 'traveler@example.com',
            'password' => 'password',
            'role' => 'user',
        ]);
        $existingUser->assignRole('User');

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn('google-uid-existing-456');
        $socialiteUser->shouldReceive('getName')->andReturn('Existing Traveler');
        $socialiteUser->shouldReceive('getNickname')->andReturn(null);
        $socialiteUser->shouldReceive('getEmail')->andReturn('traveler@example.com');
        $socialiteUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/traveler.jpg');

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('http://localhost:5173/dashboard?auth_token=', $location);

        $existingUser->refresh();
        $this->assertEquals('google-uid-existing-456', $existingUser->google_id);
        $this->assertEquals('https://lh3.googleusercontent.com/traveler.jpg', $existingUser->avatar);
        $this->assertAuthenticatedAs($existingUser);
    }

    public function test_google_callback_handles_oauth_cancelled_error(): void
    {
        $response = $this->get('/api/auth/google/callback?error=access_denied');

        $response->assertStatus(302);
        $this->assertEquals('http://localhost:5173/login?error=auth_cancelled', $response->headers->get('Location'));
    }
}

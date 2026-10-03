<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to Google OAuth authentication page.
     */
    public function redirect(): SymfonyRedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle the callback from Google OAuth.
     */
    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');

        // Check for error in Google callback query
        if ($request->has('error')) {
            Log::warning('Google OAuth callback received error: '.$request->query('error'));

            return redirect("{$frontendUrl}/login?error=auth_cancelled");
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            Log::error('Google OAuth callback failed: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return redirect("{$frontendUrl}/login?error=auth_failed");
        }

        $email = $googleUser->getEmail();
        $googleId = $googleUser->getId();

        if (! $email) {
            Log::warning('Google OAuth returned no email address for user ID: '.$googleId);

            return redirect("{$frontendUrl}/login?error=no_email_provided");
        }

        // Find existing user by google_id or email
        $user = User::where('google_id', $googleId)
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            // Existing user: Link google_id or avatar if not yet set
            $dirty = false;

            if (! $user->google_id) {
                $user->google_id = $googleId;
                $dirty = true;
            }

            if (empty($user->avatar) && $googleUser->getAvatar()) {
                $user->avatar = $googleUser->getAvatar();
                $dirty = true;
            }

            if (! $user->email_verified_at) {
                $user->email_verified_at = now();
                $dirty = true;
            }

            if ($dirty) {
                $user->save();
            }

            // Ensure role is assigned if missing
            if ($user->roles()->count() === 0) {
                $user->assignRole('User');
            }

            // Log in via web guard
            Auth::guard('web')->login($user, true);

            if ($request->hasSession()) {
                $request->session()->regenerate();
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return redirect("{$frontendUrl}/dashboard?auth_token={$token}");
        }

        // User does not exist: Check if registration is open
        $isOpen = Setting::get('is_registration_open', true);
        $isRegistrationClosed = ($isOpen === false || $isOpen === 'false' || $isOpen === 0 || $isOpen === '0');

        if ($isRegistrationClosed) {
            Log::info("Google registration rejected for {$email}: Registration is closed.");

            return redirect("{$frontendUrl}/login?error=registration_closed");
        }

        // Registration is open: Create new user
        $name = $googleUser->getName() ?: ($googleUser->getNickname() ?: 'Google User');

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'google_id' => $googleId,
            'avatar' => $googleUser->getAvatar(),
            'password' => null,
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $user->assignRole('User');

        Auth::guard('web')->login($user, true);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return redirect("{$frontendUrl}/dashboard?auth_token={$token}");
    }
}

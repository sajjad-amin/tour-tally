<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Format user response payload with roles and permissions.
     */
    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'phone' => $user->phone,
            'whatsapp_link' => $user->whatsapp_link,
            'messenger_link' => $user->messenger_link,
            'avatar' => $user->avatar,
            'has_password' => ! empty($user->password),
            'has_google' => ! empty($user->google_id),
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->hasRole('Server Admin') || $user->role === 'admin'
                ? Permission::pluck('name')
                : $user->getAllPermissions()->pluck('name'),
        ];
    }

    /**
     * Register a new user (protected by CheckRegistrationOpen middleware).
     *
     * Requires email verification before logging in.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'user',
            'email_verified_at' => null, // Explicitly unverified on registration
        ]);

        $user->assignRole('User');

        // Fire Registered event to trigger email verification notification
        event(new Registered($user));

        return response()->json([
            'message' => 'Registration successful! Please check your email to verify your account before logging in.',
            'requires_verification' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 201);
    }

    /**
     * Authenticate an existing user by email or username.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['sometimes', 'nullable', 'string'],
            'username' => ['sometimes', 'nullable', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = $request->input('email') ?? $request->input('username');

        if (! $identifier) {
            throw ValidationException::withMessages([
                'email' => ['Please provide your email or username.'],
            ]);
        }

        if (! Auth::attempt(['email' => $identifier, 'password' => $validated['password']], $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        // Enforce email verification check for standard accounts
        if (! $user->hasVerifiedEmail()) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'message' => 'Your email address is not verified. Please check your inbox for the verification link.',
                'email_verified' => false,
            ], 403);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Get the authenticated user with roles and permissions.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Log out the authenticated user.
     */
    public function logout(Request $request): JsonResponse
    {
        if ($request->user()) {
            $request->user()->tokens()->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}

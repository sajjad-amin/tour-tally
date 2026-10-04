<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class UserProfileController extends Controller
{
    /**
     * Format user payload with metadata attributes.
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
            'metadata' => $user->metadata ?? [],
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
     * Update user personal information (name, phone, whatsapp_link, messenger_link in metadata).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'whatsapp_link' => ['nullable', 'string', 'max:255'],
            'messenger_link' => ['nullable', 'string', 'max:255'],
        ]);

        $metadata = $user->metadata ?? [];
        $metadata['phone'] = $validated['phone'] ?? null;
        $metadata['whatsapp_link'] = $validated['whatsapp_link'] ?? null;
        $metadata['messenger_link'] = $validated['messenger_link'] ?? null;

        $user->name = $validated['name'];
        $user->phone = $validated['phone'] ?? null;
        $user->metadata = $metadata;
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Change account password (or set initial password for social login users without requiring current password).
     */
    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $hasPassword = ! empty($user->password);

        $rules = [
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];

        if ($hasPassword) {
            $rules['current_password'] = ['required', 'string'];
        }

        $validated = $request->validate($rules);

        if ($hasPassword) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The provided current password does not match your account password.'],
                ]);
            }
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'message' => $hasPassword ? 'Password changed successfully.' : 'Password created successfully! You can now sign in with email and password.',
            'has_password' => true,
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Delete the user account.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        Log::info('DELETE_ACCOUNT_REQUEST', [
            'user_id' => $user?->id,
            'email' => $user?->email,
            'has_password' => ! empty($user?->password),
            'all_inputs' => $request->all(),
        ]);

        $hasPassword = ! empty($user->password);

        if ($hasPassword) {
            // User has an account password configured: Must confirm with password
            $password = $request->input('password') ?? $request->query('password');

            if (! $password) {
                throw ValidationException::withMessages([
                    'password' => ['Please enter your account password to confirm deletion.'],
                ]);
            }

            if (! Hash::check($password, $user->password)) {
                throw ValidationException::withMessages([
                    'password' => ['The password you entered is incorrect.'],
                ]);
            }
        } else {
            // User does not have a password configured (Google login user): Must confirm with email address
            $emailConfirmation = $request->input('email_confirmation') ?? $request->input('email') ?? $request->query('email_confirmation') ?? $request->query('email');

            if (! $emailConfirmation) {
                throw ValidationException::withMessages([
                    'email_confirmation' => ['Please enter your email address to confirm account deletion.'],
                ]);
            }

            if (strtolower(trim($emailConfirmation)) !== strtolower(trim($user->email))) {
                throw ValidationException::withMessages([
                    'email_confirmation' => ['The confirmation email does not match your account email address.'],
                ]);
            }
        }

        // TODO: Prevent deletion if user is assigned to an active tour.
        if (false) {
            return response()->json([
                'message' => 'Cannot delete account while assigned to an active tour.',
            ], 422);
        }

        // 1. Log out the web guard session FIRST before deleting user
        // (SessionGuard::logout() calls refreshRememberToken which triggers $user->save(). If called after $user->delete(), Eloquent treats exists=false and re-inserts the user!)
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        // 2. Revoke all Sanctum API personal access tokens
        $user->tokens()->delete();

        // 3. Detach Spatie roles and permissions
        $user->roles()->detach();
        $user->permissions()->detach();

        // 4. Finally delete the user record from the database
        $user->delete();

        return response()->json([
            'message' => 'Your account has been deleted successfully.',
        ]);
    }
}

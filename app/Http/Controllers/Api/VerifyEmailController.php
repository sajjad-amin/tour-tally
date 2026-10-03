<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated/specified user's email address as verified from signed URL.
     */
    public function verify(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');

        $user = User::findOrFail($request->route('id'));

        if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
            throw new AuthorizationException('Invalid or expired email verification link.');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect("{$frontendUrl}/login?verified=already");
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect("{$frontendUrl}/login?verified=1");
    }

    /**
     * Resend the email verification notification.
     */
    public function resend(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::where('email', $request->input('email'))->first();

        if (! $user) {
            // Return success even if not found to prevent user enumeration
            return response()->json([
                'message' => 'If an unverified account exists with that email, a verification link has been sent.',
            ]);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'This account email is already verified. You may sign in.',
                'already_verified' => true,
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'A new email verification link has been sent to your email address.',
        ]);
    }
}

<?php

use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\VerifyEmailController;
use Illuminate\Support\Facades\Route;

// Google OAuth Routes (Uses web middleware for session state required by Socialite)
Route::prefix('api/auth/google')->middleware('web')->group(function () {
    Route::get('/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});

// Email Verification Route (signed verification link clicked from email)
Route::get('/verify-email/{id}/{hash}', [VerifyEmailController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::get('/', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }

    return ['Laravel' => app()->version()];
});

// SPA fallback for HTML5 history API navigation when built
Route::get('/{any}', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }

    return ['Laravel' => app()->version()];
})->where('any', '^(?!api|sanctum|up|verify-email).*$');

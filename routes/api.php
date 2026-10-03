<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NewPasswordController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetLinkController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TourController;
use App\Http\Controllers\Api\TourMemberController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\VerifyEmailController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public settings endpoint
Route::get('/settings/public', [SettingsController::class, 'publicSettings']);

// Email verification resend
Route::post('/email/resend-verification', [VerifyEmailController::class, 'resend'])
    ->middleware('throttle:6,1');

// Public authentication endpoints (guest only)
Route::middleware('guest')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('registration_open');
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:6,1');
    Route::post('/reset-password', [NewPasswordController::class, 'store'])
        ->middleware('throttle:6,1');
});

// Protected routes (Sanctum SPA authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // User Profile & Account Management
    Route::put('/user/profile', [UserProfileController::class, 'updateProfile']);
    Route::put('/user/password', [UserProfileController::class, 'updatePassword']);
    Route::delete('/user/account', [UserProfileController::class, 'deleteAccount']);

    // Tour & Member Management
    Route::prefix('tours')->group(function () {
        Route::get('/', [TourController::class, 'index']);
        Route::post('/', [TourController::class, 'store']);
        Route::get('/{tour}', [TourController::class, 'show']);
        Route::put('/{tour}', [TourController::class, 'update']);
        Route::delete('/{tour}', [TourController::class, 'destroy']);

        // Tour Members Management
        Route::post('/{tour}/members/search', [TourMemberController::class, 'searchUser']);
        Route::post('/{tour}/members/invite', [TourMemberController::class, 'invite']);
        Route::post('/{tour}/members/accept', [TourMemberController::class, 'acceptInvite']);
        Route::post('/{tour}/members/reject', [TourMemberController::class, 'rejectInvite']);
        Route::delete('/{tour}/members/{memberId}', [TourMemberController::class, 'removeMember']);
    });

    // Notifications Management
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread', [NotificationController::class, 'unread']);
        Route::put('/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/clear-all', [NotificationController::class, 'clearAll']);
    });

    // Server Admin routes
    Route::middleware('server_admin')->group(function () {
        // User Management CRUD
        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::get('/{user}', [UserController::class, 'show']);
            Route::put('/{user}', [UserController::class, 'update']);
            Route::delete('/{user}', [UserController::class, 'destroy']);
        });

        // Server Settings
        Route::prefix('admin/settings')->group(function () {
            Route::get('/', [SettingsController::class, 'index']);
            Route::post('/', [SettingsController::class, 'update']);
            Route::post('/toggle-registration', [SettingsController::class, 'toggleRegistration']);
        });
    });
});

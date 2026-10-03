<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Public settings accessible without authentication.
     */
    public function publicSettings(): JsonResponse
    {
        $userCount = User::count();
        $isFreshSetup = $userCount <= 1;

        return response()->json([
            'is_registration_open' => (bool) Setting::get('is_registration_open', true),
            'is_fresh_setup' => $isFreshSetup,
        ]);
    }

    /**
     * Get settings for Admin.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'settings' => [
                'is_registration_open' => (bool) Setting::get('is_registration_open', true),
            ],
        ]);
    }

    /**
     * Update settings (Server Admin only).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_registration_open' => ['required', 'boolean'],
        ]);

        Setting::set('is_registration_open', $validated['is_registration_open']);

        return response()->json([
            'message' => 'Settings updated successfully.',
            'settings' => [
                'is_registration_open' => (bool) Setting::get('is_registration_open', true),
            ],
        ]);
    }

    /**
     * Dedicated quick toggle endpoint for is_registration_open.
     */
    public function toggleRegistration(): JsonResponse
    {
        $current = (bool) Setting::get('is_registration_open', true);
        $new = ! $current;
        Setting::set('is_registration_open', $new);

        return response()->json([
            'message' => $new ? 'Public registration enabled.' : 'Public registration disabled.',
            'is_registration_open' => $new,
        ]);
    }
}

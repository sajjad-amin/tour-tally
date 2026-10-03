<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Format user array for API responses matching UserProfileController.
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
                ? \App\Models\Permission::pluck('name')
                : $user->getAllPermissions()->pluck('name'),
        ];
    }

    /**
     * List users with searching, sorting, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $role = $request->query('role');
            if ($role === 'Server Admin' || $role === 'admin') {
                $query->where(function ($q) {
                    $q->where('role', 'admin')
                      ->orWhereHas('roles', fn ($rq) => $rq->where('name', 'Server Admin'));
                });
            } elseif ($role === 'User' || $role === 'user') {
                $query->where(function ($q) {
                    $q->where('role', '!=', 'admin')
                      ->orWhereDoesntHave('roles', fn ($rq) => $rq->where('name', 'Server Admin'));
                });
            }
        }

        $sortBy = $request->query('sort_by', 'created_at');
        $allowedSorts = ['name', 'email', 'created_at', 'role'];
        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'created_at';
        }

        $sortDir = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'role') {
            $query->orderBy('role', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = $request->query('per_page', 10);

        if ($perPage === 'all' || $perPage === '-1') {
            $users = $query->get();

            return response()->json([
                'users' => $users->map(fn (User $u) => $this->formatUser($u)),
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $users->count(),
                    'total' => $users->count(),
                    'from' => 1,
                    'to' => $users->count(),
                ],
            ]);
        }

        $paginator = $query->paginate((int) $perPage);

        return response()->json([
            'users' => collect($paginator->items())->map(fn (User $u) => $this->formatUser($u)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    /**
     * Store a newly created user (Server Admin action, bypasses email verification).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', Password::defaults()],
            'role' => ['required', 'string', Rule::in(['Server Admin', 'User', 'admin', 'user'])],
            'phone' => ['nullable', 'string', 'max:30'],
            'whatsapp_link' => ['nullable', 'string', 'max:255'],
            'messenger_link' => ['nullable', 'string', 'max:255'],
        ]);

        $roleName = in_array($validated['role'], ['Server Admin', 'admin'], true) ? 'Server Admin' : 'User';
        $dbRole = $roleName === 'Server Admin' ? 'admin' : 'user';

        $metadata = [];
        if (! empty($validated['phone'])) {
            $metadata['phone'] = $validated['phone'];
        }
        if (! empty($validated['whatsapp_link'])) {
            $metadata['whatsapp_link'] = $validated['whatsapp_link'];
        }
        if (! empty($validated['messenger_link'])) {
            $metadata['messenger_link'] = $validated['messenger_link'];
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => ! empty($validated['password']) ? Hash::make($validated['password']) : Hash::make('password'),
            'role' => $dbRole,
            'phone' => $validated['phone'] ?? null,
            'metadata' => $metadata,
            'email_verified_at' => now(), // Admin creation bypasses email verification
        ]);

        $user->syncRoles([$roleName]);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $this->formatUser($user),
        ], 201);
    }

    /**
     * Show a user.
     */
    public function show(User $user): JsonResponse
    {
        $user->load('roles');

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Update a user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', Password::defaults()],
            'role' => ['sometimes', 'required', 'string', Rule::in(['Server Admin', 'User', 'admin', 'user'])],
            'phone' => ['nullable', 'string', 'max:30'],
            'whatsapp_link' => ['nullable', 'string', 'max:255'],
            'messenger_link' => ['nullable', 'string', 'max:255'],
            'email_verified' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $metadata = $user->metadata ?? [];

        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
            $metadata['phone'] = $validated['phone'];
        }

        if (array_key_exists('whatsapp_link', $validated)) {
            $metadata['whatsapp_link'] = $validated['whatsapp_link'];
        }

        if (array_key_exists('messenger_link', $validated)) {
            $metadata['messenger_link'] = $validated['messenger_link'];
        }

        $user->metadata = $metadata;

        if (isset($validated['role'])) {
            $roleName = in_array($validated['role'], ['Server Admin', 'admin'], true) ? 'Server Admin' : 'User';
            $user->role = $roleName === 'Server Admin' ? 'admin' : 'user';
            $user->syncRoles([$roleName]);
        }

        if (array_key_exists('email_verified', $validated)) {
            $user->email_verified_at = $validated['email_verified'] ? ($user->email_verified_at ?? now()) : null;
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        // Validate confirmation text if sent by client
        if ($request->has('confirmation')) {
            $confirmation = strtoupper(trim((string) $request->input('confirmation')));
            if ($confirmation !== 'CONFIRM DELETE') {
                return response()->json([
                    'message' => 'Please type "CONFIRM DELETE" to confirm user deletion.',
                    'errors' => [
                        'confirmation' => ['The confirmation text must be "CONFIRM DELETE".'],
                    ],
                ], 422);
            }
        }

        $user->tokens()->delete();
        $user->roles()->detach();
        $user->permissions()->detach();
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}

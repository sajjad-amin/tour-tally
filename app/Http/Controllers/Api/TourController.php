<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TourController extends Controller
{
    /**
     * Format a Tour model for JSON responses.
     */
    protected function formatTour(Tour $tour, ?User $currentUser = null): array
    {
        $tour->loadMissing(['creator', 'members']);

        $userMembership = null;
        $isTourAdmin = false;

        if ($currentUser) {
            $memberRecord = $tour->members->firstWhere('id', $currentUser->id);
            if ($memberRecord && $memberRecord->pivot) {
                $userMembership = [
                    'id' => $memberRecord->pivot->id,
                    'role' => $memberRecord->pivot->role,
                    'status' => $memberRecord->pivot->status,
                ];
                $isTourAdmin = $memberRecord->pivot->role === 'admin' && $memberRecord->pivot->status === 'joined';
            }

            if ($tour->created_by === $currentUser->id || $currentUser->hasRole('Server Admin')) {
                $isTourAdmin = true;
            }
        }

        return [
            'id' => $tour->id,
            'name' => $tour->name,
            'destination' => $tour->destination,
            'description' => $tour->description,
            'start_date' => $tour->start_date?->format('Y-m-d'),
            'end_date' => $tour->end_date?->format('Y-m-d'),
            'status' => $tour->status,
            'created_by' => $tour->created_by,
            'created_at' => $tour->created_at,
            'updated_at' => $tour->updated_at,
            'creator' => $tour->creator ? [
                'id' => $tour->creator->id,
                'name' => $tour->creator->name,
                'email' => $tour->creator->email,
                'phone' => $tour->creator->phone,
                'avatar' => $tour->creator->avatar,
                'whatsapp_link' => $tour->creator->whatsapp_link,
                'messenger_link' => $tour->creator->messenger_link,
            ] : null,
            'members_count' => $tour->members->where('pivot.status', 'joined')->count(),
            'pending_count' => $tour->members->where('pivot.status', 'invited')->count(),
            'is_admin' => $isTourAdmin,
            'user_membership' => $userMembership,
            'members' => $tour->members->map(function (User $member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'phone' => $member->phone,
                    'avatar' => $member->avatar,
                    'whatsapp_link' => $member->whatsapp_link,
                    'messenger_link' => $member->messenger_link,
                    'membership_id' => $member->pivot->id,
                    'role' => $member->pivot->role,
                    'status' => $member->pivot->status,
                    'joined_at' => $member->pivot->created_at,
                ];
            })->values(),
        ];
    }

    /**
     * List all tours where the user is a member or creator.
     * Supports search (?search=), membership filter (?tab=joined|pending), and strict status sorting.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Tour::where(function ($q) use ($user, $request) {
            $tab = $request->query('tab') ?? $request->query('status');

            if ($tab === 'joined') {
                $q->where(function ($sub) use ($user) {
                    $sub->where('created_by', $user->id)
                        ->orWhereHas('tourMembers', function ($mq) use ($user) {
                            $mq->where('user_id', $user->id)->where('status', 'joined');
                        });
                });
            } elseif ($tab === 'pending' || $tab === 'invited') {
                $q->whereHas('tourMembers', function ($mq) use ($user) {
                    $mq->where('user_id', $user->id)->where('status', 'invited');
                });
            } else {
                $q->where('created_by', $user->id)
                    ->orWhereHas('tourMembers', function ($mq) use ($user) {
                        $mq->where('user_id', $user->id);
                    });
            }
        })
            ->with(['creator', 'members']);

        // Search by tour name or destination
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%");
            });
        }

        // Sorting strictly: 'Active' first, then 'Planning' (start_date asc or created_at desc), then 'Completed'
        $query->orderByRaw("CASE WHEN status = 'active' THEN 1 WHEN status = 'planning' THEN 2 ELSE 3 END")
            ->orderByRaw('CASE WHEN start_date IS NULL THEN 1 ELSE 0 END, start_date ASC, created_at DESC');

        $perPage = $request->query('per_page', 9);

        $joinedCount = Tour::where(function ($sub) use ($user) {
            $sub->where('created_by', $user->id)
                ->orWhereHas('tourMembers', function ($mq) use ($user) {
                    $mq->where('user_id', $user->id)->where('status', 'joined');
                });
        })->count();

        $pendingCount = Tour::whereHas('tourMembers', function ($mq) use ($user) {
            $mq->where('user_id', $user->id)->where('status', 'invited');
        })->count();

        $counts = [
            'joined' => $joinedCount,
            'pending' => $pendingCount,
        ];

        if ($perPage === 'all' || $perPage === '-1') {
            $tours = $query->get();

            return response()->json([
                'tours' => $tours->map(fn (Tour $t) => $this->formatTour($t, $user)),
                'counts' => $counts,
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $tours->count(),
                    'total' => $tours->count(),
                    'from' => 1,
                    'to' => $tours->count(),
                ],
            ]);
        }

        $paginator = $query->paginate((int) $perPage);

        return response()->json([
            'tours' => collect($paginator->items())->map(fn (Tour $t) => $this->formatTour($t, $user)),
            'counts' => $counts,
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
     * Create a new tour and attach the creator as an admin member.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', Rule::in(['planning', 'active', 'completed'])],
        ]);

        $user = $request->user();

        $tour = Tour::create([
            'name' => $validated['name'],
            'destination' => $validated['destination'] ?? null,
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? 'planning',
            'created_by' => $user->id,
        ]);

        // Attach authenticated user to tour_members with role=admin and status=joined
        TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'joined',
        ]);

        return response()->json([
            'message' => 'Tour created successfully.',
            'tour' => $this->formatTour($tour, $user),
        ], 201);
    }

    /**
     * Show a single tour with members.
     */
    public function show(Request $request, Tour $tour): JsonResponse
    {
        $user = $request->user();

        if (! $tour->hasMember($user) && ! $user->hasRole('Server Admin') && $tour->created_by !== $user->id) {
            return response()->json([
                'message' => 'You do not have access to this tour.',
            ], 403);
        }

        return response()->json([
            'tour' => $this->formatTour($tour, $user),
        ]);
    }

    /**
     * Update a tour (Tour Admin only).
     */
    public function update(Request $request, Tour $tour): JsonResponse
    {
        $user = $request->user();

        if (! $tour->isTourAdmin($user) && ! $user->hasRole('Server Admin')) {
            return response()->json([
                'message' => 'Only a Tour Admin can modify this tour.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', Rule::in(['planning', 'active', 'completed'])],
        ]);

        $tour->update($validated);

        return response()->json([
            'message' => 'Tour updated successfully.',
            'tour' => $this->formatTour($tour, $user),
        ]);
    }

    /**
     * Delete a tour (Tour Admin only).
     */
    public function destroy(Request $request, Tour $tour): JsonResponse
    {
        $user = $request->user();

        if (! $tour->isTourAdmin($user) && ! $user->hasRole('Server Admin')) {
            return response()->json([
                'message' => 'Only a Tour Admin can delete this tour.',
            ], 403);
        }

        $tour->delete();

        return response()->json([
            'message' => 'Tour deleted successfully.',
        ]);
    }
}

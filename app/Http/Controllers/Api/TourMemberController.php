<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use App\Notifications\TourMemberJoinedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TourMemberController extends Controller
{
    /**
     * Search an existing user by exact email for invitation (Tour Admin only).
     */
    public function searchUser(Request $request, Tour $tour): JsonResponse
    {
        $currentUser = $request->user();

        if (! $tour->isTourAdmin($currentUser) && ! $currentUser->hasRole('Server Admin')) {
            return response()->json([
                'message' => 'Only a Tour Admin can search and invite members.',
            ], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));

        $targetUser = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $targetUser) {
            return response()->json([
                'message' => 'User with this email not found.',
            ], 404);
        }

        // Check if user is already a member or already invited
        $existing = TourMember::where('tour_id', $tour->id)
            ->where('user_id', $targetUser->id)
            ->first();

        $alreadyMember = false;
        $alreadyInvited = false;
        if ($existing) {
            if ($existing->status === 'joined') {
                $alreadyMember = true;
            } else {
                $alreadyInvited = true;
            }
        }

        return response()->json([
            'user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'avatar' => $targetUser->avatar,
                'phone' => $targetUser->phone,
                'whatsapp_link' => $targetUser->whatsapp_link,
                'messenger_link' => $targetUser->messenger_link,
                'is_already_member' => $alreadyMember,
                'is_already_invited' => $alreadyInvited,
            ],
            'message' => $alreadyMember 
                ? "User '{$targetUser->name}' is already an active member of this tour."
                : ($alreadyInvited ? "User '{$targetUser->name}' already has a pending invitation for this tour." : null),
        ]);
    }

    /**
     * Invite an existing user to the tour (Tour Admin only).
     */
    public function invite(Request $request, Tour $tour): JsonResponse
    {
        $currentUser = $request->user();

        if (! $tour->isTourAdmin($currentUser) && ! $currentUser->hasRole('Server Admin')) {
            return response()->json([
                'message' => 'Only a Tour Admin can invite members.',
            ], 403);
        }

        $validated = $request->validate([
            'email' => ['nullable', 'email'],
            'email_or_username' => ['nullable', 'string'],
            'user_id' => ['nullable', 'uuid'],
            'role' => ['nullable', 'string', Rule::in(['admin', 'member'])],
        ]);

        $targetUser = null;

        if ($request->filled('email')) {
            $email = strtolower(trim($request->input('email')));
            $targetUser = User::whereRaw('LOWER(email) = ?', [$email])->first();
        } elseif ($request->filled('user_id')) {
            $targetUser = User::find($request->input('user_id'));
        } elseif ($request->filled('email_or_username')) {
            $identifier = trim($validated['email_or_username']);
            $targetUser = User::where('email', $identifier)
                ->orWhere('name', $identifier)
                ->orWhere('id', $identifier)
                ->first();
        }

        if (! $targetUser) {
            return response()->json([
                'message' => 'User with this email not found.',
            ], 404);
        }

        // Check if user is already a member or already invited
        $existing = TourMember::where('tour_id', $tour->id)
            ->where('user_id', $targetUser->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'joined') {
                return response()->json([
                    'message' => "User '{$targetUser->name}' is already an active member of this tour.",
                ], 422);
            }

            return response()->json([
                'message' => "User '{$targetUser->name}' already has a pending invitation for this tour.",
            ], 422);
        }

        $member = TourMember::create([
            'tour_id' => $tour->id,
            'user_id' => $targetUser->id,
            'role' => $validated['role'] ?? 'member',
            'status' => 'invited',
        ]);

        // Send database notification to the invited user
        $targetUser->notify(new \App\Notifications\TourInvitationNotification($tour, $currentUser));

        return response()->json([
            'message' => "Invitation sent to {$targetUser->name}.",
            'member' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'phone' => $targetUser->phone,
                'avatar' => $targetUser->avatar,
                'whatsapp_link' => $targetUser->whatsapp_link,
                'messenger_link' => $targetUser->messenger_link,
                'membership_id' => $member->id,
                'role' => $member->role,
                'status' => $member->status,
                'joined_at' => $member->created_at,
            ],
        ], 201);
    }

    /**
     * Accept a tour invitation.
     */
    public function acceptInvite(Request $request, Tour $tour): JsonResponse
    {
        $currentUser = $request->user();

        $membership = TourMember::where('tour_id', $tour->id)
            ->where('user_id', $currentUser->id)
            ->where('status', 'invited')
            ->first();

        if (! $membership) {
            return response()->json([
                'message' => 'You do not have a pending invitation for this tour.',
            ], 404);
        }

        $membership->update([
            'status' => 'joined',
        ]);

        // Notify all Tour Admins when an explorer accepts an invitation
        $admins = User::whereIn('id', function ($query) use ($tour) {
            $query->select('user_id')
                ->from('tour_members')
                ->where('tour_id', $tour->id)
                ->where('role', 'admin');
        })
        ->where('id', '!=', $currentUser->id)
        ->get();

        foreach ($admins as $admin) {
            $admin->notify(new TourMemberJoinedNotification($tour, $currentUser));
        }

        return response()->json([
            'message' => "You have joined the tour '{$tour->name}'!",
            'membership' => $membership,
        ]);
    }

    /**
     * Decline / Reject a tour invitation.
     */
    public function rejectInvite(Request $request, Tour $tour): JsonResponse
    {
        $currentUser = $request->user();

        $membership = TourMember::where('tour_id', $tour->id)
            ->where('user_id', $currentUser->id)
            ->where('status', 'invited')
            ->first();

        if (! $membership) {
            return response()->json([
                'message' => 'You do not have a pending invitation for this tour.',
            ], 404);
        }

        $membership->delete();

        return response()->json([
            'message' => "You have declined the invitation for '{$tour->name}'.",
        ]);
    }

    /**
     * Remove a member from the tour (Tour Admin or member self-leaving).
     */
    public function removeMember(Request $request, Tour $tour, string $memberId): JsonResponse
    {
        $currentUser = $request->user();

        // Find membership by membership ID or by user ID
        $membership = TourMember::where('tour_id', $tour->id)
            ->where(function ($q) use ($memberId) {
                $q->where('id', $memberId)->orWhere('user_id', $memberId);
            })
            ->first();

        if (! $membership) {
            return response()->json([
                'message' => 'Member not found in this tour.',
            ], 404);
        }

        $targetUserId = $membership->user_id;

        // Tour creator cannot be removed
        if ($targetUserId === $tour->created_by) {
            return response()->json([
                'message' => 'The creator of the tour cannot be removed.',
            ], 422);
        }

        $isSelf = $currentUser->id === $targetUserId;
        $isTourAdmin = $tour->isTourAdmin($currentUser) || $currentUser->hasRole('Server Admin');

        // Once joined, users cannot leave on their own to preserve expense calculation integrity
        if ($isSelf && $membership->status === 'joined' && ! $isTourAdmin) {
            return response()->json([
                'message' => 'Once joined, you cannot leave a tour on your own. Please contact a Tour Admin to be removed.',
            ], 422);
        }

        if (! $isTourAdmin) {
            return response()->json([
                'message' => 'Only a Tour Admin can remove members from this tour.',
            ], 403);
        }

        $membership->delete();

        return response()->json([
            'message' => 'Member removed from the tour.',
        ]);
    }
}

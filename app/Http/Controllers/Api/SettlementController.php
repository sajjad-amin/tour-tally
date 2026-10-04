<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\User;
use App\Services\SettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettlementController extends Controller
{
    public function __construct(protected SettlementService $settlementService) {}

    /**
     * Authorize that the current user is an active joined member, creator, or Server Admin.
     */
    protected function authorizeTourMember(User $user, Tour $tour): void
    {
        if ($user->hasRole('Server Admin') || $tour->isJoinedMember($user)) {
            return;
        }

        abort(response()->json([
            'message' => 'You must be an active member of this tour to access its settlements.',
        ], 403));
    }

    /**
     * Calculate net balances and suggested settlement transactions for a tour
     * based ONLY on approved expenses.
     */
    public function index(Request $request, Tour $tour): JsonResponse
    {
        $this->authorizeTourMember($request->user(), $tour);

        $data = $this->settlementService->calculate($tour);

        return response()->json([
            'tour_id' => $data['tour_id'],
            'tour_name' => $data['tour_name'],
            'total_approved_expenses' => $data['total_approved_expenses'],
            'approved_expenses_count' => $data['approved_expenses_count'],
            'member_balances' => $data['member_balances'],
            'suggested_transactions' => $data['suggested_transactions'],
        ]);
    }
}

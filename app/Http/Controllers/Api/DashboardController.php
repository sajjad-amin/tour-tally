<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpensePayer;
use App\Models\ExpenseSplit;
use App\Models\Tour;
use App\Services\SettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(protected SettlementService $settlementService) {}

    /**
     * Get tailored dashboard summary prioritizing ongoing (active) tours.
     * If no active tour exists, falls back to upcoming planning tours and lifetime stats.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Check for active tours where the user is a joined member or creator
        $activeTours = Tour::where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
                ->orWhereHas('tourMembers', function ($mq) use ($user) {
                    $mq->where('user_id', $user->id)->where('status', 'joined');
                });
        })
            ->where('status', 'active')
            ->orderBy('start_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->limit(2)
            ->get();

        // 2. Active Tour View
        if ($activeTours->isNotEmpty()) {
            $activeTour = $activeTours->first();
            $settlement = $this->settlementService->calculate($activeTour);
            $userBal = $settlement['balances_by_user_id'][$user->id] ?? null;

            $userPaid = $userBal ? (float) $userBal['total_paid'] : 0.00;
            $userOwed = $userBal ? (float) $userBal['total_owed'] : 0.00;
            $userNetBalance = $userBal ? (float) $userBal['net_balance'] : 0.00;
            $userStatus = $userBal ? $userBal['status'] : 'settled';

            $recentExpenses = $activeTour->expenses()
                ->with(['addedBy:id,name', 'payers.user:id,name', 'splits.user:id,name'])
                ->latest('date')
                ->latest('created_at')
                ->limit(5)
                ->get()
                ->map(function ($exp) {
                    return [
                        'id' => $exp->id,
                        'title' => $exp->title,
                        'amount' => (float) $exp->amount,
                        'category' => $exp->category,
                        'date' => $exp->date?->format('Y-m-d'),
                        'status' => $exp->status,
                        'added_by' => $exp->addedBy ? [
                            'id' => $exp->addedBy->id,
                            'name' => $exp->addedBy->name,
                        ] : null,
                    ];
                });

            $membersCount = $activeTour->tourMembers()->where('status', 'joined')->count();

            $otherActiveTours = $activeTours->slice(1)->values()->map(function ($t) {
                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'destination' => $t->destination,
                    'start_date' => $t->start_date?->format('Y-m-d'),
                    'end_date' => $t->end_date?->format('Y-m-d'),
                ];
            });

            return response()->json([
                'has_active_tour' => true,
                'active_tour' => [
                    'id' => $activeTour->id,
                    'name' => $activeTour->name,
                    'destination' => $activeTour->destination,
                    'description' => $activeTour->description,
                    'start_date' => $activeTour->start_date?->format('Y-m-d'),
                    'end_date' => $activeTour->end_date?->format('Y-m-d'),
                    'status' => $activeTour->status,
                    'total_expense' => $settlement['total_approved_expenses'],
                    'approved_expenses_count' => $settlement['approved_expenses_count'],
                    'user_paid' => round($userPaid, 2),
                    'user_owed' => round($userOwed, 2),
                    'user_balance' => round($userNetBalance, 2),
                    'user_status' => $userStatus,
                    'members_count' => $membersCount,
                    'recent_expenses' => $recentExpenses,
                ],
                'other_active_tours' => $otherActiveTours,
            ]);
        }

        // 3. Fallback View: No active tour currently ongoing
        $userTourIds = Tour::where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
                ->orWhereHas('tourMembers', function ($mq) use ($user) {
                    $mq->where('user_id', $user->id)->where('status', 'joined');
                });
        })->pluck('id');

        $upcomingTours = Tour::whereIn('id', $userTourIds)
            ->where('status', 'planning')
            ->orderBy('start_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->limit(6)
            ->get()
            ->map(function ($tour) {
                return [
                    'id' => $tour->id,
                    'name' => $tour->name,
                    'destination' => $tour->destination,
                    'description' => $tour->description,
                    'start_date' => $tour->start_date?->format('Y-m-d'),
                    'end_date' => $tour->end_date?->format('Y-m-d'),
                    'status' => $tour->status,
                    'members_count' => $tour->tourMembers()->where('status', 'joined')->count(),
                ];
            });

        $completedToursCount = Tour::whereIn('id', $userTourIds)
            ->where('status', 'completed')
            ->count();

        $totalToursCount = $userTourIds->count();

        $lifetimePaid = ExpensePayer::where('user_id', $user->id)
            ->whereHas('expense', function ($q) use ($userTourIds) {
                $q->whereIn('tour_id', $userTourIds)->where('status', 'approved');
            })
            ->sum('amount');

        $lifetimeSpent = ExpenseSplit::where('user_id', $user->id)
            ->whereHas('expense', function ($q) use ($userTourIds) {
                $q->whereIn('tour_id', $userTourIds)->where('status', 'approved');
            })
            ->sum('amount_owed');

        return response()->json([
            'has_active_tour' => false,
            'upcoming_tours' => $upcomingTours,
            'lifetime_stats' => [
                'completed_tours_count' => $completedToursCount,
                'total_tours_count' => $totalToursCount,
                'lifetime_paid' => round((float) $lifetimePaid, 2),
                'lifetime_spent' => round((float) $lifetimeSpent, 2),
            ],
        ]);
    }
}

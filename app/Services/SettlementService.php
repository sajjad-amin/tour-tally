<?php

namespace App\Services;

use App\Models\Tour;
use App\Models\User;
use Carbon\Carbon;

class SettlementService
{
    /**
     * Calculate net balances and suggested settlement transactions for a tour
     * based ONLY on approved expenses.
     *
     * @return array{
     *     tour_id: string,
     *     tour_name: string,
     *     tour: Tour,
     *     total_approved_expenses: float,
     *     approved_expenses_count: int,
     *     member_balances: array<int, array{
     *         user: array{id: string, name: string, email: string, avatar: ?string, phone: ?string},
     *         total_paid: float,
     *         total_owed: float,
     *         net_balance: float,
     *         status: string
     *     }>,
     *     suggested_transactions: array<int, array{
     *         from: array{id: string, name: string, email: string, avatar: ?string, phone: ?string},
     *         to: array{id: string, name: string, email: string, avatar: ?string, phone: ?string},
     *         amount: float,
     *         amount_formatted: string
     *     }>,
     *     balances_by_user_id: array<string, array{
     *         user: array{id: string, name: string, email: string, avatar: ?string, phone: ?string},
     *         total_paid: float,
     *         total_owed: float,
     *         net_balance: float,
     *         status: string
     *     }>
     * }
     */
    public function calculate(Tour $tour): array
    {
        // 1. Fetch only approved expenses with payers and splits
        $approvedExpenses = $tour->expenses()
            ->where('status', 'approved')
            ->with([
                'payers.user:id,name,email,avatar,phone',
                'splits.user:id,name,email,avatar,phone',
            ])
            ->get();

        // 2. Fetch all joined members of this tour
        $joinedTourMembers = $tour->tourMembers()
            ->where('status', 'joined')
            ->with('user:id,name,email,avatar,phone')
            ->get();

        // Initialize member balances dictionary keyed by user_id
        $balances = [];

        foreach ($joinedTourMembers as $tm) {
            if ($tm->user) {
                $balances[$tm->user->id] = [
                    'user' => [
                        'id' => $tm->user->id,
                        'name' => $tm->user->name,
                        'email' => $tm->user->email,
                        'avatar' => $tm->user->avatar,
                        'phone' => $tm->user->phone,
                    ],
                    'total_paid' => 0.00,
                    'total_owed' => 0.00,
                    'net_balance' => 0.00,
                ];
            }
        }

        $totalApprovedAmount = 0.00;

        // 3. Accumulate paid amounts and owed amounts from approved expenses
        foreach ($approvedExpenses as $expense) {
            $amount = (float) $expense->amount;
            $totalApprovedAmount += $amount;

            // Accumulate each payer allocation
            foreach ($expense->payers as $payer) {
                $payerId = $payer->user_id;
                $paidAmount = (float) $payer->amount;

                if (! isset($balances[$payerId])) {
                    $user = $payer->user ?? User::find($payerId);
                    if ($user) {
                        $balances[$payerId] = [
                            'user' => [
                                'id' => $user->id,
                                'name' => $user->name,
                                'email' => $user->email,
                                'avatar' => $user->avatar,
                                'phone' => $user->phone,
                            ],
                            'total_paid' => 0.00,
                            'total_owed' => 0.00,
                            'net_balance' => 0.00,
                        ];
                    }
                }

                if (isset($balances[$payerId])) {
                    $balances[$payerId]['total_paid'] += $paidAmount;
                }
            }

            // Accumulate each split
            foreach ($expense->splits as $split) {
                $debtorId = $split->user_id;
                $owed = (float) $split->amount_owed;

                if (! isset($balances[$debtorId])) {
                    $user = $split->user ?? User::find($debtorId);
                    if ($user) {
                        $balances[$debtorId] = [
                            'user' => [
                                'id' => $user->id,
                                'name' => $user->name,
                                'email' => $user->email,
                                'avatar' => $user->avatar,
                                'phone' => $user->phone,
                            ],
                            'total_paid' => 0.00,
                            'total_owed' => 0.00,
                            'net_balance' => 0.00,
                        ];
                    }
                }

                if (isset($balances[$debtorId])) {
                    $balances[$debtorId]['total_owed'] += $owed;
                }
            }
        }

        // 4. Calculate net balance and label status
        $creditors = [];
        $debtors = [];
        $memberBalances = [];

        foreach ($balances as $userId => $item) {
            $paid = round($item['total_paid'], 2);
            $owed = round($item['total_owed'], 2);
            $net = round($paid - $owed, 2);

            $status = 'settled';
            if ($net > 0.009) {
                $status = 'credit';
                $creditors[] = [
                    'user' => $item['user'],
                    'balance' => $net,
                ];
            } elseif ($net < -0.009) {
                $status = 'debt';
                $debtors[] = [
                    'user' => $item['user'],
                    'balance' => abs($net), // absolute debt amount
                ];
            }

            $entry = [
                'user' => $item['user'],
                'total_paid' => $paid,
                'total_owed' => $owed,
                'net_balance' => $net,
                'status' => $status,
            ];

            $balances[$userId] = $entry;
            $memberBalances[] = $entry;
        }

        // Sort member balances: creditors first, then debtors
        usort($memberBalances, fn ($a, $b) => $b['net_balance'] <=> $a['net_balance']);

        // 5. Greedy matching algorithm to minimize number of transactions
        usort($creditors, fn ($a, $b) => $b['balance'] <=> $a['balance']);
        usort($debtors, fn ($a, $b) => $b['balance'] <=> $a['balance']);

        $suggestedTransactions = [];
        $cIndex = 0;
        $dIndex = 0;

        while ($cIndex < count($creditors) && $dIndex < count($debtors)) {
            $creditAmount = $creditors[$cIndex]['balance'];
            $debtAmount = $debtors[$dIndex]['balance'];

            $settleAmount = round(min($creditAmount, $debtAmount), 2);

            if ($settleAmount > 0.009) {
                $suggestedTransactions[] = [
                    'from' => $debtors[$dIndex]['user'],
                    'to' => $creditors[$cIndex]['user'],
                    'amount' => $settleAmount,
                    'amount_formatted' => number_format($settleAmount, 2),
                ];

                $creditors[$cIndex]['balance'] = round($creditAmount - $settleAmount, 2);
                $debtors[$dIndex]['balance'] = round($debtAmount - $settleAmount, 2);
            }

            if ($creditors[$cIndex]['balance'] <= 0.009) {
                $cIndex++;
            }

            if ($debtors[$dIndex]['balance'] <= 0.009) {
                $dIndex++;
            }
        }

        return [
            'tour_id' => $tour->id,
            'tour_name' => $tour->name,
            'tour' => $tour,
            'total_approved_expenses' => round($totalApprovedAmount, 2),
            'approved_expenses_count' => $approvedExpenses->count(),
            'member_balances' => $memberBalances,
            'suggested_transactions' => $suggestedTransactions,
            'balances_by_user_id' => $balances,
        ];
    }

    /**
     * Generate emoji-rich, currency-agnostic text for WhatsApp / Messenger sharing.
     *
     * @param  array<string, mixed>  $settlement
     */
    public function formatStatementText(array $settlement): string
    {
        $tourName = $settlement['tour_name'];
        $totalExpenses = number_format($settlement['total_approved_expenses'], 2);
        $expenseCount = $settlement['approved_expenses_count'];
        $generatedAt = Carbon::now()->format('d M Y, h:i A');

        $lines = [];
        $lines[] = '🏕️ *Tour Settlement Statement*';
        $lines[] = "📍 *Tour:* {$tourName}";
        $lines[] = "📅 *Date:* {$generatedAt}";
        $lines[] = "💰 *Total Approved Expenses:* {$totalExpenses} ({$expenseCount} expenses)";
        $lines[] = '';
        $lines[] = '👥 *Member Balances:*';

        foreach ($settlement['member_balances'] as $mb) {
            $name = $mb['user']['name'];
            $paid = number_format($mb['total_paid'], 2);
            $owed = number_format($mb['total_owed'], 2);
            $net = $mb['net_balance'];
            $netFormatted = number_format(abs($net), 2);

            if ($net > 0.009) {
                $statusText = "+{$netFormatted} (Receives)";
            } elseif ($net < -0.009) {
                $statusText = "-{$netFormatted} (Owes)";
            } else {
                $statusText = '0.00 (Settled)';
            }

            $lines[] = "• *{$name}*: Paid {$paid} | Owed {$owed} | Net: {$statusText}";
        }

        $lines[] = '';
        $lines[] = '🤝 *Suggested Transfers:*';

        if (empty($settlement['suggested_transactions'])) {
            $lines[] = '✅ All accounts are fully settled! No transfers needed.';
        } else {
            foreach ($settlement['suggested_transactions'] as $i => $txn) {
                $num = $i + 1;
                $from = $txn['from']['name'];
                $to = $txn['to']['name'];
                $amount = $txn['amount_formatted'];
                $lines[] = "{$num}. *{$from}* ➡️ *{$to}*: {$amount}";
            }
        }

        $lines[] = '';
        $lines[] = '✨ _Generated by TourTally_';

        return implode("\n", $lines);
    }
}

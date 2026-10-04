<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpensePayer;
use App\Models\ExpenseSplit;
use App\Models\Tour;
use App\Models\User;
use App\Notifications\TourExpenseNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    /**
     * Authorize that the current user is an active joined member, creator, or Server Admin.
     */
    protected function authorizeTourMember(User $user, Tour $tour): void
    {
        if ($user->hasRole('Server Admin') || $tour->isJoinedMember($user)) {
            return;
        }

        abort(response()->json([
            'message' => 'You must be an active member of this tour to access its expenses.',
        ], 403));
    }

    /**
     * Ensure the expense belongs to the given tour.
     */
    protected function assertExpenseBelongsToTour(Tour $tour, Expense $expense): void
    {
        if ($expense->tour_id !== $tour->id) {
            abort(response()->json([
                'message' => 'The requested expense does not belong to this tour.',
            ], 404));
        }
    }

    /**
     * Check whether a user is an admin of the specified tour or server admin.
     */
    protected function isTourAdmin(User $user, Tour $tour): bool
    {
        if ($user->hasRole('Server Admin')) {
            return true;
        }

        return $tour->isTourAdmin($user);
    }

    /**
     * Verify whether a user is directly involved in an expense (creator, payer, debtor, or tour admin).
     */
    protected function isUserInvolvedInExpense(User $user, Tour $tour, Expense $expense): bool
    {
        if ($this->isTourAdmin($user, $tour)) {
            return true;
        }

        if ($expense->added_by === $user->id) {
            return true;
        }

        if ($expense->payers()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return $expense->splits()->where('user_id', $user->id)->exists();
    }

    /**
     * Helper to normalize and validate payers and splits data.
     *
     * @return array{0: ?JsonResponse, 1: list<array{user_id: string, amount: float}>, 2: list<array{user_id: string, amount: float}>, 3: string, 4: ?string}
     */
    protected function parseAndValidateExpenseData(Request $request, Tour $tour, float $totalAmount): array
    {
        // Resolve title (support 'title' or legacy 'description')
        $title = $request->input('title') ?? $request->input('description');
        if (empty($title)) {
            return [
                response()->json(['message' => 'The title field is required.'], 422),
                [],
                [],
                '',
                null,
            ];
        }

        $notes = $request->input('notes');

        // Resolve payers (support 'payers' array or legacy 'paid_by')
        $rawPayers = $request->input('payers');
        if (empty($rawPayers) && $request->has('paid_by')) {
            $rawPayers = [
                [
                    'user_id' => $request->input('paid_by'),
                    'amount' => $totalAmount,
                ],
            ];
        }

        if (empty($rawPayers) || ! is_array($rawPayers)) {
            return [
                response()->json(['message' => 'At least one payer must be specified.'], 422),
                [],
                [],
                $title,
                $notes,
            ];
        }

        // Validate Payers
        $payersList = [];
        $payersSum = 0;
        $seenPayerIds = [];

        foreach ($rawPayers as $index => $payer) {
            if (empty($payer['user_id'])) {
                return [
                    response()->json(['message' => "Payer at index {$index} must specify a valid user ID."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $userId = $payer['user_id'];
            if (isset($seenPayerIds[$userId])) {
                return [
                    response()->json(['message' => 'Duplicate member found in payer allocations. Each member must appear only once.'], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }
            $seenPayerIds[$userId] = true;

            if (! $tour->isJoinedMember($userId)) {
                return [
                    response()->json(['message' => "The user ({$userId}) in payer allocation is not an active member of this tour."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $amount = isset($payer['amount']) ? (float) $payer['amount'] : 0;
            if ($amount <= 0) {
                return [
                    response()->json(['message' => "Payer allocation at index {$index} must specify a positive amount."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $payersSum += $amount;
            $payersList[] = [
                'user_id' => $userId,
                'amount' => $amount,
            ];
        }

        if (round($payersSum, 2) !== round($totalAmount, 2)) {
            return [
                response()->json([
                    'message' => sprintf(
                        'The sum of payer allocations ($%.2f) does not match the total expense amount ($%.2f).',
                        $payersSum,
                        $totalAmount
                    ),
                ], 422),
                [],
                [],
                $title,
                $notes,
            ];
        }

        // Validate Splits
        $rawSplits = $request->input('splits');
        if (empty($rawSplits) || ! is_array($rawSplits)) {
            return [
                response()->json(['message' => 'At least one split allocation must be specified.'], 422),
                [],
                [],
                $title,
                $notes,
            ];
        }

        $splitsList = [];
        $splitsSum = 0;
        $seenSplitIds = [];

        foreach ($rawSplits as $index => $split) {
            if (empty($split['user_id'])) {
                return [
                    response()->json(['message' => "Split allocation at index {$index} must specify a valid user ID."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $userId = $split['user_id'];
            if (isset($seenSplitIds[$userId])) {
                return [
                    response()->json(['message' => 'Duplicate member found in split allocations. Each member must appear only once.'], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }
            $seenSplitIds[$userId] = true;

            if (! $tour->isJoinedMember($userId)) {
                return [
                    response()->json(['message' => "The user ({$userId}) in the split allocation is not an active member of this tour."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $splitAmount = isset($split['amount_owed']) ? (float) $split['amount_owed'] : (isset($split['amount']) ? (float) $split['amount'] : 0);
            if ($splitAmount <= 0) {
                return [
                    response()->json(['message' => "Split allocation at index {$index} must specify a positive amount."], 422),
                    [],
                    [],
                    $title,
                    $notes,
                ];
            }

            $splitsSum += $splitAmount;
            $splitsList[] = [
                'user_id' => $userId,
                'amount' => $splitAmount,
            ];
        }

        if (round($splitsSum, 2) !== round($totalAmount, 2)) {
            return [
                response()->json([
                    'message' => sprintf(
                        'The sum of splits ($%.2f) does not match the total expense amount ($%.2f).',
                        $splitsSum,
                        $totalAmount
                    ),
                ], 422),
                [],
                [],
                $title,
                $notes,
            ];
        }

        return [null, $payersList, $splitsList, $title, $notes];
    }

    /**
     * List all expenses for a tour, ordered by date descending.
     */
    public function index(Request $request, Tour $tour): JsonResponse
    {
        $this->authorizeTourMember($request->user(), $tour);

        $expenses = $tour->expenses()
            ->with([
                'addedBy:id,name,email,avatar,phone',
                'payers.user:id,name,email,avatar,phone',
                'splits.user:id,name,email,avatar,phone',
            ])
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'tour_id' => $tour->id,
            'expenses' => $expenses,
            'total_count' => $expenses->count(),
            'total_amount' => (string) $expenses->sum('amount'),
        ]);
    }

    /**
     * Log a new expense with its payer and split allocations inside a database transaction.
     * Status is always set to 'pending' by default.
     */
    public function store(Request $request, Tour $tour): JsonResponse
    {
        $currentUser = $request->user();
        $this->authorizeTourMember($currentUser, $tour);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'category' => ['required', 'string', 'max:100'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'date' => ['required', 'date'],
            'paid_by' => ['nullable', 'uuid', 'exists:users,id'],
            'payers' => ['nullable', 'array', 'min:1'],
            'payers.*.user_id' => ['required_with:payers', 'uuid', 'exists:users,id'],
            'payers.*.amount' => ['required_with:payers', 'numeric', 'gt:0'],
            'splits' => ['required', 'array', 'min:1'],
            'splits.*.user_id' => ['required', 'uuid', 'exists:users,id'],
            'splits.*.amount' => ['nullable', 'numeric', 'gt:0'],
            'splits.*.amount_owed' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $totalAmount = (float) $validated['amount'];

        [$validationError, $payersList, $splitsList, $title, $notes] = $this->parseAndValidateExpenseData($request, $tour, $totalAmount);
        if ($validationError) {
            return $validationError;
        }

        // Create expense, payers, and splits inside a database transaction
        $expense = DB::transaction(function () use ($tour, $currentUser, $validated, $totalAmount, $title, $notes, $payersList, $splitsList) {
            $createdExpense = Expense::create([
                'tour_id' => $tour->id,
                'added_by' => $currentUser->id,
                'amount' => $totalAmount,
                'category' => $validated['category'],
                'title' => $title,
                'notes' => $notes,
                'date' => $validated['date'],
                'status' => 'pending', // Strictly default to pending approval
            ]);

            foreach ($payersList as $payer) {
                ExpensePayer::create([
                    'expense_id' => $createdExpense->id,
                    'user_id' => $payer['user_id'],
                    'amount' => round((float) $payer['amount'], 2),
                ]);
            }

            foreach ($splitsList as $split) {
                ExpenseSplit::create([
                    'expense_id' => $createdExpense->id,
                    'user_id' => $split['user_id'],
                    'amount_owed' => round((float) $split['amount'], 2),
                ]);
            }

            return $createdExpense;
        });

        $expense->load([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        // Trigger notifications:
        // - If regular member adds it -> notify all Tour Admins
        // - If Tour Admin adds it -> notify all involved payers and split users (excluding creator)
        $isCreatorAdmin = $this->isTourAdmin($currentUser, $tour);

        if (! $isCreatorAdmin) {
            $adminUserIds = $tour->tourMembers()
                ->where('status', 'joined')
                ->where('role', 'admin')
                ->where('user_id', '!=', $currentUser->id)
                ->pluck('user_id');

            $adminUsers = User::whereIn('id', $adminUserIds)->get();
            foreach ($adminUsers as $admin) {
                $admin->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $currentUser,
                    'expense_created'
                ));
            }
        } else {
            $recipientIds = collect();

            foreach ($expense->payers as $payer) {
                if ($payer->user_id !== $currentUser->id) {
                    $recipientIds->push($payer->user_id);
                }
            }

            foreach ($expense->splits as $split) {
                if ($split->user_id !== $currentUser->id) {
                    $recipientIds->push($split->user_id);
                }
            }

            $recipients = User::whereIn('id', $recipientIds->unique())->get();
            foreach ($recipients as $recipient) {
                $recipient->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $currentUser,
                    'expense_created'
                ));
            }
        }

        return response()->json([
            'message' => 'Expense entry submitted successfully and is pending approval.',
            'expense' => $expense,
        ], 201);
    }

    /**
     * Update an expense record.
     * Guard: Creator or Tour Admin can edit, provided the expense is not delete_requested.
     */
    public function update(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $currentUser = $request->user();
        $this->authorizeTourMember($currentUser, $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        if (! $this->isUserInvolvedInExpense($currentUser, $tour, $expense)) {
            return response()->json([
                'message' => 'You are not authorized to update this expense.',
            ], 403);
        }

        if ($expense->status === 'delete_requested') {
            return response()->json([
                'message' => 'Cannot update an expense with a pending deletion request.',
            ], 422);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'category' => ['required', 'string', 'max:100'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'date' => ['required', 'date'],
            'paid_by' => ['nullable', 'uuid', 'exists:users,id'],
            'payers' => ['nullable', 'array', 'min:1'],
            'payers.*.user_id' => ['required_with:payers', 'uuid', 'exists:users,id'],
            'payers.*.amount' => ['required_with:payers', 'numeric', 'gt:0'],
            'splits' => ['required', 'array', 'min:1'],
            'splits.*.user_id' => ['required', 'uuid', 'exists:users,id'],
            'splits.*.amount' => ['nullable', 'numeric', 'gt:0'],
            'splits.*.amount_owed' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $totalAmount = (float) $validated['amount'];

        [$validationError, $payersList, $splitsList, $title, $notes] = $this->parseAndValidateExpenseData($request, $tour, $totalAmount);
        if ($validationError) {
            return $validationError;
        }

        $isAlreadyApproved = in_array($expense->status, ['approved', 'edit_requested']);

        if ($isAlreadyApproved) {
            $proposedData = [
                'amount' => $totalAmount,
                'category' => $validated['category'],
                'title' => $title,
                'notes' => $notes,
                'date' => $validated['date'],
                'payers' => array_map(function ($payer) {
                    $user = User::find($payer['user_id']);

                    return [
                        'user_id' => $payer['user_id'],
                        'amount' => round((float) $payer['amount'], 2),
                        'user' => $user ? [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'avatar' => $user->avatar,
                            'phone' => $user->phone,
                        ] : null,
                    ];
                }, $payersList),
                'splits' => array_map(function ($split) {
                    $user = User::find($split['user_id']);

                    return [
                        'user_id' => $split['user_id'],
                        'amount_owed' => round((float) $split['amount'], 2),
                        'user' => $user ? [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'avatar' => $user->avatar,
                            'phone' => $user->phone,
                        ] : null,
                    ];
                }, $splitsList),
            ];

            $expense->update([
                'added_by' => $currentUser->id,
                'status' => 'edit_requested',
                'proposed_changes' => $proposedData,
            ]);
        } else {
            DB::transaction(function () use ($expense, $currentUser, $validated, $totalAmount, $title, $notes, $payersList, $splitsList) {
                $expense->update([
                    'added_by' => $currentUser->id,
                    'amount' => $totalAmount,
                    'category' => $validated['category'],
                    'title' => $title,
                    'notes' => $notes,
                    'date' => $validated['date'],
                    'status' => 'pending',
                    'proposed_changes' => null,
                ]);

                // Re-sync payers
                $expense->payers()->delete();
                foreach ($payersList as $payer) {
                    ExpensePayer::create([
                        'expense_id' => $expense->id,
                        'user_id' => $payer['user_id'],
                        'amount' => round((float) $payer['amount'], 2),
                    ]);
                }

                // Re-sync splits
                $expense->splits()->delete();
                foreach ($splitsList as $split) {
                    ExpenseSplit::create([
                        'expense_id' => $expense->id,
                        'user_id' => $split['user_id'],
                        'amount_owed' => round((float) $split['amount'], 2),
                    ]);
                }
            });
        }

        $expense->load([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        // Notifications:
        $isEditorAdmin = $this->isTourAdmin($currentUser, $tour);
        $actionNotificationType = $isAlreadyApproved ? 'expense_edit_requested' : 'expense_updated';

        if (! $isEditorAdmin) {
            $adminUserIds = $tour->tourMembers()
                ->where('status', 'joined')
                ->where('role', 'admin')
                ->where('user_id', '!=', $currentUser->id)
                ->pluck('user_id');

            $adminUsers = User::whereIn('id', $adminUserIds)->get();
            foreach ($adminUsers as $admin) {
                $admin->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $currentUser,
                    $actionNotificationType,
                    "{$currentUser->name} submitted an edit request for the expense \"{$expense->title}\" in \"{$tour->name}\". It is pending your review."
                ));
            }
        } else {
            $recipientIds = collect();

            foreach ($expense->payers as $payer) {
                if ($payer->user_id !== $currentUser->id) {
                    $recipientIds->push($payer->user_id);
                }
            }

            foreach ($expense->splits as $split) {
                if ($split->user_id !== $currentUser->id) {
                    $recipientIds->push($split->user_id);
                }
            }

            if ($recipientIds->isEmpty()) {
                $recipientIds = $tour->tourMembers()
                    ->where('status', 'joined')
                    ->where('user_id', '!=', $currentUser->id)
                    ->pluck('user_id');
            }

            $recipients = User::whereIn('id', $recipientIds->unique())->get();
            foreach ($recipients as $recipient) {
                $recipient->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $currentUser,
                    $actionNotificationType,
                    "{$currentUser->name} (Admin) submitted an edit request for the expense \"{$expense->title}\" in \"{$tour->name}\". It is pending review."
                ));
            }
        }

        $message = $isAlreadyApproved
            ? 'Expense edit request submitted successfully with proposed changes awaiting review.'
            : 'Expense updated successfully and is pending approval.';

        return response()->json([
            'message' => $message,
            'expense' => $expense,
        ]);
    }

    /**
     * Show a single expense details with its relations.
     */
    public function show(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $this->authorizeTourMember($request->user(), $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        $expense->loadMissing([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        return response()->json([
            'expense' => $expense,
        ]);
    }

    /**
     * Approve an expense.
     * Guard: Only a Tour Admin (or another member if the admin created it) can approve.
     * - If status is pending or edit_requested -> changes to approved.
     * - If status is delete_requested -> permanently deletes the expense (and splits/payers) from DB.
     */
    public function approve(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->authorizeTourMember($user, $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        $isCreator = $expense->added_by === $user->id;
        $creatorUser = User::find($expense->added_by);
        $creatorIsAdmin = $creatorUser ? $this->isTourAdmin($creatorUser, $tour) : false;
        $currentUserIsAdmin = $this->isTourAdmin($user, $tour);
        $joinedMembersCount = $tour->tourMembers()->where('status', 'joined')->count();

        // 1. Guard check: Creator cannot approve their own expense if there are other members in the tour
        if ($isCreator && $joinedMembersCount > 1) {
            return response()->json([
                'message' => 'You cannot approve your own expense. It must be approved by another tour member or admin.',
            ], 403);
        }

        // 2. Guard check: If created by regular member, only a Tour Admin can approve.
        // If created by an Admin, another member (or another admin) can approve.
        if (! $creatorIsAdmin && ! $currentUserIsAdmin) {
            return response()->json([
                'message' => 'Only a Tour Admin can approve this expense.',
            ], 403);
        }

        // 3. Status handling
        if ($expense->status === 'approved') {
            return response()->json([
                'message' => 'This expense is already approved.',
            ], 422);
        }

        if ($expense->status === 'rejected') {
            return response()->json([
                'message' => 'This expense was rejected and cannot be approved directly.',
            ], 422);
        }

        if ($expense->status === 'delete_requested') {
            // Permanently delete the expense and its cascade relations
            if ($expense->added_by !== $user->id) {
                $creator = User::find($expense->added_by);
                $creator?->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $user,
                    'expense_approved',
                    "Your deletion request for the expense of \${$expense->amount} in \"{$tour->name}\" was approved and the record has been permanently removed."
                ));
            }

            $expense->delete();

            return response()->json([
                'message' => 'Expense permanently deleted upon approval of deletion request.',
                'deleted' => true,
            ]);
        }

        if ($expense->status === 'edit_requested') {
            DB::transaction(function () use ($expense) {
                $proposed = $expense->proposed_changes;

                if (! empty($proposed) && is_array($proposed)) {
                    $expense->update([
                        'amount' => $proposed['amount'] ?? $expense->amount,
                        'category' => $proposed['category'] ?? $expense->category,
                        'title' => $proposed['title'] ?? $expense->title,
                        'notes' => $proposed['notes'] ?? $expense->notes,
                        'date' => $proposed['date'] ?? $expense->date,
                        'status' => 'approved',
                        'proposed_changes' => null,
                    ]);

                    if (isset($proposed['payers']) && is_array($proposed['payers'])) {
                        $expense->payers()->delete();
                        foreach ($proposed['payers'] as $payer) {
                            ExpensePayer::create([
                                'expense_id' => $expense->id,
                                'user_id' => $payer['user_id'],
                                'amount' => round((float) $payer['amount'], 2),
                            ]);
                        }
                    }

                    if (isset($proposed['splits']) && is_array($proposed['splits'])) {
                        $expense->splits()->delete();
                        foreach ($proposed['splits'] as $split) {
                            $owed = $split['amount_owed'] ?? $split['amount'] ?? 0;
                            ExpenseSplit::create([
                                'expense_id' => $expense->id,
                                'user_id' => $split['user_id'],
                                'amount_owed' => round((float) $owed, 2),
                            ]);
                        }
                    }
                } else {
                    $expense->update([
                        'status' => 'approved',
                        'proposed_changes' => null,
                    ]);
                }
            });
        } else {
            // If pending -> approve it
            $expense->update([
                'status' => 'approved',
                'proposed_changes' => null,
            ]);
        }

        // Notify added_by user that their expense was approved
        if ($expense->added_by !== $user->id) {
            $creator = User::find($expense->added_by);
            $creator?->notify(new TourExpenseNotification(
                $tour,
                $expense,
                $user,
                'expense_approved'
            ));
        }

        $expense->load([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        return response()->json([
            'message' => 'Expense approved successfully.',
            'expense' => $expense,
        ]);
    }

    /**
     * Reject an expense or request.
     * Guard: Only a Tour Admin (or another member if an admin created it) can reject.
     * - If delete_requested or edit_requested -> restores to approved.
     * - If pending -> changes to rejected.
     */
    public function reject(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->authorizeTourMember($user, $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        $isCreator = $expense->added_by === $user->id;
        $creatorUser = User::find($expense->added_by);
        $creatorIsAdmin = $creatorUser ? $this->isTourAdmin($creatorUser, $tour) : false;
        $currentUserIsAdmin = $this->isTourAdmin($user, $tour);
        $joinedMembersCount = $tour->tourMembers()->where('status', 'joined')->count();

        if ($isCreator && $joinedMembersCount > 1) {
            return response()->json([
                'message' => 'You cannot reject your own expense. It must be reviewed by another tour member or admin.',
            ], 403);
        }

        if (! $creatorIsAdmin && ! $currentUserIsAdmin) {
            return response()->json([
                'message' => 'Only a Tour Admin can reject this expense.',
            ], 403);
        }

        if ($expense->status === 'rejected') {
            return response()->json([
                'message' => 'This expense is already rejected.',
            ], 422);
        }

        $previousStatus = $expense->status;
        $newStatus = in_array($previousStatus, ['delete_requested', 'edit_requested']) ? 'approved' : 'rejected';

        $expense->update([
            'status' => $newStatus,
            'proposed_changes' => null,
        ]);

        // Notify creator
        if ($expense->added_by !== $user->id) {
            $creator = User::find($expense->added_by);
            $creator?->notify(new TourExpenseNotification(
                $tour,
                $expense,
                $user,
                'expense_rejected'
            ));
        }

        $expense->load([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        $message = match ($previousStatus) {
            'delete_requested' => 'Expense deletion request was rejected. The expense remains approved.',
            'edit_requested' => 'Expense edit request was rejected. The expense remains approved.',
            default => 'Expense has been rejected.',
        };

        return response()->json([
            'message' => $message,
            'expense' => $expense,
        ]);
    }

    /**
     * Request an edit for an expense.
     * Guard: User must be part of the expense (creator, payer, split debtor) or Tour Admin.
     */
    public function requestEdit(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->authorizeTourMember($user, $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        if (! $this->isUserInvolvedInExpense($user, $tour, $expense)) {
            return response()->json([
                'message' => 'You are not involved in this expense and cannot request edits.',
            ], 403);
        }

        if ($expense->status === 'edit_requested') {
            return response()->json([
                'message' => 'An edit request is already pending for this expense.',
            ], 422);
        }

        if ($expense->status === 'delete_requested') {
            return response()->json([
                'message' => 'Cannot request edits while a deletion request is pending.',
            ], 422);
        }

        if ($expense->status === 'rejected') {
            return response()->json([
                'message' => 'Cannot request edits on a rejected expense.',
            ], 422);
        }

        $expense->update([
            'status' => 'edit_requested',
        ]);

        // Notify Tour Admins and the creator (if different from current user)
        $notifyUserIds = $tour->tourMembers()
            ->where('status', 'joined')
            ->where('role', 'admin')
            ->where('user_id', '!=', $user->id)
            ->pluck('user_id');

        if ($expense->added_by !== $user->id) {
            $notifyUserIds->push($expense->added_by);
        }

        $recipients = User::whereIn('id', $notifyUserIds->unique())->get();
        foreach ($recipients as $recipient) {
            $recipient->notify(new TourExpenseNotification(
                $tour,
                $expense,
                $user,
                'expense_edit_requested'
            ));
        }

        $expense->load([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        return response()->json([
            'message' => 'Edit request submitted successfully and is awaiting review.',
            'expense' => $expense,
        ]);
    }

    /**
     * Request deletion for an expense.
     * Does NOT delete the database record; sets status to 'delete_requested'.
     * Guard: User must be part of the expense (creator, payer, split debtor) or Tour Admin.
     */
    public function destroy(Request $request, Tour $tour, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->authorizeTourMember($user, $tour);
        $this->assertExpenseBelongsToTour($tour, $expense);

        if (! $this->isUserInvolvedInExpense($user, $tour, $expense)) {
            return response()->json([
                'message' => 'You are not involved in this expense and cannot request its deletion.',
            ], 403);
        }

        if ($expense->status === 'delete_requested') {
            return response()->json([
                'message' => 'A deletion request is already pending for this expense.',
            ], 422);
        }

        // Do NOT delete the record from the database.
        // Update status to 'delete_requested' and update added_by to the requesting user.
        $expense->update([
            'status' => 'delete_requested',
            'added_by' => $user->id,
        ]);

        $isRequesterAdmin = $this->isTourAdmin($user, $tour);

        if (! $isRequesterAdmin) {
            // Notify Tour Admins that a member requested to delete an expense
            $adminUserIds = $tour->tourMembers()
                ->where('status', 'joined')
                ->where('role', 'admin')
                ->where('user_id', '!=', $user->id)
                ->pluck('user_id');

            $admins = User::whereIn('id', $adminUserIds)->get();
            foreach ($admins as $admin) {
                $admin->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $user,
                    'expense_delete_requested'
                ));
            }
        } else {
            // Requester is Admin: Notify other involved members (payers and splits), or other joined members
            $recipientIds = collect();

            foreach ($expense->payers as $payer) {
                if ($payer->user_id !== $user->id) {
                    $recipientIds->push($payer->user_id);
                }
            }

            foreach ($expense->splits as $split) {
                if ($split->user_id !== $user->id) {
                    $recipientIds->push($split->user_id);
                }
            }

            if ($recipientIds->isEmpty()) {
                $recipientIds = $tour->tourMembers()
                    ->where('status', 'joined')
                    ->where('user_id', '!=', $user->id)
                    ->pluck('user_id');
            }

            $recipients = User::whereIn('id', $recipientIds->unique())->get();
            foreach ($recipients as $recipient) {
                $recipient->notify(new TourExpenseNotification(
                    $tour,
                    $expense,
                    $user,
                    'expense_delete_requested',
                    "{$user->name} (Admin) requested deletion of the expense \"{$expense->title}\" in \"{$tour->name}\". Please review and approve."
                ));
            }
        }

        $expense->loadMissing([
            'addedBy:id,name,email,avatar,phone',
            'payers.user:id,name,email,avatar,phone',
            'splits.user:id,name,email,avatar,phone',
        ]);

        return response()->json([
            'message' => 'Expense deletion has been requested and is awaiting review.',
            'expense' => $expense,
        ]);
    }
}

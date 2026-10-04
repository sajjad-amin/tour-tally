<?php

namespace App\Notifications;

use App\Models\Expense;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TourExpenseNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tour $tour,
        public Expense $expense,
        public User $actor,
        public string $actionType = 'expense_created',
        public ?string $customMessage = null
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $amountFormatted = number_format((float) $this->expense->amount, 2);

        $title = match ($this->actionType) {
            'expense_approved' => 'Expense Approved',
            'expense_rejected' => 'Expense Rejected',
            'expense_delete_requested' => 'Expense Deletion Requested',
            'expense_edit_requested' => 'Expense Edit Requested',
            'expense_updated' => 'Expense Updated',
            default => 'New Expense Submitted',
        };

        $defaultMessage = match ($this->actionType) {
            'expense_approved' => "Expense of \${$amountFormatted} for {$this->expense->category} in \"{$this->tour->name}\" was approved by {$this->actor->name}.",
            'expense_rejected' => "Expense of \${$amountFormatted} for {$this->expense->category} in \"{$this->tour->name}\" was rejected by {$this->actor->name}.",
            'expense_delete_requested' => "{$this->actor->name} requested to delete an expense of \${$amountFormatted} ({$this->expense->category}) in \"{$this->tour->name}\".",
            'expense_edit_requested' => "{$this->actor->name} requested edits on the expense of \${$amountFormatted} ({$this->expense->category}) in \"{$this->tour->name}\".",
            'expense_updated' => "{$this->actor->name} updated the expense of \${$amountFormatted} ({$this->expense->category}) in \"{$this->tour->name}\" and it is pending approval.",
            default => "{$this->actor->name} logged a new expense of \${$amountFormatted} ({$this->expense->category}) in \"{$this->tour->name}\".",
        };

        return [
            'type' => $this->actionType,
            'title' => $title,
            'message' => $this->customMessage ?: $defaultMessage,
            'tour_id' => $this->tour->id,
            'tour_name' => $this->tour->name,
            'expense_id' => $this->expense->id,
            'amount' => (string) $this->expense->amount,
            'category' => $this->expense->category,
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
            'action_url' => "/tours/{$this->tour->id}/expenses",
        ];
    }
}

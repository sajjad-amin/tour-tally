<?php

namespace App\Notifications;

use App\Models\Tour;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TourInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tour $tour,
        public User $inviter
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
        return [
            'type' => 'tour_invitation',
            'title' => 'Tour Invitation',
            'message' => "{$this->inviter->name} invited you to join \"{$this->tour->name}\".",
            'tour_id' => $this->tour->id,
            'tour_name' => $this->tour->name,
            'destination' => $this->tour->destination,
            'inviter_id' => $this->inviter->id,
            'inviter_name' => $this->inviter->name,
            'action_url' => "/tours/{$this->tour->id}",
        ];
    }
}

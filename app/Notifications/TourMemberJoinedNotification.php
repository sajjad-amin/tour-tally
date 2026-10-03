<?php

namespace App\Notifications;

use App\Models\Tour;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TourMemberJoinedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tour $tour,
        public User $member
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
            'type' => 'tour_member_joined',
            'title' => 'New Member Joined',
            'message' => "{$this->member->name} has joined the \"{$this->tour->name}\" tour.",
            'tour_id' => $this->tour->id,
            'tour_name' => $this->tour->name,
            'member_id' => $this->member->id,
            'member_name' => $this->member->name,
            'action_url' => "/tours/{$this->tour->id}/members",
        ];
    }
}

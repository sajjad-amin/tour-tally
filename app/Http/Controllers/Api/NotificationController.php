<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * Format a database notification for JSON response.
     */
    protected function formatNotification(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->data['type'] ?? 'general',
            'title' => $notification->data['title'] ?? 'Notification',
            'message' => $notification->data['message'] ?? '',
            'tour_id' => $notification->data['tour_id'] ?? null,
            'tour_name' => $notification->data['tour_name'] ?? null,
            'action_url' => $notification->data['action_url'] ?? null,
            'data' => $notification->data,
            'read_at' => $notification->read_at,
            'is_read' => $notification->read(),
            'created_at' => $notification->created_at,
            'time_ago' => $notification->created_at->diffForHumans(),
        ];
    }

    /**
     * List paginated notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = (int) $request->query('per_page', 15);

        $paginator = $user->notifications()->paginate($perPage);

        return response()->json([
            'notifications' => collect($paginator->items())->map(fn ($n) => $this->formatNotification($n)),
            'unread_count' => $user->unreadNotifications()->count(),
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
     * List recent unread notifications for the header dropdown.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = (int) $request->query('limit', 10);

        $unreadNotifications = $user->unreadNotifications()
            ->take($limit)
            ->get();

        return response()->json([
            'notifications' => $unreadNotifications->map(fn ($n) => $this->formatNotification($n)),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if (! $notification) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read.',
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete all notifications for the user.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $request->user()->notifications()->delete();

        return response()->json([
            'message' => 'All notifications cleared.',
            'unread_count' => 0,
        ]);
    }
}

import { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api.js';
import { useAuth } from './AuthContext.jsx';
import toastr from '@/services/toastr.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Query unread notifications with 2-minute polling (120,000 ms)
  const {
    data,
    isLoading: isLoadingUnread,
    refetch: refetchUnread,
  } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      const res = await notificationsApi.getUnread(10);
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const unreadCount = data?.unread_count ?? 0;
  const unreadNotifications = data?.notifications ?? [];

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: (res) => {
      // Optimistically / immediately update query data
      queryClient.setQueryData(['unread-notifications'], (old) => {
        if (!old) return old;
        const newCount = res.data?.unread_count ?? Math.max(0, (old.unread_count || 1) - 1);
        return {
          ...old,
          unread_count: newCount,
          notifications: (old.notifications || []).filter((n) => n.id !== res.data?.id),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toastr.error('Failed to mark notification as read.');
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (res) => {
      queryClient.setQueryData(['unread-notifications'], (old) => ({
        ...old,
        unread_count: 0,
        notifications: [],
      }));
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastr.success(res.data?.message || 'All notifications marked as read.');
    },
    onError: () => {
      toastr.error('Failed to mark all notifications as read.');
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: (res) => {
      queryClient.setQueryData(['unread-notifications'], (old) => ({
        ...old,
        unread_count: 0,
        notifications: [],
      }));
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastr.success(res.data?.message || 'All notifications cleared.');
    },
    onError: () => {
      toastr.error('Failed to clear notifications.');
    },
  });

  // Global refresh method
  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      refetchUnread(),
    ]);
  }, [queryClient, refetchUnread]);

  const value = {
    unreadCount,
    unreadNotifications,
    isLoadingUnread,
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    isMarkingRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadAsync: markAllAsReadMutation.mutateAsync,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    clearAll: clearAllMutation.mutate,
    clearAllAsync: clearAllMutation.mutateAsync,
    isClearingAll: clearAllMutation.isPending,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;

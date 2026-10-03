import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toursApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState({ joined: 0, pending: 0 });
  const [activeTab, setActiveTab] = useState('joined'); // 'joined' | 'pending'

  // Update counts from API responses
  const updateCounts = useCallback((newCounts) => {
    if (newCounts && typeof newCounts.joined === 'number') {
      setCounts({
        joined: newCounts.joined,
        pending: newCounts.pending ?? 0,
      });
    }
  }, []);

  // Global refresh method for tours
  const refreshTours = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-tours'] }),
      queryClient.invalidateQueries({ queryKey: ['user-tours-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  }, [queryClient]);

  // Centralized delete tour method with immediate optimistic update
  const deleteTour = useCallback(
    async (tourId) => {
      try {
        const res = await toursApi.delete(tourId);

        // Immediately update counts in memory so it never shows stale counts
        setCounts((prev) => ({
          ...prev,
          joined: Math.max(0, prev.joined - 1),
        }));

        // Remove the deleted tour details from the query cache
        queryClient.removeQueries({ queryKey: ['tour-details', tourId] });

        // Invalidate and refetch user-tours
        await queryClient.invalidateQueries({ queryKey: ['user-tours'] });
        await queryClient.invalidateQueries({ queryKey: ['user-tours-summary'] });

        toastr.success(res.data?.message || 'Tour deleted successfully.');
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to delete tour.';
        toastr.error(msg);
        throw err;
      }
    },
    [queryClient]
  );

  // Centralized accept invite method with immediate optimistic update
  const acceptInvite = useCallback(
    async (tourId) => {
      try {
        const res = await toursApi.acceptInvite(tourId);

        // Immediately update counts in memory
        setCounts((prev) => ({
          joined: prev.joined + 1,
          pending: Math.max(0, prev.pending - 1),
        }));

        // Invalidate queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['tour-details', tourId] }),
          queryClient.invalidateQueries({ queryKey: ['user-tours'] }),
          queryClient.invalidateQueries({ queryKey: ['user-tours-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        ]);

        toastr.success(res.data?.message || 'You have joined the tour!');
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to accept invitation.';
        toastr.error(msg);
        throw err;
      }
    },
    [queryClient]
  );

  // Centralized decline invite method with immediate optimistic update
  const rejectInvite = useCallback(
    async (tourId) => {
      try {
        const res = await toursApi.rejectInvite(tourId);

        // Immediately update counts in memory
        setCounts((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
        }));

        // Invalidate queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['user-tours'] }),
          queryClient.invalidateQueries({ queryKey: ['user-tours-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        ]);

        toastr.info(res.data?.message || 'Invitation declined.');
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to decline invitation.';
        toastr.error(msg);
        throw err;
      }
    },
    [queryClient]
  );

  const value = {
    counts,
    updateCounts,
    activeTab,
    setActiveTab,
    refreshTours,
    deleteTour,
    acceptInvite,
    rejectInvite,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export default TourContext;

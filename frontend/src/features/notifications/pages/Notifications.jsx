import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api.js';
import { useNotification } from '@/context/NotificationContext.jsx';
import PageHeader from '@/components/UI/PageHeader.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import NotificationCard from '../components/NotificationCard.jsx';
import ClearNotificationsModal from '../components/ClearNotificationsModal.jsx';

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isMarkingRead,
    isMarkingAllRead,
    isClearingAll,
    refreshNotifications,
  } = useNotification();

  const [page, setPage] = useState(1);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch paginated notifications with 2-minute polling
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { page }],
    queryFn: async () => {
      const res = await notificationsApi.getAll({ page, per_page: 10 });
      return res.data;
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const notifications = data?.notifications ?? [];
  const meta = data?.meta ?? { current_page: 1, last_page: 1, total: 0, from: 0, to: 0, per_page: 10 };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshNotifications(),
        refetch(),
      ]);
      toastr.info('Notifications refreshed.');
    } catch {
      toastr.error('Failed to refresh.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const targetUrl =
      notification.action_url ||
      (notification.tour_id ? `/tours/${notification.tour_id}` : null);
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearAll();
      setIsClearModalOpen(false);
      setPage(1);
    } catch {
      // toastr handled in context
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on tour invitations, explorer activity, and group itineraries."
      >
        <div className="d-flex flex-wrap align-items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm fw-semibold"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllRead}
            >
              <i className="bi bi-check2-all"></i>
              <span>{isMarkingAllRead ? 'Marking…' : 'Mark All as Read'}</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setIsClearModalOpen(true)}
              disabled={isClearingAll}
            >
              <i className="bi bi-trash3"></i>
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isFetching}
            title="Refresh notifications"
          >
            <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-animation' : ''}`}></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Prominent Action Toolbar & Status Bar */}
      <div className="card shadow-sm border-0 mb-4 bg-body">
        <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold small text-muted text-uppercase tracking-wider">Total:</span>
              <span className="badge bg-secondary-subtle text-secondary-emphasis border px-2 py-1">
                {meta.total}
              </span>
            </div>

            <div className="vr my-1 d-none d-sm-block"></div>

            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold small text-muted text-uppercase tracking-wider">Unread:</span>
              <span className={`badge ${unreadCount > 0 ? 'bg-danger text-white' : 'bg-success-subtle text-success border border-success-subtle'} px-2 py-1`}>
                {unreadCount}
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 ms-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold text-primary"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllRead}
              >
                <i className="bi bi-check2-circle me-1"></i>Mark all read
              </button>
            )}
            <small className="text-muted d-none d-md-inline ms-2">
              <i className="bi bi-arrow-repeat me-1"></i>Auto-refreshes every 2 min
            </small>
          </div>
        </div>
      </div>

      {/* Notifications List Content */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading notifications…</span>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center my-4">
          <div
            className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
          >
            <i className="bi bi-bell-slash"></i>
          </div>
          <h5 className="fw-bold mb-2">No Notifications</h5>
          <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '400px' }}>
            You don't have any notifications at the moment. When someone invites you to a tour or joins your trip, you'll see it here!
          </p>
        </div>
      ) : (
        <>
          <div className="notifications-list mb-4">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onCardClick={handleNotificationClick}
                onMarkAsRead={(id) => markAsRead(id)}
                isMarkingRead={isMarkingRead}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <nav aria-label="Notifications pagination" className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-2">
              <span className="small text-muted">
                Showing {meta.from || 0} to {meta.to || 0} of {meta.total} notifications
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(Math.max(page - 1, 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      type="button"
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= meta.last_page ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(Math.min(page + 1, meta.last_page))}
                    disabled={page >= meta.last_page}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Clear All Modal Confirmation (No native window.confirm) */}
      <ClearNotificationsModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmClear={handleConfirmClearAll}
        isClearing={isClearingAll}
      />
    </>
  );
}

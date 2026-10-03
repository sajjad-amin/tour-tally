import { useNavigate, NavLink } from 'react-router';
import { useNotification } from '@/context/NotificationContext.jsx';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const {
    unreadCount,
    unreadNotifications: notifications,
    isLoadingUnread: isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotification();

  const closeDropdown = () => {
    const dropdownToggle = document.getElementById('notificationDropdown');
    if (dropdownToggle && window.bootstrap?.Dropdown) {
      const bsDropdown = window.bootstrap.Dropdown.getInstance(dropdownToggle);
      if (bsDropdown) bsDropdown.hide();
    }
  };

  const handleNotificationClick = (notification) => {
    closeDropdown();
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const targetUrl =
      notification.action_url ||
      (notification.tour_id ? `/tours/${notification.tour_id}` : '/notifications');
    navigate(targetUrl);
  };

  const handleViewAllClick = (e) => {
    e.preventDefault();
    closeDropdown();
    navigate('/notifications');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'tour_member_joined':
        return <i className="bi bi-person-check-fill text-success"></i>;
      case 'tour_invitation':
        return <i className="bi bi-envelope-open-fill text-warning"></i>;
      default:
        return <i className="bi bi-bell-fill text-primary"></i>;
    }
  };

  return (
    <li className="nav-item dropdown me-2">
      <button
        className="btn btn-link nav-link position-relative py-1 px-2 text-body border-0 shadow-none"
        type="button"
        id="notificationDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title="Notifications"
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
            style={{ fontSize: '0.65rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="visually-hidden">unread notifications</span>
          </span>
        )}
      </button>

      <div
        className="dropdown-menu dropdown-menu-end shadow border-0 p-0 rounded-3 overflow-hidden"
        aria-labelledby="notificationDropdown"
        style={{ width: '380px', minWidth: '360px', maxWidth: '95vw' }}
      >
        {/* Dropdown Header */}
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-body-tertiary">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0 fw-bold">Notifications</h6>
            {unreadCount > 0 && (
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none p-0 small fw-semibold text-primary text-nowrap"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllRead}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Scrollable Notifications List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-success" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 px-3 text-muted">
              <i className="bi bi-bell-slash fs-2 mb-2 d-block opacity-50"></i>
              <p className="small mb-0">No unread notifications</p>
              <small className="opacity-75">You're all caught up!</small>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="list-group-item list-group-item-action p-3 text-start border-bottom d-flex gap-3 align-items-start bg-body"
                  onClick={() => handleNotificationClick(n)}
                >
                  <div
                    className="rounded-circle bg-body-secondary p-2 d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                    style={{ width: '36px', height: '36px' }}
                  >
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-body small mb-1 text-break">
                      {n.title}
                    </div>
                    <p className="small text-muted mb-2 line-clamp-2" style={{ lineHeight: '1.35' }}>
                      {n.message}
                    </p>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-muted small d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-clock"></i>
                        <span>{n.time_ago}</span>
                      </span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.7rem' }}>
                        View
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="p-2 border-top text-center bg-body-tertiary">
          <NavLink
            to="/notifications"
            className="btn btn-sm btn-link text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
            onClick={handleViewAllClick}
          >
            <span>View All Notifications</span>
            <i className="bi bi-arrow-right"></i>
          </NavLink>
        </div>
      </div>
    </li>
  );
}

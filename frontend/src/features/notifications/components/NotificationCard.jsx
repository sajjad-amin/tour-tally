export default function NotificationCard({
  notification,
  onCardClick,
  onMarkAsRead,
  isMarkingRead,
}) {
  const isUnread = !notification.is_read;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'tour_member_joined':
        return <i className="bi bi-person-check-fill text-success fs-5"></i>;
      case 'tour_invitation':
        return <i className="bi bi-envelope-open-fill text-warning fs-5"></i>;
      default:
        return <i className="bi bi-bell-fill text-primary fs-5"></i>;
    }
  };

  const actionUrl =
    notification.action_url ||
    (notification.tour_id ? `/tours/${notification.tour_id}` : null);

  const formattedDate = notification.created_at
    ? new Date(notification.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleCardClick = (e) => {
    // If the click came from a specific button, let that button handle it
    if (e.target.closest('button')) {
      return;
    }
    if (onCardClick) {
      onCardClick(notification);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onCardClick) {
        onCardClick(notification);
      }
    }
  };

  return (
    <div
      className={`card shadow-sm border mb-3 ${
        isUnread
          ? 'border-primary border-opacity-50 bg-primary-subtle bg-opacity-10'
          : 'border-0 bg-body'
      }`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
      }}
      title="Click to view details"
    >
      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-start gap-3">
          {/* Icon */}
          <div
            className="rounded-circle bg-body-secondary p-2 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '44px', height: '44px' }}
          >
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
              <div className="d-flex align-items-center gap-2">
                <h6 className="fw-bold mb-0 text-body">{notification.title}</h6>
                {isUnread && (
                  <span
                    className="badge bg-danger-subtle text-danger border border-danger-subtle"
                    style={{ fontSize: '0.7rem' }}
                  >
                    New
                  </span>
                )}
              </div>
              <span className="text-muted small" title={formattedDate}>
                <i className="bi bi-clock me-1"></i>
                {notification.time_ago}
              </span>
            </div>

            <p className="text-muted small mb-3" style={{ whiteSpace: 'pre-line' }}>
              {notification.message}
            </p>

            {/* Actions Toolbar */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-top pt-2 mt-2">
              <div className="d-flex align-items-center gap-2">
                {actionUrl && (
                  <span className="btn btn-outline-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1">
                    <span>View Details</span>
                    <i className="bi bi-arrow-right"></i>
                  </span>
                )}
              </div>

              {isUnread && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  disabled={isMarkingRead}
                  title="Mark this notification as read"
                >
                  <i className="bi bi-check2"></i>
                  <span>Mark as read</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

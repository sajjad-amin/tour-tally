import { NavLink } from 'react-router';

export default function TourCard({
  tour,
  onAcceptInvite,
  onRejectInvite,
  isActionPending,
}) {
  const isInvited = tour.user_membership?.status === 'invited';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>;
      case 'completed':
        return <span className="badge bg-secondary-subtle text-secondary-emphasis border">Completed</span>;
      case 'planning':
      default:
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Planning</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const startDateFormatted = formatDate(tour.start_date);
  const endDateFormatted = formatDate(tour.end_date);

  return (
    <div className="card shadow-sm border-0 h-100 transition-hover">
      <div className="card-body p-4 d-flex flex-column">
        {/* Card Header with Destination & Status */}
        <div className="d-flex align-items-start justify-content-between mb-2">
          {tour.destination ? (
            <span className="badge bg-body-secondary text-body-secondary border d-inline-flex align-items-center gap-1">
              <i className="bi bi-geo-alt-fill text-danger"></i>
              <span className="text-truncate" style={{ maxWidth: '180px' }}>
                {tour.destination}
              </span>
            </span>
          ) : (
            <span className="badge bg-body-secondary text-muted border">
              <i className="bi bi-compass me-1"></i>Destination TBD
            </span>
          )}

          <div className="d-flex align-items-center gap-1">
            {tour.is_admin && (
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" title="You are Tour Admin">
                <i className="bi bi-shield-check me-1"></i>Admin
              </span>
            )}
            {getStatusBadge(tour.status)}
          </div>
        </div>

        {/* Tour Title */}
        <h5 className="card-title fw-bold mb-2">
          <NavLink
            to={`/tours/${tour.id}`}
            className="text-decoration-none text-reset text-primary-hover"
          >
            {tour.name}
          </NavLink>
        </h5>

        {/* Description snippet with fixed uniform height & 3-line clamp */}
        <p className="card-text text-muted small mb-3 tour-card-desc">
          {tour.description || 'No description provided for this tour.'}
        </p>

        {/* Date & Meta Info */}
        <div className="border-top pt-3 mt-auto small">
          <div className="d-flex align-items-center justify-content-between text-muted mb-2">
            <span className="d-flex align-items-center gap-1">
              <i className="bi bi-calendar3 text-primary"></i>
              {startDateFormatted ? (
                <span>
                  {startDateFormatted}
                  {endDateFormatted ? ` – ${endDateFormatted}` : ''}
                </span>
              ) : (
                <span>Dates pending</span>
              )}
            </span>

            <span className="d-flex align-items-center gap-1">
              <i className="bi bi-people text-success"></i>
              <span>{tour.members_count ?? 1} {tour.members_count === 1 ? 'member' : 'members'}</span>
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted">
            <span className="small text-truncate" style={{ maxWidth: '160px' }}>
              By: <strong>{tour.creator?.name || 'Organizer'}</strong>
            </span>

            {tour.pending_count > 0 && tour.is_admin && (
              <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                {tour.pending_count} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer with high contrast */}
      <div className="card-footer tour-card-footer p-3">
        {isInvited ? (
          <div className="d-flex flex-column gap-2">
            <NavLink
              to={`/tours/${tour.id}`}
              className="btn btn-warning btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 text-dark shadow-sm"
            >
              <i className="bi bi-envelope-open-fill"></i>
              <span>Review Details</span>
              <i className="bi bi-arrow-right"></i>
            </NavLink>
            {onAcceptInvite && onRejectInvite && (
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-success btn-sm flex-grow-1 fw-semibold d-flex align-items-center justify-content-center gap-1 shadow-sm"
                  onClick={() => onAcceptInvite(tour.id)}
                  disabled={isActionPending}
                >
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Accept</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm flex-grow-1 fw-semibold d-flex align-items-center justify-content-center gap-1"
                  onClick={() => onRejectInvite(tour)}
                  disabled={isActionPending}
                >
                  <i className="bi bi-x-circle"></i>
                  <span>Decline</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <NavLink
            to={`/tours/${tour.id}`}
            className="btn btn-outline-primary btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
          >
            <span>View Tour Details</span>
            <i className="bi bi-arrow-right"></i>
          </NavLink>
        )}
      </div>
    </div>
  );
}

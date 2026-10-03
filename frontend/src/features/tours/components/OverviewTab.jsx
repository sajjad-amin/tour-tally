export default function OverviewTab({
  tour,
  isAdmin,
  onOpenEditModal,
  onDeleteTour,
  onViewOrganizerProfile,
  isDeleting,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="py-3">
      {/* Quick Stats Grid */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div>
                <small className="text-muted d-block">Destination</small>
                <strong className="text-truncate d-block" style={{ maxWidth: '160px' }}>
                  {tour.destination || 'Unspecified'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="bi bi-calendar-event"></i>
              </div>
              <div>
                <small className="text-muted d-block">Start Date</small>
                <strong>{formatDate(tour.start_date)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="bi bi-people-fill"></i>
              </div>
              <div>
                <small className="text-muted d-block">Active Members</small>
                <strong>{tour.members_count} Explorer{tour.members_count === 1 ? '' : 's'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="bi bi-clock-history"></i>
              </div>
              <div>
                <small className="text-muted d-block">Tour Status</small>
                <strong className="text-capitalize">{tour.status}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Details Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-secondary-subtle py-3 d-flex align-items-center justify-content-between">
          <h6 className="mb-0 fw-bold">
            <i className="bi bi-info-circle me-2 text-primary"></i>About this Tour
          </h6>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={onOpenEditModal}
            >
              <i className="bi bi-pencil-square"></i>
              <span>Edit Details</span>
            </button>
          )}
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-8">
              <h6 className="fw-bold mb-2">Description &amp; Notes</h6>
              <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                {tour.description || 'No description or itinerary notes have been added yet.'}
              </p>
            </div>

            <div className="col-md-4 border-start-md">
              <h6 className="fw-bold mb-3">Tour Metadata</h6>
              <div className="list-group list-group-flush small">
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">Organizer:</span>
                  <span className="fw-medium">{tour.creator?.name || 'Explorer'}</span>
                </div>
                <div className="list-group-item d-flex flex-column gap-1 px-0">
                  <span className="text-muted">Organizer Contact:</span>
                  <span className="fw-medium text-break">{tour.creator?.email}</span>
                  {tour.creator && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm mt-2 d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={() => onViewOrganizerProfile(tour.creator)}
                    >
                      <i className="bi bi-person-badge"></i>
                      <span>View Organizer Profile</span>
                    </button>
                  )}
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Created:</span>
                  <span className="fw-medium">{formatDate(tour.created_at)}</span>
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Return Date:</span>
                  <span className="fw-medium">{formatDate(tour.end_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Danger Zone */}
      {isAdmin && (
        <div className="card shadow-sm border border-danger-subtle">
          <div className="card-header bg-danger-subtle text-danger-emphasis py-3">
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-exclamation-triangle-fill me-2 text-danger"></i>Tour Management Danger Zone
            </h6>
          </div>
          <div className="card-body p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <h6 className="fw-bold mb-1 text-danger">Delete This Tour</h6>
              <p className="text-muted small mb-0">
                Permanently delete this tour, its member rosters, and all associated trip records. This action cannot be reversed.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3 py-2 fw-semibold text-nowrap"
              onClick={onDeleteTour}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Deleting…
                </>
              ) : (
                <>
                  <i className="bi bi-trash3 me-1"></i>Delete Tour
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

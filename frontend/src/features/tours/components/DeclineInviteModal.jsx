export default function DeclineInviteModal({
  isOpen,
  tour,
  onClose,
  onConfirmDecline,
  isDeclining,
}) {
  if (!isOpen || !tour) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-x-circle text-danger"></i>
              Decline Tour Invitation
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isDeclining}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            <p className="text-muted small mb-0">
              Are you sure you want to decline the invitation to join tour <strong>"{tour.name}"</strong>?
              This invitation will be removed from your dashboard.
            </p>
          </div>

          <div className="modal-footer border-top">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={isDeclining}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3 fw-semibold"
              onClick={() => onConfirmDecline(tour.id)}
              disabled={isDeclining}
            >
              {isDeclining ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Declining…
                </>
              ) : (
                'Decline Invitation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

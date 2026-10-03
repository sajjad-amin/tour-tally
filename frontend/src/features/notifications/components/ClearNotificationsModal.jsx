export default function ClearNotificationsModal({
  isOpen,
  onClose,
  onConfirmClear,
  isClearing,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom bg-danger-subtle text-danger-emphasis">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-trash3-fill text-danger"></i>
              Clear All Notifications
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isClearing}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            <p className="text-muted small mb-3">
              Are you sure you want to permanently clear all your notifications?
            </p>

            <div className="alert alert-warning-subtle border border-warning-subtle py-2 px-3 small mb-0">
              <i className="bi bi-exclamation-triangle me-1 text-warning-emphasis"></i>
              This will remove all notification records from your history. This action cannot be reversed.
            </div>
          </div>

          <div className="modal-footer border-top">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={isClearing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3 fw-semibold"
              onClick={onConfirmClear}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Clearing…
                </>
              ) : (
                'Clear All'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

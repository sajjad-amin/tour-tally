import { useState, useEffect } from 'react';

export default function DeleteTourModal({
  isOpen,
  tour,
  onClose,
  onConfirmDelete,
  isDeleting,
}) {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen || !tour) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'DELETE' || confirmationInput.trim().toUpperCase() === 'CONFIRM DELETE';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    onConfirmDelete();
  };

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
              <i className="bi bi-exclamation-triangle-fill text-danger"></i>
              Delete Tour
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <p className="text-muted small mb-3">
                Are you sure you want to permanently delete tour <strong>"{tour.name}"</strong>?
                All associated explorer memberships, itinerary notes, and tour records will be erased.
              </p>

              <div className="alert alert-warning-subtle border border-warning-subtle py-2 px-3 small mb-3">
                <i className="bi bi-shield-exclamation me-1 text-warning-emphasis"></i>
                This action is irreversible. To confirm deletion, type <strong>DELETE</strong> in the box below:
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold" htmlFor="deleteTourConfirmInput">
                  Type <strong>DELETE</strong>:
                </label>
                <input
                  type="text"
                  id="deleteTourConfirmInput"
                  className="form-control"
                  placeholder="DELETE"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  disabled={isDeleting}
                />
              </div>
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger btn-sm px-3 fw-semibold"
                disabled={!isConfirmed || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Deleting Tour…
                  </>
                ) : (
                  'Permanently Delete Tour'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

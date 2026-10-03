import { useState, useEffect } from 'react';

export default function DeleteUserModal({
  isOpen,
  user,
  onClose,
  onConfirmDelete,
  isDeleting,
  error,
}) {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'CONFIRM DELETE';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    onConfirmDelete(user, confirmationInput.trim());
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
              Confirm User Deletion
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
              {error && (
                <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                  {error}
                </div>
              )}

              <p className="text-muted small mb-3">
                You are about to permanently delete user account{' '}
                <strong>{user.name}</strong> (<code>{user.email}</code>).
                All associated access tokens, role permissions, and tour memberships will be permanently deleted.
              </p>

              <div className="alert alert-warning-subtle border border-warning-subtle py-2 px-3 small mb-3">
                <i className="bi bi-shield-exclamation me-1 text-warning-emphasis"></i>
                This action is irreversible. To proceed, type <strong>CONFIRM DELETE</strong> in the field below.
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold" htmlFor="adminDeleteConfirmInput">
                  Type <strong>CONFIRM DELETE</strong>:
                </label>
                <input
                  type="text"
                  id="adminDeleteConfirmInput"
                  className="form-control"
                  placeholder="CONFIRM DELETE"
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
                    Deleting User…
                  </>
                ) : (
                  'Permanently Delete User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

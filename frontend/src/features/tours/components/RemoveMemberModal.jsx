import { useState, useEffect } from 'react';

export default function RemoveMemberModal({
  isOpen,
  member,
  tour,
  onClose,
  onConfirmRemove,
  isRemoving,
}) {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const firstName = member.name ? member.name.trim().split(' ')[0] : '';
  const trimmedInput = confirmationInput.trim().toUpperCase();

  const isConfirmed =
    trimmedInput === 'REMOVE' ||
    (firstName && trimmedInput === firstName.toUpperCase());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed || isRemoving) return;
    onConfirmRemove(member);
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
              <i className="bi bi-person-x-fill text-danger"></i>
              Remove Member from Tour
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isRemoving}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <p className="text-muted small mb-3">
                Are you sure you want to remove <strong>{member.name}</strong> (<code>{member.email}</code>) from tour{' '}
                <strong>"{tour?.name}"</strong>?
              </p>

              <div className="alert alert-warning-subtle border border-warning-subtle py-2 px-3 small mb-3">
                <i className="bi bi-exclamation-triangle me-1 text-warning-emphasis"></i>
                This will remove them from the tour roster and revoke their access to view this tour and its upcoming expenses.
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold" htmlFor="removeMemberConfirmInput">
                  To confirm, type <strong>REMOVE</strong> or <strong>{firstName}</strong>:
                </label>
                <input
                  type="text"
                  id="removeMemberConfirmInput"
                  className="form-control"
                  placeholder={`Type REMOVE or ${firstName}`}
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  disabled={isRemoving}
                />
              </div>
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger btn-sm px-3 fw-semibold"
                disabled={!isConfirmed || isRemoving}
              >
                {isRemoving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Removing…
                  </>
                ) : (
                  'Remove Member'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


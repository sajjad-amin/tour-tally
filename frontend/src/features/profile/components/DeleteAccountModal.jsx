import { useState, useEffect } from 'react';

export default function DeleteAccountModal({
  isOpen,
  onClose,
  user,
  authUser,
  isAdminEdit,
  hasPassword,
  onConfirmDelete,
  isDeleting,
  error,
}) {
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [adminConfirmationText, setAdminConfirmationText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDeleteConfirmPassword('');
      setDeleteConfirmEmail('');
      setAdminConfirmationText('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isAdminDeleteValid =
    adminConfirmationText.trim().toUpperCase() === 'CONFIRM DELETE';

  const isSelfDeleteValid = hasPassword
    ? deleteConfirmPassword.trim().length > 0
    : deleteConfirmEmail.trim().toLowerCase() === (user?.email || '').toLowerCase();

  const isSubmitDisabled =
    isDeleting ||
    (isAdminEdit
      ? user?.id === authUser?.id || !isAdminDeleteValid
      : !isSelfDeleteValid);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    if (isAdminEdit) {
      onConfirmDelete({ confirmation: adminConfirmationText.trim() });
    } else {
      onConfirmDelete(
        hasPassword
          ? { password: deleteConfirmPassword }
          : { email_confirmation: deleteConfirmEmail.trim() }
      );
    }
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
              {isAdminEdit ? 'Confirm User Deletion' : 'Confirm Account Deletion'}
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

              {isAdminEdit ? (
                <>
                  <p className="text-muted small mb-3">
                    Are you sure you want to permanently delete user{' '}
                    <strong>{user?.name}</strong> (<code>{user?.email}</code>)?
                    All personal tokens, roles, and tour memberships associated with this profile will be permanently removed.
                  </p>

                  <div className="alert alert-warning-subtle border border-warning-subtle py-2 px-3 small mb-3">
                    <i className="bi bi-shield-exclamation me-1 text-warning-emphasis"></i>
                    To confirm deletion, please type <strong>CONFIRM DELETE</strong> in the field below.
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold" htmlFor="admin-delete-confirm">
                      Type <strong>CONFIRM DELETE</strong>:
                    </label>
                    <input
                      type="text"
                      id="admin-delete-confirm"
                      className="form-control"
                      placeholder="CONFIRM DELETE"
                      value={adminConfirmationText}
                      onChange={(e) => setAdminConfirmationText(e.target.value)}
                      autoComplete="off"
                      autoFocus
                      disabled={isDeleting}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted small mb-3">
                    Are you absolutely sure you want to delete your TourTally account (
                    <strong>{user?.email}</strong>)?
                    All personal tokens and tour memberships associated with your profile will be removed.
                  </p>

                  {hasPassword ? (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold" htmlFor="delete-account-password">
                        Enter your account password to confirm:
                      </label>
                      <input
                        type="password"
                        id="delete-account-password"
                        className="form-control"
                        placeholder="Enter your password"
                        value={deleteConfirmPassword}
                        onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        disabled={isDeleting}
                      />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="alert alert-warning py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-google text-danger flex-shrink-0 fs-5"></i>
                        <div>
                          This account was registered with Google without a password. To confirm deletion, please enter your email address below.
                        </div>
                      </div>
                      <label className="form-label small fw-semibold" htmlFor="delete-account-email">
                        Confirm by entering your email (<strong>{user?.email}</strong>):
                      </label>
                      <input
                        type="email"
                        id="delete-account-email"
                        className="form-control"
                        placeholder="Enter your email to confirm"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        autoComplete="off"
                        autoFocus
                        disabled={isDeleting}
                      />
                    </div>
                  )}
                </>
              )}
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
                disabled={isSubmitDisabled}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Deleting…
                  </>
                ) : isAdminEdit ? (
                  'Permanently Delete User'
                ) : (
                  'Permanently Delete Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePasswordForm({
  hasPassword,
  isAdminEdit,
  currentPassword,
  setCurrentPassword,
  password,
  setPassword,
  passwordConfirmation,
  setPasswordConfirmation,
  onSubmit,
  isSaving,
  error,
}) {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-secondary-subtle py-3">
        <h6 className="mb-0 fw-bold">
          <i className="bi bi-shield-lock me-2 text-warning"></i>
          {isAdminEdit
            ? 'Set or Reset User Password'
            : hasPassword
            ? 'Security & Password'
            : 'Set Account Password'}
        </h6>
      </div>
      <div className="card-body p-4">
        {isAdminEdit ? (
          <div
            className="alert alert-info py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2"
            role="alert"
          >
            <i className="bi bi-info-circle-fill fs-5 text-info"></i>
            <div>
              As a Server Admin, you can set a new password directly for this user. Current password is not required.
            </div>
          </div>
        ) : !hasPassword && (
          <div
            className="alert alert-info py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2"
            role="alert"
          >
            <i className="bi bi-info-circle-fill fs-5 text-info"></i>
            <div>
              You registered with Google and haven't created a password yet. Set a password below to enable signing in with email and password.
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {!isAdminEdit && hasPassword && (
            <div className="mb-3">
              <label className="form-label small fw-semibold" htmlFor="current-password">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="new-password">
                {isAdminEdit ? 'New Password' : hasPassword ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                id="new-password"
                className="form-control"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="new-password-confirmation">
                {isAdminEdit
                  ? 'Confirm New Password'
                  : hasPassword
                  ? 'Confirm New Password'
                  : 'Confirm Password'}
              </label>
              <input
                type="password"
                id="new-password-confirmation"
                className="form-control"
                placeholder="Confirm password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="text-end">
            <button
              type="submit"
              className="btn btn-outline-primary px-4 py-2 fw-semibold"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  {isAdminEdit
                    ? 'Updating Password…'
                    : hasPassword
                    ? 'Updating Password…'
                    : 'Setting Password…'}
                </>
              ) : isAdminEdit ? (
                'Save New Password'
              ) : hasPassword ? (
                'Change Password'
              ) : (
                'Set Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

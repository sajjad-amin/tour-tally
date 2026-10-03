export default function ServerPoliciesCard({
  isRegistrationOpen,
  isSettingsLoading,
  onToggleRegistration,
  isToggling,
}) {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-secondary-subtle py-3 d-flex align-items-center justify-content-between">
        <h6 className="mb-0 fw-bold">
          <i className="bi bi-shield-check me-2 text-primary"></i>Server Access Policies
        </h6>
        <span
          className={`badge ${
            isRegistrationOpen
              ? 'bg-success-subtle text-success border border-success-subtle'
              : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
          }`}
        >
          {isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
        </span>
      </div>
      <div className="card-body">
        <div className="row align-items-center">
          <div className="col-md-8 mb-3 mb-md-0">
            <h6 className="fw-bold mb-1">Open User Registration</h6>
            <p className="text-muted small mb-0">
              When enabled, visitors can self-register via the <code>/register</code> page. When disabled, only a Server Admin can manually provision new user accounts.
            </p>
          </div>
          <div className="col-md-4 text-md-end">
            <div className="form-check form-switch d-inline-flex align-items-center gap-2">
              <input
                className="form-check-input fs-5"
                type="checkbox"
                role="switch"
                id="registrationToggleSwitch"
                checked={isRegistrationOpen}
                onChange={onToggleRegistration}
                disabled={isToggling || isSettingsLoading}
                style={{ cursor: 'pointer' }}
              />
              <label
                className="form-check-label fw-semibold small"
                htmlFor="registrationToggleSwitch"
                style={{ cursor: 'pointer' }}
              >
                {isToggling ? 'Updating…' : isRegistrationOpen ? 'Enabled' : 'Disabled'}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

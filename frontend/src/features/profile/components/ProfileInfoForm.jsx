export default function ProfileInfoForm({
  name,
  setName,
  email,
  setEmail,
  role,
  setRole,
  phone,
  setPhone,
  whatsappLink,
  setWhatsappLink,
  messengerLink,
  setMessengerLink,
  emailVerified,
  setEmailVerified,
  isAdminEdit,
  onSubmit,
  isSaving,
  error,
}) {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-secondary-subtle py-3">
        <h6 className="mb-0 fw-bold">
          <i className="bi bi-person-lines-fill me-2 text-primary"></i>
          {isAdminEdit ? 'User Profile & System Role' : 'Personal Information'}
        </h6>
      </div>
      <div className="card-body p-4">
        {error && (
          <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-name">
                Full Name
              </label>
              <input
                type="text"
                id="profile-name"
                className="form-control"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-email">
                Email Address
              </label>
              <input
                type="email"
                id="profile-email"
                className={`form-control ${!isAdminEdit ? 'bg-body-tertiary' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!isAdminEdit}
                readOnly={!isAdminEdit}
              />
            </div>
          </div>

          {isAdminEdit && (
            <div className="row g-3 mb-3 align-items-center">
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="profile-role">
                  Role Assignment
                </label>
                <select
                  id="profile-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="User">Explorer (User)</option>
                  <option value="Server Admin">Server Admin</option>
                </select>
              </div>
              <div className="col-md-6 pt-md-4">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="emailVerifiedSwitch"
                    checked={emailVerified}
                    onChange={(e) => setEmailVerified(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label
                    className="form-check-label small fw-semibold ms-1"
                    htmlFor="emailVerifiedSwitch"
                    style={{ cursor: 'pointer' }}
                  >
                    Email Verified Status ({emailVerified ? 'Verified' : 'Unverified'})
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-phone">
                <i className="bi bi-telephone me-1 text-success"></i>Phone Number
              </label>
              <input
                type="tel"
                id="profile-phone"
                className="form-control"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-whatsapp">
                <i className="bi bi-whatsapp me-1 text-success"></i>WhatsApp Link
              </label>
              <input
                type="text"
                id="profile-whatsapp"
                className="form-control"
                placeholder="Enter WhatsApp link"
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold" htmlFor="profile-messenger">
              <i className="bi bi-messenger me-1 text-primary"></i>Messenger Link
            </label>
            <input
              type="text"
              id="profile-messenger"
              className="form-control"
              placeholder="Enter Messenger link"
              value={messengerLink}
              onChange={(e) => setMessengerLink(e.target.value)}
            />
          </div>

          <div className="text-end">
            <button
              type="submit"
              className="btn btn-success px-4 py-2 fw-semibold shadow-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

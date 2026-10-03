export default function ProfileOverviewCard({
  user,
  phone,
  whatsappLink,
  messengerLink,
}) {
  const isServerAdmin =
    user?.role === 'admin' ||
    user?.role === 'Server Admin' ||
    user?.roles?.includes('Server Admin');

  return (
    <div className="col-12 col-lg-4">
      {/* Profile Overview Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body text-center p-4">
          <div
            className="rounded-circle bg-success-subtle text-success fw-bold d-inline-flex align-items-center justify-content-center shadow-sm mb-3"
            style={{ width: '80px', height: '80px', fontSize: '2rem' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <h5 className="fw-bold mb-1">{user?.name}</h5>
          <p className="text-muted small mb-2">{user?.email}</p>

          <div className="d-flex justify-content-center gap-2 mb-3">
            <span className="badge bg-secondary-subtle text-secondary-emphasis border">
              {isServerAdmin ? 'Server Admin' : 'Explorer (User)'}
            </span>
            {user?.email_verified_at ? (
              <span className="badge bg-success-subtle text-success">
                <i className="bi bi-check-circle-fill me-1"></i>Verified
              </span>
            ) : (
              <span className="badge bg-warning-subtle text-warning-emphasis">
                Unverified
              </span>
            )}
          </div>

          <hr className="my-3 opacity-25" />

          <div className="text-start small">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted">Account ID:</span>
              <span
                className="font-monospace text-truncate"
                style={{ maxWidth: '160px' }}
                title={user?.id}
              >
                {user?.id}
              </span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span className="text-muted">Member Since:</span>
              <span className="fw-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Contact Links Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-secondary-subtle py-3">
          <h6 className="mb-0 fw-bold">
            <i className="bi bi-link-45deg me-2 text-primary"></i>Connected Links
          </h6>
        </div>
        <div className="card-body p-3">
          <div className="list-group list-group-flush small">
            <div className="list-group-item d-flex justify-content-between align-items-center px-0">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-telephone text-success"></i>
                <span>Phone</span>
              </div>
              <span className="text-muted text-truncate" style={{ maxWidth: '160px' }}>
                {phone || 'Not set'}
              </span>
            </div>
            <div className="list-group-item d-flex justify-content-between align-items-center px-0">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-whatsapp text-success"></i>
                <span>WhatsApp</span>
              </div>
              <span className="text-muted text-truncate" style={{ maxWidth: '160px' }}>
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    View link
                  </a>
                ) : (
                  'Not set'
                )}
              </span>
            </div>
            <div className="list-group-item d-flex justify-content-between align-items-center px-0">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-messenger text-primary"></i>
                <span>Messenger</span>
              </div>
              <span className="text-muted text-truncate" style={{ maxWidth: '160px' }}>
                {messengerLink ? (
                  <a
                    href={messengerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    View link
                  </a>
                ) : (
                  'Not set'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

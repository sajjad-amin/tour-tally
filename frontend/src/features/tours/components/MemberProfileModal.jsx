export default function MemberProfileModal({
  isOpen,
  onClose,
  user,
}) {
  if (!isOpen || !user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isOrganizer = user.is_creator || user.role === 'creator';
  const isAdmin = user.role === 'admin' || user.is_admin;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          {/* Header Banner */}
          <div className="modal-header border-bottom bg-body-tertiary px-4 py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-person-badge text-primary"></i>
              <span>Explorer Profile</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            {/* User Overview Profile Card */}
            <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="rounded-circle border border-2 border-primary-subtle shadow-sm object-fit-cover"
                  style={{ width: '64px', height: '64px' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}
                >
                  {getInitials(user.name)}
                </div>
              )}

              <div className="flex-grow-1">
                <h5 className="fw-bold mb-1 text-break">{user.name}</h5>
                <div className="d-flex flex-wrap gap-1 align-items-center">
                  {isOrganizer && (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      <i className="bi bi-star-fill me-1"></i>Tour Organizer
                    </span>
                  )}
                  {isAdmin && !isOrganizer && (
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                      <i className="bi bi-shield-check me-1"></i>Tour Admin
                    </span>
                  )}
                  {user.status === 'joined' && (
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      <i className="bi bi-check-circle-fill me-1"></i>Active Member
                    </span>
                  )}
                  {user.status === 'invited' && (
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                      <i className="bi bi-hourglass-split me-1"></i>Invitation Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Contact Details List */}
            <div className="list-group list-group-flush">
              {/* Full Email Address */}
              <div className="list-group-item px-0 py-2 border-0 d-flex flex-column gap-1">
                <span className="text-muted small fw-semibold text-uppercase">
                  <i className="bi bi-envelope me-1 text-primary"></i>Email Address
                </span>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <a
                    href={`mailto:${user.email}`}
                    className="text-decoration-none fw-medium text-break"
                  >
                    {user.email || 'Not provided'}
                  </a>
                  {user.email && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-0 px-2"
                      title="Copy email"
                      onClick={() => {
                        navigator.clipboard?.writeText(user.email);
                      }}
                    >
                      <i className="bi bi-clipboard"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="list-group-item px-0 py-2 border-0 d-flex flex-column gap-1">
                <span className="text-muted small fw-semibold text-uppercase">
                  <i className="bi bi-telephone me-1 text-success"></i>Phone Number
                </span>
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    className="text-decoration-none fw-medium"
                  >
                    {user.phone}
                  </a>
                ) : (
                  <span className="text-muted fst-italic small">Not provided</span>
                )}
              </div>

              {/* WhatsApp Link */}
              <div className="list-group-item px-0 py-2 border-0 d-flex flex-column gap-1">
                <span className="text-muted small fw-semibold text-uppercase">
                  <i className="bi bi-whatsapp me-1 text-success"></i>WhatsApp Direct Link
                </span>
                {user.whatsapp_link ? (
                  <div>
                    <a
                      href={user.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-2 mt-1"
                    >
                      <i className="bi bi-whatsapp"></i>
                      <span>Open WhatsApp Chat</span>
                      <i className="bi bi-box-arrow-up-right small"></i>
                    </a>
                  </div>
                ) : (
                  <span className="text-muted fst-italic small">No WhatsApp link provided</span>
                )}
              </div>

              {/* Messenger Link */}
              <div className="list-group-item px-0 py-2 border-0 d-flex flex-column gap-1">
                <span className="text-muted small fw-semibold text-uppercase">
                  <i className="bi bi-messenger me-1 text-primary"></i>Messenger Direct Link
                </span>
                {user.messenger_link ? (
                  <div>
                    <a
                      href={user.messenger_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 mt-1"
                    >
                      <i className="bi bi-messenger"></i>
                      <span>Open Messenger Chat</span>
                      <i className="bi bi-box-arrow-up-right small"></i>
                    </a>
                  </div>
                ) : (
                  <span className="text-muted fst-italic small">No Messenger link provided</span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer border-top bg-body-tertiary">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

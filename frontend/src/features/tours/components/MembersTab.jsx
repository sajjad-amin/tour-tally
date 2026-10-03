export default function MembersTab({
  tour,
  currentUser,
  isAdmin,
  onOpenInviteModal,
  onRemoveMember,
  onAcceptInvite,
  onRejectInvite,
  onViewProfile,
  isActionPending,
}) {
  const isInvited = tour.user_membership?.status === 'invited';

  return (
    <div className="py-3">
      {/* Pending Invitation Alert Banner */}
      {isInvited && (
        <div className="alert alert-warning border border-warning shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-envelope-exclamation-fill fs-3 text-warning-emphasis"></i>
            <div>
              <h6 className="fw-bold mb-0">You have been invited to this tour!</h6>
              <small className="text-muted">
                Accept this invitation to join the roster and split expenses with other explorers.
              </small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-sm px-3 fw-semibold d-flex align-items-center gap-1 shadow-sm"
              onClick={() => onAcceptInvite(tour.id)}
              disabled={isActionPending}
            >
              <i className="bi bi-check-circle-fill"></i>
              <span>Accept Invite</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 fw-semibold d-flex align-items-center gap-1"
              onClick={() => onRejectInvite(tour.id)}
              disabled={isActionPending}
            >
              <i className="bi bi-x-circle"></i>
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Members Header & Table Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-secondary-subtle py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-people me-2 text-primary"></i>Tour Explorers &amp; Members
            </h6>
            <span className="badge bg-secondary-subtle text-secondary-emphasis border">
              {tour.members?.length ?? 0} total
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={onOpenInviteModal}
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>Invite Explorer</span>
            </button>
          )}
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="border-bottom">
                <tr className="text-body-secondary small text-uppercase">
                  <th className="ps-3">Explorer</th>
                  <th>Contact</th>
                  <th>Tour Role</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tour.members?.map((m) => {
                  const isCreator = m.id === tour.created_by;
                  const isSelf = m.id === currentUser?.id;
                  const isMemberAdmin = m.role === 'admin';
                  const isJoined = m.status === 'joined';

                  return (
                    <tr key={m.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '38px', height: '38px' }}
                          >
                            {m.name?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <div className="fw-bold d-flex align-items-center gap-1">
                              <span>{m.name}</span>
                              {isSelf && (
                                <span className="badge bg-secondary-subtle text-secondary small py-0">You</span>
                              )}
                              {isCreator && (
                                <span className="badge bg-primary-subtle text-primary small py-0" title="Tour Creator">
                                  Creator
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                                onClick={() => onViewProfile(m)}
                                title="View Profile"
                              >
                                <i className="bi bi-box-arrow-up-right small text-primary"></i>
                              </button>
                            </div>
                            <small className="text-muted">{m.email}</small>
                          </div>
                        </div>
                      </td>

                      <td className="small text-muted">{m.phone || '—'}</td>

                      <td>
                        {isMemberAdmin ? (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            <i className="bi bi-shield-check me-1"></i>Tour Admin
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                            Member
                          </span>
                        )}
                      </td>

                      <td>
                        {isJoined ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            <i className="bi bi-check-circle-fill me-1"></i>Active Member
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            <i className="bi bi-hourglass-split me-1"></i>Invited
                          </span>
                        )}
                      </td>

                      <td className="small text-muted">
                        {m.joined_at
                          ? new Date(m.joined_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td className="text-end pe-3">
                        <div className="d-inline-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                            onClick={() => onViewProfile(m)}
                            title="View Explorer Profile"
                          >
                            <i className="bi bi-person-lines-fill"></i>
                            <span className="d-none d-md-inline">View Profile</span>
                          </button>

                          {isSelf && !isJoined ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => onAcceptInvite(tour.id)}
                                disabled={isActionPending}
                                title="Accept invitation"
                              >
                                <i className="bi bi-check-lg me-1"></i>Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onRejectInvite(tour.id)}
                                disabled={isActionPending}
                                title="Decline invitation"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          ) : (isAdmin && !isSelf && !isCreator) ? (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => onRemoveMember(m)}
                              disabled={isActionPending}
                              title="Remove member from tour"
                            >
                              <i className="bi bi-person-x me-1"></i>
                              <span className="d-none d-md-inline">Remove</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

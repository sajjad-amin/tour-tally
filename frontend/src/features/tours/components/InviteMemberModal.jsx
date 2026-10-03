import { useState, useEffect } from 'react';
import { toursApi } from '@/services/api.js';

export default function InviteMemberModal({
  isOpen,
  tourId,
  onClose,
  onInvite,
  isPending,
  error,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [foundUser, setFoundUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('member');
      setIsSearching(false);
      setSearchError(null);
      setFoundUser(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = email.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);

    try {
      const res = await toursApi.searchMember(tourId, query);
      if (res.data?.user) {
        setFoundUser(res.data.user);
      } else {
        setSearchError('User with this email not found.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'User with this email not found.';
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvitation = () => {
    if (!foundUser) return;
    onInvite({
      email: foundUser.email,
      role,
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-person-plus-fill text-success"></i>
              <span>Invite Member to Tour</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isPending || isSearching}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                {error}
              </div>
            )}

            <div className="alert alert-info-subtle border border-info-subtle py-2 px-3 small mb-3">
              <i className="bi bi-info-circle me-1"></i>
              Search registered users by their exact email address to send an invitation.
            </div>

            {/* Email Search Form */}
            <form onSubmit={handleSearch} className="mb-3">
              <label className="form-label small fw-semibold" htmlFor="inviteUserEmail">
                Registered Email Address <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type="email"
                  id="inviteUserEmail"
                  className="form-control"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSearchError(null);
                    setFoundUser(null);
                  }}
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary px-3 d-flex align-items-center gap-1 fw-semibold"
                  disabled={isSearching || !email.trim()}
                >
                  {isSearching ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Searching…</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-search"></i>
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Search Warning if user not found */}
            {searchError && (
              <div
                className="alert alert-warning border border-warning d-flex align-items-center gap-2 py-2 px-3 small my-3"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0 fs-5"></i>
                <span className="fw-medium">{searchError}</span>
              </div>
            )}

            {/* Found User Card */}
            {foundUser && (
              <div className="card border shadow-sm p-3 my-3 bg-body-tertiary rounded-3">
                <div className="d-flex align-items-center gap-3">
                  {foundUser.avatar ? (
                    <img
                      src={foundUser.avatar}
                      alt={foundUser.name}
                      className="rounded-circle border object-fit-cover flex-shrink-0"
                      style={{ width: '48px', height: '48px' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{ width: '48px', height: '48px' }}
                    >
                      {getInitials(foundUser.name)}
                    </div>
                  )}
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="fw-bold text-truncate">{foundUser.name}</div>
                    <div className="text-muted small text-truncate">{foundUser.email}</div>
                    {foundUser.phone && (
                      <div className="text-muted small text-truncate">
                        <i className="bi bi-telephone me-1"></i>
                        {foundUser.phone}
                      </div>
                    )}
                  </div>
                </div>

                {foundUser.is_already_member ? (
                  <div className="alert alert-danger py-2 px-3 small mt-3 mb-0">
                    <i className="bi bi-x-circle me-1"></i>
                    This user is already an active member of this tour.
                  </div>
                ) : foundUser.is_already_invited ? (
                  <div className="alert alert-warning py-2 px-3 small mt-3 mb-0">
                    <i className="bi bi-hourglass-split me-1"></i>
                    This user already has a pending invitation for this tour.
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-top">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold" htmlFor="inviteFoundUserRole">
                        Assign Tour Role
                      </label>
                      <select
                        id="inviteFoundUserRole"
                        className="form-select form-select-sm"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isPending}
                      >
                        <option value="member">Member (Can view tour, log &amp; split expenses)</option>
                        <option value="admin">Tour Admin (Can edit tour, invite &amp; manage members)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm py-2"
                      onClick={handleSendInvitation}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          <span>Sending Invitation…</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send-fill"></i>
                          <span>Send Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer border-top bg-body-tertiary">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={isPending || isSearching}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

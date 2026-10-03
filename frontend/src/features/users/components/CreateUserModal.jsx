import { useState, useEffect } from 'react';

export default function CreateUserModal({
  isOpen,
  onClose,
  onCreate,
  isPending,
  formError,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setRole('User');
      setPhone('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      name,
      email,
      role,
      phone: phone || null,
      password: password || undefined,
    });
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-person-plus-fill me-2 text-success"></i>
              Create New User
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isPending}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {formError && (
                <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                  {formError}
                </div>
              )}

              <div className="alert alert-info-subtle border border-info-subtle py-2 px-3 small mb-3">
                <i className="bi bi-info-circle me-1"></i>
                Users manually created by Server Admin automatically bypass email verification. Full options (WhatsApp, Messenger links, password reset) can be administered on their profile page.
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="createUserName">
                  Full Name
                </label>
                <input
                  type="text"
                  id="createUserName"
                  className="form-control"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="createUserEmail">
                  Email Address
                </label>
                <input
                  type="email"
                  id="createUserEmail"
                  className="form-control"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="createUserRole">
                    Role Assignment
                  </label>
                  <select
                    id="createUserRole"
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="User">Explorer (User)</option>
                    <option value="Server Admin">Server Admin</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="createUserPhone">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    id="createUserPhone"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" htmlFor="createUserPassword">
                  Initial Password
                </label>
                <input
                  type="password"
                  id="createUserPassword"
                  className="form-control"
                  placeholder="Enter initial password (minimum 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success btn-sm px-4 fw-semibold"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Creating…
                  </>
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

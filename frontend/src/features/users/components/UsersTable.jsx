import { NavLink } from 'react-router';

export default function UsersTable({
  users = [],
  isLoading = false,
  currentUser,
  sortBy,
  sortDir,
  onSort,
  onDeleteClick,
}) {
  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <i className="bi bi-arrow-down-up text-muted opacity-50 ms-1 small"></i>;
    }
    return sortDir === 'asc' ? (
      <i className="bi bi-sort-alpha-down text-success ms-1"></i>
    ) : (
      <i className="bi bi-sort-alpha-down-alt text-success ms-1"></i>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading users…</span>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-people fs-1 d-block mb-2"></i>
        <p className="mb-0">No users found matching your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="border-bottom">
          <tr className="text-body-secondary small text-uppercase">
            <th
              className="ps-3"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => onSort('name')}
            >
              <div className="d-flex align-items-center">
                <span>User</span>
                {getSortIcon('name')}
              </div>
            </th>
            <th
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => onSort('role')}
            >
              <div className="d-flex align-items-center">
                <span>Role</span>
                {getSortIcon('role')}
              </div>
            </th>
            <th>Phone</th>
            <th>Verification</th>
            <th
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => onSort('created_at')}
            >
              <div className="d-flex align-items-center">
                <span>Created At</span>
                {getSortIcon('created_at')}
              </div>
            </th>
            <th className="text-end pe-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isServerAdmin =
              u.roles?.includes('Server Admin') || u.role === 'admin';
            const isSelf = u.id === currentUser?.id;

            return (
              <tr key={u.id}>
                <td className="ps-3">
                  <NavLink
                    to={`/admin/users/${u.id}`}
                    className="d-flex align-items-center gap-2 text-decoration-none text-reset"
                    title="Open user profile settings"
                  >
                    <div
                      className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '38px', height: '38px' }}
                    >
                      {u.name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <div className="fw-bold d-flex align-items-center gap-1 text-primary-hover">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="badge bg-secondary-subtle text-secondary small py-0">You</span>
                        )}
                      </div>
                      <small className="text-muted">{u.email}</small>
                    </div>
                  </NavLink>
                </td>
                <td>
                  {isServerAdmin ? (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      <i className="bi bi-shield-lock-fill me-1"></i>Server Admin
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                      Explorer
                    </span>
                  )}
                </td>
                <td className="small text-muted">{u.phone || '—'}</td>
                <td>
                  {u.email_verified_at ? (
                    <span className="badge bg-success-subtle text-success">
                      <i className="bi bi-check-circle-fill me-1"></i>Verified
                    </span>
                  ) : (
                    <span className="badge bg-warning-subtle text-warning-emphasis">
                      Unverified
                    </span>
                  )}
                </td>
                <td className="small text-muted">
                  {new Date(u.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="text-end pe-3">
                  <div className="btn-group btn-group-sm">
                    <NavLink
                      to={`/admin/users/${u.id}`}
                      className="btn btn-outline-primary"
                      title="Edit user profile & options"
                    >
                      <i className="bi bi-pencil me-1"></i>Edit
                    </NavLink>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => onDeleteClick(u)}
                      disabled={isSelf}
                      title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

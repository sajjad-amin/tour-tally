export default function ProfileDangerZone({
  user,
  currentUser,
  isAdminEdit,
  onOpenDeleteModal,
}) {
  const isSelfInAdminMode = isAdminEdit && user?.id === currentUser?.id;

  return (
    <div className="card shadow-sm border border-danger-subtle">
      <div className="card-header bg-danger-subtle text-danger-emphasis py-3 d-flex align-items-center">
        <h6 className="mb-0 fw-bold">
          <i className="bi bi-exclamation-octagon-fill me-2 text-danger"></i>Danger Zone
        </h6>
      </div>
      <div className="card-body p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h6 className="fw-bold mb-1 text-danger">
              {isAdminEdit ? 'Delete User Record' : 'Delete User Account'}
            </h6>
            <p className="text-muted small mb-0">
              {isAdminEdit
                ? `Permanently remove user "${user?.name}" (${user?.email}) and detach all roles and memberships.`
                : 'Permanently delete your profile and revoke all active sessions. This action cannot be undone.'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-danger text-nowrap fw-semibold px-3 py-2"
            onClick={onOpenDeleteModal}
            disabled={isSelfInAdminMode}
          >
            <i className="bi bi-trash3 me-1"></i>
            {isAdminEdit ? 'Delete User' : 'Delete Account'}
          </button>
        </div>
        {isSelfInAdminMode && (
          <div className="small text-muted mt-2">
            <i className="bi bi-info-circle me-1"></i>You cannot delete your own logged-in account from the admin user management panel.
          </div>
        )}
      </div>
    </div>
  );
}

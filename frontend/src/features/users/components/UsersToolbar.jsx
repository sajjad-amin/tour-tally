export default function UsersToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  onRefresh,
}) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      {/* Role Filter */}
      <select
        className="form-select form-select-sm"
        style={{ width: '140px' }}
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value)}
        aria-label="Filter users by role"
      >
        <option value="">All Roles</option>
        <option value="Server Admin">Server Admin</option>
        <option value="User">Explorer (User)</option>
      </select>

      {/* Search Input */}
      <div className="input-group input-group-sm" style={{ width: '240px' }}>
        <span className="input-group-text bg-body border-end-0">
          <i className="bi bi-search text-muted"></i>
        </span>
        <input
          type="text"
          className="form-control border-start-0"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="btn btn-outline-secondary border-start-0"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>

      {/* Refresh */}
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={onRefresh}
        title="Refresh users list"
      >
        <i className="bi bi-arrow-clockwise"></i>
      </button>
    </div>
  );
}

export default function UsersPagination({
  meta,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}) {
  const total = meta?.total ?? 0;
  const lastPage = meta?.last_page ?? 1;

  if (total === 0) return null;

  const from = meta?.from ?? ((page - 1) * perPage + 1);
  const to = meta?.to ?? Math.min(page * perPage, total);

  const renderPaginationButtons = () => {
    if (lastPage <= 1) return null;

    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(lastPage, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <button
          key={1}
          className={`btn btn-sm ${page === 1 ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => onPageChange(1)}
        >
          1
        </button>
      );
      if (startPage > 2) {
        items.push(
          <span key="ellipsis-1" className="px-1 text-muted small align-self-center">
            …
          </span>
        );
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      items.push(
        <button
          key={p}
          className={`btn btn-sm ${page === p ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      );
    }

    if (endPage < lastPage) {
      if (endPage < lastPage - 1) {
        items.push(
          <span key="ellipsis-2" className="px-1 text-muted small align-self-center">
            …
          </span>
        );
      }
      items.push(
        <button
          key={lastPage}
          className={`btn btn-sm ${page === lastPage ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => onPageChange(lastPage)}
        >
          {lastPage}
        </button>
      );
    }

    return items;
  };

  return (
    <div className="card-footer bg-body border-top py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div className="d-flex align-items-center gap-3">
        <span className="small text-muted">
          Showing <strong>{from}</strong> to <strong>{to}</strong> of <strong>{total}</strong> users
        </span>

        <div className="d-flex align-items-center gap-1 small text-muted">
          <span>Per page:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '75px' }}
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="d-flex align-items-center gap-1">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            title="Previous page"
          >
            <i className="bi bi-chevron-left me-1"></i>Prev
          </button>

          <div className="d-flex align-items-center gap-1 mx-1">
            {renderPaginationButtons()}
          </div>

          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => onPageChange(Math.min(lastPage, page + 1))}
            disabled={page >= lastPage}
            title="Next page"
          >
            Next<i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      )}
    </div>
  );
}

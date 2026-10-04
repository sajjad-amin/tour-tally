export default function ExpenseDetailsModal({
  isOpen,
  onClose,
  expense,
  onAction, // (actionType, expense) => void
  canApproveOrReject,
  canEdit,
  onEdit,
  canDelete,
  onDelete,
  canRequestEdit,
  canRequestDelete,
}) {
  if (!isOpen || !expense) return null;

  const totalAmount = parseFloat(expense.amount) || 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">Approved</span>;
      case 'pending':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Pending Review</span>;
      case 'edit_requested':
        return <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">Edit Requested</span>;
      case 'delete_requested':
        return <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Delete Requested</span>;
      case 'rejected':
        return <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">Rejected</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary-emphasis">{status}</span>;
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content bg-body text-body border-0 shadow">
          {/* Header */}
          <div className="modal-header border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-primary-subtle text-primary p-2 d-inline-flex">
                <i className="bi bi-receipt fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">Expense Ledger Entry</h5>
                <small className="text-body-secondary">Detailed view and split allocations.</small>
              </div>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Edit Requested Warning Banner */}
            {expense.status === 'edit_requested' && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between p-3 mb-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square fs-5 text-warning-emphasis"></i>
                  <div>
                    <strong className="d-block text-warning-emphasis">Edit Request Pending Approval</strong>
                    <span className="small text-body-secondary">
                      This expense has proposed revisions submitted for review. The details below reflect the current active ledger state.
                    </span>
                  </div>
                </div>
                {canApproveOrReject && (
                  <button
                    type="button"
                    className="btn btn-warning btn-sm fw-semibold text-dark flex-shrink-0 ms-3"
                    onClick={() => {
                      onClose();
                      onAction('approve', expense);
                    }}
                  >
                    Review Diff
                  </button>
                )}
              </div>
            )}

            {/* Top Stat Summary */}
            <div className="card bg-body-tertiary border-0 p-3 mb-4">
              <div className="row g-3 align-items-center">
                <div className="col-sm-6 col-md-3">
                  <small className="text-body-secondary d-block">Total Amount</small>
                  <h4 className="fw-bold text-success mb-0">{totalAmount.toFixed(2)}</h4>
                </div>
                <div className="col-sm-6 col-md-3">
                  <small className="text-body-secondary d-block">Status</small>
                  <div className="mt-1">{getStatusBadge(expense.status)}</div>
                </div>
                <div className="col-sm-6 col-md-3">
                  <small className="text-body-secondary d-block">Category</small>
                  <span className="fw-semibold">{expense.category}</span>
                </div>
                <div className="col-sm-6 col-md-3">
                  <small className="text-body-secondary d-block">Expense Date</small>
                  <span className="fw-semibold">{expense.date}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {/* Title & Notes */}
            <div className="mb-4">
              <h6 className="fw-bold small text-uppercase text-body-secondary mb-2">Expense Title</h6>
              <div className="p-3 bg-body border rounded mb-2">
                <p className="mb-0 fw-semibold fs-6 text-break">{expense.title || expense.description}</p>
              </div>
              {expense.notes && (
                <div className="p-3 bg-body-tertiary border rounded">
                  <small className="text-body-secondary fw-semibold d-block mb-1">Notes / Voucher Details:</small>
                  <p className="mb-0 small text-break">{expense.notes}</p>
                </div>
              )}
            </div>

            {/* People Info: Payers & Logged By */}
            <div className="row g-3 mb-4">
              <div className="col-md-7">
                <div className="card h-100 border p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="text-body-secondary fw-semibold">
                      <i className="bi bi-wallet2 me-1 text-success"></i>Paid By ({expense.payers?.length || 1})
                    </small>
                  </div>
                  {expense.payers && expense.payers.length > 0 ? (
                    <div className="list-group list-group-flush border rounded">
                      {expense.payers.map((payer) => {
                        const paidAmt = parseFloat(payer.amount) || 0;
                        const pct = totalAmount > 0 ? ((paidAmt / totalAmount) * 100).toFixed(1) : 0;
                        return (
                          <div key={payer.id} className="list-group-item d-flex align-items-center justify-content-between py-2 px-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}
                              >
                                {payer.user?.name?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              <div>
                                <span className="fw-medium small d-block">{payer.user?.name || 'Explorer'}</span>
                                <small className="text-body-secondary">{payer.user?.email}</small>
                              </div>
                            </div>
                            <div className="text-end">
                              <span className="fw-bold text-success small d-block">{paidAmt.toFixed(2)}</span>
                              <small className="text-body-secondary">{pct}%</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center"
                        style={{ width: '38px', height: '38px' }}
                      >
                        {expense.paid_by?.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="fw-bold">{expense.paid_by?.name || 'Explorer'}</div>
                        <small className="text-body-secondary">{expense.paid_by?.email}</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-5">
                <div className="card h-100 border p-3">
                  <small className="text-body-secondary fw-semibold d-block mb-2">
                    <i className="bi bi-person-check me-1 text-primary"></i>Logged By (Author)
                  </small>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <div
                      className="rounded-circle bg-secondary-subtle text-secondary fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: '38px', height: '38px' }}
                    >
                      {expense.added_by?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="fw-bold">{expense.added_by?.name || 'Explorer'}</div>
                      <small className="text-body-secondary">{expense.added_by?.email}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Splits Allocation Breakdown */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="fw-bold small text-uppercase text-body-secondary mb-0">
                  <i className="bi bi-pie-chart me-1 text-primary"></i>Split Allocations (
                  {expense.splits?.length || 0})
                </h6>
                <span className="small text-body-secondary">
                  Sum of splits: {totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="table-responsive border rounded">
                <table className="table table-hover align-middle mb-0">
                  <thead className="border-bottom bg-body-tertiary">
                    <tr className="small text-body-secondary text-uppercase">
                      <th className="ps-3">Explorer</th>
                      <th className="text-end">Share %</th>
                      <th className="text-end pe-3">Amount Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expense.splits || []).map((split) => {
                      const owed = parseFloat(split.amount_owed) || 0;
                      const percent = totalAmount > 0 ? ((owed / totalAmount) * 100).toFixed(1) : 0;

                      return (
                        <tr key={split.id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}
                              >
                                {split.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <span className="fw-medium small">{split.user?.name || 'Explorer'}</span>
                                <small className="text-body-secondary d-block">{split.user?.email}</small>
                              </div>
                            </div>
                          </td>
                          <td className="text-end small text-body-secondary">{percent}%</td>
                          <td className="text-end pe-3 fw-bold text-success">{owed.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer with conditional actions */}
          <div className="modal-footer border-top py-2 px-4 bg-body-tertiary d-flex justify-content-between">
            <div className="d-flex gap-2">
              {canApproveOrReject && (
                <>
                  <button
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-1 shadow-sm ${expense.status === 'edit_requested'
                        ? 'btn-warning text-dark fw-semibold'
                        : 'btn-success'
                      }`}
                    onClick={() => {
                      onClose();
                      onAction('approve', expense);
                    }}
                  >
                    <i className="bi bi-check-circle"></i>
                    <span>{expense.status === 'edit_requested' ? 'Review & Approve' : 'Approve'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                    onClick={() => {
                      onClose();
                      onAction('reject', expense);
                    }}
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reject</span>
                  </button>
                </>
              )}

              {(canEdit ?? canRequestEdit) && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
                  onClick={() => {
                    onClose();
                    if (onEdit) {
                      onEdit(expense);
                    } else if (onAction) {
                      onAction('request-edit', expense);
                    }
                  }}
                >
                  <i className="bi bi-pencil-fill"></i>
                  <span>Edit</span>
                </button>
              )}

              {(canDelete ?? canRequestDelete) && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={() => {
                    onClose();
                    if (onDelete) {
                      onDelete(expense);
                    } else if (onAction) {
                      onAction('delete', expense);
                    }
                  }}
                >
                  <i className="bi bi-trash-fill"></i>
                  <span>Delete</span>
                </button>
              )}
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function DeleteExpenseModal({
  isOpen,
  onClose,
  tourId,
  expense,
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await expenseApi.requestDelete(tourId, expense.id);
      return res.data;
    },
    onSuccess: (data) => {
      toastr.success(
        data?.message ||
          'Expense deletion has been requested and is awaiting review.'
      );
      queryClient.invalidateQueries({ queryKey: ['tour-expenses', tourId] });
      queryClient.invalidateQueries({ queryKey: ['tour-details', tourId] });
      queryClient.invalidateQueries({ queryKey: ['tour-settlements', tourId] });
      queryClient.invalidateQueries({ queryKey: ['tour-overview', tourId] });
      onClose();
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
        'Failed to request expense deletion.';
      toastr.error(message);
    },
  });

  if (!isOpen || !expense) return null;

  const totalAmount = parseFloat(expense.amount) || 0;
  const payerNames =
    expense.payers && expense.payers.length > 0
      ? expense.payers.map((p) => p.user?.name || 'Explorer').join(', ')
      : expense.paid_by?.name || 'Explorer';

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-body text-body border-0 shadow">
          {/* Header */}
          <div className="modal-header border-bottom py-3 bg-danger-subtle text-danger-emphasis">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-trash3-fill fs-5"></i>
              <h5 className="modal-title fw-bold mb-0">Request Expense Deletion</h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={deleteMutation.isPending}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <div className="alert alert-warning py-2 px-3 small d-flex align-items-start gap-2 mb-3">
              <i className="bi bi-shield-exclamation fs-5 flex-shrink-0 text-warning-emphasis"></i>
              <div>
                <strong>Accounting Guard:</strong> Under tour accounting rules, expenses cannot be silently removed.
                This action marks the record as <strong>Delete Requested</strong>. The other tour party (admin or members)
                must approve this deletion before the record is permanently erased from the ledger.
              </div>
            </div>

            <p className="mb-3 text-body">
              Are you sure you want to request deletion of this expense?
            </p>

            {/* Expense details summary card */}
            <div className="card bg-body-tertiary border p-3 small mb-2">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Expense Title:</span>
                <span className="fw-semibold text-truncate ms-2" style={{ maxWidth: '240px' }}>
                  {expense.title || expense.description || 'Expense Entry'}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Category:</span>
                <span className="badge bg-secondary-subtle text-secondary-emphasis">
                  {expense.category}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Total Amount:</span>
                <span className="fw-bold text-danger">{totalAmount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-body-secondary">Payer(s):</span>
                <span className="text-truncate ms-2" style={{ maxWidth: '240px' }}>
                  {payerNames}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-body-secondary">Date:</span>
                <span>{expense.date}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top py-2 px-4 bg-body-tertiary">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Requesting Deletion…</span>
                </>
              ) : (
                <>
                  <i className="bi bi-trash3-fill"></i>
                  <span>Confirm Deletion Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

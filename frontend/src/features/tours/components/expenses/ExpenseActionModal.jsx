import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

/**
 * Build comparison map between original and proposed payers.
 */
function buildPayersDiff(originalPayers = [], proposedPayers = []) {
  const map = new Map();

  originalPayers.forEach((p) => {
    const uid = p.user_id || p.user?.id;
    if (uid) {
      map.set(uid, {
        userId: uid,
        user: p.user,
        oldAmount: parseFloat(p.amount) || 0,
        newAmount: null,
      });
    }
  });

  proposedPayers.forEach((p) => {
    const uid = p.user_id || p.user?.id;
    if (uid) {
      const amt = parseFloat(p.amount) || 0;
      if (map.has(uid)) {
        map.get(uid).newAmount = amt;
        if (!map.get(uid).user && p.user) {
          map.get(uid).user = p.user;
        }
      } else {
        map.set(uid, {
          userId: uid,
          user: p.user,
          oldAmount: null,
          newAmount: amt,
        });
      }
    }
  });

  return Array.from(map.values()).map((item) => {
    const oldAmt = item.oldAmount ?? 0;
    const newAmt = item.newAmount ?? 0;
    const isAdded = item.oldAmount === null;
    const isRemoved = item.newAmount === null;
    const isChanged = isAdded || isRemoved || Math.abs(oldAmt - newAmt) > 0.001;

    return {
      ...item,
      isAdded,
      isRemoved,
      isChanged,
      diff: newAmt - oldAmt,
    };
  });
}

/**
 * Build comparison map between original and proposed splits.
 */
function buildSplitsDiff(originalSplits = [], proposedSplits = []) {
  const map = new Map();

  originalSplits.forEach((s) => {
    const uid = s.user_id || s.user?.id;
    if (uid) {
      map.set(uid, {
        userId: uid,
        user: s.user,
        oldAmount: parseFloat(s.amount_owed || s.amount) || 0,
        newAmount: null,
      });
    }
  });

  proposedSplits.forEach((s) => {
    const uid = s.user_id || s.user?.id;
    if (uid) {
      const amt = parseFloat(s.amount_owed || s.amount) || 0;
      if (map.has(uid)) {
        map.get(uid).newAmount = amt;
        if (!map.get(uid).user && s.user) {
          map.get(uid).user = s.user;
        }
      } else {
        map.set(uid, {
          userId: uid,
          user: s.user,
          oldAmount: null,
          newAmount: amt,
        });
      }
    }
  });

  return Array.from(map.values()).map((item) => {
    const oldAmt = item.oldAmount ?? 0;
    const newAmt = item.newAmount ?? 0;
    const isAdded = item.oldAmount === null;
    const isRemoved = item.newAmount === null;
    const isChanged = isAdded || isRemoved || Math.abs(oldAmt - newAmt) > 0.001;

    return {
      ...item,
      isAdded,
      isRemoved,
      isChanged,
      diff: newAmt - oldAmt,
    };
  });
}

export default function ExpenseActionModal({
  isOpen,
  onClose,
  tourId,
  expense,
  actionType, // 'approve' | 'reject' | 'request-edit' | 'delete'
}) {
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (actionType === 'approve') {
        const res = await expenseApi.approve(tourId, expense.id);
        return res.data;
      }
      if (actionType === 'reject') {
        const res = await expenseApi.reject(tourId, expense.id);
        return res.data;
      }
      if (actionType === 'request-edit') {
        const res = await expenseApi.requestEdit(tourId, expense.id);
        return res.data;
      }
      if (actionType === 'delete') {
        const res = await expenseApi.requestDelete(tourId, expense.id);
        return res.data;
      }
      throw new Error('Unknown action type');
    },
    onSuccess: (data) => {
      toastr.success(data?.message || 'Action completed successfully.');
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
        'Failed to process action.';
      toastr.error(message);
    },
  });

  // Dedicated reject mutation for use within Edit Review modal
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await expenseApi.reject(tourId, expense.id);
      return res.data;
    },
    onSuccess: (data) => {
      toastr.success(data?.message || 'Edit request rejected. Expense remains approved.');
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
        'Failed to reject edit request.';
      toastr.error(message);
    },
  });

  // Safe parse of proposed_changes
  const proposed = useMemo(() => {
    if (!expense?.proposed_changes) return null;
    if (typeof expense.proposed_changes === 'string') {
      try {
        return JSON.parse(expense.proposed_changes);
      } catch {
        return null;
      }
    }
    return expense.proposed_changes;
  }, [expense?.proposed_changes]);

  // Check if this is an Edit Review diff approval
  const isEditReview = actionType === 'approve' && expense?.status === 'edit_requested' && Boolean(proposed);

  // Payers & Splits diffs
  const payersDiff = useMemo(() => {
    if (!isEditReview || !proposed?.payers) return [];
    return buildPayersDiff(expense?.payers || [], proposed.payers);
  }, [isEditReview, expense?.payers, proposed?.payers]);

  const splitsDiff = useMemo(() => {
    if (!isEditReview || !proposed?.splits) return [];
    return buildSplitsDiff(expense?.splits || [], proposed.splits);
  }, [isEditReview, expense?.splits, proposed?.splits]);

  if (!isOpen || !expense) return null;

  const isDeletingPermanent = actionType === 'approve' && expense.status === 'delete_requested';

  // Scalar field values and change detection
  const oldTitle = expense.title || expense.description || '—';
  const newTitle = proposed?.title || proposed?.description || oldTitle;
  const isTitleChanged = isEditReview && oldTitle !== newTitle;

  const oldAmount = parseFloat(expense.amount) || 0;
  const newAmount = proposed?.amount !== undefined ? parseFloat(proposed.amount) || 0 : oldAmount;
  const isAmountChanged = isEditReview && Math.abs(oldAmount - newAmount) > 0.001;

  const oldCategory = expense.category || '—';
  const newCategory = proposed?.category || oldCategory;
  const isCategoryChanged = isEditReview && oldCategory !== newCategory;

  const oldDate = expense.date || '—';
  const newDate = proposed?.date || oldDate;
  const isDateChanged = isEditReview && oldDate !== newDate;

  const oldNotes = expense.notes || '';
  const newNotes = proposed?.notes || '';
  const isNotesChanged = isEditReview && oldNotes !== newNotes;

  const hasPayersChanged = payersDiff.some((p) => p.isChanged);
  const hasSplitsChanged = splitsDiff.some((s) => s.isChanged);

  // Default Action modal configuration
  let title = 'Confirm Action';
  let iconClass = 'bi-exclamation-circle text-primary';
  let confirmBtnClass = 'btn-primary';
  let confirmBtnText = 'Confirm';
  let descriptionText = '';

  if (isEditReview) {
    title = 'Review Edit Request';
    iconClass = 'bi-pencil-square text-warning-emphasis';
    confirmBtnClass = 'btn-success';
    confirmBtnText = 'Approve Changes';
  } else if (isDeletingPermanent) {
    title = 'Confirm Permanent Deletion';
    iconClass = 'bi-exclamation-triangle-fill text-danger';
    confirmBtnClass = 'btn-danger';
    confirmBtnText = 'Permanently Delete';
    descriptionText = `This expense is marked for deletion. Approving this request will PERMANENTLY delete this record of ${oldAmount.toFixed(2)} (${expense.category}) and its split allocations from the database.`;
  } else if (actionType === 'approve') {
    title = 'Approve Expense';
    iconClass = 'bi-check-circle-fill text-success';
    confirmBtnClass = 'btn-success';
    confirmBtnText = 'Approve Expense';
    descriptionText = `Are you sure you want to approve this expense of ${oldAmount.toFixed(2)} for "${oldTitle}"?`;
  } else if (actionType === 'reject') {
    title = 'Reject Expense';
    iconClass = 'bi-x-circle-fill text-danger';
    confirmBtnClass = 'btn-danger';
    confirmBtnText = 'Reject';
    if (expense.status === 'delete_requested') {
      descriptionText = `Reject the deletion request? The expense of ${oldAmount.toFixed(2)} will remain approved and active.`;
    } else if (expense.status === 'edit_requested') {
      descriptionText = `Reject the proposed edit request? The expense of ${oldAmount.toFixed(2)} will remain approved with its original figures.`;
    } else {
      descriptionText = `Are you sure you want to reject this expense entry of ${oldAmount.toFixed(2)}?`;
    }
  } else if (actionType === 'delete') {
    title = 'Request Expense Deletion';
    iconClass = 'bi-trash3-fill text-danger';
    confirmBtnClass = 'btn-danger';
    confirmBtnText = 'Request Deletion';
    descriptionText = `Request deletion of this expense of ${oldAmount.toFixed(2)}? Under strict accounting rules, this marks the record as "Delete Requested" awaiting review by a tour administrator.`;
  }

  const isPending = actionMutation.isPending || rejectMutation.isPending;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
    >
      <div className={`modal-dialog modal-dialog-centered ${isEditReview ? 'modal-lg modal-dialog-scrollable' : ''}`}>
        <div className="modal-content bg-body text-body border-0 shadow">
          {/* Header */}
          <div className={`modal-header border-bottom py-3 ${isEditReview ? 'bg-warning-subtle text-warning-emphasis' : ''}`}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${iconClass} fs-5`}></i>
              <div>
                <h5 className="modal-title fw-bold mb-0">{title}</h5>
                {isEditReview && (
                  <small className="text-body-secondary d-block">
                    Submitted by <strong>{expense.added_by?.name || 'Explorer'}</strong> • Comparing current vs proposed revisions
                  </small>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isPending}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {isEditReview ? (
              <div>
                {/* Information banner */}
                <div className="alert alert-info py-2 px-3 small d-flex align-items-start gap-2 mb-3">
                  <i className="bi bi-info-circle-fill fs-5 flex-shrink-0 text-info"></i>
                  <div>
                    <strong>Proposed Changes Review:</strong> The original data remains active on the ledger until approved.
                    Review the differences below. Old values are shown in <span className="text-danger text-decoration-line-through fw-semibold">red strike-through</span> and proposed values in <span className="text-success fw-bold">green bold</span>.
                  </div>
                </div>

                {/* General Fields Diff Table */}
                <h6 className="fw-bold small text-uppercase text-body-secondary mb-2">
                  <i className="bi bi-card-checklist me-1 text-primary"></i>Core Details Comparison
                </h6>
                <div className="table-responsive border rounded mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="border-bottom bg-body-secondary small text-uppercase text-body-secondary">
                      <tr className="bg-body-secondary">
                        <th className="bg-body-secondary ps-2" style={{ width: '22%' }}>Field</th>
                        <th className="bg-body-secondary" style={{ width: '39%' }}>Current Value</th>
                        <th className="bg-body-secondary" style={{ width: '39%' }}>Proposed Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Title */}
                      <tr
                        className={isTitleChanged ? 'bg-warning bg-opacity-10' : ''}
                        style={isTitleChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                      >
                        <td className="fw-semibold text-body-secondary small ps-2">Title</td>
                        <td>
                          {isTitleChanged ? (
                            <span className="text-danger text-decoration-line-through">{oldTitle}</span>
                          ) : (
                            <span>{oldTitle}</span>
                          )}
                        </td>
                        <td>
                          {isTitleChanged ? (
                            <span className="text-success fw-bold">{newTitle}</span>
                          ) : (
                            <span className="text-body-secondary small">Unchanged</span>
                          )}
                        </td>
                      </tr>

                      {/* Total Amount */}
                      <tr
                        className={isAmountChanged ? 'bg-warning bg-opacity-10' : ''}
                        style={isAmountChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                      >
                        <td className="fw-semibold text-body-secondary small ps-2">Total Amount</td>
                        <td>
                          {isAmountChanged ? (
                            <span className="text-danger text-decoration-line-through font-monospace">
                              {oldAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="font-monospace">{oldAmount.toFixed(2)}</span>
                          )}
                        </td>
                        <td>
                          {isAmountChanged ? (
                            <span className="text-success fw-bold font-monospace">
                              {newAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-body-secondary small">Unchanged</span>
                          )}
                        </td>
                      </tr>

                      {/* Category */}
                      <tr
                        className={isCategoryChanged ? 'bg-warning bg-opacity-10' : ''}
                        style={isCategoryChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                      >
                        <td className="fw-semibold text-body-secondary small ps-2">Category</td>
                        <td>
                          {isCategoryChanged ? (
                            <span className="text-danger text-decoration-line-through">{oldCategory}</span>
                          ) : (
                            <span>{oldCategory}</span>
                          )}
                        </td>
                        <td>
                          {isCategoryChanged ? (
                            <span className="text-success fw-bold">{newCategory}</span>
                          ) : (
                            <span className="text-body-secondary small">Unchanged</span>
                          )}
                        </td>
                      </tr>

                      {/* Date */}
                      <tr
                        className={isDateChanged ? 'bg-warning bg-opacity-10' : ''}
                        style={isDateChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                      >
                        <td className="fw-semibold text-body-secondary small ps-2">Date</td>
                        <td>
                          {isDateChanged ? (
                            <span className="text-danger text-decoration-line-through">{oldDate}</span>
                          ) : (
                            <span>{oldDate}</span>
                          )}
                        </td>
                        <td>
                          {isDateChanged ? (
                            <span className="text-success fw-bold">{newDate}</span>
                          ) : (
                            <span className="text-body-secondary small">Unchanged</span>
                          )}
                        </td>
                      </tr>

                      {/* Notes (if either old or new has notes) */}
                      {(oldNotes || newNotes) && (
                        <tr
                          className={isNotesChanged ? 'bg-warning bg-opacity-10' : ''}
                          style={isNotesChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                        >
                          <td className="fw-semibold text-body-secondary small ps-2">Notes</td>
                          <td>
                            {isNotesChanged ? (
                              <span className="text-danger text-decoration-line-through">{oldNotes || 'None'}</span>
                            ) : (
                              <span>{oldNotes || 'None'}</span>
                            )}
                          </td>
                          <td>
                            {isNotesChanged ? (
                              <span className="text-success fw-bold">{newNotes || 'None'}</span>
                            ) : (
                              <span className="text-body-secondary small">Unchanged</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payers Diff */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h6 className="fw-bold small text-uppercase text-body-secondary mb-0">
                      <i className="bi bi-wallet2 me-1 text-primary"></i>Payer Allocation Changes
                    </h6>
                    {hasPayersChanged ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis">Allocations Modified</span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">No Change</span>
                    )}
                  </div>
                  <div className="table-responsive border rounded">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="border-bottom bg-body-secondary small text-uppercase text-body-secondary">
                        <tr className="bg-body-secondary">
                          <th className="bg-body-secondary ps-2">Payer</th>
                          <th className="bg-body-secondary text-end">Current Paid</th>
                          <th className="bg-body-secondary text-end">Proposed Paid</th>
                          <th className="bg-body-secondary text-end pe-3">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payersDiff.map((p) => (
                          <tr
                            key={p.userId}
                            className={p.isChanged ? 'bg-warning bg-opacity-10' : ''}
                            style={p.isChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                          >
                            <td className="ps-2">
                              <span className="fw-medium small">{p.user?.name || 'Explorer'}</span>
                            </td>
                            <td className="text-end font-monospace small">
                              {p.oldAmount !== null ? (
                                p.isChanged ? (
                                  <span className="text-danger text-decoration-line-through">
                                    {p.oldAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span>{p.oldAmount.toFixed(2)}</span>
                                )
                              ) : (
                                <span className="text-body-secondary italic">None</span>
                              )}
                            </td>
                            <td className="text-end font-monospace small">
                              {p.newAmount !== null ? (
                                p.isChanged ? (
                                  <span className="text-success fw-bold">
                                    {p.newAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span>{p.newAmount.toFixed(2)}</span>
                                )
                              ) : (
                                <span className="text-danger">Removed</span>
                              )}
                            </td>
                            <td className="text-end pe-3 small">
                              {p.diff > 0.001 ? (
                                <span className="badge bg-success-subtle text-success">
                                  +{p.diff.toFixed(2)}
                                </span>
                              ) : p.diff < -0.001 ? (
                                <span className="badge bg-danger-subtle text-danger">
                                  -{Math.abs(p.diff).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-body-secondary">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Splits Diff */}
                <div className="mb-1">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h6 className="fw-bold small text-uppercase text-body-secondary mb-0">
                      <i className="bi bi-pie-chart me-1 text-primary"></i>Split Allocation Changes
                    </h6>
                    {hasSplitsChanged ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis">Splits Modified</span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">No Change</span>
                    )}
                  </div>
                  <div className="table-responsive border rounded">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="border-bottom bg-body-secondary small text-uppercase text-body-secondary">
                        <tr className="bg-body-secondary">
                          <th className="bg-body-secondary ps-2">Explorer</th>
                          <th className="bg-body-secondary text-end">Current Owed</th>
                          <th className="bg-body-secondary text-end">Proposed Owed</th>
                          <th className="bg-body-secondary text-end pe-3">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {splitsDiff.map((s) => (
                          <tr
                            key={s.userId}
                            className={s.isChanged ? 'bg-warning bg-opacity-10' : ''}
                            style={s.isChanged ? { '--bs-table-bg': 'rgba(var(--bs-warning-rgb), 0.08)' } : undefined}
                          >
                            <td className="ps-2">
                              <span className="fw-medium small">{s.user?.name || 'Explorer'}</span>
                            </td>
                            <td className="text-end font-monospace small">
                              {s.oldAmount !== null ? (
                                s.isChanged ? (
                                  <span className="text-danger text-decoration-line-through">
                                    {s.oldAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span>{s.oldAmount.toFixed(2)}</span>
                                )
                              ) : (
                                <span className="text-body-secondary italic">None</span>
                              )}
                            </td>
                            <td className="text-end font-monospace small">
                              {s.newAmount !== null ? (
                                s.isChanged ? (
                                  <span className="text-success fw-bold">
                                    {s.newAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span>{s.newAmount.toFixed(2)}</span>
                                )
                              ) : (
                                <span className="text-danger">Removed</span>
                              )}
                            </td>
                            <td className="text-end pe-3 small">
                              {s.diff > 0.001 ? (
                                <span className="badge bg-success-subtle text-success">
                                  +{s.diff.toFixed(2)}
                                </span>
                              ) : s.diff < -0.001 ? (
                                <span className="badge bg-danger-subtle text-danger">
                                  -{Math.abs(s.diff).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-body-secondary">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3">{descriptionText}</p>

                {/* Default Expense details summary card */}
                <div className="card bg-body-tertiary border p-3 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-body-secondary">Category:</span>
                    <span className="fw-semibold">{expense.category}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-body-secondary">Amount:</span>
                    <span className="fw-bold text-success">{oldAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-body-secondary">Paid By:</span>
                    <span>
                      {expense.payers && expense.payers.length > 0
                        ? expense.payers.map((p) => p.user?.name || 'Explorer').join(', ')
                        : expense.paid_by?.name || 'Explorer'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-body-secondary">Date:</span>
                    <span>{expense.date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer border-top py-2 px-4 bg-body-tertiary d-flex justify-content-between align-items-center">
            {isEditReview ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={() => rejectMutation.mutate()}
                  disabled={isPending}
                >
                  {rejectMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Rejecting…</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle"></i>
                      <span>Reject Request</span>
                    </>
                  )}
                </button>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={onClose}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm px-3 fw-semibold shadow-sm d-flex align-items-center gap-1"
                    onClick={() => actionMutation.mutate()}
                    disabled={isPending}
                  >
                    {actionMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Applying Changes…</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>Approve Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-3 fw-semibold shadow-sm d-flex align-items-center gap-1 ${confirmBtnClass}`}
                  onClick={() => actionMutation.mutate()}
                  disabled={isPending}
                >
                  {actionMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Processing…</span>
                    </>
                  ) : (
                    <span>{confirmBtnText}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

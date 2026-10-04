import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

/**
 * Distribute total amount in cents among checked members so that the sum
 * of split pennies matches the total cents exactly (handles 1-cent remainders).
 */
function calculateEqualSplits(totalAmount, checkedMemberIds) {
  const num = parseFloat(totalAmount);
  if (!num || num <= 0 || !checkedMemberIds.length) {
    return {};
  }

  const totalCents = Math.round(num * 100);
  const count = checkedMemberIds.length;
  const baseCents = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  const splits = {};
  checkedMemberIds.forEach((id) => {
    let cents = baseCents;
    if (remainder > 0) {
      cents += 1;
      remainder -= 1;
    }
    splits[id] = (cents / 100).toFixed(2);
  });

  return splits;
}

const CATEGORIES = ['Transport', 'Food', 'Hotel', 'Activity', 'Others'];

export default function AddExpenseModal({ isOpen, onClose, tour, currentUser, expenseToEdit = null }) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(expenseToEdit);

  // Active joined members of this tour
  const joinedMembers = useMemo(() => {
    return (tour?.members || []).filter((m) => m.status === 'joined');
  }, [tour?.members]);

  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Payer states: 'single' | 'multiple'
  const [payerMode, setPayerMode] = useState('single');
  const [singlePayerId, setSinglePayerId] = useState('');
  const [customPayers, setCustomPayers] = useState({}); // { [userId]: string }

  // Split states: 'equal' | 'custom'
  const [splitMode, setSplitMode] = useState('equal');
  const [checkedMemberIds, setCheckedMemberIds] = useState([]);
  const [customSplits, setCustomSplits] = useState({}); // { [userId]: string }

  // Reset or pre-populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        const editAmount = parseFloat(expenseToEdit.amount || 0).toFixed(2);
        setAmount(editAmount);
        setCategory(expenseToEdit.category || 'Food');
        setDate(expenseToEdit.date || new Date().toISOString().split('T')[0]);
        setTitle(expenseToEdit.title || expenseToEdit.description || '');
        setNotes(expenseToEdit.notes || '');

        // Pre-populate Payers
        if (expenseToEdit.payers && expenseToEdit.payers.length > 1) {
          setPayerMode('multiple');
          setSinglePayerId('');
          const payersObj = {};
          expenseToEdit.payers.forEach((p) => {
            const uid = p.user_id || p.user?.id;
            if (uid) {
              payersObj[uid] = (parseFloat(p.amount) || 0).toFixed(2);
            }
          });
          setCustomPayers(payersObj);
        } else if (expenseToEdit.payers && expenseToEdit.payers.length === 1) {
          setPayerMode('single');
          setSinglePayerId(expenseToEdit.payers[0].user_id || expenseToEdit.payers[0].user?.id || '');
          setCustomPayers({});
        } else {
          setPayerMode('single');
          setSinglePayerId(expenseToEdit.paid_by_id || expenseToEdit.paid_by?.id || '');
          setCustomPayers({});
        }

        // Pre-populate Splits
        const splitUserIds = (expenseToEdit.splits || [])
          .map((s) => s.user_id || s.user?.id)
          .filter(Boolean);
        const allIds = joinedMembers.map((m) => m.id);
        const targetMemberIds = splitUserIds.length > 0 ? splitUserIds : allIds;
        setCheckedMemberIds(targetMemberIds);

        const splitsObj = {};
        (expenseToEdit.splits || []).forEach((s) => {
          const uid = s.user_id || s.user?.id;
          if (uid) {
            splitsObj[uid] = (parseFloat(s.amount_owed || s.amount) || 0).toFixed(2);
          }
        });
        setCustomSplits(splitsObj);

        // Check if existing splits match equal calculation
        const expectedEqual = calculateEqualSplits(editAmount, targetMemberIds);
        let areSplitsEqual = targetMemberIds.length > 0;
        for (const mid of targetMemberIds) {
          if (splitsObj[mid] !== expectedEqual[mid]) {
            areSplitsEqual = false;
            break;
          }
        }
        setSplitMode(areSplitsEqual ? 'equal' : 'custom');
      } else {
        const defaultPayer =
          joinedMembers.find((m) => m.id === currentUser?.id)?.id || joinedMembers[0]?.id || '';
        const allIds = joinedMembers.map((m) => m.id);

        setAmount('');
        setCategory('Food');
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        setNotes('');
        setPayerMode('single');
        setSinglePayerId(defaultPayer);
        setCustomPayers({});
        setSplitMode('equal');
        setCheckedMemberIds(allIds);
        setCustomSplits({});
      }
    }
  }, [isOpen, expenseToEdit, joinedMembers, currentUser?.id]);

  // Live Total Bug Fix: When in custom split mode, automatically compute the sum of all custom split inputs
  // and dynamically update the main Total Amount state live
  useEffect(() => {
    if (splitMode === 'custom') {
      const sum = Object.values(customSplits).reduce((acc, val) => {
        const parsed = parseFloat(val);
        return acc + (isNaN(parsed) ? 0 : parsed);
      }, 0);
      const rounded = Math.round(sum * 100) / 100;
      setAmount(rounded > 0 ? rounded.toFixed(2) : '');
    }
  }, [customSplits, splitMode]);

  // Calculate current active splits
  const activeSplits = useMemo(() => {
    if (splitMode === 'equal') {
      return calculateEqualSplits(amount, checkedMemberIds);
    }
    return customSplits;
  }, [splitMode, amount, checkedMemberIds, customSplits]);

  // Calculate payers sum and validation
  const { payersSum, isPayersValid, payersDifference } = useMemo(() => {
    const total = parseFloat(amount) || 0;
    let sum = 0;

    if (payerMode === 'single') {
      sum = total > 0 && singlePayerId ? total : 0;
    } else {
      sum = Object.values(customPayers).reduce((acc, val) => {
        const parsed = parseFloat(val);
        return acc + (isNaN(parsed) ? 0 : parsed);
      }, 0);
    }

    const diff = Math.round((total - sum) * 100) / 100;
    const valid = total > 0 && Boolean(singlePayerId || Object.keys(customPayers).length) && Math.abs(diff) < 0.009;

    return {
      payersSum: sum,
      isPayersValid: valid,
      payersDifference: diff,
    };
  }, [amount, payerMode, singlePayerId, customPayers]);

  // Calculate splits sum and validation
  const { splitsSum, isSplitsValid, splitsDifference } = useMemo(() => {
    const total = parseFloat(amount) || 0;
    const sum = Object.values(activeSplits).reduce((acc, val) => {
      const parsed = parseFloat(val);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    const diff = Math.round((total - sum) * 100) / 100;
    const valid = total > 0 && Math.abs(diff) < 0.009;

    return {
      splitsSum: sum,
      isSplitsValid: valid,
      splitsDifference: diff,
    };
  }, [amount, activeSplits]);

  // Overall form validation: BOTH payers and splits must match amount, and title must be present
  const isFormValid = isPayersValid && isSplitsValid && title.trim().length > 0;

  // Handle toggling member in equal split
  const handleToggleMember = (userId) => {
    setCheckedMemberIds((prev) => {
      if (prev.includes(userId)) {
        if (prev.length <= 1) {
          toastr.warning('At least one member must be selected for the split.');
          return prev;
        }
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  // Select all in equal split
  const handleSelectAll = () => {
    setCheckedMemberIds(joinedMembers.map((m) => m.id));
  };

  // Handle custom split input changes
  const handleCustomSplitChange = (userId, value) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  // Handle custom payer input changes
  const handleCustomPayerChange = (userId, value) => {
    setCustomPayers((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  // Distribute payer amounts evenly
  const handleDistributePayersEvenly = () => {
    const total = parseFloat(amount) || 0;
    if (total <= 0 || !joinedMembers.length) return;
    const equal = calculateEqualSplits(total, joinedMembers.map((m) => m.id));
    setCustomPayers(equal);
  };

  // Switch payer mode
  const handleSwitchPayerMode = (mode) => {
    if (mode === 'multiple' && payerMode === 'single') {
      const total = parseFloat(amount) || 0;
      if (total > 0 && singlePayerId) {
        setCustomPayers({ [singlePayerId]: total.toFixed(2) });
      }
    }
    setPayerMode(mode);
  };

  // Handle switching split modes
  const handleSwitchSplitMode = (newMode) => {
    if (newMode === 'custom' && splitMode === 'equal') {
      const currentEqual = calculateEqualSplits(amount, checkedMemberIds);
      setCustomSplits(currentEqual);
    }
    setSplitMode(newMode);
  };

  // Distribute remaining evenly in custom splits
  const handleDistributeRemainingSplits = () => {
    const total = parseFloat(amount) || 0;
    if (total <= 0 || !joinedMembers.length) return;
    const equal = calculateEqualSplits(total, joinedMembers.map((m) => m.id));
    setCustomSplits(equal);
  };

  // Save mutation (create or update)
  const saveExpenseMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditing) {
        const res = await expenseApi.update(tour.id, expenseToEdit.id, payload);
        return res.data;
      }
      const res = await expenseApi.create(tour.id, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toastr.success(
        data?.message ||
          (isEditing
            ? 'Expense updated successfully and is pending approval.'
            : 'Expense entry submitted successfully and is pending approval.')
      );
      queryClient.invalidateQueries({ queryKey: ['tour-expenses', tour.id] });
      queryClient.invalidateQueries({ queryKey: ['tour-settlements', tour.id] });
      queryClient.invalidateQueries({ queryKey: ['tour-overview', tour.id] });
      queryClient.invalidateQueries({ queryKey: ['tour-details', tour.id] });
      onClose();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
        (isEditing ? 'Failed to update expense.' : 'Failed to submit expense entry.');
      toastr.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toastr.warning('Please enter a descriptive expense title.');
      return;
    }

    const totalNum = parseFloat(amount);
    if (!totalNum || totalNum <= 0) {
      toastr.warning('Please enter a valid expense amount greater than 0.');
      return;
    }

    // Build Payers payload
    let payersPayload = [];
    if (payerMode === 'single') {
      if (!singlePayerId) {
        toastr.warning('Please select a payer.');
        return;
      }
      payersPayload = [
        {
          user_id: singlePayerId,
          amount: totalNum,
        },
      ];
    } else {
      payersPayload = Object.entries(customPayers)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([userId, val]) => ({
          user_id: userId,
          amount: parseFloat(val),
        }));

      if (!payersPayload.length) {
        toastr.warning('Please specify at least one payer allocation.');
        return;
      }
    }

    if (!isPayersValid) {
      toastr.warning(
        `Total paid (${payersSum.toFixed(2)}) must exactly match the expense amount (${totalNum.toFixed(2)}).`
      );
      return;
    }

    // Build Splits payload
    const splitsPayload = (splitMode === 'equal'
      ? Object.entries(activeSplits)
      : Object.entries(customSplits)
    )
      .filter(([_, val]) => parseFloat(val) > 0)
      .map(([userId, val]) => ({
        user_id: userId,
        amount_owed: parseFloat(val),
      }));

    if (!splitsPayload.length) {
      toastr.warning('Please allocate split amounts to at least one member.');
      return;
    }

    if (!isSplitsValid) {
      toastr.warning(
        `Total splits (${splitsSum.toFixed(2)}) must exactly match the expense amount (${totalNum.toFixed(2)}).`
      );
      return;
    }

    saveExpenseMutation.mutate({
      amount: totalNum,
      category,
      title: title.trim(),
      notes: notes.trim() || null,
      date,
      payers: payersPayload,
      splits: splitsPayload,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ maxHeight: '90vh' }}>
        <div className="modal-content bg-body text-body border-0 shadow d-flex flex-column" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="modal-header border-bottom py-3 flex-shrink-0">
            <div className="d-flex align-items-center gap-2">
              <div
                className={`rounded-circle ${
                  isEditing
                    ? 'bg-warning-subtle text-warning-emphasis'
                    : 'bg-success-subtle text-success'
                } p-2 d-inline-flex`}
              >
                <i
                  className={`bi ${
                    isEditing ? 'bi-pencil-square' : 'bi-receipt-cutoff'
                  } fs-5`}
                ></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">
                  {isEditing ? 'Edit Tour Expense' : 'Log Tour Expense'}
                </h5>
                <small className="text-body-secondary">
                  {isEditing
                    ? 'Updating an expense resets its status to pending review for approval.'
                    : 'Multiple payers & custom split accounting rules supported.'}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={saveExpenseMutation.isPending}
            ></button>
          </div>

          {/* Modal Body with internal scrolling */}
          <div className="modal-body p-4 overflow-y-auto" style={{ flex: '1 1 auto' }}>
            {isEditing && (
              <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-shield-exclamation text-warning-emphasis flex-shrink-0 fs-5"></i>
                <span>
                  <strong>Approval Guard:</strong> Editing this expense will update its figures and reset its status to <strong>Pending Review</strong>. Another tour member or admin must approve the change before settlements update.
                </span>
              </div>
            )}
            <form id="add-expense-form" onSubmit={handleSubmit} noValidate>
              {/* Row 1: Amount & Category */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="expense-amount" className="form-label fw-semibold small mb-0">
                      Total Amount <span className="text-danger">*</span>
                    </label>
                    {splitMode === 'custom' && (
                      <span className="badge bg-info-subtle text-info-emphasis small py-0">
                        Summed from Splits
                      </span>
                    )}
                  </div>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    readOnly={splitMode === 'custom'}
                    autoFocus={splitMode === 'equal'}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="expense-category" className="form-label fw-semibold small">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    id="expense-category"
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Title & Date */}
              <div className="row g-3 mb-3">
                <div className="col-md-8">
                  <label htmlFor="expense-title" className="form-label fw-semibold small">
                    Title / Expense Summary <span className="text-danger">*</span>
                  </label>
                  <input
                    id="expense-title"
                    type="text"
                    className="form-control"
                    placeholder="Enter title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="expense-date" className="form-label fw-semibold small">
                    Expense Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="expense-date"
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Notes (Optional) */}
              <div className="mb-4">
                <label htmlFor="expense-notes" className="form-label fw-semibold small">
                  Notes / Receipt Details <span className="text-body-secondary fw-normal">(Optional)</span>
                </label>
                <textarea
                  id="expense-notes"
                  rows={2}
                  className="form-control"
                  placeholder="Enter notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* ─── Payer Section (Multiple Payers Support) ─── */}
              <div className="card border mb-4 bg-body-tertiary">
                <div className="card-header bg-transparent py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-wallet2 text-success"></i>
                    <span className="fw-semibold small">Paid By (Bill Payers)</span>
                  </div>
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${payerMode === 'single' ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => handleSwitchPayerMode('single')}
                    >
                      Single Payer
                    </button>
                    <button
                      type="button"
                      className={`btn ${payerMode === 'multiple' ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => handleSwitchPayerMode('multiple')}
                    >
                      Multiple Payers
                    </button>
                  </div>
                </div>

                <div className="card-body p-3">
                  {payerMode === 'single' ? (
                    <div>
                      <label htmlFor="expense-single-payer" className="form-label small text-body-secondary mb-1">
                        Select who paid 100% of this expense:
                      </label>
                      <select
                        id="expense-single-payer"
                        className="form-select"
                        value={singlePayerId}
                        onChange={(e) => setSinglePayerId(e.target.value)}
                        required
                      >
                        {joinedMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <small className="text-body-secondary">
                          Enter how much each member contributed to pay this bill:
                        </small>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2 small"
                          onClick={handleDistributePayersEvenly}
                        >
                          <i className="bi bi-magic me-1"></i>Distribute Evenly
                        </button>
                      </div>

                      <div className="list-group list-group-flush border rounded bg-body">
                        {joinedMembers.map((m) => {
                          const val = customPayers[m.id] ?? '';
                          return (
                            <div key={m.id} className="list-group-item d-flex align-items-center justify-content-between py-2">
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                                >
                                  {m.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-medium small">
                                    {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                                  </div>
                                </div>
                              </div>
                              <div style={{ maxWidth: '140px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="form-control form-control-sm text-end"
                                  placeholder="0.00"
                                  value={val}
                                  onChange={(e) => handleCustomPayerChange(m.id, e.target.value)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Payers Status Indicator */}
                      <div className="mt-2">
                        {isPayersValid ? (
                          <div className="alert alert-success d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                            <span className="d-flex align-items-center gap-1">
                              <i className="bi bi-check-circle-fill"></i> Payers sum matches total.
                            </span>
                            <span className="fw-bold">{payersSum.toFixed(2)}</span>
                          </div>
                        ) : payersDifference > 0 ? (
                          <div className="alert alert-warning d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                            <span className="d-flex align-items-center gap-1">
                              <i className="bi bi-exclamation-triangle-fill"></i> Payers remaining to assign:
                            </span>
                            <span className="fw-bold">{payersDifference.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="alert alert-danger d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                            <span className="d-flex align-items-center gap-1">
                              <i className="bi bi-x-circle-fill"></i> Payers over-assigned by:
                            </span>
                            <span className="fw-bold">{Math.abs(payersDifference).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Split Section ─── */}
              <div className="card border bg-body-tertiary">
                <div className="card-header bg-transparent py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-pie-chart text-primary"></i>
                    <span className="fw-semibold small">Split Allocation</span>
                  </div>
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${splitMode === 'equal' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handleSwitchSplitMode('equal')}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      className={`btn ${splitMode === 'custom' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handleSwitchSplitMode('custom')}
                    >
                      Custom Split
                    </button>
                  </div>
                </div>

                <div className="card-body p-3">
                  {splitMode === 'equal' ? (
                    <>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <small className="text-body-secondary">
                          Select members sharing this cost ({checkedMemberIds.length} selected):
                        </small>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-decoration-none p-0 small"
                          onClick={handleSelectAll}
                        >
                          Select All
                        </button>
                      </div>

                      <div className="list-group list-group-flush border rounded bg-body">
                        {joinedMembers.map((m) => {
                          const isChecked = checkedMemberIds.includes(m.id);
                          const perPerson = activeSplits[m.id] || '0.00';

                          return (
                            <label
                              key={m.id}
                              className="list-group-item d-flex align-items-center justify-content-between py-2 cursor-pointer"
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0"
                                  checked={isChecked}
                                  onChange={() => handleToggleMember(m.id)}
                                />
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                                    style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                                  >
                                    {m.name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="fw-medium small">
                                      {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                                    </div>
                                    <small className="text-body-secondary">{m.email}</small>
                                  </div>
                                </div>
                              </div>
                              <div className="text-end">
                                <span className={`fw-bold small ${isChecked ? 'text-primary' : 'text-body-secondary'}`}>
                                  {perPerson}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <small className="text-body-secondary">
                          Enter exact amounts owed by each member (total updates automatically):
                        </small>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2 small"
                          onClick={handleDistributeRemainingSplits}
                        >
                          <i className="bi bi-magic me-1"></i>Distribute Evenly
                        </button>
                      </div>

                      <div className="list-group list-group-flush border rounded bg-body">
                        {joinedMembers.map((m) => {
                          const val = customSplits[m.id] ?? '';

                          return (
                            <div key={m.id} className="list-group-item d-flex align-items-center justify-content-between py-2">
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle bg-secondary-subtle text-secondary fw-bold d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                                >
                                  {m.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-medium small">
                                    {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                                  </div>
                                </div>
                              </div>

                              <div style={{ maxWidth: '140px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="form-control form-control-sm text-end"
                                  placeholder="0.00"
                                  value={val}
                                  onChange={(e) => handleCustomSplitChange(m.id, e.target.value)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Splits Status Indicator */}
                  <div className="mt-2">
                    {isSplitsValid ? (
                      <div className="alert alert-success d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                        <span className="d-flex align-items-center gap-1">
                          <i className="bi bi-check-circle-fill"></i> Splits balance perfectly.
                        </span>
                        <span className="fw-bold">{splitsSum.toFixed(2)} / {parseFloat(amount || 0).toFixed(2)}</span>
                      </div>
                    ) : splitsDifference > 0 ? (
                      <div className="alert alert-warning d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                        <span className="d-flex align-items-center gap-1">
                          <i className="bi bi-exclamation-triangle-fill"></i> Splits remaining to allocate:
                        </span>
                        <span className="fw-bold">{splitsDifference.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="alert alert-danger d-flex align-items-center justify-content-between py-1 px-3 mb-0 small">
                        <span className="d-flex align-items-center gap-1">
                          <i className="bi bi-x-circle-fill"></i> Splits over-allocated by:
                        </span>
                        <span className="fw-bold">{Math.abs(splitsDifference).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Modal Footer - Permanently pinned at bottom and accessible in all viewports */}
          <div className="modal-footer border-top py-3 px-4 bg-body-tertiary flex-shrink-0 d-flex justify-content-between align-items-center">
            <div className="small">
              {!title.trim() ? (
                <span className="text-body-secondary"><i className="bi bi-info-circle me-1"></i>Enter title to proceed</span>
              ) : !isPayersValid ? (
                <span className="text-danger"><i className="bi bi-exclamation-circle me-1"></i>Payers sum must match total</span>
              ) : !isSplitsValid ? (
                <span className="text-danger"><i className="bi bi-exclamation-circle me-1"></i>Splits sum must match total</span>
              ) : (
                <span className="text-success"><i className="bi bi-check-circle me-1"></i>Ready to save</span>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={onClose}
                disabled={saveExpenseMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-expense-form"
                className={`btn ${
                  isEditing ? 'btn-warning text-dark' : 'btn-success'
                } btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1`}
                disabled={saveExpenseMutation.isPending || !isFormValid}
              >
                {saveExpenseMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>{isEditing ? 'Saving Changes…' : 'Saving…'}</span>
                  </>
                ) : (
                  <>
                    <i className={`bi ${isEditing ? 'bi-check2-circle' : 'bi-check2'}`}></i>
                    <span>{isEditing ? 'Save Changes' : 'Save Expense'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function RecordDepositModal({ isOpen, onClose, tour, currentUser }) {
  const queryClient = useQueryClient();

  // Active joined members
  const joinedMembers = useMemo(() => {
    return (tour?.members || []).filter((m) => m.status === 'joined');
  }, [tour?.members]);

  // Joined Tour Admins (or tour creator)
  const tourAdmins = useMemo(() => {
    const admins = joinedMembers.filter(
      (m) => m.role === 'admin' || m.id === tour?.created_by
    );
    // If no explicit admin in joined list, fallback to all joined members
    return admins.length ? admins : joinedMembers;
  }, [joinedMembers, tour?.created_by]);

  // Form states
  const [amount, setAmount] = useState('');
  const [depositedBy, setDepositedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      // Default depositor: currentUser if joined, else first member
      const defaultDepositor =
        joinedMembers.find((m) => m.id === currentUser?.id)?.id || joinedMembers[0]?.id || '';
      setDepositedBy(defaultDepositor);

      // Default recipient admin: first tour admin
      const defaultAdmin = tourAdmins[0]?.id || '';
      setReceivedBy(defaultAdmin);

      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, joinedMembers, tourAdmins, currentUser?.id]);

  const depositMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await expenseApi.create(tour.id, payload);
      return res.data;
    },
    onSuccess: () => {
      toastr.success('Advance deposit recorded successfully and submitted for approval.');
      queryClient.invalidateQueries({ queryKey: ['tour-expenses', tour.id] });
      queryClient.invalidateQueries({ queryKey: ['tour-settlements', tour.id] });
      queryClient.invalidateQueries({ queryKey: ['tour-overview', tour.id] });
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to record advance deposit.';
      toastr.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const depositNum = parseFloat(amount);
    if (!depositNum || depositNum <= 0) {
      toastr.warning('Please enter a valid deposit amount greater than 0.');
      return;
    }

    if (!depositedBy) {
      toastr.warning('Please select who deposited the funds.');
      return;
    }

    if (!receivedBy) {
      toastr.warning('Please select the Tour Admin who received the funds.');
      return;
    }

    const payload = {
      amount: depositNum,
      category: 'Others',
      title: 'Advance Deposit / Tour Fund',
      notes: notes.trim() || 'Advance contribution to tour fund',
      date,
      payers: [
        {
          user_id: depositedBy,
          amount: depositNum,
        },
      ],
      splits: [
        {
          user_id: receivedBy,
          amount_owed: depositNum,
        },
      ],
    };

    depositMutation.mutate(payload);
  };

  if (!isOpen) return null;

  const isValidAmount = parseFloat(amount) > 0;
  const isFormValid = isValidAmount && depositedBy && receivedBy;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-md">
        <div className="modal-content bg-body text-body border-0 shadow">
          {/* Header */}
          <div className="modal-header border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-primary-subtle text-primary p-2 d-inline-flex">
                <i className="bi bi-piggy-bank fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">Record Tour Fund Deposit</h5>
                <small className="text-body-secondary">
                  Advance fund contribution to Tour Admin.
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={depositMutation.isPending}
            ></button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4">
              {/* How it works banner */}
              <div className="alert alert-info py-2 px-3 mb-3 small d-flex align-items-start gap-2">
                <i className="bi bi-info-circle-fill mt-1 flex-shrink-0"></i>
                <div>
                  Deposits credit the depositor and make the receiving Tour Admin accountable for holding the tour fund until expenses are logged.
                </div>
              </div>

              {/* Amount */}
              <div className="mb-3">
                <label htmlFor="deposit-amount" className="form-label fw-semibold small">
                  Deposit Amount <span className="text-danger">*</span>
                </label>
                <input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Deposited By */}
              <div className="mb-3">
                <label htmlFor="deposit-giver" className="form-label fw-semibold small">
                  Deposited By (Giver) <span className="text-danger">*</span>
                </label>
                <select
                  id="deposit-giver"
                  className="form-select"
                  value={depositedBy}
                  onChange={(e) => setDepositedBy(e.target.value)}
                  required
                >
                  {joinedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Received By */}
              <div className="mb-3">
                <label htmlFor="deposit-receiver" className="form-label fw-semibold small">
                  Received By (Tour Admin / Fund Holder) <span className="text-danger">*</span>
                </label>
                <select
                  id="deposit-receiver"
                  className="form-select"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  required
                >
                  {tourAdmins.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Admin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="mb-3">
                <label htmlFor="deposit-date" className="form-label fw-semibold small">
                  Deposit Date <span className="text-danger">*</span>
                </label>
                <input
                  id="deposit-date"
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Notes / Reference */}
              <div className="mb-2">
                <label htmlFor="deposit-notes" className="form-label fw-semibold small">
                  Payment Reference / Notes <span className="text-body-secondary fw-normal">(Optional)</span>
                </label>
                <textarea
                  id="deposit-notes"
                  rows={2}
                  className="form-control"
                  placeholder="Enter notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-top py-2 px-4 bg-body-tertiary">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={depositMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1"
                disabled={depositMutation.isPending || !isFormValid}
              >
                {depositMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Saving Deposit…</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle"></i>
                    <span>Record Deposit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

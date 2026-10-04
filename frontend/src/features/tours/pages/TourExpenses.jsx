import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '@/services/api.js';
import AddExpenseModal from '../components/expenses/AddExpenseModal.jsx';
import DeleteExpenseModal from '../components/expenses/DeleteExpenseModal.jsx';
import RecordDepositModal from '../components/expenses/RecordDepositModal.jsx';
import ExpenseActionModal from '../components/expenses/ExpenseActionModal.jsx';
import ExpenseDetailsModal from '../components/expenses/ExpenseDetailsModal.jsx';

// Category presentation styles
const CATEGORY_MAP = {
  Transport: { icon: 'bi-car-front-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
  Food: { icon: 'bi-cup-hot-fill', color: 'text-warning', bg: 'bg-warning-subtle' },
  Hotel: { icon: 'bi-building', color: 'text-info', bg: 'bg-info-subtle' },
  Activity: { icon: 'bi-compass-fill', color: 'text-success', bg: 'bg-success-subtle' },
  Others: { icon: 'bi-tag-fill', color: 'text-secondary', bg: 'bg-secondary-subtle' },
};

export default function TourExpenses() {
  const { tour, isAdmin: isTourAdmin, currentUser } = useOutletContext();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [activeAction, setActiveAction] = useState(null); // { type: 'approve'|'reject', expense }
  const [selectedExpense, setSelectedExpense] = useState(null); // For details modal

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch tour expenses
  const {
    data: expensesData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['tour-expenses', tour?.id],
    queryFn: async () => {
      const res = await expenseApi.getAll(tour.id);
      return res.data;
    },
    enabled: Boolean(tour?.id),
  });

  const expenses = expensesData?.expenses || [];

  // Active joined members of the tour
  const joinedMembers = useMemo(() => {
    return (tour?.members || []).filter((m) => m.status === 'joined');
  }, [tour?.members]);

  // Calculations for Stat Cards
  const stats = useMemo(() => {
    let totalApproved = 0;
    let myContribution = 0;
    let pendingActions = 0;

    expenses.forEach((exp) => {
      const amount = parseFloat(exp.amount) || 0;

      if (exp.status === 'approved') {
        totalApproved += amount;
        if (exp.payers && exp.payers.length > 0) {
          const userPayer = exp.payers.find((p) => (p.user_id || p.user?.id) === currentUser?.id);
          if (userPayer) {
            myContribution += parseFloat(userPayer.amount) || 0;
          }
        } else {
          const payerId = exp.paid_by_id || exp.paid_by?.id;
          if (payerId === currentUser?.id) {
            myContribution += amount;
          }
        }
      }

      if (['pending', 'edit_requested', 'delete_requested'].includes(exp.status)) {
        pendingActions += 1;
      }
    });

    return {
      totalApproved,
      myContribution,
      pendingActions,
    };
  }, [expenses, currentUser?.id]);

  // Filtered & searched expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Status filter
      if (statusFilter !== 'all' && exp.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = exp.title?.toLowerCase().includes(q);
        const descMatch = exp.description?.toLowerCase().includes(q);
        const notesMatch = exp.notes?.toLowerCase().includes(q);
        const catMatch = exp.category?.toLowerCase().includes(q);
        const payerMatch =
          (exp.payers || []).some((p) => p.user?.name?.toLowerCase().includes(q)) ||
          exp.paid_by?.name?.toLowerCase().includes(q);

        if (!titleMatch && !descMatch && !notesMatch && !catMatch && !payerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, statusFilter, searchQuery]);

  // Permission helpers
  const isCreatorOfExpense = (expense) => {
    const creatorId = expense.added_by_id || expense.added_by?.id;
    return creatorId === currentUser?.id;
  };

  const isPayerOfExpense = (expense) => {
    if (expense.payers && expense.payers.length > 0) {
      return expense.payers.some((p) => (p.user_id || p.user?.id) === currentUser?.id);
    }
    const payerId = expense.paid_by_id || expense.paid_by?.id;
    return payerId === currentUser?.id;
  };

  const isInvolvedInExpense = (expense) => {
    if (isTourAdmin) return true;
    if (isCreatorOfExpense(expense) || isPayerOfExpense(expense)) return true;
    return (expense.splits || []).some(
      (s) => (s.user_id || s.user?.id) === currentUser?.id
    );
  };

  const canApproveOrRejectExpense = (expense) => {
    if (!['pending', 'edit_requested', 'delete_requested'].includes(expense.status)) {
      return false;
    }

    const creatorId = expense.added_by_id || expense.added_by?.id;
    const isCreator = creatorId === currentUser?.id;

    // Creator cannot self-approve unless they are the only member in the tour
    if (isCreator && joinedMembers.length > 1) {
      return false;
    }

    // Check if expense was created by a tour admin
    const creatorMember = joinedMembers.find((m) => m.id === creatorId);
    const creatorIsAdmin = creatorMember?.role === 'admin' || tour.created_by === creatorId;

    if (creatorIsAdmin) {
      // If admin created it, another member (or admin) can approve
      return true;
    }

    // If regular member created it, only Tour Admin can approve
    return isTourAdmin;
  };

  const canEditExpense = (expense) => {
    if (expense.status === 'delete_requested') {
      return false;
    }
    return isInvolvedInExpense(expense);
  };

  const canDeleteExpense = (expense) => {
    if (['delete_requested', 'rejected'].includes(expense.status)) {
      return false;
    }
    return isInvolvedInExpense(expense);
  };

  // Helper for Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle d-inline-flex align-items-center gap-1">
            <i className="bi bi-check-circle-fill"></i>
            <span>Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1">
            <i className="bi bi-hourglass-split"></i>
            <span>Pending Review</span>
          </span>
        );
      case 'edit_requested':
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1">
            <i className="bi bi-pencil-square"></i>
            <span>Edit Requested</span>
          </span>
        );
      case 'delete_requested':
        return (
          <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle d-inline-flex align-items-center gap-1">
            <i className="bi bi-trash3-fill"></i>
            <span>Delete Requested</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle d-inline-flex align-items-center gap-1">
            <i className="bi bi-x-circle-fill"></i>
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="badge bg-secondary-subtle text-secondary">{status}</span>;
    }
  };

  return (
    <div className="py-2">
      {/* ─── Top Stat Cards ────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {/* Total Tour Expense */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card shadow-sm border-0 h-100 bg-body">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  Total Tour Expense
                </span>
                <h3 className="fw-bold mb-0 text-success">
                  {stats.totalApproved.toFixed(2)}
                </h3>
                <small className="text-body-secondary">Approved expenditures</small>
              </div>
              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-cash-stack"></i>
              </div>
            </div>
          </div>
        </div>

        {/* My Contribution */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card shadow-sm border-0 h-100 bg-body">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  My Contribution
                </span>
                <h3 className="fw-bold mb-0 text-primary">
                  {stats.myContribution.toFixed(2)}
                </h3>
                <small className="text-body-secondary">Directly paid by you</small>
              </div>
              <div
                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-person-check-fill"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div
            className={`card shadow-sm h-100 bg-body ${
              stats.pendingActions > 0
                ? 'border border-warning border-opacity-75 shadow'
                : 'border-0'
            }`}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  Pending Actions
                </span>
                <h3
                  className={`fw-bold mb-0 ${
                    stats.pendingActions > 0 ? 'text-warning-emphasis' : 'text-body-secondary'
                  }`}
                >
                  {stats.pendingActions}
                </h3>
                <small className="text-body-secondary">
                  {stats.pendingActions > 0
                    ? 'Awaiting approvals or reviews'
                    : 'All entries finalized'}
                </small>
              </div>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                  stats.pendingActions > 0
                    ? 'bg-warning-subtle text-warning-emphasis'
                    : 'bg-secondary-subtle text-body-secondary'
                }`}
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-hourglass-split"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action Bar (Search, Filter, Add Expense) ──────────────── */}
      <div className="card shadow-sm border-0 mb-4 bg-body">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            {/* Left: Search & Filter */}
            <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
              <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-body-tertiary">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search expenses…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchQuery('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>

              <select
                className="form-select form-select-sm"
                style={{ maxWidth: '170px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="edit_requested">Edit Requested</option>
                <option value="delete_requested">Delete Requested</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh expense list"
              >
                <i className={`bi bi-arrow-clockwise ${isFetching ? 'spin' : ''}`}></i>
                <span className="d-none d-sm-inline">Refresh</span>
              </button>
            </div>

            {/* Right: Add Expense Button */}
            <div className="flex-shrink-0" style={{ position: 'relative', zIndex: 5 }}>
              <button
                type="button"
                id="add-expense-btn"
                className="btn btn-primary px-3 fw-semibold shadow-sm d-flex align-items-center gap-2"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  setShowAddModal(true);
                }}
              >
                <i className="bi bi-plus-circle"></i>
                <span>Add Expense</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Expense Table Card ────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mb-4 bg-body">
        <div className="card-header bg-body-tertiary py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-receipt-cutoff text-primary fs-5"></i>
            <h6 className="mb-0 fw-bold">Expense Ledger</h6>
            <span className="badge bg-secondary-subtle text-secondary-emphasis border ms-1">
              {filteredExpenses.length} entries
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowDepositModal(true)}
              title="Record an advance tour fund deposit"
            >
              <i className="bi bi-piggy-bank"></i>
              <span>Record Deposit</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading expenses…</span>
              </div>
              <p className="text-body-secondary small mt-2">Loading expense records…</p>
            </div>
          ) : isError ? (
            <div className="p-5 text-center">
              <i className="bi bi-exclamation-triangle fs-1 text-danger mb-2"></i>
              <h5 className="fw-bold">Unable to Load Expenses</h5>
              <p className="text-body-secondary small">
                {error?.response?.data?.message || 'Failed to fetch expense records from server.'}
              </p>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => refetch()}
              >
                Try Again
              </button>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-5 text-center">
              <div
                className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
              >
                <i className="bi bi-receipt"></i>
              </div>
              <h5 className="fw-bold mb-1">No Expenses Found</h5>
              <p className="text-body-secondary small mx-auto mb-3" style={{ maxWidth: '400px' }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'No expense entries match your current search or filter criteria.'
                  : 'Start tracking your tour expenditures, bill allocations, and group splits.'}
              </p>
              <button
                type="button"
                className="btn btn-success btn-sm px-3 shadow-sm d-inline-flex align-items-center gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <i className="bi bi-plus-lg"></i>
                <span>Log First Expense</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="border-bottom">
                  <tr className="small text-body-secondary text-uppercase">
                    <th className="ps-3" style={{ minWidth: '110px' }}>Date</th>
                    <th style={{ minWidth: '130px' }}>Category</th>
                    <th style={{ minWidth: '220px' }}>Expense Title</th>
                    <th style={{ minWidth: '160px' }}>Payer(s)</th>
                    <th className="text-end" style={{ minWidth: '120px' }}>Total Amount</th>
                    <th style={{ minWidth: '130px' }}>Status</th>
                    <th className="text-end pe-3" style={{ minWidth: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const catStyle = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Others;
                    const canApprove = canApproveOrRejectExpense(expense);
                    const canEdit = canEditExpense(expense);
                    const canDelete = canDeleteExpense(expense);
                    const isDeletingPermanent =
                      canApprove && expense.status === 'delete_requested';

                    const hasMultiplePayers = expense.payers && expense.payers.length > 1;
                    const singlePayerUser = expense.payers?.[0]?.user || expense.paid_by;
                    const isUserAPayer = expense.payers && expense.payers.length > 0
                      ? expense.payers.some((p) => (p.user_id || p.user?.id) === currentUser?.id)
                      : (expense.paid_by_id || expense.paid_by?.id) === currentUser?.id;

                    return (
                      <tr key={expense.id}>
                        {/* Date */}
                        <td className="ps-3">
                          <span className="small fw-semibold">{expense.date}</span>
                        </td>

                        {/* Category */}
                        <td>
                          <span
                            className={`badge ${catStyle.bg} ${catStyle.color} d-inline-flex align-items-center gap-1 px-2 py-1`}
                          >
                            <i className={`bi ${catStyle.icon}`}></i>
                            <span>{expense.category}</span>
                          </span>
                        </td>

                        {/* Title & Notes */}
                        <td>
                          <div>
                            <span
                              role="button"
                              className="fw-semibold text-body text-decoration-none cursor-pointer"
                              onClick={() => setSelectedExpense(expense)}
                              title="Click to view full split allocations"
                            >
                              {expense.title || expense.description}
                            </span>
                            {expense.notes && (
                              <small className="text-body-secondary d-block text-truncate mt-0" style={{ maxWidth: '280px' }}>
                                <i className="bi bi-card-text me-1"></i>{expense.notes}
                              </small>
                            )}
                            <div className="small text-body-secondary d-flex align-items-center gap-1 mt-0">
                              <span>{expense.splits?.length || 0} split(s)</span>
                              <span>•</span>
                              <span
                                role="button"
                                className="text-primary text-decoration-none"
                                onClick={() => setSelectedExpense(expense)}
                              >
                                View Splits
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Payer(s) */}
                        <td>
                          {hasMultiplePayers ? (
                            <div className="d-flex align-items-center gap-1">
                              <span
                                className="badge bg-secondary-subtle text-secondary-emphasis border d-inline-flex align-items-center gap-1 cursor-pointer py-1"
                                role="button"
                                onClick={() => setSelectedExpense(expense)}
                                title="Click to view all payer contributions"
                              >
                                <i className="bi bi-people-fill text-success"></i>
                                <span>{expense.payers.length} Payers</span>
                              </span>
                              {isUserAPayer && (
                                <span className="badge bg-primary-subtle text-primary py-0" style={{ fontSize: '0.65rem' }}>
                                  You
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-secondary-subtle text-secondary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}
                              >
                                {singlePayerUser?.name?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              <div className="text-truncate" style={{ maxWidth: '140px' }}>
                                <span className="small fw-medium d-block text-truncate">
                                  {singlePayerUser?.name || 'Explorer'}
                                </span>
                                {isUserAPayer && (
                                  <span className="badge bg-primary-subtle text-primary py-0" style={{ fontSize: '0.65rem' }}>
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="text-end">
                          <span className="fw-bold text-success">
                            {parseFloat(expense.amount).toFixed(2)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td>{renderStatusBadge(expense.status)}</td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          <div className="d-inline-flex align-items-center gap-1">
                            {/* Approve Button */}
                            {canApprove && (
                              <button
                                type="button"
                                className={`btn btn-sm py-1 px-2 ${
                                  isDeletingPermanent
                                    ? 'btn-outline-danger'
                                    : expense.status === 'edit_requested'
                                      ? 'btn-outline-warning'
                                      : 'btn-outline-success'
                                }`}
                                title={
                                  isDeletingPermanent
                                    ? 'Approve Permanent Deletion'
                                    : expense.status === 'edit_requested'
                                      ? 'Review & Approve Edit Request'
                                      : 'Approve Expense'
                                }
                                onClick={() =>
                                  setActiveAction({ type: 'approve', expense })
                                }
                              >
                                <i
                                  className={`bi ${
                                    isDeletingPermanent
                                      ? 'bi-trash3-fill'
                                      : expense.status === 'edit_requested'
                                        ? 'bi-check-circle'
                                        : 'bi-check-lg'
                                  }`}
                                ></i>
                              </button>
                            )}

                            {/* Reject Button */}
                            {canApprove && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm py-1 px-2"
                                title="Reject Entry / Request"
                                onClick={() =>
                                  setActiveAction({ type: 'reject', expense })
                                }
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            )}

                            {/* Edit Button */}
                            {canEdit && (
                              <button
                                type="button"
                                className="btn btn-outline-warning btn-sm py-1 px-2"
                                title="Edit Expense"
                                onClick={() => setExpenseToEdit(expense)}
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                            )}

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm py-1 px-2"
                                title="Delete Expense"
                                onClick={() => setExpenseToDelete(expense)}
                              >
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            )}

                            {/* View Details Button */}
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-1 px-2"
                              title="View Details"
                              onClick={() => setSelectedExpense(expense)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {/* 1. Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal || Boolean(expenseToEdit)}
        onClose={() => {
          setShowAddModal(false);
          setExpenseToEdit(null);
        }}
        tour={tour}
        currentUser={currentUser}
        expenseToEdit={expenseToEdit}
      />

      {/* 2. Custom Delete Confirmation Modal */}
      <DeleteExpenseModal
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        tourId={tour?.id}
        expense={expenseToDelete}
      />

      {/* 3. Expense Action Confirmation Modal (Approve / Reject) */}
      <ExpenseActionModal
        isOpen={Boolean(activeAction)}
        onClose={() => setActiveAction(null)}
        tourId={tour.id}
        expense={activeAction?.expense}
        actionType={activeAction?.type}
      />

      {/* 4. Expense Details / Splits Modal */}
      <ExpenseDetailsModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        onAction={(type, exp) => setActiveAction({ type, expense: exp })}
        onEdit={(exp) => setExpenseToEdit(exp)}
        onDelete={(exp) => setExpenseToDelete(exp)}
        canApproveOrReject={
          selectedExpense ? canApproveOrRejectExpense(selectedExpense) : false
        }
        canEdit={
          selectedExpense ? canEditExpense(selectedExpense) : false
        }
        canDelete={
          selectedExpense ? canDeleteExpense(selectedExpense) : false
        }
      />

      {/* 5. Record Deposit Modal */}
      <RecordDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        tour={tour}
        currentUser={currentUser}
      />
    </div>
  );
}

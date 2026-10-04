import { useState, useMemo } from 'react';
import { useOutletContext, NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { settlementApi, exportApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';
import RecordDepositModal from '../components/expenses/RecordDepositModal.jsx';
import MemberPosPrintModal from '../components/expenses/MemberPosPrintModal.jsx';

export default function TourSettlements() {
  const { tour, currentUser } = useOutletContext();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [printingMemberId, setPrintingMemberId] = useState(null);
  const [selectedMemberForPrint, setSelectedMemberForPrint] = useState(null);

  const {
    data: settlementData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['tour-settlements', tour?.id],
    queryFn: async () => {
      const res = await settlementApi.get(tour.id);
      return res.data;
    },
    enabled: Boolean(tour?.id),
  });

  const memberBalances = settlementData?.member_balances || [];
  const suggestedTransactions = settlementData?.suggested_transactions || [];
  const totalApproved = parseFloat(settlementData?.total_approved_expenses || 0);
  const approvedCount = settlementData?.approved_expenses_count || 0;

  // Current user's balance
  const myBalance = useMemo(() => {
    return memberBalances.find((mb) => mb.user?.id === currentUser?.id);
  }, [memberBalances, currentUser?.id]);

  const myNet = parseFloat(myBalance?.net_balance || 0);

  // Helper to extract transactions for a given member
  const getMemberActions = (userId) => {
    if (!userId) return [];
    return suggestedTransactions.filter(
      (tx) => tx.from?.id === userId || tx.to?.id === userId
    );
  };

  // Export handlers
  const handleCopyStatement = async () => {
    try {
      setIsCopying(true);
      const res = await exportApi.getText(tour.id);
      if (res.data?.text) {
        await navigator.clipboard.writeText(res.data.text);
        toastr.success('Settlement statement copied to clipboard!');
      }
    } catch (err) {
      toastr.error(err.response?.data?.message || 'Failed to copy settlement statement.');
    } finally {
      setIsCopying(false);
    }
  };

  // Render full A4 group PDF in next browser tab (NO direct download)
  const handleOpenGroupPdf = async () => {
    try {
      setIsOpeningPdf(true);
      const res = await exportApi.openPdf(tour.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toastr.success('Group Settlement PDF opened in next tab.');
    } catch (err) {
      toastr.error(err.response?.data?.message || 'Failed to open PDF summary.');
    } finally {
      setIsOpeningPdf(false);
    }
  };

  // Quick render 58mm POS receipt in next browser tab (NO direct download)
  const handleOpenPosReceipt = async (user) => {
    if (!user?.id) return;
    try {
      setPrintingMemberId(user.id);
      const res = await exportApi.getPosReceipt(tour.id, user.id, false);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toastr.success(`58mm POS receipt for ${user.name} opened in next tab.`);
    } catch (err) {
      toastr.error(err.response?.data?.message || 'Failed to generate 58mm POS receipt.');
    } finally {
      setPrintingMemberId(null);
    }
  };

  return (
    <div className="py-2">
      {/* ─── Top Metric Cards ─────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {/* Total Approved Tour Expense */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100 bg-body">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  Settled Tour Spend
                </span>
                <h3 className="fw-bold mb-0 text-success">
                  {totalApproved.toFixed(2)}
                </h3>
                <small className="text-body-secondary">
                  Across {approvedCount} approved expense{approvedCount === 1 ? '' : 's'}
                </small>
              </div>
              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-wallet2"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Your Personal Settlement Balance */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100 bg-body">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  Your Balance
                </span>
                <h3
                  className={`fw-bold mb-0 ${myNet > 0
                    ? 'text-success'
                    : myNet < 0
                      ? 'text-danger'
                      : 'text-body-secondary'
                    }`}
                >
                  {myNet > 0 ? `+${myNet.toFixed(2)}` : myNet < 0 ? `-${Math.abs(myNet).toFixed(2)}` : '0.00'}
                </h3>
                <small className="text-body-secondary">
                  {myNet > 0
                    ? 'You are owed this money'
                    : myNet < 0
                      ? 'You owe this amount to group'
                      : 'You are completely settled'}
                </small>
              </div>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${myNet > 0
                  ? 'bg-success-subtle text-success'
                  : myNet < 0
                    ? 'bg-danger-subtle text-danger'
                    : 'bg-secondary-subtle text-body-secondary'
                  }`}
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i
                  className={`bi ${myNet > 0
                    ? 'bi-arrow-down-left-circle-fill'
                    : myNet < 0
                      ? 'bi-arrow-up-right-circle-fill'
                      : 'bi-check-circle-fill'
                    }`}
                ></i>
              </div>
            </div>
          </div>
        </div>

        {/* Required Transactions */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100 bg-body">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-body-secondary small fw-semibold text-uppercase d-block mb-1">
                  Suggested Transfers
                </span>
                <h3 className="fw-bold mb-0 text-primary">
                  {suggestedTransactions.length}
                </h3>
                <small className="text-body-secondary">
                  {suggestedTransactions.length === 0
                    ? 'All debts cleared'
                    : 'Transactions to square all debts'}
                </small>
              </div>
              <div
                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
              >
                <i className="bi bi-arrow-left-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Loading / Error States ─────────────────────────────────── */}
      {isLoading ? (
        <div className="card shadow-sm border-0 bg-body text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Calculating settlements…</span>
          </div>
          <p className="text-body-secondary small mt-2">Computing debt minimization matrix…</p>
        </div>
      ) : isError ? (
        <div className="card shadow-sm border-0 bg-body p-5 text-center">
          <i className="bi bi-exclamation-triangle fs-1 text-danger mb-2"></i>
          <h5 className="fw-bold">Unable to Calculate Settlements</h5>
          <p className="text-body-secondary small">
            {error?.response?.data?.message || 'Failed to fetch settlement data from the server.'}
          </p>
          <div>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => refetch()}>
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Suggested Settlements Section ──────────────────────── */}
          <div className="card shadow-sm border-0 mb-4 bg-body">
            <div className="card-header bg-body-tertiary py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-arrow-left-right text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold">Suggested Settlements</h6>
                <span className="badge bg-primary-subtle text-primary border ms-1">
                  {suggestedTransactions.length} transfer{suggestedTransactions.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="d-flex align-items-center flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                  onClick={handleCopyStatement}
                  disabled={isCopying}
                  title="Copy WhatsApp/Messenger formatted settlement statement"
                >
                  <i className={`bi ${isCopying ? 'bi-hourglass-split' : 'bi-clipboard2-check'}`}></i>
                  <span>{isCopying ? 'Copying...' : 'Copy Statement'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
                  onClick={handleOpenGroupPdf}
                  disabled={isOpeningPdf}
                  title="Render full group settlement PDF summary in a new browser tab"
                >
                  <i className={`bi ${isOpeningPdf ? 'bi-hourglass-split' : 'bi-file-earmark-pdf'}`}></i>
                  <span>{isOpeningPdf ? 'Opening PDF...' : 'View Group PDF'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => setShowDepositModal(true)}
                  title="Record an advance fund deposit to the Tour Admin"
                >
                  <i className="bi bi-piggy-bank"></i>
                  <span>Record Deposit</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Recalculate settlements"
                >
                  <i className={`bi bi-arrow-clockwise ${isFetching ? 'spin' : ''}`}></i>
                  <span className="d-none d-sm-inline">Recalculate</span>
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              {suggestedTransactions.length === 0 ? (
                <div className="text-center py-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
                  >
                    <i className="bi bi-patch-check-fill"></i>
                  </div>
                  <h5 className="fw-bold mb-1">All Settled Up!</h5>
                  <p className="text-body-secondary small mx-auto mb-3" style={{ maxWidth: '420px' }}>
                    {approvedCount === 0
                      ? 'No approved expenses have been logged yet for this tour. Log and approve expenses to compute split settlements.'
                      : 'Every member is square and there are no outstanding debts in this tour.'}
                  </p>
                  <NavLink to={`/tours/${tour.id}/expenses`} className="btn btn-outline-primary btn-sm px-3">
                    <i className="bi bi-receipt me-1"></i>View Expenses
                  </NavLink>
                </div>
              ) : (
                <div className="row g-3">
                  {suggestedTransactions.map((tx, idx) => {
                    const isFromMe = tx.from?.id === currentUser?.id;
                    const isToMe = tx.to?.id === currentUser?.id;

                    return (
                      <div key={idx} className="col-12 col-lg-6">
                        <div
                          className={`card h-100 p-3 border ${isFromMe
                            ? 'border-danger border-opacity-50 bg-danger-subtle bg-opacity-10'
                            : isToMe
                              ? 'border-success border-opacity-50 bg-success-subtle bg-opacity-10'
                              : 'bg-body-tertiary'
                            }`}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <span className="badge bg-secondary-subtle text-secondary small">
                              Transfer #{idx + 1}
                            </span>
                            <span className="fw-bold text-success fs-5">
                              {parseFloat(tx.amount).toFixed(2)}
                            </span>
                          </div>

                          {/* Transfer Flow Visualizer */}
                          <div className="d-flex align-items-center justify-content-between gap-2 p-2 bg-body rounded border">
                            {/* Debtor (Payer) */}
                            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '45%' }}>
                              <div
                                className="rounded-circle bg-danger-subtle text-danger fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                              >
                                {tx.from?.name?.charAt(0)?.toUpperCase() || 'D'}
                              </div>
                              <div className="text-truncate">
                                <span className="fw-semibold small d-block text-truncate">
                                  {tx.from?.name}
                                </span>
                                {isFromMe && (
                                  <span className="badge bg-danger text-white py-0" style={{ fontSize: '0.65rem' }}>
                                    You Pay
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="text-center px-1 flex-shrink-0">
                              <i className="bi bi-arrow-right text-primary fs-5"></i>
                            </div>

                            {/* Creditor (Receiver) */}
                            <div className="d-flex align-items-center justify-content-end gap-2 flex-grow-1 text-end" style={{ maxWidth: '45%' }}>
                              <div className="text-truncate">
                                <span className="fw-semibold small d-block text-truncate">
                                  {tx.to?.name}
                                </span>
                                {isToMe && (
                                  <span className="badge bg-success text-white py-0" style={{ fontSize: '0.65rem' }}>
                                    You Receive
                                  </span>
                                )}
                              </div>
                              <div
                                className="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                              >
                                {tx.to?.name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-body-secondary small">
                            <span className="fw-medium text-body">{tx.from?.name}</span> needs to pay{' '}
                            <span className="fw-medium text-body">{tx.to?.name}</span>{' '}
                            <strong className="text-success">{parseFloat(tx.amount).toFixed(2)}</strong>.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Member Balances Ledger ─────────────────────────────── */}
          <div className="card shadow-sm border-0 mb-4 bg-body">
            <div className="card-header bg-body-tertiary py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-people-fill text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold">Member Net Balances</h6>
                <span className="badge bg-secondary-subtle text-secondary-emphasis border ms-1">
                  {memberBalances.length} members
                </span>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="border-bottom">
                    <tr className="small text-body-secondary text-uppercase">
                      <th className="ps-3">Explorer</th>
                      <th className="text-end">Total Paid</th>
                      <th className="text-end">Total Share Owed</th>
                      <th className="text-end">Net Balance</th>
                      <th className="text-center pe-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberBalances.map((item) => {
                      const net = parseFloat(item.net_balance) || 0;
                      const isSelf = item.user?.id === currentUser?.id;

                      return (
                        <tr key={item.user?.id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                                style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                              >
                                {item.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="fw-semibold small d-flex align-items-center gap-1">
                                  <span>{item.user?.name}</span>
                                  {isSelf && (
                                    <span className="badge bg-secondary-subtle text-secondary py-0">You</span>
                                  )}
                                </div>
                                <small className="text-body-secondary">{item.user?.email}</small>
                              </div>
                            </div>
                          </td>

                          <td className="text-end small">
                            {parseFloat(item.total_paid).toFixed(2)}
                          </td>

                          <td className="text-end small text-body-secondary">
                            {parseFloat(item.total_owed).toFixed(2)}
                          </td>

                          <td className="text-end">
                            {net > 0 ? (
                              <span className="badge bg-success-subtle text-success fw-bold px-2 py-1">
                                +{net.toFixed(2)} (Receives)
                              </span>
                            ) : net < 0 ? (
                              <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1">
                                -{Math.abs(net).toFixed(2)} (Owes)
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-body-secondary px-2 py-1">
                                0.00 (Settled)
                              </span>
                            )}
                          </td>

                          <td className="text-center pe-3">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                                onClick={() =>
                                  setSelectedMemberForPrint({
                                    member: item.user,
                                    balance: item,
                                    actions: getMemberActions(item.user?.id),
                                  })
                                }
                                title="Open 58mm Thermal Print Configuration Modal"
                              >
                                <i className="bi bi-printer"></i>
                                <span className="d-none d-lg-inline">POS Print</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm dropdown-toggle dropdown-toggle-split"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                title="Receipt options"
                              >
                                <span className="visually-hidden">Toggle Dropdown</span>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                <li>
                                  <button
                                    type="button"
                                    className="dropdown-item small d-flex align-items-center gap-2"
                                    onClick={() => handleOpenPosReceipt(item.user)}
                                  >
                                    <i className="bi bi-box-arrow-up-right text-primary"></i>
                                    <span>Open Receipt in Tab</span>
                                  </button>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    className="dropdown-item small d-flex align-items-center gap-2"
                                    onClick={() =>
                                      setSelectedMemberForPrint({
                                        member: item.user,
                                        balance: item,
                                        actions: getMemberActions(item.user?.id),
                                      })
                                    }
                                  >
                                    <i className="bi bi-sliders text-secondary"></i>
                                    <span>Thermal Settings & Direct Print</span>
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Advance Deposit Modal */}
      <RecordDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        tour={tour}
        currentUser={currentUser}
      />

      {/* 58mm Thermal POS Print Modal */}
      {selectedMemberForPrint && (
        <MemberPosPrintModal
          show={Boolean(selectedMemberForPrint)}
          onClose={() => setSelectedMemberForPrint(null)}
          tour={tour}
          member={selectedMemberForPrint.member}
          balance={selectedMemberForPrint.balance}
          actions={selectedMemberForPrint.actions}
        />
      )}
    </div>
  );
}

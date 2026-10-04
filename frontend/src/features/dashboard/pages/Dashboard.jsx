import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext.jsx';
import { dashboardApi } from '@/services/api.js';
import PageHeader from '@/components/UI/PageHeader.jsx';
import StatCard from '@/components/UI/StatCard.jsx';

/**
 * Dashboard — TourTally Tour Expense Tracker main dashboard.
 * Prioritizes the ongoing (active) tour with live balance & expenses.
 * Falls back to upcoming tours and lifetime stats when no tour is active.
 */
export default function Dashboard() {
  const { user } = useAuth();

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await dashboardApi.getSummary();
      return res.data;
    },
  });

  const hasActiveTour = dashboardData?.has_active_tour ?? false;
  const activeTour = dashboardData?.active_tour;
  const otherActiveTours = dashboardData?.other_active_tours || [];
  const upcomingTours = dashboardData?.upcoming_tours || [];
  const lifetimeStats = dashboardData?.lifetime_stats || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return 'bi-cup-hot-fill text-warning';
      case 'transport':
        return 'bi-car-front-fill text-primary';
      case 'hotel':
        return 'bi-building-fill text-info';
      case 'activity':
        return 'bi-ticket-perforated-fill text-success';
      default:
        return 'bi-cash-coin text-secondary';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle">
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
            Pending
          </span>
        );
      case 'edit_requested':
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
            Edit Requested
          </span>
        );
      case 'delete_requested':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
            Delete Requested
          </span>
        );
      default:
        return <span className="badge bg-secondary-subtle text-secondary">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading dashboard…</span>
        </div>
        <p className="text-body-secondary small mt-2">Loading your tour overview…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card shadow-sm border-0 bg-body p-5 text-center my-4">
        <i className="bi bi-exclamation-triangle fs-1 text-danger mb-2"></i>
        <h5 className="fw-bold">Failed to load dashboard</h5>
        <p className="text-body-secondary small">
          {error?.response?.data?.message || 'Could not fetch dashboard summary from the server.'}
        </p>
        <div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => refetch()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Active Tour Ongoing Banner ─────────────────────────────── */}
      {hasActiveTour && activeTour ? (
        <>
          <div className="card border-0 shadow-sm bg-body mb-4 overflow-hidden border-start border-4 border-success">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-success text-white px-2 py-1 small fw-bold">
                      <span
                        className="spinner-grow spinner-grow-sm me-1"
                        style={{ width: '8px', height: '8px' }}
                      ></span>
                      ONGOING TOUR
                    </span>
                    <span className="text-body-secondary small">
                      {activeTour.destination || 'Expedition'}
                    </span>
                  </div>
                  <h3 className="fw-bold mb-1 text-body">{activeTour.name}</h3>
                  <div className="text-body-secondary small d-flex flex-wrap align-items-center gap-2">
                    {activeTour.destination && (
                      <span>
                        <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                        {activeTour.destination}
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      <i className="bi bi-calendar-event me-1 text-primary"></i>
                      {formatDate(activeTour.start_date)}
                      {activeTour.end_date && ` - ${formatDate(activeTour.end_date)}`}
                    </span>
                    <span>•</span>
                    <span>
                      <i className="bi bi-people-fill me-1 text-secondary"></i>
                      {activeTour.members_count} explorers
                    </span>
                  </div>
                </div>

                {/* Quick Action Links */}
                <div className="d-flex flex-wrap align-items-center gap-2 flex-shrink-0">
                  <NavLink
                    to={`/tours/${activeTour.id}`}
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                  >
                    <i className="bi bi-compass"></i>
                    <span>Tour Hub</span>
                  </NavLink>
                  <NavLink
                    to={`/tours/${activeTour.id}/expenses`}
                    className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                  >
                    <i className="bi bi-plus-circle"></i>
                    <span>Log Expense</span>
                  </NavLink>
                  <NavLink
                    to={`/tours/${activeTour.id}/settlements`}
                    className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                  >
                    <i className="bi bi-wallet2"></i>
                    <span>Settlements</span>
                  </NavLink>
                </div>
              </div>
            </div>
          </div>

          {/* ── Active Tour Big Stat Cards ─────────────────────────────── */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Total Tour Spend"
                value={parseFloat(activeTour.total_expense || 0).toFixed(2)}
                variant="primary"
                icon="bi-wallet2"
                subtext={`Across ${activeTour.approved_expenses_count} approved expense${
                  activeTour.approved_expenses_count === 1 ? '' : 's'
                }`}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Your Contribution"
                value={parseFloat(activeTour.user_paid || 0).toFixed(2)}
                variant="success"
                icon="bi-cash-coin"
                subtext="Total amount paid by you"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Your Share Owed"
                value={parseFloat(activeTour.user_owed || 0).toFixed(2)}
                variant="secondary"
                icon="bi-pie-chart"
                subtext="Your split cost allocation"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {(() => {
                const net = parseFloat(activeTour.user_balance || 0);
                const netVariant = net > 0 ? 'success' : net < 0 ? 'danger' : 'secondary';
                const netValue =
                  net > 0 ? `+${net.toFixed(2)}` : net < 0 ? `-${Math.abs(net).toFixed(2)}` : '0.00';
                const netSubtext =
                  net > 0 ? 'You receive from group' : net < 0 ? 'You owe to group' : 'All accounts settled';
                const netIcon =
                  net > 0
                    ? 'bi-arrow-down-left-circle'
                    : net < 0
                    ? 'bi-arrow-up-right-circle'
                    : 'bi-check-circle';

                return (
                  <StatCard
                    label="Your Net Balance"
                    value={netValue}
                    variant={netVariant}
                    icon={netIcon}
                    subtext={netSubtext}
                  />
                );
              })()}
            </div>
          </div>

          {/* ── Active Tour Mini-Ledger & Side Details ────────────────── */}
          <div className="row g-4 mb-4">
            {/* Recent Expenses Mini-Ledger */}
            <div className="col-12 col-lg-8">
              <div className="card shadow-sm border-0 bg-body h-100">
                <div className="card-header bg-body-tertiary py-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-receipt text-primary fs-5"></i>
                    <h6 className="mb-0 fw-bold">Recent Tour Expenses</h6>
                  </div>
                  <NavLink
                    to={`/tours/${activeTour.id}/expenses`}
                    className="btn btn-outline-primary btn-sm py-0 px-2"
                  >
                    View All
                  </NavLink>
                </div>
                <div className="card-body p-0">
                  {!activeTour.recent_expenses || activeTour.recent_expenses.length === 0 ? (
                    <div className="text-center py-5 px-3">
                      <div
                        className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                        style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}
                      >
                        <i className="bi bi-receipt"></i>
                      </div>
                      <h6 className="fw-bold mb-1">No Expenses Recorded Yet</h6>
                      <p className="text-body-secondary small mx-auto mb-3" style={{ maxWidth: '360px' }}>
                        Start logging team expenses to track splits and compute net settlement balances.
                      </p>
                      <NavLink
                        to={`/tours/${activeTour.id}/expenses`}
                        className="btn btn-success btn-sm px-3 shadow-sm"
                      >
                        <i className="bi bi-plus-circle me-1"></i>Log First Expense
                      </NavLink>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="border-bottom">
                          <tr className="text-body-secondary small text-uppercase">
                            <th className="ps-3">Expense</th>
                            <th>Date</th>
                            <th>Paid By</th>
                            <th>Status</th>
                            <th className="text-end pe-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeTour.recent_expenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="ps-3">
                                <div className="d-flex align-items-center gap-2">
                                  <i className={`bi ${getCategoryIcon(exp.category)} fs-5`}></i>
                                  <div>
                                    <div className="fw-semibold small text-body">{exp.title}</div>
                                    <span className="badge bg-secondary-subtle text-secondary py-0">
                                      {exp.category}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="small text-body-secondary">{formatDate(exp.date)}</td>
                              <td className="small">{exp.added_by?.name || 'Explorer'}</td>
                              <td>{getStatusBadge(exp.status)}</td>
                              <td className="text-end pe-3 fw-bold small text-body">
                                {parseFloat(exp.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Tour Meta */}
            <div className="col-12 col-lg-4">
              <div className="card shadow-sm border-0 bg-body mb-3">
                <div className="card-header bg-body-tertiary py-3">
                  <h6 className="mb-0 fw-bold">
                    <i className="bi bi-lightning-charge text-warning me-2"></i>Quick Actions
                  </h6>
                </div>
                <div className="card-body d-flex flex-column gap-2 p-3">
                  <NavLink
                    to={`/tours/${activeTour.id}/expenses`}
                    className="btn btn-outline-success btn-sm text-start d-flex align-items-center justify-content-between p-2"
                  >
                    <span>
                      <i className="bi bi-plus-circle me-2"></i>Log New Expense
                    </span>
                    <i className="bi bi-chevron-right text-secondary small"></i>
                  </NavLink>
                  <NavLink
                    to={`/tours/${activeTour.id}/settlements`}
                    className="btn btn-outline-primary btn-sm text-start d-flex align-items-center justify-content-between p-2"
                  >
                    <span>
                      <i className="bi bi-wallet2 me-2"></i>View Settlements &amp; Balances
                    </span>
                    <i className="bi bi-chevron-right text-secondary small"></i>
                  </NavLink>
                  <NavLink
                    to={`/tours/${activeTour.id}/members`}
                    className="btn btn-outline-secondary btn-sm text-start d-flex align-items-center justify-content-between p-2"
                  >
                    <span>
                      <i className="bi bi-people me-2"></i>Manage Tour Members
                    </span>
                    <i className="bi bi-chevron-right text-secondary small"></i>
                  </NavLink>
                </div>
              </div>

              {/* Other Active Tours if any */}
              {otherActiveTours.length > 0 && (
                <div className="card shadow-sm border-0 bg-body">
                  <div className="card-header bg-body-tertiary py-2 px-3">
                    <small className="fw-bold text-uppercase text-body-secondary">
                      Other Active Tours
                    </small>
                  </div>
                  <div className="list-group list-group-flush">
                    {otherActiveTours.map((t) => (
                      <NavLink
                        key={t.id}
                        to={`/tours/${t.id}`}
                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 bg-body"
                      >
                        <div className="text-truncate pe-2">
                          <span className="fw-semibold small d-block text-truncate text-body">
                            {t.name}
                          </span>
                          <small className="text-body-secondary">{t.destination || 'Active trip'}</small>
                        </div>
                        <i className="bi bi-arrow-right text-secondary small"></i>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ── Idle / Planning View (No Active Tour) ─────────────────── */
        <>
          <PageHeader
            title={`Welcome back, ${user?.name || 'Explorer'}!`}
            subtitle="No tour is currently ongoing. Review your upcoming trip plans or view lifetime statistics."
          >
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh dashboard"
            >
              <i className={`bi bi-arrow-clockwise ${isFetching ? 'spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
            <NavLink
              to="/tours"
              className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
            >
              <i className="bi bi-plus-circle"></i>
              <span>Create Tour</span>
            </NavLink>
          </PageHeader>

          {/* Fallback Lifetime Stat Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Completed Tours"
                value={lifetimeStats.completed_tours_count ?? 0}
                variant="success"
                icon="bi-trophy"
                subtext="Trips concluded"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Total Tours"
                value={lifetimeStats.total_tours_count ?? 0}
                variant="primary"
                icon="bi-compass"
                subtext="Joined & organized"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Lifetime Paid"
                value={parseFloat(lifetimeStats.lifetime_paid || 0).toFixed(2)}
                variant="info"
                icon="bi-cash-stack"
                subtext="Total paid across all tours"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Lifetime Share"
                value={parseFloat(lifetimeStats.lifetime_spent || 0).toFixed(2)}
                variant="secondary"
                icon="bi-receipt"
                subtext="Total split share allocated"
              />
            </div>
          </div>

          {/* Upcoming Tours Section */}
          <div className="card shadow-sm border-0 bg-body mb-4">
            <div className="card-header bg-body-tertiary py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-calendar2-range text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold">Upcoming Planning Tours</h6>
              </div>
              <NavLink to="/tours" className="btn btn-outline-primary btn-sm py-0 px-2">
                View All Tours
              </NavLink>
            </div>

            <div className="card-body p-4">
              {upcomingTours.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <div
                    className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
                  >
                    <i className="bi bi-compass"></i>
                  </div>
                  <h5 className="fw-bold mb-1">Ready for Your Next Adventure?</h5>
                  <p className="text-body-secondary small mx-auto mb-4" style={{ maxWidth: '420px' }}>
                    You don't have any ongoing or upcoming tours planned. Create a tour and invite your travel companions to start tracking shared expenses.
                  </p>
                  <NavLink to="/tours" className="btn btn-success btn-sm px-4 fw-semibold shadow-sm">
                    <i className="bi bi-plus-lg me-1"></i>Create a Tour
                  </NavLink>
                </div>
              ) : (
                <div className="row g-3">
                  {upcomingTours.map((t) => (
                    <div key={t.id} className="col-12 col-md-6 col-xl-4">
                      <div className="card h-100 border bg-body-tertiary p-3 rounded-3 shadow-sm hover-shadow transition">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle text-uppercase small">
                            Planning
                          </span>
                          <span className="text-body-secondary small">
                            <i className="bi bi-people me-1"></i>
                            {t.members_count} explorers
                          </span>
                        </div>
                        <h6 className="fw-bold text-body mb-1">{t.name}</h6>
                        <p className="text-body-secondary small mb-3">
                          {t.destination ? (
                            <>
                              <i className="bi bi-geo-alt me-1 text-danger"></i>
                              {t.destination}
                            </>
                          ) : (
                            'Destination TBD'
                          )}
                          <br />
                          <i className="bi bi-calendar-event me-1 text-primary"></i>
                          {formatDate(t.start_date)}
                          {t.end_date && ` - ${formatDate(t.end_date)}`}
                        </p>
                        <div className="mt-auto">
                          <NavLink
                            to={`/tours/${t.id}`}
                            className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                          >
                            <span>Open Tour Hub</span>
                            <i className="bi bi-arrow-right"></i>
                          </NavLink>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

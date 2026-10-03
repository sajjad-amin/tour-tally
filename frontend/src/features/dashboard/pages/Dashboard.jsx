import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext.jsx';
import { useTour } from '@/context/TourContext.jsx';
import { toursApi } from '@/services/api.js';
import PageHeader from '@/components/UI/PageHeader.jsx';
import StatCard from '@/components/UI/StatCard.jsx';

/**
 * Dashboard — TourTally Tour Expense Tracker main dashboard.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { counts, refreshTours } = useTour();

  const {
    data: recentTours = [],
    isLoading: isLoadingTours,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-recent-tours'],
    queryFn: async () => {
      const res = await toursApi.getAll({ per_page: 5, tab: 'joined' });
      return res.data?.tours ?? [];
    },
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleRefresh = async () => {
    await Promise.all([refreshTours(), refetch()]);
  };

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Explorer'}!`}
        subtitle="Overview of your upcoming trips, shared tour expenses, and tally settlements."
      >
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={handleRefresh}
          title="Refresh dashboard data"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Refresh</span>
        </button>
        <NavLink
          to="/tours"
          className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-circle"></i>
          <span>Explore Tours</span>
        </NavLink>
      </PageHeader>

      {/* ── Key Metrics ──────────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Active Tours"
            value={counts.joined ?? 0}
            variant="success"
            icon="bi-compass"
            subtext="Joined or organized"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Pending Invites"
            value={counts.pending ?? 0}
            variant="warning"
            icon="bi-envelope-open"
            subtext="Awaiting response"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Total Expenses"
            value="$0.00"
            variant="primary"
            icon="bi-receipt"
            subtext="Phase 4 feature"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Pending Splits"
            value="$0.00"
            variant="secondary"
            icon="bi-cash-stack"
            subtext="Phase 4 feature"
          />
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* ── Recent Tours Table or Empty State ───────────────────────── */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-secondary-subtle py-3 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-compass me-2 text-success"></i>Recent Tours &amp; Trips
              </h6>
              <NavLink to="/tours" className="btn btn-outline-primary btn-sm py-0 px-2">
                View All
              </NavLink>
            </div>
            <div className="card-body p-0">
              {isLoadingTours ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-success" role="status">
                    <span className="visually-hidden">Loading tours…</span>
                  </div>
                </div>
              ) : recentTours.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <div
                    className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}
                  >
                    <i className="bi bi-compass"></i>
                  </div>
                  <h6 className="fw-bold mb-1">No Active Tours Yet</h6>
                  <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '380px' }}>
                    You haven't joined or created any tours yet. Start planning your upcoming trips and coordinating expenses.
                  </p>
                  <NavLink to="/tours" className="btn btn-success btn-sm px-3 fw-semibold shadow-sm">
                    <i className="bi bi-plus-lg me-1"></i>Create or Join Tour
                  </NavLink>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="border-bottom">
                      <tr className="text-body-secondary small text-uppercase">
                        <th className="ps-3">Tour / Destination</th>
                        <th>Dates</th>
                        <th>Members</th>
                        <th>Status</th>
                        <th className="text-end pe-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTours.map((t) => (
                        <tr key={t.id}>
                          <td className="ps-3">
                            <div className="fw-bold">{t.name}</div>
                            <small className="text-muted">{t.destination || 'Destination TBD'}</small>
                          </td>
                          <td className="small">
                            {formatDate(t.start_date)}
                            {t.end_date ? ` – ${formatDate(t.end_date)}` : ''}
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary-emphasis">
                              {t.members_count ?? 1} {t.members_count === 1 ? 'member' : 'members'}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-success-subtle text-success text-capitalize">
                              {t.status}
                            </span>
                          </td>
                          <td className="text-end pe-3">
                            <NavLink
                              to={`/tours/${t.id}`}
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              title="View details"
                            >
                              View
                            </NavLink>
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

        {/* ── Quick Split Balances Empty State ────────────────────────── */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-secondary-subtle py-3">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-wallet2 me-2 text-primary"></i>My Split Balance
              </h6>
            </div>
            <div className="card-body p-4 text-center d-flex flex-column align-items-center justify-content-center">
              <div
                className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}
              >
                <i className="bi bi-cash-stack"></i>
              </div>
              <h6 className="fw-bold mb-1">All Settled Up</h6>
              <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '280px' }}>
                No unsettled debts or group split balances at this time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

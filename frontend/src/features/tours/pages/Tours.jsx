import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toursApi } from '@/services/api.js';
import { useTour } from '@/context/TourContext.jsx';
import { useNotification } from '@/context/NotificationContext.jsx';
import PageHeader from '@/components/UI/PageHeader.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import TourCard from '../components/TourCard.jsx';
import CreateTourModal from '../components/CreateTourModal.jsx';
import DeclineInviteModal from '../components/DeclineInviteModal.jsx';
import ToursPagination from '../components/ToursPagination.jsx';

export default function Tours() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get('filter') || 'all'; // 'all' | 'joined' | 'pending'

  const { counts, updateCounts, refreshTours, acceptInvite, rejectInvite } = useTour();
  const { refreshNotifications } = useNotification();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 9;

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tourToDecline, setTourToDecline] = useState(null);

  // 1. Fetch Pending Invitations Query (distinct section)
  const {
    data: pendingData = { tours: [], count: 0 },
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['user-tours', 'pending'],
    queryFn: async () => {
      const res = await toursApi.getAll({ tab: 'pending', per_page: 50 });
      if (res.data?.counts) {
        updateCounts(res.data.counts);
      }
      return {
        tours: res.data?.tours ?? [],
        count: res.data?.counts?.pending ?? (res.data?.tours?.length ?? 0),
      };
    },
  });

  // 2. Fetch Joined Tours Query (paginated & searchable)
  const {
    data: joinedData = { tours: [], meta: { current_page: 1, last_page: 1, total: 0, from: 0, to: 0, per_page: perPage } },
    isLoading: isLoadingJoined,
    refetch: refetchJoined,
  } = useQuery({
    queryKey: ['user-tours', 'joined', { search, page }],
    queryFn: async () => {
      const res = await toursApi.getAll({
        tab: 'joined',
        search: search.trim() || undefined,
        page,
        per_page: perPage,
      });

      if (res.data?.counts) {
        updateCounts(res.data.counts);
      }

      return {
        tours: res.data?.tours ?? [],
        meta: res.data?.meta ?? {
          current_page: 1,
          last_page: 1,
          total: res.data?.tours?.length ?? 0,
          from: res.data?.tours?.length ? 1 : 0,
          to: res.data?.tours?.length ?? 0,
          per_page: perPage,
        },
      };
    },
  });

  const pendingTours = pendingData.tours;
  const joinedTours = joinedData.tours;
  const meta = joinedData.meta;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTours();
      await Promise.all([refetchJoined(), refetchPending(), refreshNotifications()]);
      toastr.info('Tours list refreshed.');
    } catch {
      toastr.error('Failed to refresh tours.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create Tour mutation
  const createTourMutation = useMutation({
    mutationFn: (data) => toursApi.create(data),
    onSuccess: (res) => {
      refreshTours();
      refetchJoined();
      toastr.success(res.data?.message || 'Tour created successfully!');
      setIsCreateModalOpen(false);
      setCreateError(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create tour.';
      setCreateError(msg);
      toastr.error(msg);
    },
  });

  // Accept Invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: (tourId) => acceptInvite(tourId),
    onSuccess: () => {
      refreshNotifications();
      refetchJoined();
      refetchPending();
    },
  });

  // Reject / Decline Invite mutation
  const rejectInviteMutation = useMutation({
    mutationFn: (tourId) => rejectInvite(tourId),
    onSuccess: () => {
      refreshNotifications();
      setTourToDecline(null);
      refetchJoined();
      refetchPending();
    },
  });

  const handleFilterChange = (newFilter) => {
    const params = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const showPendingSection = (currentFilter === 'all' && pendingTours.length > 0) || currentFilter === 'pending';
  const showJoinedSection = currentFilter === 'all' || currentFilter === 'joined';

  return (
    <>
      <PageHeader
        title="Tours &amp; Trips Management"
        subtitle="Organize travel itineraries, invite explorers, track shared tour expenses, and settle group balances."
      >
        <button
          type="button"
          className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
        >
          <i className="bi bi-plus-lg"></i>
          <span>Create Tour</span>
        </button>
      </PageHeader>

      {/* View Filter Pills & Search Toolbar */}
      <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 border-bottom pb-3 mb-4">
        {/* Navigation Filter Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${
              currentFilter === 'all' ? 'btn-primary fw-semibold shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => handleFilterChange('all')}
          >
            <span>All Sections</span>
            <span className={`badge ${currentFilter === 'all' ? 'bg-light text-primary' : 'bg-secondary-subtle text-secondary'}`}>
              {(counts.joined ?? 0) + (counts.pending ?? 0)}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${
              currentFilter === 'joined' ? 'btn-success fw-semibold shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => handleFilterChange('joined')}
          >
            <i className="bi bi-compass"></i>
            <span>My Tours</span>
            <span className={`badge ${currentFilter === 'joined' ? 'bg-light text-success' : 'bg-secondary-subtle text-secondary'}`}>
              {counts.joined ?? 0}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${
              currentFilter === 'pending' ? 'btn-warning text-dark fw-semibold shadow-sm' : 'btn-outline-secondary'
            }`}
            onClick={() => handleFilterChange('pending')}
          >
            <i className="bi bi-envelope-open"></i>
            <span>Pending Invitations</span>
            {(counts.pending > 0 || pendingTours.length > 0) && (
              <span className={`badge ${currentFilter === 'pending' ? 'bg-dark text-white' : 'bg-warning text-dark'}`}>
                {counts.pending ?? pendingTours.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input Bar & Refresh */}
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: '280px' }}>
            <span className="input-group-text bg-body border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search tour name, destination..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => handleSearchChange('')}
                title="Clear search"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh tours list"
          >
            <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-animation' : ''}`}></i>
            <span className="d-none d-sm-inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* DISTINCT SECTION 1: Pending Invitations */}
      {showPendingSection && (
        <div className="card border-warning shadow-sm mb-5 rounded-4 overflow-hidden">
          <div className="card-header bg-warning bg-opacity-10 border-warning py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-envelope-exclamation-fill fs-5 text-warning"></i>
              <h5 className="mb-0 fw-bold text-warning-emphasis">Pending Tour Invitations</h5>
              <span className="badge bg-warning text-dark border border-warning-subtle">
                {pendingTours.length} pending
              </span>
            </div>
            <small className="text-muted">
              Review details below or accept to join the explorer roster.
            </small>
          </div>

          <div className="card-body p-4 bg-light-subtle">
            {isLoadingPending ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-warning" role="status">
                  <span className="visually-hidden">Loading invitations…</span>
                </div>
              </div>
            ) : pendingTours.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <i className="bi bi-envelope-check fs-2 text-secondary mb-2 d-block"></i>
                You have no pending invitations to join group tours at this moment.
              </div>
            ) : (
              <div className="row g-4">
                {pendingTours.map((tour) => (
                  <div key={tour.id} className="col-12 col-md-6 col-xl-4">
                    <TourCard
                      tour={tour}
                      onAcceptInvite={() => acceptInviteMutation.mutate(tour.id)}
                      onRejectInvite={() => setTourToDecline(tour)}
                      isActionPending={acceptInviteMutation.isPending || rejectInviteMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISTINCT SECTION 2: My Tours (Joined) */}
      {showJoinedSection && (
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-compass text-success"></i>
              <span>My Tours (Joined)</span>
              <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                {meta.total ?? joinedTours.length}
              </span>
            </h5>
          </div>

          {isLoadingJoined ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading tours…</span>
              </div>
            </div>
          ) : joinedTours.length === 0 ? (
            <div className="card shadow-sm border-0 p-5 text-center my-4">
              <div
                className="rounded-circle bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
              >
                {search ? <i className="bi bi-search"></i> : <i className="bi bi-compass"></i>}
              </div>
              <h5 className="fw-bold mb-2">
                {search ? 'No Tours Found' : 'No Active Tours Yet'}
              </h5>
              <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '420px' }}>
                {search
                  ? `No tours matching "${search}" were found. Try adjusting your search query.`
                  : 'Start organizing your upcoming trip by creating your first tour and inviting your friends or travel partners!'}
              </p>
              {!search && (
                <div>
                  <button
                    type="button"
                    className="btn btn-success btn-sm px-4 fw-semibold shadow-sm"
                    onClick={() => {
                      setCreateError(null);
                      setIsCreateModalOpen(true);
                    }}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Create Your First Tour
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="row g-4">
                {joinedTours.map((tour) => (
                  <div key={tour.id} className="col-12 col-md-6 col-xl-4">
                    <TourCard tour={tour} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <ToursPagination
                meta={meta}
                page={page}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      )}

      {/* Create Tour Modal */}
      <CreateTourModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        onCreate={(payload) => createTourMutation.mutate(payload)}
        isPending={createTourMutation.isPending}
        error={createError}
      />

      {/* Decline Invite Modal */}
      <DeclineInviteModal
        isOpen={Boolean(tourToDecline)}
        tour={tourToDecline}
        onClose={() => setTourToDecline(null)}
        onConfirmDecline={(tourId) => rejectInviteMutation.mutate(tourId)}
        isDeclining={rejectInviteMutation.isPending}
      />
    </>
  );
}

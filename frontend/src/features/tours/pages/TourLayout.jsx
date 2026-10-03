import { useParams, NavLink, Outlet, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toursApi } from '@/services/api.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useTour } from '@/context/TourContext.jsx';
import { useNotification } from '@/context/NotificationContext.jsx';
import PageHeader from '@/components/UI/PageHeader.jsx';
import toastr from '@/services/toastr.js';

// Modular Component
import DeclineInviteModal from '../components/DeclineInviteModal.jsx';
import { useState } from 'react';

export default function TourLayout() {
  const { id: tourId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { acceptInvite, rejectInvite } = useTour();
  const { refreshNotifications } = useNotification();
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // 1. Fetch Tour details query
  const {
    data: tour,
    isLoading,
    isError,
    error: fetchError,
    refetch: refetchTour,
  } = useQuery({
    queryKey: ['tour-details', tourId],
    queryFn: async () => {
      const res = await toursApi.get(tourId);
      return res.data?.tour;
    },
    retry: 1,
  });

  // 2. Accept Invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: () => acceptInvite(tourId),
    onSuccess: () => {
      refreshNotifications();
    },
  });

  // 3. Reject Invite mutation
  const rejectInviteMutation = useMutation({
    mutationFn: () => rejectInvite(tourId),
    onSuccess: () => {
      refreshNotifications();
      navigate('/tours');
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading tour details…</span>
        </div>
      </div>
    );
  }

  if (isError || !tour) {
    return (
      <div className="card shadow-sm border-0 p-5 text-center my-4">
        <i className="bi bi-exclamation-circle fs-1 text-danger mb-3"></i>
        <h4 className="fw-bold">Tour Not Found or Inaccessible</h4>
        <p className="text-muted small mb-4">
          {fetchError?.response?.data?.message || 'You might not be a member of this tour, or it may have been deleted.'}
        </p>
        <div>
          <NavLink to="/tours" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>Back to Tours
          </NavLink>
        </div>
      </div>
    );
  }

  const isTourAdmin = Boolean(tour.is_admin);
  const isInvited = tour.user_membership?.status === 'invited';

  return (
    <>
      {/* Top Back Navigation Bar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <NavLink
          to="/tours"
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 shadow-sm"
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to Tours</span>
        </NavLink>

        <div className="d-flex align-items-center gap-2">
          {isTourAdmin && (
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">
              <i className="bi bi-shield-check me-1"></i>You are Tour Admin
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => refetchTour()}
            title="Refresh tour details"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* Main Tour Page Header */}
      <PageHeader
        title={tour.name}
        subtitle={
          tour.destination
            ? `Destination: ${tour.destination}`
            : 'Group tour and expense coordination dashboard.'
        }
      />

      {/* Pending Invitation Alert Banner */}
      {isInvited && (
        <div className="alert alert-warning border border-warning shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-envelope-exclamation-fill fs-3 text-warning-emphasis"></i>
            <div>
              <h6 className="fw-bold mb-0">You have been invited to this tour!</h6>
              <small className="text-muted">
                Accept this invitation to join the roster and split expenses with other explorers.
              </small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-sm px-3 fw-semibold d-flex align-items-center gap-1 shadow-sm"
              onClick={() => acceptInviteMutation.mutate()}
              disabled={acceptInviteMutation.isPending || rejectInviteMutation.isPending}
            >
              <i className="bi bi-check-circle-fill"></i>
              <span>Accept Invite</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 fw-semibold d-flex align-items-center gap-1"
              onClick={() => setShowDeclineModal(true)}
              disabled={acceptInviteMutation.isPending || rejectInviteMutation.isPending}
            >
              <i className="bi bi-x-circle"></i>
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation NavLinks replacing Bootstrap Tabs */}
      <div className="border-bottom mb-4">
        <ul className="nav nav-tabs border-bottom-0 gap-2">
          <li className="nav-item">
            <NavLink
              to={`/tours/${tourId}`}
              end
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active fw-bold' : 'link-body-emphasis'
                }`
              }
            >
              <i className="bi bi-info-circle"></i>
              <span>Overview</span>
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to={`/tours/${tourId}/members`}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active fw-bold' : 'link-body-emphasis'
                }`
              }
            >
              <i className="bi bi-people"></i>
              <span>Members</span>
              <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                {tour.members?.length ?? 0}
              </span>
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to={`/tours/${tourId}/expenses`}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active fw-bold' : 'link-body-emphasis'
                }`
              }
            >
              <i className="bi bi-receipt-cutoff"></i>
              <span>Expenses</span>
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
                Phase 4
              </span>
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Active Section rendered via React Router Outlet */}
      <Outlet context={{ tour, isAdmin: isTourAdmin, currentUser, refetchTour }} />

      {/* Decline Invite Modal */}
      <DeclineInviteModal
        isOpen={showDeclineModal}
        tour={tour}
        onClose={() => setShowDeclineModal(false)}
        onConfirmDecline={() => {
          setShowDeclineModal(false);
          rejectInviteMutation.mutate();
        }}
        isDeclining={rejectInviteMutation.isPending}
      />
    </>
  );
}

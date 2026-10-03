import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toursApi } from '@/services/api.js';
import { useTour } from '@/context/TourContext.jsx';
import { useNotification } from '@/context/NotificationContext.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import MembersTab from '../components/MembersTab.jsx';
import InviteMemberModal from '../components/InviteMemberModal.jsx';
import RemoveMemberModal from '../components/RemoveMemberModal.jsx';
import DeclineInviteModal from '../components/DeclineInviteModal.jsx';
import MemberProfileModal from '../components/MemberProfileModal.jsx';

export default function TourMembers() {
  const { tour, isAdmin, currentUser, refetchTour } = useOutletContext();
  const { acceptInvite, rejectInvite, refreshTours } = useTour();
  const { refreshNotifications } = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // Invite Member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: (data) => toursApi.inviteMember(tour.id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tour-details', tour.id] });
      refreshTours();
      toastr.success(res.data?.message || 'User invited successfully.');
      setIsInviteModalOpen(false);
      setInviteError(null);
      refetchTour();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to send invite.';
      setInviteError(msg);
      toastr.error(msg);
    },
  });

  // Remove Member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (membershipId) => toursApi.removeMember(tour.id, membershipId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tour-details', tour.id] });
      refreshTours();
      toastr.success(res.data?.message || 'Member removed successfully.');
      setMemberToRemove(null);
      refetchTour();
    },
    onError: (err) => {
      toastr.error(err.response?.data?.message || 'Failed to remove member.');
    },
  });

  // Accept Invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: () => acceptInvite(tour.id),
    onSuccess: () => {
      refreshNotifications();
      refetchTour();
    },
  });

  // Reject / Decline Invite mutation
  const rejectInviteMutation = useMutation({
    mutationFn: () => rejectInvite(tour.id),
    onSuccess: () => {
      refreshNotifications();
      setShowDeclineModal(false);
      navigate('/tours');
    },
  });

  return (
    <>
      <MembersTab
        tour={tour}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onOpenInviteModal={() => {
          setInviteError(null);
          setIsInviteModalOpen(true);
        }}
        onRemoveMember={(m) => setMemberToRemove(m)}
        onAcceptInvite={() => acceptInviteMutation.mutate()}
        onRejectInvite={() => setShowDeclineModal(true)}
        onViewProfile={(m) => setSelectedProfileUser(m)}
        isActionPending={
          inviteMemberMutation.isPending ||
          removeMemberMutation.isPending ||
          acceptInviteMutation.isPending ||
          rejectInviteMutation.isPending
        }
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        tourId={tour.id}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteError(null);
        }}
        onInvite={(payload) => inviteMemberMutation.mutate(payload)}
        isPending={inviteMemberMutation.isPending}
        error={inviteError}
      />

      {/* Member Profile Modal */}
      <MemberProfileModal
        isOpen={Boolean(selectedProfileUser)}
        user={selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
      />

      {/* Remove Member Modal (No native confirm) */}
      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        member={memberToRemove}
        tour={tour}
        onClose={() => setMemberToRemove(null)}
        onConfirmRemove={(m) => removeMemberMutation.mutate(m.membership_id || m.id)}
        isRemoving={removeMemberMutation.isPending}
      />

      {/* Decline Invitation Modal (No native confirm) */}
      <DeclineInviteModal
        isOpen={showDeclineModal}
        tour={tour}
        onClose={() => setShowDeclineModal(false)}
        onConfirmDecline={() => rejectInviteMutation.mutate()}
        isDeclining={rejectInviteMutation.isPending}
      />
    </>
  );
}

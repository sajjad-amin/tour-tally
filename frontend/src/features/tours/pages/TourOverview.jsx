import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toursApi } from '@/services/api.js';
import { useTour } from '@/context/TourContext.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import OverviewTab from '../components/OverviewTab.jsx';
import EditTourModal from '../components/EditTourModal.jsx';
import DeleteTourModal from '../components/DeleteTourModal.jsx';
import MemberProfileModal from '../components/MemberProfileModal.jsx';

export default function TourOverview() {
  const { tour, isAdmin, refetchTour } = useOutletContext();
  const { deleteTour } = useTour();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editError, setEditError] = useState(null);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);

  // Update Tour mutation
  const updateTourMutation = useMutation({
    mutationFn: (data) => toursApi.update(tour.id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(['tour-details', tour.id], res.data?.tour);
      queryClient.invalidateQueries({ queryKey: ['user-tours'] });
      toastr.success(res.data?.message || 'Tour updated successfully!');
      setIsEditModalOpen(false);
      setEditError(null);
      refetchTour();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update tour.';
      setEditError(msg);
      toastr.error(msg);
    },
  });

  // Delete Tour mutation using centralized TourContext
  const deleteTourMutation = useMutation({
    mutationFn: () => deleteTour(tour.id),
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      navigate('/tours');
    },
  });

  return (
    <>
      <OverviewTab
        tour={tour}
        isAdmin={isAdmin}
        onOpenEditModal={() => {
          setEditError(null);
          setIsEditModalOpen(true);
        }}
        onDeleteTour={() => setIsDeleteModalOpen(true)}
        onViewOrganizerProfile={(creator) => setSelectedOrganizer(creator)}
        isDeleting={deleteTourMutation.isPending}
      />

      {/* Member Profile Modal for Organizer */}
      <MemberProfileModal
        isOpen={Boolean(selectedOrganizer)}
        user={selectedOrganizer ? { ...selectedOrganizer, is_creator: true, role: 'creator', status: 'joined' } : null}
        onClose={() => setSelectedOrganizer(null)}
      />

      {/* Edit Tour Modal */}
      <EditTourModal
        isOpen={isEditModalOpen}
        tour={tour}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditError(null);
        }}
        onUpdate={(payload) => updateTourMutation.mutate(payload)}
        isPending={updateTourMutation.isPending}
        error={editError}
      />

      {/* Delete Tour Modal (No native confirm) */}
      <DeleteTourModal
        isOpen={isDeleteModalOpen}
        tour={tour}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={() => deleteTourMutation.mutate()}
        isDeleting={deleteTourMutation.isPending}
      />
    </>
  );
}

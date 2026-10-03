import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, settingsApi } from '@/services/api.js';
import { useAuth } from '@/context/AuthContext.jsx';
import PageHeader from '@/components/UI/PageHeader.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import ServerPoliciesCard from '../components/ServerPoliciesCard.jsx';
import UsersToolbar from '../components/UsersToolbar.jsx';
import UsersTable from '../components/UsersTable.jsx';
import UsersPagination from '../components/UsersPagination.jsx';
import CreateUserModal from '../components/CreateUserModal.jsx';
import DeleteUserModal from '../components/DeleteUserModal.jsx';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search, filter, sorting & pagination state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormError, setCreateFormError] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // 1. Fetch Users Query with pagination, sorting & search
  const {
    data: usersData = { users: [], meta: { current_page: 1, last_page: 1, total: 0, from: 0, to: 0, per_page: 10 } },
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-users', { search, roleFilter, sortBy, sortDir, page, perPage }],
    queryFn: async () => {
      const res = await usersApi.getAll({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: perPage,
      });
      return {
        users: res.data?.users ?? [],
        meta: res.data?.meta ?? {
          current_page: 1,
          last_page: 1,
          total: res.data?.users?.length ?? 0,
          from: res.data?.users?.length ? 1 : 0,
          to: res.data?.users?.length ?? 0,
          per_page: perPage,
        },
      };
    },
  });

  const users = usersData.users;
  const meta = usersData.meta;

  // 2. Fetch Settings Query
  const {
    data: isRegistrationOpen = true,
    isLoading: isSettingsLoading,
  } = useQuery({
    queryKey: ['admin-settings-registration'],
    queryFn: async () => {
      const res = await settingsApi.getAdminSettings();
      return Boolean(res.data?.settings?.is_registration_open ?? true);
    },
  });

  // 3. Toggle Registration Mutation
  const toggleRegistrationMutation = useMutation({
    mutationFn: () => settingsApi.toggleRegistration(),
    onSuccess: (res) => {
      queryClient.setQueryData(
        ['admin-settings-registration'],
        res.data?.is_registration_open
      );
      toastr.success(res.data?.message || 'Registration setting updated.');
    },
    onError: (err) => {
      toastr.error(err.response?.data?.message || 'Failed to toggle registration.');
    },
  });

  // 4. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toastr.success('User created successfully (email verification bypassed).');
      setIsCreateModalOpen(false);
      setCreateFormError(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create user.';
      setCreateFormError(msg);
      toastr.error(msg);
    },
  });

  // 5. Delete User Mutation with CONFIRM DELETE verification
  const deleteUserMutation = useMutation({
    mutationFn: ({ id, confirmation }) => usersApi.delete(id, { confirmation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toastr.success('User deleted successfully.');
      setUserToDelete(null);
      setDeleteError(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to delete user.';
      setDeleteError(msg);
      toastr.error(msg);
    },
  });

  // Column Sort handler
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleOpenDeleteModal = (u) => {
    if (u.id === currentUser?.id) {
      toastr.warning('You cannot delete your own logged-in account.');
      return;
    }
    setDeleteError(null);
    setUserToDelete(u);
  };

  const handleConfirmDelete = (u, confirmation) => {
    deleteUserMutation.mutate({ id: u.id, confirmation });
  };

  return (
    <>
      <PageHeader
        title="User & Server Administration"
        subtitle="Manage registered explorer accounts, Server Admin roles, and system registration policies."
      >
        <button
          className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={() => {
            setCreateFormError(null);
            setIsCreateModalOpen(true);
          }}
        >
          <i className="bi bi-person-plus-fill"></i>
          <span>Create User</span>
        </button>
      </PageHeader>

      {/* ── System Policies & Registration Card ────────────────────────── */}
      <ServerPoliciesCard
        isRegistrationOpen={isRegistrationOpen}
        isSettingsLoading={isSettingsLoading}
        onToggleRegistration={() => toggleRegistrationMutation.mutate()}
        isToggling={toggleRegistrationMutation.isPending}
      />

      {/* ── Users List Card ────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-secondary-subtle py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-people me-1"></i>
            <span>Registered System Users</span>
            <span className="badge bg-secondary-subtle text-secondary-emphasis border">
              {meta.total ?? users.length}
            </span>
          </h6>

          <UsersToolbar
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            roleFilter={roleFilter}
            onRoleFilterChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
            onRefresh={() => refetchUsers()}
          />
        </div>

        <div className="card-body p-0">
          <UsersTable
            users={users}
            isLoading={isUsersLoading}
            currentUser={currentUser}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onDeleteClick={handleOpenDeleteModal}
          />
        </div>

        <UsersPagination
          meta={meta}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(val) => {
            setPerPage(val);
            setPage(1);
          }}
        />
      </div>

      {/* ── Create User Modal ──────────────────────────────────────────── */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateFormError(null);
        }}
        onCreate={(payload) => createUserMutation.mutate(payload)}
        isPending={createUserMutation.isPending}
        formError={createFormError}
      />

      {/* ── Delete User Confirmation Modal (CONFIRM DELETE) ─────────────── */}
      <DeleteUserModal
        isOpen={Boolean(userToDelete)}
        user={userToDelete}
        onClose={() => {
          setUserToDelete(null);
          setDeleteError(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={deleteUserMutation.isPending}
        error={deleteError}
      />
    </>
  );
}

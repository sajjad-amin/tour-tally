import { useState, useEffect } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext.jsx';
import { profileApi, usersApi } from '@/services/api.js';
import PageHeader from '@/components/UI/PageHeader.jsx';
import toastr from '@/services/toastr.js';

// Modular Components
import ProfileOverviewCard from '../components/ProfileOverviewCard.jsx';
import ProfileInfoForm from '../components/ProfileInfoForm.jsx';
import ProfilePasswordForm from '../components/ProfilePasswordForm.jsx';
import ProfileDangerZone from '../components/ProfileDangerZone.jsx';
import DeleteAccountModal from '../components/DeleteAccountModal.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const { id: paramUserId } = useParams();
  const isAdminEdit = Boolean(paramUserId);

  const queryClient = useQueryClient();
  const { user: authUser, refetchUser, purgeAuth } = useAuth();

  // If in admin edit mode, fetch the target user's details
  const {
    data: targetUserData,
    isLoading: isTargetUserLoading,
    refetch: refetchTargetUser,
  } = useQuery({
    queryKey: ['admin-user', paramUserId],
    queryFn: async () => {
      const res = await usersApi.get(paramUserId);
      return res.data?.user;
    },
    enabled: isAdminEdit,
    retry: 1,
  });

  const user = isAdminEdit ? targetUserData : authUser;
  const isPageLoading = isAdminEdit && isTargetUserLoading;

  // Personal Info & Admin details state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [phone, setPhone] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [messengerLink, setMessengerLink] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Sync state when user object changes
  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setRole(
        user.roles?.includes('Server Admin') || user.role === 'admin'
          ? 'Server Admin'
          : 'User'
      );
      setPhone(user.phone ?? user.metadata?.phone ?? '');
      setWhatsappLink(user.whatsapp_link ?? user.metadata?.whatsapp_link ?? '');
      setMessengerLink(user.messenger_link ?? user.metadata?.messenger_link ?? '');
      setEmailVerified(Boolean(user.email_verified_at));
    }
  }, [user]);

  // Handle Personal Info Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      if (isAdminEdit) {
        const payload = {
          name,
          email,
          role,
          phone: phone || null,
          whatsapp_link: whatsappLink || null,
          messenger_link: messengerLink || null,
          email_verified: emailVerified,
        };

        const res = await usersApi.update(paramUserId, payload);
        toastr.success(res.data?.message || 'User profile updated successfully.');
        queryClient.setQueryData(['admin-user', paramUserId], res.data.user);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        await refetchTargetUser();
      } else {
        const res = await profileApi.updateProfile({
          name,
          phone: phone || null,
          whatsapp_link: whatsappLink || null,
          messenger_link: messengerLink || null,
        });

        toastr.success(res.data?.message || 'Profile updated successfully.');
        queryClient.setQueryData(['auth-user'], res.data.user);
        await refetchUser();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile. Please verify your inputs.';
      setProfileError(msg);
      toastr.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const hasPassword = Boolean(user?.has_password);

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);

    if (password !== passwordConfirmation) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      if (isAdminEdit) {
        // Admin setting password for user does not require current password
        const res = await usersApi.update(paramUserId, { password });
        toastr.success(res.data?.message || 'Password updated for user successfully.');
        setPassword('');
        setPasswordConfirmation('');
        queryClient.invalidateQueries({ queryKey: ['admin-user', paramUserId] });
        await refetchTargetUser();
      } else {
        const payload = {
          password,
          password_confirmation: passwordConfirmation,
        };

        if (hasPassword) {
          payload.current_password = currentPassword;
        }

        const res = await profileApi.updatePassword(payload);

        toastr.success(res.data?.message || (hasPassword ? 'Password changed successfully.' : 'Password set successfully!'));
        setCurrentPassword('');
        setPassword('');
        setPasswordConfirmation('');
        queryClient.setQueryData(['auth-user'], res.data.user);
        await refetchUser();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password. Please check your inputs.';
      setPasswordError(msg);
      toastr.error(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async (payload) => {
    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      if (isAdminEdit) {
        if (paramUserId === authUser?.id) {
          toastr.warning('You cannot delete your own logged-in account.');
          return;
        }

        await usersApi.delete(paramUserId, payload);
        toastr.success(`User "${user?.name || 'Account'}" deleted successfully.`);
        setShowDeleteModal(false);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        navigate('/users');
      } else {
        const res = await profileApi.deleteAccount(payload);

        toastr.success(res.data?.message || 'Your account has been deleted successfully.');
        setShowDeleteModal(false);

        // Purge auth state and redirect to login
        purgeAuth();
        window.location.replace('/login?deleted=1');
      }
    } catch (err) {
      const responseData = err.response?.data;
      const msg =
        responseData?.errors?.confirmation?.[0] ||
        responseData?.errors?.email_confirmation?.[0] ||
        responseData?.errors?.password?.[0] ||
        responseData?.message ||
        err.message ||
        'Failed to delete account. Please verify your input.';
      setDeleteError(msg);
      toastr.error(msg);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Loading state
  if (isPageLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading user profile…</span>
        </div>
      </div>
    );
  }

  // Not found fallback for admin mode
  if (isAdminEdit && !isTargetUserLoading && !targetUserData) {
    return (
      <div className="card shadow-sm border-0 p-5 text-center my-4">
        <i className="bi bi-person-x fs-1 text-danger mb-3"></i>
        <h4 className="fw-bold">User Not Found</h4>
        <p className="text-muted small mb-4">
          The requested user account could not be found or may have been deleted.
        </p>
        <div>
          <NavLink to="/users" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>Back to Users List
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAdminEdit && (
        <div className="d-flex align-items-center justify-content-between mb-3">
          <NavLink
            to="/users"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 shadow-sm"
          >
            <i className="bi bi-arrow-left"></i>
            <span>Back to Users List</span>
          </NavLink>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
            <i className="bi bi-shield-lock-fill me-1"></i>Server Admin Management
          </span>
        </div>
      )}

      <PageHeader
        title={isAdminEdit ? `User Management: ${user?.name || 'Explorer'}` : 'User Profile & Settings'}
        subtitle={
          isAdminEdit
            ? `Administer account details, communication links, access roles, and security credentials for ${user?.email || 'this user'}.`
            : 'Manage your personal contact info, communication channels, and account security.'
        }
      />

      <div className="row g-4">
        {/* Profile Overview Card (Sidebar) */}
        <ProfileOverviewCard
          user={user}
          phone={phone}
          whatsappLink={whatsappLink}
          messengerLink={messengerLink}
        />

        {/* Profile Edit Forms */}
        <div className="col-12 col-lg-8">
          <ProfileInfoForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            role={role}
            setRole={setRole}
            phone={phone}
            setPhone={setPhone}
            whatsappLink={whatsappLink}
            setWhatsappLink={setWhatsappLink}
            messengerLink={messengerLink}
            setMessengerLink={setMessengerLink}
            emailVerified={emailVerified}
            setEmailVerified={setEmailVerified}
            isAdminEdit={isAdminEdit}
            onSubmit={handleProfileSubmit}
            isSaving={isSavingProfile}
            error={profileError}
          />

          <ProfilePasswordForm
            hasPassword={hasPassword}
            isAdminEdit={isAdminEdit}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            password={password}
            setPassword={setPassword}
            passwordConfirmation={passwordConfirmation}
            setPasswordConfirmation={setPasswordConfirmation}
            onSubmit={handlePasswordSubmit}
            isSaving={isSavingPassword}
            error={passwordError}
          />

          <ProfileDangerZone
            user={user}
            currentUser={authUser}
            isAdminEdit={isAdminEdit}
            onOpenDeleteModal={() => {
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
          />
        </div>
      </div>

      {/* Reusable Delete Confirmation Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteError(null);
        }}
        user={user}
        authUser={authUser}
        isAdminEdit={isAdminEdit}
        hasPassword={hasPassword}
        onConfirmDelete={handleDeleteAccount}
        isDeleting={isDeletingAccount}
        error={deleteError}
      />
    </>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, getCsrfCookie } from '@/services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => {
    // Check if auth_token was passed in URL query (e.g. Google OAuth redirect)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('auth_token');
      if (tokenFromUrl) {
        localStorage.setItem('auth_token', tokenFromUrl);
        localStorage.setItem('logged_in', 'true');
        params.delete('auth_token');
        const cleanSearch = params.toString() ? `?${params.toString()}` : '';
        const cleanUrl = window.location.pathname + cleanSearch + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
      }
    }
    return Boolean(localStorage.getItem('auth_token') || localStorage.getItem('logged_in'));
  });

  const purgeAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('logged_in');
    setHasToken(false);
    queryClient.setQueryData(['auth-user'], null);
    queryClient.removeQueries({ queryKey: ['auth-user'] });
    queryClient.clear();
  };

  const {
    data: userData,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const response = await authApi.user();
        return response.data?.user ?? response.data;
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 419) {
          purgeAuth();
          return null;
        }
        throw err;
      }
    },
    enabled: hasToken,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    const handleSessionExpired = () => {
      purgeAuth();
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session_expired', handleSessionExpired);
  }, [queryClient]);

  const user = hasToken ? userData ?? null : null;
  const isLoading = hasToken && isUserLoading;
  const isAuthenticated = Boolean(user);
  const isVerified = Boolean(user?.email_verified_at);

  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'Server Admin' ||
    (Array.isArray(user?.roles) &&
      (user.roles.includes('Server Admin') || user.roles.includes('admin')));

  const hasRole = (roleName) => {
    if (isAdmin) return true;
    return Array.isArray(user?.roles) && user.roles.includes(roleName);
  };

  const hasPermission = (permName) => {
    if (isAdmin) return true;
    return Array.isArray(user?.permissions) && user.permissions.includes(permName);
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      await getCsrfCookie();
      const response = await authApi.login(credentials);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('logged_in', 'true');
      if (data?.token) {
        localStorage.setItem('auth_token', data.token);
      }
      setHasToken(true);
      const resolvedUser = data?.user ?? null;
      if (resolvedUser) {
        queryClient.setQueryData(['auth-user'], resolvedUser);
      } else {
        queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (formData) => {
      await getCsrfCookie();
      const response = await authApi.register(formData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem('logged_in', 'true');
        localStorage.setItem('auth_token', data.token);
        setHasToken(true);
        const resolvedUser = data?.user ?? null;
        if (resolvedUser) {
          queryClient.setQueryData(['auth-user'], resolvedUser);
        } else {
          queryClient.invalidateQueries({ queryKey: ['auth-user'] });
        }
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // continue clearing state
      }
    },
    onSuccess: () => {
      purgeAuth();
    },
  });

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isVerified,
    isAdmin,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
    hasRole,
    hasPermission,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refetchUser,
    purgeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

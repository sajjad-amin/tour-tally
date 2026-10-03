import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext.jsx';
import { settingsApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, isLoggingIn } = useAuth();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [isFreshSetup, setIsFreshSetup] = useState(false);

  const googleAuthUrl = `${import.meta.env.VITE_APP_URL || 'http://localhost:8000'}/api/auth/google/redirect`;

  useEffect(() => {
    let isMounted = true;

    // Fetch public settings for fresh setup indicator
    settingsApi
      .getPublicSettings()
      .then((res) => {
        if (isMounted) {
          setIsFreshSetup(Boolean(res.data?.is_fresh_setup));
        }
      })
      .catch(() => {});

    // Check query params for status/errors
    const errorParam = searchParams.get('error');
    const verifiedParam = searchParams.get('verified');
    const verifyNoticeParam = searchParams.get('verify_notice');
    const deletedParam = searchParams.get('deleted');

    if (deletedParam === '1') {
      const msg = 'Your account has been deleted successfully.';
      setSuccessNotice(msg);
      toastr.success(msg);
      searchParams.delete('deleted');
    }

    if (errorParam) {
      if (errorParam === 'registration_closed') {
        const msg = 'Registration is currently disabled by the Server Admin.';
        setError(msg);
        toastr.warning(msg);
      } else if (errorParam === 'auth_failed') {
        const msg = 'Google authentication failed. Please try again.';
        setError(msg);
        toastr.error(msg);
      } else if (errorParam === 'auth_cancelled') {
        toastr.info('Google sign-in was cancelled.');
      } else if (errorParam === 'no_email_provided') {
        const msg = 'No email address was provided by your Google account.';
        setError(msg);
        toastr.error(msg);
      } else {
        const msg = `Authentication error: ${errorParam}`;
        setError(msg);
        toastr.error(msg);
      }
      searchParams.delete('error');
    }

    if (verifiedParam === '1') {
      toastr.success('Your email has been verified! You can now sign in.');
      searchParams.delete('verified');
    } else if (verifiedParam === 'already') {
      toastr.info('Your email was already verified. Please sign in.');
      searchParams.delete('verified');
    }

    if (verifyNoticeParam) {
      toastr.info('Please check your email and verify your account before signing in.');
      searchParams.delete('verify_notice');
    }

    if (errorParam || verifiedParam || verifyNoticeParam || deletedParam) {
      setSearchParams(searchParams, { replace: true });
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email: loginIdentifier, password });
      toastr.success('Welcome back to TourTally!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please verify your details.';
      setError(msg);
      toastr.error(msg);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="fw-bold">Sign In to TourTally</h3>
        <p className="text-muted small">Access your tour expenses and group split tallies</p>
      </div>

      {successNotice && (
        <div className="alert alert-success py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-check-circle-fill flex-shrink-0 text-success"></i>
          <div>{successNotice}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Google OAuth Login Button */}
      <a
        href={googleAuthUrl}
        id="google-login-btn"
        className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-medium shadow-sm mb-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        <span>Continue with Google</span>
      </a>

      <div className="d-flex align-items-center my-3">
        <hr className="flex-grow-1 my-0 text-muted opacity-25" />
        <span className="px-3 small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
          Or sign in with email
        </span>
        <hr className="flex-grow-1 my-0 text-muted opacity-25" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="login-identifier">
            Email or Username
          </label>
          <input
            type="text"
            id="login-identifier"
            className="form-control"
            placeholder="Enter email or username"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label small fw-semibold mb-0" htmlFor="login-password">
              Password
            </label>
            <NavLink to="/forgot-password" className="small text-decoration-none text-success">
              Forgot password?
            </NavLink>
          </div>
          <input
            type="password"
            id="login-password"
            className="form-control"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-success w-100 py-2 fw-semibold shadow-sm mb-3"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {isFreshSetup && (
          <div className="alert alert-secondary py-2 px-3 small text-muted text-center mb-3">
            <span className="fw-semibold">Default Admin:</span> <code>admin</code> / <code>password</code>
          </div>
        )}

        <div className="text-center small text-muted">
          Don't have an account?{' '}
          <NavLink to="/register" className="fw-semibold text-decoration-none text-success">
            Create account
          </NavLink>
        </div>
      </form>
    </div>
  );
}

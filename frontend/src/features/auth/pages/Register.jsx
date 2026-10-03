import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext.jsx';
import { settingsApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { register, isRegistering } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const googleAuthUrl = `${import.meta.env.VITE_APP_URL || 'http://localhost:8000'}/api/auth/google/redirect`;

  useEffect(() => {
    let isMounted = true;

    // Check URL parameters for errors (e.g. from Google OAuth callback)
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'registration_closed') {
        const msg = 'Registration is currently disabled by the Server Admin.';
        setError(msg);
        toastr.warning(msg);
        setIsRegistrationOpen(false);
      } else if (errorParam === 'auth_failed') {
        const msg = 'Google sign-up failed. Please try again.';
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

      // Clear query params from URL
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }

    settingsApi
      .getPublicSettings()
      .then((res) => {
        if (isMounted) {
          setIsRegistrationOpen(res.data?.is_registration_open ?? true);
        }
      })
      .catch(() => {
        // Fallback to open unless server explicitly forbids
      })
      .finally(() => {
        if (isMounted) setCheckingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (res?.requires_verification) {
        setVerificationSent(true);
        toastr.success(res.message || 'Please check your email to verify your account.');
      } else {
        toastr.success('Account created successfully! Welcome to TourTally.');
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setIsRegistrationOpen(false);
        const msg = err.response?.data?.message || 'User registration is currently closed by the Server Administrator.';
        setError(msg);
        toastr.error(msg);
      } else {
        const msg = err.response?.data?.message || 'Registration failed. Please check your inputs.';
        setError(msg);
        toastr.error(msg);
      }
    }
  };

  if (checkingSettings) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Checking server settings…</span>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="text-center">
        <i className="bi bi-shield-lock-fill fs-1 text-warning mb-3 d-block"></i>
        <h4 className="fw-bold mb-2">Registration Closed</h4>
        <p className="text-muted small mb-4">
          Public user registration is currently disabled by the Server Administrator. If you need an account, please contact the server administrator directly.
        </p>
        <NavLink to="/login" className="btn btn-outline-success w-100 py-2 fw-semibold">
          Return to Login
        </NavLink>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="text-center py-2">
        <div className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center p-3 mb-3">
          <i className="bi bi-envelope-check-fill fs-1"></i>
        </div>
        <h4 className="fw-bold mb-2">Verify Your Email</h4>
        <p className="text-muted small mb-4">
          We have sent a verification link to <strong>{email}</strong>. Please check your inbox (and spam folder) and click the link to activate your account.
        </p>
        <NavLink to="/login" className="btn btn-success w-100 py-2 fw-semibold shadow-sm">
          Proceed to Sign In
        </NavLink>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="fw-bold">Create TourTally Account</h3>
        <p className="text-muted small">Join and start tracking your tour expenses</p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Google OAuth Registration Button */}
      <a
        href={googleAuthUrl}
        id="google-register-btn"
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
          Or register with email
        </span>
        <hr className="flex-grow-1 my-0 text-muted opacity-25" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="register-name">
            Full Name
          </label>
          <input
            type="text"
            id="register-name"
            className="form-control"
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="register-email">
            Email Address
          </label>
          <input
            type="email"
            id="register-email"
            className="form-control"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="register-password">
            Password
          </label>
          <input
            type="password"
            id="register-password"
            className="form-control"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="register-password-confirmation">
            Confirm Password
          </label>
          <input
            type="password"
            id="register-password-confirmation"
            className="form-control"
            placeholder="Confirm password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-success w-100 py-2 fw-semibold shadow-sm mb-3"
          disabled={isRegistering}
        >
          {isRegistering ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="text-center small text-muted">
          Already have an account?{' '}
          <NavLink to="/login" className="fw-semibold text-decoration-none text-success">
            Sign In
          </NavLink>
        </div>
      </form>
    </div>
  );
}

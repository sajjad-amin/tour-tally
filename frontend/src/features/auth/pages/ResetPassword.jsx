import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing password reset token. Please request a new password reset link.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setIsSuccess(true);
      toastr.success(res.data?.message || 'Password reset successfully! You can now sign in.');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.password?.[0] ||
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        'Failed to reset password. The reset link may have expired or is invalid.';
      setError(msg);
      toastr.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <div
          className="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3 shadow-sm"
          style={{ width: '56px', height: '56px' }}
        >
          <i className="bi bi-shield-lock-fill fs-3"></i>
        </div>
        <h3 className="fw-bold">Create New Password</h3>
        <p className="text-muted small">
          Please enter your email and set a new password for your account.
        </p>
      </div>

      {!token && (
        <div className="alert alert-warning py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
          <div>
            Invalid or missing reset token.{' '}
            <NavLink to="/forgot-password" className="alert-link text-decoration-none fw-semibold">
              Request a new reset link
            </NavLink>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      {isSuccess ? (
        <div className="text-center py-3">
          <div className="alert alert-success border-0 py-3 px-3 mb-4 text-start">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <strong className="text-success">Password Reset Complete</strong>
            </div>
            <p className="small mb-0 text-success-emphasis">
              Your password has been reset successfully. You can now use your new password to sign in.
            </p>
          </div>

          <div className="d-grid gap-2">
            <NavLink to="/login" className="btn btn-success py-2 fw-semibold shadow-sm">
              Sign In Now
            </NavLink>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold" htmlFor="reset-email">
              Email Address
            </label>
            <input
              type="email"
              id="reset-email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold" htmlFor="reset-password">
              New Password
            </label>
            <input
              type="password"
              id="reset-password"
              className="form-control"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold" htmlFor="reset-password-confirmation">
              Confirm New Password
            </label>
            <input
              type="password"
              id="reset-password-confirmation"
              className="form-control"
              placeholder="Re-enter new password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success w-100 py-2 fw-semibold shadow-sm mb-3"
            disabled={isLoading || !token}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Resetting Password…
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="text-center small text-muted">
            Remembered your password?{' '}
            <NavLink to="/login" className="fw-semibold text-decoration-none text-success">
              Back to Sign In
            </NavLink>
          </div>
        </form>
      )}
    </div>
  );
}

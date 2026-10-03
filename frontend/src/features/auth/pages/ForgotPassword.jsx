import { useState } from 'react';
import { NavLink } from 'react-router';
import { authApi } from '@/services/api.js';
import toastr from '@/services/toastr.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword({ email });
      setIsSent(true);
      toastr.success(res.data?.message || 'Password reset link sent to your email.');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        'Failed to send password reset link. Please check your email and try again.';
      setError(msg);
      toastr.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle mb-3 shadow-sm" style={{ width: '56px', height: '56px' }}>
          <i className="bi bi-key-fill fs-3"></i>
        </div>
        <h3 className="fw-bold">Forgot Password?</h3>
        <p className="text-muted small">
          Enter your registered email address and we will send you a password reset link.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      {isSent ? (
        <div className="text-center py-3">
          <div className="alert alert-success border-0 py-3 px-3 mb-4 text-start">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-envelope-check-fill text-success fs-5"></i>
              <strong className="text-success">Check your email</strong>
            </div>
            <p className="small mb-0 text-success-emphasis">
              We have emailed a password reset link to <strong>{email}</strong>. Please check your inbox (and spam folder) and click the link to proceed.
            </p>
          </div>

          <div className="d-grid gap-2 mb-3">
            <button
              type="button"
              className="btn btn-outline-success py-2 fw-medium"
              onClick={() => {
                setIsSent(false);
              }}
            >
              <i className="bi bi-arrow-repeat me-1"></i> Send Another Link
            </button>
            <NavLink to="/login" className="btn btn-secondary py-2 fw-medium">
              Back to Sign In
            </NavLink>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold" htmlFor="forgot-email">
              Email Address
            </label>
            <input
              type="email"
              id="forgot-email"
              className="form-control"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-success w-100 py-2 fw-semibold shadow-sm mb-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Sending Reset Link…
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <div className="text-center small text-muted">
            Remember your password?{' '}
            <NavLink to="/login" className="fw-semibold text-decoration-none text-success">
              Sign In
            </NavLink>
          </div>
        </form>
      )}
    </div>
  );
}

import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/context/AuthContext.jsx';

/**
 * AdminRoute — Guard that restricts access exclusively to Server Admin.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-body-tertiary">
        <div className="text-center">
          <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted small fw-medium">Verifying administrator privileges…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0 text-center p-4">
              <div className="card-body">
                <i className="bi bi-shield-x fs-1 text-danger mb-3"></i>
                <h4 className="fw-bold text-danger">Access Restricted</h4>
                <p className="text-muted small mb-4">
                  Server Administrator privileges are required to access this area. Your current account does not have sufficient permissions.
                </p>
                <a href="/dashboard" className="btn btn-outline-secondary btn-sm">
                  Return to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

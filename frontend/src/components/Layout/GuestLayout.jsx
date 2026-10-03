import { Outlet, NavLink, useLocation } from 'react-router';
import ThemeToggle from './ThemeToggle.jsx';
import BrandLogo from '@/components/UI/BrandLogo.jsx';

/**
 * GuestLayout — unauthenticated pages wrapper.
 *
 * Matches reference project guest layout:
 * - Navbar with brand + Login/Register links + theme toggle
 * - Centered auth card: border-0 shadow-lg rounded-4 overflow-hidden
 * - bg-body-tertiary page background
 */
export default function GuestLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-vh-100 bg-body-tertiary d-flex flex-column">
      {/* Guest navbar */}
      <nav className="navbar navbar-expand-lg bg-body shadow-sm mb-4">
        <div className="container">
          <NavLink className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
            <BrandLogo size={30} className="shadow-sm" />
            <span>TourTally</span>
          </NavLink>
          <button
            className="navbar-toggler border-0 shadow-none"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#guestNavbar"
            aria-controls="guestNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="guestNavbar">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-2">
              <li className="nav-item">
                <NavLink
                  className={`nav-link ${pathname === '/login' ? 'active fw-semibold' : ''}`}
                  to="/login"
                >
                  Login
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={`nav-link ${pathname === '/register' ? 'active fw-semibold' : ''}`}
                  to="/register"
                >
                  Register
                </NavLink>
              </li>
              <li className="nav-item ms-lg-2">
                <ThemeToggle />
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Auth card content */}
      <div className="container my-auto py-3">
        <div className="row justify-content-center">
          <div className="col-11 col-sm-9 col-md-6 col-lg-5 col-xl-4 mx-auto" style={{ maxWidth: '440px' }}>
            <div className="card border-0 shadow rounded-4 overflow-hidden">
              <div className="card-body p-4">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-muted small mt-auto">
        &copy; {new Date().getFullYear()} TourTally &bull; Open-source Tour Expense Tracker
      </footer>
    </div>
  );
}

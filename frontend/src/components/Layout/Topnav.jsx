import { NavLink, useNavigate } from 'react-router';
import ThemeToggle from './ThemeToggle.jsx';
import NotificationDropdown from '@/features/notifications/components/NotificationDropdown.jsx';
import BrandLogo from '@/components/UI/BrandLogo.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import toastr from '@/services/toastr.js';

/**
 * Topnav — Bootstrap navbar matching reference pattern.
 *
 * Features:
 * - Sidebar offcanvas toggle button (mobile)
 * - Brand logo (SVG) with TourTally title
 * - Dark/light theme switch
 * - Notification bell dropdown with auto polling
 * - User dropdown with profile link + logout
 */
export default function Topnav() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut, purgeAuth } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    purgeAuth();
    toastr.info('You have logged out successfully.');
    window.location.replace('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body border-bottom shadow-sm sticky-top">
      <div className="container-fluid">
        {/* Sidebar Toggle (Mobile) */}
        <button
          className="navbar-toggler me-2 d-lg-none border-0 shadow-none"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarMenu"
          aria-controls="sidebarMenu"
          aria-label="Toggle sidebar"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Brand Logo */}
        <NavLink className="navbar-brand d-flex align-items-center gap-2 me-4" to="/dashboard">
          <BrandLogo size={32} className="shadow-sm" />
          <span className="h5 fw-bold mb-0 tracking-tight">TourTally</span>
        </NavLink>

        {/* Nav collapse toggler */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#topnavContent"
          aria-controls="topnavContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <i className="bi bi-three-dots-vertical"></i>
        </button>

        <div className="collapse navbar-collapse" id="topnavContent">
          {/* Right side items */}
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-2">
            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* Theme Toggle */}
            <li className="nav-item me-2">
              <ThemeToggle />
            </li>

            {/* User Dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center gap-2 py-1 px-2 rounded-3"
                href="#"
                id="userDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle fs-5"></i>
                <span className="fw-medium">{user?.name ?? 'Admin / User'}</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0" aria-labelledby="userDropdown">
                <li>
                  <NavLink className="dropdown-item d-flex align-items-center gap-2" to="/profile">
                    <i className="bi bi-person"></i>
                    <span>Profile</span>
                  </NavLink>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item text-danger d-flex align-items-center gap-2"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

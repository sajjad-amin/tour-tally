import { NavLink, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext.jsx';

/**
 * Sidebar — 280px offcanvas-lg matching reference architecture cleanly.
 *
 * Patterns:
 * - nav-pills flex-column with gap-1 spacing
 * - Accordion sections with Bootstrap collapse + bi-chevron-down
 * - Active state via NavLink className callback
 * - Role-based item visibility (admin only)
 * - Only active modules included: Dashboard, Tours & Trips, Profile, Administration
 */
export default function Sidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  /** Returns Bootstrap active/inactive class for a NavLink */
  const navCls = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : 'link-body-emphasis'}`;

  /** Checks if any path in a group is currently active (for auto-expand) */
  const isGroupActive = (...paths) =>
    paths.some((p) => location.pathname.startsWith(p));

  return (
    <div
      className="offcanvas-lg offcanvas-start bg-body shadow-sm border-end flex-shrink-0"
      tabIndex="-1"
      id="sidebarMenu"
      aria-labelledby="sidebarMenuLabel"
      style={{ width: '280px', minWidth: '280px' }}
    >
      {/* Mobile offcanvas header */}
      <div className="offcanvas-header border-bottom">
        <h5 className="offcanvas-title fw-bold" id="sidebarMenuLabel">
          TourTally Menu
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          data-bs-target="#sidebarMenu"
          aria-label="Close"
        ></button>
      </div>

      <div
        className="offcanvas-body d-flex flex-column p-3 h-100"
        style={{ minHeight: 'calc(100vh - 72px)' }}
      >
        <ul className="nav nav-pills flex-column mb-auto gap-1">
          {/* Administration Accordion (Server Admin only) */}
          {isAdmin && (
            <li className="nav-item">
              <a
                className={`nav-link d-flex align-items-center justify-content-between link-body-emphasis text-nowrap ${
                  isGroupActive('/users', '/admin') ? '' : 'collapsed'
                }`}
                data-bs-toggle="collapse"
                href="#collapse-admin"
                role="button"
                aria-expanded={isGroupActive('/users', '/admin') ? 'true' : 'false'}
                aria-controls="collapse-admin"
              >
                <span className="text-nowrap d-flex align-items-center">
                  <i className="bi bi-gear me-2"></i>Administration
                </span>
                <i className="bi bi-chevron-down small ms-1"></i>
              </a>
              <div
                className={`collapse ${
                  isGroupActive('/users', '/admin') ? 'show' : ''
                } mt-1 ps-3`}
                id="collapse-admin"
              >
                <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small d-flex flex-column gap-1">
                  <li>
                    <NavLink to="/users" className={navCls}>
                      <i className="bi bi-people me-2"></i>User Management
                    </NavLink>
                  </li>
                </ul>
              </div>
            </li>
          )}
          {/* Dashboard */}
          <li className="nav-item">
            <NavLink to="/dashboard" className={navCls}>
              <i className="bi bi-speedometer2 me-2"></i>Dashboard
            </NavLink>
          </li>

          {/* Tours & Trips */}
          <li className="nav-item">
            <NavLink to="/tours" className={navCls}>
              <i className="bi bi-compass me-2"></i>Tours &amp; Trips
            </NavLink>
          </li>
          {/* Show Profile menu if the profile page is rendered */}
          {location.pathname === '/profile' && (<li className="nav-item">
            <NavLink to="/profile" className={navCls}>
              <i className="bi bi-person-circle me-2"></i>Profile
            </NavLink>
          </li>)}
        </ul>
      </div>
    </div>
  );
}

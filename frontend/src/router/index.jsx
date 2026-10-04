import { createBrowserRouter, Navigate } from 'react-router';

// Guards
import ProtectedRoute from '@/components/Guards/ProtectedRoute.jsx';
import GuestRoute from '@/components/Guards/GuestRoute.jsx';
import AdminRoute from '@/components/Guards/AdminRoute.jsx';

// Layouts
import AppLayout from '@/components/Layout/AppLayout.jsx';
import GuestLayout from '@/components/Layout/GuestLayout.jsx';

// Pages
import Dashboard from '@/features/dashboard/pages/Dashboard.jsx';
import Login from '@/features/auth/pages/Login.jsx';
import Register from '@/features/auth/pages/Register.jsx';
import ForgotPassword from '@/features/auth/pages/ForgotPassword.jsx';
import ResetPassword from '@/features/auth/pages/ResetPassword.jsx';
import UserManagement from '@/features/users/pages/UserManagement.jsx';
import Profile from '@/features/profile/pages/Profile.jsx';
import Tours from '@/features/tours/pages/Tours.jsx';
import TourLayout from '@/features/tours/pages/TourLayout.jsx';
import TourOverview from '@/features/tours/pages/TourOverview.jsx';
import TourMembers from '@/features/tours/pages/TourMembers.jsx';
import TourExpenses from '@/features/tours/pages/TourExpenses.jsx';
import TourSettlements from '@/features/tours/pages/TourSettlements.jsx';
import Notifications from '@/features/notifications/pages/Notifications.jsx';

/**
 * TourTally Router Configuration
 * Using React Router v7+ data APIs.
 */
export const router = createBrowserRouter([
  // ─── Guest routes (redirect to /dashboard if already logged in) ───────────
  {
    element: <GuestRoute />,
    children: [
      {
        element: <GuestLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password', element: <ResetPassword /> },
        ],
      },
    ],
  },

  // ─── Authenticated routes ────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/tours', element: <Tours /> },
          {
            path: '/tours/:id',
            element: <TourLayout />,
            children: [
              { index: true, element: <TourOverview /> },
              { path: 'members', element: <TourMembers /> },
              { path: 'expenses', element: <TourExpenses /> },
              { path: 'settlements', element: <TourSettlements /> },
            ],
          },
          {
            path: '/expenses',
            element: (
              <div className="card shadow-sm border-0 p-4 text-center">
                <i className="bi bi-receipt-cutoff fs-1 text-warning mb-3"></i>
                <h4 className="fw-bold">Expense Ledger</h4>
                <p className="text-muted small">
                  Expense receipts, split allocations, and category management module.
                </p>
              </div>
            ),
          },
          {
            path: '/splits',
            element: (
              <div className="card shadow-sm border-0 p-4 text-center">
                <i className="bi bi-wallet2 fs-1 text-primary mb-3"></i>
                <h4 className="fw-bold">Split &amp; Settlements</h4>
                <p className="text-muted small">
                  Group settlement matrix and debt minimization calculator.
                </p>
              </div>
            ),
          },
          {
            path: '/profile',
            element: <Profile />,
          },
          {
            path: '/notifications',
            element: <Notifications />,
          },

          // ─── Server Admin Only Routes ──────────────────────────────────
          {
            element: <AdminRoute />,
            children: [
              { path: '/users', element: <UserManagement /> },
              { path: '/users/:id', element: <Profile /> },
              { path: '/admin/users', element: <Navigate to="/users" replace /> },
              { path: '/admin/users/:id', element: <Profile /> },
              { path: '/admin/settings', element: <Navigate to="/users" replace /> },
            ],
          },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

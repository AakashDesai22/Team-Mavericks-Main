import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Route Guard
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Login    from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Dashboard Pages
import ParticipantDashboard from './pages/ParticipantDashboard';

// Admin Operator Pages
import RegistrationsManager from './pages/admin/RegistrationsManager';
import SeatingDashboard from './pages/admin/SeatingDashboard';
import LiveGateCheckIn from './pages/admin/LiveGateCheckIn';
import CertificateDesigner from './pages/admin/CertificateDesigner';

// Presentation Pages
import PresentationHub from './pages/presentation/PresentationHub';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Application Router
 * ============================================================================
 *
 * Route structure:
 *   /login            → Public login page
 *   /register         → Public registration page
 *   /unauthorized     → 403 access denied page
 *
 *   /dashboard        → Role-aware dashboard (redirects by tier)
 *   /events           → Event listing (all authenticated users)
 *   /registrations    → Verification workflow (Admin, Member)
 *   /seating          → Seating grid manager (Admin, Member)
 *   /checkin          → Live check-in (Admin, Member)
 *   /presentation     → Theatrical reveal stage (Admin, Member)
 *   /audit-log        → Audit ledger (Admin only)
 *   /certificates     → Certificate builder (Admin only)
 *   /users            → User management (Admin only)
 */

// ---------------------------------------------------------------------------
// Placeholder components for pages not yet implemented.
// These will be replaced in subsequent phases.
// ---------------------------------------------------------------------------
function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="section-header">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </div>
      <div className="glass-card p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-brand-500/10 border border-brand-500/20 mb-4">
          <svg className="w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">
          This module is coming in a future phase.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smart Dashboard Redirect
// Routes /dashboard to the appropriate view based on user role.
// ---------------------------------------------------------------------------
function DashboardRedirect() {
  const { roleTier } = useAuth();

  // For now, all roles land on the ParticipantDashboard.
  // In future phases, Admin/Member will get dedicated operator dashboards.
  switch (roleTier) {
    case 'Admin':
    case 'Member':
    case 'Participant':
    default:
      return <ParticipantDashboard />;
  }
}

// ===========================================================================
// App Component
// ===========================================================================
export default function App() {
  return (
    <Routes>
      {/* ── Public Routes ────────────────────────────────────────────── */}
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Protected Routes (inside DashboardLayout) ────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard — role-aware redirect */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Events — all authenticated users */}
        <Route
          path="/events"
          element={
            <PlaceholderPage
              title="Events"
              description="Browse and manage symposium events."
            />
          }
        />

        {/* ── Operations (Admin + Member) ────────────────────────── */}
        <Route
          path="/registrations"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member']}>
              <RegistrationsManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seating"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member']}>
              <SeatingDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkin"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member']}>
              <LiveGateCheckIn />
            </ProtectedRoute>
          }
        />

        <Route
          path="/presentation"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Member']}>
              <PresentationHub />
            </ProtectedRoute>
          }
        />

        {/* ── Administration (Admin only) ────────────────────────── */}
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PlaceholderPage
                title="Audit Log"
                description="Forensic system activity ledger."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/certificates"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <CertificateDesigner />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PlaceholderPage
                title="User Management"
                description="Manage user accounts and role assignments."
              />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── Catch-all → redirect to dashboard ────────────────────────── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

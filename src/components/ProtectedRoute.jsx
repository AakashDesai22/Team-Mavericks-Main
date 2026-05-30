import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Protected Route Wrapper
 * ============================================================================
 *
 * Conditional route interceptor that evaluates authentication and role-tier
 * authorization before rendering child components.
 *
 * Props:
 *   children      — The component(s) to render if authorized.
 *   allowedRoles  — Optional string array of permitted role_tier values.
 *                   e.g., ['Admin', 'Member'].  If omitted, any
 *                   authenticated user is allowed.
 *
 * Behavior:
 *   • isLoading → render skeleton spinner (prevents flash of login page).
 *   • Not authenticated → redirect to /login (preserving intended URL).
 *   • Authenticated but wrong tier → redirect to /unauthorized.
 *   • Authorized → render children.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, roleTier } = useAuth();
  const location = useLocation();

  // -------------------------------------------------------------------------
  // Loading state — show a minimal branded spinner while the auth context
  // verifies the stored token on initial mount.
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-900 bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          {/* Pulsing brand logo mark */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500
                            animate-pulse-slow shadow-glow" />
            <div className="absolute inset-0 w-14 h-14 rounded-2xl
                            bg-gradient-to-br from-brand-500 to-violet-500
                            animate-ping opacity-20" />
          </div>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not authenticated → redirect to /login.
  // Preserve the current URL in state so we can redirect back after login.
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // -------------------------------------------------------------------------
  // Tier enforcement — if allowedRoles is specified and the user's role
  // is not in the list, redirect to the unauthorized page.
  // -------------------------------------------------------------------------
  if (allowedRoles.length > 0 && !allowedRoles.includes(roleTier)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // -------------------------------------------------------------------------
  // Authorized — render the protected content.
  // -------------------------------------------------------------------------
  return children;
}

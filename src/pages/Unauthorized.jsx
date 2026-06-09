import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 403 Unauthorized page — shown when a user's role_tier doesn't match
 * the required access level for a route.
 */
export default function Unauthorized() {
  const { roleTier } = useAuth();

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center animate-slide-up max-w-md">
        {/* Shield Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                        bg-rose-500/10 border-2 border-rose-500/25 mb-6">
          <svg className="w-10 h-10 text-rose-400" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Access Denied
        </h1>
        <p className="text-slate-400 text-sm mb-2">
          Your current role <span className="badge-role text-[10px] ml-1">{roleTier}</span>{' '}
          does not have permission to access this section.
        </p>
        <p className="text-slate-600 text-xs mb-8">
          Contact a system administrator if you believe this is an error.
        </p>

        <Link to="/dashboard" className="btn-primary">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicNavbar() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const isHome = location.pathname === '/';

  // Helper to determine the target link for sections
  const getSectionLink = (anchor) => {
    return isHome ? `#${anchor}` : `/#${anchor}`;
  };

  // Determine the dynamic Portal action button
  const renderPortalButton = () => {
    if (isAuthenticated) {
      return (
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold uppercase tracking-wider shadow-glow-sm transition-all duration-200"
        >
          Dashboard Workspace
        </Link>
      );
    }

    if (location.pathname === '/login') {
      return (
        <Link
          to="/register"
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold uppercase tracking-wider shadow-glow-sm transition-all duration-200"
        >
          Register Account
        </Link>
      );
    }

    if (location.pathname === '/register') {
      return (
        <Link
          to="/login"
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold uppercase tracking-wider shadow-glow-sm transition-all duration-200"
        >
          Sign In Portal
        </Link>
      );
    }

    // Default for Home or other pages
    return (
      <Link
        to="/login"
        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold uppercase tracking-wider shadow-glow-sm transition-all duration-200"
      >
        Access Portal
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Brand logo block */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow-glow-sm group-hover:scale-[1.03] transition-transform duration-200">
          <span className="text-white font-black text-lg">M</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none group-hover:text-brand-400 transition-colors duration-200">MAVERICKS</h1>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">Premium Event Hub</span>
        </div>
      </Link>

      {/* Navigation options */}
      <div className="flex items-center gap-6">
        <a 
          href={getSectionLink('events')} 
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors uppercase tracking-wider"
        >
          Events
        </a>
        <a 
          href={getSectionLink('team')} 
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors uppercase tracking-wider"
        >
          Team
        </a>
        <a 
          href={getSectionLink('contact')} 
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors uppercase tracking-wider"
        >
          Contact
        </a>
        
        {renderPortalButton()}
      </div>
    </header>
  );
}

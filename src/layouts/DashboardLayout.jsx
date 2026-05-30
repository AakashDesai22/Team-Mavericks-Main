import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Dashboard Layout Shell
 * ============================================================================
 *
 * Responsive side-navigation template:
 *   Desktop  → Permanent 280px sidebar + scrollable main content.
 *   Mobile   → Hamburger trigger → animated slide-in overlay.
 *
 * The navigation menu dynamically filters links based on the user's role_tier.
 * Participant users never see admin/operator links in the DOM.
 */

// ---------------------------------------------------------------------------
// SVG Icon Components (inline to avoid external deps)
// ---------------------------------------------------------------------------
const Icons = {
  Dashboard: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Grid: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Shield: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  ClipboardCheck: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 14l2 2 4-4" />
    </svg>
  ),
  FileText: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Activity: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  LogOut: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Menu: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Presentation: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="M12 16v4" /><path d="M8 20h8" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Navigation Configuration
// Each entry defines: path, label, icon, and which role_tiers can see it.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: Icons.Dashboard,
    roles: ['Admin', 'Member', 'Participant'],
  },
  {
    path: '/events',
    label: 'Events',
    icon: Icons.Calendar,
    roles: ['Admin', 'Member', 'Participant'],
  },
  {
    section: 'Operations',
    roles: ['Admin', 'Member'],
  },
  {
    path: '/registrations',
    label: 'Registrations',
    icon: Icons.ClipboardCheck,
    roles: ['Admin', 'Member'],
  },
  {
    path: '/seating',
    label: 'Seating Grid',
    icon: Icons.Grid,
    roles: ['Admin', 'Member'],
  },
  {
    path: '/checkin',
    label: 'Check-In',
    icon: Icons.Shield,
    roles: ['Admin', 'Member'],
  },
  {
    path: '/presentation',
    label: 'Reveal Stage',
    icon: Icons.Presentation,
    roles: ['Admin', 'Member'],
  },
  {
    section: 'Administration',
    roles: ['Admin'],
  },
  {
    path: '/audit-log',
    label: 'Audit Log',
    icon: Icons.Activity,
    roles: ['Admin'],
  },
  {
    path: '/certificates',
    label: 'Certificates',
    icon: Icons.FileText,
    roles: ['Admin'],
  },
  {
    path: '/users',
    label: 'User Management',
    icon: Icons.Users,
    roles: ['Admin'],
  },
];


// ---------------------------------------------------------------------------
// Role Tier Badge Colors
// ---------------------------------------------------------------------------
const TIER_STYLES = {
  Admin:       'from-rose-500 to-orange-500',
  Member:      'from-brand-500 to-violet-500',
  Participant: 'from-emerald-500 to-teal-500',
};


// ===========================================================================
// Dashboard Layout Component
// ===========================================================================

export default function DashboardLayout() {
  const { user, roleTier, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Filter navigation items based on the user's role_tier.
  // Items whose `roles` array does not include the current tier are
  // completely stripped from the DOM — not just hidden with CSS.
  // -------------------------------------------------------------------------
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => item.roles.includes(roleTier));
  }, [roleTier]);

  // -------------------------------------------------------------------------
  // Logout handler
  // -------------------------------------------------------------------------
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // -------------------------------------------------------------------------
  // Sidebar Content (shared between desktop and mobile)
  // -------------------------------------------------------------------------
  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo ───────────────────────────────────────────────────────── */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500
                          flex items-center justify-center shadow-glow-sm shrink-0">
            <span className="text-white font-black text-lg">B</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight truncate">
              Bodhantra OS
            </h1>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">
              Event Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Navigation Links ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" id="main-navigation">
        {visibleNavItems.map((item, idx) => {
          // Section header.
          if (item.section) {
            return (
              <div key={`section-${idx}`} className="pt-5 pb-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  {item.section}
                </p>
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200 group
                 ${isActive
                   ? 'bg-brand-500/15 text-brand-300 shadow-glow-sm border border-brand-500/20'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                 }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── User Info + Logout ────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div className="glass-card p-3 flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${TIER_STYLES[roleTier] || TIER_STYLES.Participant}
                           flex items-center justify-center shrink-0 shadow-lg`}>
            <span className="text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {roleTier}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2
                     px-4 py-2.5 rounded-xl text-sm font-medium
                     text-slate-400 hover:text-rose-400
                     bg-white/[0.03] hover:bg-rose-500/10
                     border border-white/[0.06] hover:border-rose-500/20
                     transition-all duration-300"
          id="logout-button"
        >
          <Icons.LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      {/* ================================================================= */}
      {/* MOBILE OVERLAY SIDEBAR                                            */}
      {/* ================================================================= */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72
                          bg-surface-900/95 backdrop-blur-xl
                          border-r border-white/[0.08]
                          shadow-2xl animate-slide-in-left">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg
                         text-slate-500 hover:text-white hover:bg-white/10
                         transition-colors duration-200"
              aria-label="Close menu"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DESKTOP PERMANENT SIDEBAR                                         */}
      {/* ================================================================= */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72
                         bg-surface-900/80 backdrop-blur-xl
                         border-r border-white/[0.06]"
             id="desktop-sidebar">
        {SidebarContent}
      </aside>

      {/* ================================================================= */}
      {/* MAIN CONTENT AREA                                                 */}
      {/* ================================================================= */}
      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
        <header className="lg:hidden sticky top-0 z-40
                           bg-surface-900/80 backdrop-blur-xl
                           border-b border-white/[0.06]
                           px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white
                       hover:bg-white/10 transition-colors duration-200"
            aria-label="Open menu"
            id="mobile-menu-button"
          >
            <Icons.Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500
                            flex items-center justify-center">
              <span className="text-white font-black text-xs">B</span>
            </div>
            <span className="text-sm font-bold text-white">Bodhantra OS</span>
          </div>
        </header>

        {/* ── Page Content ────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

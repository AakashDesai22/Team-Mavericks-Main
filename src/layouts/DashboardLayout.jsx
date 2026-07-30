import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
  Home: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Sun: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  UserCheck: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Navigation Configuration
// Each entry defines: path, label, icon, and which role_tiers can see it.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home Page',
    icon: Icons.Home,
    roles: ['Admin', 'Member', 'Participant'],
  },
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
    path: '/recruitment',
    label: 'Recruitment Drive',
    icon: Icons.UserCheck,
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


// ===========================================================================
// Dashboard Layout Component
// ===========================================================================

export default function DashboardLayout() {
  const { user, roleTier, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-light))`, boxShadow: 'var(--shadow-glow)' }}>
            <span className="font-black text-lg" style={{ color: 'var(--text-inverse)' }}>B</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              Bodhantra OS
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Event Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border-primary), transparent)' }} />

      {/* ── Navigation Links ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" id="main-navigation">
        {visibleNavItems.map((item, idx) => {
          // Section header.
          if (item.section) {
            return (
              <div key={`section-${idx}`} className="pt-5 pb-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>
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
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200 group nav-link
                 ${isActive ? 'nav-active' : ''}`
              }
              style={({ isActive }) => isActive ? {
                background: 'var(--nav-active-bg)',
                color: 'var(--nav-active-text)',
                boxShadow: 'var(--nav-active-glow)',
                border: '1px solid var(--nav-active-border)',
              } : {
                color: 'var(--text-muted)',
                border: '1px solid transparent',
              }}
            >
              <Icon className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border-primary), transparent)' }} />

      {/* ── Theme Toggle ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          id="theme-toggle-button"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isDark ? (
              <Icons.Moon className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--brand-text)' }} />
            ) : (
              <Icons.Sun className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--gold)' }} />
            )}
            <span className="truncate text-sm">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div className="theme-toggle-track" data-active={isDark ? 'true' : 'false'}>
            <div className="theme-toggle-thumb" data-active={isDark ? 'true' : 'false'}>
              {isDark ? (
                <Icons.Moon className="w-3 h-3" style={{ color: 'var(--brand-primary)' }} />
              ) : (
                <Icons.Sun className="w-3 h-3" style={{ color: 'var(--gold)' }} />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ── User Info + Logout ────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div className="glass-card p-3 flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
               style={{
                 background: `linear-gradient(135deg, var(${
                   roleTier === 'Admin' ? '--tier-admin-from' :
                   roleTier === 'Member' ? '--tier-member-from' : '--tier-participant-from'
                 }), var(${
                   roleTier === 'Admin' ? '--tier-admin-to' :
                   roleTier === 'Member' ? '--tier-member-to' : '--tier-participant-to'
                 }))`
               }}>
            <span className="font-bold text-sm" style={{ color: 'var(--text-inverse)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-faint)' }}>
              {roleTier}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2
                     px-4 py-2.5 rounded-xl text-sm font-medium
                     transition-all duration-300"
          style={{
            color: 'var(--text-muted)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--rose)';
            e.currentTarget.style.background = 'var(--rose-bg)';
            e.currentTarget.style.borderColor = 'var(--rose-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
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
    <div className="min-h-screen bg-mesh" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ================================================================= */}
      {/* MOBILE OVERLAY SIDEBAR                                            */}
      {/* ================================================================= */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl animate-slide-in-left"
               style={{
                 backgroundColor: 'var(--bg-sidebar)',
                 backdropFilter: `blur(var(--blur-strength))`,
                 borderRight: '1px solid var(--border-subtle)',
               }}>
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
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
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72"
             style={{
               backgroundColor: 'var(--bg-sidebar)',
               backdropFilter: `blur(var(--blur-strength))`,
               borderRight: '1px solid var(--border-subtle)',
             }}
             id="desktop-sidebar">
        {SidebarContent}
      </aside>

      {/* ================================================================= */}
      {/* MAIN CONTENT AREA                                                 */}
      {/* ================================================================= */}
      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
        <header className="lg:hidden sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
                style={{
                  backgroundColor: 'var(--bg-mobile-header)',
                  backdropFilter: `blur(var(--blur-strength))`,
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            aria-label="Open menu"
            id="mobile-menu-button"
          >
            <Icons.Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-light))` }}>
              <span className="font-black text-xs" style={{ color: 'var(--text-inverse)' }}>B</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Bodhantra OS</span>
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

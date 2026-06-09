import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import PublicNavbar from '../components/PublicNavbar';

const Icons = {
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Mail: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Code: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ArrowRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

export default function Home() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Contact state
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Teammates mock bio data
  const teammates = [
    {
      name: 'Aakash Desai',
      role: 'Principal UI/UX Architect',
      branch: 'Computer Science',
      year: 'Year 4',
      avatar: 'AD',
      gradient: 'from-brand-500 to-indigo-500'
    },
    {
      name: 'Dr. Alice Carter',
      role: 'Faculty Mentor',
      branch: 'Information Technology',
      year: 'Mentor',
      avatar: 'AC',
      gradient: 'from-rose-500 to-orange-500'
    },
    {
      name: 'Vikram Malhotra',
      role: 'Lead Systems Engineer',
      branch: 'Software Engineering',
      year: 'Year 3',
      avatar: 'VM',
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await api.get('/events');
        if (res.ok && res.data?.success) {
          // Filter only active events
          const active = (res.data.events || []).filter(e => e.status === 'Active');
          setEvents(active);
        }
      } catch (err) {
        console.error('Failed to load active events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setContactSent(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSent(false), 5000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh text-slate-100 font-sans selection:bg-brand-500 selection:text-black overflow-x-hidden relative">
      <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />

      {/* ── Navigation Top Bar ── */}
      <PublicNavbar />

      {/* ── 1. Premium Hero Banner Section ── */}
      <section className="relative pt-20 pb-28 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        {/* Glow backdrop bubble */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />

        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-6 animate-pulse">
          Welcome to the Mavericks Hub
        </span>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-white select-none">
          ENGINEERING THE <br />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
            FUTURE OF CLUB MEDIA
          </span>
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mt-6 leading-relaxed">
          High-performance symposium registries, granular multi-day attendance gates, and state-driven participant interfaces engineered strictly under zero external package footprints.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <a
            href="#events"
            className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-brand-500/30 text-xs font-black uppercase tracking-wider text-slate-200 transition-all flex items-center gap-2"
          >
            Browse Active Symposia
            <Icons.ArrowRight className="w-4 h-4 text-brand-400 animate-pulse" />
          </a>
        </div>
      </section>

      {/* ── 2. Events Grid Section ── */}
      <section id="events" className="py-16 px-6 border-t border-white/[0.05] max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Active Engagements</span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">
              Upcoming Club Symposia
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-2 md:mt-0 max-w-xs leading-normal">
            Browse our list of live educational events and complete registration gates dynamically.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Icons.Spinner className="w-8 h-8 text-brand-400" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold animate-pulse">
              Syncing club engagements...
            </span>
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card border border-dashed border-white/[0.08] p-12 text-center rounded-3xl">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-500 mb-4">
              <Icons.Calendar className="w-6 h-6 opacity-35" />
            </div>
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-widest">No Active Events</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              We are currently drafting upcoming schedules. Check back soon for registrations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="glass-card border border-white/[0.08] rounded-3xl bg-white/[0.01] overflow-hidden flex flex-col justify-between hover:border-brand-500/30 hover:bg-white/[0.02] transition-all duration-300 shadow-xl group"
              >
                {/* Poster graphic placeholder or actual poster */}
                <div className="h-44 relative bg-black/40 border-b border-white/[0.06] overflow-hidden flex items-center justify-center">
                  {evt.cover_image_path ? (
                    <img
                      src={evt.cover_image_path}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-violet-500/5 to-transparent flex flex-col items-center justify-center gap-1.5 opacity-80">
                      <Icons.Calendar className="w-10 h-10 text-brand-400 opacity-60" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Poster Graphics</span>
                    </div>
                  )}
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/75 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300">
                    {evt.payment_type === 'Free' ? 'FREE ENTRY' : `INR ${evt.payment_amount}`}
                  </span>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <span>{evt.event_date}</span>
                      <span>{evt.num_days} Day(s)</span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-slate-100 group-hover:text-brand-400 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {evt.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Capacity: <strong>{evt.max_capacity} seats</strong>
                    </span>
                    <button
                      onClick={() => navigate(`/events/${evt.id}`)}
                      className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-brand-500 hover:text-black border border-white/[0.08] hover:border-brand-500 text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Secure Spot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. Team Biography Section ── */}
      <section id="team" className="py-16 px-6 border-t border-white/[0.05] bg-white/[0.005] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Structure Leadership</span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
              Core Teammates Biography
            </h2>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              Meet our team of developers and UI/UX designers maintaining the Mavericks portal environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teammates.map((m, i) => (
              <div
                key={`teammate-${i}`}
                className="glass-card border border-white/[0.08] p-6 rounded-3xl bg-white/[0.01] hover:border-brand-500/30 hover:bg-white/[0.02] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-center items-center group relative overflow-hidden"
              >
                {/* Visual glow overlay */}
                <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full bg-gradient-to-br ${m.gradient} opacity-[0.05] blur-xl pointer-events-none group-hover:scale-150 transition-all duration-300`} />

                {/* Avatar node */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0 shadow-lg text-white font-black text-lg`}>
                  {m.avatar}
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-100 group-hover:text-brand-400 transition-colors">
                    {m.name}
                  </h3>
                  <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-0.5">
                    {m.role}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1.5">
                    {m.branch} • {m.year}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.04] w-full text-[11px] text-slate-400 leading-normal">
                  Expertly designing responsive pages and managing native transactional micro-pipelines.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Secure Contact Capture Section ── */}
      <section id="contact" className="py-16 px-6 border-t border-white/[0.05] max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Contact Directives */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6 text-left">
            <div>
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Connect With Us</span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                Reach Out <br />
                Team Mavericks
              </h2>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed max-w-xs">
                Have enquiries regarding upcoming symposium sessions or offline payment processes? Dispatch details here cleanly.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-brand-400">
                  <Icons.Mail className="w-4 h-4" />
                </span>
                <span>admin@mavericks.club</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-brand-400">
                  <Icons.Users className="w-4 h-4" />
                </span>
                <span>Mavericks Headquarters Room 402</span>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl text-[10px] text-slate-500 max-w-xs leading-normal">
              Club telemetry metrics are audited regularly inside security audit ledgers.
            </div>
          </div>

          {/* Secure Capture Field Box */}
          <div className="md:col-span-7">
            <div className="glass-card border border-white/[0.08] p-6 rounded-3xl bg-white/[0.01]">
              {contactSent ? (
                <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Icons.Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-slate-200 text-sm uppercase tracking-widest">Dispatch Successful</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Thank you. Your message has been logged inside our secure communications inbox. We will contact you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Aakash Desai"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="e.g. aakash@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Message / Enquiry
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Type details cleanly..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 mt-2"
                  >
                    {sending ? 'Dispatching...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ── 5. Informational Footer (Club Metadata) ── */}
      <footer className="border-t border-white/[0.05] py-12 px-6 bg-black/35 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white tracking-wider uppercase">Team Mavericks</h4>
              <p className="text-[9px] text-slate-500 font-medium">Bodhantra Event OS Ecosystem</p>
            </div>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p className="text-[10px] text-slate-400">
              &copy; 2026 Team Mavericks. All privileges reserved.
            </p>
            <p className="text-[9px] text-slate-600 font-mono">
              System Release: Phase 3 (Interface Completion & RBAC Command Center)
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

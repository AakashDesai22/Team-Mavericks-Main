import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

const Icons = {
  Scan: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  UserCheck: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  UserX: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  Warning: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  XCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Lock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
};

export default function LiveGateCheckIn() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Scanned input tracking
  const [scanInput, setScanInput] = useState('');
  const inputRef = useRef(null);
  
  // UI Display result states
  const [checking, setChecking] = useState(false);
  const [currentResult, setCurrentResult] = useState(null); // { type: 'success'|'blocked'|'error', payload }
  const [lastScans, setLastScans] = useState([]); // Chronological sliding stack of last 5 scans
  
  // Autofocus managers
  const [isFocused, setIsFocused] = useState(false);

  // Fetch events on mount
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
        // Set first event as default if available
        if (res.data.events?.length > 0) {
          setSelectedEventId(res.data.events[0].id);
        }
      }
    }
    loadEvents();
  }, []);

  // Autofocus lock logic on mounting and mouse clicks
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Periodically enforce focus if it gets lost
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleRefocusClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code || !selectedEventId || checking) return;
    
    setChecking(true);
    setScanInput('');
    setCurrentResult(null);

    try {
      const res = await api.post('/checkin', {
        event_id: parseInt(selectedEventId, 10),
        unique_registration_id: code
      });

      const timestamp = new Date().toLocaleTimeString();

      if (res.status === 200 && res.data?.success) {
        // Success check-in (new or duplicate)
        const payload = res.data;
        const result = {
          type: 'success',
          title: payload.duplicate ? 'ALREADY SCANNED' : 'PASS VERIFIED',
          timestamp,
          code,
          name: payload.participant?.name || 'Attendee',
          branch: payload.participant?.branch || '',
          duplicate: !!payload.duplicate,
          team: payload.allocation?.team_name || null,
          seat: payload.allocation ? `${payload.allocation.seat_row}-${payload.allocation.seat_column}` : null,
          role: payload.allocation?.role || null,
        };

        setCurrentResult(result);
        addScanToHistory(result);
      } else if (res.status === 403) {
        // Explicitly blocked by backend (Pending / Rejected payment status)
        const payload = res.data;
        const result = {
          type: 'blocked',
          title: 'ACCESS BLOCKED',
          timestamp,
          code,
          name: payload.participant?.name || 'Attendee',
          status: payload.participant?.status || 'Blocked',
          error: payload.error || 'Blocked voucher',
          directive: payload.action_required || 'Redirect to Registration Desk.'
        };

        setCurrentResult(result);
        addScanToHistory(result);
      } else {
        // Not found or network error
        const result = {
          type: 'error',
          title: 'NOT FOUND',
          timestamp,
          code,
          error: res.data?.error || 'Invalid or unregistered ticket ID.'
        };

        setCurrentResult(result);
        addScanToHistory(result);
      }
    } catch (err) {
      console.error(err);
      setCurrentResult({
        type: 'error',
        title: 'NETWORK ERROR',
        timestamp: new Date().toLocaleTimeString(),
        code,
        error: 'Network connectivity fault. Please verify server state.'
      });
    } finally {
      setChecking(false);
      // Re-focus scanner input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const addScanToHistory = (scan) => {
    setLastScans(prev => {
      const updated = [scan, ...prev];
      return updated.slice(0, 5); // Retain only the last 5 scans
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100" onClick={handleRefocusClick}>
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">Live Entrance Gate Check-In</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Scan QR barcodes at the door. System refocuses cursor automatically. Keep scanner aligned.
          </p>
        </div>

        {/* Event context selection */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label htmlFor="checkin-event" className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Target Event:
          </label>
          <select
            id="checkin-event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-medium focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-surface-900">
                {evt.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Checkin Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Input box and Giant result Flash Card */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Hidden/Autofocused Form submit */}
          <form onSubmit={handleScanSubmit} className="relative select-none" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
              <Icons.Scan className="w-5 h-5 animate-pulse text-brand-400" />
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Laser scanner target. Align QR code pass..."
              value={scanInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.04] border-2 border-white/[0.08] text-slate-100 placeholder:text-slate-500 text-sm font-semibold outline-none focus:border-brand-500/80 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand-500/10 transition-all select-all font-mono"
            />
            {/* Input state indicator focus warning */}
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {isFocused ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Scanner Ready
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Click to Focus
                </span>
              )}
            </span>
          </form>

          {/* Giant Response Result Card */}
          <div className="flex-1 min-h-[380px] flex items-stretch">
            {checking ? (
              <div className="w-full glass-card p-12 flex flex-col items-center justify-center gap-3">
                <Icons.Spinner className="w-12 h-12 text-brand-400" />
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
                  Querying verification database...
                </p>
              </div>
            ) : !currentResult ? (
              <div className="w-full glass-card border border-dashed border-white/[0.1] p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-500">
                  <Icons.Scan className="w-8 h-8 opacity-45" />
                </div>
                <div>
                  <h3 className="font-black text-slate-300 text-sm uppercase tracking-widest">
                    Awaiting Entry scan
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Align the student's registration pass QR code under the laser scanner, or type their tracking code manual code directly above.
                  </p>
                </div>
              </div>
            ) : currentResult.type === 'success' ? (
              // Giant verified flash card
              <div className={`w-full rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden text-white ${
                currentResult.duplicate
                  ? 'bg-gradient-to-br from-amber-600 to-yellow-700 border-2 border-amber-400 shadow-yellow-500/10'
                  : 'bg-gradient-to-br from-emerald-600 to-teal-700 border-2 border-emerald-400 shadow-emerald-500/10'
              }`}>
                {/* Dots background grid */}
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20">
                      <Icons.UserCheck className="w-3.5 h-3.5" />
                      {currentResult.title}
                    </span>
                    <span className="font-mono text-xs opacity-75">{currentResult.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Participant Name</span>
                    <h2 className="text-3xl font-black tracking-tight leading-tight mt-0.5 select-all">
                      {currentResult.name}
                    </h2>
                    <span className="text-xs opacity-80 mt-1 block">
                      Code: <strong className="font-mono">{currentResult.code}</strong> • {currentResult.branch}
                    </span>
                  </div>
                </div>

                {/* Grid allocation reveals parameters */}
                {currentResult.team || currentResult.seat ? (
                  <div className="relative grid grid-cols-2 gap-4 bg-white/10 rounded-2xl p-4 border border-white/10 mt-6">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 block">Team Assignment</span>
                      <span className="text-lg font-black tracking-tight block mt-0.5">{currentResult.team}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white/90 uppercase tracking-widest font-black inline-block mt-1">
                        {currentResult.role}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 block">Seat coordinates</span>
                      <span className="text-lg font-black font-mono block mt-0.5">{currentResult.seat}</span>
                      <span className="text-[9px] text-white/70 italic block mt-1">Designated Row-Col</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative p-3.5 bg-black/20 rounded-2xl border border-white/5 text-[11px] opacity-75 leading-relaxed mt-6">
                    <strong>Staged Entry:</strong> Team matching structures and physical seat layouts are currently unrevealed. Reroute member to seating screens later.
                  </div>
                )}
              </div>
            ) : (
              // Giant blocked flash card
              <div className={`w-full rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden text-white ${
                currentResult.type === 'blocked'
                  ? 'bg-gradient-to-br from-rose-700 to-red-800 border-2 border-rose-400 shadow-rose-500/10'
                  : 'bg-gradient-to-br from-violet-700 to-purple-800 border-2 border-violet-400 shadow-violet-500/10'
              }`}>
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20">
                      <Icons.UserX className="w-3.5 h-3.5" />
                      {currentResult.title}
                    </span>
                    <span className="font-mono text-xs opacity-75">{currentResult.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Applicant Target</span>
                    <h2 className="text-3xl font-black tracking-tight leading-tight mt-0.5 select-all">
                      {currentResult.name || 'Unregistered'}
                    </h2>
                    <span className="text-xs opacity-80 mt-1 block">
                      Code: <strong className="font-mono">{currentResult.code}</strong>
                    </span>
                  </div>
                </div>

                <div className="relative space-y-4 mt-6">
                  {/* Warning Details box */}
                  <div className="bg-black/25 rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
                    <span className="font-bold text-red-300 flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                      <Icons.Warning className="w-4 h-4 shrink-0 text-red-400" />
                      {currentResult.type === 'blocked' ? 'Voucher Blocked' : 'System Error'}
                    </span>
                    <p className="leading-relaxed opacity-90 select-text">
                      {currentResult.error}
                    </p>
                  </div>

                  {/* Operator Action directives */}
                  {currentResult.directive && (
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-xs flex gap-2.5 items-start">
                      <Icons.Lock className="w-5 h-5 shrink-0 mt-0.5 text-white/90 animate-pulse" />
                      <div>
                        <span className="font-bold uppercase tracking-widest text-[9px] text-white/60">Operator Action</span>
                        <p className="mt-0.5 leading-relaxed font-semibold">
                          {currentResult.directive}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Chronological sliding feed (Last 5 scans) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-5 space-y-4 h-full flex flex-col">
            <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-3 border-b border-white/[0.06] shrink-0">
              Scans Log Ledger
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px]">
              {lastScans.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic mt-8">
                  Check-in feeds are empty. Verified scans list chronologically here.
                </div>
              ) : (
                lastScans.map((scan, i) => (
                  <div
                    key={`hist-${i}`}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      scan.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10' :
                      scan.type === 'blocked' ? 'bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10' :
                      'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black truncate max-w-[120px] text-slate-200">
                        {scan.name || 'Unknown'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{scan.timestamp}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>{scan.code}</span>
                      <span className={`font-semibold uppercase tracking-wider ${
                        scan.type === 'success' ? 'text-emerald-400' :
                        scan.type === 'blocked' ? 'text-rose-400' : 'text-slate-500'
                      }`}>
                        {scan.duplicate ? 'Duplicate' : scan.type}
                      </span>
                    </div>

                    {scan.type === 'success' && (scan.team || scan.seat) && (
                      <div className="text-[10px] text-slate-500 border-t border-white/[0.04] pt-1 flex justify-between items-center">
                        <span className="truncate">{scan.team}</span>
                        <strong className="font-mono text-slate-400">{scan.seat}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] text-slate-500 leading-normal text-center shrink-0">
              Door logs reset on refresh. Ledger persists in DB.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

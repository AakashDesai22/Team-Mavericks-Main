import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

const Icons = {
  Scan: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  UserCheck: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  UserX: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  AlertTriangle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Clock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Audio: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  Export: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

export default function AttendanceConsole() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Sccontext state
  const [activeDay, setActiveDay] = useState(1);
  const [activeSession, setActiveSession] = useState('Morning'); // Morning / Afternoon

  // Scanner capture capture
  const [scanInput, setScanInput] = useState('');
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Door alerts display state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'duplicate'|'denied'|'error', payload }
  const [scanFeed, setScanFeed] = useState([]); // Chronological array of last 5 scans

  // Fetch events listing
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await api.get('/events');
        if (res.ok && res.data?.success) {
          const activeEvents = res.data.events || [];
          setEvents(activeEvents);
          if (activeEvents.length > 0) {
            setSelectedEvent(activeEvents[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    }
    loadEvents();
  }, []);

  // Autofocus lock capturing logic: keeps keyboard-emulating gun targeted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const handleRefocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleEventSelection = (e) => {
    const id = parseInt(e.target.value, 10);
    const evt = events.find(item => item.id === id);
    setSelectedEvent(evt || null);
    setActiveDay(1);
    setActiveSession('Morning');
    setResult(null);
  };

  // High-fidelity door sound beeper (Web Audio API)
  const playBeep = (type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (type === 'success') {
        // Double High beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);

        setTimeout(() => {
          const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1200, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.12);
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.12);
        }, 80);
      } else if (type === 'duplicate') {
        // Amber warning tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Red Crimson buzz error
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio contextual initialization blocked:', e);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const token = scanInput.trim();
    if (!token || !selectedEvent || loading) return;

    setLoading(true);
    setScanInput('');
    setResult(null);

    try {
      // POST attendance/log
      const res = await api.post('/attendance/log', {
        account_id: token,
        event_id: selectedEvent.id,
        day_number: activeDay,
        session_tier: activeSession
      });

      const timestamp = new Date().toLocaleTimeString();

      if (res.status === 200 && res.data?.success) {
        // EMERALD SUCCESS
        const payload = res.data;
        const scanRes = {
          type: 'success',
          title: 'ADMISSION GRANTED',
          timestamp,
          code: token,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          session: payload.session,
          detail: 'Check-in completed successfully.'
        };
        setResult(scanRes);
        addToFeed(scanRes);
        playBeep('success');
      } else if (res.status === 409) {
        // AMBER DUPLICATE
        const payload = res.data;
        const scanRes = {
          type: 'duplicate',
          title: 'DUPLICATE CHECK-IN',
          timestamp,
          code: token,
          name: payload.name || 'Attendee',
          session: payload.session || `Day ${activeDay} - ${activeSession}`,
          detail: `Checked in at ${payload.marked_at} by operator ${payload.marked_by}.`,
        };
        setResult(scanRes);
        addToFeed(scanRes);
        playBeep('duplicate');
      } else if (res.status === 403) {
        // CRIMSON ACCESS DENIED (Pending / Rejected payment screenshot)
        const payload = res.data;
        const scanRes = {
          type: 'denied',
          title: 'ACCESS BLOCKED',
          timestamp,
          code: token,
          name: payload.name || 'Unapproved Account',
          status: payload.status || 'Pending',
          detail: payload.error || 'Payment screenshot upload remains unapproved.'
        };
        setResult(scanRes);
        addToFeed(scanRes);
        playBeep('denied');
      } else {
        // 404 NOT FOUND or other API error
        const scanRes = {
          type: 'error',
          title: 'UNREGISTERED TICKET',
          timestamp,
          code: token,
          detail: res.data?.error || 'No active registration matches this token identifier.'
        };
        setResult(scanRes);
        addToFeed(scanRes);
        playBeep('error');
      }
    } catch (err) {
      console.error(err);
      const scanRes = {
        type: 'error',
        title: 'NETWORK OUTAGE',
        timestamp: new Date().toLocaleTimeString(),
        code: token,
        detail: 'Failed to communicate with Mavericks REST API.'
      };
      setResult(scanRes);
      playBeep('error');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const addToFeed = (scan) => {
    setScanFeed(prev => [scan, ...prev].slice(0, 5));
  };

  // Export current attendance directly from API with Bearer token authentication
  const handleExportCSV = async () => {
    if (!selectedEvent) return;
    try {
      const token = localStorage.getItem('bodhantra_token');
      const response = await fetch(`/api/attendance/export/${selectedEvent.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        alert('Failed to export CSV: ' + response.statusText);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const cleanTitle = selectedEvent.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const dateString = new Date().toISOString().slice(0, 10);
      a.download = `attendance_export_${cleanTitle}_${dateString}.csv`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('Failed to download CSV: Network connectivity error.');
    }
  };

  // Generate dynamic contextual selectors based on selected event specifications
  const numDays = selectedEvent ? parseInt(selectedEvent.num_days || 1, 10) : 1;
  const sessionsCount = selectedEvent ? parseInt(selectedEvent.sessions_per_day || 2, 10) : 2;

  // Let's create session list. If count is 2, Morning/Afternoon. If more, render Session 1, Session 2...
  const sessionOptions = sessionsCount <= 2 
    ? ['Morning', 'Afternoon']
    : Array.from({ length: sessionsCount }, (_, i) => `Session ${i + 1}`);

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in" onClick={handleRefocus}>
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="section-header">Gate Check-In & Live Monitor</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Focus-locked scanning terminal for door crew. Align code, scans are recorded instantly.
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
              soundEnabled
                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-400'
            }`}
            title="Toggle Audio Feedback Beeps"
          >
            <Icons.Audio className="w-4.5 h-4.5" />
          </button>

          {/* Export Button */}
          {selectedEvent && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-brand-500/30 text-xs font-bold tracking-wide transition-all flex items-center gap-2"
            >
              <Icons.Export className="w-4 h-4 text-brand-400" />
              Download CSV Report
            </button>
          )}

          {/* Target Event dropdown selection */}
          <div className="flex items-center gap-2">
            <select
              id="active-event-selector"
              value={selectedEvent?.id || ''}
              onChange={handleEventSelection}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-medium focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id} className="bg-surface-900">
                  {evt.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Context Selector Tabs ── */}
      {selectedEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Day selection tabs */}
          <div className="glass-card p-3 rounded-2xl border border-white/[0.08] flex items-center gap-2 bg-white/[0.01]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-2 shrink-0">
              Active Day:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full">
              {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => (
                <button
                  key={`day-${d}`}
                  onClick={() => { setActiveDay(d); setResult(null); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeDay === d
                      ? 'bg-brand-500 text-black shadow-glow-sm'
                      : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
          </div>

          {/* Session selection tabs */}
          <div className="glass-card p-3 rounded-2xl border border-white/[0.08] flex items-center gap-2 bg-white/[0.01]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-2 shrink-0">
              Active Session:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full">
              {sessionOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setActiveSession(s); setResult(null); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeSession === s
                      ? 'bg-brand-500 text-black shadow-glow-sm'
                      : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Monitor Console ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Input Port & Flash alerts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Focus lock input form */}
          <form onSubmit={handleScanSubmit} className="relative select-none" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
              <Icons.Scan className="w-5 h-5 text-brand-400 animate-pulse" />
            </span>
            
            <input
              ref={inputRef}
              type="text"
              placeholder="Align laser gun and scan pass... (Or type manually)"
              value={scanInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-12 pr-36 py-4 rounded-2xl bg-white/[0.04] border-2 border-white/[0.08] text-slate-100 placeholder:text-slate-500 text-sm font-semibold outline-none focus:border-brand-500/80 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand-500/10 transition-all font-mono"
              autoComplete="off"
            />

            {/* Autofocus warning state */}
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              {isFocused ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  SCANNER SECURED
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  CLICK TO FOCUS
                </span>
              )}
            </span>
          </form>

          {/* Giant Response Alert Cards */}
          <div className="flex-1 min-h-[380px] flex items-stretch">
            {loading ? (
              <div className="w-full glass-card p-12 flex flex-col items-center justify-center gap-3">
                <Icons.Spinner className="w-12 h-12 text-brand-400" />
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
                  Verifying Credentials against database indices...
                </p>
              </div>
            ) : !result ? (
              <div className="w-full glass-card border border-dashed border-white/[0.1] p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-500">
                  <Icons.Scan className="w-8 h-8 opacity-45" />
                </div>
                <div>
                  <h3 className="font-black text-slate-300 text-sm uppercase tracking-widest">
                    Awaiting Admission Scan
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                    Trigger scanned sequence `MAV-PRT-XXX` via barcode gun, or input the token manually above to authorize door entrance.
                  </p>
                </div>
              </div>
            ) : result.type === 'success' ? (
              /* EMERALD SUCCESS ALERT */
              <div className="w-full rounded-3xl p-8 bg-gradient-to-br from-emerald-600 to-teal-700 border-2 border-emerald-400 shadow-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-emerald-500/10">
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />

                <div className="space-y-6 relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20">
                      <Icons.UserCheck className="w-4 h-4" />
                      {result.title}
                    </span>
                    <span className="font-mono text-xs opacity-75">{result.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Participant Name</span>
                    <h2 className="text-3xl font-black tracking-tight leading-tight mt-0.5 select-all">
                      {result.name}
                    </h2>
                    <span className="text-xs opacity-80 mt-1 block">
                      Code: <strong className="font-mono">{result.code}</strong>
                    </span>
                  </div>
                </div>

                <div className="relative mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-white/10 rounded-2xl p-4 border border-white/10 text-xs">
                    <div>
                      <span className="opacity-60 uppercase tracking-widest text-[9px] font-bold block">Contact Email</span>
                      <span className="font-semibold block truncate mt-0.5">{result.email}</span>
                    </div>
                    <div>
                      <span className="opacity-60 uppercase tracking-widest text-[9px] font-bold block">Phone Number</span>
                      <span className="font-semibold block mt-0.5">{result.phone}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-black/20 rounded-2xl border border-white/5 text-xs text-center flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Logged cleanly for <strong>{result.session}</strong></span>
                  </div>
                </div>
              </div>
            ) : result.type === 'duplicate' ? (
              /* AMBER WARNING DUPLICATE ALERT */
              <div className="w-full rounded-3xl p-8 bg-gradient-to-br from-amber-600 to-yellow-700 border-2 border-amber-400 shadow-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-yellow-500/10">
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />

                <div className="space-y-6 relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20">
                      <Icons.Clock className="w-4 h-4 text-amber-300" />
                      {result.title}
                    </span>
                    <span className="font-mono text-xs opacity-75">{result.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Scanned Applicant</span>
                    <h2 className="text-3xl font-black tracking-tight leading-tight mt-0.5 select-all text-amber-100">
                      {result.name}
                    </h2>
                    <span className="text-xs opacity-80 mt-1 block">
                      Code: <strong className="font-mono">{result.code}</strong>
                    </span>
                  </div>
                </div>

                <div className="relative mt-6">
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                      <Icons.AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      Dual Scan Prevented
                    </span>
                    <p className="leading-relaxed opacity-95">
                      {result.detail}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* CRIMSON ACCESS DENIED / ERROR ALERT */
              <div className="w-full rounded-3xl p-8 bg-gradient-to-br from-rose-700 to-red-800 border-2 border-rose-400 shadow-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-rose-500/10">
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />

                <div className="space-y-6 relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20">
                      <Icons.UserX className="w-4 h-4 text-red-300" />
                      {result.title}
                    </span>
                    <span className="font-mono text-xs opacity-75">{result.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Scanned Target</span>
                    <h2 className="text-3xl font-black tracking-tight leading-tight mt-0.5 select-all text-red-100">
                      {result.name || 'Unregistered Code'}
                    </h2>
                    <span className="text-xs opacity-80 mt-1 block">
                      Code: <strong className="font-mono">{result.code}</strong>
                    </span>
                  </div>
                </div>

                <div className="relative mt-6 space-y-4">
                  <div className="bg-black/25 rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
                    <span className="font-bold text-red-300 flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                      <Icons.AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      Blocked Admission Gate
                    </span>
                    <p className="leading-relaxed opacity-90">
                      {result.detail}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10 text-xs font-semibold leading-relaxed">
                    <strong>Operator Directive:</strong> Escort member to Registration Desk for physical voucher check. Do not authorize hall admissions.
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Chronological Log Feed */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] h-full flex flex-col bg-white/[0.01]">
            <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-3 border-b border-white/[0.06] shrink-0">
              Live Scans Stream
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-4 max-h-[460px]">
              {scanFeed.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic mt-8">
                  No scan events recorded. Grantees populate here chronologically.
                </div>
              ) : (
                scanFeed.map((feed, idx) => (
                  <div
                    key={`feed-${idx}`}
                    className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      feed.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10' :
                      feed.type === 'duplicate' ? 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10' :
                      feed.type === 'denied' ? 'bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10' :
                      'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black truncate text-slate-200 max-w-[120px]">
                        {feed.name || 'Unknown'}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">{feed.timestamp}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span>{feed.code}</span>
                      <span className={`font-semibold uppercase tracking-wider text-[9px] ${
                        feed.type === 'success' ? 'text-emerald-400' :
                        feed.type === 'duplicate' ? 'text-amber-400' :
                        feed.type === 'denied' ? 'text-rose-400' : 'text-slate-500'
                      }`}>
                        {feed.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[9px] text-slate-500 leading-normal text-center shrink-0 mt-4">
              Local monitor feed logs reset on page refresh. Logs persist securely in MySQL.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

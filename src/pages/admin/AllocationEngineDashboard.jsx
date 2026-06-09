import { useState, useEffect } from 'react';
import api from '../../api/client';

const Icons = {
  Cpu: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Refresh: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Lock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  Sparkles: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  AlertTriangle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  CheckCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
};

const ROLE_STYLES = {
  LEADER:      'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  ANALYST:     'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25',
  SCRIBE:      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  PRESENTER:   'bg-pink-500/10 text-pink-400 border border-pink-500/25',
  TIMEKEEPER:  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
  RESEARCHER:  'bg-violet-500/10 text-violet-400 border border-violet-500/25',
  COORDINATOR: 'bg-teal-500/10 text-teal-400 border border-teal-500/25',
  OBSERVER:    'bg-slate-500/10 text-slate-400 border border-slate-500/25',
};

export default function AllocationEngineDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Stats & Layout capacity
  const [capacity, setCapacity] = useState(0);
  const [allocationData, setAllocationData] = useState(null); // { total, teams, revealed, unrevealed }
  
  // Pipeline controls
  const [teamCountInput, setTeamCountInput] = useState(6);
  const [teamPrefixInput, setTeamPrefixInput] = useState('Team');
  
  // Processing loaders
  const [loading, setLoading] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [rerollingUserId, setRerollingUserId] = useState(null);
  const [revealing, setRevealing] = useState(false);
  
  // Feedback prompts
  const [feedback, setFeedback] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
      }
    }
    loadEvents();
  }, []);

  // Fetch capacities and existing allocations
  const loadEventState = async (eventId) => {
    if (!eventId) {
      setCapacity(0);
      setAllocationData(null);
      return;
    }
    setLoading(true);
    setFeedback(null);

    try {
      // 1. Fetch available seating grid capacity
      const gridRes = await api.get('/seating/grid', { event_id: eventId });
      let seatingCapacity = 0;
      if (gridRes.ok && gridRes.data?.success) {
        seatingCapacity = gridRes.data.summary.available_seats || 0;
        setCapacity(seatingCapacity);
      }

      // 2. Fetch existing allocations
      const allocRes = await api.get(`/allocations/event/${eventId}`);
      if (allocRes.ok && allocRes.data?.success) {
        setAllocationData(allocRes.data);
      } else {
        setAllocationData(null);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'An unexpected connection error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventState(selectedEventId);
  }, [selectedEventId]);

  // Execute POST /allocation/run
  const runAllocationPipeline = async () => {
    if (!selectedEventId) return;
    
    setRunningPipeline(true);
    setFeedback(null);
    try {
      const res = await api.post('/allocation/run', {
        event_id: parseInt(selectedEventId, 10),
        team_count: Math.max(1, parseInt(teamCountInput, 10) || 1),
        team_prefix: teamPrefixInput || 'Team'
      });

      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Team allocations completed successfully!'
        });
        await loadEventState(selectedEventId);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.error || 'Allocation pipeline script failed.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to run matching engine.' });
    } finally {
      setRunningPipeline(false);
    }
  };

  // Re-roll a single participant via POST /allocation/reroll
  const rerollParticipant = async (userId) => {
    if (!selectedEventId || rerollingUserId !== null) return;
    
    setRerollingUserId(userId);
    try {
      const res = await api.post('/allocation/reroll', {
        event_id: parseInt(selectedEventId, 10),
        user_id: userId
      });

      if (res.ok && res.data?.success) {
        // Reload allocations cleanly in place
        const allocRes = await api.get(`/allocations/event/${selectedEventId}`);
        if (allocRes.ok && allocRes.data?.success) {
          setAllocationData(allocRes.data);
        }
      } else {
        alert(res.data?.error || 'Reroll request was blocked.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred during re-roll.');
    } finally {
      setRerollingUserId(null);
    }
  };

  // Publish Live Reveals via POST /allocation/reveal
  const publishLiveReveals = async () => {
    if (!selectedEventId || revealing) return;
    
    setRevealing(true);
    setShowRevealModal(false);
    setFeedback(null);

    try {
      const res = await api.post('/allocation/reveal', {
        event_id: parseInt(selectedEventId, 10)
      });

      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'All allocations released to live participant profiles!'
        });
        await loadEventState(selectedEventId);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.error || 'Failed to release allocations.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to communicate reveal script.' });
    } finally {
      setRevealing(false);
    }
  };

  // Compute team scorecards helper
  const getBranchScorecard = (members) => {
    const counts = {};
    members.forEach(m => {
      const b = m.branch || 'N/A';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([branch, count]) => `${branch}: ${count}`)
      .join(', ');
  };

  // Detect unassigned placeholders
  const hasUnassigned = allocationData && allocationData.teams?.['__UNASSIGNED__']?.length > 0;
  const hasAssigned = allocationData && Object.keys(allocationData.teams).some(tn => tn !== '__UNASSIGNED__' && tn !== '__PENDING__');

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">Matchmaking Control Center</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Execute the 6-step balanced division logistics pipeline. Group members round-robin to maximize department diversity.
          </p>
        </div>
        
        {/* Selector dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-event" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Event context:
          </label>
          <select
            id="dashboard-event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-medium focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
          >
            <option value="" disabled className="bg-surface-900">Select Event...</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-surface-900">
                {evt.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert feeds */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs leading-normal flex gap-2.5 items-start animate-fade-in ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          {feedback.type === 'error' ? (
            <Icons.AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <Icons.CheckCircle className="w-5 h-5 shrink-0" />
          )}
          <p className="flex-1">{feedback.message}</p>
        </div>
      )}

      {selectedEventId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Engine Trigger Card */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* The Pipeline Executive Card */}
            <div className="glass-card p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Icons.Cpu className="w-5 h-5 text-brand-400" />
                <h2 className="text-sm font-bold text-brand-300 uppercase tracking-widest">
                  Logistics Pipeline
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <Icons.Spinner className="w-6 h-6 mx-auto text-brand-400" />
                  <p className="text-xs text-slate-500 mt-2">Checking registry metrics...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Registry stats badges */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">
                        Approved
                      </span>
                      <span className="text-lg font-black text-white font-mono">
                        {allocationData ? allocationData.total : 0}
                      </span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">
                        Seat Bounds
                      </span>
                      <span className="text-lg font-black text-white font-mono">
                        {capacity}
                      </span>
                    </div>
                  </div>

                  {/* Settings slider / count inputs */}
                  <div className="space-y-4 pt-2 border-t border-white/[0.04]">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                        Team Prefix Identifier
                      </label>
                      <input
                        type="text"
                        value={teamPrefixInput}
                        onChange={(e) => setTeamPrefixInput(e.target.value)}
                        placeholder="e.g., Team, Cohort, Syndicate"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder:text-slate-500 text-xs font-semibold focus:border-brand-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Target Team count
                        </label>
                        <span className="text-xs font-bold text-brand-300 font-mono">
                          {teamCountInput}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        value={teamCountInput}
                        onChange={(e) => setTeamCountInput(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                    </div>
                  </div>

                  {/* Primary Trigger Button */}
                  <button
                    onClick={runAllocationPipeline}
                    disabled={runningPipeline || !allocationData || allocationData.total === 0 || capacity < (allocationData?.total || 0)}
                    className="btn-primary w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {runningPipeline ? (
                      <>
                        <Icons.Spinner className="w-4 h-4 text-white" />
                        Running Algorithmic balanced Shuffles...
                      </>
                    ) : (
                      <>
                        <Icons.Sparkles className="w-4 h-4 text-yellow-400" />
                        Execute Logistics Pipeline
                      </>
                    )}
                  </button>

                  {/* Warnings on capacity limitations */}
                  {allocationData && capacity < allocationData.total && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex gap-2 items-start">
                      <Icons.AlertTriangle className="w-5 h-5 shrink-0" />
                      <p className="leading-relaxed">
                        <strong>Seat Overflow:</strong> Seating grid only has {capacity} Available seats but {allocationData.total} applications have been approved. Block less cells or construct a wider seating grid.
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* The Live reveals trigger box */}
            {hasAssigned && (
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Icons.Lock className="w-4 h-4 text-brand-400" />
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                    Live Reveals Stage
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">Reveal release state:</span>
                    {allocationData?.unrevealed === 0 ? (
                      <span className="badge-approved text-[10px]">Fully Revealed</span>
                    ) : (
                      <span className="badge-pending text-[10px]">{allocationData?.unrevealed} Staged</span>
                    )}
                  </div>
                  
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Flipping the reveal flag unlocks access dashboards, allowing attendees to view their assigned seat coordinates and cohort groups.
                  </p>

                  <button
                    onClick={() => setShowRevealModal(true)}
                    disabled={revealing || allocationData?.unrevealed === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500/10 disabled:cursor-not-allowed"
                  >
                    {revealing ? (
                      <Icons.Spinner className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icons.Unlock className="w-4 h-4 text-emerald-400" />
                    )}
                    Publish Live Reveals
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: Team Groupings visualizations */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Visualizer header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Team Allocation Ledger
              </h3>
            </div>

            {loading ? (
              <div className="glass-card p-12 text-center">
                <Icons.Spinner className="w-8 h-8 mx-auto text-brand-400 animate-spin" />
              </div>
            ) : !hasAssigned ? (
              <div className="glass-card p-12 text-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto text-slate-500">
                  <Icons.Users className="w-8 h-8 opacity-45" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Grid is Unallocated</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    No teams formed yet for this event, or participants are in staging buckets. Configure target parameters and trigger the balanced engine pipeline to establish groups.
                  </p>
                </div>
                
                {hasUnassigned && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-amber-300 text-xs rounded-xl max-w-sm mx-auto text-left flex gap-2">
                    <Icons.Info className="w-5 h-5 shrink-0 text-amber-400" />
                    <p className="leading-normal">
                      There are <strong>{allocationData.teams['__UNASSIGNED__'].length}</strong> approved participants staged in `__UNASSIGNED__` state awaiting pipeline allocation.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // The visual groupings layout
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(allocationData.teams).map(([teamName, members]) => {
                  // Exclude placeholder groups
                  if (teamName === '__UNASSIGNED__' || teamName === '__PENDING__') return null;

                  return (
                    <div key={teamName} className="glass-card p-4 space-y-3 flex flex-col justify-between">
                      <div>
                        {/* Team header */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/[0.05]">
                          <div>
                            <h4 className="font-black text-sm text-white">{teamName}</h4>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Size: <span className="font-mono text-slate-300 font-bold">{members.length} members</span>
                            </span>
                          </div>
                          
                          {/* Reveal/Unrevealed badges for team */}
                          <span className="text-[9px] font-mono font-bold uppercase">
                            {members.every(m => m.reveal_state === 'Revealed') ? (
                              <span className="text-emerald-400">Revealed</span>
                            ) : (
                              <span className="text-slate-500">Staged</span>
                            )}
                          </span>
                        </div>

                        {/* Diversity scorecards summary */}
                        <div className="pt-1.5 pb-2 text-[10px] text-slate-400 italic">
                          <span className="font-semibold text-slate-500">Diversity:</span> {getBranchScorecard(members)}
                        </div>

                        {/* Team members sublist */}
                        <div className="space-y-2 mt-1">
                          {members.map((member) => (
                            <div
                              key={member.allocation_id}
                              className="p-2 rounded-lg bg-black/15 border border-white/[0.03] flex items-center justify-between gap-3 text-xs group"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-200 truncate leading-snug">
                                  {member.name}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {member.branch} • Seat <strong className="font-mono text-slate-300">{member.row_coordinate}-{member.column_coordinate}</strong>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Cohort Role badge */}
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  ROLE_STYLES[member.assigned_cohort_role] || 'bg-white/10 text-slate-400'
                                }`}>
                                  {member.assigned_cohort_role}
                                </span>

                                {/* Inline re-roll trigger */}
                                <button
                                  onClick={() => rerollParticipant(member.user_id)}
                                  disabled={rerollingUserId !== null}
                                  title="Re-roll participant role & seat individually"
                                  className="p-1 rounded bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                                >
                                  {rerollingUserId === member.user_id ? (
                                    <Icons.Spinner className="w-3.5 h-3.5" />
                                  ) : (
                                    <Icons.Refresh className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-400 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto text-slate-500">
            <Icons.Cpu className="w-8 h-8 opacity-45" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Allocation Canvas Blank</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please select a target Event context from the top selector dropdown to populate metrics, view staged allocations, and access pipeline balancing models.
            </p>
          </div>
        </div>
      )}

      {/* ── STAGE REVEALS DOUBLE-CONFIRMATION MODAL ── */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dark-zone">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowRevealModal(false)} />
          <div className="relative glass-card p-6 w-full max-w-md bg-surface-900/90 border border-white/10 shadow-2xl animate-fade-in text-slate-200">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
              <Icons.AlertTriangle className="w-5 h-5 text-emerald-400 animate-bounce" />
              Publish Live Reveals
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you absolutely sure you want to release all staged team coordinate allocations to attendees? This action flips the visibility flag and makes team listings and seating cards visible instantly across all attendee portals.
            </p>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl mt-4">
              <strong>Action Impact:</strong> {allocationData?.unrevealed} participant profiles will receive live push credentials.
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06] mt-4">
              <button
                type="button"
                onClick={() => setShowRevealModal(false)}
                className="btn-ghost py-2 px-4 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={publishLiveReveals}
                className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
              >
                Confirm Live Release
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

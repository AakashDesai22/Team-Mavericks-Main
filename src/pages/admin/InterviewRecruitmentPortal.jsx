import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const Icons = {
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Star: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  CheckCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  XCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

const STAGES = ['Applied', 'Screened', 'Interview Scheduled', 'Interviewed', 'Shortlisted', 'Selected', 'Rejected'];

export default function InterviewRecruitmentPortal() {
  const { user } = useAuth();
  const isAdmin = user?.role_tier === 'Admin';

  const [recruitmentEvents, setRecruitmentEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'panels' | 'slots' | 'evaluate'

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [panels, setPanels] = useState([]);
  const [slots, setSlots] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Form & action states
  const [alert, setAlert] = useState(null);
  
  // Panel Modal
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [panelName, setPanelName] = useState('');
  const [venueRoom, setVenueRoom] = useState('');
  const [maxCandidates, setMaxCandidates] = useState(10);

  // Slot Auto-Generator State
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('10:00');
  const [slotEndTime, setSlotEndTime] = useState('13:00');
  const [slotDurationMins, setSlotDurationMins] = useState(20);
  const [slotPanelId, setSlotPanelId] = useState('');

  // Evaluation Form State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [evalScore, setEvalScore] = useState(80);
  const [evalComments, setEvalComments] = useState('');
  const [evalRecommendation, setEvalRecommendation] = useState('Select');
  const [evalStage, setEvalStage] = useState('Interviewed');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventData(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      if (res.data.success) {
        // Filter events of type Recruitment or with time_slots flag
        const eventsList = res.data.events.filter(e => {
          const flags = typeof e.feature_flags_json === 'string' 
            ? JSON.parse(e.feature_flags_json || '{}') 
            : (e.feature_flags_json || {});
          return e.event_type === 'Recruitment' || flags.time_slots || flags.candidate_kanban;
        });
        setRecruitmentEvents(eventsList);
        if (eventsList.length > 0) {
          setSelectedEventId(eventsList[0].id.toString());
        }
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to load recruitment drives.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventData = async (eventId) => {
    try {
      setLoading(true);
      const [candRes, panRes, slotRes, evalRes, userRes] = await Promise.all([
        api.get(`/interviews/candidates?event_id=${eventId}`),
        api.get(`/panels?event_id=${eventId}`),
        api.get(`/interviews/slots?event_id=${eventId}`),
        api.get(`/interviews/evaluations?event_id=${eventId}`).catch(() => ({ data: { evaluations: [] } })),
        api.get('/users').catch(() => ({ data: { users: [] } })),
      ]);

      if (candRes.data.success) setCandidates(candRes.data.candidates || []);
      if (panRes.data.success) setPanels(panRes.data.panels || []);
      if (slotRes.data.success) setSlots(slotRes.data.slots || []);
      if (evalRes.data.success) setEvaluations(evalRes.data.evaluations || []);
      if (userRes.data.users) setAllUsers(userRes.data.users || []);
    } catch (err) {
      setAlert({ type: 'error', text: 'Error fetching recruitment details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (candidateUserId, newStage) => {
    try {
      const res = await api.put(`/interviews/candidates/${candidateUserId}/stage`, {
        event_id: parseInt(selectedEventId),
        stage: newStage,
      });
      if (res.data.success) {
        setAlert({ type: 'success', text: res.data.message });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Stage update failed.' });
    }
  };

  const handleCreatePanel = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/panels', {
        event_id: parseInt(selectedEventId),
        panel_name: panelName,
        venue_room: venueRoom,
        max_candidates: parseInt(maxCandidates),
      });
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Interview Panel created!' });
        setShowPanelModal(false);
        setPanelName('');
        setVenueRoom('');
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to create panel.' });
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    if (!slotDate || !slotPanelId) {
      setAlert({ type: 'error', text: 'Please pick a slot date and panel.' });
      return;
    }
    try {
      // Calculate slots
      const start = new Date(`${slotDate}T${slotStartTime}`);
      const end   = new Date(`${slotDate}T${slotEndTime}`);
      const durationMs = slotDurationMins * 60 * 1000;

      let current = start;
      let count = 0;

      while (current.getTime() + durationMs <= end.getTime()) {
        const next = new Date(current.getTime() + durationMs);
        const sTimeStr = current.toTimeString().substring(0, 5);
        const eTimeStr = next.toTimeString().substring(0, 5);

        await api.post('/interviews/slots', {
          event_id: parseInt(selectedEventId),
          panel_id: parseInt(slotPanelId),
          slot_date: slotDate,
          start_time: sTimeStr,
          end_time: eTimeStr,
        });

        current = next;
        count++;
      }

      setAlert({ type: 'success', text: `Successfully generated ${count} interview slots!` });
      fetchEventData(selectedEventId);
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Slot generation failed.' });
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      setAlert({ type: 'error', text: 'Select a candidate to evaluate.' });
      return;
    }

    try {
      const res = await api.post('/interviews/evaluations', {
        candidate_user_id: selectedCandidate.user_id,
        event_id: parseInt(selectedEventId),
        panel_id: selectedCandidate.panel_id || null,
        score: parseFloat(evalScore),
        comments: evalComments,
        recommendation: evalRecommendation,
        stage: evalStage,
      });

      if (res.data.success) {
        setAlert({ type: 'success', text: `Recorded evaluation for ${selectedCandidate.name}` });
        setSelectedCandidate(null);
        setEvalComments('');
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Evaluation submission failed.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-header">Interview & Recruitment Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage candidate shortlisting, interview panels, slot bookings, and evaluator scorecards.
          </p>
        </div>

        {/* Recruitment Event Selector */}
        {recruitmentEvents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Drive:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="form-input text-sm py-2 px-3 w-64"
            >
              {recruitmentEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {alert && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="font-bold text-xs uppercase hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'kanban'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Icons.Users className="w-4 h-4" /> Shortlist Kanban
        </button>

        <button
          onClick={() => setActiveTab('panels')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'panels'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Icons.Calendar className="w-4 h-4" /> Panels & Interviewers
        </button>

        <button
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'slots'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Icons.Clock className="w-4 h-4" /> Time Slots ({slots.length})
        </button>

        <button
          onClick={() => setActiveTab('evaluate')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'evaluate'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Icons.Star className="w-4 h-4" /> Evaluator Console
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Icons.Spinner className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
          <p className="text-sm text-muted">Loading recruitment pipeline...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: KANBAN BOARD */}
          {activeTab === 'kanban' && (
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 min-w-[1200px]">
                {STAGES.map((stage) => {
                  const stageCandidates = candidates.filter((c) => (c.stage || 'Applied') === stage);
                  return (
                    <div
                      key={stage}
                      className="glass-card p-3 flex flex-col h-[650px]"
                      style={{ background: 'var(--surface-bg)' }}
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                          {stage}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-muted">
                          {stageCandidates.length}
                        </span>
                      </div>

                      <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        {stageCandidates.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted">No candidates</div>
                        ) : (
                          stageCandidates.map((cand) => (
                            <div
                              key={cand.user_id}
                              className="p-3 rounded-xl border transition-all hover:border-emerald-500/50"
                              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                            >
                              <div className="font-semibold text-sm text-white mb-1">{cand.name}</div>
                              <div className="text-xs text-muted">{cand.branch} • {cand.academic_year}</div>
                              <div className="text-[11px] font-mono text-emerald-400 mt-1">{cand.unique_registration_id}</div>

                              {cand.slot_date && (
                                <div className="mt-2 text-[11px] p-1.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  📅 {cand.slot_date} at {cand.start_time} ({cand.panel_name})
                                </div>
                              )}

                              {cand.score !== null && cand.score !== undefined && (
                                <div className="mt-2 text-xs flex items-center justify-between text-amber-400 font-bold">
                                  <span>Score: {cand.score}/100</span>
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                                    {cand.recommendation}
                                  </span>
                                </div>
                              )}

                              {/* Stage Transition Selector */}
                              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                <select
                                  value={cand.stage || 'Applied'}
                                  onChange={(e) => handleStageChange(cand.user_id, e.target.value)}
                                  className="text-[11px] bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white hover:border-emerald-500 focus:outline-none"
                                >
                                  {STAGES.map((s) => (
                                    <option key={s} value={s}>
                                      Move to {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PANELS & INTERVIEWERS */}
          {activeTab === 'panels' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Interview Panels</h3>
                {isAdmin && (
                  <button
                    onClick={() => setShowPanelModal(true)}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Icons.Plus className="w-4 h-4" /> Create Interview Panel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {panels.length === 0 ? (
                  <div className="col-span-3 text-center py-12 glass-card">
                    <p className="text-sm text-muted">No panels created for this drive yet.</p>
                  </div>
                ) : (
                  panels.map((p) => (
                    <div key={p.id} className="glass-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base text-white">{p.panel_name}</h4>
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                          {p.status}
                        </span>
                      </div>

                      <div className="text-xs text-muted space-y-1">
                        <div>📍 Venue / Room: <span className="text-white font-medium">{p.venue_room || 'TBD'}</span></div>
                        <div>👥 Capacity: <span className="text-white font-medium">{p.allocated_candidates_count} / {p.max_candidates} candidates</span></div>
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted">Assigned Interviewers:</span>
                        {p.judges && p.judges.length > 0 ? (
                          <div className="space-y-1">
                            {p.judges.map((j) => (
                              <div key={j.assignment_id} className="text-xs text-white flex items-center justify-between p-1.5 rounded bg-white/5">
                                <span>{j.name} ({j.email})</span>
                                <span className="text-[10px] text-emerald-400 uppercase font-semibold">{j.assigned_role}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic">No interviewers assigned yet.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TIME SLOTS & AUTO GENERATOR */}
          {activeTab === 'slots' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Slot Generator Form */}
              {isAdmin && (
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Icons.Clock className="w-5 h-5 text-emerald-400" /> Slot Auto-Generator
                  </h3>

                  <form onSubmit={handleGenerateSlots} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Target Panel</label>
                      <select
                        value={slotPanelId}
                        onChange={(e) => setSlotPanelId(e.target.value)}
                        className="form-input text-sm w-full"
                        required
                      >
                        <option value="">-- Select Interview Panel --</option>
                        {panels.map((p) => (
                          <option key={p.id} value={p.id}>{p.panel_name} ({p.venue_room})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Interview Date</label>
                      <input
                        type="date"
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="form-input text-sm w-full"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slotStartTime}
                          onChange={(e) => setSlotStartTime(e.target.value)}
                          className="form-input text-sm w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1">End Time</label>
                        <input
                          type="time"
                          value={slotEndTime}
                          onChange={(e) => setSlotEndTime(e.target.value)}
                          className="form-input text-sm w-full"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Duration per Candidate (mins)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={slotDurationMins}
                        onChange={(e) => setSlotDurationMins(parseInt(e.target.value))}
                        className="form-input text-sm w-full"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary text-sm py-2.5 w-full font-semibold">
                      Generate Time Slots
                    </button>
                  </form>
                </div>
              )}

              {/* Slot Matrix Display */}
              <div className="lg:col-span-2 glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Interview Slots Grid</h3>

                {slots.length === 0 ? (
                  <p className="text-xs text-muted italic">No time slots generated yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {slots.map((s) => (
                      <div
                        key={s.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          s.status === 'Booked'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm">{s.slot_date} ({s.start_time} - {s.end_time})</div>
                          <div className="text-xs opacity-80">{s.panel_name} • {s.venue_room || 'No Room'}</div>
                          {s.booked_by_name && (
                            <div className="text-xs font-semibold text-white mt-1">👤 Booked by: {s.booked_by_name} ({s.booked_by_email})</div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                          s.status === 'Booked' ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EVALUATOR CONSOLE */}
          {activeTab === 'evaluate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Candidate Picker */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Select Candidate to Evaluate</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {candidates.map((c) => (
                    <div
                      key={c.user_id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedCandidate?.user_id === c.user_id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/5 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-muted">
                          {c.stage || 'Applied'}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-1">{c.branch} • {c.academic_year}</div>
                      {c.score !== null && (
                        <div className="text-xs text-amber-400 font-bold mt-1">Previous Score: {c.score}/100</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation Submission Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Evaluation Scorecard</h3>

                {selectedCandidate ? (
                  <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-sm font-bold text-emerald-400">{selectedCandidate.name}</div>
                      <div className="text-xs text-muted">{selectedCandidate.email} • {selectedCandidate.phone}</div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Interview Rating Score (0 - 100)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={evalScore}
                          onChange={(e) => setEvalScore(e.target.value)}
                          className="w-full accent-emerald-500"
                        />
                        <span className="text-lg font-bold text-amber-400 w-12 text-right">{evalScore}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Recommendation</label>
                      <select
                        value={evalRecommendation}
                        onChange={(e) => setEvalRecommendation(e.target.value)}
                        className="form-input text-sm w-full"
                      >
                        <option value="Select">✅ Select (Recommend Hiring)</option>
                        <option value="Hold">⏸️ Hold (Borderline / Waitlist)</option>
                        <option value="Reject">❌ Reject</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Update Recruitment Stage</label>
                      <select
                        value={evalStage}
                        onChange={(e) => setEvalStage(e.target.value)}
                        className="form-input text-sm w-full"
                      >
                        <option value="Interviewed">Interviewed</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted block mb-1">Qualitative Interview Notes & Feedback</label>
                      <textarea
                        rows={4}
                        value={evalComments}
                        onChange={(e) => setEvalComments(e.target.value)}
                        placeholder="Communication skills, technical domain expertise, problem solving, teamwork..."
                        className="form-input text-sm w-full"
                      />
                    </div>

                    <button type="submit" className="btn-primary text-sm py-2.5 w-full font-semibold">
                      Submit Candidate Evaluation
                    </button>
                  </form>
                ) : (
                  <div className="py-20 text-center text-xs text-muted">
                    Click a candidate from the left list to open their evaluation scorecard.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE PANEL MODAL */}
      {showPanelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Create Interview Panel</h3>

            <form onSubmit={handleCreatePanel} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Panel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Domain Panel 1"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="form-input text-sm w-full"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted block mb-1">Venue / Room / Link</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 402 / Meet Link"
                  value={venueRoom}
                  onChange={(e) => setVenueRoom(e.target.value)}
                  className="form-input text-sm w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted block mb-1">Max Candidate Capacity</label>
                <input
                  type="number"
                  value={maxCandidates}
                  onChange={(e) => setMaxCandidates(e.target.value)}
                  className="form-input text-sm w-full"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPanelModal(false)}
                  className="flex-1 py-2 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2 text-sm font-semibold">
                  Create Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

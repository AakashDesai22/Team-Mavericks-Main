import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 16 14" />
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
  Edit: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  XCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Layer: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

const STAGES = ['Applied', 'Screened', 'Interview Scheduled', 'Interviewed', 'Shortlisted', 'Selected', 'Hold', 'Rejected'];

export default function InterviewRecruitmentPortal() {
  const { user } = useAuth();
  const isAdmin = user?.role_tier === 'Admin';
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('event_id');

  const [recruitmentEvents, setRecruitmentEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' | 'panels' | 'allocate' | 'my_panels'

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [panels, setPanels] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form & alert states
  const [alert, setAlert] = useState(null);

  // Panel Modal State (Create & Edit)
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [panelName, setPanelName] = useState('');
  const [venueRoom, setVenueRoom] = useState('');
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState([]);

  // Panel Allocation State
  const [allocCandidateUserId, setAllocCandidateUserId] = useState('');
  const [allocPanelId, setAllocPanelId] = useState('');
  const [allocSlotDate, setAllocSlotDate] = useState('');
  const [allocStartTime, setAllocStartTime] = useState('10:00');
  const [allocEndTime, setAllocEndTime] = useState('10:20');

  // Evaluation Modal State
  const [evalCandidate, setEvalCandidate] = useState(null);
  const [evalScore, setEvalScore] = useState(80);
  const [evalComments, setEvalComments] = useState('');
  const [evalRecommendation, setEvalRecommendation] = useState('Select');
  const [evalStage, setEvalStage] = useState('Interviewed');

  useEffect(() => {
    fetchEvents();
    fetchTeamMembers();
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
        const eventsList = res.data.events.filter((e) => {
          const flags = typeof e.feature_flags_json === 'string'
            ? JSON.parse(e.feature_flags_json || '{}')
            : (e.feature_flags_json || {});
          return e.event_type === 'Recruitment' || flags.time_slots || flags.candidate_kanban;
        });
        setRecruitmentEvents(eventsList);
        if (queryEventId && eventsList.some((e) => e.id.toString() === queryEventId)) {
          setSelectedEventId(queryEventId);
        } else if (eventsList.length > 0) {
          setSelectedEventId(eventsList[0].id.toString());
        }
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to load recruitment drives.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        const staff = (res.data.users || []).filter(u => u.role_tier === 'Admin' || u.role_tier === 'Member');
        setTeamMembers(staff);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchEventData = async (eventId) => {
    try {
      setLoading(true);
      const [candRes, panRes] = await Promise.all([
        api.get(`/interviews/candidates?event_id=${eventId}`),
        api.get(`/panels?event_id=${eventId}`),
      ]);

      if (candRes.data.success) setCandidates(candRes.data.candidates || []);
      if (panRes.data.success) setPanels(panRes.data.panels || []);
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
        setAlert({ type: 'success', text: `Candidate status updated to ${newStage}` });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Stage update failed.' });
    }
  };

  const openCreatePanelModal = () => {
    setEditingPanel(null);
    setPanelName('');
    setVenueRoom('');
    setSelectedInterviewerIds([]);
    setShowPanelModal(true);
  };

  const openEditPanelModal = (panel) => {
    setEditingPanel(panel);
    setPanelName(panel.panel_name || '');
    setVenueRoom(panel.venue_room || '');
    setSelectedInterviewerIds((panel.judges || []).map(j => j.user_id));
    setShowPanelModal(true);
  };

  const handleSavePanel = async (e) => {
    e.preventDefault();
    if (!panelName.trim()) {
      setAlert({ type: 'error', text: 'Panel name is required.' });
      return;
    }
    try {
      let res;
      if (editingPanel) {
        res = await api.put(`/panels/${editingPanel.id}`, {
          panel_name: panelName,
          venue_room: venueRoom,
          judge_user_ids: selectedInterviewerIds.map(id => parseInt(id)),
        });
      } else {
        res = await api.post('/panels', {
          event_id: parseInt(selectedEventId),
          panel_name: panelName,
          venue_room: venueRoom,
          judge_user_ids: selectedInterviewerIds.map(id => parseInt(id)),
        });
      }

      if (res.data.success) {
        setAlert({ type: 'success', text: editingPanel ? 'Panel updated!' : 'Panel created!' });
        setShowPanelModal(false);
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to save panel.' });
    }
  };

  const handleDeletePanel = async (panelId, name) => {
    if (!window.confirm(`Are you sure you want to delete panel "${name}"?`)) return;
    try {
      const res = await api.delete(`/panels/${panelId}`);
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Panel deleted successfully.' });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to delete panel.' });
    }
  };

  const handleAllocateCandidateToPanel = async (e) => {
    e.preventDefault();
    if (!allocCandidateUserId || !allocPanelId || !allocSlotDate) {
      setAlert({ type: 'error', text: 'Please select candidate, panel, and date.' });
      return;
    }

    try {
      await api.post(`/panels/${allocPanelId}/allocate`, {
        user_ids: [parseInt(allocCandidateUserId)],
        candidate_role: 'Candidate',
      });

      const slotRes = await api.post('/interviews/slots', {
        event_id: parseInt(selectedEventId),
        panel_id: parseInt(allocPanelId),
        slot_date: allocSlotDate,
        start_time: allocStartTime,
        end_time: allocEndTime,
      });

      if (slotRes.data.slot_id) {
        await api.post(`/interviews/slots/${slotRes.data.slot_id}/book`, {
          booked_by_user_id: parseInt(allocCandidateUserId),
        });
      }

      await api.put(`/interviews/candidates/${allocCandidateUserId}/stage`, {
        event_id: parseInt(selectedEventId),
        stage: 'Interview Scheduled',
      });

      setAlert({ type: 'success', text: 'Candidate successfully allocated to panel and schedule created!' });
      setAllocCandidateUserId('');
      fetchEventData(selectedEventId);
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Panel allocation failed.' });
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!evalCandidate) return;

    try {
      const res = await api.post('/interviews/evaluations', {
        candidate_user_id: evalCandidate.user_id,
        event_id: parseInt(selectedEventId),
        panel_id: evalCandidate.panel_id || null,
        score: parseFloat(evalScore),
        comments: evalComments,
        recommendation: evalRecommendation,
        stage: evalStage,
      });

      if (res.data.success) {
        setAlert({ type: 'success', text: `Evaluation saved for ${evalCandidate.name}!` });
        setEvalCandidate(null);
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Evaluation failed.' });
    }
  };

  const toggleInterviewerSelection = (memberId) => {
    setSelectedInterviewerIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  // Panels assigned to logged in team member
  const myAssignedPanels = useMemo(() => {
    return panels.filter(p => p.judges && p.judges.some(j => j.user_id === user?.id));
  }, [panels, user]);

  // Filtered candidate roster
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const stage = c.stage || 'Applied';
      const matchesStatus = statusFilter === 'ALL' || stage === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.branch && c.branch.toLowerCase().includes(q)) ||
        (c.unique_registration_id && c.unique_registration_id.toLowerCase().includes(q))
      );
      return matchesStatus && matchesSearch;
    });
  }, [candidates, statusFilter, searchQuery]);

  // Helper for color-coded status pills & borders
  const getStatusBadgeStyle = (stage) => {
    switch (stage) {
      case 'Selected':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Shortlisted':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'Hold':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Interview Scheduled':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'Interviewed':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-slate-100 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="section-header">Interview & Recruitment Portal</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Structured candidate roster, panel management & evaluation scorecards.'
              : 'Team Member Portal: Access assigned interview panels & evaluate candidates.'}
          </p>
        </div>

        {/* Drive Selector */}
        {recruitmentEvents.length > 0 && (
          <div className="flex items-center gap-2.5 bg-white/[0.03] p-2 rounded-2xl border border-white/[0.08]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Drive:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-surface-900 border border-white/10 text-brand-300 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none cursor-pointer"
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
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between shadow-lg ${
            alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="font-bold text-[10px] uppercase hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'candidates'
              ? 'border-brand-500 text-brand-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Icons.Users className="w-4 h-4" /> Candidate Roster ({candidates.length})
        </button>

        <button
          onClick={() => setActiveTab('my_panels')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'my_panels'
              ? 'border-brand-500 text-brand-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Icons.Calendar className="w-4 h-4" /> My Assigned Panels ({myAssignedPanels.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('panels')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'panels'
                ? 'border-brand-500 text-brand-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icons.Layer className="w-4 h-4" /> All Panels ({panels.length})
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('allocate')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'allocate'
                ? 'border-brand-500 text-brand-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icons.Plus className="w-4 h-4" /> Allocate Candidate
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Icons.Spinner className="w-8 h-8 mx-auto text-brand-400 mb-3" />
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">Loading recruitment database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: CANDIDATE ROSTER (Clean list view with color-coded status badges) */}
          {activeTab === 'candidates' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4 rounded-2xl">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status Filter:</span>
                  {['ALL', ...STAGES].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                        statusFilter === st
                          ? 'bg-brand-500 text-black font-black shadow-glow-sm'
                          : 'bg-white/[0.03] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search candidate by name, email, branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none w-full md:w-72"
                />
              </div>

              {/* Roster Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCandidates.length === 0 ? (
                  <div className="col-span-3 py-16 text-center glass-card rounded-2xl text-slate-500 text-xs italic">
                    No candidates found matching selected status/search query.
                  </div>
                ) : (
                  filteredCandidates.map((cand) => {
                    const currentStage = cand.stage || 'Applied';
                    const badgeStyle = getStatusBadgeStyle(currentStage);

                    return (
                      <div
                        key={cand.user_id}
                        className={`glass-card p-5 rounded-2xl border bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col justify-between space-y-4 ${badgeStyle.split(' ')[2]}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-white">{cand.name}</h3>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.unique_registration_id}</div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                              {currentStage}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 space-y-1">
                            <div>📚 {cand.branch || 'Branch N/A'} • {cand.academic_year || 'Year N/A'}</div>
                            <div>✉️ {cand.email}</div>
                            {cand.phone && <div>📞 {cand.phone}</div>}
                          </div>

                          {cand.panel_name && (
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] space-y-0.5">
                              <div>🏢 Assigned Panel: <strong>{cand.panel_name}</strong></div>
                              {cand.slot_date && (
                                <div>📅 Scheduled: {cand.slot_date} ({cand.start_time} - {cand.end_time})</div>
                              )}
                            </div>
                          )}

                          {cand.score !== null && cand.score !== undefined && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-bold space-y-0.5">
                              <div>Score Rating: {cand.score}/100</div>
                              <div>Recommendation: {cand.recommendation}</div>
                              {cand.comments && <div className="text-slate-300 font-normal italic leading-snug">"{cand.comments}"</div>}
                            </div>
                          )}
                        </div>

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setEvalCandidate(cand);
                              setEvalScore(cand.score || 80);
                              setEvalComments(cand.comments || '');
                              setEvalRecommendation(cand.recommendation || 'Select');
                              setEvalStage(cand.stage || 'Interviewed');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:bg-brand-500 hover:text-black transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <Icons.Star className="w-3 h-3" /> Evaluate
                          </button>

                          {isAdmin && (
                            <select
                              value={currentStage}
                              onChange={(e) => handleStageChange(cand.user_id, e.target.value)}
                              className="text-[10px] font-bold bg-surface-900 border border-white/10 rounded-xl px-2 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>Move to: {s}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MY ASSIGNED PANELS (For Team Members & Admins) */}
          {activeTab === 'my_panels' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Interview Panels Assigned to You</h3>

              {myAssignedPanels.length === 0 ? (
                <div className="py-16 text-center glass-card rounded-2xl text-slate-500 text-xs italic">
                  You are not currently assigned as an interviewer on any active panel for this recruitment drive.
                </div>
              ) : (
                <div className="space-y-6">
                  {myAssignedPanels.map((p) => {
                    // Candidates allocated to this panel
                    const panelCandidates = candidates.filter(c => c.panel_id === p.id);

                    return (
                      <div key={p.id} className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                          <div>
                            <h4 className="text-base font-black text-white">{p.panel_name}</h4>
                            <div className="text-xs text-slate-400 mt-0.5">📍 Venue / Room / Link: <span className="text-white font-semibold">{p.venue_room || 'TBD'}</span></div>
                          </div>

                          <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {panelCandidates.length} Allocated Candidates
                          </span>
                        </div>

                        {/* Allocated Candidates List */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Candidates Scheduled for your panel:</span>

                          {panelCandidates.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No candidates allocated to this panel yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {panelCandidates.map((c) => (
                                <div key={c.user_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-white">{c.name} ({c.branch})</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{c.email}</div>
                                    {c.slot_date && (
                                      <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">📅 {c.slot_date} ({c.start_time} - {c.end_time})</div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => {
                                      setEvalCandidate(c);
                                      setEvalScore(c.score || 80);
                                      setEvalComments(c.comments || '');
                                      setEvalRecommendation(c.recommendation || 'Select');
                                      setEvalStage(c.stage || 'Interviewed');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-brand-500 text-black hover:bg-brand-400 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-glow-sm"
                                  >
                                    <Icons.Star className="w-3 h-3 text-black" /> Evaluate
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL PANELS & CRUD (Admin Only) */}
          {activeTab === 'panels' && isAdmin && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">All Interview Panels</h3>
                <button
                  onClick={openCreatePanelModal}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 rounded-xl font-bold uppercase tracking-wider text-black shadow-glow-sm"
                >
                  <Icons.Plus className="w-4 h-4 text-black" /> Create Interview Panel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {panels.length === 0 ? (
                  <div className="col-span-3 text-center py-16 glass-card rounded-2xl text-xs text-slate-500">
                    No interview panels created for this drive yet.
                  </div>
                ) : (
                  panels.map((p) => (
                    <div key={p.id} className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                          <h4 className="font-black text-sm text-white">{p.panel_name}</h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPanelModal(p)}
                              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300"
                              title="Edit Panel"
                            >
                              <Icons.Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePanel(p.id, p.panel_name)}
                              className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              title="Delete Panel"
                            >
                              <Icons.Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 space-y-1">
                          <div>📍 Venue / Room / Link: <span className="text-white font-semibold">{p.venue_room || 'TBD'}</span></div>
                          <div>👥 Allocated Candidates: <span className="text-white font-semibold">{p.allocated_candidates_count} candidates</span></div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Team Interviewers:</span>
                          {p.judges && p.judges.length > 0 ? (
                            <div className="space-y-1">
                              {p.judges.map((j) => (
                                <div key={j.assignment_id} className="text-xs text-slate-200 flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                  <span className="font-medium">{j.name}</span>
                                  <span className="text-[9px] text-brand-400 font-bold uppercase">{j.assigned_role}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No team members assigned.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PANEL ALLOCATION (Admin Only) */}
          {activeTab === 'allocate' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Allocation Form */}
              <div className="lg:col-span-5 glass-card p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Icons.Layer className="w-4 h-4 text-brand-400" /> Allocate Candidate to Panel
                </h3>

                <form onSubmit={handleAllocateCandidateToPanel} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      1. Select Candidate:
                    </label>
                    <select
                      value={allocCandidateUserId}
                      onChange={(e) => setAllocCandidateUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Candidate --</option>
                      {candidates.map((c) => (
                        <option key={c.user_id} value={c.user_id}>
                          {c.name} ({c.branch}) — Current Stage: {c.stage || 'Applied'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      2. Assign Interview Panel:
                    </label>
                    <select
                      value={allocPanelId}
                      onChange={(e) => setAllocPanelId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Interview Panel --</option>
                      {panels.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.panel_name} ({p.venue_room || 'TBD'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      3. Interview Date:
                    </label>
                    <input
                      type="date"
                      value={allocSlotDate}
                      onChange={(e) => setAllocSlotDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none cursor-pointer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Start Time:</label>
                      <input
                        type="time"
                        value={allocStartTime}
                        onChange={(e) => setAllocStartTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">End Time:</label>
                      <input
                        type="time"
                        value={allocEndTime}
                        onChange={(e) => setAllocEndTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary text-xs py-3 w-full font-bold uppercase tracking-wider text-black rounded-xl shadow-glow-sm">
                    Assign Candidate to Panel
                  </button>
                </form>
              </div>

              {/* Panel Allocation Summary List */}
              <div className="lg:col-span-7 glass-card p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Allocated Interview Schedule</h3>

                {candidates.filter(c => c.panel_name).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8">No candidates allocated to panels yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                    {candidates.filter(c => c.panel_name).map((c) => (
                      <div key={c.user_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{c.name} ({c.branch})</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">🏢 {c.panel_name} • 📍 {c.venue_room || 'TBD'}</div>
                          {c.slot_date && (
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              📅 {c.slot_date} ({c.start_time} - {c.end_time})
                            </div>
                          )}
                        </div>

                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded border ${getStatusBadgeStyle(c.stage || 'Applied')}`}>
                          {c.stage || 'Interview Scheduled'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT PANEL MODAL */}
      {showPanelModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-lg rounded-[28px] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white">{editingPanel ? 'Edit Interview Panel' : 'Create Interview Panel'}</h3>
              <button onClick={() => setShowPanelModal(false)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePanel} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Panel Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Domain Panel A"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Venue / Room / Meeting Link:</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 302 / Google Meet Link"
                  value={venueRoom}
                  onChange={(e) => setVenueRoom(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Assign Team Member Interviewers:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-white/10 rounded-xl p-2 bg-surface-900 custom-scrollbar">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2">No team members found.</p>
                  ) : (
                    teamMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs"
                      >
                        <span className="text-white font-medium">{member.name} ({member.email})</span>
                        <input
                          type="checkbox"
                          checked={selectedInterviewerIds.includes(member.id)}
                          onChange={() => toggleInterviewerSelection(member.id)}
                          className="accent-brand-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPanelModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-black rounded-xl shadow-glow-sm">
                  {editingPanel ? 'Save Changes' : 'Create Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVALUATION MODAL */}
      {evalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-lg rounded-[28px] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white">Evaluate Candidate</h3>
              <button onClick={() => setEvalCandidate(null)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <div className="text-sm font-bold text-brand-300">{evalCandidate.name}</div>
                <div className="text-xs text-slate-400">{evalCandidate.branch} • {evalCandidate.academic_year}</div>
                <div className="text-xs text-slate-400">{evalCandidate.email}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Interview Score Rating (0 - 100):
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={evalScore}
                    onChange={(e) => setEvalScore(e.target.value)}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                  <span className="text-lg font-black text-amber-400 w-12 text-right">{evalScore}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Recommendation:</label>
                  <select
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="Select">✅ Select</option>
                    <option value="Hold">⏸️ Hold</option>
                    <option value="Reject">❌ Reject</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Stage Transition:</label>
                  <select
                    value={evalStage}
                    onChange={(e) => setEvalStage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="Interviewed">Interviewed</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Selected">Selected</option>
                    <option value="Hold">Hold</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Interviewer Feedback & Notes:</label>
                <textarea
                  rows={4}
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  placeholder="Technical skills, communication, problem solving..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEvalCandidate(null)}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-black rounded-xl shadow-glow-sm">
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

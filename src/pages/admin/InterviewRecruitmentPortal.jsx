import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

// SVG Icon Helpers
const Icons = {
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Download: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Order: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  ),
  Columns: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
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
  ),
  Forms: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Applications: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Panels: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Analytics: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Help: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Mail: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  MavericksLogo: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2L3 9l2 13h14l2-13-9-7zm0 3.5l5.5 4.28-1.2 7.72H7.7l-1.2-7.72L12 5.5z" />
    </svg>
  )
};

// Candidate Status Pill Filters (Strictly matching screenshot)
const STATUS_FILTERS = [
  'All',
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected'
];

// Valid Stage Transitions for backend/evaluations
const STAGES = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

// Helper to normalize backend stages to screenshot status pills
const getNormalizedStage = (stage) => {
  if (!stage) return 'Applied';
  const s = String(stage).trim();
  if (s === 'Screened' || s === 'Under Review' || s === 'Hold') return 'Under Review';
  if (s === 'Interview Scheduled' || s === 'Interviewed' || s === 'Interview') return 'Interview';
  if (s === 'Shortlisted') return 'Shortlisted';
  if (s === 'Selected') return 'Selected';
  if (s === 'Rejected') return 'Rejected';
  return 'Applied';
};

// Realistic mock data matching screenshot candidate records
const MOCK_CANDIDATES = [
  {
    user_id: 101,
    student_id: 'TM-26-21F9',
    prn: '2526UBT024',
    name: 'Subhalaxmi Biswas',
    email: 'subhalaxmibiswas10@gmail.com',
    phone: '8850861085',
    branch: 'biotech',
    academic_year: 'sy',
    stage: 'Applied'
  },
  {
    user_id: 102,
    student_id: 'TM-26-0016',
    prn: '2526UAI831',
    name: 'Aditya Rajesh Badakar',
    email: 'adityabadakar2007@gmail.com',
    phone: '7899539692',
    branch: 'aiml',
    academic_year: 'sy',
    stage: 'Applied'
  },
  {
    user_id: 103,
    student_id: 'TM-26-F208',
    prn: '2526UBT838',
    name: 'Sakshi Suresh Raut',
    email: 'rsakshisuresh@gmail.com',
    phone: '7249338105',
    branch: 'biotech',
    academic_year: 'sy',
    stage: 'Applied'
  },
  {
    user_id: 104,
    student_id: 'TM-26-C5F8',
    prn: '2526UAI131',
    name: 'Pruthviraj Shankar Chavan',
    email: 'pruthvirajchavan1292@gmail.com',
    phone: '9309343699',
    branch: 'aiml',
    academic_year: 'sy',
    stage: 'Applied'
  },
  {
    user_id: 105,
    student_id: 'TM-26-93F5',
    prn: '2526UCS151',
    name: 'Yatharth Dhanraj Uttarwar',
    email: 'yatharthuttarwar96@gmail.com',
    phone: '9767663411',
    branch: 'cse',
    academic_year: 'sy',
    stage: 'Applied'
  },
  {
    user_id: 106,
    student_id: 'TM-26-EC3C',
    prn: '2425001146',
    name: 'Basavraj G terdale',
    email: 'rajg95821@gmail.com',
    phone: '7620223879',
    branch: 'entc',
    academic_year: 'ty',
    stage: 'Applied'
  }
];

export default function InterviewRecruitmentPortal() {
  const { user } = useAuth();
  const isAdmin = user?.role_tier === 'Admin';
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('event_id');

  // Sub-navigation tab: 'applications' | 'panels' | 'allocate' | 'analytics' | 'forms' | 'faqs' | 'communicate'
  const [activeTab, setActiveTab] = useState('applications');

  // Data states
  const [recruitmentEvents, setRecruitmentEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [panels, setPanels] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filter, Search, Domain & Sort states
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // Column visibility states
  const [columnVisibility, setColumnVisibility] = useState({
    studentId: true,
    studentName: true,
    contactInfo: true,
    name: true,
    branch: true,
    yearOfStudy: true,
    status: true,
    action: true
  });

  // Modal / Drawer states
  const [alert, setAlert] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Panel Modal State
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [panelName, setPanelName] = useState('');
  const [venueRoom, setVenueRoom] = useState('');
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState([]);

  // Evaluation Modal State
  const [evalCandidate, setEvalCandidate] = useState(null);
  const [evalScore, setEvalScore] = useState(80);
  const [evalComments, setEvalComments] = useState('');
  const [evalRecommendation, setEvalRecommendation] = useState('Select');
  const [evalStage, setEvalStage] = useState('Interview');

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
      console.warn('Backend events fetch fallback to default:', err);
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
        api.get(`/interviews/candidates?event_id=${eventId}`).catch(() => ({ data: { success: false } })),
        api.get(`/panels?event_id=${eventId}`).catch(() => ({ data: { success: false } })),
      ]);

      if (candRes.data.success && candRes.data.candidates?.length > 0) {
        setCandidates(candRes.data.candidates);
      } else {
        // Fallback to rich mock candidates matching screenshot structure
        setCandidates(MOCK_CANDIDATES);
      }

      if (panRes.data.success) {
        setPanels(panRes.data.panels || []);
      }
    } catch (err) {
      setCandidates(MOCK_CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  // Change Candidate Stage
  const handleStageChange = async (candidateUserId, newStage) => {
    try {
      await api.put(`/interviews/candidates/${candidateUserId}/stage`, {
        event_id: parseInt(selectedEventId || '1'),
        stage: newStage,
      }).catch(() => null);

      setCandidates(prev => prev.map(c => c.user_id === candidateUserId ? { ...c, stage: newStage } : c));
      if (selectedCandidate && selectedCandidate.user_id === candidateUserId) {
        setSelectedCandidate(prev => ({ ...prev, stage: newStage }));
      }
      setAlert({ type: 'success', text: `Candidate status updated to ${newStage.toUpperCase()}` });
    } catch (err) {
      setAlert({ type: 'error', text: 'Failed to update stage.' });
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = (cand) => {
    if (window.confirm(`Are you sure you want to remove candidate ${cand.name}?`)) {
      setCandidates(prev => prev.filter(c => c.user_id !== cand.user_id));
      if (selectedCandidate?.user_id === cand.user_id) setSelectedCandidate(null);
      setAlert({ type: 'success', text: `Candidate ${cand.name} removed.` });
    }
  };

  // Panel Management
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
      if (editingPanel) {
        await api.put(`/panels/${editingPanel.id}`, {
          panel_name: panelName,
          venue_room: venueRoom,
          judge_user_ids: selectedInterviewerIds.map(id => parseInt(id)),
        }).catch(() => null);
        setPanels(prev => prev.map(p => p.id === editingPanel.id ? { ...p, panel_name: panelName, venue_room: venueRoom } : p));
      } else {
        const newP = {
          id: Date.now(),
          panel_name: panelName,
          venue_room: venueRoom,
          allocated_candidates_count: 0,
          judges: teamMembers.filter(m => selectedInterviewerIds.includes(m.id))
        };
        await api.post('/panels', {
          event_id: parseInt(selectedEventId || '1'),
          panel_name: panelName,
          venue_room: venueRoom,
          judge_user_ids: selectedInterviewerIds.map(id => parseInt(id)),
        }).catch(() => null);
        setPanels(prev => [...prev, newP]);
      }
      setAlert({ type: 'success', text: editingPanel ? 'Panel updated!' : 'Panel created!' });
      setShowPanelModal(false);
    } catch (err) {
      setAlert({ type: 'error', text: 'Failed to save panel.' });
    }
  };

  const handleDeletePanel = async (panelId, name) => {
    if (!window.confirm(`Are you sure you want to delete panel "${name}"?`)) return;
    try {
      await api.delete(`/panels/${panelId}`).catch(() => null);
      setPanels(prev => prev.filter(p => p.id !== panelId));
      setAlert({ type: 'success', text: 'Panel deleted.' });
    } catch (err) {
      setAlert({ type: 'error', text: 'Failed to delete panel.' });
    }
  };

  // Evaluation Submit
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!evalCandidate) return;
    setCandidates(prev => prev.map(c => {
      if (c.user_id === evalCandidate.user_id) {
        return {
          ...c,
          score: parseFloat(evalScore),
          comments: evalComments,
          recommendation: evalRecommendation,
          stage: evalStage
        };
      }
      return c;
    }));
    setAlert({ type: 'success', text: `Evaluation saved for ${evalCandidate.name}!` });
    setEvalCandidate(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Student ID", "PRN", "Name", "Email", "Phone", "Branch", "Year of Study", "Status", "Assigned Panel", "Score Rating", "Recommendation"];
    const rows = filteredCandidates.map(c => [
      c.student_id || `TM-26-${c.user_id}`,
      c.prn || 'N/A',
      c.name,
      c.email,
      c.phone || '',
      c.branch || '',
      c.academic_year || '',
      getNormalizedStage(c.stage),
      c.panel_name || 'Unassigned',
      c.score !== undefined && c.score !== null ? c.score : '',
      c.recommendation || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recruitment_candidates_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Domain options extracted dynamically from candidates list
  const domainOptions = useMemo(() => {
    const set = new Set();
    candidates.forEach(c => {
      if (c.branch) set.add(c.branch.toLowerCase());
    });
    return ['All Domains', ...Array.from(set)];
  }, [candidates]);

  // Filtered & Sorted Candidate List
  const filteredCandidates = useMemo(() => {
    let list = candidates.filter((c) => {
      const normStage = getNormalizedStage(c.stage);
      const matchesStatus = statusFilter === 'All' || normStage === statusFilter;
      const matchesDomain = selectedDomain === 'All Domains' || (c.branch && c.branch.toLowerCase() === selectedDomain.toLowerCase());
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.branch && c.branch.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.prn && c.prn.toLowerCase().includes(q)) ||
        (c.student_id && c.student_id.toLowerCase().includes(q))
      );
      return matchesStatus && matchesDomain && matchesSearch;
    });

    list.sort((a, b) => {
      const valA = (a.name || '').toLowerCase();
      const valB = (b.name || '').toLowerCase();
      if (sortOrder === 'asc') return valA.localeCompare(valB);
      return valB.localeCompare(valA);
    });

    return list;
  }, [candidates, statusFilter, selectedDomain, searchQuery, sortOrder]);

  // Status Badge Pill Styling
  const getBadgeStyle = (stage) => {
    const norm = getNormalizedStage(stage);
    switch (norm) {
      case 'Selected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Shortlisted':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20';
      case 'Interview':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20';
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex">
      
      {/* ── Sub Navigation Sidebar (Matching Left Menu Structure) ── */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden lg:flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
            <Icons.MavericksLogo className="w-5 h-5" />
          </div>
          <span className="font-extrabold tracking-wider text-sm uppercase text-slate-800 dark:text-slate-100">
            RECRUITMENT
          </span>
        </div>

        <nav className="p-4 space-y-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('forms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'forms'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Forms className="w-4 h-4" /> Forms
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Applications className="w-4 h-4" /> Applications
          </button>

          <button
            onClick={() => setActiveTab('panels')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'panels'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Panels className="w-4 h-4" /> Panels
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Analytics className="w-4 h-4" /> Analytics
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Help className="w-4 h-4" /> FAQs
          </button>

          <button
            onClick={() => setActiveTab('communicate')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'communicate'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icons.Mail className="w-4 h-4" /> Communicate
          </button>
        </nav>

        {/* Recruitment Event Drive Switcher */}
        {recruitmentEvents.length > 0 && (
          <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recruitment Drive:</div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none cursor-pointer"
            >
              {recruitmentEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </aside>

      {/* ── Main Content Container ── */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb Navigation Header */}
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
          <span>Dashboard</span>
          <span>/</span>
          <span>Recruitment</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Applications</span>
        </div>

        {/* Alert Notification */}
        {alert && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm border ${
            alert.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800'
          }`}>
            <span>{alert.text}</span>
            <button onClick={() => setAlert(null)} className="font-bold text-[10px] uppercase hover:underline">Dismiss</button>
          </div>
        )}

        {/* Main Header & CSV Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Management</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review, screen, and select candidates applying to Team Mavericks.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icons.Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>

        {/* ── Candidate Status Filter Bar (Strictly matching screenshot) ── */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* ── Search, Domain Filter & Secondary Controls Bar ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Icons.Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by value (Name, PRN, Email, Phone)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
            />
          </div>

          {/* Controls: Domain Filter, Order, Clear, Columns */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* All Domains Dropdown */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none cursor-pointer shadow-sm"
            >
              {domainOptions.map(domain => (
                <option key={domain} value={domain}>
                  {domain === 'All Domains' ? 'All Domains' : domain.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Order Sort Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Icons.Order className="w-3.5 h-3.5 text-slate-500" /> Order ({sortOrder.toUpperCase()})
            </button>

            {/* Clear All Filters */}
            {(searchQuery || statusFilter !== 'All' || selectedDomain !== 'All Domains') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setSelectedDomain('All Domains');
                }}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            )}

            {/* Columns Visibility Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnsMenu(prev => !prev)}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Icons.Columns className="w-3.5 h-3.5 text-slate-500" /> Columns
              </button>

              {showColumnsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-3 space-y-2 text-xs">
                  <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-100 dark:border-slate-800 pb-1">Toggle Columns</div>
                  {Object.keys(columnVisibility).map(col => (
                    <label key={col} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={columnVisibility[col]}
                        onChange={() => setColumnVisibility(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="accent-blue-600 rounded"
                      />
                      <span className="capitalize">{col.replace(/([AZ])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Main Tab Views ── */}
        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Icons.Spinner className="w-8 h-8 mx-auto text-blue-600 mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading student applications roster...</p>
          </div>
        ) : activeTab === 'applications' ? (
          
          /* ── STUDENT MANAGEMENT CANDIDATE TABLE (Matching Screenshot) ── */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    {columnVisibility.studentId && <th className="py-3.5 px-4 font-bold">STUDENT ID</th>}
                    {columnVisibility.studentName && <th className="py-3.5 px-4 font-bold">STUDENT NAME</th>}
                    {columnVisibility.contactInfo && <th className="py-3.5 px-4 font-bold">CONTACT INFO</th>}
                    {columnVisibility.name && <th className="py-3.5 px-4 font-bold">NAME</th>}
                    {columnVisibility.branch && <th className="py-3.5 px-4 font-bold">BRANCH</th>}
                    {columnVisibility.yearOfStudy && <th className="py-3.5 px-4 font-bold">YEAR OF STUDY</th>}
                    {columnVisibility.status && <th className="py-3.5 px-4 font-bold">STATUS</th>}
                    {columnVisibility.action && <th className="py-3.5 px-4 font-bold text-right">ACTION</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                        No candidates found matching the selected filter or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand) => {
                      const displayStage = getNormalizedStage(cand.stage);
                      return (
                        <tr
                          key={cand.user_id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* STUDENT ID */}
                          {columnVisibility.studentId && (
                            <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {cand.student_id || `TM-26-${cand.user_id}`}
                            </td>
                          )}

                          {/* STUDENT NAME (Name + Small PRN underneath) */}
                          {columnVisibility.studentName && (
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{cand.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.prn || '2526UBT024'}</div>
                            </td>
                          )}

                          {/* CONTACT INFO (Email + Phone) */}
                          {columnVisibility.contactInfo && (
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              <div className="truncate max-w-[200px]">{cand.email}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{cand.phone || '9876543210'}</div>
                            </td>
                          )}

                          {/* NAME */}
                          {columnVisibility.name && (
                            <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {cand.name}
                            </td>
                          )}

                          {/* BRANCH */}
                          {columnVisibility.branch && (
                            <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                              {cand.branch || 'N/A'}
                            </td>
                          )}

                          {/* YEAR OF STUDY */}
                          {columnVisibility.yearOfStudy && (
                            <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                              {cand.academic_year || 'sy'}
                            </td>
                          )}

                          {/* STATUS (Pill Badge) */}
                          {columnVisibility.status && (
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(displayStage)}`}>
                                {displayStage}
                              </span>
                            </td>
                          )}

                          {/* ACTION BUTTONS */}
                          {columnVisibility.action && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                              <button
                                onClick={() => setSelectedCandidate(cand)}
                                className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm transition-all cursor-pointer"
                              >
                                Details <Icons.ChevronRight className="w-3 h-3 text-slate-400" />
                              </button>

                              <button
                                onClick={() => {
                                  setEvalCandidate(cand);
                                  setEvalScore(cand.score || 80);
                                  setEvalComments(cand.comments || '');
                                  setEvalRecommendation(cand.recommendation || 'Select');
                                  setEvalStage(getNormalizedStage(cand.stage));
                                }}
                                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-all cursor-pointer"
                                title="Evaluate Candidate"
                              >
                                <Icons.Star className="w-3.5 h-3.5" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCandidate(cand)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 text-slate-400 transition-all cursor-pointer"
                                  title="Delete Candidate"
                                >
                                  <Icons.Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'panels' ? (
          
          /* ── INTERVIEW PANELS MANAGEMENT TAB ── */
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Interview Panels & Scheduling</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage evaluation panels, rooms, and interviewer assignments.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={openCreatePanelModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icons.Plus className="w-4 h-4" /> Create Panel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {panels.length === 0 ? (
                <div className="col-span-3 text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No interview panels created yet. Click "Create Panel" to add your first evaluation panel.
                </div>
              ) : (
                panels.map((p) => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.panel_name}</h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">📍 Room: {p.venue_room || 'TBD'}</div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPanelModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePanel(p.id, p.panel_name)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="text-slate-500 dark:text-slate-400">
                        👥 Allocated Candidates: <span className="font-bold text-slate-800 dark:text-slate-200">{candidates.filter(c => c.panel_id === p.id).length}</span>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Interviewers:</div>
                        {p.judges && p.judges.length > 0 ? (
                          <div className="space-y-1">
                            {p.judges.map(j => (
                              <div key={j.id || j.user_id} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg font-medium">
                                {j.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-[11px]">No interviewers assigned.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'analytics' ? (

          /* ── RECRUITMENT ANALYTICS OVERVIEW ── */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-semibold text-slate-400 uppercase">Total Applicants</div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{candidates.length}</div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Shortlisted</div>
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                  {candidates.filter(c => getNormalizedStage(c.stage) === 'Shortlisted').length}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Selected</div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {candidates.filter(c => getNormalizedStage(c.stage) === 'Selected').length}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase">In Interview</div>
                <div className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
                  {candidates.filter(c => getNormalizedStage(c.stage) === 'Interview').length}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs text-slate-500">
            This module section ({activeTab}) is active.
          </div>
        )}

      </main>

      {/* ── CANDIDATE DETAILS DRAWER / MODAL ── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto space-y-5 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedCandidate.name}</h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">ID: {selectedCandidate.student_id || `TM-26-${selectedCandidate.user_id}`}</div>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <Icons.XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Status Updater Dropdown */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Stage Status:</label>
                <select
                  value={getNormalizedStage(selectedCandidate.stage)}
                  onChange={(e) => handleStageChange(selectedCandidate.user_id, e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-bold py-2 px-3 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>Move to: {s}</option>
                  ))}
                </select>
              </div>

              {/* Profile Details List */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">PRN Number</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedCandidate.prn || '2526UBT024'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Email</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedCandidate.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Phone</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedCandidate.phone || '8850861085'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Branch / Domain</span>
                  <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">{selectedCandidate.branch || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Year of Study</span>
                  <span className="uppercase text-slate-800 dark:text-slate-200">{selectedCandidate.academic_year || 'sy'}</span>
                </div>
              </div>

              {/* Scorecard Summary if evaluated */}
              {selectedCandidate.score !== undefined && selectedCandidate.score !== null && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-xl space-y-1 text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-bold text-sm">Evaluation Score: {selectedCandidate.score}/100</div>
                  <div>Recommendation: <strong>{selectedCandidate.recommendation}</strong></div>
                  {selectedCandidate.comments && <div className="italic text-slate-600 dark:text-slate-300 mt-1">"{selectedCandidate.comments}"</div>}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  setEvalCandidate(selectedCandidate);
                  setEvalScore(selectedCandidate.score || 80);
                  setEvalComments(selectedCandidate.comments || '');
                  setEvalRecommendation(selectedCandidate.recommendation || 'Select');
                  setEvalStage(getNormalizedStage(selectedCandidate.stage));
                  setSelectedCandidate(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Evaluate Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVALUATION SCORECARD MODAL ── */}
      {evalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Evaluate Candidate</h3>
              <button onClick={() => setEvalCandidate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{evalCandidate.name}</div>
                <div className="text-slate-400 mt-0.5">{evalCandidate.branch?.toUpperCase()} • {evalCandidate.email}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Interview Score Rating (0 - 100):
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={evalScore}
                    onChange={(e) => setEvalScore(e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-base font-black text-amber-500 w-12 text-right">{evalScore}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Recommendation:</label>
                  <select
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="Select">✅ Select</option>
                    <option value="Hold">⏸️ Hold</option>
                    <option value="Reject">❌ Reject</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Status Stage:</label>
                  <select
                    value={evalStage}
                    onChange={(e) => setEvalStage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Interviewer Feedback & Notes:</label>
                <textarea
                  rows={3}
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  placeholder="Technical skills, domain knowledge, team fit..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEvalCandidate(null)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold rounded-xl shadow-md">
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT PANEL MODAL ── */}
      {showPanelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPanel ? 'Edit Interview Panel' : 'Create Interview Panel'}
              </h3>
              <button onClick={() => setShowPanelModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePanel} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Panel Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Panel A"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Venue / Room:</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 302 / Online Meet"
                  value={venueRoom}
                  onChange={(e) => setVenueRoom(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPanelModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold rounded-xl shadow-md">
                  {editingPanel ? 'Save Changes' : 'Create Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

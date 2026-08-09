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
  ),
  Download: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ArrowUpDown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  ),
  Columns: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" /><rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Grid: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  List: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  CheckCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Mail: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Sliders: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  History: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  )
};

// Exact Status Filter Pills requested from user's UI screenshot
const STATUS_FILTERS = ['All', 'Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

export default function InterviewRecruitmentPortal() {
  const { user } = useAuth();
  const isAdmin = user?.role_tier === 'Admin';
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('event_id');

  const [recruitmentEvents, setRecruitmentEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' | 'panels' | 'allocate' | 'my_panels'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [panels, setPanels] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Rubric Criteria State
  const [criteriaList, setCriteriaList] = useState([]);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState([]);

  // Candidate History Timeline Modal State
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [candidateHistoryLogs, setCandidateHistoryLogs] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Quick Desk Check-In Modal State
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinTicketInput, setCheckinTicketInput] = useState('');
  const [checkinCandidateResult, setCheckinCandidateResult] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Candidate Bulk Communication Dispatcher State
  const [showCommunicateModal, setShowCommunicateModal] = useState(false);
  const [commTargetSegment, setCommTargetSegment] = useState('Shortlisted');
  const [commSubject, setCommSubject] = useState('');
  const [commBodyHtml, setCommBodyHtml] = useState('');
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);

  // Evaluation criteria scoring state
  const [evalCriteriaScores, setEvalCriteriaScores] = useState({});

  // Filter & Search states (default: 'All' matching screenshot)
  const [statusFilter, setStatusFilter] = useState('All');
  const [domainFilter, setDomainFilter] = useState('All Domains');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [visibleColumns, setVisibleColumns] = useState({
    studentId: true,
    studentName: true,
    contactInfo: true,
    name: true,
    branch: true,
    yearOfStudy: true,
    status: true,
    action: true
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

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
  const [evalStage, setEvalStage] = useState('Interview');

  useEffect(() => {
    fetchEvents();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventData(selectedEventId);
      fetchCriteria(selectedEventId);
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

  const fetchCriteria = async (eventId) => {
    try {
      const res = await api.get(`/interviews/criteria?event_id=${eventId}`);
      if (res.data.success) {
        setCriteriaList(res.data.criteria || []);
      }
    } catch (err) {
      console.error('Error fetching rubric criteria:', err);
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
      const res = await api.del(`/panels/${panelId}`);
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Panel deleted successfully.' });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to delete panel.' });
    }
  };

  const handleDeleteCandidate = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to remove candidate "${name}" from this drive?`)) return;
    try {
      const res = await api.del(`/interviews/candidates/${userId}?event_id=${selectedEventId}`);
      if (res.data.success) {
        setAlert({ type: 'success', text: `Candidate "${name}" removed successfully.` });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to remove candidate.' });
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
        stage: 'Interview',
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
      const payloadScores = criteriaList.map(crit => ({
        criteria_id: crit.id,
        score: evalCriteriaScores[crit.id] !== undefined ? evalCriteriaScores[crit.id] : (crit.max_marks * 0.8),
      }));

      const res = await api.post('/interviews/evaluations', {
        candidate_user_id: evalCandidate.user_id,
        event_id: parseInt(selectedEventId),
        panel_id: evalCandidate.panel_id || null,
        score: criteriaList.length > 0 ? null : parseFloat(evalScore),
        criteria_scores: payloadScores,
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

  // Rubric Setup Handlers
  const openRubricSetup = () => {
    setEditingCriteria(criteriaList.length > 0 ? [...criteriaList] : [
      { title: 'Technical Depth & Knowledge', max_marks: 10, weightage: 2 },
      { title: 'Soft Skills & Communication', max_marks: 10, weightage: 1 },
      { title: 'Problem Solving & Logic', max_marks: 10, weightage: 2 },
      { title: 'Team Culture Alignment', max_marks: 10, weightage: 1 },
    ]);
    setShowRubricModal(true);
  };

  const handleSaveCriteriaSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/interviews/criteria', {
        event_id: parseInt(selectedEventId),
        criteria: editingCriteria,
      });
      if (res.data.success) {
        setAlert({ type: 'success', text: 'Evaluation Rubric saved successfully!' });
        setShowRubricModal(false);
        fetchCriteria(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to save rubric.' });
    }
  };

  // History Timeline Handler
  const handleViewHistory = async (cand) => {
    setHistoryCandidate(cand);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/interviews/candidates/${cand.user_id}/history?event_id=${selectedEventId}`);
      if (res.data.success) {
        setCandidateHistoryLogs(res.data.history || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Quick PRN Check-in Handler
  const handleQuickCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!checkinTicketInput.trim()) return;

    try {
      setCheckinLoading(true);
      const res = await api.post('/interviews/checkin', {
        event_id: parseInt(selectedEventId),
        prn_or_email: checkinTicketInput.trim(),
      });
      if (res.data.success) {
        setCheckinCandidateResult(res.data.candidate);
        setAlert({ type: 'success', text: res.data.message });
        fetchEventData(selectedEventId);
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Verification ticket not found.' });
    } finally {
      setCheckinLoading(false);
    }
  };

  // Bulk Email Handler
  const handleSendBulkEmailsSubmit = async (e) => {
    e.preventDefault();
    const targetCandidates = candidates.filter(c => {
      if (commTargetSegment === 'All') return true;
      return (c.stage || 'Applied').toLowerCase() === commTargetSegment.toLowerCase();
    });

    if (targetCandidates.length === 0) {
      setAlert({ type: 'error', text: `No candidates found in ${commTargetSegment} segment.` });
      return;
    }

    try {
      setSendingBulkEmail(true);
      const res = await api.post('/interviews/communicate', {
        event_id: parseInt(selectedEventId),
        candidate_user_ids: targetCandidates.map(c => c.user_id),
        subject: commSubject,
        body_html: commBodyHtml,
      });

      if (res.data.success) {
        setAlert({ type: 'success', text: res.data.message });
        setShowCommunicateModal(false);
        setCommSubject('');
        setCommBodyHtml('');
      }
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to send bulk emails.' });
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const toggleInterviewerSelection = (memberId) => {
    setSelectedInterviewerIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  // Distinct Domains derived from candidate branch data
  const distinctDomains = useMemo(() => {
    const set = new Set();
    candidates.forEach(c => {
      if (c.branch) set.add(c.branch);
    });
    return ['All Domains', ...Array.from(set)];
  }, [candidates]);

  // Panels assigned to logged in team member
  const myAssignedPanels = useMemo(() => {
    return panels.filter(p => p.judges && p.judges.some(j => j.user_id === user?.id));
  }, [panels, user]);

  // Filtered & Sorted candidate roster
  const filteredCandidates = useMemo(() => {
    let list = candidates.filter((c) => {
      const stage = c.stage || 'Applied';
      // Normalize stage mapping for Status Filters
      let matchesStatus = false;
      if (statusFilter === 'All') {
        matchesStatus = stage !== 'Rejected';
      } else if (statusFilter === 'Interview') {
        matchesStatus = stage === 'Interview' || stage === 'Interview Scheduled' || stage === 'Interviewed';
      } else {
        matchesStatus = stage.toLowerCase() === statusFilter.toLowerCase();
      }

      // Domain Filter
      const matchesDomain = domainFilter === 'All Domains' || (c.branch && c.branch.toLowerCase() === domainFilter.toLowerCase());

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.branch && c.branch.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.unique_registration_id && c.unique_registration_id.toLowerCase().includes(q))
      );

      return matchesStatus && matchesDomain && matchesSearch;
    });

    // Sorting
    list.sort((a, b) => {
      const valA = (a.unique_registration_id || a.name || '').toString().toLowerCase();
      const valB = (b.unique_registration_id || b.name || '').toString().toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [candidates, statusFilter, domainFilter, searchQuery, sortOrder]);

  // Recruitment Analytics Overview
  const recruitmentStats = useMemo(() => {
    const total = candidates.length;
    const applied = candidates.filter(c => (c.stage || 'Applied') === 'Applied').length;
    const shortlisted = candidates.filter(c => c.stage === 'Shortlisted').length;
    const interviewed = candidates.filter(c => c.stage === 'Interview' || c.stage === 'Interviewed').length;
    const selected = candidates.filter(c => c.stage === 'Selected').length;
    const rejected = candidates.filter(c => c.stage === 'Rejected').length;
    const checkedIn = candidates.filter(c => parseInt(c.checked_in_state, 10) === 1).length;
    const intakeRatio = total > 0 ? ((selected / total) * 100).toFixed(1) : 0;

    return { total, applied, shortlisted, interviewed, selected, rejected, checkedIn, intakeRatio };
  }, [candidates]);

  // Status Badge Pill Styling Helper
  const getStatusBadgeStyle = (stage) => {
    const norm = (stage || 'Applied').toLowerCase();
    if (norm === 'selected') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else if (norm === 'shortlisted') {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    } else if (norm === 'interview' || norm === 'interviewed') {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    } else if (norm === 'under review') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    } else if (norm === 'rejected') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  };

  const clearAllFilters = () => {
    setStatusFilter('All');
    setDomainFilter('All Domains');
    setSearchQuery('');
  };

  const exportToCsv = () => {
    if (candidates.length === 0) return;
    const headers = ['STUDENT ID', 'STUDENT NAME', 'EMAIL', 'PHONE', 'BRANCH', 'YEAR', 'STAGE', 'SCORE', 'PANEL', 'ROOM'];
    const rows = filteredCandidates.map(c => [
      c.unique_registration_id || `TM-26-${c.user_id}`,
      `"${c.name}"`,
      c.email,
      c.phone || '',
      c.branch || '',
      c.academic_year || '',
      c.stage || 'Applied',
      c.score !== null ? c.score : '',
      `"${c.panel_name || ''}"`,
      `"${c.venue_room || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Recruitment_Roster_${selectedEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-slate-100 text-left">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span>Dashboard</span>
          <span>/</span>
          <span>Recruitment</span>
          <span>/</span>
          <span className="text-white font-bold">Applications</span>
        </div>
      </div>

      {/* Main Page Title & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Student Management</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Review, screen, and select candidates applying to Team Mavericks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Drive Selector */}
          {recruitmentEvents.length > 0 && (
            <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.08]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Drive:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-surface-900 border border-white/10 text-brand-300 text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer"
              >
                {recruitmentEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Desk Check-in Button */}
          <button
            onClick={() => setShowCheckinModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> Ticket Verification
          </button>

          {/* Rubric Setup Button (Admin) */}
          {isAdmin && (
            <button
              onClick={openRubricSetup}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Icons.Sliders className="w-4 h-4 text-amber-300" /> Evaluation Rubric
            </button>
          )}

          {/* Bulk Email Button (Admin) */}
          {isAdmin && (
            <button
              onClick={() => {
                setCommSubject(`Important Update regarding Team Mavericks Recruitment 2026`);
                setCommBodyHtml(`<p>Dear {candidate_name},</p><p>We are pleased to share an update regarding your recruitment application for Team Mavericks (PRN: {prn}).</p><p>Your current status is: <strong>{stage}</strong>.</p><p>Assigned Panel: {panel_name} (Venue: {venue_room})</p><p>Best regards,<br>Team Mavericks Recruitment Board</p>`);
                setShowCommunicateModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-300 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Icons.Mail className="w-4 h-4 text-indigo-300" /> Bulk Email
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={exportToCsv}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-sm"
          >
            <Icons.Download className="w-4 h-4 text-slate-300" /> Export CSV
          </button>
        </div>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between shadow-lg ${alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="font-bold text-[10px] uppercase hover:underline">Dismiss</button>
        </div>
      )}

      {/* Recruitment Analytics & Funnel Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Candidates</span>
          <span className="text-xl font-black text-white block">{recruitmentStats.total}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 block">Shortlisted</span>
          <span className="text-xl font-black text-blue-400 block">{recruitmentStats.shortlisted}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">Interviewed</span>
          <span className="text-xl font-black text-indigo-400 block">{recruitmentStats.interviewed}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 block">Selected</span>
          <span className="text-xl font-black text-emerald-400 block">{recruitmentStats.selected}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-300 block">Rejected</span>
          <span className="text-xl font-black text-rose-400 block">{recruitmentStats.rejected}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 block">Intake Ratio</span>
          <span className="text-xl font-black text-amber-400 block">{recruitmentStats.intakeRatio}%</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-purple-300 block">Checked In</span>
          <span className="text-xl font-black text-purple-400 block">{recruitmentStats.checkedIn}</span>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'candidates'
              ? 'border-brand-500 text-brand-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          <Icons.Users className="w-4 h-4" /> Applications ({candidates.length})
        </button>

        <button
          onClick={() => setActiveTab('my_panels')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'my_panels'
              ? 'border-brand-500 text-brand-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          <Icons.Calendar className="w-4 h-4" /> My Panels ({myAssignedPanels.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('panels')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'panels'
                ? 'border-brand-500 text-brand-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
          >
            <Icons.Layer className="w-4 h-4" /> Panels ({panels.length})
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('allocate')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'allocate'
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
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">Loading student database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: CANDIDATE APPLICATIONS */}
          {activeTab === 'candidates' && (
            <div className="space-y-5">
              {/* STATUS FILTER PILL BUTTONS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {STATUS_FILTERS.map((st) => {
                  const isActive = statusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isActive
                          ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/20'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                        }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              {/* SEARCH & CONTROLS TOOLBAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter by value (Name, PRN, Email, Phone)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Right side controls matching toolbar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Domain Selector */}
                  <select
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {distinctDomains.map(d => (
                      <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                    ))}
                  </select>

                  {/* Order / Sort */}
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5"
                    title="Toggle Sort Order"
                  >
                    <Icons.ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Order
                  </button>

                  {/* Clear All Filters */}
                  {(statusFilter !== 'All' || domainFilter !== 'All Domains' || searchQuery !== '') && (
                    <button
                      onClick={clearAllFilters}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 transition-all"
                    >
                      Clear All Filters
                    </button>
                  )}

                  {/* Columns Selector Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnDropdown(prev => !prev)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5"
                    >
                      <Icons.Columns className="w-3.5 h-3.5 text-slate-400" /> Columns
                    </button>

                    {showColumnDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl z-20 space-y-2 text-xs">
                        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10 pb-1">Toggle Columns</div>
                        {Object.keys(visibleColumns).map(col => (
                          <label key={col} className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white">
                            <input
                              type="checkbox"
                              checked={visibleColumns[col]}
                              onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                              className="accent-blue-500 rounded"
                            />
                            <span className="capitalize">{col.replace(/([AZ])/g, ' $1')}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Table View"
                    >
                      <Icons.List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Grid Cards View"
                    >
                      <Icons.Grid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE VIEW */}
              {viewMode === 'table' ? (
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {visibleColumns.studentId && <th className="py-3.5 px-4 font-bold">STUDENT ID</th>}
                          {visibleColumns.studentName && <th className="py-3.5 px-4 font-bold">STUDENT NAME</th>}
                          {visibleColumns.contactInfo && <th className="py-3.5 px-4 font-bold">CONTACT INFO</th>}
                          {visibleColumns.name && <th className="py-3.5 px-4 font-bold">NAME</th>}
                          {visibleColumns.branch && <th className="py-3.5 px-4 font-bold">BRANCH</th>}
                          {visibleColumns.yearOfStudy && <th className="py-3.5 px-4 font-bold">YEAR OF STUDY</th>}
                          {visibleColumns.status && <th className="py-3.5 px-4 font-bold">STATUS</th>}
                          {visibleColumns.action && <th className="py-3.5 px-4 font-bold text-right">ACTION</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-16 text-center text-slate-500 italic">
                              No candidates found matching selected status/search query.
                            </td>
                          </tr>
                        ) : (
                          filteredCandidates.map((cand) => {
                            const currentStage = cand.stage || 'Applied';
                            const badgeStyle = getStatusBadgeStyle(currentStage);
                            const displayId = cand.unique_registration_id || (`TM-26-${cand.user_id.toString().padStart(4, '0')}`);
                            const displayPrn = cand.academic_year ? `2526${cand.branch ? cand.branch.substring(0, 3).toUpperCase() : 'UBT'}${cand.user_id}` : '2526UBT024';

                            return (
                              <tr key={cand.user_id} className="hover:bg-white/[0.03] transition-all">
                                {visibleColumns.studentId && (
                                  <td className="py-4 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                                    {displayId}
                                  </td>
                                )}

                                {visibleColumns.studentName && (
                                  <td className="py-4 px-4">
                                    <div className="font-bold text-white text-xs">{cand.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{displayPrn}</div>
                                  </td>
                                )}

                                {visibleColumns.contactInfo && (
                                  <td className="py-4 px-4">
                                    <div className="text-slate-300 text-xs font-medium">{cand.email}</div>
                                    {cand.phone && <div className="text-[11px] text-slate-400 mt-0.5">{cand.phone}</div>}
                                  </td>
                                )}

                                {visibleColumns.name && (
                                  <td className="py-4 px-4 text-slate-200 font-medium">
                                    {cand.name}
                                  </td>
                                )}

                                {visibleColumns.branch && (
                                  <td className="py-4 px-4 text-slate-300 lowercase font-medium">
                                    {cand.branch || 'biotech'}
                                  </td>
                                )}

                                {visibleColumns.yearOfStudy && (
                                  <td className="py-4 px-4 text-slate-300 lowercase font-medium">
                                    {cand.academic_year || 'sy'}
                                  </td>
                                )}

                                {visibleColumns.status && (
                                  <td className="py-4 px-4">
                                    <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                                      {currentStage}
                                    </span>
                                  </td>
                                )}

                                {visibleColumns.action && (
                                  <td className="py-4 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleViewHistory(cand)}
                                        className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300"
                                        title="View Stage Audit History Timeline"
                                      >
                                        <Icons.History className="w-3.5 h-3.5 text-brand-300" />
                                      </button>

                                      <button
                                        onClick={() => {
                                          setEvalCandidate(cand);
                                          setEvalScore(cand.score || 80);
                                          setEvalComments(cand.comments || '');
                                          setEvalRecommendation(cand.recommendation || 'Select');
                                          setEvalStage(cand.stage || 'Interview');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 font-medium text-xs transition-all flex items-center gap-1"
                                      >
                                        Details <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      </button>

                                      {isAdmin && (
                                        <button
                                          onClick={() => handleDeleteCandidate(cand.user_id, cand.name)}
                                          className="p-1.5 rounded-lg border border-white/10 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all"
                                          title="Delete Record"
                                        >
                                          <Icons.Trash className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
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
              ) : (
                /* GRID CARDS VIEW */
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
                          className="glass-card p-5 rounded-2xl border border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                              <div>
                                <span className="text-[9px] font-mono text-brand-400 font-bold">
                                  {cand.unique_registration_id || `TM-26-${cand.user_id}`}
                                </span>
                                <h4 className="text-sm font-black text-white">{cand.name}</h4>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                                {currentStage}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 space-y-1">
                              <div>Email: <span className="text-white">{cand.email}</span></div>
                              {cand.phone && <div>Phone: <span className="text-white">{cand.phone}</span></div>}
                              <div>Branch: <span className="text-white capitalize">{cand.branch || 'N/A'}</span> • Year: <span className="text-white uppercase">{cand.academic_year || 'N/A'}</span></div>
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
                              onClick={() => handleViewHistory(cand)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icons.History className="w-3 h-3 text-brand-300" /> Timeline
                            </button>

                            <button
                              onClick={() => {
                                setEvalCandidate(cand);
                                setEvalScore(cand.score || 80);
                                setEvalComments(cand.comments || '');
                                setEvalRecommendation(cand.recommendation || 'Select');
                                setEvalStage(cand.stage || 'Interview');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:bg-brand-500 hover:text-black transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                              <Icons.Star className="w-3 h-3" /> Evaluate
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY PANELS */}
          {activeTab === 'my_panels' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Interview Panels Assigned to You</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Interview slot times are for candidate reference. You can start, update, and evaluate assigned candidates at any time during operations.
                  </p>
                </div>
              </div>

              {myAssignedPanels.length === 0 ? (
                <div className="py-16 text-center glass-card rounded-2xl text-slate-500 text-xs italic">
                  You are not currently assigned as an interviewer on any active panel for this recruitment drive.
                </div>
              ) : (
                <div className="space-y-6">
                  {myAssignedPanels.map((p) => {
                    const panelCandidates = candidates.filter(c => c.panel_id === p.id);

                    return (
                      <div key={p.id} className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-5">
                        {/* Panel Header */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                          <div>
                            <h4 className="text-base font-black text-white flex items-center gap-2">
                              🏢 {p.panel_name}
                            </h4>
                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                              <span>📍 Venue / Room / Link: <strong className="text-white">{p.venue_room || 'TBD'}</strong></span>
                              <span className="text-white/20">•</span>
                              <span>👥 Assigned Interviewers: <strong className="text-brand-300">{p.judges && p.judges.length > 0 ? p.judges.map(j => j.name).join(', ') : 'None assigned'}</strong></span>
                            </div>
                          </div>

                          <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {panelCandidates.length} Candidate(s) Allocated
                          </span>
                        </div>

                        {/* Candidates List */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            Assigned Candidates Roster:
                          </span>

                          {panelCandidates.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-3 bg-white/[0.01] rounded-xl border border-white/[0.04]">
                              No candidates allocated to this panel yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {panelCandidates.map((c) => (
                                <div key={c.user_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3 hover:border-white/20 transition-all flex flex-col justify-between">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="text-xs font-black text-white">{c.name}</div>
                                        <div className="text-[10px] font-mono text-brand-400 font-semibold">{c.unique_registration_id || 'MAV-PRT'}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{c.branch} • {c.academic_year}</div>
                                      </div>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeStyle(c.stage || 'Applied')}`}>
                                        {c.stage || 'Applied'}
                                      </span>
                                    </div>

                                    {c.slot_date && (
                                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold">
                                        📅 Showcase Schedule: {c.slot_date} ({c.start_time} - {c.end_time})
                                      </div>
                                    )}

                                    {c.score !== null && c.score !== undefined && (
                                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-bold space-y-0.5">
                                        <div>Score: {c.score}/100 • Recommendation: {c.recommendation}</div>
                                        {c.comments && <div className="text-slate-300 font-normal italic">"{c.comments}"</div>}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                                    <span className="text-[9px] text-slate-500 font-medium">Ready for evaluation</span>
                                    <button
                                      onClick={() => {
                                        setEvalCandidate(c);
                                        setEvalScore(c.score || 80);
                                        setEvalComments(c.comments || '');
                                        setEvalRecommendation(c.recommendation || 'Select');
                                        setEvalStage(c.stage || 'Interview');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-brand-500 text-black hover:bg-brand-400 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-glow-sm cursor-pointer"
                                    >
                                      <Icons.Star className="w-3 h-3 text-black" /> {c.score !== null && c.score !== undefined ? 'Update Evaluation' : 'Evaluate Candidate'}
                                    </button>
                                  </div>
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
                          <div>👔 Panel Members: <span className="text-brand-300 font-semibold">{p.judges && p.judges.length > 0 ? p.judges.map(j => j.name).join(', ') : 'None assigned'}</span></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ALLOCATE CANDIDATE TO PANEL */}
          {activeTab === 'allocate' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Allocation Form (6 Cols) */}
              <div className="lg:col-span-6 glass-card p-6 rounded-[28px] border border-white/10 space-y-5">
                <h3 className="text-base font-black text-white border-b border-white/[0.06] pb-3">
                  Allocate Candidate to Panel & Schedule
                </h3>

                <form onSubmit={handleAllocateCandidateToPanel} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Select Candidate:
                    </label>
                    <select
                      value={allocCandidateUserId}
                      onChange={(e) => setAllocCandidateUserId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Candidate --</option>
                      {candidates.map((c) => (
                        <option key={c.user_id} value={c.user_id} className="bg-slate-900 text-white">
                          Candidate: {c.name} ({c.branch} - {c.unique_registration_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Select Target Panel:
                    </label>
                    <select
                      value={allocPanelId}
                      onChange={(e) => setAllocPanelId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Panel --</option>
                      {panels.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                          Panel: {p.panel_name} ({p.venue_room || 'No venue'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Showcase Schedule Date:
                    </label>
                    <input
                      type="date"
                      value={allocSlotDate}
                      onChange={(e) => setAllocSlotDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Start Time:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10:00 AM"
                        value={allocStartTime}
                        onChange={(e) => setAllocStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        End Time:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10:20 AM"
                        value={allocEndTime}
                        onChange={(e) => setAllocEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black mt-2 shadow-glow-sm"
                  >
                    Confirm Candidate Panel Allocation
                  </button>
                </form>
              </div>

              {/* Roster Ledger (6 Cols) */}
              <div className="lg:col-span-6 glass-card p-6 rounded-[28px] border border-white/10 space-y-4">
                <h3 className="text-base font-black text-white border-b border-white/[0.06] pb-3">
                  Allocated Candidate Schedules
                </h3>

                {candidates.filter(c => c.panel_name).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 italic">
                    No candidates allocated to any panel yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                    {candidates.filter(c => c.panel_name).map((c) => (
                      <div key={c.user_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>Candidate: {c.name}</span>
                            <span className="text-[10px] font-mono text-brand-400">({c.unique_registration_id})</span>
                          </div>
                          <div className="text-[10px] text-slate-300 mt-0.5">
                            🏢 Assigned Panel: <strong className="text-white">{c.panel_name}</strong> • 📍 Venue: <strong className="text-white">{c.venue_room || 'TBD'}</strong>
                          </div>
                          {c.slot_date && (
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              📅 Showcase Time: {c.slot_date} ({c.start_time} - {c.end_time})
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

      {/* MODAL 1: EVALUATION RUBRIC CONFIGURATOR (Admin) */}
      {showRubricModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-xl rounded-[28px] border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icons.Sliders className="w-4 h-4 text-amber-300" /> Evaluation Rubric Configurator
              </h3>
              <button onClick={() => setShowRubricModal(false)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Define the multi-criteria quantitative evaluation parameters for this recruitment drive (e.g. Technical Depth, Problem Solving, Soft Skills). Evaluators will score candidates on these exact parameters.
            </p>

            <form onSubmit={handleSaveCriteriaSubmit} className="space-y-4">
              <div className="space-y-3">
                {editingCriteria.map((crit, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criteria Parameter #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditingCriteria(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Technical Depth & Domain Knowledge"
                      value={crit.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingCriteria(prev => prev.map((item, i) => i === idx ? { ...item, title: val } : item));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-white/10 text-white text-xs font-medium focus:outline-none"
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Max Marks (e.g. 10):</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={crit.max_marks}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 10;
                            setEditingCriteria(prev => prev.map((item, i) => i === idx ? { ...item, max_marks: val } : item));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-white text-xs font-medium focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Weightage Multiplier (1-5):</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={crit.weightage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setEditingCriteria(prev => prev.map((item, i) => i === idx ? { ...item, weightage: val } : item));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-white text-xs font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEditingCriteria(prev => [...prev, { title: '', max_marks: 10, weightage: 1 }])}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-xs font-bold text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Icons.Plus className="w-4 h-4 text-brand-300" /> Add Criteria Parameter
              </button>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRubricModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold uppercase rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-xs font-black uppercase text-black rounded-xl shadow-glow-sm">
                  Save Rubric Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STAGE AUDIT TIMELINE MODAL */}
      {showHistoryModal && historyCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-md rounded-[28px] border border-white/10 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Icons.History className="w-4 h-4 text-brand-300" /> Stage Transition Audit
                </h3>
                <span className="text-[10px] font-mono text-brand-400">{historyCandidate.name} ({historyCandidate.unique_registration_id})</span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Icons.Spinner className="w-6 h-6 mx-auto mb-2 text-brand-400" />
                Loading transition logs...
              </div>
            ) : candidateHistoryLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No stage transition history logged yet.</p>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                {candidateHistoryLogs.map((log) => (
                  <div key={log.id} className="relative pl-7 text-xs space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-400 border-2 border-slate-900" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{log.old_stage} → <span className="text-emerald-400">{log.new_stage}</span></span>
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(log.created_at.replace(/-/g, '/')).toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Changed by: <strong className="text-slate-200">{log.changed_by_name || 'System / Admin'}</strong></div>
                    {log.notes && <div className="p-2 rounded bg-white/[0.03] text-[10px] text-slate-300 italic">{log.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK DESK TICKET CHECK-IN MODAL */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-md rounded-[28px] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icons.CheckCircle className="w-5 h-5 text-emerald-400" /> Desk Ticket Verification
              </h3>
              <button onClick={() => { setShowCheckinModal(false); setCheckinCandidateResult(null); setCheckinTicketInput(''); }} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter the candidate's unique PRN (e.g. <code>MAV-PRT-001</code>), email, or phone number to verify their ticket and check them in for the interview.
            </p>

            <form onSubmit={handleQuickCheckinSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Candidate PRN / Email / Ticket Code:</label>
                <input
                  type="text"
                  placeholder="e.g. MAV-PRT-001 or student@example.com"
                  value={checkinTicketInput}
                  onChange={(e) => setCheckinTicketInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={checkinLoading}
                className="w-full btn-primary py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black shadow-glow-sm flex items-center justify-center gap-2"
              >
                {checkinLoading ? <Icons.Spinner className="w-4 h-4 text-black" /> : 'Verify Ticket & Mark Present'}
              </button>
            </form>

            {checkinCandidateResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5 animate-fade-in">
                <div className="font-bold text-emerald-400">✓ Checked-In Successfully:</div>
                <div className="text-white font-bold">{checkinCandidateResult.name}</div>
                <div className="text-[10px] font-mono text-slate-300">{checkinCandidateResult.unique_registration_id} • {checkinCandidateResult.email}</div>
                <div className="text-[10px] text-slate-400">{checkinCandidateResult.branch} • {checkinCandidateResult.academic_year}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: BULK RECRUITMENT EMAIL DISPATCHER MODAL */}
      {showCommunicateModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-lg rounded-[28px] border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icons.Mail className="w-5 h-5 text-indigo-400" /> Templated Bulk Email Dispatcher
              </h3>
              <button onClick={() => setShowCommunicateModal(false)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBulkEmailsSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Segment:</label>
                <select
                  value={commTargetSegment}
                  onChange={(e) => setCommTargetSegment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All">All Active Candidates</option>
                  <option value="Shortlisted">Shortlisted Candidates</option>
                  <option value="Interview">Interview Stage Candidates</option>
                  <option value="Selected">Selected Candidates</option>
                  <option value="Rejected">Rejected Candidates</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Email Subject:</label>
                <input
                  type="text"
                  placeholder="e.g. Interview Venue & Schedule Update"
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Email Body (HTML supported):
                </label>
                <div className="text-[9px] text-slate-400 mb-1 flex flex-wrap gap-1">
                  <span>Available tags:</span>
                  <code className="text-brand-300">{'{candidate_name}'}</code>
                  <code className="text-brand-300">{'{prn}'}</code>
                  <code className="text-brand-300">{'{stage}'}</code>
                  <code className="text-brand-300">{'{panel_name}'}</code>
                  <code className="text-brand-300">{'{venue_room}'}</code>
                </div>
                <textarea
                  rows={6}
                  value={commBodyHtml}
                  onChange={(e) => setCommBodyHtml(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-slate-200 text-xs font-mono focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommunicateModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold uppercase rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBulkEmail}
                  className="flex-1 btn-primary py-2.5 text-xs font-black uppercase text-black rounded-xl shadow-glow-sm flex items-center justify-center gap-2"
                >
                  {sendingBulkEmail ? <Icons.Spinner className="w-4 h-4 text-black" /> : 'Dispatch Bulk Emails'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EVALUATION MODAL WITH MULTI-CRITERIA RUBRIC */}
      {evalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card p-6 w-full max-w-lg rounded-[28px] border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Evaluate Candidate</h3>
                <p className="text-xs text-slate-400 mt-0.5">{evalCandidate.name} ({evalCandidate.branch} - {evalCandidate.unique_registration_id})</p>
              </div>
              <button onClick={() => setEvalCandidate(null)} className="text-slate-400 hover:text-white">
                <Icons.XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              {/* Dynamic Rubric Criteria Scoring Controls */}
              {criteriaList.length > 0 ? (
                <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block mb-2">
                    Multi-Criteria Evaluation Rubric Parameters:
                  </span>
                  {criteriaList.map((crit) => (
                    <div key={crit.id} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>{crit.title} (Max: {crit.max_marks})</span>
                        <span className="text-amber-400">
                          {evalCriteriaScores[crit.id] !== undefined ? evalCriteriaScores[crit.id] : Math.round(crit.max_marks * 0.8)} / {crit.max_marks}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={crit.max_marks}
                        step="0.5"
                        value={evalCriteriaScores[crit.id] !== undefined ? evalCriteriaScores[crit.id] : Math.round(crit.max_marks * 0.8)}
                        onChange={(e) => setEvalCriteriaScores(prev => ({ ...prev, [crit.id]: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Overall Performance Score (0-100):
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={evalScore}
                      onChange={(e) => setEvalScore(e.target.value)}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <span className="text-lg font-black text-amber-400 w-12 text-right">{evalScore}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Recommendation:</label>
                  <select
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Select">✅ Select</option>
                    <option value="Hold">⏸️ Hold</option>
                    <option value="Reject">❌ Reject</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Update Status:</label>
                  <select
                    value={evalStage}
                    onChange={(e) => setEvalStage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {STATUS_FILTERS.filter(s => s !== 'All').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
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
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold uppercase text-xs tracking-wider text-white rounded-xl shadow-md">
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

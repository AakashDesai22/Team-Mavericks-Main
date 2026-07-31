import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import EventFormDesigner from './EventFormDesigner';

const Icons = {
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Edit: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Dollar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Upload: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Feedback: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  ArrowRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

export default function EventsManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role_tier === 'Admin';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active'); // Active / Draft / Archived

  // Modal State
  const [showEditor, setShowEditor] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // Null for create, event object for edit
  const [editorStep, setEditorStep] = useState(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('Recruitment');
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [status, setStatus] = useState('Draft');
  const [numDays, setNumDays] = useState(1);
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [coverImagePath, setCoverImagePath] = useState('');
  const [paymentType, setPaymentType] = useState('Free');
  const [paymentAmount, setPaymentAmount] = useState(0.00);
  const [paymentContext, setPaymentContext] = useState('');
  const [paymentQrPath, setPaymentQrPath] = useState('');
  const [requirePaymentProof, setRequirePaymentProof] = useState(1);
  const [financeContacts, setFinanceContacts] = useState([]);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [formSchema, setFormSchema] = useState('[]');
  const [feedbackSchema, setFeedbackSchema] = useState('[]');

  // Feedback Review Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEventTitle, setFeedbackEventTitle] = useState('');
  const [feedbackSubmissions, setFeedbackSubmissions] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // File Upload states
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [posterFile, setPosterFile] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events', { status: activeTab });
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setEventType('Recruitment');
    setMaxCapacity(100);
    setStatus('Draft');
    setNumDays(1);
    setSessionsPerDay(2);
    setCoverImagePath('');
    setPaymentType('Free');
    setPaymentAmount(0.00);
    setPaymentContext('');
    setPaymentQrPath('');
    setRequirePaymentProof(1);
    setFinanceContacts([]);
    setFormSchema('[]');
    setFeedbackSchema('[]');
    setEditorStep(1);
    setShowEditor(true);
  };

  const openEditModal = (evt) => {
    setEditingEvent(evt);
    setTitle(evt.title || '');
    setDescription(evt.description || '');
    setEventDate(evt.event_date || '');
    setEventType(evt.event_type || 'Custom');
    setMaxCapacity(evt.max_capacity || 0);
    setStatus(evt.status || 'Draft');
    setNumDays(evt.num_days || 1);
    setSessionsPerDay(evt.sessions_per_day || 2);
    setCoverImagePath(evt.cover_image_path || '');
    setPaymentType(evt.payment_type || 'Free');
    setPaymentAmount(parseFloat(evt.payment_amount || 0));
    setPaymentContext(evt.payment_context || '');
    setPaymentQrPath(evt.payment_qr_path || '');
    setRequirePaymentProof(evt.require_payment_proof !== undefined ? parseInt(evt.require_payment_proof, 10) : 1);
    let contacts = [];
    if (evt.finance_contacts) {
      try {
        contacts = typeof evt.finance_contacts === 'string' ? JSON.parse(evt.finance_contacts) : evt.finance_contacts;
      } catch (err) {
        console.error(err);
      }
    }
    setFinanceContacts(Array.isArray(contacts) ? contacts : []);
    setFormSchema(evt.form_schema || '[]');
    setFeedbackSchema(evt.feedback_schema || '[]');
    setEditorStep(1);
    setShowEditor(true);
  };

  const handleCloneEvent = (evt) => {
    setEditingEvent(null);
    setTitle(`${evt.title} (Clone)`);
    setDescription(evt.description || '');
    setEventDate('');
    setEventType(evt.event_type || 'Custom');
    setMaxCapacity(evt.max_capacity || 100);
    setStatus('Draft');
    setNumDays(evt.num_days || 1);
    setSessionsPerDay(evt.sessions_per_day || 2);
    setCoverImagePath(evt.cover_image_path || '');
    setPaymentType(evt.payment_type || 'Free');
    setPaymentAmount(parseFloat(evt.payment_amount || 0));
    setPaymentContext(evt.payment_context || '');
    setPaymentQrPath(evt.payment_qr_path || '');
    setRequirePaymentProof(evt.require_payment_proof !== undefined ? parseInt(evt.require_payment_proof, 10) : 1);
    setFinanceContacts(evt.finance_contacts || []);
    setFormSchema(evt.form_schema || '[]');
    setFeedbackSchema(evt.feedback_schema || '[]');
    setEditorStep(1);
    setShowEditor(true);
  };

  const handlePosterFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPoster(true);
    const formData = new FormData();
    formData.append('poster', file);

    try {
      const res = await api.upload('/upload/poster', formData);
      if (res.ok && res.data?.success) {
        setCoverImagePath(res.data.path);
      } else {
        alert(res.data?.error || 'Poster upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Poster upload failed.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleQrFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQr(true);
    const formData = new FormData();
    formData.append('qr', file);

    try {
      const res = await api.upload('/upload/qr', formData);
      if (res.ok && res.data?.success) {
        setPaymentQrPath(res.data.path);
      } else {
        alert(res.data?.error || 'QR code upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. QR code upload failed.');
    } finally {
      setUploadingQr(false);
    }
  };

  const addContact = () => {
    setFinanceContacts(prev => [...prev, { name: '', phone: '', email: '' }]);
  };

  const updateContact = (index, field, value) => {
    setFinanceContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeContact = (index) => {
    setFinanceContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) {
      alert('Event Title is required.');
      return;
    }

    let defaultFlags = {};
    if (eventType === 'Recruitment') {
      defaultFlags = { time_slots: true, candidate_kanban: true, sub_events: true, panels: true };
    } else if (eventType === 'Workshop_Series') {
      defaultFlags = { sub_events: true, sub_event_certificates: true, multi_day: true };
    } else if (eventType === 'Literary_Fest') {
      defaultFlags = { panels: true, topics_pool: true, judge_scoring: true, online_test_sso: true };
    } else if (eventType === 'Symposium') {
      defaultFlags = { multi_day: true, seating_cohorts: true, certificates: true, theatrical_reveal: true };
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      event_type: eventType,
      feature_flags_json: defaultFlags,
      max_capacity: parseInt(maxCapacity, 10),
      status,
      num_days: parseInt(numDays, 10),
      sessions_per_day: parseInt(sessionsPerDay, 10),
      cover_image_path: coverImagePath,
      payment_type: paymentType,
      payment_amount: parseFloat(paymentAmount),
      payment_context: paymentContext.trim(),
      payment_qr_path: paymentQrPath,
      require_payment_proof: requirePaymentProof,
      finance_contacts: financeContacts,
      form_schema: formSchema,
      feedback_schema: feedbackSchema
    };

    try {
      let res;
      if (editingEvent) {
        res = await api.put(`/events/${editingEvent.id}`, payload);
      } else {
        res = await api.post('/events', payload);
      }

      if (res.ok && res.data?.success) {
        setShowEditor(false);
        loadEvents();
      } else {
        alert(res.data?.error || 'Failed to save event.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to save event.');
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete event "${eventTitle}"? This will cascadingly erase all registrants, allocations, and attendance logs!`)) {
      return;
    }

    try {
      const res = await api.del(`/events/${eventId}`);
      if (res.ok && res.data?.success) {
        loadEvents();
      } else {
        alert(res.data?.error || 'Failed to delete event.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to delete event.');
    }
  };

  const openFeedbackViewer = async (eventId, eventTitle) => {
    setFeedbackEventTitle(eventTitle);
    setFeedbackSubmissions([]);
    setLoadingFeedback(true);
    setShowFeedbackModal(true);

    try {
      const res = await api.get(`/admin/events/${eventId}/feedback`);
      if (res.ok && res.data?.success) {
        setFeedbackSubmissions(res.data.submissions || []);
      } else {
        alert(res.data?.error || 'Failed to load feedback logs.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to contact gateway.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Participant Catalog Render
  if (!isAdmin) {
    return (
      <div className="space-y-8 animate-fade-in text-slate-100 text-left">
        <div>
          <h1 className="section-header">Academic Symposia Browser</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Browse through active educational events, view schedules, and secure your admission passes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24 gap-3">
            <Icons.Spinner className="w-8 h-8 text-brand-400" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">Syncing catalog...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card border border-dashed border-white/[0.08] p-16 text-center rounded-3xl">
            <Icons.Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-40" />
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-widest">No Active Events</h3>
            <p className="text-xs text-slate-500 mt-1">There are no upcoming active engagements right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="glass-card border border-white/[0.08] rounded-3xl bg-white/[0.01] overflow-hidden flex flex-col justify-between hover:border-brand-500/30 hover:bg-white/[0.02] transition-all duration-300 shadow-xl group"
              >
                {/* Poster Box */}
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
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Poster Graphic</span>
                    </div>
                  )}
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/75 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300">
                    {evt.payment_type === 'Free' ? 'FREE ENTRY' : `INR ${evt.payment_amount}`}
                  </span>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <span>{evt.event_date || 'TBD'}</span>
                      <span>{evt.num_days} Day(s)</span>
                    </div>
                    <h3 className="text-base font-black tracking-tight text-slate-100 group-hover:text-brand-400 transition-colors">
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
                      className="px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500 hover:text-black hover:border-brand-500 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      Secure Spot
                      <Icons.ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Admin CRUD Console Render
  return (
    <div className="space-y-6 animate-fade-in text-slate-100 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">Symposia Creator Console</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Build upcoming educational events, set registration constraints, structure check-in sessions, and design surveys.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 shadow-glow-sm transition-all"
        >
          <Icons.Plus className="w-4 h-4 text-black" />
          Create Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] max-w-md">
        {['Active', 'Draft', 'Archived'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === tab
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-glow-sm font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Event Grid list */}
      {loading ? (
        <div className="flex justify-center py-24 gap-3">
          <Icons.Spinner className="w-8 h-8 text-brand-400" />
          <span className="text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">Syncing creator records...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card border border-dashed border-white/[0.08] p-16 text-center rounded-3xl">
          <Icons.Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-40" />
          <h3 className="font-bold text-slate-300 text-sm uppercase tracking-widest">No Events Found</h3>
          <p className="text-xs text-slate-500 mt-1">There are no {activeTab.toLowerCase()} events logged inside the DB directory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {events.map((evt) => {
            const approved = parseInt(evt.registration_summary?.approved_count || 0, 10);
            const totalReg = parseInt(evt.registration_summary?.total_registrations || 0, 10);
            const percent = evt.max_capacity > 0 ? Math.min(100, Math.round((approved / evt.max_capacity) * 100)) : 0;
            const flags = typeof evt.feature_flags_json === 'string'
              ? JSON.parse(evt.feature_flags_json || '{}')
              : (evt.feature_flags_json || {});

            return (
              <div
                key={evt.id}
                className="glass-card border border-white/[0.08] p-6 rounded-[24px] bg-white/[0.01] flex flex-col md:flex-row gap-5 items-stretch hover:border-brand-500/20 hover:bg-white/[0.015] transition-all duration-300"
              >
                {/* Image block */}
                <div className="w-full md:w-40 h-32 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0 relative">
                  {evt.cover_image_path ? (
                    <img
                      src={evt.cover_image_path}
                      alt={evt.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icons.Calendar className="w-8 h-8 text-slate-600 opacity-60" />
                  )}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[8px] font-black uppercase tracking-wider text-slate-300">
                    {evt.payment_type}
                  </span>
                </div>

                {/* Details block */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 mr-2">
                          {evt.event_type || 'Custom'}
                        </span>
                        <h3 className="text-base font-black tracking-tight text-slate-200 inline">
                          {evt.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(evt)}
                          className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.08] hover:border-brand-500/20 text-slate-400 hover:text-white transition-all"
                          title="Edit Event"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCloneEvent(evt)}
                          className="p-1.5 rounded-lg border border-brand-500/10 bg-brand-500/5 hover:bg-brand-500/10 text-brand-300 transition-all text-[10px] font-bold"
                          title="Clone Event as Template"
                        >
                          📋 Clone
                        </button>
                        <button
                          onClick={() => openFeedbackViewer(evt.id, evt.title)}
                          className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.08] hover:border-brand-500/20 text-slate-400 hover:text-white transition-all"
                          title="View Feedback"
                        >
                          <Icons.Feedback className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all"
                          title="Delete Event"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                      {evt.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metrics bar & Contextual Action Button */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>Date: {evt.event_date || 'TBD'}</span>
                      <span>Approved: {approved} / {evt.max_capacity} Seats</span>
                    </div>

                    {/* Progress indicator */}
                    <div className="w-full h-1.5 bg-black/45 rounded-full overflow-hidden border border-white/[0.02]">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Contextual Action Button */}
                    <div className="pt-2 flex items-center justify-between">
                      {(evt.event_type === 'Recruitment' || flags.time_slots || flags.candidate_kanban) && (
                        <button
                          onClick={() => navigate(`/recruitment?event_id=${evt.id}`)}
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          🎯 Open Recruitment Console
                        </button>
                      )}

                      {(evt.event_type === 'Symposium' || flags.theatrical_reveal) && (
                        <button
                          onClick={() => navigate(`/presentation?event_id=${evt.id}`)}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          🎭 Seating & Reveal Stage
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── STUNNING CRUDS MULTI-STEP EDITOR MODAL ── */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dark-zone">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowEditor(false)} />
          <div className="relative glass-card w-full max-w-4xl bg-surface-900/95 border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200 rounded-[32px] animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">
                  Step {editorStep} of 5 • {editingEvent ? 'Modifier Workshop' : 'Blueprint Desk'}
                </span>
                <h2 className="text-lg font-black text-white leading-tight mt-0.5">
                  {editingEvent ? `Configure: ${title || 'Modify Event'}` : 'Compose New Symposium Event'}
                </h2>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Steps navigation strip */}
            <div className="px-6 py-2 bg-white/[0.01] border-b border-white/[0.04] flex items-center justify-between gap-1 overflow-x-auto shrink-0">
              {['1. General', '2. Poster', '3. Reg Form', '4. Attendance', '5. Pricing & Feedback'].map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = editorStep === stepNum;
                return (
                  <button
                    key={stepNum}
                    onClick={() => setEditorStep(stepNum)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-500 text-black shadow-glow-sm font-black'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-left">
              
              {/* STEP 1: Core Details */}
              {editorStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event Title:</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Mavericks Web3 Summit 2026"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Date:</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-semibold focus:border-brand-500/60 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event Description:</label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Compose general agenda, requirements, and information details cleanly..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event Blueprint Type:</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-brand-300 text-xs font-bold focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
                      >
                        <option value="Recruitment" className="bg-surface-900">🎯 Recruitment Drive (Panels, Slots & Kanban)</option>
                        <option value="Workshop_Series" className="bg-surface-900">🛠️ Workshop Series (Invicta Tiers & Certs)</option>
                        <option value="Literary_Fest" className="bg-surface-900">🗣️ Literary Fest (Verbafest GD/Debate)</option>
                        <option value="Symposium" className="bg-surface-900">🎭 Symposium (Bodhantra Seating & Reveal)</option>
                        <option value="Custom" className="bg-surface-900">⚡ Custom Event</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Capacity (Seats):</label>
                      <input
                        type="number"
                        min="1"
                        value={maxCapacity}
                        onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Publishing Status:</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-medium focus:border-brand-500/60 focus:outline-none pr-8 cursor-pointer"
                      >
                        <option value="Draft" className="bg-surface-900">Draft (Admin Only)</option>
                        <option value="Active" className="bg-surface-900">Active (Public Browse & Reg)</option>
                        <option value="Archived" className="bg-surface-900">Archived (Closed for attendance/review)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Poster graphic upload */}
              {editorStep === 2 && (
                <div className="space-y-4 animate-fade-in text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block text-left">
                      Upload cover banner poster graphic:
                    </label>

                    <div className="h-56 rounded-2xl bg-black/40 border border-white/[0.08] relative overflow-hidden flex items-center justify-center">
                      {coverImagePath ? (
                        <>
                          <img
                            src={coverImagePath}
                            alt="Final event poster preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setCoverImagePath('')}
                            className="absolute bottom-4 right-4 bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl hover:bg-red-600 transition-all border border-red-400"
                          >
                            Remove Poster
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Icons.Upload className="w-8 h-8 opacity-45" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">No Poster Uploaded</span>
                        </div>
                      )}
                    </div>

                    {!coverImagePath && (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingPoster}
                          onChange={handlePosterFileChange}
                          className="w-full text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20 file:cursor-pointer file:transition-all text-xs"
                        />
                        {uploadingPoster && (
                          <div className="absolute inset-0 bg-surface-900/80 flex items-center justify-center rounded-xl gap-2">
                            <Icons.Spinner className="w-4.5 h-4.5 text-brand-400" />
                            <span className="text-[10px] font-black uppercase text-brand-400 animate-pulse">Uploading file...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Dynamic Registration Form builder */}
              {editorStep === 3 && (
                <div className="animate-fade-in relative border border-white/[0.05] rounded-3xl p-5 bg-white/[0.005]">
                  <div className="p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-[10px] text-slate-400 mb-4 leading-normal flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-400 shrink-0 mt-0.5 animate-pulse" />
                    <span>
                      Draft the custom form fields participants must answer to register.
                      <strong> Name, Email, and Mobile No.</strong> are mandatory constants, so they are automatically included and locked.
                    </span>
                  </div>
                  <EventFormDesigner
                    key={editingEvent ? `edit-form-${editingEvent.id}` : 'create-form'}
                    initialSchema={formSchema}
                    onSchemaChange={(json) => setFormSchema(json)}
                  />
                </div>
              )}

              {/* STEP 4: Attendance config */}
              {editorStep === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-[10px] text-slate-400 leading-normal flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-400 shrink-0 mt-0.5 animate-pulse" />
                    <span>
                      Structure the days and session count. This automatically generates checking blocks in the live scanners (`AttendanceConsole`) and participant logs.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Event Duration (Days):</label>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        value={numDays}
                        onChange={(e) => setNumDays(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Attendance Blocks (Sessions):</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={sessionsPerDay}
                        onChange={(e) => setSessionsPerDay(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-black/35 rounded-2xl p-4 border border-white/5 space-y-3">
                    <span className="text-[9px] font-black text-brand-300 uppercase tracking-widest block">Generated Session Logs Layout:</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
                        <div key={`d-${day}`} className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] text-slate-400">
                          <strong className="text-slate-300 block mb-1">Day {day}</strong>
                          <div className="flex gap-1.5 flex-wrap">
                            {sessionsPerDay <= 2 ? (
                              <>
                                <span className="bg-black/45 px-2 py-0.5 rounded border border-white/5 text-[9px]">Morning</span>
                                <span className="bg-black/45 px-2 py-0.5 rounded border border-white/5 text-[9px]">Afternoon</span>
                              </>
                            ) : (
                              Array.from({ length: sessionsPerDay }, (_, s) => s + 1).map(sess => (
                                <span key={`d-${day}-s-${sess}`} className="bg-black/45 px-2 py-0.5 rounded border border-white/5 text-[9px]">Session {sess}</span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Payment Gateway Setup & Feedback */}
              {editorStep === 5 && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Payment Gateway Box */}
                  <div className="space-y-6 p-5 bg-white/[0.005] border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest block">Payment Setup</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configure event fee tier</span>
                    </div>
                    
                    {/* Fee Option Toggle */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fee Tier Option:</label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentType('Free');
                            setPaymentAmount(0);
                          }}
                          className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                            paymentType === 'Free'
                              ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
                              : 'bg-white/[0.01] border-white/[0.06] text-slate-400 hover:bg-white/[0.03]'
                          }`}
                        >
                          Without Fee (Free)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (paymentType === 'Free') {
                              setPaymentType('Online');
                            }
                          }}
                          className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                            paymentType !== 'Free'
                              ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
                              : 'bg-white/[0.01] border-white/[0.06] text-slate-400 hover:bg-white/[0.03]'
                          }`}
                        >
                          With Fee (Paid)
                        </button>
                      </div>
                    </div>

                    {paymentType !== 'Free' && (
                      <div className="space-y-6 animate-fade-in pt-2">
                        {/* Sub Mode Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Collection Mode:</label>
                            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setPaymentType('Online')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  paymentType === 'Online'
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Online (UPI + QR)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentType('Offline')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  paymentType === 'Offline'
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Offline (Contact Members)
                              </button>
                            </div>
                          </div>

                          {/* Fee Amount */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Fee (INR):</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                              placeholder="Enter fee amount..."
                            />
                          </div>
                        </div>

                        {/* Mode 1: ONLINE CONFIG */}
                        {paymentType === 'Online' && (
                          <div className="space-y-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* UPI ID */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">UPI Address / ID:</label>
                                <input
                                  type="text"
                                  value={paymentContext}
                                  onChange={(e) => setPaymentContext(e.target.value)}
                                  placeholder="e.g. upi-address@okbank"
                                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                                />
                              </div>

                              {/* Require Proof Toggle */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Screenshot Proof Requirement:</label>
                                <div
                                  onClick={() => setRequirePaymentProof(prev => prev === 1 ? 0 : 1)}
                                  className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] h-[42px] cursor-pointer"
                                >
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                    Require screenshot?
                                  </span>
                                  <span className={`w-8 h-4 rounded-full p-0.5 transition-all duration-200 ${
                                    requirePaymentProof === 1 ? 'bg-brand-500 flex justify-end' : 'bg-white/20 flex justify-start'
                                  }`}>
                                    <span className="w-3 h-3 rounded-full bg-black shrink-0" />
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* QR Graphic Uploader */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">UPI Payment QR Graphic:</label>
                              <div className="flex flex-col sm:flex-row gap-4 items-center p-3 rounded-xl border border-dashed border-white/20 bg-black/40">
                                {paymentQrPath ? (
                                  <>
                                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/50 flex items-center justify-center">
                                      <img
                                        src={paymentQrPath}
                                        alt="UPI Payment QR Code"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">QR Code Uploaded</p>
                                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{paymentQrPath.split('/').pop()}</p>
                                      <button
                                        type="button"
                                        onClick={() => setPaymentQrPath('')}
                                        className="text-[10px] text-red-400 hover:underline hover:text-red-300 mt-1 font-bold block"
                                      >
                                        Delete QR Graphic
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="relative w-full">
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      disabled={uploadingQr}
                                      onChange={handleQrFileChange}
                                      className="w-full text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20 file:cursor-pointer file:transition-all text-xs"
                                    />
                                    {uploadingQr && (
                                      <div className="absolute inset-0 bg-surface-900/80 flex items-center justify-center rounded-xl gap-2">
                                        <Icons.Spinner className="w-4.5 h-4.5 text-brand-400" />
                                        <span className="text-[10px] font-black uppercase text-brand-400 animate-pulse">Uploading QR...</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mode 2: OFFLINE CONFIG */}
                        {paymentType === 'Offline' && (
                          <div className="space-y-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] animate-fade-in">
                            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Offline Payment Contacts</span>
                                <span className="text-[9px] text-slate-500 block">List of members collecting offline entry fees</span>
                              </div>
                              <button
                                type="button"
                                onClick={addContact}
                                className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                Add Contact
                              </button>
                            </div>

                            {financeContacts.length === 0 ? (
                              <div className="text-center py-6 text-slate-500 text-xs italic">
                                No contact members added yet. Add at least one coordinator to direct offline collections.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                {financeContacts.map((contact, idx) => (
                                  <div key={idx} className="flex gap-2 items-center bg-black/35 p-3 rounded-xl border border-white/5 relative">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                                      <input
                                        type="text"
                                        required
                                        placeholder="Coordinator Name"
                                        value={contact.name || ''}
                                        onChange={(e) => updateContact(idx, 'name', e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-200 text-xs focus:border-brand-500/50 outline-none"
                                      />
                                      <input
                                        type="text"
                                        required
                                        placeholder="Mobile Number"
                                        value={contact.phone || ''}
                                        onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-200 text-xs focus:border-brand-500/50 outline-none"
                                      />
                                      <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={contact.email || ''}
                                        onChange={(e) => updateContact(idx, 'email', e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-200 text-xs focus:border-brand-500/50 outline-none"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeContact(idx)}
                                      className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all shrink-0"
                                      title="Remove Coordinator"
                                    >
                                      <Icons.Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feedback Survey Builder */}
                  <div className="space-y-4 p-5 bg-white/[0.005] border border-white/[0.06] rounded-2xl">
                    <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest block">Feedback Survey Composer</span>
                    <p className="text-[10px] text-slate-500">
                      Build the Google-Forms-style questions participants will fill out on their dashboard to audit this event.
                    </p>
                    
                    <EventFormDesigner
                      key={editingEvent ? `edit-feedback-${editingEvent.id}` : 'create-feedback'}
                      initialSchema={feedbackSchema}
                      onSchemaChange={(json) => setFeedbackSchema(json)}
                    />
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/[0.06] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setEditorStep(prev => Math.max(1, prev - 1))}
                disabled={editorStep === 1}
                className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Previous
              </button>

              <div className="flex gap-2">
                {editorStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setEditorStep(prev => Math.min(5, prev + 1))}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEvent}
                    className="btn-primary py-2.5 px-6 rounded-xl text-xs text-black font-black uppercase tracking-wider shadow-glow-sm transition-all"
                  >
                    Publish / Save Event
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── FEEDBACK RESULTS MODAL DIALOG ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dark-zone">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowFeedbackModal(false)} />
          <div className="relative glass-card w-full max-w-3xl bg-surface-900/95 border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200 rounded-[32px] animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">
                  Live Feedback Review
                </span>
                <h2 className="text-lg font-black text-white leading-tight mt-0.5">
                  Submissions for: {feedbackEventTitle}
                </h2>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
              {loadingFeedback ? (
                <div className="py-20 text-center space-y-3">
                  <Icons.Spinner className="w-8 h-8 mx-auto text-brand-400" />
                  <p className="text-slate-400 text-xs animate-pulse">Syncing survey responses...</p>
                </div>
              ) : feedbackSubmissions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs italic">
                  No feedback survey responses have been submitted for this event yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackSubmissions.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-5 bg-white/[0.01] border border-white/[0.06] rounded-2xl space-y-3 hover:border-white/10 transition-all"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 border-b border-white/[0.04]">
                        <span>Participant: {sub.participant_name}</span>
                        <span>Date: {new Date(sub.submitted_at).toLocaleString()}</span>
                      </div>

                      {/* Display key value feedback fields dynamically */}
                      <div className="space-y-2">
                        {sub.feedback_data && typeof sub.feedback_data === 'object' ? (
                          Object.entries(sub.feedback_data).map(([key, val]) => (
                            <div key={key} className="text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <p className="text-slate-200 font-semibold mt-0.5">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs italic text-slate-500">Corrupted responses payload.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/[0.06] text-right shrink-0">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

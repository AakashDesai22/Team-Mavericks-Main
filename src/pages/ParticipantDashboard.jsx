import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import CertificateGenerator from '../components/CertificateGenerator';
import DynamicFeedbackFormRenderer from '../components/DynamicFeedbackFormRenderer';
import CandidateSlotBooking from '../components/CandidateSlotBooking';

const Icons = {
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Shield: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Camera: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Feedback: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Sparkles: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.32 11.32l.707-.707" />
    </svg>
  ),
  Crown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  ),
  UserX: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="18" y1="8" x2="23" y2="13" />
      <line x1="23" y1="8" x2="18" y2="13" />
    </svg>
  )
};

export default function ParticipantDashboard() {
  const { user } = useAuth();

  // ── Data States ──
  const [profile, setProfile] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active registration carousel index
  const [activeRegIndex, setActiveRegIndex] = useState(0);

  // ── Voucher Upload State ──
  const [uploadingFor, setUploadingFor] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // ── Feedback State ──
  const [activeFeedbackEvent, setActiveFeedbackEvent] = useState(null); // Event model undergoing feedback submission
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmittedList, setFeedbackSubmittedList] = useState([]); // Track event IDs with submitted feedback

  // Holographic card mouse tilt effect
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Convert to rotation degrees
    const rotateX = -(y / rect.height) * 20;
    const rotateY = (x / rect.width) * 20;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.05s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s ease'
    });
  };

  // ── Fetch Profile & Registrations Data ──
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, ok } = await api.get('/auth/me');

    if (ok && data?.success) {
      setProfile(data.user);
      setRegistrations(data.registrations || []);
      setAllocations(data.allocations || []);
      setAttendance(data.attendance || []);
    } else {
      setError(data?.error || 'Failed to load attendee profile.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Voucher Upload Handler ──
  const handleVoucherUpload = async (eventId) => {
    if (!uploadFile) {
      setUploadError('Please select a payment image first.');
      return;
    }

    setUploadProgress('Processing voucher transmission…');
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('voucher', uploadFile);
    formData.append('event_id', eventId);

    const { data, ok } = await api.upload('/upload/voucher', formData);
    setUploadProgress('');

    if (ok && data?.success) {
      setUploadSuccess(
        `Voucher processed successfully. Ratio: ${data.processing?.compression_ratio || '1.0'}. Awaiting door admin validation.`
      );
      setUploadFile(null);
      setUploadingFor(null);
      await loadProfile();
      setTimeout(() => setUploadSuccess(''), 7000);
    } else {
      setUploadError(data?.error || 'Upload failed. Verify image format and network.');
    }
  };

  // ── Feedback Form Handler ──
  const handleDynamicFeedbackSubmit = async (formData) => {
    if (!activeReg) return;
    
    setSubmittingFeedback(true);
    try {
      const res = await api.post('/feedback/submit', {
        event_id: activeReg.event_id,
        feedback_data: formData
      });

      if ((res.status === 200 || res.status === 201) && res.data?.success) {
        setFeedbackSubmittedList(prev => [...prev, activeReg.event_id]);
        setActiveFeedbackEvent(null);
      } else {
        alert(res.data?.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error(err);
      alert('Network outage. Feedback submission failed.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':             return 'badge-approved animate-fade-in';
      case 'Pending_Verification': return 'badge-pending animate-pulse';
      case 'Rejected':             return 'badge-rejected';
      default:                     return 'badge';
    }
  };

  const getAllocationForEvent = (eventId) => {
    return allocations.find((a) => a.event_id === eventId);
  };

  const activeReg = registrations[activeRegIndex] || null;
  const activeAlloc = activeReg ? getAllocationForEvent(activeReg.event_id) : null;
  const feedbackUnlocked = activeReg?.event_status === 'Archived' || activeReg?.registration_status === 'Approved';

  const numDays = activeReg ? parseInt(activeReg.num_days || 1, 10) : 1;
  const sessionsCount = activeReg ? parseInt(activeReg.sessions_per_day || 2, 10) : 2;

  const sessionOptions = sessionsCount <= 2
    ? ['Morning', 'Afternoon']
    : Array.from({ length: sessionsCount }, (_, i) => `Session ${i + 1}`);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-44 glass-card rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 glass-card rounded-3xl" />
          <div className="h-64 glass-card rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl max-w-md mx-auto my-12" style={{ border: '1px solid var(--rose-border)', background: 'var(--rose-bg)' }}>
        <Icons.UserX className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--rose)' }} />
        <h2 className="text-lg font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Authentication Mismatch</h2>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button onClick={loadProfile} className="btn-primary mt-6 py-2 px-6">Retry Load</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" style={{ color: 'var(--text-primary)' }}>
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="section-header">
            Participant Portal Workspace
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Display your holographic pass at the entrance hall. Manage dynamic surveys and uploads.
          </p>
        </div>
        
        {registrations.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)' }}>
            {registrations.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveRegIndex(idx); setResult(null); }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={activeRegIndex === idx
                  ? { background: 'var(--brand-primary)', color: 'var(--text-inverse)' }
                  : { color: 'var(--text-muted)' }
                }
              >
                Pass {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main View Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Holographic Card Display (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Holographic Account Pass — Role-based coloring */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={tiltStyle}
            className={`pass-card-new ${
              user?.role_tier === 'Admin' ? 'pass-card-admin-new' :
              user?.role_tier === 'Member' ? 'pass-card-member-new' :
              'pass-card-participant-new'
            }`}
          >
            {/* 1. Left Panel (4/12 columns) */}
            <div className="pass-left-panel dark-zone">
              {/* Subtle wave vector background */}
              <svg className="absolute bottom-0 left-0 w-full h-32 opacity-15 pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,80 C30,75 60,95 100,85 L100,100 L0,100 Z" fill="none" stroke="var(--pass-accent)" strokeWidth="0.5" />
                <path d="M0,85 C40,80 70,98 100,90" fill="none" stroke="var(--pass-accent)" strokeWidth="0.3" />
                <path d="M0,90 C50,85 80,99 100,95" fill="none" stroke="var(--pass-accent)" strokeWidth="0.2" />
              </svg>

              {/* Brand logo block */}
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-[var(--pass-accent)] flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-black font-black text-sm">M</span>
                </div>
                <div className="text-left">
                  <h4 className="text-[10px] font-black text-white leading-none uppercase tracking-wider">MAVERICKS</h4>
                  <span className="text-[7px] font-bold text-[var(--pass-accent)] uppercase tracking-wider block mt-0.5">
                    {user?.role_tier === 'Admin' ? 'Admin Command Pass' :
                     user?.role_tier === 'Member' ? 'Staff Operations Pass' :
                     'Club Admission Pass'}
                  </span>
                </div>
              </div>

              {/* QR Code Container centered */}
              <div className="my-auto flex justify-center items-center relative z-10">
                <div className="p-2 bg-white rounded-xl shadow-2xl relative border border-white/20 shrink-0 inline-block">
                  <QRCodeSVG
                    value={activeReg?.registration_status === 'Approved' ? activeReg.participant_id : (profile?.unique_registration_id || 'MAV-PRT-PEND')}
                    size={80}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="absolute inset-0 m-auto w-5 h-5 rounded-md bg-[var(--pass-accent)] flex items-center justify-center shadow-md">
                    <span className="text-[10px] font-black text-black leading-none">M</span>
                  </div>
                </div>
              </div>

              {/* Empty placeholder to push QR to middle */}
              <div className="h-6 pointer-events-none" />

              {/* Notch divider */}
              <div className="pass-divider-notch" />
            </div>

            {/* 2. Right Panel (8/12 columns) */}
            <div className="pass-right-panel text-left">
              {/* Subtle wave vector background */}
              <svg className="absolute bottom-0 right-0 w-full h-full opacity-10 pointer-events-none z-0" viewBox="0 0 200 100" preserveAspectRatio="none">
                <path d="M0,100 C60,90 120,70 200,95" fill="none" stroke="var(--pass-accent)" strokeWidth="0.3" />
                <path d="M0,100 C70,85 140,65 200,90" fill="none" stroke="var(--pass-accent)" strokeWidth="0.2" />
                <path d="M0,100 C80,80 160,60 200,85" fill="none" stroke="var(--pass-accent)" strokeWidth="0.1" />
              </svg>

              {/* Top Row: Empty Left, Status Badge Right */}
              <div className="flex justify-end items-start relative z-10">
                {activeReg && activeReg.registration_status === 'Approved' ? (
                  <div className="bg-[#059669] border border-white/20 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg dark-zone">
                    <Icons.Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    <span className="text-[9px] font-black tracking-widest text-white uppercase">APPROVED</span>
                  </div>
                ) : (
                  <div className="bg-[#1c1c1c] border border-white/10 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg dark-zone">
                    <Icons.Shield className="w-3.5 h-3.5 text-white" />
                    <span className="text-[9px] font-black tracking-widest text-white uppercase">UNAPPROVED</span>
                  </div>
                )}
              </div>

              {/* Middle Section: Attendee Details */}
              <div className="space-y-3 relative z-10 my-4">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--pass-label-color)] block">Attendee Name</span>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none text-[var(--pass-text-primary)] flex items-center gap-1.5 mt-0.5">
                    {profile?.name}
                    <svg className="w-4 h-4 text-[var(--pass-accent)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L9 4H5v4L2 11l3 3v4h4l3 3 3-3h4v-4l3-3-3-3V4h-4z M10 17l-4-4 1.41-1.41L10 14.17l5.59-5.59L17 10z" />
                    </svg>
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--pass-text-secondary)] mt-1">
                    {profile?.branch} • {profile?.academic_year}
                  </p>
                </div>

                <div className="w-full border-t border-[var(--pass-border-color)] opacity-20 my-2" />

                <div className="text-[9px] font-semibold font-mono text-[var(--pass-text-secondary)] flex flex-wrap gap-x-4 gap-y-1 items-center">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-[var(--pass-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    M: {profile?.phone}
                  </span>
                  <span className="hidden sm:inline opacity-30">|</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-[var(--pass-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    E: {profile?.email}
                  </span>
                </div>
              </div>

              {/* Bottom Section: Symposium Info & Token Badge */}
              <div className="flex justify-between items-end relative z-10 pt-2 border-t border-[var(--pass-border-color)] border-dashed">
                <div className="text-left">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--pass-label-color)] block">Active Symposium</span>
                  <span className="text-xs font-black tracking-tight text-[var(--pass-text-primary)] truncate max-w-[150px] sm:max-w-[200px] block mt-0.5">
                    {activeReg ? activeReg.event_title : 'Not Registered'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--pass-label-color)] block">Participant Token</span>
                  <span className="inline-block text-xs font-mono font-bold text-[var(--pass-token-text)] bg-[var(--pass-token-bg)] border border-[var(--pass-token-border)] px-3 py-1 rounded-xl shadow-inner mt-0.5">
                    {activeReg && activeReg.registration_status === 'Approved'
                      ? activeReg.participant_id
                      : (profile?.unique_registration_id || 'MAV-PRT-PEND')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Survey intake widget if feedback state unlocked */}
          {activeReg && feedbackUnlocked && !feedbackSubmittedList.includes(activeReg.event_id) && (
            <div className="glass-card p-6 rounded-[24px]">
              <div className="flex justify-between items-center pb-3 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg" style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}>
                    <Icons.Feedback className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                      Symposium Feedback Portal
                    </h3>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Your inputs audit future club formats</p>
                  </div>
                </div>
                
                {!activeFeedbackEvent || activeFeedbackEvent.event_id !== activeReg.event_id ? (
                  <button
                    type="button"
                    onClick={() => setActiveFeedbackEvent(activeReg)}
                    className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    style={{ background: 'var(--brand-bg)', color: 'var(--brand-text)', border: '1px solid var(--brand-border)' }}
                  >
                    Open Survey
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveFeedbackEvent(null)}
                    className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}
                  >
                    Close
                  </button>
                )}
              </div>

              {activeFeedbackEvent && activeFeedbackEvent.event_id === activeReg.event_id && (
                <DynamicFeedbackFormRenderer
                  feedbackSchema={activeReg.feedback_schema}
                  onSubmit={handleDynamicFeedbackSubmit}
                  loading={submittingFeedback}
                  submitButtonText="Submit Anonymous Survey"
                />
              )}

              {!activeFeedbackEvent && (
                <div className="text-[10px] italic text-center p-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Provide assessment data for this symposium. Click "Open Survey" above.
                </div>
              )}
            </div>
          )}

          {activeReg && feedbackSubmittedList.includes(activeReg.event_id) && (
            <div className="p-4 rounded-[20px] text-xs flex items-center justify-center gap-2 animate-fade-in font-bold uppercase tracking-wider" style={{ background: 'var(--emerald-bg)', border: '1px solid var(--emerald-border)', color: 'var(--emerald)' }}>
              <Icons.Check className="w-4 h-4" />
              Feedback Submitted. Thank you!
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Event tracking ledger & Uploaders (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {uploadSuccess && (
            <div className="p-4 rounded-2xl text-xs flex items-start gap-2.5 leading-normal animate-fade-in" style={{ background: 'var(--emerald-bg)', border: '1px solid var(--emerald-border)', color: 'var(--emerald)' }}>
              <Icons.Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--emerald)' }} />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Engagement details card */}
          {activeReg ? (
            <div className="glass-card p-6 rounded-[24px] space-y-5 text-left relative overflow-hidden">
              <div className="flex justify-between items-start pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Selected Event Details</span>
                    {activeReg.event_status === 'Archived' ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                        🔒 Event Closed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✓ Registered
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {activeReg.event_title}
                  </h3>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                  {activeReg.event_date}
                </span>
              </div>

              {/* Recruitment Interview Slot Booking Widget */}
              <CandidateSlotBooking
                eventId={activeReg.event_id}
                candidateUserId={profile?.id}
              />

              {/* Status display */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: activeReg.registration_status === 'Approved' ? 'var(--emerald-bg)' : activeReg.registration_status === 'Pending_Verification' ? 'var(--amber-bg)' : 'var(--rose-bg)',
                  border: `1px solid ${activeReg.registration_status === 'Approved' ? 'var(--emerald-border)' : activeReg.registration_status === 'Pending_Verification' ? 'var(--amber-border)' : 'var(--rose-border)'}`,
                  color: activeReg.registration_status === 'Approved' ? 'var(--emerald)' : activeReg.registration_status === 'Pending_Verification' ? 'var(--amber)' : 'var(--rose)',
                }}>
                  <Icons.Shield className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-widest block" style={{ color: 'var(--text-muted)' }}>Admission Status</span>
                  <span className={`text-xs font-bold uppercase tracking-wider block mt-0.5 ${
                    activeReg.registration_status === 'Pending_Verification' ? 'animate-pulse' : ''
                  }`} style={{
                    color: activeReg.registration_status === 'Approved' ? 'var(--emerald)' : activeReg.registration_status === 'Pending_Verification' ? 'var(--amber)' : 'var(--rose)',
                  }}>
                    {activeReg.registration_status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Physical check-in monitor */}
              {activeReg.registration_status === 'Approved' && (
                <div className="p-3.5 rounded-xl text-xs flex items-center gap-3 transition-all" style={{
                  background: activeReg.checked_in_state ? 'var(--emerald-bg)' : 'var(--bg-hover)',
                  border: `1px solid ${activeReg.checked_in_state ? 'var(--emerald-border)' : 'var(--border-subtle)'}`,
                  color: activeReg.checked_in_state ? 'var(--emerald)' : 'var(--text-muted)',
                }}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeReg.checked_in_state ? 'animate-pulse' : ''}`}
                        style={{ background: activeReg.checked_in_state ? 'var(--emerald)' : 'var(--text-faint)' }} />
                  <span>
                    {activeReg.checked_in_state ? 'Scanned & Checked In at Hall Entrance' : 'Pending Gate Entrance Verification'}
                  </span>
                </div>
              )}

              {/* Session Attendance Ledger */}
              {activeReg.registration_status === 'Approved' && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)' }}>
                  <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--brand-text)' }}>
                      Session Attendance Ledger
                    </span>
                    <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      Real-time Logs
                    </span>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: numDays }, (_, i) => i + 1).map((dayNum) => (
                      <div key={dayNum} className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-active)', border: '1px solid var(--border-subtle)' }}>
                        <span className="text-[10px] font-bold block" style={{ color: 'var(--text-secondary)' }}>Day {dayNum}</span>
                        <div className="grid grid-cols-2 gap-2">
                          {sessionOptions.map((sessionLabel) => {
                            const match = attendance.find(log => 
                              log.event_id === activeReg.event_id &&
                              parseInt(log.day_number) === dayNum &&
                              String(log.session_label).toLowerCase() === String(sessionLabel).toLowerCase()
                            );
                            const checkedIn = !!match;
                            return (
                              <div
                                key={sessionLabel}
                                className="px-2.5 py-2 rounded-lg text-[10px] flex flex-col justify-center transition-all"
                                style={{
                                  background: checkedIn ? 'var(--emerald-bg)' : 'var(--bg-hover)',
                                  border: `1px solid ${checkedIn ? 'var(--emerald-border)' : 'var(--border-subtle)'}`,
                                  color: checkedIn ? 'var(--emerald)' : 'var(--text-muted)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{sessionLabel}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${checkedIn ? 'animate-pulse' : ''}`}
                                        style={{ background: checkedIn ? 'var(--emerald)' : 'var(--text-faint)' }} />
                                </div>
                                {checkedIn ? (
                                  <span className="text-[8px] font-mono mt-0.5" style={{ color: 'var(--emerald)', opacity: 0.7 }}>
                                    {match.marked_at ? new Date(match.marked_at.replace(/-/g, '/')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>
                                    Absent
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seating Allocations board */}
              {activeReg.registration_status === 'Approved' && activeAlloc && activeAlloc.reveal_state === 'Revealed' ? (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}>
                  <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--brand-text)' }}>Seat Coordinates</span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Assigned Cohort</span>
                      <span className="font-bold mt-0.5 block" style={{ color: 'var(--text-primary)' }}>{activeAlloc.team_name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Assigned Role</span>
                      <span className="badge-role text-[9px] mt-0.5 block inline-block">{activeAlloc.assigned_cohort_role}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Seat Coordinate Code</span>
                      <span className="font-mono font-bold text-sm px-3 py-1 rounded-lg block mt-1 inline-block" style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', border: '1px solid var(--border-primary)' }}>
                        Row {activeAlloc.row_coordinate} · Column {activeAlloc.column_coordinate}
                      </span>
                    </div>
                  </div>
                </div>
              ) : activeReg.registration_status === 'Approved' && activeAlloc && activeAlloc.reveal_state !== 'Revealed' ? (
                <div className="p-3.5 rounded-xl text-xs flex gap-2" style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-ping mt-1" style={{ background: 'var(--amber)' }} />
                  <span>Seat grid coordinate configuration locked by admin. Stay tuned for the theatrical reveal!</span>
                </div>
              ) : null}

              {/* Payment details / screenshot uploader if Pending or Rejected and not Free */}
              {activeReg.payment_type !== 'Free' && (activeReg.registration_status === 'Pending_Verification' || activeReg.registration_status === 'Rejected') && (
                <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {activeReg.registration_status === 'Rejected' && (
                    <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', color: 'var(--rose)' }}>
                      Rejection Reason: {activeReg.rejection_reason || 'Verification failed. Please check requirements and update details.'}
                    </div>
                  )}

                  {/* Offline Payment Information */}
                  {activeReg.payment_type === 'Offline' && (() => {
                    let contacts = [];
                    if (activeReg.finance_contacts) {
                      try {
                        contacts = typeof activeReg.finance_contacts === 'string' ? JSON.parse(activeReg.finance_contacts) : activeReg.finance_contacts;
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    return (
                      <div className="space-y-3 p-4 rounded-xl text-xs" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)' }}>
                        <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--brand-text)' }}>Offline Fee Submission</span>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          Please contact one of the following coordinators/members to pay your fee of <strong>INR {activeReg.payment_amount}</strong> offline:
                        </p>
                        <div className="space-y-2 mt-2">
                          {Array.isArray(contacts) && contacts.length > 0 ? (
                            contacts.map((c, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg space-y-1" style={{ background: 'var(--bg-active)', border: '1px solid var(--border-subtle)' }}>
                                <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                <div className="flex flex-wrap gap-x-4 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {c.phone && <span>Mobile: {c.phone}</span>}
                                  {c.email && <span>Email: {c.email}</span>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>No members configured. Contact admin office.</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Online Payment Information */}
                  {activeReg.payment_type === 'Online' && (
                    <div className="space-y-4">
                      {activeReg.payment_qr_path && (
                        <div className="space-y-2 p-4 rounded-xl text-center" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)' }}>
                          <span className="text-[10px] font-black uppercase tracking-widest block text-left mb-2" style={{ color: 'var(--brand-text)' }}>Scan & Pay Online</span>
                          <div className="w-40 h-40 mx-auto rounded-lg overflow-hidden bg-white flex items-center justify-center p-2" style={{ border: '1px solid var(--border-primary)' }}>
                            <img
                              src={activeReg.payment_qr_path}
                              alt="UPI Payment QR Code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {activeReg.payment_context && (
                            <p className="text-[10px] font-semibold font-mono mt-2 select-all py-1 px-2.5 rounded inline-block" style={{ color: 'var(--text-muted)', background: 'var(--bg-active)', border: '1px solid var(--border-subtle)' }}>
                              UPI: {activeReg.payment_context}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Upload block / status conditional on require_payment_proof */}
                      {parseInt(activeReg.require_payment_proof, 10) === 1 ? (
                        uploadingFor === activeReg.event_id ? (
                          <div className="space-y-4 text-xs text-left animate-fade-in">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                                Upload Payment Screenshot:
                              </label>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  setUploadFile(e.target.files[0] || null);
                                  setUploadError('');
                                }}
                                className="w-full text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              />
                            </div>

                            {uploadError && <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--rose)' }}>{uploadError}</p>}
                            {uploadProgress && <p className="text-[10px] font-bold uppercase animate-pulse" style={{ color: 'var(--brand-text)' }}>{uploadProgress}</p>}

                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => handleVoucherUpload(activeReg.event_id)}
                                disabled={!uploadFile || !!uploadProgress}
                                className="btn-primary px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl"
                              >
                                Upload Screen
                              </button>
                              <button
                                type="button"
                                onClick={() => { setUploadingFor(null); setUploadFile(null); setUploadError(''); }}
                                className="btn-ghost px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUploadingFor(activeReg.event_id)}
                            className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
                          >
                            <Icons.Camera className="w-4 h-4" style={{ color: 'var(--brand-text)' }} />
                            {activeReg.voucher_path ? 'Replace Uploaded Voucher' : 'Upload Payment Screenshot'}
                          </button>
                        )
                      ) : (
                        <div className="p-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center" style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}>
                          Verification Pending — No screenshot required
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Automated Certificate builder (Approved only) */}
              {activeReg.registration_status === 'Approved' && (
                <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <CertificateGenerator
                    eventId={activeReg.event_id}
                    participant={profile}
                    participantId={activeReg.participant_id}
                    teamName={activeAlloc?.team_name}
                    role={activeAlloc?.assigned_cohort_role}
                    eventTitle={activeReg.event_title}
                    eventDate={activeReg.event_date}
                  />
                </div>
              )}

            </div>
          ) : (
            <div className="glass-card p-12 text-center rounded-[24px]">
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                You have not registered for any upcoming symposium events. Browse events to secure a spot.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

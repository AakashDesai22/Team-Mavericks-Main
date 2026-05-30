import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

// Simple SVG Icons to ensure maximum compatibility and zero dependencies
const Icons = {
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  User: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Phone: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Award: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  Eye: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  ZoomIn: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  AlertTriangle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

export default function RegistrationsManager() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeTab, setActiveTab] = useState('Pending_Verification');
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({ total_all: 0, pending_count: 0, approved_count: 0, rejected_count: 0 });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState(null);
  
  // Loading & Processing states
  const [loading, setLoading] = useState(false);
  const [processingApprove, setProcessingApprove] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  
  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Image modal/zoom
  const [zoomVoucher, setZoomVoucher] = useState(false);

  // Fetch events on mount
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
      }
    }
    loadEvents();
  }, []);

  // Fetch registrations when filters change
  const fetchRegistrations = async () => {
    setLoading(true);
    const res = await api.get('/registrations', {
      status: activeTab,
      event_id: selectedEventId || undefined,
      page: currentPage,
      per_page: 50
    });
    
    if (res.ok && res.data?.success) {
      const fetchedRegs = res.data.registrations || [];
      setRegistrations(fetchedRegs);
      if (res.data.summary) {
        setSummary({
          total_all: parseInt(res.data.summary.total_all || 0, 10),
          pending_count: parseInt(res.data.summary.pending_count || 0, 10),
          approved_count: parseInt(res.data.summary.approved_count || 0, 10),
          rejected_count: parseInt(res.data.summary.rejected_count || 0, 10),
        });
      }
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
      
      // Auto-select the first registration if there are any and nothing is currently selected,
      // or if the previously selected registration is no longer in the list.
      if (fetchedRegs.length > 0) {
        if (!selectedReg || !fetchedRegs.some(r => r.registration_id === selectedReg.registration_id)) {
          setSelectedReg(fetchedRegs[0]);
        } else {
          // Keep current selection but update its contents with fresh backend data
          const updatedSelected = fetchedRegs.find(r => r.registration_id === selectedReg.registration_id);
          setSelectedReg(updatedSelected);
        }
      } else {
        setSelectedReg(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab, selectedEventId, currentPage]);

  const handleApprove = async () => {
    if (!selectedReg || processingApprove) return;
    setProcessingApprove(true);
    
    try {
      const res = await api.patch('/registrations/approve', {
        registration_id: selectedReg.registration_id
      });
      
      if (res.ok && res.data?.success) {
        await fetchRegistrations();
      } else {
        alert(res.data?.error || 'Failed to approve registration.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setProcessingApprove(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedReg || processingReject) return;
    setProcessingReject(true);

    try {
      const res = await api.patch('/registrations/reject', {
        registration_id: selectedReg.registration_id,
        reason: rejectionReason
      });

      if (res.ok && res.data?.success) {
        setShowRejectModal(false);
        setRejectionReason('');
        await fetchRegistrations();
      } else {
        alert(res.data?.error || 'Failed to reject registration.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setProcessingReject(false);
    }
  };

  // Client-side search filtering
  const filteredRegistrations = registrations.filter(reg => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      reg.participant_name?.toLowerCase().includes(query) ||
      reg.participant_email?.toLowerCase().includes(query) ||
      reg.tracking_code?.toLowerCase().includes(query) ||
      reg.participant_branch?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">Registrations Verification</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Review submitted transaction bank receipts and verify participant access.
          </p>
        </div>
        
        {/* Event Filter dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="event-filter" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Event Context:
          </label>
          <div className="relative">
            <select
              id="event-filter"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-medium focus:border-brand-500/60 focus:outline-none focus:ring-1 focus:ring-brand-500/25 appearance-none pr-10 cursor-pointer"
            >
              <option value="" className="bg-surface-900">All Events</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id} className="bg-surface-900">
                  {evt.title}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Tabs Bar ── */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] max-w-2xl">
        <button
          onClick={() => { setActiveTab('Pending_Verification'); setCurrentPage(1); }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider transition-all duration-300 ${
            activeTab === 'Pending_Verification'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <span>Pending</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'Pending_Verification' ? 'bg-brand-500/30 text-white' : 'bg-white/10 text-slate-400'
          }`}>
            {summary.pending_count}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('Approved'); setCurrentPage(1); }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider transition-all duration-300 ${
            activeTab === 'Approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <span>Approved</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'Approved' ? 'bg-emerald-500/30 text-white' : 'bg-white/10 text-slate-400'
          }`}>
            {summary.approved_count}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('Rejected'); setCurrentPage(1); }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider transition-all duration-300 ${
            activeTab === 'Rejected'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <span>Rejected</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'Rejected' ? 'bg-rose-500/30 text-white' : 'bg-white/10 text-slate-400'
          }`}>
            {summary.rejected_count}
          </span>
        </button>
      </div>

      {/* ── Main Dual Layout Container ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Registration List Panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Search Field */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Icons.Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, tracking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder:text-slate-500 text-xs outline-none focus:border-brand-500/50 focus:bg-white/[0.05] transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* List Card */}
          <div className="glass-card overflow-hidden">
            <div className="max-h-[550px] overflow-y-auto divide-y divide-white/[0.04]">
              {loading ? (
                <div className="p-8 text-center space-y-3">
                  <Icons.Spinner className="w-8 h-8 mx-auto text-brand-400" />
                  <p className="text-slate-400 text-xs">Fetching applicants ledger...</p>
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Icons.Search className="w-8 h-8 mx-auto opacity-30 text-brand-300" />
                  <p className="text-sm font-semibold">No records found</p>
                  <p className="text-xs opacity-60">Try modifying your filter options or queries.</p>
                </div>
              ) : (
                filteredRegistrations.map((reg) => (
                  <button
                    key={reg.registration_id}
                    onClick={() => setSelectedReg(reg)}
                    className={`w-full text-left p-4 transition-all duration-200 flex flex-col gap-1.5 ${
                      selectedReg?.registration_id === reg.registration_id
                        ? 'bg-brand-500/10 border-l-4 border-brand-500 pl-3'
                        : 'hover:bg-white/[0.02] border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-200 truncate max-w-[150px]">
                        {reg.participant_name}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.05]">
                        {reg.tracking_code}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-slate-400 truncate">
                      {reg.participant_branch} • Year {reg.academic_year}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                      <span className="truncate max-w-[140px]">{reg.event_title}</span>
                      <span>
                        {new Date(reg.registered_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Side-by-side verification pane */}
        <div className="lg:col-span-8">
          {selectedReg ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Profile Details Panel (md:col-span-5) */}
              <div className="md:col-span-5 glass-card p-5 space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs text-brand-400 font-bold uppercase tracking-wider mb-1">
                      <Icons.Award className="w-3.5 h-3.5" />
                      Registration Profile
                    </div>
                    <h2 className="text-lg font-black text-white leading-tight">
                      {selectedReg.participant_name}
                    </h2>
                    <span className="inline-block mt-2">
                      {selectedReg.status === 'Pending_Verification' && (
                        <span className="badge-pending">Pending Review</span>
                      )}
                      {selectedReg.status === 'Approved' && (
                        <span className="badge-approved">Approved Entry</span>
                      )}
                      {selectedReg.status === 'Rejected' && (
                        <span className="badge-rejected">Rejected Voucher</span>
                      )}
                    </span>
                  </div>

                  {/* Profile data list */}
                  <div className="space-y-4 text-xs">
                    <div className="flex gap-3">
                      <div className="text-slate-500 mt-0.5 shrink-0"><Icons.User className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tracking Code</div>
                        <div className="font-mono text-slate-200 mt-0.5 select-all">{selectedReg.tracking_code}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="text-slate-500 mt-0.5 shrink-0"><Icons.Mail className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email Address</div>
                        <div className="text-slate-200 mt-0.5 truncate select-all">{selectedReg.participant_email}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="text-slate-500 mt-0.5 shrink-0"><Icons.Phone className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact Number</div>
                        <div className="text-slate-200 mt-0.5 select-all">{selectedReg.participant_phone}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="text-slate-500 mt-0.5 shrink-0"><Icons.Calendar className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Academic Branch</div>
                        <div className="text-slate-200 mt-0.5">{selectedReg.participant_branch} (Year {selectedReg.academic_year})</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="text-slate-500 mt-0.5 shrink-0"><Icons.Calendar className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Event Targeted</div>
                        <div className="text-slate-200 mt-0.5 font-semibold">{selectedReg.event_title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Event Date: {new Date(selectedReg.event_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {selectedReg.status === 'Rejected' && selectedReg.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2.5 items-start">
                      <Icons.AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="font-bold block">Rejection Cause:</span>
                        <p className="mt-1 leading-normal opacity-85 select-text">{selectedReg.rejection_reason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operations Actions Footer */}
                {selectedReg.status === 'Pending_Verification' ? (
                  <div className="pt-5 border-t border-white/[0.06] flex flex-col gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={processingApprove || processingReject}
                      className="btn-primary w-full py-2.5 rounded-xl text-xs"
                    >
                      {processingApprove ? (
                        <>
                          <Icons.Spinner className="w-4 h-4 text-white" />
                          Processing Access...
                        </>
                      ) : (
                        <>
                          <Icons.Check className="w-4 h-4" />
                          Approve Application
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processingApprove || processingReject}
                      className="btn-danger w-full py-2.5 rounded-xl text-xs"
                    >
                      <Icons.X className="w-4 h-4" />
                      Reject Application
                    </button>
                  </div>
                ) : (
                  // Admin overwrite toggle
                  <div className="pt-5 border-t border-white/[0.06] space-y-2">
                    <div className="text-[11px] text-slate-500 text-center font-medium italic">
                      This application has been verified.
                    </div>
                    {selectedReg.status === 'Rejected' && (
                      <button
                        onClick={handleApprove}
                        disabled={processingApprove}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-semibold"
                      >
                        {processingApprove ? (
                          <Icons.Spinner className="w-4 h-4 text-emerald-400" />
                        ) : (
                          'Approve Application (Admin Override)'
                        )}
                      </button>
                    )}
                    {selectedReg.status === 'Approved' && (
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processingReject}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/25 transition-all text-xs font-semibold"
                      >
                        <Icons.X className="w-4 h-4" />
                        Revoke Approval
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* Banking Receipt Voucher Screen Panel (md:col-span-7) */}
              <div className="md:col-span-7 glass-card p-4 flex flex-col gap-3 min-h-[350px]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>Banking Screenshot Receipt</span>
                  <button
                    onClick={() => setZoomVoucher(true)}
                    className="text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline transition-all"
                  >
                    <Icons.ZoomIn className="w-3.5 h-3.5" />
                    Expand View
                  </button>
                </div>
                
                {/* Screenshot Display container */}
                <div className="flex-1 rounded-xl bg-black/40 border border-white/[0.05] relative overflow-hidden flex items-center justify-center group min-h-[280px]">
                  {selectedReg.voucher_path ? (
                    <>
                      <img
                        src={`/api/${selectedReg.voucher_path}`}
                        alt="Transaction voucher banking statement"
                        className="max-h-[360px] max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/400x500/1e293b/94a3b8?text=Image+Load+Error';
                        }}
                      />
                      {/* Zoom trigger on hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 cursor-pointer pointer-events-none md:pointer-events-auto" onClick={() => setZoomVoucher(true)}>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5">
                          <Icons.Eye className="w-4 h-4" />
                          View Full voucher
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 text-slate-500 space-y-2">
                      <Icons.AlertTriangle className="w-8 h-8 mx-auto text-amber-500/40" />
                      <p className="text-xs">No payment voucher screenshot uploaded for this registration.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card p-12 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-500">
                <Icons.User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">No Applicant Selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Click on an applicant row in the left-hand ledger list to load their metrics and banking statement voucher receipt.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── REJECTION MODAL DIALOG ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowRejectModal(false)} />
          <div className="relative glass-card p-6 w-full max-w-md bg-surface-900/90 border border-white/10 shadow-2xl animate-fade-in text-slate-200">
            <button
              onClick={() => setShowRejectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
              <Icons.AlertTriangle className="w-5 h-5 text-rose-400" />
              Reject Application
            </h3>
            <p className="text-slate-400 text-xs leading-normal">
              State the reason for rejecting {selectedReg?.participant_name}'s payment voucher. This message will be displayed directly on their dashboard interface.
            </p>

            <form onSubmit={handleReject} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                  Reason for rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Transaction ID missing, amount is incorrect, screenshot is truncated..."
                  required
                  rows="3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 placeholder:text-slate-500 font-medium text-xs outline-none focus:border-rose-500/60 focus:bg-white/[0.06] transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn-ghost py-2 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReject}
                  className="btn-danger py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {processingReject ? (
                    <Icons.Spinner className="w-4 h-4 text-white" />
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN RECEIPTS INTERACTIVE LIGHTBOX ── */}
      {zoomVoucher && selectedReg?.voucher_path && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setZoomVoucher(false)} />
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => setZoomVoucher(false)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white border border-white/10 hover:scale-105 transition-all"
              aria-label="Close zoomed receipt viewer"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            <img
              src={`/api/${selectedReg.voucher_path}`}
              alt="Zoomed banking screenshot receipt statement"
              className="max-h-[80vh] max-w-full object-contain rounded-2xl border border-white/10 shadow-2xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/800x1000/1e293b/94a3b8?text=Image+Load+Error';
              }}
            />
            <div className="px-4 py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-300">
              {selectedReg.participant_name} — {selectedReg.tracking_code}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

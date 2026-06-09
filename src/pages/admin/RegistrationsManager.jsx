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
  ),
  ChevronRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronLeft: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Download: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Filter: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  BarChart: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
};

export default function RegistrationsManager() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({ total_all: 0, pending_count: 0, approved_count: 0, rejected_count: 0 });
  const [analytics, setAnalytics] = useState({ branch_distribution: {}, year_distribution: {}, day_distribution: {} });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  
  // Advanced Filter state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [registrationModeFilter, setRegistrationModeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [customFormFilters, setCustomFormFilters] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // UI States
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingApprove, setProcessingApprove] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  
  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportScope, setExportScope] = useState('all'); // 'all' or 'page'
  const [exportingCSV, setExportingCSV] = useState(false);
  
  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Image modal/zoom
  const [zoomImage, setZoomImage] = useState(null); // { src: '...', title: '...' }

  // Extract custom form schema for the selected event to build dynamic filters
  const selectedEvent = events.find(e => String(e.id) === String(selectedEventId));
  let formSchemaFields = [];
  if (selectedEvent?.form_schema) {
    try {
      const schema = typeof selectedEvent.form_schema === 'string'
        ? JSON.parse(selectedEvent.form_schema)
        : selectedEvent.form_schema;
      if (Array.isArray(schema)) {
        // Exclude file uploads from being textual search filters
        formSchemaFields = schema.filter(f => f.field_type !== 'file');
      }
    } catch (e) {
      console.error("Error parsing form schema", e);
    }
  }

  // Pre-populate common branches or extract from registrations dynamically
  const commonBranches = ["Computer Science", "Information Technology", "Electronics & TC", "Mechanical Engineering", "Civil Engineering", "Artificial Intelligence & DS"];

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

  // Fetch registrations based on all filters
  const fetchRegistrations = async () => {
    setLoading(true);
    
    // Package form schema filters
    const activeFormFilters = {};
    Object.entries(customFormFilters).forEach(([key, val]) => {
      if (val !== '') activeFormFilters[key] = val;
    });

    const params = {
      status: activeTab || undefined,
      event_id: selectedEventId || undefined,
      page: currentPage,
      per_page: 15, // Denser grid view
      search: searchQuery.trim() !== '' ? searchQuery.trim() : undefined,
      branch: branchFilter !== '' ? branchFilter : undefined,
      academic_year: yearFilter !== '' ? yearFilter : undefined,
      payment_mode: paymentModeFilter !== '' ? paymentModeFilter : undefined,
      registration_mode: registrationModeFilter !== '' ? registrationModeFilter : undefined,
      start_date: startDateFilter !== '' ? startDateFilter : undefined,
      end_date: endDateFilter !== '' ? endDateFilter : undefined,
      form_filters: Object.keys(activeFormFilters).length > 0 ? JSON.stringify(activeFormFilters) : undefined
    };

    const res = await api.get('/registrations', params);
    
    if (res.ok && res.data?.success) {
      setRegistrations(res.data.registrations || []);
      if (res.data.summary) {
        setSummary({
          total_all: parseInt(res.data.summary.total_all || 0, 10),
          pending_count: parseInt(res.data.summary.pending_count || 0, 10),
          approved_count: parseInt(res.data.summary.approved_count || 0, 10),
          rejected_count: parseInt(res.data.summary.rejected_count || 0, 10),
        });
      }
      if (res.data.analytics) {
        setAnalytics({
          branch_distribution: res.data.analytics.branch_distribution || {},
          year_distribution: res.data.analytics.year_distribution || {},
          day_distribution: res.data.analytics.day_distribution || {}
        });
      }
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab, selectedEventId, branchFilter, yearFilter, paymentModeFilter, registrationModeFilter, startDateFilter, endDateFilter, customFormFilters, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRegistrations();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setBranchFilter('');
    setYearFilter('');
    setPaymentModeFilter('');
    setRegistrationModeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCustomFormFilters({});
    setCurrentPage(1);
  };

  const handleApprove = async () => {
    if (!selectedReg || processingApprove) return;
    setProcessingApprove(true);
    
    try {
      const res = await api.patch('/registrations/approve', {
        registration_id: selectedReg.registration_id
      });
      
      if (res.ok && res.data?.success) {
        // Update local status badge in drawer
        setSelectedReg(prev => ({ ...prev, status: 'Approved' }));
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
        // Update local status badge in drawer
        setSelectedReg(prev => ({ ...prev, status: 'Rejected', rejection_reason: rejectionReason }));
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

  const triggerExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const eventName = selectedEvent ? selectedEvent.title.replace(/[^a-zA-Z0-9]/g, '_') : 'All';
    setExportFilename(`Registrations_${eventName}_${timestamp}`);
    setExportScope('all');
    setShowExportModal(true);
  };

  const handleDownloadCSV = async () => {
    setExportingCSV(true);
    let dataToExport = [];

    if (exportScope === 'page') {
      dataToExport = registrations;
    } else {
      // Fetch ALL matching items from the server without pagination limits
      const activeFormFilters = {};
      Object.entries(customFormFilters).forEach(([key, val]) => {
        if (val !== '') activeFormFilters[key] = val;
      });

      const params = {
        status: activeTab,
        event_id: selectedEventId || undefined,
        export: 'true', // Triggers the bypass of the 200 pagination limit
        search: searchQuery.trim() !== '' ? searchQuery.trim() : undefined,
        branch: branchFilter !== '' ? branchFilter : undefined,
        academic_year: yearFilter !== '' ? yearFilter : undefined,
        payment_mode: paymentModeFilter !== '' ? paymentModeFilter : undefined,
        registration_mode: registrationModeFilter !== '' ? registrationModeFilter : undefined,
        start_date: startDateFilter !== '' ? startDateFilter : undefined,
        end_date: endDateFilter !== '' ? endDateFilter : undefined,
        form_filters: Object.keys(activeFormFilters).length > 0 ? JSON.stringify(activeFormFilters) : undefined
      };

      const res = await api.get('/registrations', params);
      if (res.ok && res.data?.success) {
        dataToExport = res.data.registrations || [];
      } else {
        alert('Failed to retrieve full records for export.');
        setExportingCSV(false);
        return;
      }
    }

    if (dataToExport.length === 0) {
      alert('No data matches the selected scope.');
      setExportingCSV(false);
      return;
    }

    // Process export fields
    const headers = [
      'Tracking Code',
      'Name',
      'Email',
      'Phone',
      'Academic Branch',
      'Academic Year',
      'Target Event',
      'Registration Mode',
      'Status',
      'Registered At',
      'Voucher Uploaded',
      'Form Responses'
    ];

    const csvRows = [headers.join(',')];

    dataToExport.forEach(item => {
      let formAnswers = '';
      if (item.form_data_json) {
        try {
          const parsed = typeof item.form_data_json === 'string' ? JSON.parse(item.form_data_json) : item.form_data_json;
          formAnswers = Object.entries(parsed)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('; ') : v}`)
            .join(' | ');
        } catch (e) {
          formAnswers = String(item.form_data_json);
        }
      }

      const row = [
        `"${(item.tracking_code || '').replace(/"/g, '""')}"`,
        `"${(item.participant_name || '').replace(/"/g, '""')}"`,
        `"${(item.participant_email || '').replace(/"/g, '""')}"`,
        `"${(item.participant_phone || '').replace(/"/g, '""')}"`,
        `"${(item.participant_branch || '').replace(/"/g, '""')}"`,
        `"${(item.academic_year || '').replace(/"/g, '""')}"`,
        `"${(item.event_title || '').replace(/"/g, '""')}"`,
        `"${(item.registration_mode || '').replace(/"/g, '""')}"`,
        `"${(item.status || '').replace(/"/g, '""')}"`,
        `"${new Date(item.registered_at).toLocaleString()}"`,
        item.voucher_path ? 'Yes' : 'No',
        `"${formAnswers.replace(/"/g, '""')}"`
      ];

      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFilename || 'Registrations_Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportModal(false);
    setExportingCSV(false);
  };

  // Safe totals calculator for percentage bar charts
  const totalSummaryCount = summary.pending_count + summary.approved_count + summary.rejected_count;

  const renderDailyTrendSVG = () => {
    const data = analytics.day_distribution || {};
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center text-[10px] t-text-muted italic">
          No daily registration trend data available
        </div>
      );
    }

    // Sort by date key to ensure correct order
    entries.sort((a, b) => a[0].localeCompare(b[0]));

    const width = 300;
    const height = 85;
    const padding = { top: 10, right: 10, bottom: 15, left: 20 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const counts = entries.map(e => Number(e[1]));
    const maxCount = Math.max(...counts, 1);

    const points = entries.map((entry, idx) => {
      const x = padding.left + (idx / Math.max(1, entries.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (entry[1] / maxCount) * chartHeight;
      return { x, y, date: entry[0], count: entry[1] };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

    const firstDate = entries[0] ? new Date(entries[0][0]).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
    const lastDate = entries[entries.length - 1] ? new Date(entries[entries.length - 1][0]).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';

    return (
      <div className="space-y-1.5 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider t-text-muted">
          <span>Registration Velocity</span>
          <span className="text-brand-400 font-mono">Max: {maxCount} / day</span>
        </div>
        <div className="relative bg-white/[0.01] rounded-lg p-1 border border-[var(--border-subtle)] h-24">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1={padding.left} y1={padding.top + chartHeight / 2} x2={width - padding.right} y2={padding.top + chartHeight / 2} stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="var(--border-primary)" strokeWidth="0.5" />

            {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--brand-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {points.map((p, idx) => (
              <g key={idx} className="group/dot">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  className="fill-[var(--bg-secondary)] stroke-[var(--brand-primary)] stroke-2 cursor-pointer hover:r-3.5 transition-all"
                />
                <title>{`${p.date}: ${p.count} registrations`}</title>
              </g>
            ))}

            <text x={padding.left} y={height - 2} fill="var(--text-muted)" fontSize="7" fontWeight="bold" textAnchor="start">{firstDate}</text>
            <text x={width - padding.right} y={height - 2} fill="var(--text-muted)" fontSize="7" fontWeight="bold" textAnchor="end">{lastDate}</text>
            <text x={padding.left - 4} y={padding.top + 3} fill="var(--text-muted)" fontSize="7" fontWeight="bold" textAnchor="end">{maxCount}</text>
            <text x={padding.left - 4} y={padding.top + chartHeight + 3} fill="var(--text-muted)" fontSize="7" fontWeight="bold" textAnchor="end">0</text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 t-text-primary text-left">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-header">Registrations Verification Ledger</h1>
          <p className="t-text-secondary text-xs md:text-sm mt-1">
            Table grid tracking participant enrollment and transaction receipts with full search filters.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Collapse/Show stats */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] border border-[var(--border-primary)] hover:bg-white/[0.06] rounded-xl text-xs font-semibold tracking-wider t-text-secondary hover:t-text-primary transition-all duration-300"
          >
            <Icons.BarChart className="w-4 h-4 text-brand-400" />
            {showAnalytics ? "Hide Analytics" : "Show Analytics"}
          </button>
          
          <button
            onClick={triggerExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-500/25 rounded-xl text-xs font-semibold tracking-wider text-emerald-400 hover:text-emerald-300 transition-all duration-300 shadow-glow-sm"
          >
            <Icons.Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* ── 1. COLLAPSIBLE ANALYTICS PANEL ── */}
      {showAnalytics && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left Block: Approved/Pending Counters & Daily Trend Graph (4 columns) */}
          <div className="xl:col-span-4 flex flex-col gap-4 h-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 bg-white/[0.01]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Approved Admissions</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black t-text-primary">{summary.approved_count}</span>
                  <span className="text-[10px] t-text-muted">
                    {totalSummaryCount > 0 ? Math.round((summary.approved_count / totalSummaryCount) * 100) : 0}% ratio
                  </span>
                </div>
              </div>

              <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-amber-500 bg-white/[0.01]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending Review</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{summary.pending_count}</span>
                  <span className="text-[10px] t-text-muted">
                    {totalSummaryCount > 0 ? Math.round((summary.pending_count / totalSummaryCount) * 100) : 0}% ratio
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 flex-1 bg-white/[0.01] border border-[var(--border-primary)]">
              {renderDailyTrendSVG()}
            </div>
          </div>

          {/* Center Block: Branch distribution horizontal bar chart (4 columns) */}
          <div className="xl:col-span-4 glass-card p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider t-text-secondary flex items-center gap-1.5">
              <Icons.BarChart className="w-3.5 h-3.5 text-brand-400" />
              Branch Enrollment Share
            </h3>
            
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {Object.keys(analytics.branch_distribution).length === 0 ? (
                <div className="text-center py-8 text-xs t-text-muted italic">No branch metrics resolved.</div>
              ) : (
                (() => {
                  const maxCount = Math.max(...Object.values(analytics.branch_distribution), 1);
                  return Object.entries(analytics.branch_distribution).slice(0, 5).map(([branch, count]) => {
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={branch} className="text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold t-text-primary">
                          <span className="truncate max-w-[170px]">{branch}</span>
                          <span>{count}</span>
                        </div>
                        <div className="w-full h-2 rounded bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Right Block: Year Distribution stacked progress bars (4 columns) */}
          <div className="xl:col-span-4 glass-card p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider t-text-secondary flex items-center gap-1.5">
              <Icons.User className="w-3.5 h-3.5 text-brand-400" />
              Academic Year Split
            </h3>

            <div className="space-y-4">
              {Object.keys(analytics.year_distribution).length === 0 ? (
                <div className="text-center py-8 text-xs t-text-muted italic">No academic year metrics resolved.</div>
              ) : (
                (() => {
                  const totalYearsCount = Object.values(analytics.year_distribution).reduce((a, b) => a + b, 0) || 1;
                  return ["FY", "SY", "TY", "Final"].map(year => {
                    const count = analytics.year_distribution[year] || 0;
                    const pct = Math.round((count / totalYearsCount) * 100);
                    return (
                      <div key={year} className="text-xs">
                        <div className="flex justify-between items-center text-[11px] font-semibold t-text-primary mb-1">
                          <span>{year === "Final" ? "Final Year" : `${year} Students`}</span>
                          <span className="t-text-secondary font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full bg-indigo-500/80 rounded transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── 2. SEARCH & FILTERS BAR ── */}
      <div className="glass-card border border-[var(--border-primary)] p-5 rounded-2xl bg-black/15">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          
          {/* Tier 1 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Search Input (col-span-4) */}
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Search keyword</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none t-text-muted">
                  <Icons.Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, email, tracking ID..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-[var(--border-primary)] t-text-primary placeholder:t-text-muted text-xs focus:border-brand-500/50 focus:bg-white/[0.05] outline-none transition-all"
                />
              </div>
            </div>

            {/* Event Dropdown (col-span-3) */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Target Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => { setSelectedEventId(e.target.value); setCustomFormFilters({}); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
              >
                <option value="">All Events</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.title}</option>
                ))}
              </select>
            </div>

            {/* Status (Admissions Tier) Dropdown (col-span-3) */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Admissions Tier</label>
              <select
                value={activeTab}
                onChange={(e) => { setActiveTab(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Pending_Verification">Pending Approval</option>
                <option value="Approved">Approved Entry</option>
                <option value="Rejected">Rejected Application</option>
              </select>
            </div>

            {/* Toggle Button (col-span-2) */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`w-full py-2.5 px-3 border rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  showAdvancedFilters 
                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' 
                    : 'bg-white/[0.02] border-[var(--border-primary)] t-text-secondary hover:bg-white/[0.05]'
                }`}
              >
                <Icons.Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

          </div>

          {/* Collapsible Tier 2 Panel */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4 animate-slide-in">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* Branch */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Academic Branch</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  >
                    <option value="">All Branches</option>
                    {commonBranches.map(br => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Year */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Academic Year</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  >
                    <option value="">All Years</option>
                    <option value="FY">FY (First Year)</option>
                    <option value="SY">SY (Second Year)</option>
                    <option value="TY">TY (Third Year)</option>
                    <option value="Final">Final Year</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Payment Mode</label>
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => { setPaymentModeFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  >
                    <option value="">All Types</option>
                    <option value="paid">Paid (Voucher Uploaded)</option>
                    <option value="free">Free (No Voucher)</option>
                  </select>
                </div>

                {/* Registration Mode */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Registration Mode</label>
                  <select
                    value={registrationModeFilter}
                    onChange={(e) => { setRegistrationModeFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  >
                    <option value="">All Modes</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Free">Free</option>
                  </select>
                </div>

                {/* Registered On/After */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Registered On/After</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  />
                </div>

                {/* Registered On/Before */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Registered On/Before</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                  />
                </div>

              </div>

              {/* Dynamic custom event form answers */}
              {selectedEventId && formSchemaFields.length > 0 && (
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider t-text-secondary">
                    Custom Form Answers Filters ({selectedEvent?.title})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {formSchemaFields.map(field => {
                      const key = field.field_name;
                      const value = customFormFilters[key] || '';
                      
                      return (
                        <div key={key} className="space-y-1.5">
                          <label className="text-[9px] font-semibold t-text-muted uppercase tracking-widest block truncate">
                            {field.label}
                          </label>
                          {field.field_type === 'select' || field.field_type === 'checkbox' ? (
                            <select
                              value={value}
                              onChange={(e) => {
                                setCustomFormFilters(prev => ({ ...prev, [key]: e.target.value }));
                                setCurrentPage(1);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] t-text-secondary text-xs focus:border-brand-500/50 outline-none cursor-pointer"
                            >
                              <option value="">All Answers</option>
                              {(field.options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                setCustomFormFilters(prev => ({ ...prev, [key]: e.target.value }));
                                setCurrentPage(1);
                              }}
                              placeholder={`Filter by ${field.label}...`}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-[var(--border-primary)] t-text-primary placeholder:t-text-muted text-xs focus:border-brand-500/50 outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Controls Row */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 bg-white/[0.02] border border-[var(--border-primary)] hover:bg-white/[0.05] t-text-secondary text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Reset Parameters
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 text-brand-300 hover:text-brand-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-glow-sm"
                >
                  Apply Parameters
                </button>
              </div>

            </div>
          )}
        </form>
      </div>

      {/* ── 3. FULL-WIDTH REGISTRATIONS TABLE GRID ── */}
      <div className="glass-card border border-[var(--border-primary)] rounded-2xl overflow-hidden bg-transparent">
        
        {/* Table Viewport */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Tracking Code</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Participant</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Branch & Year</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Target Event</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Applied Date</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary text-center">Receipt</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary">Status</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider t-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center space-y-4">
                    <Icons.Spinner className="w-8 h-8 mx-auto text-brand-400" />
                    <p className="t-text-secondary text-xs font-semibold animate-pulse">Synchronizing registrations matrix...</p>
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center space-y-4">
                    <Icons.Search className="w-10 h-10 mx-auto t-text-muted opacity-40" />
                    <div>
                      <h4 className="font-bold t-text-primary">No Registrations Found</h4>
                      <p className="t-text-muted text-xs mt-1 max-w-sm mx-auto">
                        No registrations match the selected parameters. Modify your search term or clear the filter dropdowns.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                registrations.map(reg => (
                  <tr
                    key={reg.registration_id}
                    className={`hover:bg-[var(--bg-hover)] cursor-pointer transition-all duration-150 ${
                      selectedReg?.registration_id === reg.registration_id ? 'bg-brand-500/[0.06]' : ''
                    }`}
                    onClick={() => setSelectedReg(reg)}
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] t-text-primary border border-[var(--border-subtle)] shadow-inner select-all">
                        {reg.tracking_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 space-y-0.5">
                      <div className="font-bold text-xs t-text-primary">{reg.participant_name}</div>
                      <div className="text-[10px] t-text-secondary font-medium select-all">{reg.participant_email}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium t-text-primary">
                      <div>{reg.participant_branch}</div>
                      <div className="text-[10px] t-text-muted">Year: {reg.academic_year}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold t-text-primary">
                      <div>{reg.event_title}</div>
                      <div className="mt-1">
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${
                          reg.registration_mode === 'Online' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          reg.registration_mode === 'Offline' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {reg.registration_mode}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[10px] font-semibold t-text-muted">
                      {new Date(reg.registered_at).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {reg.voucher_path ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomImage({ src: `/api/${reg.voucher_path}`, title: 'Banking Screenshot Receipt' });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider hover:bg-emerald-500/20 transition-all inline-flex items-center gap-1 shrink-0"
                        >
                          <Icons.Eye className="w-3.5 h-3.5" />
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-[10px] t-text-muted italic">No Upload</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {reg.status === 'Pending_Verification' && <span className="badge-pending">Pending Review</span>}
                      {reg.status === 'Approved' && <span className="badge-approved">Approved Entry</span>}
                      {reg.status === 'Rejected' && <span className="badge-rejected">Rejected Voucher</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); }}
                        className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-primary)] hover:bg-[var(--bg-active)] t-text-secondary hover:t-text-primary transition-all duration-300"
                        title="Open Details Panel"
                      >
                        <Icons.ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Footer ── */}
        <div className="px-5 py-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex flex-col sm:flex-row justify-between items-center gap-3 text-[10.5px] t-text-secondary select-none">
          <div>
            Showing registrations matching current queries: <strong className="t-text-primary">{pagination.total} entries</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-primary)] hover:bg-[var(--bg-active)] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 font-semibold t-text-secondary hover:t-text-primary"
            >
              <Icons.ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="font-semibold t-text-primary text-xs px-2.5">
              Page {currentPage} of {pagination.pages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage === pagination.pages}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-primary)] hover:bg-[var(--bg-active)] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 font-semibold t-text-secondary hover:t-text-primary"
            >
              Next
              <Icons.ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ── 4. CENTERED DETAIL CARD MODAL ── */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedReg(null)} />
          
          {/* Modal Card Panel */}
          <div className="relative w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col z-10 animate-fade-in text-[var(--text-primary)] overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold t-text-muted uppercase tracking-widest">
                  <Icons.Award className="w-4 h-4 text-brand-400" />
                  Applicant Ledger Card
                </div>
                <h2 className="text-base font-black t-text-primary">{selectedReg.participant_name}</h2>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="p-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:bg-[var(--bg-active)] rounded-full t-text-secondary hover:t-text-primary transition-all"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Card Summary */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest t-text-muted">Admissions ID</span>
                    <h3 className="font-mono text-base font-black t-text-primary select-all mt-0.5">{selectedReg.tracking_code}</h3>
                  </div>
                  <span className="inline-block mt-0.5">
                    {selectedReg.status === 'Pending_Verification' && <span className="badge-pending">Pending Review</span>}
                    {selectedReg.status === 'Approved' && <span className="badge-approved">Approved Entry</span>}
                    {selectedReg.status === 'Rejected' && <span className="badge-rejected">Rejected Voucher</span>}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-3 border-t border-[var(--border-subtle)] text-xs">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Email Address</span>
                    <span className="t-text-primary font-semibold truncate block select-all mt-0.5">{selectedReg.participant_email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Contact Phone</span>
                    <span className="t-text-primary font-semibold block select-all mt-0.5">{selectedReg.participant_phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Academic branch</span>
                    <span className="t-text-primary font-semibold block mt-0.5">{selectedReg.participant_branch}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Academic year</span>
                    <span className="t-text-primary font-semibold block mt-0.5">Year {selectedReg.academic_year}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest t-text-muted block">Target Event</span>
                    <span className="t-text-primary font-bold block mt-0.5">{selectedReg.event_title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${
                        selectedReg.registration_mode === 'Online' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        selectedReg.registration_mode === 'Offline' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {selectedReg.registration_mode}
                      </span>
                      <span className="text-[10px] t-text-muted">Applied: {new Date(selectedReg.registered_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Registration Custom Fields Responses */}
              {selectedReg.form_data_json && (
                <div className="glass-card p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider t-text-secondary flex items-center gap-1.5 pb-2 border-b border-[var(--border-subtle)]">
                    <Icons.Award className="w-4 h-4 text-brand-400" />
                    Custom Registration Answers
                  </h4>
                  
                  <div className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                    {(() => {
                      try {
                        const formData = typeof selectedReg.form_data_json === 'string' 
                          ? JSON.parse(selectedReg.form_data_json) 
                          : selectedReg.form_data_json;
                        
                        if (formData && typeof formData === 'object' && Object.keys(formData).length > 0) {
                          return Object.entries(formData).map(([key, val]) => {
                            const valStr = String(val);
                            const isFile = typeof val === 'string' && (valStr.startsWith('/api/') || valStr.includes('uploads/'));
                            
                            let content;
                            if (isFile) {
                              const lowerVal = valStr.toLowerCase();
                              const isImage = lowerVal.endsWith('.jpg') || lowerVal.endsWith('.jpeg') || lowerVal.endsWith('.png') || lowerVal.endsWith('.webp');
                              const isPdf = lowerVal.endsWith('.pdf');
                              
                              if (isImage) {
                                content = (
                                  <div 
                                    onClick={() => setZoomImage({ src: valStr, title: key.replace(/_/g, ' ') })}
                                    className="relative group/field-img w-40 h-28 rounded-lg overflow-hidden border border-[var(--border-primary)] bg-black/5 cursor-pointer mt-1.5 hover:border-brand-500/50 transition-all"
                                  >
                                    <img src={valStr} alt={key} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/field-img:opacity-100 flex items-center justify-center transition-opacity">
                                      <div className="bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 text-white text-[10px] font-semibold flex items-center gap-1">
                                        <Icons.Eye className="w-3.5 h-3.5" />
                                        View Photo
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else if (isPdf) {
                                content = (
                                  <a 
                                    href={valStr} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-2 mt-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all font-semibold text-[10.5px]"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    View PDF Document
                                  </a>
                                );
                              } else {
                                content = (
                                  <a 
                                    href={valStr} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-2 mt-1.5 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/25 transition-all font-semibold text-[10.5px]"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open Attached File
                                  </a>
                                );
                              }
                            } else {
                              content = (
                                <p className="t-text-primary font-semibold mt-1">
                                  {Array.isArray(val) ? val.join(', ') : valStr}
                                </p>
                              );
                            }

                            return (
                              <div key={key} className="text-xs pt-3 first:pt-0">
                                <span className="font-bold t-text-muted uppercase tracking-wider text-[9.5px] block">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                {content}
                              </div>
                            );
                          });
                        }
                      } catch (e) {
                        console.error("Error parsing form_data_json", e);
                      }
                      return <span className="text-[10px] t-text-muted italic">No responses recorded.</span>;
                    })()}
                  </div>
                </div>
              )}

              {/* Rejection Alert Box */}
              {selectedReg.status === 'Rejected' && selectedReg.rejection_reason && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2.5 items-start">
                  <Icons.AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-bold block">Rejection Cause:</span>
                    <p className="mt-1 leading-normal opacity-85 select-text">{selectedReg.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Banking Receipt Voucher Screenshot - PLACED DIRECTLY INSIDE modal */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold t-text-secondary">
                  <span className="uppercase tracking-wider">Transaction receipt voucher</span>
                  {selectedReg.voucher_path && (
                    <button
                      onClick={() => setZoomImage({ src: `/api/${selectedReg.voucher_path}`, title: 'Banking Screenshot Receipt' })}
                      className="text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline transition-all"
                    >
                      <Icons.ZoomIn className="w-3.5 h-3.5" />
                      Expand View
                    </button>
                  )}
                </div>

                <div className="rounded-xl bg-black/5 border border-[var(--border-subtle)] relative overflow-hidden flex items-center justify-center group min-h-[200px] max-h-[300px]">
                  {selectedReg.voucher_path ? (
                    <>
                      <img
                        src={`/api/${selectedReg.voucher_path}`}
                        alt="Transaction receipt statement"
                        className="max-h-[280px] max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/400x500/1e293b/94a3b8?text=Image+Load+Error';
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 cursor-pointer"
                        onClick={() => setZoomImage({ src: `/api/${selectedReg.voucher_path}`, title: 'Banking Screenshot Receipt' })}
                      >
                        <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5">
                          <Icons.Eye className="w-4 h-4" />
                          View Full Screen
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 t-text-muted space-y-2">
                      <Icons.AlertTriangle className="w-7 h-7 mx-auto text-amber-500/40" />
                      <p className="text-xs">No payment receipt voucher uploaded for this registration.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] shrink-0">
              {selectedReg.status === 'Pending_Verification' ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processingApprove || processingReject}
                    className="btn-danger w-full py-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Icons.X className="w-4 h-4" />
                    Reject Voucher
                  </button>
                  
                  <button
                    onClick={handleApprove}
                    disabled={processingApprove || processingReject}
                    className="btn-primary w-full py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-glow-sm"
                  >
                    {processingApprove ? (
                      <>
                        <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Icons.Check className="w-4 h-4" />
                        Approve Admission
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] t-text-muted text-center font-medium italic mb-1">
                    This registration application is marked as: <strong className="t-text-primary">{selectedReg.status}</strong>.
                  </div>
                  
                  {selectedReg.status === 'Rejected' && (
                    <button
                      onClick={handleApprove}
                      disabled={processingApprove}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all text-xs font-semibold shadow-glow-sm"
                    >
                      {processingApprove ? (
                        <Icons.Spinner className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : (
                        'Approve Admission (Admin Override)'
                      )}
                    </button>
                  )}
                  {selectedReg.status === 'Approved' && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processingReject}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all text-xs font-semibold"
                    >
                      <Icons.X className="w-4 h-4" />
                      Revoke Admission / Reject
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── 5. REJECTION MODAL DIALOG ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowRejectModal(false)} />
          <div className="relative glass-card p-6 w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl animate-fade-in t-text-primary text-left">
            <button
              onClick={() => setShowRejectModal(false)}
              className="absolute top-4 right-4 t-text-muted hover:t-text-primary transition-colors"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black t-text-primary flex items-center gap-2 mb-2">
              <Icons.AlertTriangle className="w-5 h-5 text-rose-400" />
              Reject Application
            </h3>
            <p className="t-text-secondary text-xs leading-normal">
              State the reason for rejecting {selectedReg?.participant_name}'s payment voucher. This message will be displayed directly on their dashboard interface.
            </p>

            <form onSubmit={handleReject} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest t-text-muted block mb-1">
                  Reason for rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Transaction ID missing, amount is incorrect, screenshot is truncated..."
                  required
                  rows="3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-[var(--border-primary)] t-text-primary placeholder:t-text-muted font-medium text-xs outline-none focus:border-rose-500/60 focus:bg-white/[0.06] transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 t-text-secondary hover:t-text-primary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReject}
                  className="px-4 py-2 bg-rose-500 border border-rose-600 rounded-xl text-white hover:bg-rose-600 transition-all text-xs font-semibold flex items-center gap-1.5"
                >
                  {processingReject ? (
                    <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. FULL SCREEN RECEIPTS INTERACTIVE LIGHTBOX ── */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setZoomImage(null)} />
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white border border-white/10 hover:scale-105 transition-all"
              aria-label="Close zoomed image viewer"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            <img
              src={zoomImage.src}
              alt={zoomImage.title}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl border border-[var(--border-primary)] shadow-2xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/800x1000/1e293b/94a3b8?text=Image+Load+Error';
              }}
            />
            <div className="px-4 py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-mono text-white">
              {selectedReg?.participant_name} — {zoomImage.title}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. CSV EXPORT CONFIGURATION MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExportModal(false)} />
          
          <div className="relative glass-card p-6 w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl animate-fade-in t-text-primary text-left">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 t-text-muted hover:t-text-primary transition-colors"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black t-text-primary flex items-center gap-2 mb-2">
              <Icons.Download className="w-5 h-5 text-emerald-400" />
              Configure CSV Export Options
            </h3>
            <p className="t-text-secondary text-xs leading-normal">
              Download a structured CSV spreadsheet file compatible with Excel or Google Sheets. The export automatically interlaces custom registration responses.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              
              {/* Filename Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest t-text-muted block">Download Filename</label>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-primary)] bg-white/[0.03]">
                  <input
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-transparent t-text-primary outline-none text-xs font-semibold"
                    placeholder="File_Export_Name"
                  />
                  <span className="bg-black/25 t-text-secondary text-xs px-3.5 py-2.5 border-l border-[var(--border-primary)] font-bold flex items-center">.csv</span>
                </div>
              </div>

              {/* Data Scope Radio Buttons */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest t-text-muted block">Export Scope</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    exportScope === 'all'
                      ? 'bg-brand-500/10 border-brand-500/50 t-text-primary font-bold'
                      : 'bg-white/[0.02] border-[var(--border-primary)] t-text-secondary hover:bg-white/[0.04]'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="sr-only"
                    />
                    <span className="font-bold text-[11px] block">Full Dataset</span>
                    <span className="text-[9px] opacity-75 mt-0.5">All matching rows across pages ({pagination.total} records)</span>
                  </label>

                  <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    exportScope === 'page'
                      ? 'bg-brand-500/10 border-brand-500/50 t-text-primary font-bold'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'page'}
                      onChange={() => setExportScope('page')}
                      className="sr-only"
                    />
                    <span className="font-bold text-[11px] block">Current Page Only</span>
                    <span className="text-[9px] opacity-75 mt-0.5">Only items currently shown on this table page ({registrations.length} records)</span>
                  </label>
                </div>
              </div>

              {/* Export Columns Preview Checklist */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest t-text-muted block">Spreadsheet Columns Mapped</span>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-black/25 border border-[var(--border-primary)] max-h-[100px] overflow-y-auto">
                  {['Tracking Code', 'Name', 'Email', 'Phone', 'Academic Branch', 'Academic Year', 'Target Event', 'Registration Mode', 'Status', 'Registered At', 'Voucher', 'Form Responses'].map(col => (
                    <span key={col} className="px-2 py-1 rounded bg-white/[0.03] border border-[var(--border-subtle)] text-[9.5px] font-medium t-text-secondary animate-fade-in">
                      ✓ {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 t-text-secondary hover:t-text-primary font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadCSV}
                  disabled={exportingCSV}
                  className="px-4 py-2.5 bg-emerald-500 border border-emerald-600 rounded-xl text-white hover:bg-emerald-600 transition-all font-semibold flex items-center gap-1.5 shadow-glow-sm"
                >
                  {exportingCSV ? (
                    <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <>
                      <Icons.Download className="w-4 h-4" />
                      Begin Export
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

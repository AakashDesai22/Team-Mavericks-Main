import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import Unauthorized from '../Unauthorized';

const Icons = {
  Terminal: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Refresh: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Eye: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
};

export default function ForensicAuditConsole() {
  const { roleTier } = useAuth();

  // Strict RBAC gate checking: Strip view if user is a Member tier
  if (roleTier !== 'Admin') {
    return <Unauthorized />;
  }

  // Filter query states
  const [searchTerm, setSearchTerm] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');
  
  // Data lists states
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Expanded log row detail
  const [expandedLog, setExpandedLog] = useState(null);

  // Shell history mock buffer
  const [history, setHistory] = useState([
    'Initializing secure connection to mavericks-main...',
    'Audit daemon version v2.6.4 (MySQL transactional trigger) operational.',
    'Binding audit logger stream: root@mavericks-main:~ /var/log/audit'
  ]);

  const terminalEndRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm.trim(),
        endpoint: endpointFilter.trim(),
        page: page,
        per_page: 50 // Limit terminal page count
      };

      const res = await api.get('/admin/audit-log', params);
      
      if (res.ok && res.data?.success) {
        let entries = res.data.audit_log || [];
        
        // Client-side filtering fallback for IP if needed
        if (ipFilter.trim() !== '') {
          entries = entries.filter(log => log.client_ip.includes(ipFilter.trim()));
        }

        setLogs(entries);
        setTotal(res.data.pagination?.total || entries.length);
        setTotalPages(res.data.pagination?.pages || 1);

        // Update terminal CLI log logs buffer
        setHistory(prev => [
          ...prev,
          `$ cat /var/log/audit | grep "${searchTerm || '*'}" [Found ${entries.length} nodes]`
        ]);
      } else {
        setHistory(prev => [...prev, `[ERROR] Failed to query daemon logs: ${res.data?.error || 'Unknown'}`]);
      }
    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, '[ERROR] Daemon connection timeout. Relational matrix offline.']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleRowClick = (log) => {
    if (expandedLog && expandedLog.id === log.id) {
      setExpandedLog(null);
    } else {
      setExpandedLog(log);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setIpFilter('');
    setEndpointFilter('');
    setPage(1);
    setHistory(prev => [...prev, '$ reset --hard (Clearing filter query vectors)']);
    setTimeout(() => {
      fetchLogs();
    }, 100);
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono" style={{ color: 'var(--text-primary)' }}>
      
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="section-header text-xl font-black uppercase tracking-widest">
            Forensic Security Monitor
          </h1>
          <p className="text-xs mt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
            Forensic audit logger tracking every transaction, operator IP, and absolute database state transition.
          </p>
        </div>
      </div>

      {/* ── CLI Search Controls (Styled as terminal command arguments) ── */}
      <div className="glass-card border border-white/[0.08] p-5 rounded-2xl bg-black/45 text-left">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold border-b border-white/[0.05] pb-2 mb-3">
            <Icons.Terminal className="w-4 h-4 shrink-0" />
            <span>$ grep --action-ledger-vectors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search filter keyword */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                --search-keyword
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. login, checkin"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-emerald-400 placeholder:text-emerald-800 text-xs focus:border-emerald-500/50 focus:outline-none"
              />
            </div>

            {/* Endpoint filter prefix */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                --target-endpoint
              </label>
              <input
                type="text"
                value={endpointFilter}
                onChange={(e) => setEndpointFilter(e.target.value)}
                placeholder="e.g. /api/attendance"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-emerald-400 placeholder:text-emerald-800 text-xs focus:border-emerald-500/50 focus:outline-none"
              />
            </div>

            {/* IP Filter address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                --client-ip
              </label>
              <input
                type="text"
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                placeholder="e.g. 127.0.0.1"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-emerald-400 placeholder:text-emerald-800 text-xs focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-[9px] text-slate-600 font-sans">
              Press Enter or click execute. Fields translate directly to SELECT parameters.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                Clear Query
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
              >
                <Icons.Search className="w-3.5 h-3.5" />
                Query Logs
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Retro Unix Terminal Console ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-slate-950/80 shadow-2xl relative overflow-hidden flex flex-col min-h-[460px] max-h-[640px]">
        {/* Terminal Header */}
        <div className="px-5 py-3 border-b border-white/[0.05] bg-black/60 flex justify-between items-center shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/70" />
            <span className="w-3 h-3 rounded-full bg-amber-500/70" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            <span className="text-[10px] text-slate-500 ml-2 font-bold uppercase tracking-wider">
              root@mavericks-main: ~ /var/log/audit
            </span>
          </div>
          
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-lg border border-white/[0.05] hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all disabled:opacity-40"
            title="Reload daemon"
          >
            <Icons.Refresh className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Terminal Log Stream Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 text-left font-mono text-[11px] leading-relaxed text-emerald-400/90 relative">
          <div className="absolute inset-0 bg-dots opacity-[0.01] pointer-events-none" />

          {/* Connection history output */}
          <div className="space-y-1 opacity-60">
            {history.map((hist, idx) => (
              <p key={idx}>{hist}</p>
            ))}
          </div>

          <div className="border-t border-emerald-950/40 my-3" />

          {loading ? (
            <div className="py-20 flex items-center justify-center gap-2">
              <Icons.Spinner className="w-5 h-5 text-emerald-500" />
              <span className="animate-pulse">Loading forensics ledger streams...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-emerald-800">
              [SYSTEM WARNING] No matching logs found in active transactional matrices.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLog && expandedLog.id === log.id;
              
              return (
                <div
                  key={log.id}
                  className={`border-b border-emerald-950/30 pb-3 transition-all hover:bg-emerald-500/[0.02] p-2.5 rounded-xl cursor-pointer ${
                    isExpanded ? 'bg-emerald-500/[0.04] border-emerald-500/20' : ''
                  }`}
                  onClick={() => handleRowClick(log)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/20 text-emerald-300">
                        {log.server_timestamp}
                      </span>
                      <span className="font-bold text-emerald-200">
                        {log.actor_name || 'Anonymous visitor'}
                      </span>
                      {log.actor_tier && (
                        <span className="text-[9px] font-black uppercase px-1 rounded bg-black/40 text-brand-400">
                          {log.actor_tier}
                        </span>
                      )}
                      <span className="text-slate-500 truncate max-w-[200px]">
                        {log.targeted_endpoint}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0 font-mono">
                      <span>IP: {log.client_ip}</span>
                      <Icons.Eye className="w-3.5 h-3.5 text-emerald-600 opacity-60" />
                    </div>
                  </div>

                  <p className="mt-1.5 pl-2 border-l border-emerald-800 text-emerald-300">
                    {log.action_description}
                  </p>

                  {/* Expanded JSON details node */}
                  {isExpanded && (
                    <div className="mt-4 p-4 rounded-xl bg-black/45 border border-emerald-500/10 text-emerald-400 text-[10px] animate-fade-in space-y-2">
                      <span className="font-bold uppercase tracking-wider text-emerald-500 block">
                        JSON Object Node #{log.id} Details:
                      </span>
                      <pre className="overflow-x-auto select-text font-mono leading-relaxed">
                        {JSON.stringify({
                          id: parseInt(log.id, 10),
                          actor_user_id: log.actor_user_id ? parseInt(log.actor_user_id, 10) : null,
                          actor_name: log.actor_name || 'Anonymous Guest',
                          actor_email: log.actor_email || '—',
                          actor_tier: log.actor_tier || 'None',
                          action_description: log.action_description,
                          targeted_endpoint: log.targeted_endpoint,
                          client_ip_address: log.client_ip,
                          server_timestamp_absolute: log.server_timestamp
                        }, null, 2)}
                      </pre>
                    </div>
                  )}

                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal console footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] bg-black/60 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 select-none text-[10px] text-slate-500">
          <span>
            Total recorded transactions: <strong>{total} audit entries</strong>
          </span>

          {/* CLI Pagination */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              $ prev --page
            </button>
            <span className="font-semibold text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              $ next --page
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

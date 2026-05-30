import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import CertificateGenerator from '../components/CertificateGenerator';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Participant Dashboard
 * ============================================================================
 *
 * The primary attendee interface.  Dynamically renders:
 *   1. Profile card with registration ID and role badge.
 *   2. Event registration cards with status indicators.
 *   3. Voucher upload widget (when status = Pending_Verification).
 *   4. Allocation display board (when reveal_state = Revealed).
 */

export default function ParticipantDashboard() {
  const { user, refreshSession } = useAuth();

  // ── Data State ──────────────────────────────────────────────────────
  const [profile, setProfile]       = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [allocations, setAllocations]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');

  // ── Voucher Upload State ────────────────────────────────────────────
  const [uploadingFor, setUploadingFor]     = useState(null); // event_id being uploaded to
  const [uploadFile, setUploadFile]         = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError]       = useState('');
  const [uploadSuccess, setUploadSuccess]   = useState('');

  // ── Fetch Profile Data ──────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const { data, ok } = await api.get('/auth/me');

    if (ok && data?.success) {
      setProfile(data.user);
      setRegistrations(data.registrations || []);
      setAllocations(data.allocations || []);
    } else {
      setError(data?.error || 'Failed to load your profile.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Voucher Upload Handler ──────────────────────────────────────────
  const handleVoucherUpload = async (eventId) => {
    if (!uploadFile) {
      setUploadError('Please select an image file first.');
      return;
    }

    setUploadProgress('Uploading and processing…');
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('voucher', uploadFile);
    formData.append('event_id', eventId);

    const { data, ok } = await api.upload('/upload/voucher', formData);

    setUploadProgress('');

    if (ok && data?.success) {
      setUploadSuccess(
        `Voucher uploaded! Compression: ${data.processing?.compression_ratio || 'N/A'}. ` +
        'Awaiting admin verification.'
      );
      setUploadFile(null);
      setUploadingFor(null);
      // Refresh the profile to update registration status.
      await loadProfile();
    } else {
      setUploadError(data?.error || 'Upload failed. Please try again.');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':              return 'badge-approved';
      case 'Pending_Verification':  return 'badge-pending';
      case 'Rejected':              return 'badge-rejected';
      default:                      return 'badge';
    }
  };

  const getStatusLabel = (status) => {
    return status?.replace('_', ' ') || 'Unknown';
  };

  const getAllocationForEvent = (eventId) => {
    return allocations.find((a) => a.event_id === eventId);
  };

  // =====================================================================
  // LOADING STATE
  // =====================================================================
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card p-8 animate-pulse">
          <div className="h-8 w-48 bg-white/10 rounded-lg mb-4" />
          <div className="h-4 w-80 bg-white/10 rounded mb-2" />
          <div className="h-4 w-64 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded mb-3" />
              <div className="h-4 w-full bg-white/10 rounded mb-2" />
              <div className="h-4 w-3/4 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =====================================================================
  // ERROR STATE
  // =====================================================================
  if (error) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full
                        bg-rose-500/15 border-2 border-rose-500/30 mb-4">
          <svg className="w-8 h-8 text-rose-400" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <button onClick={loadProfile} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // =====================================================================
  // MAIN DASHBOARD VIEW
  // =====================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="section-header">
          Welcome, {profile?.name?.split(' ')[0] || 'Participant'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Your event dashboard — track registrations, uploads, and team assignments.
        </p>
      </div>

      {/* ── Profile Card ─────────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500
                          flex items-center justify-center shadow-glow-emerald shrink-0">
            <span className="text-white font-black text-xl">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate">
                {profile?.name}
              </h2>
              <span className="badge-role text-[10px]">{profile?.role_tier}</span>
            </div>
            <p className="text-sm text-slate-400">{profile?.email}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>📱 {profile?.phone || '—'}</span>
              <span>🎓 {profile?.branch} · {profile?.academic_year}</span>
            </div>
          </div>

          {/* Registration ID Badge */}
          <div className="sm:text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-1">
              Registration ID
            </p>
            <p className="text-base font-mono font-bold text-white tracking-wider
                          bg-brand-500/10 border border-brand-500/20
                          rounded-lg px-3 py-1.5 inline-block"
               id="profile-registration-id">
              {profile?.unique_registration_id}
            </p>
          </div>
        </div>
      </div>

      {/* ── Upload Success Banner ────────────────────────────────────── */}
      {uploadSuccess && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                        text-emerald-400 text-sm font-medium animate-fade-in flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          {uploadSuccess}
        </div>
      )}

      {/* ── Event Registrations ──────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Your Events
        </h3>

        {registrations.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm">
              You haven't registered for any events yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrations.map((reg) => {
              const alloc = getAllocationForEvent(reg.event_id);
              const isRevealed = alloc?.reveal_state === 'Revealed';
              const isPending  = reg.registration_status === 'Pending_Verification';
              const isRejected = reg.registration_status === 'Rejected';
              const isApproved = reg.registration_status === 'Approved';

              return (
                <div key={reg.registration_id} className="glass-card-hover p-6 space-y-4">
                  {/* Event Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-white truncate">
                        {reg.event_title}
                      </h4>
                      {reg.event_date && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          📅 {new Date(reg.event_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <span className={getStatusBadge(reg.registration_status)}>
                      {getStatusLabel(reg.registration_status)}
                    </span>
                  </div>

                  {/* Check-In Status */}
                  {isApproved && (
                    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg
                      ${reg.checked_in_state
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        reg.checked_in_state ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`} />
                      {reg.checked_in_state ? 'Checked In' : 'Not yet checked in'}
                    </div>
                  )}

                  {/* ── VOUCHER UPLOAD (Pending or Rejected) ──────── */}
                  {(isPending || isRejected) && (
                    <div className="space-y-3">
                      {isRejected && (
                        <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20
                                        text-rose-400 text-xs">
                          Voucher was rejected. Please re-upload a clear payment screenshot.
                        </div>
                      )}

                      {uploadingFor === reg.event_id ? (
                        <div className="space-y-3 animate-fade-in">
                          {/* File Input */}
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Payment Voucher
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                setUploadFile(e.target.files[0] || null);
                                setUploadError('');
                              }}
                              className="mt-2 block w-full text-sm text-slate-400
                                         file:mr-3 file:py-2 file:px-4 file:rounded-lg
                                         file:border-0 file:text-sm file:font-semibold
                                         file:bg-brand-500/15 file:text-brand-300
                                         hover:file:bg-brand-500/25
                                         file:cursor-pointer file:transition-colors"
                              id={`voucher-input-${reg.event_id}`}
                            />
                          </label>

                          {/* Upload Error */}
                          {uploadError && (
                            <p className="text-xs text-rose-400">{uploadError}</p>
                          )}

                          {/* Upload Progress */}
                          {uploadProgress && (
                            <div className="flex items-center gap-2 text-xs text-brand-300">
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor"
                                        strokeWidth="3" className="opacity-25" />
                                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                      fill="currentColor" className="opacity-75" />
                              </svg>
                              {uploadProgress}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVoucherUpload(reg.event_id)}
                              disabled={!uploadFile || !!uploadProgress}
                              className="btn-primary text-xs py-2 px-4"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => {
                                setUploadingFor(null);
                                setUploadFile(null);
                                setUploadError('');
                              }}
                              className="btn-ghost text-xs py-2 px-4"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUploadingFor(reg.event_id);
                            setUploadError('');
                            setUploadSuccess('');
                          }}
                          className="btn-ghost text-xs py-2 w-full"
                        >
                          📷 {isPending && reg.voucher_path ? 'Re-upload' : 'Upload'} Payment Voucher
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── ALLOCATION DISPLAY (Revealed) ─────────────── */}
                  {isApproved && isRevealed && alloc && (
                    <div className="bg-gradient-to-br from-brand-950/60 to-violet-950/60
                                    border border-brand-500/15 rounded-xl p-4 space-y-3
                                    animate-fade-in">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400">
                        Your Assignment
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Team Name */}
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Team</p>
                          <p className="text-sm font-bold text-white">{alloc.team_name}</p>
                        </div>

                        {/* Role */}
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Role</p>
                          <span className="badge-role text-[10px]">{alloc.assigned_cohort_role}</span>
                        </div>

                        {/* Seat */}
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Seat</p>
                          <div className="inline-flex items-center gap-1.5 bg-white/[0.06]
                                          border border-white/10 rounded-lg px-3 py-1.5">
                            <span className="text-sm font-mono font-bold text-brand-300">
                              Row {alloc.row_coordinate}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-sm font-mono font-bold text-violet-300">
                              Col {alloc.column_coordinate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── AWAITING REVEAL MESSAGE ────────────────────── */}
                  {isApproved && alloc && !isRevealed && (
                    <div className="flex items-center gap-2 text-xs text-slate-500
                                    bg-white/[0.03] rounded-lg px-3 py-2.5
                                    border border-white/[0.06]">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-slow" />
                      Team assignment pending — stay tuned for the reveal!
                    </div>
                  )}

                  {/* ── AUTOMATED CREDENTIALING (If Approved) ───────── */}
                  {isApproved && (
                    <div className="pt-2 border-t border-white/[0.04]">
                      <CertificateGenerator
                        eventId={reg.event_id}
                        participant={profile}
                        teamName={alloc?.team_name}
                        role={alloc?.assigned_cohort_role}
                        eventTitle={reg.event_title}
                        eventDate={reg.event_date}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

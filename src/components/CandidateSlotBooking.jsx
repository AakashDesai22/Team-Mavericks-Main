import { useState, useEffect } from 'react';
import api from '../api/client';

export default function CandidateSlotBooking({ eventId, candidateUserId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchSlots();
    }
  }, [eventId]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/interviews/slots?event_id=${eventId}`);
      if (res.data.success) {
        setSlots(res.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const myBookedSlot = slots.find((s) => s.booked_by_user_id === candidateUserId);

  if (loading) {
    return <div className="text-xs text-slate-400 py-3 animate-pulse">Loading interview status...</div>;
  }

  return (
    <div className="p-4 rounded-2xl border border-white/[0.08] space-y-3 text-left" style={{ background: 'var(--bg-hover)' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          🎯 Interview Slot Information
        </h4>
        {myBookedSlot ? (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Slot Assigned
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Slot Not Assigned Yet
          </span>
        )}
      </div>

      {myBookedSlot ? (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
          <div className="text-xs text-emerald-400 font-bold">Assigned Interview Schedule:</div>
          <div className="text-sm text-white font-bold font-mono">
            📅 {myBookedSlot.slot_date} ({myBookedSlot.start_time} - {myBookedSlot.end_time})
          </div>
          <div className="text-xs text-slate-300">
            📍 Panel: <span className="text-white font-semibold">{myBookedSlot.panel_name}</span> • Room/Venue: <span className="text-white font-semibold">{myBookedSlot.venue_room || 'TBD'}</span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 space-y-1 leading-relaxed">
          <p className="text-slate-300 font-semibold">Your event registration is confirmed.</p>
          <p className="text-[11px] text-slate-400">The admin panel will assign your interview venue & slot time shortly. Please check back here for updates.</p>
        </div>
      )}
    </div>
  );
}

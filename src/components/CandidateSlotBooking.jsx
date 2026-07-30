import { useState, useEffect } from 'react';
import api from '../api/client';

export default function CandidateSlotBooking({ eventId, candidateUserId, onSlotBooked }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [message, setMessage] = useState(null);

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

  const handleBook = async (slotId) => {
    try {
      setBookingSlotId(slotId);
      setMessage(null);
      const res = await api.post(`/interviews/slots/${slotId}/book`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Interview slot booked successfully!' });
        fetchSlots();
        if (onSlotBooked) onSlotBooked();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to book slot.' });
    } finally {
      setBookingSlotId(null);
    }
  };

  const myBookedSlot = slots.find((s) => s.booked_by_user_id === candidateUserId);

  if (loading) {
    return <div className="text-xs text-muted py-4">Loading interview slots...</div>;
  }

  return (
    <div className="glass-card p-4 space-y-4 my-3" style={{ background: 'var(--surface-bg)' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          🎯 Recruitment Interview Slot
        </h4>
        {myBookedSlot && (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Slot Booked
          </span>
        )}
      </div>

      {message && (
        <div
          className={`p-2.5 rounded-lg text-xs font-medium ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {myBookedSlot ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="text-xs text-emerald-400 font-bold">Your Scheduled Interview:</div>
          <div className="text-sm text-white font-semibold">
            📅 {myBookedSlot.slot_date} ({myBookedSlot.start_time} - {myBookedSlot.end_time})
          </div>
          <div className="text-xs text-muted">
            📍 Panel: <span className="text-white">{myBookedSlot.panel_name}</span> • Room/Link: <span className="text-white">{myBookedSlot.venue_room || 'TBD'}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Select an available time slot below to lock in your interview session with the panel:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {slots
              .filter((s) => s.status === 'Available')
              .map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-emerald-500/50 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {s.slot_date} ({s.start_time} - {s.end_time})
                    </div>
                    <div className="text-[11px] text-muted">{s.panel_name}</div>
                  </div>

                  <button
                    onClick={() => handleBook(s.id)}
                    disabled={bookingSlotId === s.id}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    {bookingSlotId === s.id ? 'Booking...' : 'Book Slot'}
                  </button>
                </div>
              ))}

            {slots.filter((s) => s.status === 'Available').length === 0 && (
              <div className="col-span-2 text-center text-xs text-muted py-4">
                No available time slots right now. Please check back soon or contact the recruitment team.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

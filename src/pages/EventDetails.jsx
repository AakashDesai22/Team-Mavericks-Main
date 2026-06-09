import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import DynamicFormRenderer, { FileUploader } from '../components/DynamicFormRenderer';
import PublicNavbar from '../components/PublicNavbar';

const Icons = {
  Calendar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Dollar: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Alert: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
};

export default function EventDetails() {
  const { event_id } = useParams();
  const navigate = useNavigate();
  const { user, persistSession } = useAuth();

  // Event Data state
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Flow state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // For guests, track the registration steps: 'FORM' | 'PROOF' | 'OTP'
  const [regStep, setRegStep] = useState('FORM');
  const [guestRegData, setGuestRegData] = useState(null);
  const [verificationProof, setVerificationProof] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Online');

  useEffect(() => {
    // Reset guest flow state when closing/opening form workspace
    if (!showForm) {
      setRegStep('FORM');
      setGuestRegData(null);
      setVerificationProof('');
      setOtpCode('');
      if (event) {
        setPaymentMethod(event.payment_type === 'Offline' ? 'Offline' : 'Online');
      }
    }
  }, [showForm, event]);

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/events/${event_id}`);
        if (res.ok && res.data?.success) {
          setEvent(res.data.event);
        } else {
          setError(res.data?.error || 'Symposium details not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to contact database gateway.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [event_id]);

  const handleRegistrationSubmit = async (formData, guestInfo) => {
    setSubmitting(true);
    try {
      // POST events/{id}/register
      const res = await api.post(`/events/${event_id}/register`, {
        form_data: formData,
        ...(guestInfo || {})
      });

      if (res.ok && res.data?.success) {
        if (res.data.user && res.data.token) {
          persistSession(res.data.user, res.data.token);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        alert(res.data?.error || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network outage. Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormStepSubmit = (formData, guestInfo) => {
    if (!user?.id) {
      // It's a guest!
      setGuestRegData({ formData, guestInfo });
      setRegStep('PROOF');
    } else {
      // Logged in user submits directly
      handleRegistrationSubmit(formData, null);
    }
  };

  const handleInitiateOtp = async () => {
    setSendingOtp(true);
    try {
      const email = guestRegData?.guestInfo?.email || '';
      const res = await api.post(`/events/${event_id}/register/initiate`, {
        name: guestRegData?.guestInfo?.name || '',
        email: email,
        phone: guestRegData?.guestInfo?.phone || '',
        form_data: guestRegData?.formData,
        voucher_path: verificationProof,
        payment_method: paymentMethod
      });

      if (res.ok && res.data?.success) {
        setRegStep('OTP');
      } else {
        alert(res.data?.error || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send verification code. Check network connection.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAndSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || verifyingOtp) return;
    setVerifyingOtp(true);
    try {
      const email = guestRegData?.guestInfo?.email || '';
      const res = await api.post(`/events/${event_id}/register/verify`, {
        email: email,
        otp: otpCode.trim()
      });

      if (res.ok && res.data?.success) {
        if (res.data.user && res.data.token) {
          persistSession(res.data.user, res.data.token);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        alert(res.data?.error || 'Verification failed. Please check the OTP.');
      }
    } catch (err) {
      console.error(err);
      alert('Verification failed due to a network error.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh text-slate-100 font-sans selection:bg-brand-500 selection:text-black overflow-x-hidden relative flex flex-col">
      <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />
      <PublicNavbar />

      <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-start">
        {loading ? (
          <div className="space-y-6 animate-pulse p-4 max-w-4xl w-full mx-auto">
            <div className="h-64 glass-card bg-white/[0.02] rounded-3xl" />
            <div className="h-24 glass-card bg-white/[0.02] rounded-3xl" />
          </div>
        ) : error || !event ? (
          <div className="glass-card p-12 text-center rounded-3xl max-w-md w-full mx-auto my-12 border border-rose-500/20 bg-rose-500/5">
            <Icons.Alert className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-widest">Load Error</h2>
            <p className="text-xs text-slate-500 mt-2">{error || 'Event not found.'}</p>
            <Link to="/" className="btn-primary mt-6 py-2 px-6 inline-block">Back to Home</Link>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in text-slate-100 max-w-4xl w-full mx-auto text-left">
            
            {/* ── Visual Poster Graphic Panel ── */}
            <div className="rounded-[32px] border border-white/[0.08] bg-black/45 shadow-2xl relative overflow-hidden dark-zone">
              {/* Glow backdrop bubble */}
              <div className="absolute -left-16 -top-16 w-52 h-52 rounded-full bg-brand-500/10 blur-[80px] pointer-events-none" />
              
              {event.cover_image_path ? (
                <img
                  src={event.cover_image_path}
                  alt={event.title}
                  className="w-full h-64 md:h-80 object-cover border-b border-white/[0.06]"
                />
              ) : (
                <div className="w-full h-64 md:h-80 bg-gradient-to-br from-brand-950/40 via-surface-900 to-violet-950/40 flex flex-col items-center justify-center gap-2 border-b border-white/[0.06] relative">
                  <Icons.Calendar className="w-14 h-14 text-brand-400 opacity-60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Symposium Poster Graphic</span>
                </div>
              )}

              <div className="p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Deep-Linked Engagement Entry</span>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight text-white mt-0.5">
                      {event.title}
                    </h1>
                  </div>
                  
                  <span className="px-4 py-2 rounded-xl bg-black/75 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-200">
                    {event.payment_type === 'Free' ? 'FREE REGISTRATION' : `FEE: INR ${event.payment_amount}`}
                  </span>
                </div>

                <p className="text-slate-400 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                  {event.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* ── Dynamic Registration Workspace ── */}
            {success ? (
              <div className="glass-card p-12 text-center rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 animate-fade-in space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                  <Icons.Check className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-200 uppercase tracking-widest">Registration Secured!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your dynamic registration record has been committed cleanly. Redirecting you to your Participant Hub to view your holographic entrance pass...
                </p>
              </div>
            ) : !showForm ? (
              /* Event Parameters Overview Board */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch animate-fade-in">
                {/* Metadata parameters (8 Cols) */}
                <div className="md:col-span-8 glass-card border border-white/[0.08] p-6 rounded-[24px] bg-white/[0.01] flex flex-col justify-between gap-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1">
                      <Icons.Calendar className="w-4 h-4 text-brand-400 mx-auto" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Date / Duration</span>
                      <span className="text-[10px] font-bold text-slate-300 block">{event.event_date}</span>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1">
                      <Icons.Users className="w-4 h-4 text-brand-400 mx-auto" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Max Capacity</span>
                      <span className="text-[10px] font-bold text-slate-300 block">{event.max_capacity} seats</span>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1">
                      <Icons.Dollar className="w-4 h-4 text-brand-400 mx-auto" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Event Splits</span>
                      <span className="text-[10px] font-bold text-slate-300 block">{event.num_days} Day(s)</span>
                    </div>
                  </div>

                  {/* Offline payment details if offline mode */}
                  {event.payment_type === 'Offline' && (
                    <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-2 leading-relaxed text-left">
                      <span className="font-bold text-brand-400 flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
                        <Icons.Alert className="w-4 h-4 text-brand-400" />
                        Offline Payment Verification Requirements
                      </span>
                      <p className="text-slate-400">
                        This symposium requires offline registration fee processing. UPI payments should be processed to UPI ID: <strong>{event.payment_context || 'upi@mavericks'}</strong>. 
                        Once paid, upload a high-resolution screenshot inside your Participant Dashboard for manual operator verification.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full btn-primary py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2"
                  >
                    Secure Admission Slot
                  </button>
                </div>

                {/* Interactive Guidelines Panel (4 Cols) */}
                <div className="md:col-span-4 glass-card border border-white/[0.08] p-5 rounded-[24px] bg-white/[0.002] flex flex-col justify-between gap-4">
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-2 border-b border-white/[0.06]">
                      Admission Directives
                    </h3>
                    <ul className="space-y-3 text-[11px] text-slate-400 list-disc list-inside leading-relaxed">
                      <li>Double registrations for the same event are blocked at the relational schema index layer.</li>
                      <li>Your verified account credentials will be auto-locked at the top of the form.</li>
                      <li>Ensure all dynamic custom fields are validated.</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[9px] text-slate-500 leading-normal text-center">
                    Admission credentials are tied deterministically to MAV-PRT-XXX sequences.
                  </div>
                </div>
              </div>
            ) : (
              /* Mounted Dynamic Form Schema Renderer */
              <div className="glass-card border border-white/[0.08] p-6 rounded-[28px] bg-white/[0.01] animate-fade-in relative">
                <div className="flex justify-between items-center pb-4 border-b border-white/[0.05] mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                    {regStep === 'FORM' && 'Securing Spot Dynamic Form'}
                    {regStep === 'PROOF' && 'Payment & ID Verification'}
                    {regStep === 'OTP' && 'Confirm Email Verification'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (regStep === 'FORM') {
                        setShowForm(false);
                      } else if (regStep === 'PROOF') {
                        setRegStep('FORM');
                      } else if (regStep === 'OTP') {
                        setRegStep('PROOF');
                      }
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors"
                  >
                    {regStep === 'FORM' ? 'Back to Overview' : 'Go Back'}
                  </button>
                </div>

                {regStep === 'FORM' && (
                  <DynamicFormRenderer
                    formSchema={event.form_schema || '[]'}
                    user={user}
                    onSubmit={handleFormStepSubmit}
                    submitButtonText={user?.id ? "Submit Registry Slot" : "Proceed to Payment / Verification"}
                    loading={submitting}
                  />
                )}

                {regStep === 'PROOF' && (
                  <div className="space-y-6 text-left">
                    {event.payment_type === 'Free' ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-1">
                          <strong className="font-bold text-brand-400 uppercase tracking-widest text-[10px] block">College ID Verification</strong>
                          <p className="text-slate-400">
                            Because you are registering as a guest, we require you to upload a screenshot of your College ID card. 
                            Our admin team will manually verify this before confirming your approval.
                          </p>
                        </div>
                        <FileUploader
                          fieldName="college_id_proof"
                          value={verificationProof}
                          onChange={setVerificationProof}
                          required={true}
                        />
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fade-in">
                        {/* Choice Selector */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Payment Method:</label>
                          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/[0.06] max-w-md">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('Online');
                                setVerificationProof('');
                              }}
                              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                paymentMethod === 'Online'
                                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-black'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Online (UPI / QR)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('Offline');
                                setVerificationProof('');
                              }}
                              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                paymentMethod === 'Offline'
                                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-black'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Offline (Coordinator)
                            </button>
                          </div>
                        </div>

                        {paymentMethod === 'Online' && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-1">
                              <strong className="font-bold text-brand-400 uppercase tracking-widest text-[10px] block">UPI Payment</strong>
                              <p className="text-slate-400">
                                Scan the QR code or send <strong>INR {event.payment_amount}</strong> to the UPI ID. 
                                Then, upload your payment confirmation receipt screenshot below.
                              </p>
                            </div>

                            {event.payment_qr_path ? (
                              <div className="text-center py-4 bg-black/30 rounded-2xl border border-white/5 max-w-xs mx-auto">
                                <img
                                  src={event.payment_qr_path}
                                  alt="UPI QR Code"
                                  className="max-h-[220px] max-w-full object-contain mx-auto rounded-lg border border-white/10"
                                />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mt-2">Scan to Pay</span>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-500 bg-white/[0.01] border border-white/10 rounded-xl">
                                QR code graphic was not uploaded by administrators. Please use UPI ID below or offline payment instead.
                              </div>
                            )}

                            <div className="text-center py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-xs font-semibold">
                              UPI ID: <span className="text-brand-400 font-mono select-all">{event.payment_context || 'upi@mavericks'}</span>
                            </div>

                            <FileUploader
                              fieldName="payment_screenshot"
                              value={verificationProof}
                              onChange={setVerificationProof}
                              required={true}
                            />
                          </div>
                        )}

                        {paymentMethod === 'Offline' && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-1">
                              <strong className="font-bold text-brand-400 uppercase tracking-widest text-[10px] block">Offline Coordination</strong>
                              <p className="text-slate-400">
                                Please contact one of our coordinators listed below to complete your payment of <strong>INR {event.payment_amount}</strong>. 
                                Your entry status will remain pending until approved offline. No screenshot upload is required.
                              </p>
                            </div>

                            <div className="space-y-3">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coordinator Contacts:</span>
                              {(() => {
                                let contacts = [];
                                if (event.finance_contacts) {
                                  try {
                                    contacts = typeof event.finance_contacts === 'string' ? JSON.parse(event.finance_contacts) : event.finance_contacts;
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                                if (!Array.isArray(contacts) || contacts.length === 0) {
                                  return <p className="text-xs text-slate-500 italic">No coordinators listed. Please submit to place registration in pending status.</p>;
                                }
                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {contacts.map((c, idx) => (
                                      <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1">
                                        <span className="font-bold text-slate-200 text-xs block">{c.name}</span>
                                        <span className="text-slate-400 font-mono text-[11px] block">{c.phone}</span>
                                        {c.email && <span className="text-slate-500 text-[10px] block truncate">{c.email}</span>}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={handleInitiateOtp}
                        disabled={sendingOtp || (event.payment_type !== 'Free' && paymentMethod === 'Online' && !verificationProof) || (event.payment_type === 'Free' && !verificationProof)}
                        className="w-full btn-primary py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                      >
                        {sendingOtp ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending OTP Code...
                          </>
                        ) : (
                          "Proceed to Email OTP Verification"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {regStep === 'OTP' && (
                  <form onSubmit={handleVerifyAndSubmit} className="space-y-6 text-left">
                    <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl text-xs space-y-1">
                      <strong className="font-bold text-brand-400 uppercase tracking-widest text-[10px] block">Email Verification Needed</strong>
                      <p className="text-slate-400">
                        A 6-digit One-Time verification code (OTP) was dispatched to: <strong>{guestRegData?.guestInfo?.email}</strong>. 
                        Please check your inbox (and spam folder) and enter it below.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="otp-input" className="text-xs font-semibold tracking-wide text-slate-300 block text-left">
                        Enter 6-Digit OTP Code:
                      </label>
                      <input
                        id="otp-input"
                        type="text"
                        maxLength="6"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-center font-mono font-bold tracking-[8px] text-lg focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <button
                        type="submit"
                        disabled={verifyingOtp || otpCode.length !== 6}
                        className="w-full btn-primary py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                      >
                        {verifyingOtp ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Verifying & Submitting Form...
                          </>
                        ) : (
                          "Verify & Submit Registration"
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleInitiateOtp}
                        disabled={sendingOtp}
                        className="w-full text-center text-[10px] text-slate-400 hover:text-white uppercase tracking-wider font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../api/client';

const Icons = {
  Download: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

export default function CertificateGenerator({ eventId, participant, teamName = '', role = '', eventTitle = '', eventDate = '' }) {
  const [template, setTemplate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  const ghostRef = useRef(null);

  // Fetch coordinates template on mount
  useEffect(() => {
    if (!eventId) return;
    
    async function loadTemplate() {
      setLoadingTemplate(true);
      setErrorMsg('');
      try {
        const res = await api.get('/certificates/template', { event_id: eventId });
        if (res.ok && res.data?.success && res.data.template) {
          setTemplate(res.data.template);
        } else {
          setTemplate(null);
          // Don't show hard error here since some events may just not have a template designed yet.
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [eventId]);

  const compilePdfCertificate = async () => {
    if (!template || generating) return;
    
    setGenerating(true);
    setErrorMsg('');
    setSuccess(false);

    // Give react 150ms to ensure the offscreen element is fully mounted and images are fetched
    await new Promise(resolve => setTimeout(resolve, 150));

    const element = ghostRef.current;
    if (!element) {
      setErrorMsg('Generator render canvas missing.');
      setGenerating(false);
      return;
    }

    try {
      // 1. Capture offscreen element at 3x scale (300 DPI equivalent) with CORS enabled
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');

      // 2. Setup jsPDF landscape formatting points standard measures (A4 = 842 x 595 points)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 842, 595);

      // 3. Save download file
      const safeName = (participant?.name || 'Certificate').trim().replace(/\s+/g, '_');
      pdf.save(`Certificate_${safeName}.pdf`);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed compiling high-DPI canvas. Check background CORS rules.');
    } finally {
      setGenerating(false);
    }
  };

  if (loadingTemplate) {
    return (
      <button disabled className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-500 cursor-not-allowed flex items-center gap-1.5 w-full md:w-auto justify-center">
        <Icons.Spinner className="w-4 h-4 text-slate-500" />
        Checking templates...
      </button>
    );
  }

  if (!template) {
    return null; // Don't render download button if no template coordinates designed
  }

  // Parse template coordinates mapping JSON
  const elements = typeof template.elements_json === 'string'
    ? JSON.parse(template.elements_json)
    : template.elements_json;

  // Generate dynamic QR validation code link path
  // Dynamic host verification path: maps to window.origin/verify.php
  const verifyUrl = `${window.location.origin}/verify.php?id=${participant?.unique_registration_id || 'BODH2026-X8R9TQ'}`;

  // Formatter mapping variables helpers
  const formatTextVariable = (rawLabel) => {
    if (!rawLabel) return '';
    let text = rawLabel;
    
    // Replace dynamic slots
    text = text.replace('{name}', participant?.name || 'Attendee');
    text = text.replace('{id}', participant?.unique_registration_id || 'BODH2026-X8R9TQ');
    text = text.replace('{event}', eventTitle || 'Bodhantra Event');
    text = text.replace('{team}', teamName || 'COHORT ONE');
    text = text.replace('{role}', role || 'MEMBER');
    text = text.replace('{date}', eventDate ? new Date(eventDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'May 2026');
    
    return text;
  };

  return (
    <div className="inline-block w-full md:w-auto relative">
      
      {/* ── Branded Trigger Download Button ── */}
      <button
        onClick={compilePdfCertificate}
        disabled={generating}
        className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
          success
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-glow-sm hover:shadow-glow'
        }`}
      >
        {generating ? (
          <>
            <Icons.Spinner className="w-4 h-4 text-slate-950" />
            Compiling high-res PDF (300 DPI)...
          </>
        ) : success ? (
          <>
            <Icons.Check className="w-4 h-4" />
            Certificate Downloaded!
          </>
        ) : (
          <>
            <Icons.Download className="w-4.5 h-4.5 stroke-[2.5]" />
            Download E-Certificate
          </>
        )}
      </button>

      {/* Warning/Error indicator box */}
      {errorMsg && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] leading-normal flex gap-1.5 items-start z-10">
          <Icons.Alert className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* ── THE GHOST OFFSCREEN A4 LANDSCAPE DOM CANVAS CONTAINER ── */}
      {/* Set positions offscreen absolute to ensure it renders for capture without layout overlaps */}
      <div
        ref={ghostRef}
        className="absolute select-none pointer-events-none"
        style={{
          left: '-9999px',
          top: '-9999px',
          width: '1123px', // Standard pixel width at 96dpi for A4 landscape
          height: '794px', // Standard pixel height for A4 landscape
          backgroundImage: `url(/api/${template.background_path})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Render variables on percentage maps coordinates */}
        {elements.map((el) => {
          const isQR = el.type === 'qr';

          return (
            <div
              key={el.id}
              className="absolute leading-none shrink-0"
              style={{
                left: `${el.x_pct}%`,
                top: `${el.y_pct}%`,
                transform: `translate(${el.text_align === 'center' ? '-50%' : el.text_align === 'right' ? '-100%' : '0'}, -50%)`,
                fontSize: `${el.font_size}px`,
                fontWeight: el.font_weight,
                fontFamily: el.font_family,
                color: isQR ? '#000000' : el.color,
                textAlign: el.text_align
              }}
            >
              {isQR ? (
                // Dynamic verification QR canvas element inside PDF
                <div className="bg-white p-2.5 border border-slate-200 shadow-md flex items-center justify-center rounded">
                  <QRCodeCanvas
                    value={verifyUrl}
                    size={110}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              ) : (
                <span>{formatTextVariable(el.label)}</span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

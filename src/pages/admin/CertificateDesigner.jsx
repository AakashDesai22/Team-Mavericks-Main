import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

const Icons = {
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Save: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Image: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Move: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
};

export default function CertificateDesigner() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [templateName, setTemplateName] = useState('');
  
  // Background selection
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgUrl, setBgUrl] = useState('');
  const [existingBgPath, setExistingBgPath] = useState('');

  // Canvas nodes template elements list
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // States
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const canvasRef = useRef(null);
  const dragInfoRef = useRef(null); // Tracks mouse dragging session states
  const [canvasWidth, setCanvasWidth] = useState(1123); // Standard A4 base width at 96 DPI

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width) {
          setCanvasWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [bgUrl]);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
      }
    }
    loadEvents();
  }, []);

  // Load existing template coordinates on Event select
  const fetchTemplate = async (eventId) => {
    if (!eventId) return;
    
    setLoadingTemplate(true);
    setFeedback(null);
    setSelectedElementId(null);
    try {
      const res = await api.get('/certificates/template', { event_id: eventId });
      
      if (res.ok && res.data?.success && res.data.template) {
        const t = res.data.template;
        setTemplateName(t.template_name);
        setExistingBgPath(t.background_path);
        setBgUrl(`/api/${t.background_path}`);
        setBgImageFile(null);
        
        // Load element array list coordinates from JSON
        const parsedElements = typeof t.elements_json === 'string' 
          ? JSON.parse(t.elements_json) 
          : t.elements_json;
        setElements(parsedElements || []);
        
        setFeedback({
          type: 'info',
          message: 'Retrieved saved coordinate template. Interactive draggability is active.'
        });
      } else {
        // Reset to empty blueprint
        setTemplateName('');
        setBgUrl('');
        setExistingBgPath('');
        setBgImageFile(null);
        setElements([]);
        setFeedback({
          type: 'warning',
          message: 'No coordinate template stored for this event yet. Configure parameters below.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Connection failure retrieving templates.' });
    } finally {
      setLoadingTemplate(false);
    }
  };

  useEffect(() => {
    fetchTemplate(selectedEventId);
  }, [selectedEventId]);

  // Handle local background image upload preview
  const handleBgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBgImageFile(file);
    setExistingBgPath('');
    setBgUrl(URL.createObjectURL(file));
    setFeedback({
      type: 'info',
      message: `Selected local image: ${file.name}. Align draggable badges coordinates.`
    });
  };

  // Add field node to template
  const addFieldNode = (type, label) => {
    // Generate unique ID
    const newId = `field_${Date.now()}`;
    const newField = {
      id: newId,
      type, // 'text' or 'qr'
      label, // e.g. '{name}', '{event}', '{id}'
      x_pct: 50.0, // center x coordinate percentage
      y_pct: 50.0, // center y coordinate percentage
      font_size: 24, // font sizes
      font_weight: 'bold', // bold variant
      font_family: 'Inter', // fonts
      color: '#020617', // deep slate default
      text_align: 'center'
    };

    setElements(prev => [...prev, newField]);
    setSelectedElementId(newId);
  };

  // Pure React dynamic dragging mouse binds
  const startElementDrag = (e, elementId) => {
    e.preventDefault();
    setSelectedElementId(elementId);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const el = elements.find(item => item.id === elementId);
    if (!el) return;

    const rect = canvas.getBoundingClientRect();
    
    // Track initial drag coords
    dragInfoRef.current = {
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      initialXPct: el.x_pct,
      initialYPct: el.y_pct,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    };

    window.addEventListener('mousemove', handleElementDragging);
    window.addEventListener('mouseup', endElementDragging);
  };

  const handleElementDragging = (e) => {
    if (!dragInfoRef.current) return;
    const { elementId, startX, startY, initialXPct, initialYPct, canvasWidth, canvasHeight } = dragInfoRef.current;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Convert deltas to percentage bounds relative to canvas width/height
    const deltaXPct = (deltaX / canvasWidth) * 100;
    const deltaYPct = (deltaY / canvasHeight) * 100;

    // Proportional persistence: clamp values between 0% and 95%
    const finalXPct = Math.min(95, Math.max(0, parseFloat((initialXPct + deltaXPct).toFixed(2))));
    const finalYPct = Math.min(95, Math.max(0, parseFloat((initialYPct + deltaYPct).toFixed(2))));

    setElements(prev => 
      prev.map(item => {
        if (item.id === elementId) {
          return { ...item, x_pct: finalXPct, y_pct: finalYPct };
        }
        return item;
      })
    );
  };

  const endElementDragging = () => {
    window.removeEventListener('mousemove', handleElementDragging);
    window.removeEventListener('mouseup', endElementDragging);
    dragInfoRef.current = null;
  };

  // Delete element node
  const deleteElement = (elementId) => {
    setElements(prev => prev.filter(item => item.id !== elementId));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  // Modify active element property (styling controls)
  const updateActiveStyle = (key, val) => {
    if (!selectedElementId) return;
    setElements(prev => 
      prev.map(item => {
        if (item.id === selectedElementId) {
          return { ...item, [key]: val };
        }
        return item;
      })
    );
  };

  const activeElement = elements.find(item => item.id === selectedElementId);

  // Commit Blueprint to server
  const saveTemplateBlueprint = async () => {
    if (!selectedEventId) {
      setFeedback({ type: 'error', message: 'Target event context is required.' });
      return;
    }
    if (!templateName.trim()) {
      setFeedback({ type: 'error', message: 'Template name is required.' });
      return;
    }
    if (!bgUrl) {
      setFeedback({ type: 'error', message: 'Background template image is required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('event_id', selectedEventId);
      formData.append('template_name', templateName.trim());
      formData.append('elements', JSON.stringify(elements));

      if (bgImageFile) {
        formData.append('background', bgImageFile);
      } else if (existingBgPath) {
        formData.append('existing_background_path', existingBgPath);
      }

      const res = await api.upload('/certificates/template', formData);

      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Certificate template layout coordinates committed successfully!'
        });
        await fetchTemplate(selectedEventId);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.error || 'Failed to save template blueprint.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to communicate template coordinates.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="section-header">Certificate Template Designer</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Upload certificate backgrounds and align draggable fields ({'{name}'}, {'{id}'}) using percentage math to prevent server stress.
        </p>
      </div>

      {/* ── Dynamic Controls Header ── */}
      <div className="glass-card p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative overflow-hidden">
        
        {/* Selected event context selection */}
        <div className="md:col-span-4 space-y-1.5">
          <label htmlFor="designer-event" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
            Target Event
          </label>
          <select
            id="designer-event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
          >
            <option value="" disabled className="bg-surface-900">Select Event context...</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-surface-900">
                {evt.title}
              </option>
            ))}
          </select>
        </div>

        {/* Template label */}
        <div className="md:col-span-5 space-y-1.5">
          <label htmlFor="template-name" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
            Template Name / Award Category
          </label>
          <input
            id="template-name"
            type="text"
            placeholder="e.g. Certificate of Excellence, Winner Badge"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            disabled={!selectedEventId}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder:text-slate-600 text-xs font-semibold focus:border-brand-500/50 disabled:opacity-30 outline-none"
          />
        </div>

        {/* Save commitment action button */}
        <div className="md:col-span-3">
          <button
            onClick={saveTemplateBlueprint}
            disabled={saving || !selectedEventId || !templateName.trim() || !bgUrl}
            className="btn-primary w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white" />
                Commiting layout...
              </>
            ) : (
              <>
                <Icons.Save className="w-4 h-4" />
                Save Template Coordinates
              </>
            )}
          </button>
        </div>

      </div>

      {/* ── Main Workspace Dual Column Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Designer Canvas staging area (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Alerts feed */}
          {feedback && (
            <div className={`p-4 rounded-2xl border text-xs leading-normal flex gap-2.5 items-start animate-fade-in ${
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              feedback.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
              feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <Icons.Info className="w-5 h-5 shrink-0" />
              <p className="flex-1">{feedback.message}</p>
            </div>
          )}

          {/* Staging A4 Landscape Canvas Workspace */}
          <div 
            className="glass-card p-6 flex items-center justify-center min-h-[420px] relative overflow-hidden"
            onClick={() => setSelectedElementId(null)} // Click outside closes selections
          >
            {loadingTemplate ? (
              <div className="space-y-3 text-center">
                <Icons.Spinner className="w-8 h-8 text-brand-400 mx-auto" />
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Retrieving templates coordinate mapping...</p>
              </div>
            ) : bgUrl ? (
              // Staging Canvas wrapper card aspect ratio landscape 1.414 (A4 standard)
              <div 
                ref={canvasRef}
                className="w-full relative aspect-[1.414] bg-white border border-slate-200 shadow-2xl rounded overflow-hidden select-none"
                style={{
                  backgroundImage: `url(${bgUrl})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Visual coordinate helper alignments */}
                <div className="absolute inset-0 pointer-events-none opacity-5 border border-dashed border-slate-900" />

                {/* Render nodes coordinates absolute mappings */}
                {elements.map((el) => {
                  const isSelected = selectedElementId === el.id;
                  const isQR = el.type === 'qr';
                  const scale = canvasWidth / 1123;
                  const previewSize = Math.max(8, el.font_size * scale);

                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => startElementDrag(e, el.id)}
                      className={`absolute cursor-move select-none p-1 rounded transition-shadow leading-none ${
                        isSelected 
                          ? 'border-2 border-dashed border-brand-500 bg-brand-500/5 ring-4 ring-brand-500/15 shadow-lg z-30'
                          : 'hover:border hover:border-dashed hover:border-slate-400 border border-transparent z-20'
                      }`}
                      style={{
                        left: `${el.x_pct}%`,
                        top: `${el.y_pct}%`,
                        transform: `translate(${el.text_align === 'center' ? '-50%' : el.text_align === 'right' ? '-100%' : '0'}, -50%)`,
                        fontSize: `${previewSize}px`,
                        fontWeight: el.font_weight,
                        fontFamily: el.font_family,
                        color: isQR ? '#0f172a' : el.color,
                        textAlign: el.text_align
                      }}
                    >
                      {isQR ? (
                        <div 
                          className="bg-white border border-slate-200 flex flex-col items-center justify-center shadow-inner relative group select-none shrink-0 rounded" 
                          style={{ 
                            width: `${110 * scale}px`, 
                            height: `${110 * scale}px`,
                            padding: `${8 * scale}px` 
                          }}
                        >
                          {/* Simulated QR blocks */}
                          <div 
                            className="bg-slate-900 rounded flex items-center justify-center font-black text-white uppercase tracking-tighter"
                            style={{
                              width: `${75 * scale}px`,
                              height: `${75 * scale}px`,
                              fontSize: `${6 * scale}px`
                            }}
                          >
                            QR CODE
                          </div>
                          <span style={{ fontSize: `${5 * scale}px`, marginTop: `${2 * scale}px` }} className="font-bold text-slate-400 tracking-wider">VERIFY CERT</span>
                        </div>
                      ) : (
                        <span>{el.label}</span>
                      )}
                    </div>
                  );
                })}

              </div>
            ) : (
              // Canvas empty blank overlay
              <div className="text-center p-12 space-y-4 max-w-sm text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto text-slate-500">
                  <Icons.Image className="w-8 h-8 opacity-45" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Staging Canvas Empty</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a target Event context first and upload an award background template image in the right sidebar panel to begin aligning draggable nodes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Field Banks & Styling Control Sidebars (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Background Image Upload Panel */}
          {selectedEventId && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-2 border-b border-white/[0.06] flex items-center gap-1.5">
                <Icons.Image className="w-4 h-4" />
                Template Background
              </h3>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                  Select Background File (A4 Landscape aspect)
                </label>
                
                <div className="relative rounded-xl border border-dashed border-white/10 hover:border-brand-500/50 bg-white/[0.01] hover:bg-white/[0.02] transition-all p-5 flex flex-col items-center justify-center gap-2 text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleBgFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Icons.Image className="w-8 h-8 text-slate-500" />
                  <span className="text-xs text-slate-300 font-semibold truncate max-w-[200px]">
                    {bgImageFile ? bgImageFile.name : 'Upload JPEG / PNG...'}
                  </span>
                  <span className="text-[9px] text-slate-500">Aspect Ratio: ~1.41 (Landscape A4 size)</span>
                </div>
              </div>
            </div>
          )}

          {/* Add Field Nodes Button Banks */}
          {bgUrl && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest pb-2 border-b border-white/[0.06]">
                Add Draggable Fields
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => addFieldNode('text', '{name}')}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1 text-slate-300"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Participant Name
                </button>
                <button
                  onClick={() => addFieldNode('text', '{event}')}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1 text-slate-300"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Event Name
                </button>
                <button
                  onClick={() => addFieldNode('text', '{id}')}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1 text-slate-300"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Registration ID
                </button>
                <button
                  onClick={() => addFieldNode('text', '{team}')}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1 text-slate-300"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Team Group
                </button>
                <button
                  onClick={() => addFieldNode('text', '{role}')}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1 text-slate-300"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Cohort Role
                </button>
                <button
                  onClick={() => addFieldNode('qr', '{qr}')}
                  className="py-1.5 px-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold hover:bg-brand-500/20 flex items-center gap-1"
                >
                  <Icons.Plus className="w-3.5 h-3.5 text-brand-400" />
                  Verification QR Code
                </button>
              </div>
            </div>
          )}

          {/* Active Field Custom Styling Properties Sidebar */}
          {activeElement && (
            <div className="glass-card p-5 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Icons.Move className="w-4 h-4" />
                  Active Node Styling
                </h3>
                
                {/* Delete node trigger */}
                <button
                  onClick={() => deleteElement(activeElement.id)}
                  title="Remove this element template node"
                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
                >
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </div>

              {/* Node properties sliders */}
              <div className="space-y-4 text-xs font-medium">
                
                {/* Active node label display */}
                <div className="flex justify-between items-center text-slate-400 border-b border-white/[0.03] pb-2">
                  <span>Selected Element:</span>
                  <span className="font-mono text-slate-200 px-2 py-0.5 rounded bg-white/5 font-semibold">
                    {activeElement.label}
                  </span>
                </div>

                {activeElement.type === 'text' && (
                  <>
                    {/* Font sizes */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Size</span>
                        <span className="font-mono font-bold text-brand-300">{activeElement.font_size}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={activeElement.font_size}
                        onChange={(e) => updateActiveStyle('font_size', parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                    </div>

                    {/* Font weight select */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Font Weight</span>
                      <select
                        value={activeElement.font_weight}
                        onChange={(e) => updateActiveStyle('font_weight', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-200"
                      >
                        <option value="normal" className="bg-surface-900">Normal</option>
                        <option value="medium" className="bg-surface-900">Medium</option>
                        <option value="semibold" className="bg-surface-900">Semi Bold</option>
                        <option value="bold" className="bg-surface-900">Bold</option>
                        <option value="black" className="bg-surface-900">Extra Black</option>
                      </select>
                    </div>

                    {/* Font family selection */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Font Family</span>
                      <select
                        value={activeElement.font_family}
                        onChange={(e) => updateActiveStyle('font_family', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-200"
                      >
                        <option value="Inter" className="bg-surface-900 font-sans">Inter (Modern Clean)</option>
                        <option value="Georgia" className="bg-surface-900 font-serif">Georgia (Classic Serif)</option>
                        <option value="Courier New" className="bg-surface-900 font-mono">Courier (Monospace Ledger)</option>
                        <option value="Times New Roman" className="bg-surface-900 font-serif">Times (Traditional Elegant)</option>
                        <option value="JetBrains Mono" className="bg-surface-900 font-mono">JetBrains Mono</option>
                      </select>
                    </div>

                    {/* Text Alignments */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alignment Origin</span>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            onClick={() => updateActiveStyle('text_align', align)}
                            className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition ${
                              activeElement.text_align === align
                                ? 'bg-brand-500/10 border-brand-500/20 text-brand-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hex Color selection input */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Font Color (Hex)</span>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={activeElement.color}
                          onChange={(e) => updateActiveStyle('color', e.target.value)}
                          className="w-10 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          maxLength="7"
                          value={activeElement.color}
                          onChange={(e) => updateActiveStyle('color', e.target.value)}
                          className="flex-1 px-3 py-1 bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-mono rounded"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Proportional percentage logs diagnostic */}
                <div className="pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                  <span>Coord X: <strong className="text-slate-400">{activeElement.x_pct}%</strong></span>
                  <span>Coord Y: <strong className="text-slate-400">{activeElement.y_pct}%</strong></span>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

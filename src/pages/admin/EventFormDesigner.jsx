import { useState, useEffect } from 'react';

const Icons = {
  Text: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Dropdown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="16 10 12 14 8 10" />
    </svg>
  ),
  Checkbox: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="9 11 11 13 15 9" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  ArrowUp: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  ArrowDown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
  Code: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Copy: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  File: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
};

export default function EventFormDesigner({ onSchemaChange, initialSchema }) {
  const [fields, setFields] = useState(() => {
    if (initialSchema) {
      try {
        const parsed = typeof initialSchema === 'string' ? JSON.parse(initialSchema) : initialSchema;
        if (Array.isArray(parsed)) {
          return parsed.map((f, index) => ({
            id: f.id || `${Date.now()}-${index}-${Math.random()}`,
            type: f.field_type || f.type || 'text',
            label: f.label || 'Unnamed Field',
            required: !!f.required,
            options: f.options || []
          }));
        }
      } catch (err) {
        console.error('Error parsing initialSchema in EventFormDesigner:', err);
      }
    }
    return [];
  });
  const [jsonSchema, setJsonSchema] = useState('[]');
  const [copied, setCopied] = useState(false);

  // Synchronize and serialize changes to JSON in real-time
  useEffect(() => {
    // Compile nodes into structured JSON schema payload
    const compiled = fields.map(f => {
      const node = {
        field_name: f.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
        field_type: f.type,
        label: f.label || 'Unnamed Field',
        required: !!f.required
      };
      
      // If type has list options, add options array
      if (f.type === 'select' || f.type === 'checkbox') {
        node.options = f.options.filter(opt => opt.trim() !== '');
      }
      return node;
    });

    const json = JSON.stringify(compiled, null, 2);
    setJsonSchema(json);

    if (onSchemaChange) {
      onSchemaChange(json);
    }
  }, [fields]);

  const addField = (type) => {
    const defaultLabels = {
      text: 'Custom Text Field',
      select: 'Custom Dropdown Option',
      checkbox: 'Custom Multiple Choice',
      file: 'Custom Photo/File Upload'
    };

    const newField = {
      id: Date.now().toString(),
      type,
      label: defaultLabels[type],
      required: false,
      options: (type !== 'text' && type !== 'file') ? ['Choice 1', 'Choice 2'] : []
    };

    setFields(prev => [...prev, newField]);
  };

  const removeField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const updateFieldLabel = (id, newLabel) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label: newLabel } : f));
  };

  const toggleFieldRequired = (id) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, required: !f.required } : f));
  };

  const addOption = (fieldId) => {
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: [...f.options, `Choice ${f.options.length + 1}`]
        };
      }
      return f;
    }));
  };

  const updateOptionValue = (fieldId, optionIndex, newValue) => {
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) {
        const updatedOptions = [...f.options];
        updatedOptions[optionIndex] = newValue;
        return { ...f, options: updatedOptions };
      }
      return f;
    }));
  };

  const removeOption = (fieldId, optionIndex) => {
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: f.options.filter((_, idx) => idx !== optionIndex)
        };
      }
      return f;
    }));
  };

  const moveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const updated = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setFields(updated);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in">
      
      {/* ── Header ── */}
      <div>
        <h1 className="section-header">Dynamic Form Field Composer</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Create visual schemas. Serializes real-time structured JSON ready for database injections.
        </p>
      </div>

      {/* ── Designer Workbench ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COMPILER PANEL (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          
          {/* Node controls */}
          <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Add Field Elements:
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => addField('text')}
                className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white hover:border-brand-500/30 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2"
              >
                <Icons.Text className="w-3.5 h-3.5 text-brand-400" />
                Text Input
              </button>

              <button
                type="button"
                onClick={() => addField('select')}
                className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white hover:border-brand-500/30 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2"
              >
                <Icons.Dropdown className="w-3.5 h-3.5 text-brand-400" />
                Dropdown Choice
              </button>

              <button
                type="button"
                onClick={() => addField('checkbox')}
                className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white hover:border-brand-500/30 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2"
              >
                <Icons.Checkbox className="w-3.5 h-3.5 text-brand-400" />
                Checkbox Option
              </button>
              
              <button
                type="button"
                onClick={() => addField('file')}
                className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white hover:border-brand-500/30 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2"
              >
                <Icons.File className="w-3.5 h-3.5 text-brand-400" />
                Photo/File Upload
              </button>
            </div>
          </div>

          {/* Active Canvas Nodes */}
          <div className="flex-1 space-y-4 min-h-[380px] p-5 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
            {fields.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-500">
                  <Icons.Plus className="w-6 h-6 opacity-45" />
                </div>
                <div>
                  <h3 className="font-black text-slate-300 text-sm uppercase tracking-widest">
                    Designer Canvas Empty
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Select text input, dropdown, or checkbox options at the top to draft custom sign-up questions.
                  </p>
                </div>
              </div>
            ) : (
              fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="glass-card border border-white/[0.08] p-5 rounded-2xl bg-surface-900/60 flex flex-col gap-4 relative"
                >
                  {/* Card Node Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
                        {field.type === 'text' && <Icons.Text className="w-3 h-3 text-brand-400" />}
                        {field.type === 'select' && <Icons.Dropdown className="w-3 h-3 text-brand-400" />}
                        {field.type === 'checkbox' && <Icons.Checkbox className="w-3 h-3 text-brand-400" />}
                        {field.type === 'file' && <Icons.File className="w-3 h-3 text-brand-400" />}
                        {field.type} Field
                      </span>
                    </div>

                    {/* Order & Delete node buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveField(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.06] text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        title="Move Up"
                      >
                        <Icons.ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(idx, 'down')}
                        disabled={idx === fields.length - 1}
                        className="p-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.06] text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        title="Move Down"
                      >
                        <Icons.ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all ml-1.5"
                        title="Remove Field"
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Node Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Label Input */}
                    <div className="md:col-span-8 space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Field Question / Label:
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                        placeholder="e.g. T-Shirt Size, Seating Preference"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                      />
                    </div>

                    {/* Required switch */}
                    <div className="md:col-span-4 flex items-center justify-between p-3 rounded-xl border border-white/[0.05] bg-white/[0.01] h-[42px] cursor-pointer" onClick={() => toggleFieldRequired(field.id)}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Is Required?
                      </span>
                      <span className={`w-8 h-4 rounded-full p-0.5 transition-all duration-200 ${
                        field.required ? 'bg-brand-500 flex justify-end' : 'bg-white/20 flex justify-start'
                      }`}>
                        <span className="w-3 h-3 rounded-full bg-black shrink-0" />
                      </span>
                    </div>
                  </div>

                  {/* List Options Configuration (Select/Checkbox only) */}
                  {(field.type === 'select' || field.type === 'checkbox') && (
                    <div className="border-t border-white/[0.04] pt-4 space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Configure Selection Choices:
                        </span>
                        <button
                          type="button"
                          onClick={() => addOption(field.id)}
                          className="text-[10px] font-black uppercase text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-all"
                        >
                          <Icons.Plus className="w-3 h-3" />
                          Add Option
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {field.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 relative">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionValue(field.id, optIdx, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-slate-300 text-xs focus:border-brand-500/50 focus:outline-none pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(field.id, optIdx)}
                              className="absolute right-2 text-slate-500 hover:text-red-400 transition-all p-1"
                              title="Delete Choice"
                            >
                              <Icons.Trash className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

        </div>

        {/* RIGHT PREVIEW & JSON SCHEMA PANEL (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Live Preview Panel */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] flex flex-col h-[320px] overflow-hidden bg-white/[0.01]">
            <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-3 border-b border-white/[0.06] shrink-0">
              Live Schema Form Preview
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 text-left">
              {fields.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic mt-8">
                  No preview available. Add fields on the left canvas.
                </div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {field.label || 'Unnamed field'}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        disabled
                        placeholder={`Enter response...`}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-400 text-xs cursor-not-allowed outline-none"
                      />
                    )}

                    {field.type === 'select' && (
                      <select
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-400 text-xs cursor-not-allowed outline-none pr-8"
                      >
                        <option>Choose selection...</option>
                        {field.options.filter(o => o.trim() !== '').map(o => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <div className="flex flex-col gap-1.5 pl-1">
                        {field.options.filter(o => o.trim() !== '').map((o) => (
                          <label key={o} className="flex items-center gap-2 text-[11px] text-slate-400 select-none cursor-not-allowed">
                            <span className="w-3.5 h-3.5 rounded border border-white/20 bg-white/[0.01]" />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'file' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-slate-400 text-xs cursor-not-allowed select-none">
                        <Icons.File className="w-3.5 h-3.5 text-brand-500/60" />
                        <span>Upload photo/screenshot...</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* JSON Output Payload */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] flex flex-col flex-1 min-h-[260px] overflow-hidden bg-white/[0.01]">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.06] shrink-0">
              <h3 className="text-xs font-bold text-brand-300 uppercase tracking-widest flex items-center gap-1.5">
                <Icons.Code className="w-4 h-4 text-brand-400" />
                Raw JSON Payload
              </h3>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-white flex items-center gap-1 transition-all"
              >
                {copied ? (
                  <>
                    <Icons.Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Icons.Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <pre className="flex-1 font-mono text-[9px] text-slate-400 bg-black/35 rounded-xl p-4 overflow-y-auto mt-4 text-left leading-relaxed">
              {jsonSchema}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}

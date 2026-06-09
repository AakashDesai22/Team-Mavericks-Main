import { useState, useEffect } from 'react';

const Icons = {
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
};

export default function DynamicFeedbackFormRenderer({
  feedbackSchema = [],
  onSubmit,
  loading = false,
  submitButtonText = 'Submit Feedback'
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const initialData = {};
    const parsedSchema = typeof feedbackSchema === 'string' ? JSON.parse(feedbackSchema || '[]') : feedbackSchema;
    
    if (Array.isArray(parsedSchema)) {
      parsedSchema.forEach(field => {
        if (field.field_name) {
          if (field.field_type === 'checkbox') {
            initialData[field.field_name] = [];
          } else {
            initialData[field.field_name] = '';
          }
        }
      });
    }
    setFormData(initialData);
    setErrors({});
  }, [feedbackSchema]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    if (errors[fieldName]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleCheckboxChange = (fieldName, optionValue, isChecked) => {
    const currentValues = Array.isArray(formData[fieldName]) ? formData[fieldName] : [];
    let newValues;
    if (isChecked) {
      newValues = [...currentValues, optionValue];
    } else {
      newValues = currentValues.filter(val => val !== optionValue);
    }
    
    handleInputChange(fieldName, newValues);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    const newErrors = {};
    const schemaArray = typeof feedbackSchema === 'string' ? JSON.parse(feedbackSchema || '[]') : feedbackSchema;
    
    if (Array.isArray(schemaArray)) {
      schemaArray.forEach(field => {
        const fieldName = field.field_name;
        if (!fieldName) return;
        
        const value = formData[fieldName];
        const isRequired = !!field.required;

        if (isRequired) {
          if (field.field_type === 'checkbox') {
            if (!Array.isArray(value) || value.length === 0) {
              newErrors[fieldName] = `At least one selection is required.`;
            }
          } else if (value === undefined || value === null || String(value).trim() === '') {
            newErrors[fieldName] = `This response is required.`;
          }
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const parsedSchema = Array.isArray(feedbackSchema)
    ? feedbackSchema
    : (typeof feedbackSchema === 'string' ? (JSON.parse(feedbackSchema || '[]') || []) : []);

  if (parsedSchema.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs italic">
        No feedback survey was configured for this event by the administrator.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left animate-fade-in">
      {parsedSchema.map((field) => {
        const fieldName = field.field_name;
        if (!fieldName) return null;

        const isRequired = !!field.required;
        const error = errors[fieldName];

        return (
          <div key={fieldName} className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1">
                {field.label || fieldName}
                {isRequired && <span className="text-red-400 font-bold">*</span>}
              </label>
              {error && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">
                  {error}
                </span>
              )}
            </div>

            {/* rating field type (custom nice horizontal rating buttons if type is 'select' and options are just numbers, or standard select) */}
            {field.field_type === 'select' && field.options?.every(o => !isNaN(o)) ? (
              <div className="flex items-center gap-2">
                {field.options.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleInputChange(fieldName, val)}
                    className={`w-10 h-10 rounded-xl border text-xs font-black transition-all ${
                      formData[fieldName] === val
                        ? 'bg-brand-500 border-brand-500 text-black shadow-glow-sm'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            ) : field.field_type === 'select' ? (
              <select
                value={formData[fieldName] ?? ''}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-medium focus:border-brand-500/60 focus:outline-none cursor-pointer pr-10"
              >
                <option value="" disabled className="bg-surface-900 text-slate-500">
                  Choose response...
                </option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt} className="bg-surface-900 text-slate-200">
                    {opt}
                  </option>
                ))}
              </select>
            ) : null}

            {/* text / number input type */}
            {(field.field_type === 'text' || field.field_type === 'number') && (
              <input
                type={field.field_type}
                value={formData[fieldName] ?? ''}
                placeholder="Type response here..."
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none placeholder:text-slate-600"
              />
            )}

            {/* textarea input type */}
            {field.field_type === 'textarea' && (
              <textarea
                rows={3}
                value={formData[fieldName] ?? ''}
                placeholder="Type response here..."
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none placeholder:text-slate-600 resize-none"
              />
            )}

            {/* checkbox input type */}
            {field.field_type === 'checkbox' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                {(field.options || []).map((opt) => {
                  const isChecked = Array.isArray(formData[fieldName]) && formData[fieldName].includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-brand-500/5 border-brand-500/30 text-white'
                          : 'bg-white/[0.01] border-white/[0.06] text-slate-400 hover:bg-white/[0.03]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(fieldName, opt, e.target.checked)}
                        className="hidden"
                      />
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-brand-500 border-brand-500 text-black'
                          : 'border-white/20 bg-black/20'
                      }`}>
                        {isChecked && <Icons.Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className="text-xs font-semibold leading-none">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting Survey Responses...
          </>
        ) : (
          submitButtonText
        )}
      </button>
    </form>
  );
}

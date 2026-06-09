import { useState, useEffect } from 'react';
import api from '../api/client';

const Icons = {
  Lock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
};

/**
 * DynamicFormRenderer
 *
 * Props:
 *   - formSchema: Array of custom field schemas (e.g. [{field_name, field_type, label, required, options}])
 *   - user: Authenticated user object containing name, email, phone
 *   - onSubmit: Callback function triggered on valid form submission, receives the compiled formData object
 *   - submitButtonText: Customize the primary action button text
 *   - loading: Boolean to show loading spinner state
 */
export default function DynamicFormRenderer({
  formSchema = [],
  user = {},
  onSubmit,
  submitButtonText = 'Complete Registration',
  loading = false
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    setGuestName(user?.name || '');
    setGuestEmail(user?.email || '');
    setGuestPhone(user?.phone || '');
  }, [user]);

  // Initialize form state
  useEffect(() => {
    const initialData = {};
    const parsedSchema = typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema;
    
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
  }, [formSchema]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear field-specific error if valid
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

    // Validate inputs against schema
    const newErrors = {};

    // Validate constant guest fields if not authenticated
    if (!user?.id) {
      if (!guestName.trim()) {
        newErrors['guestName'] = 'Full Name is required.';
      }
      if (!guestEmail.trim()) {
        newErrors['guestEmail'] = 'Email Address is required.';
      } else if (!/\S+@\S+\.\S+/.test(guestEmail)) {
        newErrors['guestEmail'] = 'Invalid email address.';
      }
      if (!guestPhone.trim()) {
        newErrors['guestPhone'] = 'Mobile Number is required.';
      }
    }

    const schemaArray = typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema;
    
    if (Array.isArray(schemaArray)) {
      schemaArray.forEach(field => {
        const fieldName = field.field_name;
        if (!fieldName) return;
        
        const value = formData[fieldName];
        const isRequired = !!field.required;

        if (isRequired) {
          if (field.field_type === 'checkbox') {
            if (!Array.isArray(value) || value.length === 0) {
              newErrors[fieldName] = `${field.label || fieldName} requires at least one selection.`;
            }
          } else if (value === undefined || value === null || String(value).trim() === '') {
            newErrors[fieldName] = `${field.label || fieldName} is required.`;
          }
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorKey.startsWith('guest') ? `guest-field-${firstErrorKey}` : `field-container-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Pass dynamic answers up
    if (onSubmit) {
      onSubmit(formData, !user?.id ? { name: guestName, email: guestEmail, phone: guestPhone } : null);
    }
  };

  const parsedSchema = Array.isArray(formSchema)
    ? formSchema
    : (typeof formSchema === 'string' ? (JSON.parse(formSchema) || []) : []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-slate-100">
      
      {/* 1. CONSTANT ACCOUNT SEGMENT (LOCKED AT TOP) */}
      <div className="glass-card border border-white/[0.08] p-5 rounded-2xl relative overflow-hidden bg-white/[0.01]">
        <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
            {user?.id ? <Icons.Lock className="w-4 h-4" /> : <Icons.Info className="w-4 h-4" />}
          </span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">
              {user?.id ? 'Verified Account Credentials' : 'Participant Credentials'}
            </h4>
            <p className="text-[10px] text-slate-500">
              {user?.id ? 'Permanently linked to your Mavericks profile' : 'Used to auto-create your account upon registry'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Constant: Full Name */}
          <div className="space-y-1" id="guest-field-guestName">
            <div className="flex justify-between items-baseline">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Full Name {!user?.id && <span className="text-red-400 text-sm font-bold">*</span>}
              </label>
              {errors['guestName'] && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 animate-pulse">
                  {errors['guestName']}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                disabled={!!user?.id}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Aakash Desai"
                className={`w-full px-4 py-2.5 ${user?.id ? 'pl-10 select-none cursor-not-allowed text-slate-400' : 'pl-4 text-slate-200 focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/5'} rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-semibold outline-none transition-all`}
              />
              {user?.id && <Icons.Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />}
            </div>
          </div>

          {/* Constant: Email Address */}
          <div className="space-y-1" id="guest-field-guestEmail">
            <div className="flex justify-between items-baseline">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address {!user?.id && <span className="text-red-400 text-sm font-bold">*</span>}
              </label>
              {errors['guestEmail'] && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 animate-pulse">
                  {errors['guestEmail']}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="email"
                disabled={!!user?.id}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 ${user?.id ? 'pl-10 select-none cursor-not-allowed text-slate-400' : 'pl-4 text-slate-200 focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/5'} rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-semibold outline-none transition-all`}
              />
              {user?.id && <Icons.Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />}
            </div>
          </div>

          {/* Constant: Mobile Number */}
          <div className="space-y-1" id="guest-field-guestPhone">
            <div className="flex justify-between items-baseline">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Mobile Number {!user?.id && <span className="text-red-400 text-sm font-bold">*</span>}
              </label>
              {errors['guestPhone'] && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 animate-pulse">
                  {errors['guestPhone']}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                disabled={!!user?.id}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className={`w-full px-4 py-2.5 ${user?.id ? 'pl-10 select-none cursor-not-allowed text-slate-400' : 'pl-4 text-slate-200 focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/5'} rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-semibold outline-none transition-all`}
              />
              {user?.id && <Icons.Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC INPUT WRAPPER */}
      {parsedSchema.length > 0 && (
        <div className="space-y-5">
          {parsedSchema.map((field) => {
            const fieldName = field.field_name;
            if (!fieldName) return null;

            const isRequired = !!field.required;
            const error = errors[fieldName];

            return (
              <div
                key={fieldName}
                id={`field-container-${fieldName}`}
                className={`space-y-2 p-1 transition-all duration-200 ${
                  error ? 'bg-red-500/5 rounded-xl border border-red-500/10 p-4' : ''
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-semibold tracking-wide text-slate-300 flex items-center gap-1">
                    {field.label || fieldName}
                    {isRequired && (
                      <span className="text-red-400 text-sm font-bold" title="Required">*</span>
                    )}
                  </label>
                  {error && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 animate-pulse">
                      {error}
                    </span>
                  )}
                </div>

                {/* TEXT INPUT TYPE */}
                {(field.field_type === 'text' || field.field_type === 'number') && (
                  <input
                    type={field.field_type}
                    value={formData[fieldName] ?? ''}
                    placeholder={`Enter ${field.label || fieldName}...`}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-xs font-medium focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all placeholder:text-slate-500"
                  />
                )}

                {/* TEXTAREA INPUT TYPE */}
                {field.field_type === 'textarea' && (
                  <textarea
                    rows={3}
                    value={formData[fieldName] ?? ''}
                    placeholder={`Enter ${field.label || fieldName}...`}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-100 text-xs font-medium focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all placeholder:text-slate-500 resize-y"
                  />
                )}

                {/* SELECT DROPDOWN TYPE */}
                {field.field_type === 'select' && (
                  <select
                    value={formData[fieldName] ?? ''}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-medium focus:border-brand-500/60 focus:outline-none cursor-pointer pr-10"
                  >
                    <option value="" disabled className="bg-surface-900 text-slate-500">
                      Select option...
                    </option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt} className="bg-surface-900 text-slate-200">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* CHECKBOX TICK BLOCKS TYPE */}
                {field.field_type === 'checkbox' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {(field.options || []).map((opt) => {
                      const isChecked = Array.isArray(formData[fieldName]) && formData[fieldName].includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-brand-500/5 border-brand-500/30 text-white'
                              : 'bg-white/[0.01] border-white/[0.06] text-slate-400 hover:bg-white/[0.03] hover:border-white/[0.1]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(fieldName, opt, e.target.checked)}
                            className="hidden"
                          />
                          <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-brand-500 border-brand-500 text-black'
                              : 'border-white/20 bg-black/20'
                          }`}>
                            {isChecked && <Icons.Check className="w-3 h-3" />}
                          </span>
                          <span className="text-xs font-semibold leading-none">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* FILE UPLOAD TYPE */}
                {field.field_type === 'file' && (
                  <FileUploader
                    fieldName={fieldName}
                    value={formData[fieldName]}
                    onChange={(val) => handleInputChange(fieldName, val)}
                    required={isRequired}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INFO FOOTER & SUBMIT BUTTON */}
      <div className="pt-4 space-y-4">
        <div className="flex gap-2.5 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-[10px] text-slate-400 leading-normal">
          <Icons.Info className="w-4 h-4 shrink-0 text-brand-400 mt-0.5" />
          <span>
            By proceeding, you verify that your dynamic details are authentic. Double registrations for this event are blocked at database index layers. Lock credentials can only be edited via profile preferences.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing verification...
            </>
          ) : (
            submitButtonText
          )}
        </button>
      </div>
    </form>
  );
}

export function FileUploader({ fieldName, value, onChange, required }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      setError('File is too large. Maximum size is 8MB.');
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.upload('/upload/registration-file', formData);
      if (res.ok && res.data?.success) {
        onChange(res.data.path);
      } else {
        setError(res.data?.error || 'Failed to upload file.');
      }
    } catch (err) {
      setError('Network error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  const isImage = value && /\.(jpg|jpeg|png|webp)($|\?)/i.test(value);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {isImage ? (
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40 flex items-center justify-center">
              <img
                src={value}
                alt="Uploaded proof"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg border border-white/10 shrink-0 bg-black/40 flex flex-col items-center justify-center text-slate-500">
              <svg className="w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-[10px] mt-1 text-slate-400">PDF Document</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-xs font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Upload Completed
            </p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {value.split('/').pop()}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-brand-400 hover:underline mt-1 inline-block"
            >
              View Document
            </a>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Remove
          </button>
        </div>
      ) : (
        <div className="relative">
          <label className="flex flex-col items-center justify-center w-full min-h-[120px] rounded-xl border border-dashed border-white/20 bg-white/[0.01] hover:bg-white/[0.03] hover:border-brand-500/40 transition-all cursor-pointer p-4 text-center">
            {uploading ? (
              <div className="space-y-2 flex flex-col items-center">
                <svg className="animate-spin h-6 w-6 text-brand-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-slate-400">Uploading verification media...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <svg className="w-8 h-8 text-brand-400 mx-auto opacity-70 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-xs font-semibold text-slate-300">
                  Click to select photo or document
                </p>
                <p className="text-[10px] text-slate-500">
                  JPG, PNG, WebP, or PDF up to 8MB
                </p>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </label>
        </div>
      )}
      {error && (
        <p className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wide">
          {error}
        </p>
      )}
    </div>
  );
}

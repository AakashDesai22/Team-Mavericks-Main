import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Registration Page
 * ============================================================================
 *
 * Public self-signup form for participants.  On success, displays a
 * prominent victory card with their BODH2026-XXXXXX registration ID
 * and temporary password.
 */

const ACADEMIC_YEARS = ['FY', 'SY', 'TY', 'Final', 'PG-1', 'PG-2', 'PhD'];

const BRANCHES = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
  'Data Science', 'AI & ML', 'Humanities', 'Commerce', 'Other',
];

export default function Register() {
  // ── Form State ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', email: '', phone: '', branch: '', academic_year: '',
  });
  const [errors, setErrors]           = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult]           = useState(null); // Success payload.

  // ── Field Change Handler ────────────────────────────────────────────
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Client-Side Validation ──────────────────────────────────────────
  const validate = () => {
    const errs = [];
    if (!form.name.trim())          errs.push('Name is required.');
    if (!form.email.trim())         errs.push('Email is required.');
    if (!form.phone.trim())         errs.push('Phone number is required.');
    if (!form.branch)               errs.push('Branch is required.');
    if (!form.academic_year)        errs.push('Academic year is required.');
    return errs;
  };

  // ── Submit Handler ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    const { data, ok } = await api.post('/register', {
      name:          form.name.trim(),
      email:         form.email.trim(),
      phone:         form.phone.trim(),
      branch:        form.branch,
      academic_year: form.academic_year,
    });

    setIsSubmitting(false);

    if (ok && data?.success) {
      setResult(data);
    } else {
      setErrors(data?.details || [data?.error || 'Registration failed.']);
    }
  };

  // =====================================================================
  // SUCCESS VIEW — Victory card with registration ID
  // =====================================================================
  if (result) {
    return (
      <div className="min-h-screen bg-surface-900 bg-mesh bg-dots flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="glass-card p-8 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                            bg-emerald-500/15 border-2 border-emerald-500/30 mb-6">
              <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Registration Successful!
            </h1>
            <p className="text-slate-400 text-sm mb-8">
              Welcome to Bodhantra Event OS. Save your credentials below.
            </p>

            {/* ── Credentials Card ──────────────────────────────────── */}
            <div className="bg-gradient-to-br from-brand-950/80 to-violet-950/80
                            border border-brand-500/20 rounded-2xl p-6 mb-6
                            shadow-glow-sm text-left space-y-4">
              {/* Registration ID */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-1">
                  Your Registration ID
                </p>
                <p className="text-2xl font-mono font-bold text-white tracking-wider"
                   id="registration-id-display">
                  {result.registration_id}
                </p>
              </div>

              <div className="h-px bg-white/10" />

              {/* Temporary Password */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-1">
                  Temporary Password
                </p>
                <p className="text-lg font-mono font-bold text-amber-300 tracking-wider
                              bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20"
                   id="temp-password-display">
                  {result.temporary_password}
                </p>
              </div>

              <div className="h-px bg-white/10" />

              {/* Email */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Email</span>
                <span className="text-sm text-slate-300 font-medium">{result.user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Role</span>
                <span className="badge-role">{result.user?.role_tier}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3
                            text-amber-400 text-xs font-medium mb-6 text-left">
              <strong>⚠️ Important:</strong> Save your registration ID and temporary password
              now. The password will not be shown again.
            </div>

            {/* CTA */}
            <Link to="/login" className="btn-primary w-full">
              Proceed to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================================
  // REGISTRATION FORM VIEW
  // =====================================================================
  return (
    <div className="min-h-screen bg-surface-900 bg-mesh bg-dots flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-slide-up">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-gradient-to-br from-emerald-500 to-teal-500
                          shadow-glow-emerald mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Join Bodhantra
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create your participant account
          </p>
        </div>

        {/* ── Form Card ────────────────────────────────────────────── */}
        <div className="glass-card p-8">
          {/* Error List */}
          {errors.length > 0 && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20
                            text-rose-400 text-sm animate-fade-in" role="alert">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-400
                                                    uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input id="reg-name" name="name" type="text" value={form.name}
                     onChange={handleChange} placeholder="e.g. Aakash Sharma"
                     className="input-field" disabled={isSubmitting} required />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-400
                                                     uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input id="reg-email" name="email" type="email" value={form.email}
                     onChange={handleChange} placeholder="you@college.edu"
                     className="input-field" disabled={isSubmitting} required />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-400
                                                     uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input id="reg-phone" name="phone" type="tel" value={form.phone}
                     onChange={handleChange} placeholder="+91 98765 43210"
                     className="input-field" disabled={isSubmitting} required />
            </div>

            {/* Branch + Year (side by side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-branch" className="block text-xs font-semibold text-slate-400
                                                        uppercase tracking-wider mb-2">
                  Branch / Dept
                </label>
                <select id="reg-branch" name="branch" value={form.branch}
                        onChange={handleChange} className="input-field"
                        disabled={isSubmitting} required>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="reg-year" className="block text-xs font-semibold text-slate-400
                                                      uppercase tracking-wider mb-2">
                  Academic Year
                </label>
                <select id="reg-year" name="academic_year" value={form.academic_year}
                        onChange={handleChange} className="input-field"
                        disabled={isSubmitting} required>
                  <option value="">Select year</option>
                  {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting}
                    className="btn-primary w-full" id="register-submit-button">
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                            className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          fill="currentColor" className="opacity-75" />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300
                                          font-semibold transition-colors duration-200">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

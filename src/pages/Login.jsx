import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Login Page
 * ============================================================================
 *
 * High-fidelity secure entry portal with:
 *   • Email + password fields with validation feedback.
 *   • Submission state tracking (loading spinner on button).
 *   • Error banner with server-side message display.
 *   • Redirect-back support (returns to the intended URL after login).
 */

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  // Where to redirect after successful login.
  const from = location.state?.from?.pathname || '/dashboard';

  // ── Form State ──────────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Submit Handler ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    const result = await login(email.trim(), password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 bg-mesh bg-dots flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* ── Logo Block ───────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-gradient-to-br from-brand-500 to-violet-500
                          shadow-glow mb-4">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to Bodhantra Event OS
          </p>
        </div>

        {/* ── Login Card ───────────────────────────────────────────── */}
        <div className="glass-card p-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20
                            text-rose-400 text-sm font-medium animate-fade-in"
                 id="login-error-banner"
                 role="alert">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400
                                                       uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
                autoFocus
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400
                                                          uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-field pr-12"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-500 hover:text-slate-300
                             transition-colors duration-200 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
              id="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                            className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          fill="currentColor" className="opacity-75" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* ── Register Link ──────────────────────────────────────── */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300
                                              font-semibold transition-colors duration-200">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Bodhantra Event OS &middot; Secured by Three-Tier RBAC
        </p>
      </div>
    </div>
  );
}

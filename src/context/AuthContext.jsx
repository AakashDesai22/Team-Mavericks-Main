import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStorage,
} from '../api/client';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Authentication Context Provider
 * ============================================================================
 *
 * Global React context managing the client-side session lifecycle:
 *   • Auto-login on mount (checks stored token against /auth/me).
 *   • login(email, password) → issues token, stores user.
 *   • logout() → invalidates server session, clears client storage.
 *   • refreshSession() → re-fetches user profile from the server.
 *
 * Provided state:
 *   { user, token, roleTier, isAuthenticated, isLoading }
 */

const AuthContext = createContext(null);

/**
 * Hook to consume the auth context.  Must be called within <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used within an <AuthProvider>.');
  }
  return context;
}

/**
 * Provider component — wraps the entire application.
 */
export function AuthProvider({ children }) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values.
  const isAuthenticated = !!user && !!token;
  const roleTier        = user?.role_tier || null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Persist credentials to both React state and localStorage. */
  const persistSession = useCallback((userData, rawToken) => {
    setUser(userData);
    setToken(rawToken);
    setStoredToken(rawToken);
    setStoredUser(userData);
  }, []);

  /** Wipe credentials from both React state and localStorage. */
  const destroySession = useCallback(() => {
    setUser(null);
    setToken(null);
    clearStorage();
  }, []);

  // -------------------------------------------------------------------------
  // Auto-Login on Mount
  //
  // If a token exists in localStorage from a previous session, validate it
  // against the server's /auth/me endpoint.  If valid, restore the session.
  // If expired / invalid, silently wipe and show the login screen.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function verifyStoredSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // Optimistically restore cached user data while we verify.
      const cachedUser = getStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
        setToken(storedToken);
      }

      // Verify against the server.
      const { data, ok } = await api.get('/auth/me');

      if (cancelled) return;

      if (ok && data?.success && data?.user) {
        persistSession(data.user, storedToken);
      } else {
        // Token is invalid or expired — clean up.
        destroySession();
      }

      setIsLoading(false);
    }

    verifyStoredSession();

    return () => { cancelled = true; };
  }, [persistSession, destroySession]);

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * Authenticate with email + password.
   * @returns {{ success: boolean, error?: string }}
   */
  const login = useCallback(async (email, password) => {
    const { data, ok } = await api.post('/auth/login', { email, password });

    if (ok && data?.success && data?.token && data?.user) {
      persistSession(data.user, data.token);
      return { success: true };
    }

    return {
      success: false,
      error: data?.error || 'Login failed. Please check your credentials.',
    };
  }, [persistSession]);

  /**
   * Invalidate the session on both client and server.
   */
  const logout = useCallback(async () => {
    // Fire-and-forget — don't block the UI on server response.
    api.post('/auth/logout').catch(() => {});
    destroySession();
  }, [destroySession]);

  /**
   * Re-fetch the user profile from the server without re-authenticating.
   * Useful after profile edits or role changes.
   */
  const refreshSession = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;

    const { data, ok } = await api.get('/auth/me');

    if (ok && data?.success && data?.user) {
      persistSession(data.user, currentToken);
    }
  }, [persistSession]);

  // -------------------------------------------------------------------------
  // Context Value
  // -------------------------------------------------------------------------
  const value = {
    user,
    token,
    roleTier,
    isAuthenticated,
    isLoading,

    login,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

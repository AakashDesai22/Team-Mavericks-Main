/**
 * ============================================================================
 * BODHANTRA EVENT OS — Central API Client
 * ============================================================================
 *
 * Unified network abstraction layer.  All API interactions flow through
 * this module — no component ever calls fetch() directly.
 *
 * Features:
 *   • Automatic Bearer token injection from localStorage.
 *   • Global 401 interception → token wipe + redirect to /login.
 *   • Consistent JSON error parsing.
 *   • Multipart/form-data support for file uploads.
 *
 * Usage:
 *   import api from '@/api/client';
 *   const { data } = await api.get('/events');
 *   const { data } = await api.post('/auth/login', { email, password });
 *   const { data } = await api.upload('/upload/voucher', formData);
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Base URL for all API requests.  In dev, Vite proxies /api → PHP server. */
const API_BASE = '/api';

/** Key used to persist the session token in localStorage. */
const TOKEN_KEY = 'bodhantra_token';

/** Key used to persist the cached user object. */
const USER_KEY = 'bodhantra_user';


// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.)
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Silently fail.
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Silently fail.
  }
}


// ---------------------------------------------------------------------------
// Core Request Engine
// ---------------------------------------------------------------------------

/**
 * Execute an API request.
 *
 * @param {string} endpoint  Path after /api (e.g., '/events', '/auth/login').
 * @param {object} options   Fetch options override.
 * @returns {Promise<{data: object, ok: boolean, status: number}>}
 */
async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const url   = `${API_BASE}${endpoint}`;

  // Build headers — don't set Content-Type for FormData (browser sets boundary).
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // -----------------------------------------------------------------------
    // Global 401 Interception
    // If the server returns 401 (token expired / invalid), immediately wipe
    // all stored credentials and redirect to login.
    // -----------------------------------------------------------------------
    if (response.status === 401) {
      clearStorage();
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
        // Use window.location instead of router navigation to guarantee a
        // clean state reset (all React state is destroyed on full reload).
        window.location.href = '/login';
      }
      return { data: null, ok: false, status: 401 };
    }

    // Parse JSON response body.
    let data = {};
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    // Network failure (offline, DNS, CORS block, etc.)
    console.error('[BodhantraOS][API]', endpoint, error);
    return {
      data: {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      },
      ok: false,
      status: 0,
    };
  }
}


// ---------------------------------------------------------------------------
// Public API Methods
// ---------------------------------------------------------------------------

const api = {
  /**
   * GET request.
   * @param {string} endpoint  e.g., '/events', '/auth/me'
   * @param {object} [params]  Query string parameters.
   */
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return request(url, { method: 'GET' });
  },

  /**
   * POST request with JSON body.
   */
  async post(endpoint, body = {}) {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * PUT request with JSON body.
   */
  async put(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * PATCH request with JSON body.
   */
  async patch(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request.
   */
  async del(endpoint) {
    return request(endpoint, { method: 'DELETE' });
  },

  /**
   * POST request with FormData (multipart file upload).
   * Content-Type is NOT set manually — the browser auto-generates the
   * multipart boundary header.
   */
  async upload(endpoint, formData) {
    return request(endpoint, {
      method: 'POST',
      body: formData,
    });
  },
};

export default api;

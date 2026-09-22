import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  mfaEnabled?: boolean;
  employee?: {
    id: string;
    userId: string;
    name: string;
    departmentId?: string;
    department?: { id: string; name: string };
    designation?: string;
    contactNumber?: string;
    profilePicture?: string;
    employmentStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
    dateOfJoining: string;
    managerId?: string;
    manager?: { id: string; name: string };
  };
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingMfaToken: string | null;
  loading: boolean;
  setSession: (accessToken: string, refreshToken: string, user: UserProfile) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresMfa?: boolean }>;
  verifyMfaLogin: (otp: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadProfile: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
}

export const API_URL = 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('pulse_access_token'),
  refreshToken: localStorage.getItem('pulse_refresh_token'),
  pendingMfaToken: null,
  loading: true,

  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem('pulse_access_token', accessToken);
    localStorage.setItem('pulse_refresh_token', refreshToken);
    set({ accessToken, refreshToken, user, pendingMfaToken: null, loading: false });
  },

  clearSession: () => {
    localStorage.removeItem('pulse_access_token');
    localStorage.removeItem('pulse_refresh_token');
    set({ accessToken: null, refreshToken: null, user: null, pendingMfaToken: null, loading: false });
  },

  setLoading: (loading) => set({ loading }),

  apiFetch: async (path: string, options: RequestInit = {}) => {
    const { accessToken, refreshSession } = get();
    const headers = new Headers(options.headers || {});
    
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    // Handle token expiration (401)
    if (response.status === 401 && get().refreshToken) {
      const refreshed = await refreshSession();
      if (refreshed) {
        // Retry with new token
        const newAccessToken = get().accessToken;
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `API error: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  refreshSession: async () => {
    const { refreshToken, clearSession } = get();
    if (!refreshToken) {
      clearSession();
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh expired');
      }

      const data = await response.json();
      localStorage.setItem('pulse_access_token', data.accessToken);
      localStorage.setItem('pulse_refresh_token', data.refreshToken);
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch (err) {
      clearSession();
      return false;
    }
  },

  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.requiresMfa) {
        set({ pendingMfaToken: data.mfaToken });
        return { success: false, requiresMfa: true };
      }

      get().setSession(data.accessToken, data.refreshToken, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  verifyMfaLogin: async (otp) => {
    const pendingMfaToken = get().pendingMfaToken;
    if (!pendingMfaToken) {
      return { success: false, error: 'No MFA login is pending' };
    }

    try {
      const response = await fetch(`${API_URL}/auth/login/mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken: pendingMfaToken, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      get().setSession(data.accessToken, data.refreshToken, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  signup: async (signupData) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      get().setSession(data.accessToken, data.refreshToken, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    const { refreshToken, clearSession } = get();
    try {
      if (refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.error('Logout API failed:', e);
    } finally {
      clearSession();
    }
  },

  loadProfile: async () => {
    const { accessToken, apiFetch, clearSession } = get();
    if (!accessToken) {
      set({ user: null, loading: false });
      return;
    }

    try {
      set({ loading: true });
      const profile = await apiFetch('/auth/me');
      set({ user: profile, loading: false });
    } catch (err) {
      console.error('Failed to load profile:', err);
      clearSession();
    }
  },
}));

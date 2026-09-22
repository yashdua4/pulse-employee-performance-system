import { create } from 'zustand';
import { API_URL, useAuthStore } from './authStore.js';

export interface SecuritySession {
  id: string;
  deviceName?: string | null;
  browser?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastActivity: string;
  createdAt: string;
  revoked: boolean;
  isCurrent?: boolean;
}

interface SecurityState {
  summary: any | null;
  sessions: SecuritySession[];
  adminDashboard: any | null;
  securityStatus: Record<string, boolean> | null;
  permissionMatrix: Array<{ permission: string; admin: boolean; manager: boolean; employee: boolean }>;
  suspiciousActivities: any[];
  dataAccessLogs: any[];
  mfaSetup: { qrCodeDataUrl: string; manualEntryKey: string } | null;
  loading: boolean;
  fetchSummary: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  revokeSession: (id: string) => Promise<{ success: boolean; revokedCurrentSession?: boolean; error?: string }>;
  logoutAllSessions: () => Promise<{ success: boolean; error?: string }>;
  beginMfaSetup: () => Promise<{ success: boolean; error?: string }>;
  verifyMfaSetup: (token: string) => Promise<{ success: boolean; error?: string }>;
  disableMfa: (token: string) => Promise<{ success: boolean; error?: string }>;
  fetchAdminDashboard: () => Promise<void>;
  fetchSecurityStatus: () => Promise<void>;
  fetchPermissionMatrix: () => Promise<void>;
  fetchSuspiciousActivities: () => Promise<void>;
  fetchDataAccessLogs: (search?: string) => Promise<void>;
  exportReport: (type: 'audit' | 'suspicious' | 'sessions', format: 'csv' | 'excel' | 'pdf') => Promise<{ success: boolean; error?: string }>;
}

const getAuthHeaders = () => {
  const { accessToken } = useAuthStore.getState();
  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

export const useSecurityStore = create<SecurityState>((set) => ({
  summary: null,
  sessions: [],
  adminDashboard: null,
  securityStatus: null,
  permissionMatrix: [],
  suspiciousActivities: [],
  dataAccessLogs: [],
  mfaSetup: null,
  loading: false,

  fetchSummary: async () => {
    const { apiFetch } = useAuthStore.getState();
    const summary = await apiFetch('/security/summary');
    set({ summary });
  },

  fetchSessions: async () => {
    const { apiFetch } = useAuthStore.getState();
    const sessions = await apiFetch('/sessions');
    set({ sessions });
  },

  revokeSession: async (id) => {
    const { apiFetch, clearSession } = useAuthStore.getState();
    try {
      const response = await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
      await useSecurityStore.getState().fetchSessions();
      if (response.revokedCurrentSession) {
        clearSession();
      }
      return { success: true, revokedCurrentSession: response.revokedCurrentSession };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  logoutAllSessions: async () => {
    const { apiFetch, clearSession } = useAuthStore.getState();
    try {
      await apiFetch('/sessions/logout-all', { method: 'POST' });
      clearSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  beginMfaSetup: async () => {
    const { apiFetch } = useAuthStore.getState();
    try {
      const data = await apiFetch('/security/mfa/setup', { method: 'POST' });
      set({ mfaSetup: data });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  verifyMfaSetup: async (token) => {
    const { apiFetch, loadProfile } = useAuthStore.getState();
    try {
      await apiFetch('/security/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      await loadProfile();
      set({ mfaSetup: null });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  disableMfa: async (token) => {
    const { apiFetch, loadProfile } = useAuthStore.getState();
    try {
      await apiFetch('/security/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      await loadProfile();
      set({ mfaSetup: null });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  fetchAdminDashboard: async () => {
    const { apiFetch } = useAuthStore.getState();
    const [dashboard, suspicious] = await Promise.all([
      apiFetch('/security/dashboard'),
      apiFetch('/security/suspicious-activities?limit=10'),
    ]);
    set({
      adminDashboard: dashboard,
      suspiciousActivities: suspicious.items || [],
    });
  },

  fetchSecurityStatus: async () => {
    const { apiFetch } = useAuthStore.getState();
    const securityStatus = await apiFetch('/security/status');
    set({ securityStatus });
  },

  fetchPermissionMatrix: async () => {
    const { apiFetch } = useAuthStore.getState();
    const permissionMatrix = await apiFetch('/security/permissions');
    set({ permissionMatrix });
  },

  fetchSuspiciousActivities: async () => {
    const { apiFetch } = useAuthStore.getState();
    const data = await apiFetch('/security/suspicious-activities?limit=25');
    set({ suspiciousActivities: data.items || [] });
  },

  fetchDataAccessLogs: async (search) => {
    const { apiFetch } = useAuthStore.getState();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await apiFetch(`/security/data-access-logs${query}`);
    set({ dataAccessLogs: data.items || [] });
  },

  exportReport: async (type, format) => {
    try {
      const response = await fetch(`${API_URL}/security/export?type=${type}&format=${format}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pulse-${type}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
}));

import { create } from 'zustand';
import { useAuthStore } from './authStore.js';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    const { user, apiFetch } = useAuthStore.getState();
    if (!user) return;

    try {
      set({ loading: true });
      const data = await apiFetch('/notifications');
      const unreadCount = data.filter((n: NotificationItem) => !n.isRead).length;
      set({ notifications: data, unreadCount, loading: false });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    const { apiFetch } = useAuthStore.getState();
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      
      const updatedNotifications = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;
      
      set({ notifications: updatedNotifications, unreadCount });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },

  markAllRead: async () => {
    const { apiFetch } = useAuthStore.getState();
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      
      const updatedNotifications = get().notifications.map((n) => ({ ...n, isRead: true }));
      set({ notifications: updatedNotifications, unreadCount: 0 });
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  },
}));

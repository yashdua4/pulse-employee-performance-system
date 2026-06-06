import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CalendarRange, 
  Award, 
  LogOut, 
  Activity,
  PlaneTakeoff,
  BarChart3,
  ShieldAlert,
  Bell,
  Check
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';

export const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  const links = [
    { to: '/', name: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', name: 'Projects', icon: FolderKanban },
    { to: '/attendance', name: 'Attendance', icon: CalendarRange },
    { to: '/performance', name: 'Performance', icon: Award },
    { to: '/leaves', name: 'Leaves', icon: PlaneTakeoff },
  ];

  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    links.splice(1, 0, { to: '/employees', name: 'Employees', icon: Users });
    links.push({ to: '/reports', name: 'Reports', icon: BarChart3 });
  }

  if (user.role === 'ADMIN') {
    links.push({ to: '/audit-logs', name: 'Audit Logs', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 relative z-30">
      
      {/* Top Header */}
      <div className="p-6">
        <div className="flex items-center justify-between text-violet-400 font-bold text-2xl tracking-wider select-none">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 animate-pulse" />
            <span>PULSE</span>
          </div>

          {/* Live Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-violet-600 text-[9px] font-black text-white rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer panel */}
            {showNotifications && (
              <div className="absolute left-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 space-y-3 z-50 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-200">System Notifications</span>
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-2.5 rounded-xl border transition-all flex justify-between items-start gap-2 ${
                        n.isRead 
                          ? 'bg-slate-950/40 border-slate-900/60 text-slate-500' 
                          : 'bg-violet-950/10 border-violet-900/30 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{n.title}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 cursor-pointer"
                          title="Mark read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-center text-slate-500 py-6 italic">No notifications found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="mt-10 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-200 group font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-sm">{link.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{user.employee?.name || user.email}</p>
            <p className="text-xs text-slate-400 truncate">{user.employee?.designation || user.role}</p>
            <span className="inline-block mt-1 text-[9px] px-2 py-0.5 font-bold uppercase rounded bg-violet-950 text-violet-400 border border-violet-800">
              {user.role}
            </span>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-950/30 hover:border-rose-900 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 font-semibold text-xs transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

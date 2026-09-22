import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
} from 'lucide-react';
import { useSecurityStore } from '../store/securityStore.js';

const chartTone = ['#ef4444', '#8b5cf6', '#0ea5e9'];

const MiniBarChart: React.FC<{ title: string; rows: Array<{ day: string; count: number }>; color: string }> = ({
  title,
  rows,
  color,
}) => {
  const max = Math.max(...rows.map((item) => item.count), 1);

  return (
    <div className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
      <h3 className="text-sm font-bold text-slate-100 mb-5">{title}</h3>
      <div className="flex items-end gap-3 h-44">
        {rows.map((item) => (
          <div key={item.day} className="flex-1 flex flex-col justify-end items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold">{item.count}</span>
            <div
              className="w-full rounded-t-2xl min-h-[12px] transition-all duration-300"
              style={{
                height: `${(item.count / max) * 100}%`,
                background: color,
              }}
            />
            <span className="text-[10px] text-slate-500">{item.day.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SecurityDashboard: React.FC = () => {
  const {
    adminDashboard,
    suspiciousActivities,
    dataAccessLogs,
    fetchAdminDashboard,
    fetchDataAccessLogs,
    exportReport,
  } = useSecurityStore();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDashboard().catch(() => setError('Failed to load security dashboard'));
    fetchDataAccessLogs().catch(() => setError('Failed to load data access logs'));
  }, []);

  const cards = useMemo(() => adminDashboard?.cards || {}, [adminDashboard]);

  const suspiciousTone = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { icon: ShieldX, className: 'text-rose-300 border-rose-900/40 bg-rose-950/20' };
      case 'HIGH':
        return { icon: AlertTriangle, className: 'text-amber-300 border-amber-900/40 bg-amber-950/20' };
      case 'MEDIUM':
        return { icon: ShieldAlert, className: 'text-sky-300 border-sky-900/40 bg-sky-950/20' };
      default:
        return { icon: ShieldQuestion, className: 'text-emerald-300 border-emerald-900/40 bg-emerald-950/20' };
    }
  };

  const exportOptions: Array<{ type: 'audit' | 'suspicious' | 'sessions'; label: string }> = [
    { type: 'audit', label: 'Audit Logs' },
    { type: 'suspicious', label: 'Suspicious Activity' },
    { type: 'sessions', label: 'Session Logs' },
  ];

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      <header className="mb-8 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span>Security Operations</span>
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </h1>
          <p className="text-slate-400 mt-1">Admin-only analytics for login abuse, sessions, audit volume, and access monitoring.</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {[
          ['Failed Login Attempts Today', cards.failedLoginAttemptsToday, 'text-rose-400'],
          ['Locked Accounts', cards.lockedAccounts, 'text-amber-400'],
          ['Active User Sessions', cards.activeSessions, 'text-sky-400'],
          ['Total Audit Events', cards.totalAuditEvents, 'text-violet-400'],
          ['Suspicious Activities', cards.suspiciousActivities, 'text-rose-300'],
          ['Users With MFA Enabled', cards.usersWithMfaEnabled, 'text-emerald-400'],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">{label}</span>
            <p className={`text-3xl font-black mt-3 ${tone}`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <MiniBarChart
          title="Failed Logins By Day"
          rows={adminDashboard?.charts?.failedLoginsByDay || []}
          color={chartTone[0]}
        />
        <MiniBarChart
          title="Audit Events Timeline"
          rows={adminDashboard?.charts?.auditEventsTimeline || []}
          color={chartTone[1]}
        />
        <MiniBarChart
          title="Session Activity"
          rows={adminDashboard?.charts?.sessionActivity || []}
          color={chartTone[2]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8">
        <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Suspicious Activity Feed</h2>
              <p className="text-sm text-slate-400 mt-1">Auto-detected security signals ranked by severity.</p>
            </div>
          </div>

          <div className="space-y-4">
            {suspiciousActivities.map((activity) => {
              const tone = suspiciousTone(activity.severity);
              const Icon = tone.icon;

              return (
                <div key={activity.id} className={`p-4 rounded-2xl border ${tone.className}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-100">{activity.type}</p>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                          {activity.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-2">{activity.description}</p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {activity.user?.employee?.name || activity.user?.email || 'Unknown actor'} · {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {suspiciousActivities.length === 0 && (
              <p className="text-sm text-slate-500">No suspicious activities detected in the current feed.</p>
            )}
          </div>
        </section>

        <div className="space-y-8">
          <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Security Report Export</h2>
                <p className="text-sm text-slate-400 mt-1">Download operational evidence in CSV, Excel, or PDF.</p>
              </div>
              <Download className="h-5 w-5 text-violet-400" />
            </div>

            <div className="space-y-4">
              {exportOptions.map((item) => (
                <div key={item.type} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-semibold text-slate-200">{item.label}</p>
                    <div className="flex gap-2">
                      {(['csv', 'excel', 'pdf'] as const).map((format) => (
                        <button
                          key={format}
                          onClick={async () => {
                            const result = await exportReport(item.type, format);
                            if (!result.success) {
                              setError(result.error || 'Export failed');
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-violet-500/40 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Data Access Monitoring</h2>
                <p className="text-sm text-slate-400 mt-1">Search employee, leave, and review views across the platform.</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or resource id"
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm outline-none"
              />
              <button
                onClick={() => {
                  fetchDataAccessLogs(search).catch(() => setError('Failed to search access logs'));
                }}
                className="px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="space-y-3">
              {dataAccessLogs.slice(0, 8).map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-200">{item.resource}</p>
                    <span className="text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    {item.viewer?.employee?.name || item.viewer?.email || item.viewerEmail || 'Unknown viewer'} opened {item.resourceId}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

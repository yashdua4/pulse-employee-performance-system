import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { 
  Users, 
  FolderKanban, 
  Clock, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  Play, 
  Square,
  Sparkles,
  Award,
  History,
  FileSpreadsheet,
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const apiFetch = useAuthStore((state) => state.apiFetch);
  const [stats, setStats] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clock in/out states for Employees
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [clockLoading, setClockLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, chartsRes] = await Promise.all([
        apiFetch('/dashboard/stats'),
        user?.role === 'ADMIN' || user?.role === 'MANAGER' 
          ? apiFetch('/analytics/charts').catch(() => null) 
          : Promise.resolve(null)
      ]);
      
      setStats(statsRes);
      setChartsData(chartsRes);
      
      if (user?.role === 'EMPLOYEE') {
        setTodayAttendance(statsRes.attendanceToday || null);
      }
    } catch (err: any) {
      setError('Could not retrieve dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleClockIn = async () => {
    try {
      setClockLoading(true);
      const data = await apiFetch('/attendance/clock-in', { method: 'POST' });
      setTodayAttendance(data);
      fetchStats(); // Refresh hours stats
    } catch (err: any) {
      alert(err.message || 'Error clocking in');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockLoading(true);
      const data = await apiFetch('/attendance/clock-out', { method: 'POST' });
      setTodayAttendance(data);
      fetchStats(); // Refresh hours stats
    } catch (err: any) {
      alert(err.message || 'Error clocking out');
    } finally {
      setClockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
        {/* Welcome Banner Skeleton */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded-xl"></div>
            <div className="h-4 w-64 bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-10 w-40 bg-slate-800 rounded-2xl"></div>
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-3 w-24 bg-slate-850 rounded"></div>
                <div className="h-8 w-16 bg-slate-800 rounded-lg"></div>
                <div className="h-2.5 w-28 bg-slate-850 rounded"></div>
              </div>
              <div className="w-12 h-12 bg-slate-800 rounded-2xl"></div>
            </div>
          ))}
        </div>

        {/* Detailed Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 col-span-1 space-y-4">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-slate-850 rounded"></div>
                  <div className="h-3 w-10 bg-slate-850 rounded"></div>
                </div>
                <div className="h-2 w-full bg-slate-850 rounded-full"></div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 col-span-2 space-y-4">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800/30 rounded-2xl border border-slate-800/50"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-100 p-6">
        <div className="max-w-md p-6 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Connection Error</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button onClick={fetchStats} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      {/* Welcome Banner */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span>SaaS Dashboard</span>
            <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 mt-1">Hello, {user?.employee?.name || user?.email}. Organization portal summary.</p>
        </div>
        <div className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl text-xs font-semibold text-slate-300 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-400" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      {/* ADMIN STATS */}
      {user?.role === 'ADMIN' && stats && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Employees</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.activeEmployees} / {stats.stats.totalEmployees}</span>
                <span className="text-[10px] font-semibold text-emerald-400 mt-1 block">Employment active</span>
              </div>
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Running Projects</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.activeProjects}</span>
                <span className="text-[10px] font-semibold text-indigo-400 mt-1 block">In Progress status</span>
              </div>
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                <FolderKanban className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Organization Attendance</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.todayAttendanceRate}%</span>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{stats.stats.clockedInToday} Clocked In today</span>
              </div>
              <div className="p-4 bg-sky-600/10 border border-sky-500/20 rounded-2xl text-sky-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Draft reviews</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.pendingReviews}</span>
                <span className="text-[10px] font-semibold text-amber-400 mt-1 block">Evaluations pending</span>
              </div>
              <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-400">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts Section */}
          {chartsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-violet-400" />
                  <span>Attendance Rate Trend (Last 6 Months)</span>
                </h3>
                <div className="w-full flex justify-center py-4 bg-slate-950/45 rounded-2xl border border-slate-850">
                  <svg className="w-full max-w-sm h-40" viewBox="0 0 400 180">
                    {[0, 25, 50, 75, 100].map((percent, idx) => {
                      const y = 140 - percent * 1.1;
                      return (
                        <g key={idx} className="opacity-20">
                          <line x1="30" y1={y} x2="380" y2={y} stroke="#475569" strokeDasharray="3,3" />
                          <text x="5" y={y + 4} fill="#94a3b8" className="text-[10px] font-bold">{percent}%</text>
                        </g>
                      );
                    })}
                    {chartsData.attendance && chartsData.attendance.length > 0 && (() => {
                      const pts = chartsData.attendance.map((d: any, idx: number) => {
                        const x = 50 + idx * 60;
                        const ratePercent = Math.max(0, Math.min(100, d.rate));
                        const y = 140 - ratePercent * 1.1;
                        return { x, y, ...d };
                      });
                      const dPath = pts.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      return (
                        <>
                          <path d={dPath} fill="none" stroke="url(#violet-grad)" strokeWidth="3" strokeLinecap="round" />
                          <path d={`${dPath} L ${pts[pts.length - 1].x} 140 L ${pts[0].x} 140 Z`} fill="url(#violet-area-grad)" className="opacity-10" />
                          {pts.map((p: any, i: number) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="5" fill="#a78bfa" stroke="#0f172a" strokeWidth="2" />
                              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#f1f5f9" className="text-[9px] font-black">{p.rate}%</text>
                              <text x={p.x} y="160" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-semibold">{p.month}</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                    <defs>
                      <linearGradient id="violet-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id="violet-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-emerald-450" />
                  <span>Department Performance Averages</span>
                </h3>
                <div className="w-full flex justify-center py-4 bg-slate-950/45 rounded-2xl border border-slate-850">
                  <svg className="w-full max-w-sm h-40" viewBox="0 0 400 180">
                    {[1, 2, 3, 4, 5].map((val, idx) => {
                      const x = 100 + val * 50;
                      return (
                        <g key={idx} className="opacity-20">
                          <line x1={x} y1="10" x2={x} y2="135" stroke="#475569" strokeDasharray="3,3" />
                          <text x={x} y="150" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-bold">{val}.0</text>
                        </g>
                      );
                    })}
                    {chartsData.performance && chartsData.performance.length > 0 && chartsData.performance.slice(0, 4).map((item: any, idx: number) => {
                      const y = 20 + idx * 28;
                      const width = (item.averageRating / 5) * 250;
                      return (
                        <g key={idx}>
                          <text x="10" y={y + 12} fill="#cbd5e1" className="text-[10px] font-bold">{item.department.substring(0, 10)}</text>
                          <rect x="100" y={y} width="250" height="14" fill="#1e293b" rx="4" />
                          <rect x="100" y={y} width={Math.max(0, width)} height="14" fill="url(#emerald-grad)" rx="4" className="transition-all duration-500" />
                          <text x={110 + width} y={y + 11} fill="#34d399" className="text-[9px] font-black">{item.averageRating || '0.0'}</text>
                        </g>
                      );
                    })}
                    <defs>
                      <linearGradient id="emerald-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Department headcount list */}
            <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 col-span-1">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-violet-400" />
                <span>Employees by Department</span>
              </h3>
              <div className="space-y-4">
                {stats.departments.map((dept: any) => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350">{dept.name}</span>
                      <span className="text-slate-400">{dept.count} staff</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full" 
                        style={{ width: `${stats.stats.totalEmployees > 0 ? (dept.count / stats.stats.totalEmployees) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Log / Recent Activity */}
            <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-violet-400" />
                <span>Recent System Activities</span>
              </h3>
              
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {stats.recentActivities.map((act: any) => (
                  <div key={act.id} className="p-3 rounded-2xl bg-slate-950/40 border border-slate-850/80 flex justify-between items-center gap-4 text-xs">
                    <div>
                      <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] rounded border border-indigo-900 px-2.5 py-0.5 bg-indigo-950">
                        {act.action}
                      </span>
                      <p className="text-slate-300 mt-2 leading-relaxed">
                        By user: <span className="font-semibold text-slate-100">{act.user?.employee?.name || act.user?.email || 'Anonymous'}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER STATS */}
      {user?.role === 'MANAGER' && stats && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Team Size</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.teamSize}</span>
                <span className="text-[10px] font-semibold text-violet-400 mt-1 block">Subordinates</span>
              </div>
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assigned Projects</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.assignedProjects}</span>
                <span className="text-[10px] font-semibold text-indigo-400 mt-1 block">Lead or member</span>
              </div>
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                <FolderKanban className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Team Reviews</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.pendingReviews}</span>
                <span className="text-[10px] font-semibold text-sky-400 mt-1 block">Evaluations in Draft</span>
              </div>
              <div className="p-4 bg-sky-600/10 border border-sky-500/20 rounded-2xl text-sky-400">
                <Award className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Team Score</span>
                <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{stats.stats.teamPerformanceScore} / 5</span>
                <span className="text-[10px] font-semibold text-amber-400 mt-1 block">Team Performance Avg</span>
              </div>
              <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts Section (Manager View) */}
          {chartsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-violet-400" />
                  <span>Team Attendance Rate Trend (Last 6 Months)</span>
                </h3>
                <div className="w-full flex justify-center py-4 bg-slate-950/45 rounded-2xl border border-slate-850">
                  <svg className="w-full max-w-sm h-40" viewBox="0 0 400 180">
                    {[0, 25, 50, 75, 100].map((percent, idx) => {
                      const y = 140 - percent * 1.1;
                      return (
                        <g key={idx} className="opacity-20">
                          <line x1="30" y1={y} x2="380" y2={y} stroke="#475569" strokeDasharray="3,3" />
                          <text x="5" y={y + 4} fill="#94a3b8" className="text-[10px] font-bold">{percent}%</text>
                        </g>
                      );
                    })}
                    {chartsData.attendance && chartsData.attendance.length > 0 && (() => {
                      const pts = chartsData.attendance.map((d: any, idx: number) => {
                        const x = 50 + idx * 60;
                        const ratePercent = Math.max(0, Math.min(100, d.rate));
                        const y = 140 - ratePercent * 1.1;
                        return { x, y, ...d };
                      });
                      const dPath = pts.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      return (
                        <>
                          <path d={dPath} fill="none" stroke="url(#violet-grad)" strokeWidth="3" strokeLinecap="round" />
                          <path d={`${dPath} L ${pts[pts.length - 1].x} 140 L ${pts[0].x} 140 Z`} fill="url(#violet-area-grad)" className="opacity-10" />
                          {pts.map((p: any, i: number) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="5" fill="#a78bfa" stroke="#0f172a" strokeWidth="2" />
                              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#f1f5f9" className="text-[9px] font-black">{p.rate}%</text>
                              <text x={p.x} y="160" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-semibold">{p.month}</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-emerald-455" />
                  <span>Team Performance Averages</span>
                </h3>
                <div className="w-full flex justify-center py-4 bg-slate-950/45 rounded-2xl border border-slate-850">
                  <svg className="w-full max-w-sm h-40" viewBox="0 0 400 180">
                    {[1, 2, 3, 4, 5].map((val, idx) => {
                      const x = 100 + val * 50;
                      return (
                        <g key={idx} className="opacity-20">
                          <line x1={x} y1="10" x2={x} y2="135" stroke="#475569" strokeDasharray="3,3" />
                          <text x={x} y="150" textAnchor="middle" fill="#94a3b8" className="text-[10px] font-bold">{val}.0</text>
                        </g>
                      );
                    })}
                    {chartsData.performance && chartsData.performance.length > 0 && chartsData.performance.slice(0, 4).map((item: any, idx: number) => {
                      const y = 20 + idx * 28;
                      const width = (item.averageRating / 5) * 250;
                      return (
                        <g key={idx}>
                          <text x="10" y={y + 12} fill="#cbd5e1" className="text-[10px] font-bold">{item.department.substring(0, 10)}</text>
                          <rect x="100" y={y} width="250" height="14" fill="#1e293b" rx="4" />
                          <rect x="100" y={y} width={Math.max(0, width)} height="14" fill="url(#emerald-grad)" rx="4" className="transition-all duration-500" />
                          <text x={110 + width} y={y + 11} fill="#34d399" className="text-[9px] font-black">{item.averageRating || '0.0'}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Team Attendance widgets */}
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 max-w-md">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Today's Team Attendance</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
                <span className="text-xs text-emerald-400 block font-semibold">Present</span>
                <span className="text-xl font-bold text-slate-100 mt-1 block">{stats.stats.attendanceToday.present}</span>
              </div>
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-2xl">
                <span className="text-xs text-amber-400 block font-semibold">Late</span>
                <span className="text-xl font-bold text-slate-100 mt-1 block">{stats.stats.attendanceToday.late}</span>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-2xl">
                <span className="text-xs text-rose-400 block font-semibold">Absent</span>
                <span className="text-xl font-bold text-slate-100 mt-1 block">{stats.stats.attendanceToday.absent}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE STATS */}
      {user?.role === 'EMPLOYEE' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Clock In Panel */}
          <div className="space-y-6 lg:col-span-1">
            <div className="p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex flex-col items-center">
              <h3 className="text-base font-bold text-slate-100 mb-4 self-start flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-violet-400" />
                <span>Attendance Shift Today</span>
              </h3>
              
              <div className="w-20 h-20 rounded-full bg-violet-600/10 border-2 border-violet-500/30 flex items-center justify-center mb-6 relative">
                <Clock className="h-8 w-8 text-violet-400 animate-pulse" />
              </div>

              {!todayAttendance ? (
                <div className="text-center w-full">
                  <p className="text-xs text-slate-400 mb-6">You have not clocked in for today yet.</p>
                  <button
                    onClick={handleClockIn}
                    disabled={clockLoading}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/15 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>Check In</span>
                  </button>
                </div>
              ) : !todayAttendance.clockOut ? (
                <div className="text-center w-full">
                  <p className="text-xs text-slate-200 font-semibold mb-1">Shift Active</p>
                  <p className="text-[10px] text-slate-500 mb-6">
                    Clocked In at {new Date(todayAttendance.clockIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={handleClockOut}
                    disabled={clockLoading}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/10 cursor-pointer disabled:opacity-50"
                  >
                    <Square className="h-4 w-4" />
                    <span>Check Out</span>
                  </button>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-xs font-semibold mb-6">
                    Shift Completed: {todayAttendance.workHours} Hrs
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Clock In: {new Date(todayAttendance.clockIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Clock Out: {new Date(todayAttendance.clockOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* Stats summary list */}
            <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Projects</span>
                <span className="text-slate-200 text-sm font-bold">{stats.stats.assignedProjectsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pending Reviews</span>
                <span className="text-slate-200 text-sm font-bold">{stats.stats.upcomingReviews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Performance Score</span>
                <span className="text-violet-400 text-sm font-bold">
                  {stats.stats.performanceScore ? `${stats.stats.performanceScore} / 5` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Notifications & Goals */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live alerts center list */}
            <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-violet-400" />
                <span>Recent Notifications Alerts</span>
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.notifications.map((notif: any) => (
                  <div key={notif.id} className="p-3.5 rounded-2xl bg-slate-950/45 border border-slate-850 flex justify-between gap-4 items-start text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{notif.title}</span>
                      <p className="text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {stats.notifications.length === 0 && (
                  <p className="text-center text-slate-600 py-8 italic">No notifications alerts.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

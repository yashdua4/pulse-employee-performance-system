import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  TrendingUp
} from 'lucide-react';

export const Attendance: React.FC = () => {
  const { user, apiFetch } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterUser, setFilterUser] = useState('');

  // Daily stats summaries
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalLate, setTotalLate] = useState(0);
  const [avgHours, setAvgHours] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filterUser) queryParams.append('employeeId', filterUser);
      
      const logsData = await apiFetch(`/attendance?${queryParams.toString()}`);
      setLogs(logsData);

      // Compute statistics based on retrieved logs
      const present = logsData.filter((l: any) => l.status === 'PRESENT').length;
      const late = logsData.filter((l: any) => l.status === 'LATE').length;
      
      const logsWithHours = logsData.filter((l: any) => l.workHours !== null && l.workHours > 0);
      const avg = logsWithHours.length > 0
        ? Math.round((logsWithHours.reduce((acc: number, curr: any) => acc + curr.workHours, 0) / logsWithHours.length) * 100) / 100
        : 0;

      setTotalPresent(present);
      setTotalLate(late);
      setAvgHours(avg);

      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        const empData = await apiFetch('/employees');
        setEmployees(empData);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterUser]);

  if (loading && logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <span>Attendance Registry</span>
        </h1>
        <p className="text-slate-400 mt-1">Review clock-in history, active shift durations, and lateness statistics.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Punctual Days</span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{totalPresent} Day(s)</span>
            <span className="text-[10px] text-slate-500 block">Status: PRESENT</span>
          </div>
          <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Late Arrivals</span>
            <span className="text-2xl font-extrabold text-amber-400 mt-1 block">{totalLate} Day(s)</span>
            <span className="text-[10px] text-slate-500 block">Clock-in past 9:30 AM</span>
          </div>
          <div className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg Work Hours</span>
            <span className="text-2xl font-extrabold text-violet-400 mt-1 block">{avgHours} Hrs / Day</span>
            <span className="text-[10px] text-slate-500 block">Shift average</span>
          </div>
          <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="p-4 rounded-3xl bg-slate-800/20 border border-slate-800 mb-8 flex items-center gap-4">
          <Filter className="h-5 w-5 text-slate-500" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Employee:</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 text-sm focus:border-violet-500 outline-none cursor-pointer"
            >
              <option value="">All Staff</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation || 'Staff'})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-slate-800/20 border border-slate-850 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="p-4">Date</th>
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <th className="p-4">Employee</th>}
                <th className="p-4">Clock In</th>
                <th className="p-4">Clock Out</th>
                <th className="p-4">Hours Worked</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/10 text-sm text-slate-300 transition-colors">
                  <td className="p-4 font-semibold text-slate-200">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-slate-100 block">{log.employee.name}</span>
                        <span className="text-xs text-slate-400 block">{log.employee.designation || 'Employee'}</span>
                      </div>
                    </td>
                  )}

                  <td className="p-4 font-mono text-slate-300">
                    {new Date(log.clockIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>

                  <td className="p-4 font-mono text-slate-300">
                    {log.clockOut ? (
                      new Date(log.clockOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    ) : (
                      <span className="text-slate-500 italic text-xs">Shift active</span>
                    )}
                  </td>

                  <td className="p-4">
                    {log.workHours !== null ? (
                      <span className="font-semibold text-slate-200">{log.workHours} Hrs</span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">--</span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center">
                      <span className={`inline-block text-[10px] px-2.5 py-1 font-bold uppercase rounded border ${
                        log.status === 'PRESENT' 
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                          : log.status === 'LATE' 
                            ? 'bg-amber-950 text-amber-400 border-amber-800' 
                            : log.status === 'LEAVE'
                              ? 'bg-sky-950 text-sky-400 border-sky-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={(user?.role === 'ADMIN' || user?.role === 'MANAGER') ? 6 : 5} className="p-8 text-center text-slate-500">
                    No attendance logs found for current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

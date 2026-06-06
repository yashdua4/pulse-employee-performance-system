import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { ShieldAlert, Calendar, Search, RefreshCw } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const apiFetch = useAuthStore((state) => state.apiFetch);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', '20');
      if (actionFilter) queryParams.append('action', actionFilter);

      const data = await apiFetch(`/analytics/audit-logs?${queryParams.toString()}`);
      setLogs(data.logs);
      setTotalPages(data.meta.pages);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve audit log ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const parseJson = (val: string) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span>Audit Ledger Logs</span>
            <ShieldAlert className="h-6 w-6 text-rose-500" />
          </h1>
          <p className="text-slate-400 mt-1">Audit organizational modifications, logins, updates, and delete events.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      {/* Filters */}
      <div className="p-4 rounded-3xl bg-slate-800/40 border border-slate-850 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm outline-none cursor-pointer w-56"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="EMPLOYEE_CREATE">EMPLOYEE_CREATE</option>
            <option value="EMPLOYEE_UPDATE">EMPLOYEE_UPDATE</option>
            <option value="PROJECT_CREATE">PROJECT_CREATE</option>
            <option value="PROJECT_UPDATE">PROJECT_UPDATE</option>
            <option value="LEAVE_APPLY">LEAVE_APPLY</option>
            <option value="LEAVE_APPROVE">LEAVE_APPROVE</option>
            <option value="REVIEW_CREATE">REVIEW_CREATE</option>
          </select>
        </div>

        {/* Pagination buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-30 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-slate-400 flex items-center px-2">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-30 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-slate-800/20 border border-slate-850 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="p-4 w-1/5">Timestamp</th>
                <th className="p-4 w-1/6">User</th>
                <th className="p-4 w-1/6">Action</th>
                <th className="p-4 w-1/4">Old State Details</th>
                <th className="p-4 w-1/4">New State Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const prev = parseJson(log.previousValue);
                const next = parseJson(log.newValue);
                return (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-850/10 text-sm text-slate-300">
                    <td className="p-4 font-semibold text-slate-200 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {log.user ? (
                        <div className="truncate">
                          <span className="font-semibold text-slate-100 block truncate">{log.user.employee?.name || 'Admin'}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Anonymous</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-indigo-950/80 text-indigo-400 border border-indigo-900/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono">
                      {prev ? (
                        <pre className="bg-slate-950 p-2 rounded-xl text-[10px] text-slate-400 max-h-16 overflow-y-auto overflow-x-hidden border border-slate-850 break-words whitespace-pre-wrap">
                          {JSON.stringify(prev, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-600 italic">--</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono">
                      {next ? (
                        <pre className="bg-slate-950 p-2 rounded-xl text-[10px] text-slate-400 max-h-16 overflow-y-auto overflow-x-hidden border border-slate-850 break-words whitespace-pre-wrap">
                          {JSON.stringify(next, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-600 italic">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No audits found matching this action type.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

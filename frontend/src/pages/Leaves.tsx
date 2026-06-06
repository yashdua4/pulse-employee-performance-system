import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { 
  Calendar, 
  Plus, 
  Check, 
  X, 
  PlaneTakeoff, 
  Trash2
} from 'lucide-react';

export const Leaves: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const apiFetch = useAuthStore((state) => state.apiFetch);
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Leave Form States
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchBalances = async () => {
    try {
      const data = await apiFetch('/leaves/balances');
      setBalances(data);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/leaves');
      setRequests(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBalances();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    try {
      await apiFetch('/leaves/apply', {
        method: 'POST',
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      });

      setShowModal(false);
      setLeaveType('CASUAL');
      setStartDate('');
      setEndDate('');
      setReason('');
      
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err.message || 'Error submitting leave request');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this leave request?')) return;

    try {
      await apiFetch(`/leaves/${id}/cancel`, { method: 'DELETE' });
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err.message || 'Error cancelling leave request');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/leaves/${id}/approve`, { method: 'POST' });
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err.message || 'Error approving leave request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/leaves/${id}/reject`, { method: 'POST' });
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err.message || 'Error rejecting leave request');
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const approvalQueue = requests.filter((r) => r.employeeId !== user?.employee?.id && r.status === 'PENDING');

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Leave Management</h1>
          <p className="text-slate-400 mt-1">Apply for leave, check WFH approvals, and manage manager approvals.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Apply Leave</span>
        </button>
      </header>

      {/* Leave Balance Cards Grid */}
      {balances && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
          <div className="p-5 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl pointer-events-none"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Casual Leave</span>
            <span className="text-3xl font-black text-slate-100 mt-2 block">{balances.casualBalance} / 15</span>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (balances.casualBalance / 15) * 100))}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-550 mt-2">Deducted on manager approval</span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sick Leave</span>
            <span className="text-3xl font-black text-slate-100 mt-2 block">{balances.sickBalance} / 10</span>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (balances.sickBalance / 10) * 100))}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-550 mt-2">Medical reasons only</span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Earned Leave</span>
            <span className="text-3xl font-black text-slate-100 mt-2 block">{balances.earnedBalance} / 20</span>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (balances.earnedBalance / 20) * 100))}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-550 mt-2">Annual holiday accruals</span>
          </div>

          <div className="p-5 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-sky-600/5 rounded-full blur-2xl pointer-events-none"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work From Home</span>
            <span className="text-3xl font-black text-sky-400 mt-2 block">Unlimited</span>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
            <span className="text-[10px] text-slate-550 mt-2">Unrestricted remote policy</span>
          </div>
        </div>
      )}

      {/* Grid: Approvals Queue (Admin/Manager) vs Personal requests */}
      <div className="space-y-8">
        
        {/* 1. APPROVALS QUEUE */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && approvalQueue.length > 0 && (
          <div className="p-6 rounded-3xl bg-violet-950/10 border border-violet-900/40">
            <h3 className="text-lg font-bold text-violet-400 mb-4 flex items-center gap-2">
              <PlaneTakeoff className="h-5 w-5 animate-bounce" />
              <span>Pending Team Approvals</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvalQueue.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-100 block">{req.employee.name}</span>
                        <span className="text-xs text-slate-400 block">{req.employee.designation}</span>
                      </div>
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-violet-900/40 text-violet-400 border border-violet-850">
                        {req.leaveType}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-slate-500 font-bold block mb-1">Reason:</span>
                      "{req.reason}"
                    </p>

                    <span className="text-xs text-slate-400 block pt-1">
                      Dates: <span className="font-semibold text-slate-200">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. LEAVE REQUESTS HISTORY */}
        <div className="p-6 rounded-3xl bg-slate-800/20 border border-slate-850">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Leave Application Log</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Leave Type</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Approver</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-800/50 hover:bg-slate-800/10 text-sm text-slate-300">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-slate-100 block">{req.employee.name}</span>
                        <span className="text-xs text-slate-500 block">{req.employee.designation}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-950 border border-slate-800">
                        {req.leaveType}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 max-w-xs truncate text-xs" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {req.approver ? req.approver.name : <span className="italic text-slate-600">--</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <span className={`inline-block text-[9px] px-2.5 py-1 font-bold uppercase rounded border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {req.status === 'PENDING' && (req.employeeId === user?.employee?.id || user?.role === 'ADMIN') ? (
                        <button
                          onClick={() => handleCancel(req.id)}
                          className="p-1.5 rounded-lg border border-slate-700 hover:border-rose-500 bg-slate-900/60 hover:bg-rose-950/20 text-slate-400 hover:text-rose-450 transition-all cursor-pointer"
                          title="Cancel request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No leave requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Calendar className="h-5.5 w-5.5 text-violet-400" />
              <span>Apply for Leave</span>
            </h2>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none cursor-pointer"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="WFH">Work From Home</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none h-20 resize-none"
                  placeholder="Details/justifications for leave request..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-violet-500/10 cursor-pointer mt-4"
              >
                Submit Leave Application
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

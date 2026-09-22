import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Laptop2,
  Radar,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useSecurityStore } from '../store/securityStore.js';

export const SecurityCenter: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const {
    summary,
    sessions,
    mfaSetup,
    fetchSummary,
    fetchSessions,
    beginMfaSetup,
    verifyMfaSetup,
    disableMfa,
    revokeSession,
    logoutAllSessions,
  } = useSecurityStore();

  const [otp, setOtp] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary().catch(() => setError('Failed to load security summary'));
    fetchSessions().catch(() => setError('Failed to load active sessions'));
  }, []);

  const handleBeginMfa = async () => {
    setLoading(true);
    setError(null);
    const result = await beginMfaSetup();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Unable to start MFA setup');
    }
  };

  const handleVerifyMfa = async () => {
    setLoading(true);
    setError(null);
    const result = await verifyMfaSetup(otp);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Invalid MFA code');
      return;
    }
    setOtp('');
    await fetchSummary();
  };

  const handleDisableMfa = async () => {
    setLoading(true);
    setError(null);
    const result = await disableMfa(disableOtp);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Unable to disable MFA');
      return;
    }
    setDisableOtp('');
    await fetchSummary();
  };

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span>Profile Security</span>
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your active sessions, MFA enrollment, and recent account access for {user?.email}.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Active Sessions</span>
          <p className="text-3xl font-black text-slate-100 mt-3">{summary?.sessionCount ?? sessions.length}</p>
          <p className="text-xs text-slate-500 mt-2">Signed-in devices currently tied to your account.</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">MFA Status</span>
          <p className={`text-3xl font-black mt-3 ${user?.mfaEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
            {user?.mfaEnabled ? 'Enabled' : 'Off'}
          </p>
          <p className="text-xs text-slate-500 mt-2">TOTP protection for password logins.</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Open Alerts</span>
          <p className="text-3xl font-black text-rose-400 mt-3">{summary?.activeSuspiciousEvents ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">Suspicious events currently associated with your account.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Session Management</h2>
              <p className="text-sm text-slate-400 mt-1">Review every device and revoke access instantly.</p>
            </div>
            <button
              onClick={async () => {
                const result = await logoutAllSessions();
                if (!result.success) {
                  setError(result.error || 'Failed to log out all sessions');
                }
              }}
              className="px-4 py-2 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-rose-300 hover:text-white hover:bg-rose-900/40 text-sm font-semibold cursor-pointer"
            >
              Logout All Devices
            </button>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
                    <Laptop2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{session.deviceName || 'Unknown Device'}</p>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 text-[10px] font-black uppercase">
                          Current
                        </span>
                      )}
                      {session.revoked && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-black uppercase">
                          Revoked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {session.browser || 'Unknown Browser'} · {session.ipAddress || 'Unknown IP'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Last activity {new Date(session.lastActivity).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!session.revoked && (
                  <button
                    onClick={async () => {
                      const result = await revokeSession(session.id);
                      if (!result.success) {
                        setError(result.error || 'Failed to revoke session');
                      }
                    }}
                    className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-700 hover:border-rose-500/50 text-slate-200 text-sm font-semibold cursor-pointer"
                  >
                    Revoke Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-400 mt-1">Secure new sessions with a TOTP challenge.</p>
              </div>
              {user?.mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldOff className="h-5 w-5 text-amber-400" />
              )}
            </div>

            {!user?.mfaEnabled && !mfaSetup && (
              <button
                onClick={handleBeginMfa}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Preparing MFA...' : 'Enable MFA'}
              </button>
            )}

            {!user?.mfaEnabled && mfaSetup && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-center">
                  <img src={mfaSetup.qrCodeDataUrl} alt="MFA QR code" className="w-48 h-48 rounded-2xl bg-white p-3" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Manual Key</p>
                  <p className="text-sm font-mono text-slate-200 mt-2 break-all">{mfaSetup.manualEntryKey}</p>
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm outline-none"
                  />
                </div>
                <button
                  onClick={handleVerifyMfa}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-50"
                >
                  Verify And Enable MFA
                </button>
              </div>
            )}

            {user?.mfaEnabled && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-sm">
                  MFA is active. Password logins now require a one-time passcode.
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    value={disableOtp}
                    onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    placeholder="Enter OTP to disable MFA"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm outline-none"
                  />
                </div>
                <button
                  onClick={handleDisableMfa}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-rose-300 hover:text-white hover:bg-rose-900/40 font-semibold text-sm cursor-pointer disabled:opacity-50"
                >
                  Disable MFA
                </button>
              </div>
            )}
          </section>

          <section className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="h-4 w-4 text-violet-400" />
              <h2 className="text-lg font-bold text-slate-100">Recent Data Access</h2>
            </div>
            <div className="space-y-3">
              {(summary?.recentAccessLogs || []).map((item: any) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-200">{item.resource}</p>
                    <span className="text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Resource ID: {item.resourceId}</p>
                </div>
              ))}
              {(!summary?.recentAccessLogs || summary.recentAccessLogs.length === 0) && (
                <p className="text-sm text-slate-500">No recent access events recorded for this account.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

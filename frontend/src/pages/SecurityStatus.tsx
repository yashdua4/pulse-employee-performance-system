import React, { useEffect, useMemo } from 'react';
import { CheckCircle2, ServerCog, ShieldAlert, XCircle } from 'lucide-react';
import { useSecurityStore } from '../store/securityStore.js';

export const SecurityStatus: React.FC = () => {
  const { securityStatus, fetchSecurityStatus } = useSecurityStore();

  useEffect(() => {
    fetchSecurityStatus().catch(() => undefined);
  }, []);

  const items = useMemo(
    () => [
      ['Helmet Status', securityStatus?.helmetStatus],
      ['Rate Limiting Status', securityStatus?.rateLimitingStatus],
      ['Secure Cookies Status', securityStatus?.secureCookiesStatus],
      ['JWT Status', securityStatus?.jwtStatus],
      ['Audit Logging Status', securityStatus?.auditLoggingStatus],
      ['Database Status', securityStatus?.databaseStatus],
      ['MFA Status', securityStatus?.mfaStatus],
    ],
    [securityStatus]
  );

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <span>Security Status Center</span>
          <ServerCog className="h-6 w-6 text-violet-400" />
        </h1>
        <p className="text-slate-400 mt-1">Live health view of the platform’s security guardrails.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map(([label, active]) => {
          const isActive = Boolean(active);
          const Icon = isActive ? CheckCircle2 : XCircle;

          return (
            <div key={String(label)} className="p-6 rounded-3xl bg-slate-800/35 border border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">{label}</p>
                  <p className={`text-2xl font-black mt-3 ${isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isActive ? 'Operational' : 'Attention Needed'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${isActive ? 'bg-emerald-950/20 text-emerald-400' : 'bg-rose-950/20 text-rose-400'}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!securityStatus && (
        <div className="mt-8 p-6 rounded-3xl bg-amber-950/20 border border-amber-900/40 text-amber-200 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5" />
          <span>Security status is still loading from the backend.</span>
        </div>
      )}
    </div>
  );
};

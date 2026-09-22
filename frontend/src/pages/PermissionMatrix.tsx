import React, { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSecurityStore } from '../store/securityStore.js';

export const PermissionMatrix: React.FC = () => {
  const { permissionMatrix, fetchPermissionMatrix } = useSecurityStore();

  useEffect(() => {
    fetchPermissionMatrix().catch(() => undefined);
  }, []);

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <span>Permission Matrix</span>
          <ShieldCheck className="h-6 w-6 text-violet-400" />
        </h1>
        <p className="text-slate-400 mt-1">Backend-driven role visibility for critical HRMS capabilities.</p>
      </header>

      <div className="rounded-3xl border border-slate-800 overflow-hidden bg-slate-800/25">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-slate-950/40 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                <th className="p-4">Permission</th>
                <th className="p-4">Admin</th>
                <th className="p-4">Manager</th>
                <th className="p-4">Employee</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.permission} className="border-t border-slate-800 text-sm text-slate-200">
                  <td className="p-4 font-semibold">{row.permission}</td>
                  <td className="p-4">{row.admin ? 'Allowed' : 'Blocked'}</td>
                  <td className="p-4">{row.manager ? 'Allowed' : 'Blocked'}</td>
                  <td className="p-4">{row.employee ? 'Allowed' : 'Blocked'}</td>
                </tr>
              ))}
              {permissionMatrix.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Permission matrix is loading.
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

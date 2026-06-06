import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../store/authStore';
import { Mail, Lock, Key, Activity, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);

  // Reset password states
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Reset token generated successfully! Copy the simulated token below to reset your password.');
        setSimulatedToken(data.resetToken);
        setToken(data.resetToken); // Pre-fill token for developer convenience
      } else {
        setError(data.message || 'Failed to request reset token');
      }
    } catch (err: any) {
      setError('Network error, please check if backend is running');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      setError('Please fill in both token and password fields');
      return;
    }

    setResetLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        setMessage('Your password has been reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError('Network error during reset');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 text-violet-400 font-black text-3xl tracking-wider select-none mb-2">
            <Activity className="h-8 w-8 animate-pulse" />
            <span>PULSE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-2 text-center">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            {!simulatedToken ? 'Request a simulated security token' : 'Provide your security token and new password'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-sm font-medium">
            {message}
          </div>
        )}

        {/* Phase 1: Requesting a reset token */}
        {!simulatedToken && !resetSuccess && (
          <form onSubmit={handleRequestToken} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-violet-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? 'Requesting Token...' : 'Generate Reset Token'}
            </button>
          </form>
        )}

        {/* Phase 2: Enter token and change password */}
        {simulatedToken && !resetSuccess && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Show simulated token to the developer */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-1">Simulated Token</span>
              <code className="text-xs block bg-slate-900 p-2 rounded text-slate-300 font-mono break-all border border-slate-800">
                {simulatedToken}
              </code>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reset Token</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Paste reset token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-violet-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {resetLoading ? 'Saving Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center flex items-center justify-center">
          <Link to="/login" className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

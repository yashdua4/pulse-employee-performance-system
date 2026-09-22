import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, verifyMfaLogin } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else if (res.requiresMfa) {
      setRequiresMfa(true);
      setError('Enter the 6-digit code from your authenticator app to finish signing in.');
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter your MFA code');
      return;
    }

    setLoading(true);
    setError(null);
    const res = await verifyMfaLogin(otp);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid OTP');
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
          <h1 className="text-xl font-bold text-slate-100 mt-2 text-center">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Access your Performance Management Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        {!requiresMfa ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
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

          {/* Password input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-violet-400 hover:text-violet-300">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-violet-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        ) : (
        <form onSubmit={handleVerifyMfa} className="space-y-6">
          <div className="p-4 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 text-emerald-300 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Multi-factor verification required</span>
            </div>
            <p className="mt-2 text-xs text-emerald-200/80">
              Use your authenticator app to verify this login before a session is created.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">One-Time Passcode</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200 tracking-[0.3em]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
          >
            {loading ? 'Verifying...' : 'Verify And Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setRequiresMfa(false);
              setOtp('');
              setError(null);
            }}
            className="w-full py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-2xl font-semibold text-sm transition-all duration-150 cursor-pointer"
          >
            Back To Password Step
          </button>
        </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-violet-400 hover:text-violet-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

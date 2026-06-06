import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, API_URL } from '../store/authStore';
import { Mail, Lock, User, Briefcase, Activity, CheckSquare } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [managerId, setManagerId] = useState('');
  
  const [managers, setManagers] = useState<Array<{ id: string; name: string; department: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch managers list on mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch(`${API_URL}/employees/managers`);
        if (response.ok) {
          const data = await response.json();
          setManagers(data);
        }
      } catch (err) {
        console.error('Error fetching managers list:', err);
      }
    };
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    const signupData = {
      name,
      email,
      password,
      role,
      department: department || undefined,
      designation: designation || undefined,
      managerId: managerId || undefined,
    };

    const res = await signup(signupData);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Failed to sign up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 text-violet-400 font-black text-3xl tracking-wider select-none mb-2">
            <Activity className="h-8 w-8 animate-pulse" />
            <span>PULSE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-2 text-center">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Get started with Employee Performance Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Two-column layout for Name and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password *</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <hr className="border-slate-800 my-4" />

          {/* Role details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role</label>
              <div className="relative">
                <CheckSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200 cursor-pointer appearance-none"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Designation</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Software Engineer II"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Manager select dropdown */}
            {role === 'EMPLOYEE' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-sm outline-none transition-all duration-200 cursor-pointer appearance-none"
                  >
                    <option value="">No Manager (None)</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} ({mgr.department || 'No Dept'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-violet-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-4"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

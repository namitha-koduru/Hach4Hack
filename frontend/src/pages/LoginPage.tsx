import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { LogIn, AlertCircle, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-12 px-4 bg-architectural-grid">
      <InteractiveTiltCard
        maxTiltDeg={4}
        className="w-full max-w-md bg-[#111411] border border-white/15 rounded-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-[#d4ff33] text-[#080a08] flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[#f5f7f2] mb-1">
            Welcome Back
          </h1>
          <p className="text-xs text-[#9ca396]">Sign in to your TeamForge account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-sm text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-sm text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="font-mono text-[10px] text-[#9ca396] uppercase tracking-widest mb-3 text-center">
            Demo Evaluator Accounts
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('leader@teamforge.dev')}
              className="py-2 px-2 rounded-lg bg-[#080a08] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/10 text-center transition-colors flex flex-col items-center gap-1"
            >
              <UserCheck className="w-4 h-4 text-[#d4ff33]" />
              <span className="truncate font-medium">Leader</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('participant@teamforge.dev')}
              className="py-2 px-2 rounded-lg bg-[#080a08] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/10 text-center transition-colors flex flex-col items-center gap-1"
            >
              <UserCheck className="w-4 h-4 text-[#d4ff33]" />
              <span className="truncate font-medium">Member</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('candidate@teamforge.dev')}
              className="py-2 px-2 rounded-lg bg-[#080a08] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/10 text-center transition-colors flex flex-col items-center gap-1"
            >
              <UserCheck className="w-4 h-4 text-[#d4ff33]" />
              <span className="truncate font-medium">Applicant</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#9ca396]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[#d4ff33] hover:underline font-semibold">
            Register now
          </Link>
        </div>
      </InteractiveTiltCard>
    </div>
  );
};



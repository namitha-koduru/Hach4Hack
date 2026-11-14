import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  Sparkles,
  Trophy,
  CheckCircle,
  Database,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 text-center px-4 max-w-5xl mx-auto">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8 animate-pulse-subtle">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PS1 Hiring Challenge: Race-Proof Team Formation at Scale</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          High-Concurrency Team Formation{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
            Without Race Conditions
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Engineered for 10,000+ hackathon participants. Powered by PostgreSQL row-level locks (
          <code className="text-indigo-300 font-mono text-sm px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40">
            SELECT FOR UPDATE
          </code>
          ), deterministic leadership succession, idempotent operations, and real-time WebSockets.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? '/teams' : '/register'}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5"
          >
            <span>{user ? 'Explore Live Team Board' : 'Get Started Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/teams"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors"
          >
            <span>Looking-For-Teammates Board</span>
          </Link>
        </div>

        {/* Live Metrics Showcase */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">50 reqs</div>
            <div className="text-xs text-slate-400 mt-1">Simultaneous Join Guarantee</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">0 Overfill</div>
            <div className="text-xs text-slate-400 mt-1">Row Lock Safety</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">&lt; 200 ms</div>
            <div className="text-xs text-slate-400 mt-1">p95 Latency Target</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">10,000+</div>
            <div className="text-xs text-slate-400 mt-1">Seeded Scale Benchmark</div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Production Engineering Standards
          </h2>
          <p className="text-sm text-slate-400">
            Why TeamForge reliably handles high concurrency while standard CRUD applications corrupt data.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pessimistic Row-Level Locking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When 50 participants compete for the last open seat, transactions serialize on{' '}
              <code className="text-indigo-300 font-mono">SELECT ... FOR UPDATE</code>. Exactly 1 claims the seat; 49 cleanly fail with 409 Conflict.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Composite Unique Constraints</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforced at the database schema level via{' '}
              <code className="text-cyan-300 font-mono">UNIQUE(userId, hackathonId)</code>. No user can ever belong to multiple teams in the same hackathon under any race condition.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deterministic Leadership Transfer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a team leader leaves, ownership automatically passes to the longest-tenured member ordered deterministically by{' '}
              <code className="text-emerald-300 font-mono">joinedAt ASC</code>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};


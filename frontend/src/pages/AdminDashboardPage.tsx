import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import {
  Shield,
  Trophy,
  Users,
  Database,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHackathons = () => {
    apiClient('/hackathons')
      .then((res) => setHackathons(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchHackathons();
  }, []);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-400">Only platform administrators can access this view.</p>
      </div>
    );
  }

  const handleCreateHackathon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await apiClient('/hackathons', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          description,
          minTeamSize,
          maxTeamSize,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      });

      setMsg({ type: 'success', text: 'Hackathon created successfully!' });
      setTitle('');
      setSlug('');
      setDescription('');
      fetchHackathons();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create hackathon' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Platform Administrator Operations</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Platform Control Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          System oversight, tournament parameters, and database state management
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Create Hackathon Form */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <span>Launch New Hackathon</span>
          </h2>

          {msg && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateHackathon} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                placeholder="Cloud Concurrency Challenge"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">URL Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="cloud-concurrency-2026"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tournament guidelines and constraints..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Min Team Size</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Team Size</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 mt-2"
            >
              {loading ? 'Publishing...' : 'Publish Tournament'}
            </button>
          </form>
        </div>

        {/* Existing Hackathons & Platform Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Registered Competitions ({hackathons.length})</span>
            </h2>

            <div className="divide-y divide-slate-800">
              {hackathons.map((h) => (
                <div key={h.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{h.title}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Slug: {h.slug} • Size: {h.minTeamSize}-{h.maxTeamSize} members
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-indigo-400 block">
                      {h.teamCount} Teams Registered
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(h.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


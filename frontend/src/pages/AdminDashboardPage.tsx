import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Shield, Trophy, Plus, CheckCircle, AlertCircle } from 'lucide-react';

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
        <h2 className="font-display text-xl font-bold text-[#f5f7f2] mb-1">Access Restricted</h2>
        <p className="text-xs text-[#9ca396]">
          Only platform administrators can access this view.
        </p>
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
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-1.5">
          <Shield className="w-4 h-4" />
          <span>Platform Administrator Operations</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
          Platform Control Center
        </h1>
        <p className="text-xs text-[#9ca396] mt-1">
          Tournament parameters, capacity rules, and database state oversight
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-[#111411] border border-white/10 rounded-xl p-6">
          <h2 className="font-display text-base font-bold text-[#f5f7f2] flex items-center gap-2 mb-4 pb-3 border-b border-white/10 uppercase tracking-wide">
            <Plus className="w-5 h-5 text-[#d4ff33]" />
            <span>Launch Hackathon</span>
          </h2>

          {msg && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-[#d4ff33]/10 border border-[#d4ff33]/30 text-[#d4ff33]'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {msg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateHackathon} className="space-y-4 text-xs">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                placeholder="Cloud Concurrency Challenge"
                className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                URL Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="cloud-concurrency-2026"
                className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] font-mono focus:border-[#d4ff33] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tournament guidelines and constraints..."
                className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                  Min Size
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] tabular-nums focus:border-[#d4ff33] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                  Max Size
                </label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] tabular-nums focus:border-[#d4ff33] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080a08] border border-white/15 rounded-lg text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 mt-2 transition-colors"
            >
              {loading ? 'Publishing...' : 'Publish Tournament'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111411] border border-white/10 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#f5f7f2] flex items-center gap-2 mb-4 pb-3 border-b border-white/10 uppercase tracking-wide">
              <Trophy className="w-5 h-5 text-[#d4ff33]" />
              <span className="tabular-nums">
                Registered Competitions ({hackathons.length})
              </span>
            </h2>

            <div className="divide-y divide-white/10">
              {hackathons.map((h) => (
                <div key={h.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#f5f7f2]">{h.title}</h3>
                    <span className="text-xs text-[#9ca396] font-mono">
                      Slug: {h.slug} · Size: {h.minTeamSize}–{h.maxTeamSize}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#d4ff33] block tabular-nums">
                      {h.teamCount} Teams Registered
                    </span>
                    <span className="text-[11px] text-[#9ca396] font-mono tabular-nums">
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



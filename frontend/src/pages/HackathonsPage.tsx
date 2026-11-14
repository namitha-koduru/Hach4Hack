import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Trophy, Calendar, Users, ArrowRight, ShieldCheck } from 'lucide-react';

export const HackathonsPage: React.FC = () => {
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/hackathons')
      .then((res) => setHackathons(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
          <Trophy className="w-4 h-4" />
          <span>Active Hackathon Tournaments</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Competitions & Challenges</h1>
        <p className="text-xs text-slate-400 mt-1">
          Each team belongs to one hackathon with strict team capacity rules enforced at the database level.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading hackathons...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl bg-[#111726] border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {h.isActive ? 'Active Tournament' : 'Concluded'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {h.teamCount} Teams
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{h.title}</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  {h.description || 'Global competitive hackathon event.'}
                </p>

                <div className="space-y-2 mb-6 p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Team Limits:
                    </span>
                    <span className="font-semibold text-white">
                      {h.minTeamSize} to {h.maxTeamSize} Members
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      Timeline:
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <Link
                  to={`/teams?hackathonId=${h.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  <span>Explore Teams</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/teams/create"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  Create Team
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { Trophy, Calendar, Users, ArrowRight } from 'lucide-react';

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
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-1.5">
          <Trophy className="w-4 h-4" />
          <span>Active Hackathon Tournaments</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
          Competitions &amp; Challenges
        </h1>
        <p className="text-xs text-[#9ca396] mt-1">
          Each team belongs to one hackathon with strict team capacity limits enforced at the database layer.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 font-mono text-xs text-[#9ca396]">
          Loading hackathons...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((h) => (
            <InteractiveTiltCard
              key={h.id}
              maxTiltDeg={6}
              className="rounded-xl bg-[#111411] border border-white/10 p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 font-mono text-[11px]">
                    <span className={h.isActive ? 'text-[#d4ff33]' : 'text-[#9ca396]'}>
                      {h.isActive ? 'ACTIVE TOURNAMENT' : 'CONCLUDED'}
                    </span>
                    <span className="text-[#9ca396] tabular-nums">{h.teamCount} Teams</span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#f5f7f2] mb-2">{h.title}</h3>
                  <p className="text-xs text-[#9ca396] mb-6 leading-relaxed">
                    {h.description || 'Global competitive hackathon event.'}
                  </p>

                  <div className="space-y-2.5 mb-6 p-3.5 rounded-lg bg-[#080a08] border border-white/10 text-xs">
                    <div className="flex items-center justify-between text-[#9ca396]">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#d4ff33]" />
                        Squad Size
                      </span>
                      <span className="font-mono font-semibold text-[#f5f7f2] tabular-nums">
                        {h.minTeamSize}–{h.maxTeamSize} Members
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#9ca396]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#d4ff33]" />
                        Timeline
                      </span>
                      <span className="font-mono text-[11px] text-[#f5f7f2] tabular-nums">
                        {new Date(h.startDate).toLocaleDateString()} –{' '}
                        {new Date(h.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <Link
                    to={`/teams?hackathonId=${h.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f5f7f2] hover:text-[#d4ff33] transition-colors"
                  >
                    <span>Explore Teams</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to="/teams/create"
                    className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                  >
                    Create Team
                  </Link>
                </div>
              </div>
            </InteractiveTiltCard>
          ))}
        </div>
      )}
    </div>
  );
};



import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { TeammateSuggestion } from '../types';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { Sparkles, AlertCircle, ArrowLeft, Users } from 'lucide-react';

export const SuggestionsPage: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const [team, setTeam] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<TeammateSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    setLoading(true);
    Promise.all([
      apiClient(`/teams/${teamId}`),
      apiClient<{ success: boolean; data: TeammateSuggestion[] }>(
        `/teams/${teamId}/suggestions?limit=20`
      ),
    ])
      .then(([teamRes, recRes]) => {
        setTeam(teamRes.data);
        setSuggestions(recRes.data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load suggestions');
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-6 border-b border-white/10">
        <Link
          to={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#9ca396] hover:text-[#d4ff33] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {team?.name || 'Team'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Factor Recommendation Engine</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
              Recommended Teammates
            </h1>
            <p className="text-xs text-[#9ca396] mt-1">
              Ranked candidates by missing skill coverage (60%) and timezone overlap (40%)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111411] border border-white/10 font-mono text-xs text-[#9ca396]">
            <span className="text-[#d4ff33] block mb-0.5 uppercase tracking-wider">
              Scoring Formula
            </span>
            <span>Total = 0.60 × Skill + 0.40 × Timezone</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-[#d4ff33] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs text-[#9ca396]">
            Computing candidate compatibility scores...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 bg-[#111411] border border-white/10 rounded-xl">
          <Users className="w-12 h-12 text-[#9ca396] mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-[#f5f7f2] mb-1">
            No eligible candidates available
          </h3>
          <p className="text-xs text-[#9ca396] max-w-md mx-auto">
            All registered participants in this hackathon have joined teams or have pending requests.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((candidate, idx) => (
            <InteractiveTiltCard
              key={candidate.userId}
              maxTiltDeg={6}
              className="rounded-xl bg-[#111411] border border-white/10 p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33] font-display font-bold tabular-nums">
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#f5f7f2]">{candidate.name}</h3>
                        <span className="text-[11px] text-[#9ca396] font-mono">
                          {candidate.timezone}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xl font-mono font-extrabold text-[#d4ff33] tabular-nums">
                        {candidate.score}%
                      </span>
                      <span className="font-mono text-[10px] text-[#9ca396] uppercase tracking-wider">
                        Match
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5 p-3.5 rounded-lg bg-[#080a08] border border-white/10">
                    <div>
                      <div className="flex justify-between font-mono text-[11px] text-[#9ca396] mb-1">
                        <span>Skill Synergy (60%)</span>
                        <span className="text-[#f5f7f2] tabular-nums">
                          {candidate.breakdown.skillScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-sm bg-[#161a16] overflow-hidden">
                        <div
                          className="h-full bg-[#d4ff33]"
                          style={{ width: `${candidate.breakdown.skillScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-mono text-[11px] text-[#9ca396] mb-1">
                        <span>
                          Timezone (Δ{candidate.breakdown.timezoneDifferenceHours}h)
                        </span>
                        <span className="text-[#f5f7f2] tabular-nums">
                          {candidate.breakdown.timezoneScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-sm bg-[#161a16] overflow-hidden">
                        <div
                          className="h-full bg-[#f5f7f2]"
                          style={{ width: `${candidate.breakdown.timezoneScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-4">
                    {candidate.breakdown.complementarySkills.length > 0 && (
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4ff33] block mb-1">
                          Fills Needed Skills
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.breakdown.complementarySkills.map((s) => (
                            <span
                              key={s}
                              className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#d4ff33]/10 text-[#d4ff33] border border-[#d4ff33]/30"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#9ca396] block mb-1">
                        Full Stack
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.map((s) => (
                          <span
                            key={s}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#161a16] border border-white/10 text-[#f5f7f2]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-center font-mono text-[11px] text-[#9ca396]">
                  Available for invite-code recruitment
                </div>
              </div>
            </InteractiveTiltCard>
          ))}
        </div>
      )}
    </div>
  );
};



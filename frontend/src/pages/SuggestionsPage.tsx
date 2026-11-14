import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { TeammateSuggestion } from '../../../shared/src';
import {
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Users,
  Compass,
  Trophy,
} from 'lucide-react';

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
      apiClient<{ success: boolean; data: TeammateSuggestion[] }>(`/teams/${teamId}/suggestions?limit=20`),
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
      {/* Header */}
      <div>
        <Link
          to={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {team?.name || 'Team'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Factor Recommendation Algorithm</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Recommended Teammates</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ranked candidates based on 60% complementary missing skill match + 40% timezone compatibility
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111726] border border-slate-800 text-xs text-slate-300">
            <span className="font-semibold text-white block mb-0.5">Transparent Scoring Formula:</span>
            <span>Total = 0.60 × (Skill Coverage) + 0.40 × (Timezone Overlap)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Computing candidate compatibility scores...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 bg-[#111726]/40 border border-slate-800 rounded-2xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No eligible candidates available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All registered participants in this hackathon have either already joined teams or have pending requests.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((candidate, idx) => (
            <div
              key={candidate.userId}
              className="relative rounded-2xl bg-[#111726] border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all"
            >
              {/* Score Rank Badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{candidate.name}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {candidate.timezone}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xl font-mono font-extrabold text-emerald-400">
                    {candidate.score}%
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Match Score
                  </span>
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div className="space-y-3 mb-5 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                {/* Skill Match Score */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                    <span>Skill Synergy (60% weight)</span>
                    <span className="text-white font-mono">{candidate.breakdown.skillScore}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${candidate.breakdown.skillScore}%` }}
                    />
                  </div>
                </div>

                {/* Timezone Score */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                    <span>
                      Timezone Overlap (Δ{candidate.breakdown.timezoneDifferenceHours}h)
                    </span>
                    <span className="text-white font-mono">{candidate.breakdown.timezoneScore}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${candidate.breakdown.timezoneScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Complementary & Candidate Skills */}
              <div className="space-y-2 mb-4">
                {candidate.breakdown.complementarySkills.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Fills Needed Team Skills:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {candidate.breakdown.complementarySkills.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                    All Skills:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-center">
                <span className="text-xs text-slate-400">
                  Available for recruitment via Invite Code
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


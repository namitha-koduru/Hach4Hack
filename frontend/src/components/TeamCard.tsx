import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Crown, Calendar, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TeamSummary } from '../../../shared/src';

interface TeamCardProps {
  team: TeamSummary;
  onRequestJoin?: (teamId: string) => void;
  isMember?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onRequestJoin, isMember = false }) => {
  const isFull = team.currentMemberCount >= team.maxMembers;
  const percentage = Math.round((team.currentMemberCount / team.maxMembers) * 100);

  // Collect skills that current team members have
  const existingSkills = Array.from(
    new Set(team.members?.flatMap((m) => m.user.skills) || [])
  );

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 p-6 ${
        isFull
          ? 'bg-slate-900/40 border-slate-800/60 opacity-90'
          : 'bg-[#111726]/90 border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {team.hackathon && (
              <span className="inline-block text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full mb-2">
                {team.hackathon.title}
              </span>
            )}
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
              <Link to={`/teams/${team.id}`} className="focus-visible:ring-indigo-500 rounded">
                {team.name}
              </Link>
            </h3>
          </div>

          {/* Seat Capacity Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
              isFull
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : team.availableSeats === 1
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {isFull
                ? 'Full'
                : `${team.availableSeats} ${team.availableSeats === 1 ? 'seat left' : 'seats left'}`}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {team.description || 'No description provided yet.'}
        </p>

        {/* Capacity Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1.5">
            <span>Team Capacity</span>
            <span>
              {team.currentMemberCount} / {team.maxMembers} Members
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFull
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                  : team.availableSeats === 1
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Required Skills Chips */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Looking for Skills:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Team Leader & Existing Roster summary */}
        {team.leader && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Led by <strong className="text-slate-200">{team.leader.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <Link
          to={`/teams/${team.id}`}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          View Roster & Details
        </Link>

        {isMember ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Your Team
          </span>
        ) : team.userRequestStatus === 'PENDING' ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Request Pending
          </span>
        ) : isFull ? (
          <span className="text-xs font-medium text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800">
            Team Full
          </span>
        ) : onRequestJoin ? (
          <button
            onClick={() => onRequestJoin(team.id)}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Request to Join
          </button>
        ) : (
          <Link
            to={`/teams/${team.id}`}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-all"
          >
            Request to Join
          </Link>
        )}
      </div>
    </div>
  );
};


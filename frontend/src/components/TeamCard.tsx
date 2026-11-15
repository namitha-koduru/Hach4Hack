import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';
import { TeamSummary } from '../types';
import { InteractiveTiltCard } from './InteractiveTiltCard';

interface TeamCardProps {
  team: TeamSummary;
  onRequestJoin?: (teamId: string) => void;
  isMember?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onRequestJoin, isMember = false }) => {
  const isFull = team.currentMemberCount >= team.maxMembers;
  const percentage = Math.round((team.currentMemberCount / team.maxMembers) * 100);

  const seatLabel = isFull
    ? 'Full'
    : `${team.availableSeats} ${team.availableSeats === 1 ? 'seat left' : 'seats left'}`;

  return (
    <InteractiveTiltCard
      maxTiltDeg={6}
      className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
        isFull
          ? 'bg-[#111411]/60 border-white/10 opacity-85'
          : 'bg-[#111411] border-white/10 hover:border-[#d4ff33]/40'
      }`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Unboxed Inline Meta */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#9ca396] truncate">
              {team.hackathon ? team.hackathon.title : 'Open Track'} ·{' '}
              <span
                className={
                  isFull
                    ? 'text-rose-400'
                    : team.availableSeats === 1
                    ? 'text-amber-300'
                    : 'text-[#d4ff33]'
                }
              >
                {seatLabel}
              </span>
            </span>

            <span className="font-mono text-xs tabular-nums text-[#f5f7f2] shrink-0">
              {team.currentMemberCount}/{team.maxMembers}
            </span>
          </div>

          <h3 className="font-display text-xl font-bold text-[#f5f7f2] tracking-tight mb-2">
            <Link
              to={`/teams/${team.id}`}
              className="hover:text-[#d4ff33] transition-colors inline-flex items-center gap-1.5"
            >
              <span>{team.name}</span>
              <ArrowUpRight className="w-4 h-4 opacity-60" />
            </Link>
          </h3>

          <p className="text-xs text-[#9ca396] line-clamp-2 mb-5 leading-relaxed">
            {team.description || 'No description provided yet.'}
          </p>

          {/* Capacity Progress */}
          <div className="mb-5">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              <span>Roster Capacity</span>
              <span className="tabular-nums">{percentage}% filled</span>
            </div>
            <div className="w-full h-1.5 rounded-sm bg-[#161a16] overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-500 ${
                  isFull
                    ? 'bg-rose-500'
                    : team.availableSeats === 1
                    ? 'bg-amber-400'
                    : 'bg-[#d4ff33]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Required Skills */}
          <div className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#9ca396] mb-2">
              Target Stack
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-[#161a16] text-[#f5f7f2] border border-white/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          {team.leader && (
            <div className="flex items-center gap-2 text-xs text-[#9ca396] mb-4 px-3 py-2 rounded-lg bg-[#080a08] border border-white/10">
              <Crown className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
              <span className="truncate">
                Led by <strong className="text-[#f5f7f2] font-semibold">{team.leader.name}</strong>
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <Link
              to={`/teams/${team.id}`}
              className="text-xs font-semibold text-[#9ca396] hover:text-[#f5f7f2] transition-colors"
            >
              View Roster →
            </Link>

            {isMember ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-bold text-[#d4ff33]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Your Team
              </span>
            ) : team.userRequestStatus === 'PENDING' ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            ) : isFull ? (
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9ca396]">
                Roster Closed
              </span>
            ) : onRequestJoin ? (
              <button
                type="button"
                onClick={() => onRequestJoin(team.id)}
                className="text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] px-4 py-2 rounded-lg transition-colors"
              >
                Request Join
              </button>
            ) : (
              <Link
                to={`/teams/${team.id}`}
                className="text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] px-4 py-2 rounded-lg transition-colors"
              >
                Request Join
              </Link>
            )}
          </div>
        </div>
      </div>
    </InteractiveTiltCard>
  );
};



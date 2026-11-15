import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { InviteModal } from '../components/InviteModal';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import {
  Users,
  Crown,
  KeyRound,
  LogOut,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
  Plus,
  AlertCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [activeTeamDetails, setActiveTeamDetails] = useState<any>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const leaveKeyRef = useRef<{ teamId: string; key: string } | null>(null);

  const activeMembership =
    user?.memberships && user.memberships.length > 0 ? user.memberships[0] : null;
  const isLeader = activeMembership?.role === 'LEADER';

  useEffect(() => {
    if (activeMembership?.teamId) {
      apiClient(`/teams/${activeMembership.teamId}`)
        .then((res) => setActiveTeamDetails(res.data))
        .catch(console.error);
    } else {
      setActiveTeamDetails(null);
    }
  }, [activeMembership?.teamId]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      refreshUser();
      if (activeMembership?.teamId) {
        apiClient(`/teams/${activeMembership.teamId}`).then((res) =>
          setActiveTeamDetails(res.data)
        );
      }
    };

    socket.on('team:updated', handleUpdate);
    socket.on('member:joined', handleUpdate);
    socket.on('member:left', handleUpdate);
    socket.on('member:removed', handleUpdate);
    socket.on('leader:changed', handleUpdate);
    socket.on('team:deleted', () => {
      refreshUser();
      setActiveTeamDetails(null);
    });

    return () => {
      socket.off('team:updated', handleUpdate);
      socket.off('member:joined', handleUpdate);
      socket.off('member:left', handleUpdate);
      socket.off('member:removed', handleUpdate);
      socket.off('leader:changed', handleUpdate);
      socket.off('team:deleted');
    };
  }, [socket, activeMembership?.teamId, refreshUser]);

  const handleLeaveTeam = async () => {
    if (!activeMembership?.teamId) return;
    const teamId = activeMembership.teamId;
    if (!leaveKeyRef.current || leaveKeyRef.current.teamId !== teamId) {
      leaveKeyRef.current = { teamId, key: generateIdempotencyKey() };
    }

    setLeaveLoading(true);
    setLeaveError(null);
    try {
      await apiClient(`/teams/${teamId}/leave`, {
        method: 'POST',
        idempotencyKey: leaveKeyRef.current.key,
      });
      leaveKeyRef.current = null;
      await refreshUser();
      setActiveTeamDetails(null);
      setConfirmLeave(false);
    } catch (err: any) {
      setLeaveError(err.message || 'Failed to leave team');
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-xl bg-[#111411] border border-white/15">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Participant Command Center</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            Welcome, {user?.name}
          </h1>
          <p className="font-mono text-xs text-[#9ca396] mt-1">
            {user?.timezone} · {user?.preferredRoles.join(', ') || 'Builder'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRedeemModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#161a16] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/15 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[#d4ff33]" />
            Redeem Invite
          </button>

          {!activeMembership && (
            <Link
              to="/teams/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Create Team
            </Link>
          )}
        </div>
      </div>

      {leaveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{leaveError}</span>
        </div>
      )}

      {confirmLeave && (
        <div className="p-4 rounded-xl bg-[#111411] border border-[#d4ff33]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#f5f7f2]">
            {isLeader && activeTeamDetails?.members?.length > 1
              ? 'You are the LEADER. Leaving transfers leadership atomically to the oldest remaining member. Proceed?'
              : 'Confirm leaving your current squad?'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs text-[#9ca396] bg-[#161a16] border border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLeaveTeam}
              disabled={leaveLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
            >
              {leaveLoading ? 'Leaving...' : 'Confirm Leave'}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Current Team */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111411] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <h2 className="font-display text-base font-bold text-[#f5f7f2] flex items-center gap-2 uppercase tracking-wide">
                <Users className="w-5 h-5 text-[#d4ff33]" />
                <span>Your Current Team</span>
              </h2>
              {activeMembership && (
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#d4ff33]">
                  {isLeader ? 'Leader' : 'Member'}
                </span>
              )}
            </div>

            {activeTeamDetails ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#d4ff33] block mb-1">
                      {activeTeamDetails.hackathon?.title}
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-[#f5f7f2]">
                      {activeTeamDetails.name}
                    </h3>
                    <p className="text-xs text-[#9ca396] mt-1 max-w-xl">
                      {activeTeamDetails.description || 'No description provided'}
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#9ca396] block mb-1">
                      Capacity
                    </span>
                    <span className="text-xl font-mono font-bold text-[#f5f7f2] tabular-nums">
                      {activeTeamDetails.currentMemberCount} / {activeTeamDetails.maxMembers}
                    </span>
                    <span className="font-mono text-[11px] text-[#d4ff33] block mt-0.5 tabular-nums">
                      {activeTeamDetails.availableSeats} seats left
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-mono text-[11px] text-[#9ca396] uppercase tracking-wider mb-3">
                    Active Team Roster ({activeTeamDetails.members?.length})
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeTeamDetails.members?.map((m: any) => (
                      <InteractiveTiltCard
                        key={m.id}
                        maxTiltDeg={5}
                        className="p-3.5 rounded-xl bg-[#080a08] border border-white/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33] font-display font-bold text-xs shrink-0 mt-0.5">
                            {m.user?.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#f5f7f2] truncate">
                                {m.user?.name}
                              </span>
                              {m.role === 'LEADER' && (
                                <Crown className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
                              )}
                            </div>
                            <span className="text-[11px] text-[#9ca396] block font-mono">
                              {m.user?.timezone}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {m.user?.skills.slice(0, 3).map((s: string) => (
                                <span
                                  key={s}
                                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#161a16] border border-white/10 text-[#f5f7f2]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </InteractiveTiltCard>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/teams/${activeTeamDetails.id}`}
                      className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                    >
                      Team Details &amp; Audit
                    </Link>

                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => setInviteModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#f5f7f2] bg-[#161a16] hover:border-[#d4ff33]/50 border border-white/15 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#d4ff33]" />
                        Invite Code
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    disabled={leaveLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Team
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-xl bg-[#080a08] border border-white/10 flex items-center justify-center text-[#9ca396] mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-bold text-[#f5f7f2] mb-1">
                  You are not currently in a team
                </h3>
                <p className="text-xs text-[#9ca396] max-w-md mx-auto mb-6">
                  Browse open teams looking for your skills, or create your own squad and invite collaborators.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/teams"
                    className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                  >
                    Explore Open Teams
                  </Link>
                  <Link
                    to="/teams/create"
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#161a16] text-[#f5f7f2] border border-white/15 hover:border-[#d4ff33]/50 transition-colors"
                  >
                    Create Squad
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Pending Requests & Suggestions */}
        <div className="space-y-6">
          <div className="bg-[#111411] border border-white/10 rounded-xl p-6">
            <h2 className="font-display text-sm font-bold text-[#f5f7f2] flex items-center gap-2 mb-4 pb-3 border-b border-white/10 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-[#d4ff33]" />
              <span>Pending Requests</span>
            </h2>

            {user?.pendingRequests && user.pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {user.pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg bg-[#080a08] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#f5f7f2]">{req.team.name}</h4>
                      <span className="font-mono text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Awaiting Leader
                      </span>
                    </div>
                    <Link
                      to="/requests"
                      className="font-mono text-xs font-semibold text-[#d4ff33] hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9ca396] text-center py-4">
                No active outgoing join requests.
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <Link
                to="/requests"
                className="text-xs font-semibold text-[#9ca396] hover:text-[#d4ff33] inline-flex items-center gap-1.5 transition-colors"
              >
                <Inbox className="w-3.5 h-3.5 text-[#d4ff33]" />
                <span>Open Requests Dispatcher</span>
              </Link>
            </div>
          </div>

          {activeTeamDetails && (
            <InteractiveTiltCard
              maxTiltDeg={7}
              className="bg-[#111411] border border-[#d4ff33]/35 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 font-mono text-[#d4ff33] text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Smart Matchmaker</span>
              </div>
              <h3 className="font-display text-base font-bold text-[#f5f7f2] mb-2">
                Find Compatible Members
              </h3>
              <p className="text-xs text-[#9ca396] mb-4 leading-relaxed">
                Scores candidates across missing squad skills (60%) and timezone overlap (40%).
              </p>
              <Link
                to={`/teams/${activeTeamDetails.id}/suggestions`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
              >
                <span>View Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </InteractiveTiltCard>
          )}
        </div>
      </div>

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        teamId={activeTeamDetails?.id}
      />
      <InviteModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        onSuccess={refreshUser}
      />
    </div>
  );
};


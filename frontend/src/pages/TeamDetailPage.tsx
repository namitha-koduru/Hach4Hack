import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { InviteModal } from '../components/InviteModal';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import {
  Users,
  Crown,
  Sparkles,
  KeyRound,
  LogOut,
  Trash2,
  UserMinus,
  Activity,
  AlertCircle,
} from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const { socket, joinTeam, leaveTeam: leaveTeamSocket } = useSocket();
  const navigate = useNavigate();

  const [team, setTeam] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'audit'>('roster');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'leave' }
    | { type: 'delete' }
    | { type: 'remove'; userId: string; name: string }
    | null
  >(null);
  const actionKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;
    try {
      const [teamRes, auditRes] = await Promise.all([
        apiClient(`/teams/${teamId}`),
        apiClient(`/teams/${teamId}/audit`).catch(() => ({ data: [] })),
      ]);
      setTeam(teamRes.data);
      setAuditLogs(auditRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load team details');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  useEffect(() => {
    if (!socket || !teamId) return;

    joinTeam(teamId);

    const handleTeamUpdate = () => {
      fetchTeamData();
      refreshUser();
    };

    socket.on('team:updated', handleTeamUpdate);
    socket.on('member:joined', handleTeamUpdate);
    socket.on('member:left', handleTeamUpdate);
    socket.on('member:removed', handleTeamUpdate);
    socket.on('leader:changed', handleTeamUpdate);
    socket.on('team:deleted', () => {
      navigate('/teams');
    });

    return () => {
      leaveTeamSocket(teamId);
      socket.off('team:updated', handleTeamUpdate);
      socket.off('member:joined', handleTeamUpdate);
      socket.off('member:left', handleTeamUpdate);
      socket.off('member:removed', handleTeamUpdate);
      socket.off('leader:changed', handleTeamUpdate);
      socket.off('team:deleted');
    };
  }, [socket, teamId, joinTeam, leaveTeamSocket, fetchTeamData, refreshUser, navigate]);

  const isMember = team?.members?.some((m: any) => m.userId === user?.id);
  const isLeader = team?.leader?.id === user?.id || user?.role === 'ADMIN';

  const executeConfirmedAction = async () => {
    if (!teamId || !confirmAction) return;

    const sig =
      confirmAction.type === 'remove'
        ? `${confirmAction.type}:${teamId}:${confirmAction.userId}`
        : `${confirmAction.type}:${teamId}`;
    if (!actionKeyRef.current || actionKeyRef.current.signature !== sig) {
      actionKeyRef.current = { signature: sig, key: generateIdempotencyKey() };
    }

    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmAction.type === 'leave') {
        await apiClient(`/teams/${teamId}/leave`, {
          method: 'POST',
          idempotencyKey: actionKeyRef.current.key,
        });
        actionKeyRef.current = null;
        await refreshUser();
        navigate('/dashboard');
      } else if (confirmAction.type === 'remove') {
        await apiClient(`/teams/${teamId}/members/${confirmAction.userId}`, {
          method: 'DELETE',
          idempotencyKey: actionKeyRef.current.key,
        });
        actionKeyRef.current = null;
        setConfirmAction(null);
        await fetchTeamData();
      } else if (confirmAction.type === 'delete') {
        await apiClient(`/teams/${teamId}`, { method: 'DELETE' });
        actionKeyRef.current = null;
        await refreshUser();
        navigate('/teams');
      }
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-[#d4ff33] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-xs text-[#9ca396]">Loading team details...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-[#f5f7f2] mb-2">Team Not Found</h2>
        <p className="text-xs text-[#9ca396] mb-6">
          {error || 'This team does not exist or was deleted.'}
        </p>
        <Link
          to="/teams"
          className="inline-block px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] text-[#080a08]"
        >
          Back to Team Board
        </Link>
      </div>
    );
  }

  const isFull = team.currentMemberCount >= team.maxMembers;
  const percentage = Math.round((team.currentMemberCount / team.maxMembers) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Action Feedback / Confirmation Bar */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {confirmAction && (
        <div className="p-4 rounded-xl bg-[#111411] border border-[#d4ff33]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#f5f7f2]">
            {confirmAction.type === 'leave' &&
              (isLeader && team?.members?.length > 1
                ? 'You are the leader. Leaving will transfer leadership automatically to the oldest member. Continue?'
                : 'Confirm leaving this team?')}
            {confirmAction.type === 'remove' &&
              `Confirm removing ${confirmAction.name} from the squad?`}
            {confirmAction.type === 'delete' &&
              'Confirm permanently deleting this team? This action cannot be undone.'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#9ca396] bg-[#161a16] border border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={executeConfirmedAction}
              className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-[#111411] border border-white/10 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#9ca396] mb-2">
              <span className="text-[#d4ff33]">{team.hackathon?.title}</span> · Created{' '}
              {new Date(team.createdAt).toLocaleDateString()}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
              {team.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#9ca396] mt-2 max-w-2xl leading-relaxed">
              {team.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isLeader && (
              <>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#161a16] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/15 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-[#d4ff33]" />
                  Invite Code
                </button>

                <Link
                  to={`/teams/${team.id}/suggestions`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Match Teammates
                </Link>

                <button
                  type="button"
                  onClick={() => setConfirmAction({ type: 'delete' })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                  title="Delete Team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {isMember && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: 'leave' })}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Team
              </button>
            )}
          </div>
        </div>

        {/* Capacity & Skills */}
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          <div>
            <div className="flex justify-between font-mono text-xs text-[#9ca396] mb-2">
              <span className="uppercase tracking-wider">Roster Capacity</span>
              <span className="text-[#f5f7f2] tabular-nums">
                {team.currentMemberCount} / {team.maxMembers} Members ({team.availableSeats}{' '}
                available)
              </span>
            </div>
            <div className="w-full h-2 rounded-sm bg-[#161a16] overflow-hidden border border-white/10">
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

          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#9ca396] block mb-2">
              Required Stack
            </span>
            <div className="flex flex-wrap gap-1.5">
              {team.requiredSkills?.map((skill: string) => (
                <span
                  key={skill}
                  className="font-mono text-xs px-2.5 py-1 rounded bg-[#161a16] text-[#f5f7f2] border border-white/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'roster'
              ? 'border-[#d4ff33] text-[#d4ff33]'
              : 'border-transparent text-[#9ca396] hover:text-[#f5f7f2]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="tabular-nums">Active Roster ({team.members?.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'audit'
              ? 'border-[#d4ff33] text-[#d4ff33]'
              : 'border-transparent text-[#9ca396] hover:text-[#f5f7f2]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="tabular-nums">Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.members?.map((member: any) => {
            const isMemberLeader = member.role === 'LEADER';
            return (
              <InteractiveTiltCard
                key={member.id}
                maxTiltDeg={6}
                className="bg-[#111411] border border-white/10 rounded-xl p-6 flex flex-col justify-between"
              >
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33] font-display font-bold">
                          {member.user?.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#f5f7f2] flex items-center gap-1.5">
                            <span>{member.user?.name}</span>
                            {isMemberLeader && (
                              <span title="Team Leader">
                                <Crown className="w-4 h-4 text-[#d4ff33]" />
                              </span>
                            )}
                          </h3>
                          <span className="text-[11px] text-[#9ca396] font-mono">
                            {member.user?.timezone} · {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#9ca396] mb-4 line-clamp-2">
                      {member.user?.bio || 'No bio provided'}
                    </p>

                    <div className="space-y-2">
                      <span className="font-mono text-[10px] text-[#9ca396] uppercase tracking-wider block">
                        Skills
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {member.user?.skills?.map((s: string) => (
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

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-[#9ca396]">
                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                    {isLeader && !isMemberLeader && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            type: 'remove',
                            userId: member.userId,
                            name: member.user.name,
                          })
                        }
                        className="text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </InteractiveTiltCard>
            );
          })}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-[#111411] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 bg-[#161a16] border-b border-white/10 font-mono text-xs text-[#9ca396] uppercase tracking-wider">
            Immutable Transactional Audit History
          </div>
          <div className="divide-y divide-white/10">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9ca396]">
                No audit events recorded yet.
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33] shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#d4ff33]">
                          {log.action}
                        </span>
                        {log.actor && (
                          <span className="text-xs text-[#f5f7f2]">
                            by <strong>{log.actor.name}</strong>
                          </span>
                        )}
                      </div>
                      {log.targetUser && (
                        <span className="text-xs text-[#9ca396] block mt-0.5">
                          Target: {log.targetUser.name} ({log.targetUser.email})
                        </span>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[11px] text-[#9ca396] font-mono mt-1.5 bg-[#080a08] p-2 rounded border border-white/10">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-[#9ca396] font-mono shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        teamId={team.id}
      />
    </div>
  );
};


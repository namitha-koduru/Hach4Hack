import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { InviteModal } from '../components/InviteModal';
import {
  Users,
  Crown,
  Calendar,
  Sparkles,
  KeyRound,
  LogOut,
  Trash2,
  UserMinus,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  // WebSocket Room & Live Event Subscription
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
      alert('This team has been deleted.');
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

  const handleLeaveTeam = async () => {
    if (!teamId) return;
    const confirmMsg = isLeader && team?.members?.length > 1
      ? 'You are the leader. Leaving will automatically transfer leadership to the next oldest member. Continue?'
      : 'Are you sure you want to leave this team?';

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await apiClient(`/teams/${teamId}/leave`, { method: 'POST' });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to leave team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!teamId) return;
    if (!window.confirm(`Are you sure you want to remove ${targetName} from the team?`)) return;

    setActionLoading(true);
    try {
      await apiClient(`/teams/${teamId}/members/${targetUserId}`, { method: 'DELETE' });
      await fetchTeamData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    if (!window.confirm('Are you sure you want to permanently delete this team? This action cannot be undone.')) return;

    setActionLoading(true);
    try {
      await apiClient(`/teams/${teamId}`, { method: 'DELETE' });
      await refreshUser();
      navigate('/teams');
    } catch (err: any) {
      alert(err.message || 'Failed to delete team');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-400">Loading team details...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Team Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'This team does not exist or was deleted.'}</p>
        <Link to="/teams" className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white">
          Back to Teams Board
        </Link>
      </div>
    );
  }

  const isFull = team.currentMemberCount >= team.maxMembers;
  const percentage = Math.round((team.currentMemberCount / team.maxMembers) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Team Header Card */}
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                {team.hackathon?.title}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">
                Created {new Date(team.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{team.name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {team.description || 'No description provided.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isLeader && (
              <>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  Invite Code
                </button>

                <Link
                  to={`/teams/${team.id}/suggestions`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Match Teammates
                </Link>

                <button
                  onClick={handleDeleteTeam}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                  title="Delete Team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {isMember && (
              <button
                onClick={handleLeaveTeam}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Team
              </button>
            )}
          </div>
        </div>

        {/* Capacity Bar & Skills */}
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>Roster Capacity</span>
              <span className="font-mono">
                {team.currentMemberCount} / {team.maxMembers} Members ({team.availableSeats} available)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull
                    ? 'bg-rose-500'
                    : team.availableSeats === 1
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2">Required Skills</span>
            <div className="flex flex-wrap gap-1.5">
              {team.requiredSkills?.map((skill: string) => (
                <span
                  key={skill}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'roster'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Roster ({team.members?.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Roster */}
      {activeTab === 'roster' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.members?.map((member: any) => {
            const isMemberLeader = member.role === 'LEADER';
            return (
              <div
                key={member.id}
                className="bg-[#111726] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                        {member.user?.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{member.user?.name}</span>
                          {isMemberLeader && (
                            <span title="Team Leader">
                              <Crown className="w-4 h-4 text-amber-400" />
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {member.user?.timezone}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isMemberLeader
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                    {member.user?.bio || 'No bio provided'}
                  </p>

                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.user?.skills?.map((s: string) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  {isLeader && !isMemberLeader && (
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.user.name)}
                      className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="bg-[#111726] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs font-semibold text-slate-400">
            Immutable Transactional Audit History (Recorded Atomically with Operations)
          </div>
          <div className="divide-y divide-slate-800">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No audit events recorded yet.</div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {log.action}
                        </span>
                        {log.actor && (
                          <span className="text-xs text-slate-300">
                            by <strong>{log.actor.name}</strong>
                          </span>
                        )}
                      </div>
                      {log.targetUser && (
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Target: {log.targetUser.name} ({log.targetUser.email})
                        </span>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[11px] text-slate-400 font-mono mt-1 bg-slate-900/80 p-2 rounded border border-slate-800">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invite Code Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        teamId={team.id}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient } from '../services/api';
import { InviteModal } from '../components/InviteModal';
import {
  Users,
  Trophy,
  Crown,
  KeyRound,
  LogOut,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [activeTeamDetails, setActiveTeamDetails] = useState<any>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const activeMembership = user?.memberships && user.memberships.length > 0 ? user.memberships[0] : null;
  const isLeader = activeMembership?.role === 'LEADER';

  // Fetch full team data if in a team
  useEffect(() => {
    if (activeMembership?.teamId) {
      apiClient(`/teams/${activeMembership.teamId}`)
        .then((res) => setActiveTeamDetails(res.data))
        .catch(console.error);
    } else {
      setActiveTeamDetails(null);
    }
  }, [activeMembership?.teamId]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      refreshUser();
      if (activeMembership?.teamId) {
        apiClient(`/teams/${activeMembership.teamId}`).then((res) => setActiveTeamDetails(res.data));
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
    const confirmText = isLeader && activeTeamDetails?.members?.length > 1
      ? 'You are the LEADER. Leaving will transfer leadership to the oldest remaining member. Proceed?'
      : 'Are you sure you want to leave this team?';

    if (!window.confirm(confirmText)) return;

    setLeaveLoading(true);
    try {
      await apiClient(`/teams/${activeMembership.teamId}/leave`, { method: 'POST' });
      await refreshUser();
      setActiveTeamDetails(null);
    } catch (err: any) {
      alert(err.message || 'Failed to leave team');
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Participant Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Timezone: <span className="text-slate-200 font-mono">{user?.timezone}</span> • Roles:{' '}
            <span className="text-slate-200">{user?.preferredRoles.join(', ')}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRedeemModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            Redeem Invite Code
          </button>

          {!activeMembership && (
            <Link
              to="/teams/create"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Create Team
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Current Team Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Your Current Team</span>
              </h2>
              {activeMembership && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {isLeader ? 'Leader' : 'Member'}
                </span>
              )}
            </div>

            {activeTeamDetails ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-indigo-400 font-medium block mb-1">
                      {activeTeamDetails.hackathon?.title}
                    </span>
                    <h3 className="text-2xl font-extrabold text-white">
                      {activeTeamDetails.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {activeTeamDetails.description || 'No description provided'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Capacity</span>
                    <span className="text-xl font-mono font-bold text-white">
                      {activeTeamDetails.currentMemberCount} / {activeTeamDetails.maxMembers}
                    </span>
                    <span className="text-[11px] text-emerald-400 block mt-0.5">
                      {activeTeamDetails.availableSeats} seats remaining
                    </span>
                  </div>
                </div>

                {/* Team Members List */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Active Team Roster ({activeTeamDetails.members?.length})
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeTeamDetails.members?.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
                          {m.user?.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {m.user?.name}
                            </span>
                            {m.role === 'LEADER' && (
                              <span title="Team Leader">
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {m.user?.timezone}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.user?.skills.slice(0, 3).map((s: string) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Actions */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/teams/${activeTeamDetails.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
                    >
                      Team Details & Audit History
                    </Link>

                    {isLeader && (
                      <button
                        onClick={() => setInviteModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        Invite Code
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleLeaveTeam}
                    disabled={leaveLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {leaveLoading ? 'Processing...' : 'Leave Team'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  You are not currently in a team
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Browse open teams looking for your skills, or create your own team and invite collaborators.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/teams"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Explore Open Teams
                  </Link>
                  <Link
                    to="/teams/create"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    Create a Team
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Pending Requests & Quick Links */}
        <div className="space-y-6">
          {/* Pending Join Requests */}
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Your Pending Requests</span>
            </h2>

            {user?.pendingRequests && user.pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {user.pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{req.team.name}</h4>
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Awaiting Leader Decision
                      </span>
                    </div>
                    <Link
                      to="/requests"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No active outgoing join requests.
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <Link
                to="/requests"
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
              >
                <Inbox className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Requests Manager</span>
              </Link>
            </div>
          </div>

          {/* Complementary Suggestions Shortcut */}
          {activeTeamDetails && (
            <div className="bg-gradient-to-br from-indigo-950/30 to-[#111726] border border-indigo-500/20 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Smart Teammate Matching</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Find Compatible Members</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Our recommendation engine analyzes missing skills (60%) and timezone overlap (40%) to surface ideal candidates.
              </p>
              <Link
                to={`/teams/${activeTeamDetails.id}/suggestions`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                <span>View Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

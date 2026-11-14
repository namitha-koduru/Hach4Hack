import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import {
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  User,
  Crown,
  RefreshCw,
} from 'lucide-react';

export const JoinRequestsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const activeMembership = user?.memberships && user.memberships.length > 0 ? user.memberships[0] : null;
  const isLeader = activeMembership?.role === 'LEADER';

  const fetchIncoming = useCallback(async () => {
    if (!isLeader || !activeMembership?.teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient(`/teams/${activeMembership.teamId}/requests`);
      setIncomingRequests(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incoming requests');
    } finally {
      setLoading(false);
    }
  }, [isLeader, activeMembership?.teamId]);

  useEffect(() => {
    fetchIncoming();
  }, [fetchIncoming]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    const handleReqEvent = () => {
      fetchIncoming();
      refreshUser();
    };

    socket.on('request:created', handleReqEvent);
    socket.on('request:accepted', handleReqEvent);
    socket.on('request:declined', handleReqEvent);

    return () => {
      socket.off('request:created', handleReqEvent);
      socket.off('request:accepted', handleReqEvent);
      socket.off('request:declined', handleReqEvent);
    };
  }, [socket, fetchIncoming, refreshUser]);

  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await apiClient(`/requests/${requestId}/accept`, {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
      });
      await fetchIncoming();
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request. Team may be full or applicant joined another team.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await apiClient(`/requests/${requestId}/decline`, { method: 'POST' });
      await fetchIncoming();
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOutgoing = async (requestId: string) => {
    if (!window.confirm('Cancel this pending request?')) return;
    setActionLoadingId(requestId);
    try {
      await apiClient(`/requests/${requestId}`, { method: 'DELETE' });
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Inbox className="w-4 h-4" />
            <span>Join Requests Dispatcher</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Manage Join Requests</h1>
        </div>

        <button
          onClick={() => {
            fetchIncoming();
            refreshUser();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Section 1: Incoming Requests (If Team Leader) */}
      {isLeader && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Crown className="w-4 h-4 text-amber-400" />
            <h2>Incoming Applications for Your Team ({incomingRequests.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading incoming requests...</div>
          ) : incomingRequests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111726]/40 border border-slate-800 text-center text-xs text-slate-400">
              No pending applications at the moment.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#111726] border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                          {req.user?.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{req.user?.name}</h3>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {req.user?.timezone} • {req.user?.preferredRoles?.join(', ')}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    </div>

                    {req.message && (
                      <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 my-3 italic">
                        &quot;{req.message}&quot;
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-4">
                      {req.user?.skills?.map((s: string) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                    >
                      {actionLoadingId === req.id ? 'Claiming Seat...' : 'Accept Member'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Outgoing Requests (Participant) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Send className="w-4 h-4 text-cyan-400" />
          <h2>Your Outgoing Join Requests ({user?.pendingRequests?.length || 0})</h2>
        </div>

        {!user?.pendingRequests || user.pendingRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111726]/40 border border-slate-800 text-center text-xs text-slate-400">
            You do not have any pending outgoing join requests.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {user.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-[#111726] border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{req.team.name}</h3>
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Team Leader Review
                  </span>
                </div>

                <button
                  onClick={() => handleCancelOutgoing(req.id)}
                  disabled={actionLoadingId === req.id}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


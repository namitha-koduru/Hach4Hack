import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { Inbox, Clock, Send, AlertCircle, Crown, RefreshCw } from 'lucide-react';

export const JoinRequestsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const actionKeysRef = useRef<Record<string, string>>({});

  const activeMembership =
    user?.memberships && user.memberships.length > 0 ? user.memberships[0] : null;
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

  const getActionKey = (action: string, id: string) => {
    const cacheKey = `${action}:${id}`;
    if (!actionKeysRef.current[cacheKey]) {
      actionKeysRef.current[cacheKey] = generateIdempotencyKey();
    }
    return actionKeysRef.current[cacheKey];
  };

  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    setError(null);
    const idempotencyKey = getActionKey('accept', requestId);
    try {
      await apiClient(`/requests/${requestId}/accept`, {
        method: 'POST',
        idempotencyKey,
      });
      delete actionKeysRef.current[`accept:${requestId}`];
      await fetchIncoming();
      await refreshUser();
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to accept request. Team may be full or applicant joined another team.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoadingId(requestId);
    setError(null);
    const idempotencyKey = getActionKey('decline', requestId);
    try {
      await apiClient(`/requests/${requestId}/decline`, {
        method: 'POST',
        idempotencyKey,
      });
      delete actionKeysRef.current[`decline:${requestId}`];
      await fetchIncoming();
    } catch (err: any) {
      setError(err.message || 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOutgoing = async (requestId: string) => {
    setActionLoadingId(requestId);
    setError(null);
    try {
      await apiClient(`/requests/${requestId}`, { method: 'DELETE' });
      setConfirmCancelId(null);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-1.5">
            <Inbox className="w-4 h-4" />
            <span>Join Requests Dispatcher</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            Manage Join Requests
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchIncoming();
            refreshUser();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider text-[#f5f7f2] bg-[#111411] hover:border-[#d4ff33]/50 border border-white/15 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#d4ff33]" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLeader && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[#f5f7f2]">
            <Crown className="w-4 h-4 text-[#d4ff33]" />
            <h2 className="tabular-nums">
              Incoming Applications ({incomingRequests.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center font-mono text-xs text-[#9ca396]">
              Loading incoming requests...
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111411] border border-white/10 text-center text-xs text-[#9ca396]">
              No pending applications at the moment.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <InteractiveTiltCard
                  key={req.id}
                  maxTiltDeg={5}
                  className="p-5 rounded-xl bg-[#111411] border border-white/10"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33] font-display font-bold text-sm">
                            {req.user?.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#f5f7f2]">{req.user?.name}</h3>
                            <span className="text-[11px] text-[#9ca396] font-mono">
                              {req.user?.timezone} · {req.user?.preferredRoles?.join(', ')}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
                          Pending
                        </span>
                      </div>

                      {req.message && (
                        <p className="text-xs text-[#f5f7f2]/85 bg-[#080a08] p-3 rounded-lg border border-white/10 my-3 italic">
                          &quot;{req.message}&quot;
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-4">
                        {req.user?.skills?.map((s: string) => (
                          <span
                            key={s}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#161a16] border border-white/10 text-[#f5f7f2]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleDecline(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                      >
                        {actionLoadingId === req.id ? 'Claiming...' : 'Accept Member'}
                      </button>
                    </div>
                  </div>
                </InteractiveTiltCard>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[#f5f7f2]">
          <Send className="w-4 h-4 text-[#d4ff33]" />
          <h2 className="tabular-nums">
            Outgoing Join Requests ({user?.pendingRequests?.length || 0})
          </h2>
        </div>

        {!user?.pendingRequests || user.pendingRequests.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#111411] border border-white/10 text-center text-xs text-[#9ca396]">
            You do not have any pending outgoing join requests.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {user.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-xl bg-[#111411] border border-white/10 flex items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-[#f5f7f2]">{req.team.name}</h3>
                  <span className="font-mono text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Leader Review
                  </span>
                </div>

                {confirmCancelId === req.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-[#9ca396] bg-[#161a16]"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelOutgoing(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelId(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#9ca396] hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-colors"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



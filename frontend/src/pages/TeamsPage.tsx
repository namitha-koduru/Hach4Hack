import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { TeamCard } from '../components/TeamCard';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { TeamSummary, AnnouncementSummary } from '../types';
import {
  Search,
  Filter,
  RefreshCw,
  Users,
  Compass,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Send,
  Radio,
  Megaphone,
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, joinHackathon } = useSocket();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [hasSeats, setHasSeats] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);

  // Join Request Modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const joinReqKeyRef = useRef<{ signature: string; key: string } | null>(null);

  // Tab & Announcements State
  const [activeTab, setActiveTab] = useState<'teams' | 'announcements'>('teams');
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [hackathons, setHackathons] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');

  useEffect(() => {
    apiClient<{ success: boolean; data: Array<{ id: string; title: string }> }>('/hackathons')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setHackathons(res.data);
          setSelectedHackathonId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedHackathonId) return;
    setAnnouncementLoading(true);
    try {
      const res = await apiClient<{ success: boolean; data: AnnouncementSummary[] }>(
        `/hackathons/${selectedHackathonId}/announcements?limit=50`
      );
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setAnnouncementLoading(false);
    }
  }, [selectedHackathonId]);

  useEffect(() => {
    if (activeTab === 'announcements' && selectedHackathonId) {
      fetchAnnouncements();
      joinHackathon(selectedHackathonId);
    }
  }, [activeTab, selectedHackathonId, fetchAnnouncements, joinHackathon]);

  useEffect(() => {
    if (!socket) return;
    const handleNewAnnouncement = (newAnn: AnnouncementSummary) => {
      setAnnouncements((prev) => [newAnn, ...prev.filter((a) => a.id !== newAnn.id)]);
    };
    socket.on('announcement:created', handleNewAnnouncement);
    return () => {
      socket.off('announcement:created', handleNewAnnouncement);
    };
  }, [socket]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim() || !selectedHackathonId) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setAnnouncementSubmitting(true);
    setAnnouncementError(null);
    try {
      const res = await apiClient<{ success: boolean; data: AnnouncementSummary }>(
        `/hackathons/${selectedHackathonId}/announcements`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: announcementTitle.trim() || 'Looking for Squad',
            message: announcementMsg.trim(),
            skills: user?.skills || [],
            preferredRoles: user?.preferredRoles || [],
          }),
        }
      );
      setAnnouncements((prev) => [res.data, ...prev.filter((a) => a.id !== res.data.id)]);
      setAnnouncementMsg('');
      setAnnouncementTitle('');
    } catch (err: any) {
      setAnnouncementError(err.message || 'Failed to post announcement');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{
        success: boolean;
        data: TeamSummary[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>('/teams', {
        params: {
          search: search.trim() || undefined,
          skill: skill.trim() || undefined,
          hasSeats: hasSeats || undefined,
          page,
          limit: 12,
        },
      });

      setTeams(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalTeams(res.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [search, skill, hasSeats, page]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (!socket) return;

    const handleTeamEvent = () => {
      fetchTeams();
    };

    socket.on('team:created', handleTeamEvent);
    socket.on('team:updated', handleTeamEvent);
    socket.on('team:deleted', handleTeamEvent);
    socket.on('team:member_count_changed', handleTeamEvent);

    return () => {
      socket.off('team:created', handleTeamEvent);
      socket.off('team:updated', handleTeamEvent);
      socket.off('team:deleted', handleTeamEvent);
      socket.off('team:member_count_changed', handleTeamEvent);
    };
  }, [socket, fetchTeams]);

  const handleOpenJoinRequest = (teamId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    joinReqKeyRef.current = null;
    setSelectedTeamId(teamId);
    setRequestMessage('');
    setRequestFeedback(null);
    setRequestModalOpen(true);
  };

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    const payload = { message: requestMessage.trim() };
    const signature = `${selectedTeamId}:${payload.message}`;
    if (!joinReqKeyRef.current || joinReqKeyRef.current.signature !== signature) {
      joinReqKeyRef.current = { signature, key: generateIdempotencyKey() };
    }

    setRequestSubmitting(true);
    setRequestFeedback(null);
    try {
      await apiClient(`/teams/${selectedTeamId}/requests`, {
        method: 'POST',
        idempotencyKey: joinReqKeyRef.current.key,
        body: JSON.stringify(payload),
      });

      joinReqKeyRef.current = null;
      setRequestFeedback({
        type: 'success',
        message: 'Join request sent to the team leader!',
      });

      setTeams((prev) =>
        prev.map((t) => (t.id === selectedTeamId ? { ...t, userRequestStatus: 'PENDING' as any } : t))
      );

      setTimeout(() => {
        setRequestModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setRequestFeedback({
        type: 'error',
        message: err.message || 'Failed to submit join request',
      });
    } finally {
      setRequestSubmitting(false);
    }
  };

  const currentUserTeamId =
    user?.memberships && user.memberships.length > 0 ? user.memberships[0].teamId : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4ff33] mb-1.5">
            <Compass className="w-4 h-4" />
            <span>Looking-For-Teammates Board</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            Find Your Hackathon Squad
          </h1>
          <p className="font-mono text-xs text-[#9ca396] mt-1 tabular-nums">
            Live database commit sync · {totalTeams} active squads
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTeams()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider text-[#f5f7f2] bg-[#111411] hover:bg-[#161a16] border border-white/15 hover:border-[#d4ff33]/50 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#d4ff33] ${loading ? 'animate-spin' : ''}`} />
          Refresh Board
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'teams'
              ? 'bg-[#d4ff33] text-[#080a08]'
              : 'text-[#9ca396] hover:text-[#f5f7f2] bg-[#111411] border border-white/10'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="tabular-nums">Teams Seeking Members ({totalTeams})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'announcements'
              ? 'bg-[#d4ff33] text-[#080a08]'
              : 'text-[#9ca396] hover:text-[#f5f7f2] bg-[#111411] border border-white/10'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="tabular-nums">Builder Signals ({announcements.length})</span>
        </button>
      </div>

      {activeTab === 'teams' ? (
        <>
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-[#111411] border border-white/10">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#9ca396] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search team name..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/60 focus:border-[#d4ff33] focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="w-4 h-4 text-[#9ca396] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => {
                    setSkill(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by skill (e.g. React, Rust)"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/60 focus:border-[#d4ff33] focus:outline-none"
                />
              </div>

              <label
                htmlFor="hasSeatsCheckbox"
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs font-medium text-[#f5f7f2] cursor-pointer select-none"
              >
                <input
                  id="hasSeatsCheckbox"
                  type="checkbox"
                  checked={hasSeats}
                  onChange={(e) => {
                    setHasSeats(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 accent-[#d4ff33] rounded"
                />
                <span>Open Seats Only (Hide Full)</span>
              </label>
            </div>
          </div>

          {error ? (
            <div className="p-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => fetchTeams()}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 text-white"
              >
                Retry
              </button>
            </div>
          ) : loading && teams.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl bg-[#111411] border border-white/10 p-6 opacity-60"
                />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#111411] border border-white/10 rounded-xl">
              <Users className="w-12 h-12 text-[#9ca396] mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-[#f5f7f2] mb-1">
                No matching teams found
              </h3>
              <p className="text-xs text-[#9ca396] max-w-sm mx-auto mb-6">
                Try adjusting your search query or unchecking the open seats filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSkill('');
                  setHasSeats(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] text-[#080a08]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isMember={team.id === currentUserTeamId}
                  onRequestJoin={handleOpenJoinRequest}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              <span className="font-mono text-xs text-[#9ca396] tabular-nums">
                Page {page} of {totalPages} ({totalTeams} teams)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#f5f7f2] bg-[#111411] border border-white/15 hover:border-[#d4ff33]/50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#f5f7f2] bg-[#111411] border border-white/15 hover:border-[#d4ff33]/50 disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Post Announcement Box */}
          <div className="p-6 rounded-xl bg-[#111411] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#f5f7f2] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#d4ff33]" />
                  <span>Broadcast Looking-For-Team Signal</span>
                </h3>
                <p className="text-xs text-[#9ca396] mt-0.5">
                  Announce your stack and availability so squad leaders can recruit directly.
                </p>
              </div>

              {hackathons.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="font-mono text-xs text-[#9ca396]">Hackathon:</label>
                  <select
                    value={selectedHackathonId}
                    onChange={(e) => setSelectedHackathonId(e.target.value)}
                    className="px-3 py-1.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
                  >
                    {hackathons.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {announcementError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{announcementError}</span>
              </div>
            )}

            <form onSubmit={handlePostAnnouncement} className="space-y-3 pt-1">
              <div className="grid sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Headline (e.g. Systems / Rust engineer)"
                  className="sm:col-span-1 px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/60 focus:border-[#d4ff33] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  placeholder="Share what you build best and your sprint availability..."
                  className="sm:col-span-2 px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/60 focus:border-[#d4ff33] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-[#9ca396]">
                  Live channel · new posts broadcast instantly
                </span>
                <button
                  type="submit"
                  disabled={announcementSubmitting || !announcementMsg.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{announcementSubmitting ? 'Broadcasting...' : 'Broadcast Signal'}</span>
                </button>
              </div>
            </form>
          </div>

          {announcementLoading && announcements.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-[#111411] border border-white/10 p-6 opacity-60"
                />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#111411] border border-white/10 rounded-xl">
              <Megaphone className="w-12 h-12 text-[#9ca396] mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-[#f5f7f2] mb-1">
                No signals broadcast yet
              </h3>
              <p className="text-xs text-[#9ca396] max-w-sm mx-auto">
                Be the first builder to broadcast your availability in this hackathon.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {announcements.map((ann) => (
                <InteractiveTiltCard
                  key={ann.id}
                  maxTiltDeg={6}
                  className="p-5 rounded-xl bg-[#111411] border border-white/10 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#d4ff33]/15 border border-[#d4ff33]/40 flex items-center justify-center font-display font-bold text-[#d4ff33] text-xs">
                          {ann.user?.name ? ann.user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#f5f7f2]">
                            {ann.user?.name || 'Anonymous Builder'}
                          </div>
                          <div className="font-mono text-[10px] text-[#9ca396]">
                            {ann.user?.timezone || 'UTC'} ·{' '}
                            {new Date(ann.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {ann.title && (
                      <h4 className="font-display text-sm font-bold text-[#d4ff33]">{ann.title}</h4>
                    )}
                    <p className="text-xs text-[#f5f7f2]/85 leading-relaxed">{ann.message}</p>
                  </div>

                  {ann.skills && ann.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                      {ann.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="font-mono px-2 py-0.5 rounded bg-[#161a16] border border-white/10 text-[10px] text-[#f5f7f2]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </InteractiveTiltCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080a08]/85">
          <div className="relative w-full max-w-md bg-[#111411] border border-white/15 rounded-xl p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9ca396] hover:text-[#f5f7f2] hover:bg-[#161a16]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#f5f7f2]">
                  Request to Join Team
                </h3>
                <p className="text-xs text-[#9ca396]">
                  The team leader will review your stack and availability
                </p>
              </div>
            </div>

            {requestFeedback && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  requestFeedback.type === 'success'
                    ? 'bg-[#d4ff33]/10 border border-[#d4ff33]/30 text-[#d4ff33]'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <span>{requestFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendJoinRequest} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
                  Applicant Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Share what you bring to the squad..."
                  className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
              >
                {requestSubmitting ? 'Sending Request...' : 'Submit Join Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { TeamCard } from '../components/TeamCard';
import { TeamSummary, AnnouncementSummary } from '../types';
import {
  Search,
  Filter,
  Sparkles,
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
  const { socket, joinHackathon, leaveHackathon } = useSocket();
  const location = useLocation();
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
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tab & Announcements State
  const [activeTab, setActiveTab] = useState<'teams' | 'announcements'>('teams');
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [hackathons, setHackathons] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');

  // Fetch Hackathons
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

  // Fetch Announcements
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

  // Socket listener for new live announcements
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
      alert(err.message || 'Failed to post announcement');
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

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;

    const handleTeamEvent = () => {
      // Re-fetch authoritative database state upon committed real-time changes
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
    setSelectedTeamId(teamId);
    setRequestMessage('');
    setRequestFeedback(null);
    setRequestModalOpen(true);
  };

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    setRequestSubmitting(true);
    setRequestFeedback(null);
    try {
      await apiClient(`/teams/${selectedTeamId}/requests`, {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: JSON.stringify({ message: requestMessage.trim() }),
      });

      setRequestFeedback({
        type: 'success',
        message: 'Join request sent to the team leader!',
      });

      // Update local state
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

  const currentUserTeamId = user?.memberships && user.memberships.length > 0 ? user.memberships[0].teamId : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Compass className="w-4 h-4" />
            <span>Looking-For-Teammates Live Board</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Find Your Next Hackathon Squad</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time updates via PostgreSQL commit events • {totalTeams} active teams
          </p>
        </div>

        <button
          onClick={() => fetchTeams()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Board
        </button>
      </div>

      {/* Tabs: Teams vs Candidate Announcements */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'teams'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Teams Seeking Members ({totalTeams})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'announcements'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Looking-For-Teammates Live Room</span>
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">
            {announcements.length}
          </span>
        </button>
      </div>

      {activeTab === 'teams' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-[#111726] border border-slate-800 shadow-xl space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              {/* Search by team name */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search team name..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              {/* Filter by skill */}
              <div className="relative">
                <Filter className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => {
                    setSkill(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by skill (e.g. React, Rust)"
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              {/* Available Seats Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl">
                <input
                  id="hasSeatsCheckbox"
                  type="checkbox"
                  checked={hasSeats}
                  onChange={(e) => {
                    setHasSeats(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
                <label htmlFor="hasSeatsCheckbox" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                  Open Seats Only (Hide Full Teams)
                </label>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          {error ? (
            <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8" />
              <span>{error}</span>
              <button
                onClick={() => fetchTeams()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white"
              >
                Retry
              </button>
            </div>
          ) : loading && teams.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#111726]/40 border border-slate-800 rounded-2xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No matching teams found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                Try adjusting your search query or unchecking the open seats filter.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setSkill('');
                  setHasSeats(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages} ({totalTeams} total teams)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Announcements Feed */
        <div className="space-y-6">
          {/* Top Control Bar: Hackathon Switcher + Post Announcement Box */}
          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  <span>Broadcast Looking-For-Team Signal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Announce your skills and availability. Squad leaders discover and recruit directly from this feed.
                </p>
              </div>

              {hackathons.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Hackathon:</label>
                  <select
                    value={selectedHackathonId}
                    onChange={(e) => setSelectedHackathonId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
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

            <form onSubmit={handlePostAnnouncement} className="space-y-3 pt-2">
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Headline (e.g. Senior Backend / Rust dev looking for squad)"
                  className="sm:col-span-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  placeholder="Tell leaders what you want to build and your availability..."
                  className="sm:col-span-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-time channel: new posts appear instantly via WebSockets</span>
                </div>
                <button
                  type="submit"
                  disabled={announcementSubmitting || !announcementMsg.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{announcementSubmitting ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Announcements List */}
          {announcementLoading && announcements.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#111726]/40 border border-slate-800 rounded-2xl">
              <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No announcements yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Be the first to announce that you are looking for teammates in this hackathon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 rounded-2xl bg-[#111726] border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs">
                          {ann.user?.name ? ann.user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{ann.user?.name || 'Anonymous Hacker'}</div>
                          <div className="text-[10px] text-slate-400">{ann.user?.timezone || 'UTC'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {ann.title && (
                      <h4 className="text-xs font-bold text-indigo-300">{ann.title}</h4>
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                  </div>

                  {ann.skills && ann.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                      {ann.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setRequestModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Request to Join Team</h3>
                <p className="text-xs text-slate-400">The team leader will review your profile and skills</p>
              </div>
            </div>

            {requestFeedback && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  requestFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <span>{requestFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendJoinRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Applicant Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell the leader about your skills and what you'd like to build..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
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


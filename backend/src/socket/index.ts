import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { verifyToken } from '../utils/crypto';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: config.clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = verifyToken(token);
        socket.data.user = payload;
      } catch {
        // Allow anonymous connection for public team board broadcasts
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    // If authenticated, join user-specific private room
    if (socket.data.user?.userId) {
      socket.join(`user:${socket.data.user.userId}`);
    }

    // Join hackathon board room
    socket.on('join:hackathon', (hackathonId: string) => {
      if (typeof hackathonId === 'string' && hackathonId.length > 0 && hackathonId.length <= 64) {
        socket.join(`hackathon:${hackathonId}`);
      }
    });

    socket.on('leave:hackathon', (hackathonId: string) => {
      if (typeof hackathonId === 'string' && hackathonId.length > 0 && hackathonId.length <= 64) {
        socket.leave(`hackathon:${hackathonId}`);
      }
    });

    // Join team-specific public capacity/roster room
    socket.on('join:team', (teamId: string) => {
      if (typeof teamId === 'string' && teamId.length > 0 && teamId.length <= 64) {
        socket.join(`team:${teamId}`);
      }
    });

    socket.on('leave:team', (teamId: string) => {
      if (typeof teamId === 'string' && teamId.length > 0 && teamId.length <= 64) {
        socket.leave(`team:${teamId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized yet!');
  }
  return io;
};

// Safe event emission helpers (won't crash if socket not active in tests)
export const socketEvents = {
  emitTeamCreated: (hackathonId: string, team: unknown) => {
    if (!io) return;
    io.to(`hackathon:${hackathonId}`).emit('team:created', team);
  },

  emitTeamUpdated: (hackathonId: string, teamId: string, team: unknown) => {
    if (!io) return;
    io.to(`hackathon:${hackathonId}`).emit('team:updated', team);
    io.to(`team:${teamId}`).emit('team:updated', team);
  },

  emitTeamDeleted: (hackathonId: string, teamId: string) => {
    if (!io) return;
    io.to(`hackathon:${hackathonId}`).emit('team:deleted', { teamId });
    io.to(`team:${teamId}`).emit('team:deleted', { teamId });
  },

  emitMemberJoined: (hackathonId: string, teamId: string, member: unknown) => {
    if (!io) return;
    io.to(`team:${teamId}`).emit('member:joined', member);
    io.to(`hackathon:${hackathonId}`).emit('team:member_count_changed', { teamId });
  },

  emitMemberLeft: (hackathonId: string, teamId: string, userId: string) => {
    if (!io) return;
    io.to(`team:${teamId}`).emit('member:left', { userId });
    io.to(`hackathon:${hackathonId}`).emit('team:member_count_changed', { teamId });
  },

  emitMemberRemoved: (hackathonId: string, teamId: string, userId: string) => {
    if (!io) return;
    io.to(`team:${teamId}`).emit('member:removed', { userId });
    io.to(`user:${userId}`).emit('team:removed_from_team', { teamId });
    io.to(`hackathon:${hackathonId}`).emit('team:member_count_changed', { teamId });
  },

  emitLeaderChanged: (teamId: string, newLeaderId: string) => {
    if (!io) return;
    io.to(`team:${teamId}`).emit('leader:changed', { newLeaderId });
  },

  emitRequestCreated: (_teamId: string, leaderId: string, request: unknown) => {
    if (!io) return;
    // Deliver private applicant request details strictly to the authenticated leader's room
    io.to(`user:${leaderId}`).emit('request:created', request);
  },

  emitRequestAccepted: (teamId: string, requesterId: string, request: unknown) => {
    if (!io) return;
    io.to(`user:${requesterId}`).emit('request:accepted', request);
    io.to(`team:${teamId}`).emit('request:accepted', request);
  },

  emitRequestDeclined: (teamId: string, requesterId: string, request: unknown) => {
    if (!io) return;
    io.to(`user:${requesterId}`).emit('request:declined', request);
    io.to(`team:${teamId}`).emit('request:declined', request);
  },

  emitAnnouncementCreated: (hackathonId: string, announcement: unknown) => {
    if (!io) return;
    io.to(`hackathon:${hackathonId}`).emit('announcement:created', announcement);
  },
};


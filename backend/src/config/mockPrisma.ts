import { PrismaClient, UserRole, TeamMemberRole, JoinRequestStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const uuid = () => crypto.randomUUID();

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  bio: string | null;
  skills: string[];
  preferredRoles: string[];
  timezone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface HackathonRecord {
  id: string;
  title: string;
  slug: string;
  description: string;
  minTeamSize: number;
  maxTeamSize: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamRecord {
  id: string;
  hackathonId: string;
  name: string;
  description: string;
  minMembers: number;
  maxMembers: number;
  currentMemberCount: number;
  requiredSkills: string[];
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMemberRecord {
  id: string;
  teamId: string;
  userId: string;
  hackathonId: string;
  role: TeamMemberRole;
  joinedAt: Date;
}

interface JoinRequestRecord {
  id: string;
  teamId: string;
  userId: string;
  hackathonId: string;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InvitationCodeRecord {
  id: string;
  teamId: string;
  codeHash: string;
  codePrefix: string;
  createdById: string;
  expiresAt: Date;
  maxUses: number;
  usesCount: number;
  isRevoked: boolean;
  createdAt: Date;
}

interface AuditLogRecord {
  id: string;
  actorId: string | null;
  hackathonId: string | null;
  teamId: string | null;
  targetUserId: string | null;
  action: AuditAction;
  metadata: any;
  ipAddress: string | null;
  correlationId: string | null;
  createdAt: Date;
}

interface IdempotencyRecord {
  id: string;
  key: string;
  userId: string;
  endpoint: string;
  requestHash: string;
  statusCode: number;
  responseBody: any;
  createdAt: Date;
  expiresAt: Date;
}

interface AnnouncementRecord {
  id: string;
  hackathonId: string;
  userId: string;
  title: string;
  message: string;
  skills: string[];
  preferredRoles: string[];
  createdAt: Date;
}

interface Store {
  users: UserRecord[];
  hackathons: HackathonRecord[];
  teams: TeamRecord[];
  teamMembers: TeamMemberRecord[];
  joinRequests: JoinRequestRecord[];
  invitationCodes: InvitationCodeRecord[];
  auditLogs: AuditLogRecord[];
  idempotencyRecords: IdempotencyRecord[];
  announcements: AnnouncementRecord[];
}

function createInitialStore(): Store {
  const now = new Date();
  const defaultHash = bcrypt.hashSync('Password123!', 8);

  const hack1Id = '11111111-1111-4111-8111-111111111101';
  const hack2Id = '11111111-1111-4111-8111-111111111102';
  const hack3Id = '11111111-1111-4111-8111-111111111103';

  const hackathons: HackathonRecord[] = [
    {
      id: hack1Id,
      title: 'Global Scale & Concurrency Hackathon 2026',
      slug: 'scalecon-2026',
      description: 'Compete to build high-throughput, race-proof systems under massive concurrent workloads.',
      minTeamSize: 2,
      maxTeamSize: 5,
      startDate: new Date('2026-12-01T00:00:00Z'),
      endDate: new Date('2026-12-05T23:59:59Z'),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hack2Id,
      title: 'AI & Next-Gen Distributed Platforms 2026',
      slug: 'ai-distrib-2026',
      description: 'Design next-generation autonomous AI agents and distributed infrastructure.',
      minTeamSize: 3,
      maxTeamSize: 6,
      startDate: new Date('2026-12-10T00:00:00Z'),
      endDate: new Date('2026-12-15T23:59:59Z'),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hack3Id,
      title: 'FinTech High-Frequency Resilience Challenge',
      slug: 'fintech-hfr-2026',
      description: 'Build ultra-low latency settlement and ledger reconciliation systems.',
      minTeamSize: 2,
      maxTeamSize: 4,
      startDate: new Date('2027-01-10T00:00:00Z'),
      endDate: new Date('2027-01-14T23:59:59Z'),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const adminId = '22222222-2222-4222-8222-222222222201';
  const leaderId = '22222222-2222-4222-8222-222222222202';
  const participantId = '22222222-2222-4222-8222-222222222203';
  const candidateId = '22222222-2222-4222-8222-222222222204';

  const extraHackers: Array<{ name: string; skills: string[]; role: string; tz: string }> = [
    { name: 'Maya Lin', skills: ['Rust', 'PostgreSQL', 'System Design', 'Kubernetes'], role: 'Backend Engineer', tz: 'America/New_York' },
    { name: 'Liam O\'Connor', skills: ['React', 'TypeScript', 'GraphQL', 'TailwindCSS'], role: 'Frontend Engineer', tz: 'Europe/London' },
    { name: 'Priya Nair', skills: ['Python', 'Machine Learning', 'FastAPI', 'Docker'], role: 'Full Stack', tz: 'Asia/Kolkata' },
    { name: 'Carlos Mendez', skills: ['Go', 'Kubernetes', 'AWS', 'Redis'], role: 'DevOps', tz: 'America/Los_Angeles' },
    { name: 'Elena Rostova', skills: ['UI/UX Design', 'React', 'Next.js', 'TailwindCSS'], role: 'Designer', tz: 'Europe/Berlin' },
    { name: 'Kenji Sato', skills: ['Rust', 'Go', 'TypeScript', 'PostgreSQL'], role: 'Backend Engineer', tz: 'Asia/Tokyo' },
    { name: 'Amara Okafor', skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS'], role: 'Full Stack', tz: 'UTC' },
    { name: 'Noah Kim', skills: ['Python', 'Machine Learning', 'React', 'TypeScript'], role: 'Full Stack', tz: 'Asia/Singapore' },
  ];

  const users: UserRecord[] = [
    {
      id: adminId,
      email: 'admin@teamforge.dev',
      passwordHash: defaultHash,
      name: 'Forge Administrator',
      bio: 'Platform architect and contest director.',
      skills: ['PostgreSQL', 'Docker', 'System Design', 'Kubernetes'],
      preferredRoles: ['DevOps', 'Product Manager'],
      timezone: 'UTC',
      role: UserRole.ADMIN,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: leaderId,
      email: 'leader@teamforge.dev',
      passwordHash: defaultHash,
      name: 'Sarah Connor',
      bio: 'Team Leader building race-proof distributed systems.',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'System Design'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'America/New_York',
      role: UserRole.PARTICIPANT,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: participantId,
      email: 'participant@teamforge.dev',
      passwordHash: defaultHash,
      name: 'Alex Rivera',
      bio: 'Frontend specialist experienced with React, Tailwind, and WebSockets.',
      skills: ['React', 'TypeScript', 'TailwindCSS', 'UI/UX Design'],
      preferredRoles: ['Frontend Engineer'],
      timezone: 'Asia/Kolkata',
      role: UserRole.PARTICIPANT,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: candidateId,
      email: 'candidate@teamforge.dev',
      passwordHash: defaultHash,
      name: 'Jordan Lee',
      bio: 'Looking for a competitive team in distributed systems.',
      skills: ['Rust', 'Python', 'Machine Learning'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'Europe/London',
      role: UserRole.PARTICIPANT,
      createdAt: now,
      updatedAt: now,
    },
    ...extraHackers.map((h, i) => ({
      id: `22222222-2222-4222-8222-22222222221${i}`,
      email: `hacker_${i + 1}@teamforge.test`,
      passwordHash: defaultHash,
      name: h.name,
      bio: 'Software craftsman passionate about high-scale applications.',
      skills: h.skills,
      preferredRoles: [h.role],
      timezone: h.tz,
      role: UserRole.PARTICIPANT,
      createdAt: now,
      updatedAt: now,
    })),
  ];

  const demoTeamId = '33333333-3333-4333-8333-333333333301';
  const team2Id = '33333333-3333-4333-8333-333333333302';
  const team3Id = '33333333-3333-4333-8333-333333333303';
  const team4Id = '33333333-3333-4333-8333-333333333304';

  const teams: TeamRecord[] = [
    {
      id: demoTeamId,
      hackathonId: hack1Id,
      name: 'Concurrency Champions',
      description: 'Building an enterprise-grade transactional engine with PostgreSQL row locks and real-time websockets.',
      minMembers: 2,
      maxMembers: 5,
      currentMemberCount: 2,
      requiredSkills: ['React', 'TypeScript', 'PostgreSQL', 'UI/UX Design', 'Rust'],
      isLocked: false,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: now,
    },
    {
      id: team2Id,
      hackathonId: hack1Id,
      name: 'Raft Consensus Guild',
      description: 'Fault-tolerant distributed state machine with deterministic failover.',
      minMembers: 2,
      maxMembers: 5,
      currentMemberCount: 2,
      requiredSkills: ['Go', 'Kubernetes', 'Rust', 'System Design'],
      isLocked: false,
      createdAt: new Date(Date.now() - 43200000),
      updatedAt: now,
    },
    {
      id: team3Id,
      hackathonId: hack2Id,
      name: 'Autonomous Mesh',
      description: 'Multi-agent orchestration runtime with streaming observability.',
      minMembers: 3,
      maxMembers: 6,
      currentMemberCount: 2,
      requiredSkills: ['Python', 'Machine Learning', 'React', 'FastAPI'],
      isLocked: false,
      createdAt: new Date(Date.now() - 21600000),
      updatedAt: now,
    },
    {
      id: team4Id,
      hackathonId: hack3Id,
      name: 'Zero-Latency Ledger',
      description: 'Double-entry atomic settlement engine with sub-millisecond reconciliation.',
      minMembers: 2,
      maxMembers: 4,
      currentMemberCount: 1,
      requiredSkills: ['Rust', 'PostgreSQL', 'TypeScript', 'Docker'],
      isLocked: false,
      createdAt: new Date(Date.now() - 10800000),
      updatedAt: now,
    },
  ];

  const teamMembers: TeamMemberRecord[] = [
    {
      id: uuid(),
      teamId: demoTeamId,
      userId: leaderId,
      hackathonId: hack1Id,
      role: TeamMemberRole.LEADER,
      joinedAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      id: uuid(),
      teamId: demoTeamId,
      userId: participantId,
      hackathonId: hack1Id,
      role: TeamMemberRole.MEMBER,
      joinedAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      id: uuid(),
      teamId: team2Id,
      userId: users[4].id,
      hackathonId: hack1Id,
      role: TeamMemberRole.LEADER,
      joinedAt: new Date(Date.now() - 3600000 * 18),
    },
    {
      id: uuid(),
      teamId: team2Id,
      userId: users[7].id,
      hackathonId: hack1Id,
      role: TeamMemberRole.MEMBER,
      joinedAt: new Date(Date.now() - 3600000 * 10),
    },
    {
      id: uuid(),
      teamId: team3Id,
      userId: users[6].id,
      hackathonId: hack2Id,
      role: TeamMemberRole.LEADER,
      joinedAt: new Date(Date.now() - 3600000 * 8),
    },
    {
      id: uuid(),
      teamId: team3Id,
      userId: users[5].id,
      hackathonId: hack2Id,
      role: TeamMemberRole.MEMBER,
      joinedAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      id: uuid(),
      teamId: team4Id,
      userId: users[9].id,
      hackathonId: hack3Id,
      role: TeamMemberRole.LEADER,
      joinedAt: new Date(Date.now() - 3600000 * 2),
    },
  ];

  const joinRequests: JoinRequestRecord[] = [
    {
      id: uuid(),
      teamId: demoTeamId,
      userId: candidateId,
      hackathonId: hack1Id,
      status: JoinRequestStatus.PENDING,
      message: 'Hi Sarah, I would love to join your team as a Backend / Rust specialist!',
      createdAt: new Date(Date.now() - 3600000 * 3),
      updatedAt: now,
    },
  ];

  const auditLogs: AuditLogRecord[] = [
    {
      id: uuid(),
      actorId: leaderId,
      hackathonId: hack1Id,
      teamId: demoTeamId,
      targetUserId: null,
      action: AuditAction.TEAM_CREATED,
      metadata: { name: 'Concurrency Champions', demo: true },
      ipAddress: null,
      correlationId: null,
      createdAt: new Date(Date.now() - 86400000),
    },
  ];

  const announcements: AnnouncementRecord[] = [
    {
      id: uuid(),
      hackathonId: hack1Id,
      userId: candidateId,
      title: 'Rust & ML Systems Engineer Looking for Squad',
      message: 'Experienced with Tokio, PostgreSQL isolation levels, and Python ML pipelines. Available full weekend!',
      skills: ['Rust', 'Python', 'Machine Learning'],
      preferredRoles: ['Backend Engineer'],
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: uuid(),
      hackathonId: hack1Id,
      userId: users[8].id,
      title: 'Product Designer & Next.js Frontend Dev',
      message: 'Happy to craft clean real-time dashboards and design systems for a distributed systems team.',
      skills: ['UI/UX Design', 'React', 'Next.js', 'TailwindCSS'],
      preferredRoles: ['Designer'],
      createdAt: new Date(Date.now() - 3600000 * 1),
    },
  ];

  return {
    users,
    hackathons,
    teams,
    teamMembers,
    joinRequests,
    invitationCodes: [],
    auditLogs,
    idempotencyRecords: [],
    announcements,
  };
}

function applySelect<T extends Record<string, any>>(obj: T, select?: Record<string, any>): any {
  if (!select) return { ...obj };
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true && k in obj) {
      result[k] = obj[k];
    }
  }
  return result;
}

function matchCondition(val: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
    return val === cond;
  }
  if ('in' in cond && Array.isArray(cond.in)) {
    if (!cond.in.includes(val)) return false;
  }
  if ('notIn' in cond && Array.isArray(cond.notIn)) {
    if (cond.notIn.includes(val)) return false;
  }
  if ('contains' in cond) {
    const str = String(val ?? '');
    const target = String(cond.contains ?? '');
    if (cond.mode === 'insensitive') {
      if (!str.toLowerCase().includes(target.toLowerCase())) return false;
    } else if (!str.includes(target)) {
      return false;
    }
  }
  if ('startsWith' in cond) {
    const str = String(val ?? '');
    if (!str.startsWith(String(cond.startsWith ?? ''))) return false;
  }
  if ('has' in cond) {
    if (!Array.isArray(val) || !val.includes(cond.has)) return false;
  }
  if ('path' in cond && Array.isArray(cond.path)) {
    let cursor = val;
    for (const seg of cond.path) {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
        cursor = undefined;
        break;
      }
      cursor = cursor[seg];
    }
    if ('equals' in cond && cursor !== cond.equals) return false;
  }
  return true;
}

function sortRecords<T extends Record<string, any>>(rows: T[], orderBy?: Record<string, 'asc' | 'desc'>): T[] {
  if (!orderBy) return rows;
  const entries = Object.entries(orderBy);
  if (entries.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field];
      const bv = b[field];
      const aVal = av instanceof Date ? av.getTime() : av;
      const bVal = bv instanceof Date ? bv.getTime() : bv;
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function applyPagination<T>(rows: T[], skip?: number, take?: number): T[] {
  const start = skip ?? 0;
  const end = take !== undefined ? start + take : undefined;
  return rows.slice(start, end);
}

export function createMockPrisma(): PrismaClient {
  const store = createInitialStore();
  let txQueue: Promise<any> = Promise.resolve();

  const matchesUserWhere = (u: UserRecord, where: any = {}): boolean => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'memberships' && v && typeof v === 'object' && 'none' in v) {
        const noneWhere: any = (v as any).none;
        const hasMatch = store.teamMembers.some(
          (m) => m.userId === u.id && (!noneWhere.hackathonId || m.hackathonId === noneWhere.hackathonId)
        );
        if (hasMatch) return false;
      } else if (!matchCondition((u as any)[k], v)) {
        return false;
      }
    }
    return true;
  };

  const matchesTeamWhere = (t: TeamRecord, where: any = {}): boolean => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'AND' && Array.isArray(v)) {
        if (!v.every((sub) => matchesTeamWhere(t, sub))) return false;
      } else if (k === 'hackathonId_name' && v && typeof v === 'object') {
        if (t.hackathonId !== (v as any).hackathonId || t.name !== (v as any).name) return false;
      } else if (!matchCondition((t as any)[k], v)) {
        return false;
      }
    }
    return true;
  };

  const enrichUser = (u: UserRecord, args?: any): any => {
    if (args?.select) return applySelect(u, args.select);
    const out: any = { ...u };
    if (args?.include?.memberships) {
      const mInc = args.include.memberships;
      out.memberships = store.teamMembers
        .filter((m) => m.userId === u.id)
        .map((m) => {
          const mOut: any = { ...m };
          if (mInc.include?.team) {
            const team = store.teams.find((t) => t.id === m.teamId);
            if (team) {
              const tOut: any = { ...team };
              if (mInc.include.team.include?.hackathon) {
                const hack = store.hackathons.find((h) => h.id === team.hackathonId);
                tOut.hackathon = hack
                  ? applySelect(hack, mInc.include.team.include.hackathon.select)
                  : null;
              }
              mOut.team = tOut;
            }
          }
          return mOut;
        });
    }
    if (args?.include?.joinRequests) {
      const jrInc = args.include.joinRequests;
      out.joinRequests = store.joinRequests
        .filter((r) => r.userId === u.id && (!jrInc.where?.status || r.status === jrInc.where.status))
        .map((r) => {
          const rOut: any = { ...r };
          if (jrInc.include?.team) {
            const team = store.teams.find((t) => t.id === r.teamId);
            rOut.team = team ? applySelect(team, jrInc.include.team.select) : null;
          }
          return rOut;
        });
    }
    return out;
  };

  const enrichHackathon = (h: HackathonRecord, args?: any): any => {
    const out: any = args?.select ? applySelect(h, args.select) : { ...h };
    if (args?.include?._count) {
      out._count = {
        teams: store.teams.filter((t) => t.hackathonId === h.id).length,
        members: store.teamMembers.filter((m) => m.hackathonId === h.id).length,
      };
    }
    return out;
  };

  const enrichTeam = (t: TeamRecord, args?: any): any => {
    const out: any = args?.select ? applySelect(t, args.select) : { ...t };
    if (args?.include?.hackathon) {
      const hack = store.hackathons.find((h) => h.id === t.hackathonId);
      out.hackathon = hack ? applySelect(hack, args.include.hackathon.select) : null;
    }
    if (args?.include?.members) {
      const mCfg = args.include.members;
      let members = store.teamMembers.filter((m) => m.teamId === t.id);
      if (mCfg.where) {
        members = members.filter((m) =>
          Object.entries(mCfg.where).every(([k, v]) => matchCondition((m as any)[k], v))
        );
      }
      if (mCfg.orderBy) {
        members = sortRecords(members, mCfg.orderBy);
      }
      out.members = members.map((m) => {
        const mOut: any = mCfg.select ? applySelect(m, mCfg.select) : { ...m };
        if (mCfg.include?.user) {
          const user = store.users.find((u) => u.id === m.userId);
          mOut.user = user ? applySelect(user, mCfg.include.user.select) : null;
        }
        return mOut;
      });
    }
    return out;
  };

  const enrichTeamMember = (m: TeamMemberRecord, args?: any): any => {
    const out: any = args?.select ? applySelect(m, args.select) : { ...m };
    if (args?.include?.user) {
      const user = store.users.find((u) => u.id === m.userId);
      out.user = user ? applySelect(user, args.include.user.select) : null;
    }
    return out;
  };

  const enrichJoinRequest = (r: JoinRequestRecord, args?: any): any => {
    const out: any = args?.select ? applySelect(r, args.select) : { ...r };
    if (args?.include?.user) {
      const user = store.users.find((u) => u.id === r.userId);
      out.user = user ? applySelect(user, args.include.user.select) : null;
    }
    if (args?.include?.team) {
      const team = store.teams.find((t) => t.id === r.teamId);
      out.team = team ? { ...team } : null;
    }
    return out;
  };

  const enrichInvitation = (inv: InvitationCodeRecord, args?: any): any => {
    const out: any = { ...inv };
    if (args?.include?.team) {
      const team = store.teams.find((t) => t.id === inv.teamId);
      out.team = team ? enrichTeam(team, args.include.team === true ? undefined : args.include.team) : null;
    }
    return out;
  };

  const enrichAnnouncement = (a: AnnouncementRecord, args?: any): any => {
    const out: any = { ...a };
    if (args?.include?.user) {
      const user = store.users.find((u) => u.id === a.userId);
      out.user = user ? applySelect(user, args.include.user.select) : null;
    }
    return out;
  };

  const enrichAuditLog = (l: AuditLogRecord, args?: any): any => {
    const out: any = { ...l };
    if (args?.include?.actor) {
      const actor = l.actorId ? store.users.find((u) => u.id === l.actorId) : null;
      out.actor = actor ? applySelect(actor, args.include.actor.select) : null;
    }
    if (args?.include?.targetUser) {
      const target = l.targetUserId ? store.users.find((u) => u.id === l.targetUserId) : null;
      out.targetUser = target ? applySelect(target, args.include.targetUser.select) : null;
    }
    return out;
  };

  const client: any = {
    user: {
      findUnique: async (args: any) => {
        const found = store.users.find((u) => matchesUserWhere(u, args.where));
        return found ? enrichUser(found, args) : null;
      },
      findFirst: async (args: any = {}) => {
        const found = store.users.find((u) => matchesUserWhere(u, args.where));
        return found ? enrichUser(found, args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.users.filter((u) => matchesUserWhere(u, args.where));
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((u) => enrichUser(u, args));
      },
      create: async (args: any) => {
        const now = new Date();
        const record: UserRecord = {
          id: args.data.id || uuid(),
          email: args.data.email,
          passwordHash: args.data.passwordHash,
          name: args.data.name,
          bio: args.data.bio ?? '',
          skills: args.data.skills ?? [],
          preferredRoles: args.data.preferredRoles ?? [],
          timezone: args.data.timezone ?? 'UTC',
          role: args.data.role ?? UserRole.PARTICIPANT,
          createdAt: now,
          updatedAt: now,
        };
        store.users.push(record);
        return enrichUser(record, args);
      },
      update: async (args: any) => {
        const idx = store.users.findIndex((u) => matchesUserWhere(u, args.where));
        if (idx === -1) throw new Error('User not found');
        store.users[idx] = { ...store.users[idx], ...args.data, updatedAt: new Date() };
        return enrichUser(store.users[idx], args);
      },
      deleteMany: async () => {
        const count = store.users.length;
        store.users = [];
        return { count };
      },
    },

    hackathon: {
      findUnique: async (args: any) => {
        const found = store.hackathons.find((h) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((h as any)[k], v))
        );
        return found ? enrichHackathon(found, args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.hackathons.filter((h) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((h as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((h) => enrichHackathon(h, args));
      },
      create: async (args: any) => {
        const now = new Date();
        const record: HackathonRecord = {
          id: args.data.id || uuid(),
          title: args.data.title,
          slug: args.data.slug,
          description: args.data.description ?? '',
          minTeamSize: args.data.minTeamSize ?? 2,
          maxTeamSize: args.data.maxTeamSize ?? 5,
          startDate: new Date(args.data.startDate),
          endDate: new Date(args.data.endDate),
          isActive: args.data.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        store.hackathons.push(record);
        return enrichHackathon(record, args);
      },
      deleteMany: async () => {
        const count = store.hackathons.length;
        store.hackathons = [];
        return { count };
      },
    },

    team: {
      findUnique: async (args: any) => {
        const found = store.teams.find((t) => matchesTeamWhere(t, args.where));
        return found ? enrichTeam(found, args) : null;
      },
      findFirst: async (args: any = {}) => {
        const found = store.teams.find((t) => matchesTeamWhere(t, args.where));
        return found ? enrichTeam(found, args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.teams.filter((t) => matchesTeamWhere(t, args.where));
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((t) => enrichTeam(t, args));
      },
      count: async (args: any = {}) => {
        return store.teams.filter((t) => matchesTeamWhere(t, args.where)).length;
      },
      create: async (args: any) => {
        const now = new Date();
        const record: TeamRecord = {
          id: args.data.id || uuid(),
          hackathonId: args.data.hackathonId,
          name: args.data.name,
          description: args.data.description ?? '',
          minMembers: args.data.minMembers ?? 2,
          maxMembers: args.data.maxMembers ?? 5,
          currentMemberCount: args.data.currentMemberCount ?? 1,
          requiredSkills: args.data.requiredSkills ?? [],
          isLocked: args.data.isLocked ?? false,
          createdAt: now,
          updatedAt: now,
        };
        store.teams.push(record);
        return enrichTeam(record, args);
      },
      update: async (args: any) => {
        const idx = store.teams.findIndex((t) => matchesTeamWhere(t, args.where));
        if (idx === -1) throw new Error('Team not found');
        const next = { ...store.teams[idx], updatedAt: new Date() };
        for (const [k, v] of Object.entries(args.data || {})) {
          if (v && typeof v === 'object' && 'increment' in (v as any)) {
            (next as any)[k] = ((next as any)[k] || 0) + (v as any).increment;
          } else if (v && typeof v === 'object' && 'decrement' in (v as any)) {
            (next as any)[k] = ((next as any)[k] || 0) - (v as any).decrement;
          } else {
            (next as any)[k] = v;
          }
        }
        store.teams[idx] = next;
        return enrichTeam(next, args);
      },
      delete: async (args: any) => {
        const idx = store.teams.findIndex((t) => matchesTeamWhere(t, args.where));
        if (idx === -1) throw new Error('Team not found');
        const [removed] = store.teams.splice(idx, 1);
        store.teamMembers = store.teamMembers.filter((m) => m.teamId !== removed.id);
        store.joinRequests = store.joinRequests.filter((r) => r.teamId !== removed.id);
        store.invitationCodes = store.invitationCodes.filter((c) => c.teamId !== removed.id);
        store.auditLogs = store.auditLogs.map((l) => (l.teamId === removed.id ? { ...l, teamId: null } : l));
        return removed;
      },
      deleteMany: async () => {
        const count = store.teams.length;
        store.teams = [];
        return { count };
      },
    },

    teamMember: {
      findFirst: async (args: any = {}) => {
        const rows = store.teamMembers.filter((m) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((m as any)[k], v))
        );
        const sorted = sortRecords(rows, args.orderBy);
        return sorted[0] ? enrichTeamMember(sorted[0], args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.teamMembers.filter((m) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((m as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((m) => enrichTeamMember(m, args));
      },
      count: async (args: any = {}) => {
        return store.teamMembers.filter((m) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((m as any)[k], v))
        ).length;
      },
      create: async (args: any) => {
        const record: TeamMemberRecord = {
          id: args.data.id || uuid(),
          teamId: args.data.teamId,
          userId: args.data.userId,
          hackathonId: args.data.hackathonId,
          role: args.data.role ?? TeamMemberRole.MEMBER,
          joinedAt: args.data.joinedAt ? new Date(args.data.joinedAt) : new Date(),
        };
        store.teamMembers.push(record);
        return enrichTeamMember(record, args);
      },
      createMany: async (args: any) => {
        const list = args.data || [];
        for (const d of list) {
          store.teamMembers.push({
            id: d.id || uuid(),
            teamId: d.teamId,
            userId: d.userId,
            hackathonId: d.hackathonId,
            role: d.role ?? TeamMemberRole.MEMBER,
            joinedAt: d.joinedAt ? new Date(d.joinedAt) : new Date(),
          });
        }
        return { count: list.length };
      },
      update: async (args: any) => {
        const idx = store.teamMembers.findIndex((m) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((m as any)[k], v))
        );
        if (idx === -1) throw new Error('TeamMember not found');
        store.teamMembers[idx] = { ...store.teamMembers[idx], ...args.data };
        return enrichTeamMember(store.teamMembers[idx], args);
      },
      delete: async (args: any) => {
        const idx = store.teamMembers.findIndex((m) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((m as any)[k], v))
        );
        if (idx === -1) throw new Error('TeamMember not found');
        const [removed] = store.teamMembers.splice(idx, 1);
        return removed;
      },
      deleteMany: async () => {
        const count = store.teamMembers.length;
        store.teamMembers = [];
        return { count };
      },
    },

    joinRequest: {
      findUnique: async (args: any) => {
        const found = store.joinRequests.find((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        );
        return found ? enrichJoinRequest(found, args) : null;
      },
      findFirst: async (args: any = {}) => {
        let rows = store.joinRequests.filter((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        return rows[0] ? enrichJoinRequest(rows[0], args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.joinRequests.filter((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((r) => enrichJoinRequest(r, args));
      },
      count: async (args: any = {}) => {
        return store.joinRequests.filter((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        ).length;
      },
      create: async (args: any) => {
        const now = new Date();
        const record: JoinRequestRecord = {
          id: args.data.id || uuid(),
          teamId: args.data.teamId,
          userId: args.data.userId,
          hackathonId: args.data.hackathonId,
          status: args.data.status ?? JoinRequestStatus.PENDING,
          message: args.data.message ?? '',
          createdAt: now,
          updatedAt: now,
        };
        store.joinRequests.push(record);
        return enrichJoinRequest(record, args);
      },
      update: async (args: any) => {
        const idx = store.joinRequests.findIndex((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        );
        if (idx === -1) throw new Error('JoinRequest not found');
        store.joinRequests[idx] = { ...store.joinRequests[idx], ...args.data, updatedAt: new Date() };
        return enrichJoinRequest(store.joinRequests[idx], args);
      },
      deleteMany: async () => {
        const count = store.joinRequests.length;
        store.joinRequests = [];
        return { count };
      },
    },

    invitationCode: {
      findUnique: async (args: any) => {
        const found = store.invitationCodes.find((c) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((c as any)[k], v))
        );
        return found ? enrichInvitation(found, args) : null;
      },
      create: async (args: any) => {
        const record: InvitationCodeRecord = {
          id: args.data.id || uuid(),
          teamId: args.data.teamId,
          codeHash: args.data.codeHash,
          codePrefix: args.data.codePrefix,
          createdById: args.data.createdById,
          expiresAt: new Date(args.data.expiresAt),
          maxUses: args.data.maxUses ?? 1,
          usesCount: args.data.usesCount ?? 0,
          isRevoked: args.data.isRevoked ?? false,
          createdAt: new Date(),
        };
        store.invitationCodes.push(record);
        return { ...record };
      },
      update: async (args: any) => {
        const idx = store.invitationCodes.findIndex((c) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((c as any)[k], v))
        );
        if (idx === -1) throw new Error('InvitationCode not found');
        const next = { ...store.invitationCodes[idx] };
        for (const [k, v] of Object.entries(args.data || {})) {
          if (v && typeof v === 'object' && 'increment' in (v as any)) {
            (next as any)[k] = ((next as any)[k] || 0) + (v as any).increment;
          } else {
            (next as any)[k] = v;
          }
        }
        store.invitationCodes[idx] = next;
        return { ...next };
      },
      deleteMany: async () => {
        const count = store.invitationCodes.length;
        store.invitationCodes = [];
        return { count };
      },
    },

    auditLog: {
      findFirst: async (args: any = {}) => {
        let rows = store.auditLogs.filter((l) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((l as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        const found = rows[0];
        return found ? enrichAuditLog(found, args) : null;
      },
      findMany: async (args: any = {}) => {
        let rows = store.auditLogs.filter((l) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((l as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((l) => enrichAuditLog(l, args));
      },
      count: async (args: any = {}) => {
        return store.auditLogs.filter((l) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((l as any)[k], v))
        ).length;
      },
      create: async (args: any) => {
        const record: AuditLogRecord = {
          id: args.data.id || uuid(),
          actorId: args.data.actorId ?? null,
          hackathonId: args.data.hackathonId ?? null,
          teamId: args.data.teamId ?? null,
          targetUserId: args.data.targetUserId ?? null,
          action: args.data.action,
          metadata: args.data.metadata ?? {},
          ipAddress: args.data.ipAddress ?? null,
          correlationId: args.data.correlationId ?? null,
          createdAt: new Date(),
        };
        store.auditLogs.push(record);
        return { ...record };
      },
      deleteMany: async () => {
        const count = store.auditLogs.length;
        store.auditLogs = [];
        return { count };
      },
    },

    idempotencyRecord: {
      findUnique: async (args: any) => {
        const found = store.idempotencyRecords.find((r) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((r as any)[k], v))
        );
        return found ? { ...found } : null;
      },
      create: async (args: any) => {
        const record: IdempotencyRecord = {
          id: args.data.id || uuid(),
          key: args.data.key,
          userId: args.data.userId,
          endpoint: args.data.endpoint,
          requestHash: args.data.requestHash,
          statusCode: args.data.statusCode,
          responseBody: args.data.responseBody ?? {},
          createdAt: new Date(),
          expiresAt: new Date(args.data.expiresAt),
        };
        store.idempotencyRecords.push(record);
        return { ...record };
      },
      deleteMany: async () => {
        const count = store.idempotencyRecords.length;
        store.idempotencyRecords = [];
        return { count };
      },
    },

    announcement: {
      findMany: async (args: any = {}) => {
        let rows = store.announcements.filter((a) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((a as any)[k], v))
        );
        rows = sortRecords(rows, args.orderBy);
        rows = applyPagination(rows, args.skip, args.take);
        return rows.map((a) => enrichAnnouncement(a, args));
      },
      count: async (args: any = {}) => {
        return store.announcements.filter((a) =>
          Object.entries(args.where || {}).every(([k, v]) => matchCondition((a as any)[k], v))
        ).length;
      },
      create: async (args: any) => {
        const record: AnnouncementRecord = {
          id: args.data.id || uuid(),
          hackathonId: args.data.hackathonId,
          userId: args.data.userId,
          title: args.data.title ?? '',
          message: args.data.message,
          skills: args.data.skills ?? [],
          preferredRoles: args.data.preferredRoles ?? [],
          createdAt: new Date(),
        };
        store.announcements.push(record);
        return enrichAnnouncement(record, args);
      },
      deleteMany: async () => {
        const count = store.announcements.length;
        store.announcements = [];
        return { count };
      },
    },

    $queryRaw: async (_strings: TemplateStringsArray, ...values: any[]) => {
      // Used in TeamService for SELECT ... FROM "Team" WHERE id = ${teamId} FOR UPDATE
      const teamId = values[0];
      const team = store.teams.find((t) => t.id === teamId);
      if (!team) return [];
      return [
        {
          id: team.id,
          name: team.name,
          currentMemberCount: team.currentMemberCount,
          maxMembers: team.maxMembers,
          minMembers: team.minMembers,
          hackathonId: team.hackathonId,
          isLocked: team.isLocked,
        },
      ];
    },

    $transaction: async (fn: (tx: PrismaClient) => Promise<any>) => {
      // Serialize interactive transactions via promise mutex to preserve race-proof behavior in-memory
      const run = txQueue.then(() => fn(client as PrismaClient));
      txQueue = run.catch(() => undefined);
      return run;
    },

    $connect: async () => undefined,
    $disconnect: async () => undefined,
  };

  return client as PrismaClient;
}

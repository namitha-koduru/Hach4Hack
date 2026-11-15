import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  TeamFullError,
  AlreadyInTeamError,
  ForbiddenError,
} from '../utils/errors';
import { generateInviteCode, hashString } from '../utils/crypto';
import { AuditService } from './auditService';
import { socketEvents } from '../socket';
import {
  CreateTeamInput,
  UpdateTeamInput,
  TeamFilterQuery,
  TeamSummary,
} from 'shared';

interface RawLockedTeam {
  id: string;
  name: string;
  currentMemberCount: number;
  maxMembers: number;
  minMembers: number;
  hackathonId: string;
  isLocked: boolean;
}

interface TeamListCacheEntry {
  data: TeamSummary[];
  total: number;
  expiresAt: number;
}

// In-memory caching for high-concurrency read-heavy discovery board
const listTeamsCache = new Map<string, TeamListCacheEntry>();
const countCache = new Map<string, { count: number; expiresAt: number }>();

export const invalidateTeamCache = () => {
  listTeamsCache.clear();
  countCache.clear();
};

export class TeamService {
  /**
   * Create a new team atomically within a transaction.
   * Creator automatically becomes LEADER.
   * Enforces that creator does not already belong to a team in this hackathon.
   */
  static async createTeam(userId: string, input: CreateTeamInput, clientIp?: string) {
    // 1. Verify hackathon exists and is active
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: input.hackathonId },
    });

    if (!hackathon || !hackathon.isActive) {
      throw new BadRequestError('Hackathon not found or is currently inactive');
    }

    // 2. Check user's current team membership in this hackathon
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        hackathonId: input.hackathonId,
      },
    });

    if (existingMembership) {
      throw new AlreadyInTeamError();
    }

    // 3. Check for unique team name within this hackathon
    const existingTeamName = await prisma.team.findUnique({
      where: {
        hackathonId_name: {
          hackathonId: input.hackathonId,
          name: input.name.trim(),
        },
      },
    });

    if (existingTeamName) {
      throw new ConflictError(`A team named "${input.name.trim()}" already exists in this hackathon`);
    }

    let createdInviteCode: { rawCode: string; expiresAt: Date } | null = null;

    // 4. Atomic Transaction: Create Team, Add Creator as Leader, Generate Invite if requested, Write Audit Log
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          hackathonId: input.hackathonId,
          name: input.name.trim(),
          description: input.description?.trim() || '',
          minMembers: hackathon.minTeamSize,
          maxMembers: hackathon.maxTeamSize,
          currentMemberCount: 1,
          requiredSkills: input.requiredSkills.map((s) => s.trim()),
          isLocked: false,
        },
      });

      // Add Creator as LEADER
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId,
          hackathonId: input.hackathonId,
          role: 'LEADER',
        },
      });

      // Generate initial invitation code if requested
      if (input.generateInviteCode) {
        const { rawCode, codeHash, codePrefix } = generateInviteCode();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        await tx.invitationCode.create({
          data: {
            teamId: newTeam.id,
            codeHash,
            codePrefix,
            createdById: userId,
            expiresAt,
            maxUses: hackathon.maxTeamSize - 1,
          },
        });

        createdInviteCode = { rawCode, expiresAt };

        await AuditService.record(tx, {
          actorId: userId,
          hackathonId: input.hackathonId,
          teamId: newTeam.id,
          action: AuditAction.INVITE_CREATED,
          metadata: { codePrefix, expiresAt },
          ipAddress: clientIp,
        });
      }

      // Record Audit Log
      await AuditService.record(tx, {
        actorId: userId,
        hackathonId: input.hackathonId,
        teamId: newTeam.id,
        action: AuditAction.TEAM_CREATED,
        metadata: { teamName: newTeam.name, requiredSkills: newTeam.requiredSkills },
        ipAddress: clientIp,
      });

      return newTeam;
    });

    // 5. Post-Commit Real-Time Broadcast
    socketEvents.emitTeamCreated(input.hackathonId, team);
    invalidateTeamCache();

    return {
      team,
      inviteCode: createdInviteCode,
    };
  }

  /**
   * Discover and filter teams with pagination.
   * Optimized with covering indexes, intelligent count caching, and read-heavy board caching.
   */
  static async listTeams(query: TeamFilterQuery, currentUserId?: string) {
    const { hackathonId, search, skill, hasSeats, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const cacheKey = `${hackathonId || ''}:${search || ''}:${skill || ''}:${hasSeats ? '1' : '0'}:${page}:${limit}:${sortBy}:${sortOrder}`;
    const now = Date.now();
    const cached = listTeamsCache.get(cacheKey);

    let total: number;
    let baseTeams: TeamSummary[];

    if (cached && cached.expiresAt > now) {
      total = cached.total;
      baseTeams = cached.data;
    } else {
      const where: Prisma.TeamWhereInput = {};

      if (hackathonId) {
        where.hackathonId = hackathonId;
      }

      if (search && search.trim()) {
        where.name = {
          contains: search.trim(),
          mode: 'insensitive',
        };
      }

      if (skill && skill.trim()) {
        where.requiredSkills = {
          has: skill.trim(),
        };
      }

      if (hasSeats) {
        // Teams where currentMemberCount < maxMembers
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            isLocked: false,
          },
        ];
      }

      // Build order by
      const orderBy: Prisma.TeamOrderByWithRelationInput = {};
      if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else {
        orderBy.createdAt = sortOrder;
      }

      const teamInclude = {
        hackathon: {
          select: { id: true, title: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                skills: true,
                preferredRoles: true,
                timezone: true,
              },
            },
          },
        },
      } satisfies Prisma.TeamInclude;

      let teams: Array<Prisma.TeamGetPayload<{ include: typeof teamInclude }>>;
      if (hasSeats) {
        // Select lightweight capacity columns to accurately exclude full unlocked teams
        const candidates = await prisma.team.findMany({
          where,
          select: {
            id: true,
            currentMemberCount: true,
            maxMembers: true,
          },
          orderBy,
        });

        const openIds = candidates
          .filter((t) => t.currentMemberCount < t.maxMembers)
          .map((t) => t.id);

        total = openIds.length;
        const pageIds = openIds.slice(skip, skip + limit);

        if (pageIds.length === 0) {
          teams = [];
        } else {
          const fetched = await prisma.team.findMany({
            where: { id: { in: pageIds } },
            include: teamInclude,
          });
          // Preserve exact sorted order from pageIds
          const byId = new Map(fetched.map((t) => [t.id, t]));
          teams = pageIds
            .map((id) => byId.get(id))
            .filter((t): t is Prisma.TeamGetPayload<{ include: typeof teamInclude }> => Boolean(t));
        }
      } else {
        teams = await prisma.team.findMany({
          where,
          include: teamInclude,
          orderBy,
          skip,
          take: limit,
        });

        // Optimized count calculation:
        // If page 1 has fewer records than limit, total is simply teams.length!
        if (page === 1 && teams.length < limit) {
          total = teams.length;
        } else {
          const whereKey = JSON.stringify(where);
          const cachedCount = countCache.get(whereKey);
          if (cachedCount && cachedCount.expiresAt > now) {
            total = cachedCount.count;
          } else {
            total = await prisma.team.count({ where });
            countCache.set(whereKey, { count: total, expiresAt: now + 5000 });
          }
        }
      }

      baseTeams = teams.map((t) => {
        const leaderMember = t.members.find((m) => m.role === 'LEADER');
        return {
          id: t.id,
          hackathonId: t.hackathonId,
          name: t.name,
          description: t.description,
          minMembers: t.minMembers,
          maxMembers: t.maxMembers,
          currentMemberCount: t.currentMemberCount,
          availableSeats: Math.max(0, t.maxMembers - t.currentMemberCount),
          requiredSkills: t.requiredSkills,
          isLocked: t.isLocked,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          hackathon: t.hackathon,
          leader: leaderMember ? { id: leaderMember.user.id, name: leaderMember.user.name } : undefined,
          members: t.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            teamId: m.teamId,
            role: m.role as any,
            joinedAt: m.joinedAt.toISOString(),
            user: m.user,
          })),
          userRequestStatus: null,
        };
      });

      // Cache unauthenticated base board for 3 seconds
      listTeamsCache.set(cacheKey, {
        data: baseTeams,
        total,
        expiresAt: now + 3000,
      });
    }

    // Attach user request status if authenticated
    let formattedTeams = baseTeams;
    if (currentUserId && baseTeams.length > 0) {
      const requests = await prisma.joinRequest.findMany({
        where: {
          userId: currentUserId,
          teamId: { in: baseTeams.map((t) => t.id) },
        },
        select: { teamId: true, status: true },
      });
      const userRequests = requests.reduce((acc, r) => {
        acc[r.teamId] = r.status;
        return acc;
      }, {} as Record<string, string>);

      formattedTeams = baseTeams.map((t) => ({
        ...t,
        userRequestStatus: (userRequests[t.id] as any) || null,
      }));
    }

    return {
      data: formattedTeams,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch single team details.
   */
  static async getTeamById(teamId: string, currentUserId?: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        hackathon: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                skills: true,
                preferredRoles: true,
                timezone: true,
                bio: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    let userRequestStatus = null;
    if (currentUserId) {
      const req = await prisma.joinRequest.findFirst({
        where: { teamId, userId: currentUserId },
        orderBy: { createdAt: 'desc' },
      });
      userRequestStatus = req ? req.status : null;
    }

    const leaderMember = team.members.find((m) => m.role === 'LEADER');

    return {
      ...team,
      availableSeats: Math.max(0, team.maxMembers - team.currentMemberCount),
      leader: leaderMember ? leaderMember.user : null,
      userRequestStatus,
    };
  }

  /**
   * Update team info (Only Leader).
   */
  static async updateTeam(teamId: string, input: UpdateTeamInput, clientIp?: string) {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description.trim() }),
        ...(input.requiredSkills && { requiredSkills: input.requiredSkills.map((s) => s.trim()) }),
      },
    });

    socketEvents.emitTeamUpdated(team.hackathonId, team.id, team);
    invalidateTeamCache();
    return team;
  }

  /**
   * =========================================================================
   * RACE-PROOF ATOMIC JOIN VIA INVITATION CODE
   * Uses SELECT FOR UPDATE to serialize capacity-changing operations.
   * =========================================================================
   */
  static async joinWithInviteCode(userId: string, rawCode: string, clientIp?: string) {
    const codeHash = hashString(rawCode.trim());

    // Find invitation
    const invite = await prisma.invitationCode.findUnique({
      where: { codeHash },
      include: { team: true },
    });

    if (!invite) {
      throw new BadRequestError('Invalid invitation code');
    }

    if (invite.isRevoked) {
      throw new BadRequestError('This invitation code has been revoked');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestError('This invitation code has expired');
    }

    if (invite.usesCount >= invite.maxUses) {
      throw new BadRequestError('This invitation code has reached its maximum usage limit');
    }

    const teamId = invite.teamId;

    // Execute atomic join with row locking
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Lock the team row exclusively: SELECT ... FOR UPDATE
        const lockedRows = await tx.$queryRaw<RawLockedTeam[]>`
          SELECT id, name, "currentMemberCount", "maxMembers", "hackathonId", "isLocked"
          FROM "Team"
          WHERE id = ${teamId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError('Team');
        }

        const lockedTeam = lockedRows[0];

        if (lockedTeam.isLocked) {
          throw new BadRequestError('This team is locked and not accepting new members');
        }

        // 2. Strict capacity check on locked committed state
        if (lockedTeam.currentMemberCount >= lockedTeam.maxMembers) {
          throw new TeamFullError();
        }

        // 3. Check if user already in any team for this hackathon
        const existingMember = await tx.teamMember.findFirst({
          where: {
            userId,
            hackathonId: lockedTeam.hackathonId,
          },
        });

        if (existingMember) {
          throw new AlreadyInTeamError();
        }

        // 4. Create membership
        const newMember = await tx.teamMember.create({
          data: {
            teamId,
            userId,
            hackathonId: lockedTeam.hackathonId,
            role: 'MEMBER',
          },
          include: {
            user: {
              select: { id: true, name: true, skills: true, preferredRoles: true, timezone: true },
            },
          },
        });

        // 5. Increment team member count
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            currentMemberCount: { increment: 1 },
          },
        });

        // 6. Increment invite code usage
        await tx.invitationCode.update({
          where: { id: invite.id },
          data: {
            usesCount: { increment: 1 },
          },
        });

        // 7. Audit log
        await AuditService.record(tx, {
          actorId: userId,
          hackathonId: lockedTeam.hackathonId,
          teamId,
          action: AuditAction.MEMBER_JOINED,
          metadata: { via: 'INVITE_CODE', invitePrefix: invite.codePrefix },
          ipAddress: clientIp,
        });

        return { updatedTeam, newMember };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Post-commit broadcast
    socketEvents.emitMemberJoined(result.updatedTeam.hackathonId, teamId, result.newMember);
    socketEvents.emitTeamUpdated(result.updatedTeam.hackathonId, teamId, result.updatedTeam);
    invalidateTeamCache();

    return result;
  }

  /**
   * =========================================================================
   * RACE-PROOF ATOMIC DIRECT JOIN
   * Used for direct seat claiming and automated concurrency benchmarks (50 users -> 1 seat)
   * =========================================================================
   */
  static async directJoinTeam(userId: string, teamId: string, clientIp?: string) {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. SELECT FOR UPDATE to serialize operations for this team
        const lockedRows = await tx.$queryRaw<RawLockedTeam[]>`
          SELECT id, name, "currentMemberCount", "maxMembers", "hackathonId", "isLocked"
          FROM "Team"
          WHERE id = ${teamId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError('Team');
        }

        const team = lockedRows[0];

        if (team.isLocked) {
          throw new BadRequestError('Team is locked');
        }

        // 2. Strict capacity check
        if (team.currentMemberCount >= team.maxMembers) {
          throw new TeamFullError();
        }

        // 3. User single-team membership per hackathon
        const existing = await tx.teamMember.findFirst({
          where: {
            userId,
            hackathonId: team.hackathonId,
          },
        });

        if (existing) {
          throw new AlreadyInTeamError();
        }

        // 4. Insert membership
        const member = await tx.teamMember.create({
          data: {
            teamId,
            userId,
            hackathonId: team.hackathonId,
            role: 'MEMBER',
          },
          include: {
            user: {
              select: { id: true, name: true, skills: true, timezone: true },
            },
          },
        });

        // 5. Increment count
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            currentMemberCount: { increment: 1 },
          },
        });

        // 6. Record Audit Log
        await AuditService.record(tx, {
          actorId: userId,
          hackathonId: team.hackathonId,
          teamId,
          action: AuditAction.MEMBER_JOINED,
          metadata: { method: 'DIRECT_JOIN' },
          ipAddress: clientIp,
        });

        return { updatedTeam, member };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    socketEvents.emitMemberJoined(result.updatedTeam.hackathonId, teamId, result.member);
    socketEvents.emitTeamUpdated(result.updatedTeam.hackathonId, teamId, result.updatedTeam);
    invalidateTeamCache();

    return result;
  }

  /**
   * Create Join Request (Participant).
   */
  static async createJoinRequest(userId: string, teamId: string, message?: string, clientIp?: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { role: 'LEADER' },
          select: { userId: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    if (team.isLocked) {
      throw new BadRequestError('Team is currently locked');
    }

    if (team.currentMemberCount >= team.maxMembers) {
      throw new TeamFullError();
    }

    // Check user membership in this hackathon
    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId, hackathonId: team.hackathonId },
    });

    if (existingMembership) {
      throw new AlreadyInTeamError();
    }

    // Check existing pending request
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        userId,
        teamId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new ConflictError('You already have a pending join request for this team');
    }

    const request = await prisma.joinRequest.create({
      data: {
        teamId,
        userId,
        hackathonId: team.hackathonId,
        message: message?.trim() || '',
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, skills: true, preferredRoles: true, timezone: true, bio: true },
        },
      },
    });

    await AuditService.record(prisma, {
      actorId: userId,
      hackathonId: team.hackathonId,
      teamId,
      action: AuditAction.JOIN_REQUEST_CREATED,
      metadata: { requestId: request.id },
      ipAddress: clientIp,
    });

    const leaderId = team.members[0]?.userId;
    if (leaderId) {
      socketEvents.emitRequestCreated(teamId, leaderId, request);
    }

    return request;
  }

  /**
   * =========================================================================
   * RACE-PROOF ATOMIC JOIN REQUEST ACCEPTANCE
   * Serialized with SELECT FOR UPDATE row locking.
   * =========================================================================
   */
  static async acceptJoinRequest(leaderUserId: string, requestId: string, clientIp?: string) {
    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!request) {
      throw new NotFoundError('Join Request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot accept request that is already ${request.status}`);
    }

    const teamId = request.teamId;

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Lock Team Row with FOR UPDATE
        const lockedRows = await tx.$queryRaw<RawLockedTeam[]>`
          SELECT id, name, "currentMemberCount", "maxMembers", "hackathonId", "isLocked"
          FROM "Team"
          WHERE id = ${teamId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError('Team');
        }

        const lockedTeam = lockedRows[0];

        // 2. Verify leader authority
        const leaderCheck = await tx.teamMember.findFirst({
          where: {
            teamId,
            userId: leaderUserId,
            role: 'LEADER',
          },
        });

        if (!leaderCheck) {
          throw new ForbiddenError('Only the team leader can accept join requests');
        }

        // 3. Concurrency check: Ensure capacity is still available
        if (lockedTeam.currentMemberCount >= lockedTeam.maxMembers) {
          throw new TeamFullError();
        }

        // 4. Ensure requester is not already in another team in this hackathon
        const alreadyInOtherTeam = await tx.teamMember.findFirst({
          where: {
            userId: request.userId,
            hackathonId: lockedTeam.hackathonId,
          },
        });

        if (alreadyInOtherTeam) {
          // Reject request automatically because applicant is already committed
          await tx.joinRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED' },
          });
          throw new AlreadyInTeamError('Applicant has already joined another team in this hackathon');
        }

        // 5. Update request status to ACCEPTED
        const updatedRequest = await tx.joinRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' },
        });

        // 6. Add new member
        const newMember = await tx.teamMember.create({
          data: {
            teamId,
            userId: request.userId,
            hackathonId: lockedTeam.hackathonId,
            role: 'MEMBER',
          },
          include: {
            user: {
              select: { id: true, name: true, skills: true, preferredRoles: true, timezone: true },
            },
          },
        });

        // 7. Increment member count
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            currentMemberCount: { increment: 1 },
          },
        });

        // 8. Audit Log
        await AuditService.record(tx, {
          actorId: leaderUserId,
          hackathonId: lockedTeam.hackathonId,
          teamId,
          targetUserId: request.userId,
          action: AuditAction.JOIN_REQUEST_ACCEPTED,
          metadata: { requestId },
          ipAddress: clientIp,
        });

        return { updatedRequest, newMember, updatedTeam };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Post-commit broadcasts
    socketEvents.emitRequestAccepted(teamId, request.userId, result.updatedRequest);
    socketEvents.emitMemberJoined(result.updatedTeam.hackathonId, teamId, result.newMember);
    socketEvents.emitTeamUpdated(result.updatedTeam.hackathonId, teamId, result.updatedTeam);
    invalidateTeamCache();

    return result;
  }

  /**
   * Decline Join Request.
   */
  static async declineJoinRequest(leaderUserId: string, requestId: string, clientIp?: string) {
    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!request) {
      throw new NotFoundError('Join Request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot decline request that is already ${request.status}`);
    }

    // Verify leader
    const leaderCheck = await prisma.teamMember.findFirst({
      where: {
        teamId: request.teamId,
        userId: leaderUserId,
        role: 'LEADER',
      },
    });

    if (!leaderCheck) {
      throw new ForbiddenError('Only the team leader can decline join requests');
    }

    const updated = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });

    await AuditService.record(prisma, {
      actorId: leaderUserId,
      hackathonId: request.team.hackathonId,
      teamId: request.teamId,
      targetUserId: request.userId,
      action: AuditAction.JOIN_REQUEST_DECLINED,
      metadata: { requestId },
      ipAddress: clientIp,
    });

    socketEvents.emitRequestDeclined(request.teamId, request.userId, updated);
    return updated;
  }

  /**
   * Cancel Join Request (By Applicant).
   */
  static async cancelJoinRequest(userId: string, requestId: string) {
    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Join Request');
    }

    if (request.userId !== userId) {
      throw new ForbiddenError('You can only cancel your own join requests');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot cancel a request that is already ${request.status}`);
    }

    const updated = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    await AuditService.record(prisma, {
      actorId: userId,
      hackathonId: request.hackathonId,
      teamId: request.teamId,
      action: AuditAction.JOIN_REQUEST_CANCELLED,
      metadata: { requestId },
    });

    return updated;
  }

  /**
   * List pending join requests for a team (Leader only).
   */
  static async getTeamRequests(teamId: string) {
    return prisma.joinRequest.findMany({
      where: { teamId, status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            skills: true,
            preferredRoles: true,
            timezone: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * =========================================================================
   * LEAVE TEAM & DETERMINISTIC LEADERSHIP SUCCESSION
   * When leader leaves:
   * 1. Lock team
   * 2. If only 1 member: Team is deleted
   * 3. If multiple members: Oldest member (earliest joinedAt) is promoted to LEADER
   * =========================================================================
   */
  static async leaveTeam(userId: string, teamId: string, clientIp?: string) {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Lock team row
        const lockedRows = await tx.$queryRaw<RawLockedTeam[]>`
          SELECT id, name, "currentMemberCount", "maxMembers", "hackathonId", "isLocked"
          FROM "Team"
          WHERE id = ${teamId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError('Team');
        }

        const team = lockedRows[0];

        // 2. Fetch leaving user's membership
        const member = await tx.teamMember.findFirst({
          where: { teamId, userId },
        });

        if (!member) {
          throw new BadRequestError('You are not a member of this team');
        }

        // 3. Fetch all team members ordered by joinedAt asc (Deterministic queue)
        const allMembers = await tx.teamMember.findMany({
          where: { teamId },
          orderBy: { joinedAt: 'asc' },
        });

        // Case A: Last member leaving -> Delete Team
        if (allMembers.length <= 1) {
          // 1. Record deletion audit log before deleting the team
          await AuditService.record(tx, {
            actorId: userId,
            hackathonId: team.hackathonId,
            teamId: team.id,
            action: AuditAction.TEAM_DELETED,
            metadata: {
              deletedTeamId: team.id,
              teamName: team.name,
              reason: 'LAST_MEMBER_LEFT',
            },
            ipAddress: clientIp,
          });

          // 2. Delete the team (Database sets AuditLog.teamId to NULL via onDelete: SetNull)
          await tx.team.delete({
            where: { id: teamId },
          });

          return { action: 'TEAM_DELETED', hackathonId: team.hackathonId, teamId, teamName: team.name };
        }

        // Case B: Leader leaving with remaining members -> Deterministic Succession
        let newLeaderId: string | null = null;
        if (member.role === 'LEADER') {
          // Find next oldest member who is not the departing leader
          const eligibleSuccessor = allMembers.find((m) => m.userId !== userId);
          if (!eligibleSuccessor) {
            throw new Error('Successor selection failed');
          }

          newLeaderId = eligibleSuccessor.userId;

          // Promote successor to LEADER
          await tx.teamMember.update({
            where: { id: eligibleSuccessor.id },
            data: { role: 'LEADER' },
          });

          await AuditService.record(tx, {
            actorId: userId,
            hackathonId: team.hackathonId,
            teamId,
            targetUserId: newLeaderId,
            action: AuditAction.LEADER_TRANSFERRED,
            metadata: { reason: 'PREVIOUS_LEADER_LEFT', successorJoinedAt: eligibleSuccessor.joinedAt },
            ipAddress: clientIp,
          });
        }

        // Remove leaving user
        await tx.teamMember.delete({
          where: { id: member.id },
        });

        // Decrement member count
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            currentMemberCount: { decrement: 1 },
          },
        });

        // Audit log member left
        await AuditService.record(tx, {
          actorId: userId,
          hackathonId: team.hackathonId,
          teamId,
          action: AuditAction.MEMBER_LEFT,
          ipAddress: clientIp,
        });

        return {
          action: 'MEMBER_LEFT',
          hackathonId: team.hackathonId,
          teamId,
          newLeaderId,
          updatedTeam,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Broadcast post-commit
    invalidateTeamCache();
    if (result.action === 'TEAM_DELETED') {
      socketEvents.emitTeamDeleted(result.hackathonId, result.teamId);
    } else {
      if (result.newLeaderId) {
        socketEvents.emitLeaderChanged(result.teamId, result.newLeaderId);
      }
      socketEvents.emitMemberLeft(result.hackathonId, result.teamId, userId);
      socketEvents.emitTeamUpdated(result.hackathonId, result.teamId, result.updatedTeam);
    }

    return result;
  }

  /**
   * Remove member from team (Leader only).
   */
  static async removeMember(leaderUserId: string, teamId: string, targetUserId: string, clientIp?: string) {
    if (leaderUserId === targetUserId) {
      throw new BadRequestError('Team leaders cannot remove themselves. Use leave team instead.');
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock team
        const lockedRows = await tx.$queryRaw<RawLockedTeam[]>`
          SELECT id, name, "currentMemberCount", "maxMembers", "hackathonId", "isLocked"
          FROM "Team"
          WHERE id = ${teamId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError('Team');
        }

        const team = lockedRows[0];

        // Verify leader
        const leader = await tx.teamMember.findFirst({
          where: { teamId, userId: leaderUserId, role: 'LEADER' },
        });

        if (!leader) {
          throw new ForbiddenError('Only the team leader can remove members');
        }

        // Find target
        const targetMember = await tx.teamMember.findFirst({
          where: { teamId, userId: targetUserId },
        });

        if (!targetMember) {
          throw new NotFoundError('Target team member');
        }

        // Delete target membership
        await tx.teamMember.delete({
          where: { id: targetMember.id },
        });

        // Decrement member count
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            currentMemberCount: { decrement: 1 },
          },
        });

        // Audit log
        await AuditService.record(tx, {
          actorId: leaderUserId,
          hackathonId: team.hackathonId,
          teamId,
          targetUserId,
          action: AuditAction.MEMBER_REMOVED,
          ipAddress: clientIp,
        });

        return { updatedTeam, hackathonId: team.hackathonId };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    socketEvents.emitMemberRemoved(result.hackathonId, teamId, targetUserId);
    socketEvents.emitTeamUpdated(result.hackathonId, teamId, result.updatedTeam);
    invalidateTeamCache();

    return result;
  }

  /**
   * Delete team (Leader or Admin).
   */
  static async deleteTeam(userId: string, teamId: string, isAdmin: boolean = false, clientIp?: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { role: 'LEADER' },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    if (!isAdmin && team.members[0]?.userId !== userId) {
      throw new ForbiddenError('Only the team leader or an administrator can delete this team');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Record deletion audit log before deleting the team
      await AuditService.record(tx, {
        actorId: userId,
        hackathonId: team.hackathonId,
        teamId: team.id,
        action: AuditAction.TEAM_DELETED,
        metadata: {
          deletedTeamId: team.id,
          teamName: team.name,
          deletedByRole: isAdmin ? 'ADMIN' : 'LEADER',
        },
        ipAddress: clientIp,
      });

      // 2. Delete the team (Database sets AuditLog.teamId to NULL via onDelete: SetNull)
      await tx.team.delete({
        where: { id: teamId },
      });
    });

    socketEvents.emitTeamDeleted(team.hackathonId, teamId);
    invalidateTeamCache();
    return { success: true };
  }

  /**
   * Generate new invitation code (Leader only).
   */
  static async createInviteCode(leaderUserId: string, teamId: string, expiresInHours: number = 48, maxUses: number = 1) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: leaderUserId, role: 'LEADER' },
        },
      },
    });

    if (!team || team.members.length === 0) {
      throw new ForbiddenError('Only the team leader can generate invitation codes');
    }

    const { rawCode, codeHash, codePrefix } = generateInviteCode();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.invitationCode.create({
      data: {
        teamId,
        codeHash,
        codePrefix,
        createdById: leaderUserId,
        expiresAt,
        maxUses,
      },
    });

    await AuditService.record(prisma, {
      actorId: leaderUserId,
      hackathonId: team.hackathonId,
      teamId,
      action: AuditAction.INVITE_CREATED,
      metadata: { codePrefix, expiresAt, maxUses },
    });

    return {
      id: invite.id,
      code: rawCode, // Raw code returned only once upon creation
      codePrefix,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usesCount: invite.usesCount,
    };
  }

  /**
   * Revoke invitation code (Leader only).
   */
  static async revokeInviteCode(leaderUserId: string, inviteId: string) {
    const invite = await prisma.invitationCode.findUnique({
      where: { id: inviteId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: leaderUserId, role: 'LEADER' },
            },
          },
        },
      },
    });

    if (!invite || invite.team.members.length === 0) {
      throw new ForbiddenError('Only the team leader can revoke invitation codes');
    }

    const updated = await prisma.invitationCode.update({
      where: { id: inviteId },
      data: { isRevoked: true },
    });

    await AuditService.record(prisma, {
      actorId: leaderUserId,
      hackathonId: invite.team.hackathonId,
      teamId: invite.teamId,
      action: AuditAction.INVITE_REVOKED,
      metadata: { codePrefix: invite.codePrefix },
    });

    return updated;
  }
}

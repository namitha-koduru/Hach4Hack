import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface AuditLogParams {
  actorId?: string | null;
  hackathonId?: string | null;
  teamId?: string | null;
  targetUserId?: string | null;
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  correlationId?: string | null;
}

export class AuditService {
  /**
   * Write an immutable audit log entry.
   * Can accept either the global prisma instance or an ongoing interactive transaction (tx).
   */
  static async record(
    client: Prisma.TransactionClient | typeof prisma,
    params: AuditLogParams
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        actorId: params.actorId || null,
        hackathonId: params.hackathonId || null,
        teamId: params.teamId || null,
        targetUserId: params.targetUserId || null,
        action: params.action,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress || null,
        correlationId: params.correlationId || null,
      },
    });
  }

  static async getTeamLogs(teamId: string, limit: number = 50, offset: number = 0) {
    return prisma.auditLog.findMany({
      where: { teamId },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}


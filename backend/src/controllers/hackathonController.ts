import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CreateAnnouncementSchema } from 'shared';
import { socketEvents } from '../socket';

export class HackathonController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathons = await prisma.hackathon.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { teams: true, members: true },
          },
        },
        orderBy: { startDate: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: hackathons.map((h) => ({
          id: h.id,
          title: h.title,
          slug: h.slug,
          description: h.description,
          minTeamSize: h.minTeamSize,
          maxTeamSize: h.maxTeamSize,
          startDate: h.startDate,
          endDate: h.endDate,
          isActive: h.isActive,
          teamCount: h._count.teams,
          memberCount: h._count.members,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const hackathon = await prisma.hackathon.findUnique({
        where: { id },
        include: {
          _count: {
            select: { teams: true, members: true },
          },
        },
      });

      if (!hackathon) {
        throw new NotFoundError('Hackathon');
      }

      const { _count, ...rest } = hackathon;

      res.status(200).json({
        success: true,
        data: {
          ...rest,
          teamCount: _count.teams,
          memberCount: _count.members,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, slug, description, minTeamSize, maxTeamSize, startDate, endDate } = req.body;

      const hackathon = await prisma.hackathon.create({
        data: {
          title,
          slug,
          description: description || '',
          minTeamSize: minTeamSize || 2,
          maxTeamSize: maxTeamSize || 5,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

      res.status(201).json({
        success: true,
        data: hackathon,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id as string;
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const skill = req.query.skill ? (req.query.skill as string).trim() : undefined;

      const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
      if (!hackathon) {
        throw new NotFoundError('Hackathon');
      }

      const where: any = { hackathonId };
      if (skill) {
        where.skills = { has: skill };
      }

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                timezone: true,
                bio: true,
                skills: true,
                preferredRoles: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.announcement.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id as string;
      const userId = req.user?.userId;

      if (!userId) {
        throw new BadRequestError('User authentication required');
      }

      const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
      if (!hackathon) {
        throw new NotFoundError('Hackathon');
      }

      const validated = CreateAnnouncementSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('User');
      }

      const skills = (validated.skills && validated.skills.length > 0) ? validated.skills : user.skills;
      const preferredRoles = (validated.preferredRoles && validated.preferredRoles.length > 0) ? validated.preferredRoles : user.preferredRoles;

      const announcement = await prisma.announcement.create({
        data: {
          hackathonId,
          userId: user.id,
          title: validated.title || '',
          message: validated.message,
          skills,
          preferredRoles,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              timezone: true,
              bio: true,
              skills: true,
              preferredRoles: true,
            },
          },
        },
      });

      // Stream live to hackathon room
      socketEvents.emitAnnouncementCreated(hackathonId, announcement);

      res.status(201).json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  }
}

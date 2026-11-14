import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';

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
}

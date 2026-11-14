import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/crypto';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { RegisterInput, LoginInput, UpdateProfileInput } from 'shared';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, bio, skills, preferredRoles, timezone } = req.body as RegisterInput;

      // 1. Check existing user
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existing) {
        throw new ConflictError('A user with this email address already exists');
      }

      // 2. Hash password
      const passwordHash = await hashPassword(password);

      // 3. Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name: name.trim(),
          bio: bio?.trim() || '',
          skills: skills.map((s) => s.trim()),
          preferredRoles: preferredRoles.map((r) => r.trim()),
          timezone: timezone.trim(),
          role: 'PARTICIPANT',
        },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          skills: true,
          preferredRoles: true,
          timezone: true,
          role: true,
          createdAt: true,
        },
      });

      // 4. Issue JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginInput;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            bio: user.bio,
            skills: user.skills,
            preferredRoles: user.preferredRoles,
            timezone: user.timezone,
            role: user.role,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: {
              team: {
                include: {
                  hackathon: {
                    select: { id: true, title: true, slug: true },
                  },
                },
              },
            },
          },
          joinRequests: {
            where: { status: 'PENDING' },
            include: {
              team: {
                select: { id: true, name: true, hackathonId: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          skills: user.skills,
          preferredRoles: user.preferredRoles,
          timezone: user.timezone,
          role: user.role,
          createdAt: user.createdAt,
          memberships: user.memberships,
          pendingRequests: user.joinRequests,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body as UpdateProfileInput;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.bio !== undefined && { bio: data.bio.trim() }),
          ...(data.skills && { skills: data.skills.map((s) => s.trim()) }),
          ...(data.preferredRoles && { preferredRoles: data.preferredRoles.map((r) => r.trim()) }),
          ...(data.timezone && { timezone: data.timezone.trim() }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          skills: true,
          preferredRoles: true,
          timezone: true,
          role: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

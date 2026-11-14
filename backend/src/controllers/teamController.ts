import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/teamService';
import { RecommendationService } from '../services/recommendationService';
import { AuditService } from '../services/auditService';
import {
  CreateTeamInput,
  UpdateTeamInput,
  CreateInviteInput,
  RedeemInviteInput,
  CreateJoinRequestInput,
  TeamFilterQuery,
} from 'shared';

export class TeamController {
  static async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await TeamService.createTeam(userId, req.body as CreateTeamInput, clientIp);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.userId;
      const result = await TeamService.listTeams(req.query as unknown as TeamFilterQuery, currentUserId);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTeamById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const currentUserId = req.user?.userId;
      const team = await TeamService.getTeamById(id, currentUserId);

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const clientIp = req.ip || req.socket.remoteAddress;
      const team = await TeamService.updateTeam(id, req.body as UpdateTeamInput, clientIp);

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const clientIp = req.ip || req.socket.remoteAddress;

      await TeamService.deleteTeam(userId, id, isAdmin, clientIp);

      res.status(200).json({
        success: true,
        message: 'Team successfully deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  static async directJoin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.directJoinTeam(userId, id, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async leaveTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.leaveTeam(userId, id, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const leaderUserId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.removeMember(leaderUserId, id, targetUserId, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const leaderUserId = req.user!.userId;
      const { expiresInHours, maxUses } = req.body as CreateInviteInput;

      const invite = await TeamService.createInviteCode(leaderUserId, id, expiresInHours, maxUses);

      res.status(201).json({
        success: true,
        data: invite,
      });
    } catch (error) {
      next(error);
    }
  }

  static async redeemInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { code } = req.body as RedeemInviteInput;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.joinWithInviteCode(userId, code, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async revokeInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const leaderUserId = req.user!.userId;

      const result = await TeamService.revokeInviteCode(leaderUserId, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = req.params.id as string;
      const userId = req.user!.userId;
      const { message } = req.body as CreateJoinRequestInput;
      const clientIp = req.ip || req.socket.remoteAddress;

      const request = await TeamService.createJoinRequest(userId, teamId, message, clientIp);

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = req.params.id as string;
      const requests = await TeamService.getTeamRequests(teamId);

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const leaderUserId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.acceptJoinRequest(leaderUserId, requestId, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async declineRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const leaderUserId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await TeamService.declineJoinRequest(leaderUserId, requestId, clientIp);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const userId = req.user!.userId;

      const result = await TeamService.cancelJoinRequest(userId, requestId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const suggestions = await RecommendationService.getSuggestionsForTeam(teamId, limit);

      res.status(200).json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const logs = await AuditService.getTeamLogs(teamId, limit, offset);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

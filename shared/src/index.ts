import { z } from 'zod';

// ==========================================
// DOMAIN ENUMS & CONSTANTS
// ==========================================

export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}

export enum TeamMemberRole {
  LEADER = 'LEADER',
  MEMBER = 'MEMBER',
}

export enum JoinRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum AuditAction {
  TEAM_CREATED = 'TEAM_CREATED',
  JOIN_REQUEST_CREATED = 'JOIN_REQUEST_CREATED',
  JOIN_REQUEST_ACCEPTED = 'JOIN_REQUEST_ACCEPTED',
  JOIN_REQUEST_DECLINED = 'JOIN_REQUEST_DECLINED',
  JOIN_REQUEST_CANCELLED = 'JOIN_REQUEST_CANCELLED',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  LEADER_TRANSFERRED = 'LEADER_TRANSFERRED',
  TEAM_DELETED = 'TEAM_DELETED',
  INVITE_CREATED = 'INVITE_CREATED',
  INVITE_REVOKED = 'INVITE_REVOKED',
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const RegisterSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  bio: z.string().max(500).optional().default(''),
  skills: z.array(z.string().min(1).max(50)).min(1, 'Provide at least one skill'),
  preferredRoles: z.array(z.string().min(1).max(50)).min(1, 'Provide at least one preferred role'),
  timezone: z.string().regex(/^[A-Za-z0-9/_+-]+$/, 'Invalid timezone format (e.g., UTC, America/New_York, Asia/Kolkata)'),
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  preferredRoles: z.array(z.string().min(1).max(50)).optional(),
  timezone: z.string().regex(/^[A-Za-z0-9/_+-]+$/).optional(),
});

export const CreateTeamSchema = z.object({
  hackathonId: z.string().uuid('Valid hackathonId is required'),
  name: z.string().min(3, 'Team name must be at least 3 characters').max(60, 'Team name cannot exceed 60 characters'),
  description: z.string().max(1000).optional().default(''),
  requiredSkills: z.array(z.string().min(1).max(50)).min(1, 'At least one required skill must be specified'),
  generateInviteCode: z.boolean().optional().default(false),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(3).max(60).optional(),
  description: z.string().max(1000).optional(),
  requiredSkills: z.array(z.string().min(1).max(50)).optional(),
});

export const CreateJoinRequestSchema = z.object({
  message: z.string().max(300, 'Message cannot exceed 300 characters').optional().default(''),
});

export const CreateInviteSchema = z.object({
  expiresInHours: z.number().int().min(1).max(168).default(48), // default 48h, max 1 week
  maxUses: z.number().int().min(1).max(50).default(1),
});

export const RedeemInviteSchema = z.object({
  code: z.string().min(8, 'Invalid invite code format').max(64),
});

export const TeamFilterQuerySchema = z.object({
  hackathonId: z.string().uuid().optional(),
  search: z.string().optional(),
  skill: z.string().optional(),
  hasSeats: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 10), z.number().int().min(1).max(50).default(10)),
  sortBy: z.enum(['createdAt', 'availableSeats', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CreateAnnouncementSchema = z.object({
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional().default(''),
  message: z.string().min(5, 'Announcement must be at least 5 characters').max(500, 'Announcement cannot exceed 500 characters'),
  skills: z.array(z.string().min(1).max(50)).max(10, 'Cannot specify more than 10 skills').default([]),
  preferredRoles: z.array(z.string().min(1).max(50)).max(5, 'Cannot specify more than 5 preferred roles').default([]),
});

export const AnnouncementFilterQuerySchema = z.object({
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
  skill: z.string().optional(),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type CreateJoinRequestInput = z.infer<typeof CreateJoinRequestSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type RedeemInviteInput = z.infer<typeof RedeemInviteSchema>;
export type TeamFilterQuery = z.infer<typeof TeamFilterQuerySchema>;
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type AnnouncementFilterQuery = z.infer<typeof AnnouncementFilterQuerySchema>;

export interface AnnouncementSummary {
  id: string;
  hackathonId: string;
  userId: string;
  title: string;
  message: string;
  skills: string[];
  preferredRoles: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    timezone: string;
    bio?: string;
  };
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  skills: string[];
  preferredRoles: string[];
  timezone: string;
  bio?: string;
  role: UserRole;
  createdAt: string;
}

export interface TeamMemberSummary {
  id: string;
  userId: string;
  teamId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    skills: string[];
    preferredRoles: string[];
    timezone: string;
  };
}

export interface TeamSummary {
  id: string;
  hackathonId: string;
  name: string;
  description: string;
  minMembers: number;
  maxMembers: number;
  currentMemberCount: number;
  availableSeats: number;
  requiredSkills: string[];
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  hackathon?: {
    id: string;
    title: string;
  };
  leader?: {
    id: string;
    name: string;
  };
  members?: TeamMemberSummary[];
  userRequestStatus?: JoinRequestStatus | null;
}

export interface TeammateSuggestion {
  userId: string;
  name: string;
  skills: string[];
  timezone: string;
  score: number;
  breakdown: {
    skillScore: number;
    matchingSkills: string[];
    complementarySkills: string[];
    timezoneScore: number;
    timezoneDifferenceHours: number;
  };
}


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamFilterQuerySchema = exports.RedeemInviteSchema = exports.CreateInviteSchema = exports.CreateJoinRequestSchema = exports.UpdateTeamSchema = exports.CreateTeamSchema = exports.UpdateProfileSchema = exports.LoginSchema = exports.RegisterSchema = exports.AuditAction = exports.JoinRequestStatus = exports.TeamMemberRole = exports.UserRole = void 0;
const zod_1 = require("zod");
// ==========================================
// DOMAIN ENUMS & CONSTANTS
// ==========================================
var UserRole;
(function (UserRole) {
    UserRole["PARTICIPANT"] = "PARTICIPANT";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var TeamMemberRole;
(function (TeamMemberRole) {
    TeamMemberRole["LEADER"] = "LEADER";
    TeamMemberRole["MEMBER"] = "MEMBER";
})(TeamMemberRole || (exports.TeamMemberRole = TeamMemberRole = {}));
var JoinRequestStatus;
(function (JoinRequestStatus) {
    JoinRequestStatus["PENDING"] = "PENDING";
    JoinRequestStatus["ACCEPTED"] = "ACCEPTED";
    JoinRequestStatus["DECLINED"] = "DECLINED";
    JoinRequestStatus["CANCELLED"] = "CANCELLED";
})(JoinRequestStatus || (exports.JoinRequestStatus = JoinRequestStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["TEAM_CREATED"] = "TEAM_CREATED";
    AuditAction["JOIN_REQUEST_CREATED"] = "JOIN_REQUEST_CREATED";
    AuditAction["JOIN_REQUEST_ACCEPTED"] = "JOIN_REQUEST_ACCEPTED";
    AuditAction["JOIN_REQUEST_DECLINED"] = "JOIN_REQUEST_DECLINED";
    AuditAction["JOIN_REQUEST_CANCELLED"] = "JOIN_REQUEST_CANCELLED";
    AuditAction["MEMBER_JOINED"] = "MEMBER_JOINED";
    AuditAction["MEMBER_REMOVED"] = "MEMBER_REMOVED";
    AuditAction["MEMBER_LEFT"] = "MEMBER_LEFT";
    AuditAction["LEADER_TRANSFERRED"] = "LEADER_TRANSFERRED";
    AuditAction["TEAM_DELETED"] = "TEAM_DELETED";
    AuditAction["INVITE_CREATED"] = "INVITE_CREATED";
    AuditAction["INVITE_REVOKED"] = "INVITE_REVOKED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email is required').max(255),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
    bio: zod_1.z.string().max(500).optional().default(''),
    skills: zod_1.z.array(zod_1.z.string().min(1).max(50)).min(1, 'Provide at least one skill'),
    preferredRoles: zod_1.z.array(zod_1.z.string().min(1).max(50)).min(1, 'Provide at least one preferred role'),
    timezone: zod_1.z.string().regex(/^[A-Za-z0-9/_+-]+$/, 'Invalid timezone format (e.g., UTC, America/New_York, Asia/Kolkata)'),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.UpdateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    bio: zod_1.z.string().max(500).optional(),
    skills: zod_1.z.array(zod_1.z.string().min(1).max(50)).optional(),
    preferredRoles: zod_1.z.array(zod_1.z.string().min(1).max(50)).optional(),
    timezone: zod_1.z.string().regex(/^[A-Za-z0-9/_+-]+$/).optional(),
});
exports.CreateTeamSchema = zod_1.z.object({
    hackathonId: zod_1.z.string().uuid('Valid hackathonId is required'),
    name: zod_1.z.string().min(3, 'Team name must be at least 3 characters').max(60, 'Team name cannot exceed 60 characters'),
    description: zod_1.z.string().max(1000).optional().default(''),
    requiredSkills: zod_1.z.array(zod_1.z.string().min(1).max(50)).min(1, 'At least one required skill must be specified'),
    generateInviteCode: zod_1.z.boolean().optional().default(false),
});
exports.UpdateTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(60).optional(),
    description: zod_1.z.string().max(1000).optional(),
    requiredSkills: zod_1.z.array(zod_1.z.string().min(1).max(50)).optional(),
});
exports.CreateJoinRequestSchema = zod_1.z.object({
    message: zod_1.z.string().max(300, 'Message cannot exceed 300 characters').optional().default(''),
});
exports.CreateInviteSchema = zod_1.z.object({
    expiresInHours: zod_1.z.number().int().min(1).max(168).default(48), // default 48h, max 1 week
    maxUses: zod_1.z.number().int().min(1).max(50).default(1),
});
exports.RedeemInviteSchema = zod_1.z.object({
    code: zod_1.z.string().min(8, 'Invalid invite code format').max(64),
});
exports.TeamFilterQuerySchema = zod_1.z.object({
    hackathonId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    skill: zod_1.z.string().optional(),
    hasSeats: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().optional()),
    page: zod_1.z.preprocess((val) => (val ? parseInt(val, 10) : 1), zod_1.z.number().int().min(1).default(1)),
    limit: zod_1.z.preprocess((val) => (val ? parseInt(val, 10) : 10), zod_1.z.number().int().min(1).max(50).default(10)),
    sortBy: zod_1.z.enum(['createdAt', 'availableSeats', 'name']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});

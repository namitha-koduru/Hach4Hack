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

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  skills: string[];
  preferredRoles: string[];
  timezone: string;
  bio?: string;
  role: UserRole | string;
  createdAt: string;
}

export interface TeamMemberSummary {
  id: string;
  userId: string;
  teamId: string;
  role: TeamMemberRole | string;
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
  userRequestStatus?: JoinRequestStatus | string | null;
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

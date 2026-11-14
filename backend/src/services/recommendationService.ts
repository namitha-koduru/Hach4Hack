import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { TeammateSuggestion } from 'shared';

/**
 * Helper to convert common timezone strings into numeric UTC hour offsets (-12 to +14).
 */
export const parseTimezoneOffset = (tzString: string): number => {
  if (!tzString) return 0;
  const normalized = tzString.toUpperCase().trim();

  // Handle explicit UTC/GMT offset strings, e.g. "UTC+5:30", "GMT-4", "+05:30"
  const offsetMatch = normalized.match(/(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::(\d{2}))?/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = offsetMatch[3] ? parseInt(offsetMatch[3], 10) / 60 : 0;
    return sign * (hours + minutes);
  }

  // Handle common IANA names
  const ianaMap: Record<string, number> = {
    'AMERICA/NEW_YORK': -5,
    'AMERICA/CHICAGO': -6,
    'AMERICA/DENVER': -7,
    'AMERICA/LOS_ANGELES': -8,
    'EUROPE/LONDON': 0,
    'EUROPE/PARIS': 1,
    'EUROPE/BERLIN': 1,
    'ASIA/KOLKATA': 5.5,
    'ASIA/CALCUTTA': 5.5,
    'ASIA/SINGAPORE': 8,
    'ASIA/TOKYO': 9,
    'AUSTRALIA/SYDNEY': 10,
    'UTC': 0,
    'GMT': 0,
  };

  return ianaMap[normalized] ?? 0;
};

export class RecommendationService {
  /**
   * Generates ranked teammate recommendations for a team.
   */
  static async getSuggestionsForTeam(
    teamId: string,
    limit: number = 10
  ): Promise<TeammateSuggestion[]> {
    // 1. Fetch team, hackathon, and current members with skills
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, timezone: true, skills: true },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    const requiredSkills = team.requiredSkills.map((s) => s.toLowerCase());
    const existingMemberSkills = new Set<string>();
    let totalTimezoneOffset = 0;

    for (const m of team.members) {
      m.user.skills.forEach((s) => existingMemberSkills.add(s.toLowerCase()));
      totalTimezoneOffset += parseTimezoneOffset(m.user.timezone);
    }

    const averageTeamTzOffset = team.members.length > 0 ? totalTimezoneOffset / team.members.length : 0;

    // Skills that the team explicitly still lacks
    const lackingSkills = requiredSkills.filter((req) => !existingMemberSkills.has(req));

    // 2. Query candidates:
    // User must NOT belong to ANY team in this hackathon
    // User must NOT already have a pending or accepted join request for this team
    const existingPendingUserIds = (
      await prisma.joinRequest.findMany({
        where: { teamId, status: { in: ['PENDING', 'ACCEPTED'] } },
        select: { userId: true },
      })
    ).map((r) => r.userId);

    const candidates = await prisma.user.findMany({
      where: {
        role: 'PARTICIPANT',
        id: { notIn: existingPendingUserIds },
        memberships: {
          none: {
            hackathonId: team.hackathonId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        skills: true,
        timezone: true,
      },
      take: 200, // Pre-filter pool for ranking
    });

    // 3. Compute Transparent Multi-Factor Score for each candidate
    const suggestions: TeammateSuggestion[] = candidates.map((candidate) => {
      const candidateSkills = candidate.skills.map((s) => s.toLowerCase());
      const candidateTzOffset = parseTimezoneOffset(candidate.timezone);

      // (A) Complementary Skills: Skills candidate has that the team lacks
      const complementary = candidateSkills.filter((s) => lackingSkills.includes(s));
      // Matching Skills: Skills candidate has that are in requiredSkills
      const matching = candidateSkills.filter((s) => requiredSkills.includes(s));

      // Skill Score Calculation:
      // High bonus for covering missing skills (60 pts) + general match (40 pts)
      let skillScore = 0;
      if (requiredSkills.length > 0) {
        const lackingCoverage = lackingSkills.length > 0 ? complementary.length / lackingSkills.length : 1;
        const requiredCoverage = matching.length / requiredSkills.length;
        skillScore = Math.min(100, Math.round(lackingCoverage * 60 + requiredCoverage * 40));
      } else {
        skillScore = 70; // baseline if team has no required skills configured
      }

      // (B) Timezone Compatibility Score (40% weight):
      // Calculate circular absolute difference in 24h clock
      let diff = Math.abs(candidateTzOffset - averageTeamTzOffset);
      if (diff > 12) {
        diff = 24 - diff;
      }

      // Linear decay: 0 hr diff = 100 pts, 12 hr diff = 0 pts
      const tzScore = Math.max(0, Math.round(100 - diff * 8.33));

      // Total Weighted Score (0-100)
      const totalScore = Math.round(skillScore * 0.6 + tzScore * 0.4);

      return {
        userId: candidate.id,
        name: candidate.name,
        skills: candidate.skills,
        timezone: candidate.timezone,
        score: totalScore,
        breakdown: {
          skillScore,
          matchingSkills: candidate.skills.filter((s) => requiredSkills.includes(s.toLowerCase())),
          complementarySkills: candidate.skills.filter((s) => lackingSkills.includes(s.toLowerCase())),
          timezoneScore: tzScore,
          timezoneDifferenceHours: Math.round(diff * 10) / 10,
        },
      };
    });

    // Sort by total score descending, then timezone difference ascending
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, limit);
  }
}

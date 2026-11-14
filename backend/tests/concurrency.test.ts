import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword, generateToken } from '../src/utils/crypto';

const app = createApp();

describe('⚡ PS1 HIGHEST PRIORITY: Race-Proof Concurrency Test (50 Concurrent Join Requests vs 1 Seat)', () => {
  let testHackathonId: string;
  let testTeamId: string;
  let leaderToken: string;
  const concurrentUsers: Array<{ id: string; email: string; token: string }> = [];

  beforeAll(async () => {
    // 1. Create a dedicated test hackathon
    const hackathon = await prisma.hackathon.create({
      data: {
        title: 'Race Condition Crucible 2026',
        slug: `race-test-${Date.now()}`,
        description: 'Concurrency stress testing harness',
        minTeamSize: 2,
        maxTeamSize: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 3),
      },
    });
    testHackathonId = hackathon.id;

    // 2. Create Team Leader
    const passwordHash = await hashPassword('Password123!');
    const leader = await prisma.user.create({
      data: {
        email: `race_leader_${Date.now()}@test.dev`,
        passwordHash,
        name: 'Race Leader',
        skills: ['TypeScript'],
        preferredRoles: ['Backend'],
        timezone: 'UTC',
      },
    });
    leaderToken = generateToken({ userId: leader.id, email: leader.email, role: 'PARTICIPANT' });

    // 3. Create Team with max capacity of 5
    const team = await prisma.team.create({
      data: {
        hackathonId: testHackathonId,
        name: `Race-Proof Team ${Date.now()}`,
        minMembers: 2,
        maxMembers: 5,
        currentMemberCount: 1,
        requiredSkills: ['TypeScript', 'PostgreSQL'],
      },
    });
    testTeamId = team.id;

    await prisma.teamMember.create({
      data: {
        teamId: testTeamId,
        userId: leader.id,
        hackathonId: testHackathonId,
        role: 'LEADER',
      },
    });

    // 4. Fill 3 more seats so that exactly 4 members exist (1 seat left out of 5)
    for (let i = 1; i <= 3; i++) {
      const memberUser = await prisma.user.create({
        data: {
          email: `existing_member_${i}_${Date.now()}@test.dev`,
          passwordHash,
          name: `Member ${i}`,
          skills: ['TypeScript'],
          preferredRoles: ['Fullstack'],
          timezone: 'UTC',
        },
      });

      await prisma.teamMember.create({
        data: {
          teamId: testTeamId,
          userId: memberUser.id,
          hackathonId: testHackathonId,
          role: 'MEMBER',
        },
      });
    }

    // Update team member count to 4
    await prisma.team.update({
      where: { id: testTeamId },
      data: { currentMemberCount: 4 },
    });

    // 5. Pre-create 50 distinct eligible participants with valid JWTs
    for (let i = 1; i <= 50; i++) {
      const candidate = await prisma.user.create({
        data: {
          email: `concurrent_racer_${i}_${Date.now()}@test.dev`,
          passwordHash,
          name: `Racer ${i}`,
          skills: ['PostgreSQL'],
          preferredRoles: ['Backend'],
          timezone: 'UTC',
        },
      });

      const token = generateToken({ userId: candidate.id, email: candidate.email, role: 'PARTICIPANT' });
      concurrentUsers.push({ id: candidate.id, email: candidate.email, token });
    }
  }, 45000);

  afterAll(async () => {
    // Cleanup test data
    if (testTeamId) {
      await prisma.auditLog.deleteMany({ where: { teamId: testTeamId } });
      await prisma.teamMember.deleteMany({ where: { teamId: testTeamId } });
      await prisma.team.deleteMany({ where: { id: testTeamId } });
    }
    if (testHackathonId) {
      await prisma.hackathon.deleteMany({ where: { id: testHackathonId } });
    }
    const userIds = concurrentUsers.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it('verifies initial state: Team has exactly 4 members with capacity of 5 (1 seat remaining)', async () => {
    const team = await prisma.team.findUnique({ where: { id: testTeamId } });
    const count = await prisma.teamMember.count({ where: { teamId: testTeamId } });

    expect(team).not.toBeNull();
    expect(team?.maxMembers).toBe(5);
    expect(team?.currentMemberCount).toBe(4);
    expect(count).toBe(4);
  });

  it('fires 50 concurrent join requests simultaneously: EXACTLY 1 succeeds, 49 fail with 409 Conflict', async () => {
    console.log('🚀 Firing 50 concurrent requests simultaneously at the single remaining seat...');

    // Launch all 50 HTTP requests in parallel without artificial delays
    const joinPromises = concurrentUsers.map((user) =>
      request(app)
        .post(`/api/teams/${testTeamId}/join`)
        .set('Authorization', `Bearer ${user.token}`)
        .send()
    );

    const responses = await Promise.all(joinPromises);

    const successes = responses.filter((res) => res.status === 200);
    const conflicts = responses.filter((res) => res.status === 409);
    const otherErrors = responses.filter((res) => res.status !== 200 && res.status !== 409);

    console.log(`📊 Concurrency Test Results:`);
    console.log(`   - Total Requests: ${responses.length}`);
    console.log(`   - Successful Joins (HTTP 200): ${successes.length}`);
    console.log(`   - Capacity Conflicts (HTTP 409): ${conflicts.length}`);
    console.log(`   - Unexpected Errors: ${otherErrors.length}`);

    // EXACT CORNWALL & PS1 CRITERIA:
    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(49);
    expect(otherErrors.length).toBe(0);

    // Verify rejection error message on conflicts
    expect(conflicts[0].body.error.code).toBe('CONFLICT');
    expect(conflicts[0].body.error.message).toContain('capacity');
  });

  it('validates final database state: team has EXACTLY 5 members and counter equals 5', async () => {
    // 1. Direct count in TeamMember table
    const actualMemberRows = await prisma.teamMember.count({
      where: { teamId: testTeamId },
    });
    expect(actualMemberRows).toBe(5);

    // 2. Team currentMemberCount field in Team table
    const teamRecord = await prisma.team.findUnique({
      where: { id: testTeamId },
    });
    expect(teamRecord?.currentMemberCount).toBe(5);

    // 3. Verify no duplicate memberships exist
    const members = await prisma.teamMember.findMany({
      where: { teamId: testTeamId },
      select: { userId: true },
    });
    const uniqueUserIds = new Set(members.map((m) => m.userId));
    expect(uniqueUserIds.size).toBe(5);

    // 4. Verify Audit Log contains the atomic MEMBER_JOINED event
    const auditEntries = await prisma.auditLog.findMany({
      where: {
        teamId: testTeamId,
        action: 'MEMBER_JOINED',
      },
    });
    expect(auditEntries.length).toBeGreaterThanOrEqual(1);
  });
});


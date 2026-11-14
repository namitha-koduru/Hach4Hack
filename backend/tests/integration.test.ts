import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword, generateToken } from '../src/utils/crypto';

const app = createApp();

describe('TeamForge End-to-End & Integration Test Suite', () => {
  let hackathonId: string;
  let adminToken: string;
  let leaderUser: any;
  let leaderToken: string;
  let memberUser: any;
  let memberToken: string;
  let candidateUser: any;
  let candidateToken: string;
  let teamId: string;
  let inviteCode: string;
  let requestId: string;

  beforeAll(async () => {
    // Clean tables
    await prisma.auditLog.deleteMany();
    await prisma.idempotencyRecord.deleteMany();
    await prisma.invitationCode.deleteMany();
    await prisma.joinRequest.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.hackathon.deleteMany();
    await prisma.user.deleteMany();

    // Create Hackathon
    const hackathon = await prisma.hackathon.create({
      data: {
        title: 'Integration Test Hackathon 2026',
        slug: 'integration-2026',
        description: 'Comprehensive test harness',
        minTeamSize: 2,
        maxTeamSize: 3,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 7),
      },
    });
    hackathonId = hackathon.id;

    // Create Admin
    const passHash = await hashPassword('AdminPass123!');
    const admin = await prisma.user.create({
      data: {
        email: 'test_admin@teamforge.test',
        passwordHash: passHash,
        name: 'Test Admin',
        skills: ['Admin'],
        preferredRoles: ['Admin'],
        timezone: 'UTC',
        role: 'ADMIN',
      },
    });
    adminToken = generateToken({ userId: admin.id, email: admin.email, role: 'ADMIN' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // 1 & 2. AUTHENTICATION & DUPLICATE EMAIL
  // -------------------------------------------------------------
  it('1. registers a new participant successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'sarah.leader@test.com',
      password: 'Password123!',
      name: 'Sarah Leader',
      bio: 'Fullstack engineer',
      skills: ['TypeScript', 'React'],
      preferredRoles: ['Frontend Engineer'],
      timezone: 'UTC',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('sarah.leader@test.com');

    leaderUser = res.body.data.user;
    leaderToken = res.body.data.token;
  });

  it('2. rejects registration with duplicate email (409 Conflict)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'sarah.leader@test.com',
      password: 'AnotherPassword123!',
      name: 'Imposter Sarah',
      skills: ['Python'],
      preferredRoles: ['Backend'],
      timezone: 'UTC',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // 3 & 4. LOGIN & INVALID PASSWORD
  // -------------------------------------------------------------
  it('3. logs in with correct credentials and returns JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'sarah.leader@test.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('4. rejects login with incorrect password (401 Unauthorized)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'sarah.leader@test.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
  });

  it('5. blocks unauthorized access to protected route without Bearer token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  // Setup additional users
  it('registers second user (Member) and third user (Candidate)', async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'alex.member@test.com',
      password: 'Password123!',
      name: 'Alex Member',
      skills: ['Node.js', 'PostgreSQL'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'America/New_York',
    });
    memberUser = res1.body.data.user;
    memberToken = res1.body.data.token;

    const res2 = await request(app).post('/api/auth/register').send({
      email: 'jordan.candidate@test.com',
      password: 'Password123!',
      name: 'Jordan Candidate',
      skills: ['UI/UX Design', 'TailwindCSS'],
      preferredRoles: ['Designer'],
      timezone: 'Asia/Kolkata',
    });
    candidateUser = res2.body.data.user;
    candidateToken = res2.body.data.token;
  });

  // -------------------------------------------------------------
  // 6, 7, 8, 9. TEAM CREATION & MEMBERSHIP CONSTRAINTS
  // -------------------------------------------------------------
  it('6. allows participant to create a team and becomes LEADER', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        hackathonId,
        name: 'Forge Titans',
        description: 'Elite concurrency team',
        requiredSkills: ['Node.js', 'PostgreSQL', 'UI/UX Design'],
        generateInviteCode: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.team.name).toBe('Forge Titans');
    expect(res.body.data.team.currentMemberCount).toBe(1);
    expect(res.body.data.inviteCode).toBeDefined();

    teamId = res.body.data.team.id;
    inviteCode = res.body.data.inviteCode.rawCode;
  });

  it('7. rejects team creation if user already belongs to a team in the hackathon', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        hackathonId,
        name: 'Second Team Attempt',
        requiredSkills: ['Rust'],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('8 & 9. validates input constraints (team name length and required skills)', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        hackathonId,
        name: 'A', // too short (<3)
        requiredSkills: [],
      });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------
  // 10, 11, 12. INVITATION CODES
  // -------------------------------------------------------------
  it('10. leader can generate a new custom invitation code', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/invites`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        expiresInHours: 24,
        maxUses: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBeDefined();
    expect(res.body.data.code).toMatch(/^TF-[A-F0-9]{4}-[A-F0-9]{4}/);
  });

  it('12. rejects invalid or malformed invitation code', async () => {
    const res = await request(app)
      .post('/api/invites/redeem')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ code: 'INVALID-CODE-XYZ' });

    expect(res.status).toBe(400);
  });

  it('10b. redeems valid invitation code and adds user to team', async () => {
    const res = await request(app)
      .post('/api/invites/redeem')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ code: inviteCode });

    expect(res.status).toBe(200);
    expect(res.body.data.updatedTeam.currentMemberCount).toBe(2);
  });

  // -------------------------------------------------------------
  // 13 & 14. JOIN REQUESTS
  // -------------------------------------------------------------
  it('13. applicant submits a join request to the team', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/requests`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ message: 'I can handle the UI/UX design!' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    requestId = res.body.data.id;
  });

  it('14. rejects duplicate pending join request from same applicant', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/requests`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ message: 'Duplicate request' });

    expect(res.status).toBe(409);
  });

  // -------------------------------------------------------------
  // 15 & 16. LEADER ACCEPTANCE & AUTHORIZATION
  // -------------------------------------------------------------
  it('16. non-leader cannot accept join request (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it('15. leader accepts join request atomically', async () => {
    const res = await request(app)
      .post(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.updatedRequest.status).toBe('ACCEPTED');
    expect(res.body.data.updatedTeam.currentMemberCount).toBe(3); // Team now reached maxTeamSize (3)
  });

  // -------------------------------------------------------------
  // 17. FULL TEAM REJECTION
  // -------------------------------------------------------------
  it('17. rejects join request or direct join on full team (409 Conflict)', async () => {
    // Register 4th user
    const resNewUser = await request(app).post('/api/auth/register').send({
      email: 'extra.user@test.com',
      password: 'Password123!',
      name: 'Extra User',
      skills: ['Python'],
      preferredRoles: ['Backend'],
      timezone: 'UTC',
    });
    const extraToken = resNewUser.body.data.token;

    const resJoin = await request(app)
      .post(`/api/teams/${teamId}/join`)
      .set('Authorization', `Bearer ${extraToken}`);

    expect(resJoin.status).toBe(409);
    expect(resJoin.body.error.code).toBe('CONFLICT');
  });

  // -------------------------------------------------------------
  // 18 & 19. MEMBER LEAVING & DETERMINISTIC LEADERSHIP TRANSFER
  // -------------------------------------------------------------
  it('19. when leader leaves, leadership transfers deterministically to oldest remaining member', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('MEMBER_LEFT');
    expect(res.body.data.newLeaderId).toBe(memberUser.id); // Alex Member joined first after leader

    // Verify database state: Alex Member is now LEADER
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId: memberUser.id },
    });
    expect(membership?.role).toBe('LEADER');
  });

  it('18. ordinary member can leave team', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    expect(team?.currentMemberCount).toBe(1);
  });

  // -------------------------------------------------------------
  // 20. LAST MEMBER LEAVING -> TEAM DELETION
  // -------------------------------------------------------------
  it('20. when the last member leaves, the team is deleted', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('TEAM_DELETED');

    const checkTeam = await prisma.team.findUnique({ where: { id: teamId } });
    expect(checkTeam).toBeNull();
  });

  // -------------------------------------------------------------
  // 21. AUDIT LOGGING & AUDIT SURVIVAL ON DELETION
  // -------------------------------------------------------------
  it('21. records all critical operations in audit log and preserves audit history after team deletion', async () => {
    // Verify database state: team is deleted
    const deletedTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });
    expect(deletedTeam).toBeNull();

    // Verify audit logs survive team deletion with teamId set to null
    const logs = await prisma.auditLog.findMany({
      where: { hackathonId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(4);
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('TEAM_CREATED');
    expect(actions).toContain('MEMBER_JOINED');
    expect(actions).toContain('LEADER_TRANSFERRED');
    expect(actions).toContain('TEAM_DELETED');

    // Verify specific TEAM_DELETED log
    const deletionLog = await prisma.auditLog.findFirst({
      where: {
        action: 'TEAM_DELETED',
        metadata: {
          path: ['deletedTeamId'],
          equals: teamId,
        },
      },
    });

    expect(deletionLog).not.toBeNull();
    expect(deletionLog?.teamId).toBeNull();
  });

  // -------------------------------------------------------------
  // 22. IDEMPOTENCY
  // -------------------------------------------------------------
  it('22. idempotency middleware prevents duplicate execution on retry', async () => {
    const idempotencyKey = `idemp_test_key_${Date.now()}`;

    // 1. First execution
    const res1 = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        hackathonId,
        name: 'Idempotency Squad',
        requiredSkills: ['Docker'],
      });

    expect(res1.status).toBe(201);
    const originalTeamId = res1.body.data.team.id;

    // 2. Retry with same key and same payload
    const res2 = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        hackathonId,
        name: 'Idempotency Squad',
        requiredSkills: ['Docker'],
      });

    expect(res2.status).toBe(201);
    expect(res2.headers['x-cache-lookup']).toBe('HIT-IDEMPOTENT');
    expect(res2.body.data.team.id).toBe(originalTeamId);

    // 3. Retry with same key but DIFFERENT payload (must reject with 422)
    const res3 = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        hackathonId,
        name: 'Different Name Squad',
        requiredSkills: ['Docker'],
      });

    expect(res3.status).toBe(422);
  });

  // -------------------------------------------------------------
  // 24. RECOMMENDATION SCORING
  // -------------------------------------------------------------
  it('24. computes transparent teammate recommendation scores based on skills and timezones', async () => {
    // Create new team for recommendations
    const team = await prisma.team.create({
      data: {
        hackathonId,
        name: 'Rec Test Team',
        minMembers: 2,
        maxMembers: 5,
        requiredSkills: ['Python', 'Machine Learning'],
      },
    });

    const res = await request(app)
      .get(`/api/teams/${team.id}/suggestions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const top = res.body.data[0];
      expect(top.score).toBeGreaterThanOrEqual(0);
      expect(top.score).toBeLessThanOrEqual(100);
      expect(top.breakdown).toBeDefined();
      expect(top.breakdown.skillScore).toBeDefined();
      expect(top.breakdown.timezoneScore).toBeDefined();
    }
  });
});


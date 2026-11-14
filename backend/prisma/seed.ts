import { PrismaClient, UserRole, TeamMemberRole, JoinRequestStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SAMPLE_SKILLS = [
  'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'Go', 'Rust',
  'Docker', 'AWS', 'Kubernetes', 'GraphQL', 'TailwindCSS', 'UI/UX Design',
  'Next.js', 'Redis', 'Machine Learning', 'Solidity', 'FastAPI', 'System Design'
];

const SAMPLE_ROLES = ['Frontend Engineer', 'Backend Engineer', 'Full Stack', 'DevOps', 'Designer', 'Product Manager'];
const SAMPLE_TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo'];

async function main() {
  console.log('🌱 Starting TeamForge Database Seeding...');
  const startTime = Date.now();

  // Clear existing data in reverse relation order
  console.log('🧹 Cleaning existing records...');
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.invitationCode.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.hackathon.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Core Hackathons
  console.log('🏆 Creating Hackathons...');
  const hackathons = await Promise.all([
    prisma.hackathon.create({
      data: {
        title: 'Global Scale & Concurrency Hackathon 2026',
        slug: 'scalecon-2026',
        description: 'Compete to build high-throughput, race-proof systems under massive concurrent workloads.',
        minTeamSize: 2,
        maxTeamSize: 5,
        startDate: new Date('2026-12-01T00:00:00Z'),
        endDate: new Date('2026-12-05T23:59:59Z'),
        isActive: true,
      },
    }),
    prisma.hackathon.create({
      data: {
        title: 'AI & Next-Gen Distributed Platforms 2026',
        slug: 'ai-distrib-2026',
        description: 'Design next-generation autonomous AI agents and distributed infrastructure.',
        minTeamSize: 3,
        maxTeamSize: 6,
        startDate: new Date('2026-12-10T00:00:00Z'),
        endDate: new Date('2026-12-15T23:59:59Z'),
        isActive: true,
      },
    }),
    prisma.hackathon.create({
      data: {
        title: 'FinTech High-Frequency Resilience Challenge',
        slug: 'fintech-hfr-2026',
        description: 'Build ultra-low latency settlement and ledger reconciliation systems.',
        minTeamSize: 2,
        maxTeamSize: 4,
        startDate: new Date('2027-01-10T00:00:00Z'),
        endDate: new Date('2027-01-14T23:59:59Z'),
        isActive: true,
      },
    }),
  ]);

  const primaryHackathon = hackathons[0];

  // 2. Create Demo Accounts
  console.log('👤 Creating Demonstration Accounts...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@teamforge.dev',
      passwordHash: defaultPasswordHash,
      name: 'Forge Administrator',
      bio: 'Platform architect and contest director.',
      skills: ['PostgreSQL', 'Docker', 'System Design', 'Kubernetes'],
      preferredRoles: ['DevOps', 'Product Manager'],
      timezone: 'UTC',
      role: UserRole.ADMIN,
    },
  });

  const leaderUser = await prisma.user.create({
    data: {
      email: 'leader@teamforge.dev',
      passwordHash: defaultPasswordHash,
      name: 'Sarah Connor',
      bio: 'Team Leader building race-proof distributed systems.',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'System Design'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'America/New_York',
      role: UserRole.PARTICIPANT,
    },
  });

  const participantUser = await prisma.user.create({
    data: {
      email: 'participant@teamforge.dev',
      passwordHash: defaultPasswordHash,
      name: 'Alex Rivera',
      bio: 'Frontend specialist experienced with React, Tailwind, and WebSockets.',
      skills: ['React', 'TypeScript', 'TailwindCSS', 'UI/UX Design'],
      preferredRoles: ['Frontend Engineer'],
      timezone: 'Asia/Kolkata',
      role: UserRole.PARTICIPANT,
    },
  });

  const candidateUser = await prisma.user.create({
    data: {
      email: 'candidate@teamforge.dev',
      passwordHash: defaultPasswordHash,
      name: 'Jordan Lee',
      bio: 'Looking for a competitive team in distributed systems.',
      skills: ['Rust', 'Python', 'Machine Learning'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'Europe/London',
      role: UserRole.PARTICIPANT,
    },
  });

  // 3. Create Demo Team with Leader
  console.log('🛡️ Creating Showcase Demonstration Team...');
  const demoTeam = await prisma.team.create({
    data: {
      hackathonId: primaryHackathon.id,
      name: 'Concurrency Champions',
      description: 'Building an enterprise-grade transactional engine with PostgreSQL row locks and real-time websockets.',
      minMembers: primaryHackathon.minTeamSize,
      maxMembers: primaryHackathon.maxTeamSize, // 5
      currentMemberCount: 2,
      requiredSkills: ['React', 'TypeScript', 'PostgreSQL', 'UI/UX Design', 'Rust'],
      isLocked: false,
    },
  });

  await prisma.teamMember.createMany({
    data: [
      {
        teamId: demoTeam.id,
        userId: leaderUser.id,
        hackathonId: primaryHackathon.id,
        role: TeamMemberRole.LEADER,
        joinedAt: new Date(Date.now() - 3600000 * 24),
      },
      {
        teamId: demoTeam.id,
        userId: participantUser.id,
        hackathonId: primaryHackathon.id,
        role: TeamMemberRole.MEMBER,
        joinedAt: new Date(Date.now() - 3600000 * 12),
      },
    ],
  });

  // Add demo join request
  await prisma.joinRequest.create({
    data: {
      teamId: demoTeam.id,
      userId: candidateUser.id,
      hackathonId: primaryHackathon.id,
      status: JoinRequestStatus.PENDING,
      message: 'Hi Sarah, I would love to join your team as a Backend / Rust specialist!',
    },
  });

  // Add initial Audit record
  await prisma.auditLog.create({
    data: {
      actorId: leaderUser.id,
      hackathonId: primaryHackathon.id,
      teamId: demoTeam.id,
      action: AuditAction.TEAM_CREATED,
      metadata: { name: demoTeam.name, demo: true },
    },
  });

  // 4. Batch Seed Users at Scale (10,000 Users)
  const TOTAL_USERS = 10000;
  const BATCH_SIZE = 1000;
  console.log(`⚡ Generating ${TOTAL_USERS} users in batches of ${BATCH_SIZE}...`);

  const createdUserIds: string[] = [adminUser.id, leaderUser.id, participantUser.id, candidateUser.id];

  for (let b = 0; b < TOTAL_USERS / BATCH_SIZE; b++) {
    const userBatch = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = b * BATCH_SIZE + i + 1;
      const skillsCount = 2 + (idx % 4);
      const userSkills = Array.from({ length: skillsCount }, (_, k) => SAMPLE_SKILLS[(idx + k * 3) % SAMPLE_SKILLS.length]);
      const preferredRole = SAMPLE_ROLES[idx % SAMPLE_ROLES.length];
      const timezone = SAMPLE_TIMEZONES[idx % SAMPLE_TIMEZONES.length];

      userBatch.push({
        email: `hacker_${idx}@teamforge.test`,
        passwordHash: defaultPasswordHash,
        name: `Hacker ${idx}`,
        bio: `Software craftsman passionate about high-scale applications.`,
        skills: userSkills,
        preferredRoles: [preferredRole],
        timezone,
        role: UserRole.PARTICIPANT,
      });
    }

    await prisma.user.createMany({ data: userBatch });
    console.log(`   ✓ Inserted users ${b * BATCH_SIZE + 1} to ${(b + 1) * BATCH_SIZE}`);
  }

  // Fetch some created user IDs for teams
  const userSample = await prisma.user.findMany({
    where: { email: { startsWith: 'hacker_' } },
    select: { id: true },
    take: 6000,
  });

  userSample.forEach((u) => createdUserIds.push(u.id));

  // 5. Batch Seed Teams (2,000 Teams)
  const TOTAL_TEAMS = 2000;
  console.log(`⚡ Generating ${TOTAL_TEAMS} teams across hackathons...`);

  let userCursor = 4; // Skip the 4 demo users
  for (let t = 0; t < TOTAL_TEAMS; t += 200) {
    const batchCount = Math.min(200, TOTAL_TEAMS - t);
    for (let i = 0; i < batchCount; i++) {
      const teamIdx = t + i + 1;
      const hackathon = hackathons[teamIdx % hackathons.length];
      const reqSkills = [SAMPLE_SKILLS[teamIdx % SAMPLE_SKILLS.length], SAMPLE_SKILLS[(teamIdx + 2) % SAMPLE_SKILLS.length]];

      const team = await prisma.team.create({
        data: {
          hackathonId: hackathon.id,
          name: `Squad Alpha-${teamIdx}`,
          description: `Team ${teamIdx} competing in ${hackathon.title}`,
          minMembers: hackathon.minTeamSize,
          maxMembers: hackathon.maxTeamSize,
          currentMemberCount: 1,
          requiredSkills: reqSkills,
          isLocked: false,
        },
      });

      // Assign leader from user pool
      if (userCursor < createdUserIds.length) {
        const teamLeaderId = createdUserIds[userCursor++];
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: teamLeaderId,
            hackathonId: hackathon.id,
            role: TeamMemberRole.LEADER,
          },
        });
      }
    }
    console.log(`   ✓ Created teams ${t + 1} to ${t + batchCount}`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`=========================================`);
  console.log(`🎉 Seeding successfully completed in ${durationSec}s!`);
  console.log(`📊 Total Users: ${TOTAL_USERS + 4}`);
  console.log(`📊 Total Teams: ${TOTAL_TEAMS + 1}`);
  console.log(`📊 Demo Leader: leader@teamforge.dev (Password: Password123!)`);
  console.log(`📊 Demo Admin: admin@teamforge.dev (Password: Password123!)`);
  console.log(`📊 Demo Candidate: candidate@teamforge.dev (Password: Password123!)`);
  console.log(`=========================================`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


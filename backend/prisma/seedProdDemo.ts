import { PrismaClient, TeamMemberRole, JoinRequestStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SAMPLE_SKILLS = [
  'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'Go', 'Rust',
  'Docker', 'AWS', 'Kubernetes', 'GraphQL', 'TailwindCSS', 'UI/UX Design',
  'Next.js', 'Redis', 'Machine Learning', 'Solidity', 'FastAPI', 'System Design'
];

const SAMPLE_ROLES = [
  'Frontend Engineer', 'Backend Engineer', 'Full Stack', 'DevOps', 'Designer', 'Product Manager'
];

const SAMPLE_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo'
];

export async function runProdDemoSeed() {
  console.log('===============================================================');
  console.log('🚀 TeamForge Idempotent Production Demo Seeder (Non-Destructive)');
  console.log('===============================================================');
  const startTime = Date.now();

  // 1. Hash default password once for memory/CPU efficiency
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 2. Idempotent Core Hackathons (upsert by unique slug)
  console.log('🏆 1/5 Ensuring Core Demo Hackathons...');
  const hackathonConfigs = [
    {
      slug: 'scalecon-2026',
      title: 'Global Scale & Concurrency Hackathon 2026',
      description: 'Compete to build high-throughput, race-proof systems under massive concurrent workloads.',
      minTeamSize: 2,
      maxTeamSize: 5,
      startDate: new Date('2026-12-01T00:00:00Z'),
      endDate: new Date('2026-12-05T23:59:59Z'),
      isActive: true,
    },
    {
      slug: 'ai-distrib-2026',
      title: 'AI & Next-Gen Distributed Platforms 2026',
      description: 'Design next-generation autonomous AI agents and distributed infrastructure.',
      minTeamSize: 3,
      maxTeamSize: 6,
      startDate: new Date('2026-12-10T00:00:00Z'),
      endDate: new Date('2026-12-15T23:59:59Z'),
      isActive: true,
    },
    {
      slug: 'fintech-hfr-2026',
      title: 'FinTech High-Frequency Resilience Challenge',
      description: 'Build ultra-low latency settlement and ledger reconciliation systems.',
      minTeamSize: 2,
      maxTeamSize: 4,
      startDate: new Date('2027-01-10T00:00:00Z'),
      endDate: new Date('2027-01-14T23:59:59Z'),
      isActive: true,
    },
  ];

  const hackathons = [];
  for (const hConfig of hackathonConfigs) {
    const hackathon = await prisma.hackathon.upsert({
      where: { slug: hConfig.slug },
      update: {
        title: hConfig.title,
        description: hConfig.description,
        isActive: hConfig.isActive,
      },
      create: hConfig,
    });
    hackathons.push(hackathon);
    console.log(`   ✓ Hackathon confirmed: "${hackathon.title}" (${hackathon.slug})`);
  }

  const primaryHackathon = hackathons[0];

  // 3. Idempotent Core Evaluator Demo Accounts (Never overwrite real users)
  console.log('👤 2/5 Ensuring Core Evaluator Demo Accounts...');
  const demoAccountsConfig = [
    {
      email: 'leader@teamforge.dev',
      name: 'Sarah Connor',
      bio: 'Team Leader building race-proof distributed systems.',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'System Design'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'America/New_York',
    },
    {
      email: 'participant@teamforge.dev',
      name: 'Alex Rivera',
      bio: 'Frontend specialist experienced with React, Tailwind, and WebSockets.',
      skills: ['React', 'TypeScript', 'TailwindCSS', 'UI/UX Design'],
      preferredRoles: ['Frontend Engineer'],
      timezone: 'Asia/Kolkata',
    },
    {
      email: 'candidate@teamforge.dev',
      name: 'Jordan Lee',
      bio: 'Looking for a competitive squad in distributed systems.',
      skills: ['Rust', 'Python', 'Machine Learning', 'Go'],
      preferredRoles: ['Backend Engineer'],
      timezone: 'Europe/London',
    },
  ];

  const demoUsers: Record<string, any> = {};
  for (const account of demoAccountsConfig) {
    let user = await prisma.user.findUnique({ where: { email: account.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          ...account,
          passwordHash: defaultPasswordHash,
        },
      });
      console.log(`   ✓ Created demo account: ${account.email}`);
    } else {
      console.log(`   ✓ Existing demo account preserved: ${account.email}`);
    }
    demoUsers[account.email] = user;
  }

  // 4. Showcase Team "Concurrency Champions" with Meaningful State
  console.log('🛡️ 3/5 Ensuring Showcase Team & Relationships...');
  let demoTeam = await prisma.team.findUnique({
    where: {
      hackathonId_name: {
        hackathonId: primaryHackathon.id,
        name: 'Concurrency Champions',
      },
    },
  });

  if (!demoTeam) {
    demoTeam = await prisma.team.create({
      data: {
        hackathonId: primaryHackathon.id,
        name: 'Concurrency Champions',
        description: 'Building an enterprise-grade transactional engine with PostgreSQL row locks and real-time websockets.',
        minMembers: primaryHackathon.minTeamSize,
        maxMembers: primaryHackathon.maxTeamSize, // 5 (3 open seats)
        currentMemberCount: 2,
        requiredSkills: ['React', 'TypeScript', 'PostgreSQL', 'UI/UX Design', 'Rust'],
        isLocked: false,
      },
    });
    console.log('   ✓ Created showcase team "Concurrency Champions"');
  }

  // Ensure Leader & Member memberships
  const leaderUser = demoUsers['leader@teamforge.dev'];
  const participantUser = demoUsers['participant@teamforge.dev'];
  const candidateUser = demoUsers['candidate@teamforge.dev'];

  const leaderMembership = await prisma.teamMember.findUnique({
    where: {
      userId_hackathonId: {
        userId: leaderUser.id,
        hackathonId: primaryHackathon.id,
      },
    },
  });

  if (!leaderMembership) {
    await prisma.teamMember.create({
      data: {
        teamId: demoTeam.id,
        userId: leaderUser.id,
        hackathonId: primaryHackathon.id,
        role: TeamMemberRole.LEADER,
        joinedAt: new Date(Date.now() - 3600000 * 24),
      },
    });
    console.log('   ✓ Assigned Sarah Connor as Leader');
  }

  const memberMembership = await prisma.teamMember.findUnique({
    where: {
      userId_hackathonId: {
        userId: participantUser.id,
        hackathonId: primaryHackathon.id,
      },
    },
  });

  if (!memberMembership) {
    await prisma.teamMember.create({
      data: {
        teamId: demoTeam.id,
        userId: participantUser.id,
        hackathonId: primaryHackathon.id,
        role: TeamMemberRole.MEMBER,
        joinedAt: new Date(Date.now() - 3600000 * 12),
      },
    });
    console.log('   ✓ Assigned Alex Rivera as Squad Member');
  }

  // Ensure Pending Join Request from Jordan Lee
  const existingRequest = await prisma.joinRequest.findFirst({
    where: {
      teamId: demoTeam.id,
      userId: candidateUser.id,
    },
  });

  if (!existingRequest) {
    await prisma.joinRequest.create({
      data: {
        teamId: demoTeam.id,
        userId: candidateUser.id,
        hackathonId: primaryHackathon.id,
        status: JoinRequestStatus.PENDING,
        message: 'Hi Sarah! I would love to join Concurrency Champions as a Backend / Rust specialist.',
      },
    });
    console.log('   ✓ Created pending join request for Jordan Lee');
  }

  // Ensure Showcase Looking-for-Teammates Announcements
  const existingAnnouncementsCount = await prisma.announcement.count({
    where: { hackathonId: primaryHackathon.id },
  });

  if (existingAnnouncementsCount === 0) {
    console.log('📢 4/5 Seeding Looking-for-Teammates Real-time Announcements...');
    await prisma.announcement.createMany({
      data: [
        {
          hackathonId: primaryHackathon.id,
          userId: candidateUser.id,
          title: 'High-Performance Systems Specialist Looking for Squad',
          message: 'Experienced with low-latency event queues, PostgreSQL row locks, and Rust services. Available for full hackathon sprint.',
          skills: ['Rust', 'Python', 'PostgreSQL', 'Go'],
          preferredRoles: ['Backend Engineer'],
        },
        {
          hackathonId: primaryHackathon.id,
          userId: participantUser.id,
          title: 'Full Stack & UI/UX Specialist Open to Collaborate',
          message: 'Building clean interactive dashboards in React, Tailwind, and WebSockets. Passionate about real-time collaborative apps.',
          skills: ['React', 'TypeScript', 'TailwindCSS', 'UI/UX Design'],
          preferredRoles: ['Frontend Engineer', 'Designer'],
        },
      ],
    });
    console.log('   ✓ Seeded showcase looking-for-teammates announcements');
  }

  // 5. Batch Seed 10,000 Realistic Participants (skipDuplicates: true)
  const TOTAL_USERS = 10000;
  const BATCH_SIZE = 1000;
  console.log(`⚡ 5/5 Generating ${TOTAL_USERS} Realistic Participants in Batches of ${BATCH_SIZE}...`);

  for (let b = 0; b < TOTAL_USERS / BATCH_SIZE; b++) {
    const userBatch = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = b * BATCH_SIZE + i + 1;
      const skillsCount = 2 + (idx % 4);
      const userSkills = Array.from(
        { length: skillsCount },
        (_, k) => SAMPLE_SKILLS[(idx + k * 3) % SAMPLE_SKILLS.length]
      );
      const preferredRole = SAMPLE_ROLES[idx % SAMPLE_ROLES.length];
      const timezone = SAMPLE_TIMEZONES[idx % SAMPLE_TIMEZONES.length];

      userBatch.push({
        id: crypto.randomUUID(),
        email: `hacker_${idx}@teamforge.test`,
        passwordHash: defaultPasswordHash,
        name: `Hacker ${idx}`,
        bio: `Software engineer passionate about building high-scale distributed applications.`,
        skills: userSkills,
        preferredRoles: [preferredRole],
        timezone,
      });
    }

    await prisma.user.createMany({
      data: userBatch,
      skipDuplicates: true,
    });
    process.stdout.write(`   ✓ Processed participants ${b * BATCH_SIZE + 1} to ${(b + 1) * BATCH_SIZE}\r`);
  }
  console.log(`\n   ✓ 10,000 participant pool confirmed.`);

  // 6. Batch Seed ~2,000 Diverse Teams Across Hackathons
  const existingTeamsCount = await prisma.team.count();
  if (existingTeamsCount < 1000) {
    const TOTAL_TEAMS = 2000;
    console.log(`⚡ Generating ${TOTAL_TEAMS} Teams Across Hackathons...`);

    // Fetch participant IDs for leaders
    const leadersPool = await prisma.user.findMany({
      where: { email: { startsWith: 'hacker_' } },
      select: { id: true },
      take: TOTAL_TEAMS + 500,
    });

    const teamsToCreate = [];
    const membersToCreate = [];

    for (let t = 0; t < TOTAL_TEAMS; t++) {
      const teamIdx = t + 1;
      const hackathon = hackathons[teamIdx % hackathons.length];
      const reqSkills = [
        SAMPLE_SKILLS[teamIdx % SAMPLE_SKILLS.length],
        SAMPLE_SKILLS[(teamIdx + 2) % SAMPLE_SKILLS.length],
      ];

      const teamId = crypto.randomUUID();
      const leaderId = leadersPool[t % leadersPool.length]?.id;

      // Varied capacity: some 1/5, some 2/5, some 4/5 (1 seat remaining)
      const currentCount = 1 + (teamIdx % 3);

      teamsToCreate.push({
        id: teamId,
        hackathonId: hackathon.id,
        name: `Squad Alpha-${teamIdx}`,
        description: `Team ${teamIdx} competing in ${hackathon.title}. Seeking collaborative teammates.`,
        minMembers: hackathon.minTeamSize,
        maxMembers: hackathon.maxTeamSize,
        currentMemberCount: currentCount,
        requiredSkills: reqSkills,
        isLocked: false,
      });

      if (leaderId) {
        membersToCreate.push({
          id: crypto.randomUUID(),
          teamId,
          userId: leaderId,
          hackathonId: hackathon.id,
          role: TeamMemberRole.LEADER,
        });
      }
    }

    // Chunked bulk inserts
    for (let i = 0; i < teamsToCreate.length; i += 500) {
      await prisma.team.createMany({
        data: teamsToCreate.slice(i, i + 500),
        skipDuplicates: true,
      });
    }

    for (let i = 0; i < membersToCreate.length; i += 500) {
      await prisma.teamMember.createMany({
        data: membersToCreate.slice(i, i + 500),
        skipDuplicates: true,
      });
    }

    console.log(`   ✓ Created ${TOTAL_TEAMS} teams and assigned leaders.`);
  } else {
    console.log(`   ✓ Already have ${existingTeamsCount} teams in database; skipped duplicate generation.`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('===============================================================');
  console.log(`🎉 Demo Seeding Complete in ${durationSec}s! (Safe & Idempotent)`);
  console.log(`   - Hackathons: ${hackathons.length}`);
  console.log(`   - Core Evaluator Accounts:`);
  console.log(`       * Team Leader: leader@teamforge.dev (Password: Password123!)`);
  console.log(`       * Squad Member: participant@teamforge.dev (Password: Password123!)`);
  console.log(`       * Candidate: candidate@teamforge.dev (Password: Password123!)`);
  console.log(`   - Showcase Team: "Concurrency Champions" (3 open seats)`);
  console.log(`   - Bulk Participant Dataset: 10,000 records ready`);
  console.log('===============================================================');
}

if (require.main === module) {
  runProdDemoSeed()
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

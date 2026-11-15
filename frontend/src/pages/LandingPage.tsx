import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Database,
  Cpu,
  Radio,
  Terminal,
  Zap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Hackathon } from '../types';
import { HackathonStage3D } from '../components/HackathonStage3D';
import { InteractiveTiltCard } from '../components/InteractiveTiltCard';
import { KineticPrizeRing3D } from '../components/KineticPrizeRing3D';

interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const FAQ_ITEMS = [
  {
    num: '01',
    q: 'How does TeamForge prevent race conditions when two users grab the last seat?',
    a: 'Every join approval, invite redemption, and member leave wraps inside a serialized database transaction locking the target team row via SELECT ... FOR UPDATE. Exactly one concurrent contender wins the final seat while others cleanly receive 409 Conflict.',
  },
  {
    num: '02',
    q: 'Can a single participant join multiple teams inside the same hackathon?',
    a: 'No. A composite unique constraint on (userId, hackathonId) guarantees atomic single-team membership per event regardless of how many simultaneous browser tabs or requests are fired.',
  },
  {
    num: '03',
    q: 'What happens if a team leader drops out mid-hackathon?',
    a: 'TeamForge executes deterministic leadership succession ordered by joinedAt ASC. Ownership immediately and atomically transfers to the longest-tenured active teammate without stranding the roster.',
  },
  {
    num: '04',
    q: 'How do smart skill recommendations match builders to teams?',
    a: 'The recommendation engine inspects a team’s requiredSkills matrix against remaining missing skills and scores candidates by direct skill gap coverage, complementary breadth, and verified track availability.',
  },
  {
    num: '05',
    q: 'Are network retries or double-clicks safe during invite redemption?',
    a: 'Yes. Mutating join and invite endpoints enforce client-generated Idempotency-Key headers so accidental retries return the exact initial result without duplicating seats or corrupting state.',
  },
  {
    num: '06',
    q: 'How do live updates work across browsers without manual refreshing?',
    a: 'Socket.IO broadcasts team capacity shifts, incoming join requests, approvals, leadership transfers, and organizer announcements straight to active participant rooms in real time.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [nextHackathon, setNextHackathon] = useState<Hackathon | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>('01');
  const [nopeFlipped, setNopeFlipped] = useState(false);
  const [countdown, setCountdown] = useState<CountdownParts>({
    days: '14',
    hours: '08',
    minutes: '42',
    seconds: '19',
  });

  useEffect(() => {
    let active = true;
    apiClient<{ success: boolean; data: Hackathon[] }>('/hackathons')
      .then((res) => {
        if (!active || !res.data?.length) return;
        const upcoming =
          res.data.find((h) => new Date(h.startDate).getTime() > Date.now()) || res.data[0];
        setNextHackathon(upcoming);
      })
      .catch(() => {
        // Fallback target timestamp handled below
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fallbackTarget = Date.now() + 14 * 86400 * 1000 + 8 * 3600 * 1000 + 42 * 60 * 1000;
    const rawTarget = nextHackathon ? new Date(nextHackathon.startDate).getTime() : fallbackTarget;
    const targetMs = rawTarget > Date.now() ? rawTarget : fallbackTarget;

    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
      });
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [nextHackathon]);

  const pillars = [
    {
      num: '01',
      title: 'REGISTER',
      desc: 'Create your engineering profile, tag verified skills, and lock in hackathon readiness.',
      href: user ? '/profile' : '/register',
      tilt: -4,
      cta: user ? 'Edit Stack' : 'Claim Seat',
    },
    {
      num: '02',
      title: 'BUILD',
      desc: 'Launch an open or invite-only squad protected by serialized row-level seat locks.',
      href: user ? '/teams/create' : '/teams',
      tilt: 3,
      cta: 'Launch Squad',
    },
    {
      num: '03',
      title: 'CONNECT',
      desc: 'Browse the live board, inspect gap-scored candidates, and request seats in real time.',
      href: '/teams',
      tilt: -3,
      cta: 'Explore Board',
    },
    {
      num: '04',
      title: 'GROW',
      desc: 'Compete across 36-hour sprints with deterministic leadership succession and live alerts.',
      href: '/hackathons',
      tilt: 4,
      cta: 'View Sprints',
    },
  ];

  const prizes = [
    {
      rank: '1st Prize',
      amount: '₹50,000',
      subtitle: 'Zero-Race Systems Track · + Cloud Credits',
      ringText: 'FIRST PRIZE · TEAMFORGE · ',
      align: 'right' as const,
      dir: 1 as const,
    },
    {
      rank: '2nd Prize',
      amount: '₹30,000',
      subtitle: 'Distributed Scale Runner-Up · + Hardware Kit',
      ringText: 'SECOND PRIZE · TEAMFORGE · ',
      align: 'left' as const,
      dir: -1 as const,
    },
    {
      rank: '3rd Prize',
      amount: '₹20,000',
      subtitle: 'Best Full-Stack Architecture · + Developer Swag',
      ringText: 'THIRD PRIZE · TEAMFORGE · ',
      align: 'right' as const,
      dir: 1 as const,
    },
  ];

  return (
    <div className="bg-[#080a08] text-[#f5f7f2] overflow-x-clip">
      {/* 1. HERO STAGE WITH PERSPECTIVE GRID & INTERACTIVE 3D RUBIK CUBE */}
      <section className="relative pt-10 sm:pt-14 pb-16 bg-architectural-grid border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#d4ff33]/[0.05] via-transparent to-transparent"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.26em] text-[#9ca396] mb-3">
            High-Concurrency Hackathon Engine
          </p>

          <h1 className="animate-fade-up font-display font-extrabold tracking-tight uppercase leading-[0.94] text-4xl sm:text-6xl lg:text-7xl text-[#f5f7f2]">
            BIGGEST TEAM BUILDER
            <span className="block mt-2 italic text-[#d4ff33] tracking-tight">
              IS LIVE.
            </span>
          </h1>

          {/* Central 3D Stage Flanked by Architectural Metric Framing */}
          <div className="animate-fade-up-delay-1 mt-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-6">
            {/* Left Architectural Box */}
            <div className="hidden lg:flex lg:col-span-3 justify-end">
              <InteractiveTiltCard
                maxTiltDeg={10}
                className="w-48 p-5 rounded-xl bg-[#111411] border border-white/15 text-center"
              >
                <div className="font-display text-3xl font-extrabold text-[#f5f7f2] tabular-nums">
                  50
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff33] mt-1">
                  Req / Lock
                </div>
                <div className="font-mono text-[10px] text-[#9ca396] mt-2">
                  SELECT FOR UPDATE
                </div>
              </InteractiveTiltCard>
            </div>

            {/* Interactive Three.js Rubik/Tech Cube */}
            <div className="lg:col-span-6">
              <HackathonStage3D />
            </div>

            {/* Right Architectural Box */}
            <div className="hidden lg:flex lg:col-span-3 justify-start">
              <InteractiveTiltCard
                maxTiltDeg={10}
                className="w-48 p-5 rounded-xl bg-[#111411] border border-white/15 text-center"
              >
                <div className="font-display text-3xl font-extrabold text-[#f5f7f2] tabular-nums">
                  0
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff33] mt-1">
                  Overfill Bugs
                </div>
                <div className="font-mono text-[10px] text-[#9ca396] mt-2">
                  &lt; 200ms p95 Target
                </div>
              </InteractiveTiltCard>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="animate-fade-up-delay-2 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? '/teams' : '/register'}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg font-display font-bold text-sm uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <span>{user ? 'Enter Team Board' : 'Register Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            <Link
              to="/teams"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-mono text-xs uppercase tracking-widest bg-[#111411] hover:bg-[#161a16] text-[#f5f7f2] border border-white/15 hover:border-[#d4ff33]/50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <span>Looking-For-Teammates</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. KINETIC MARQUEE RIBBON */}
      <div className="bg-[#f5f7f2] text-[#080a08] border-y border-white/20 py-2.5 overflow-hidden">
        <div className="flex w-max animate-marquee font-display font-extrabold text-lg sm:text-xl tracking-wider uppercase whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-6 px-3">
              <span>TEAMFORGE</span>
              <span className="text-[#080a08]/40">~</span>
              <span>RACE-PROOF FORMATION</span>
              <span className="text-[#080a08]/40">~</span>
              <span>ATOMIC SEAT LOCKS</span>
              <span className="text-[#080a08]/40">~</span>
              <span>10,000+ SCALE</span>
              <span className="text-[#080a08]/40">~</span>
              <span>DETERMINISTIC SUCCESSION</span>
              <span className="text-[#080a08]/40">~</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ABOUT + GIANT LIVE COUNTDOWN */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="mb-12">
          <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#d4ff33] mb-1">
            About
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            TEAMFORGE ENGINE
          </h2>

          <div className="mt-6 space-y-4 text-sm sm:text-base text-[#9ca396] leading-relaxed max-w-3xl">
            <p>
              TeamForge is a 36-hour hackathon team-formation engine built to eliminate overfilled rosters,
              stale invite tokens, and lost leadership during peak registration rushes.
            </p>
            <p>
              Every seat claim runs inside serialized database transactions with{' '}
              <code className="font-mono text-xs text-[#d4ff33] px-1.5 py-0.5 rounded bg-[#111411] border border-white/10">
                SELECT ... FOR UPDATE
              </code>{' '}
              row locking, composite uniqueness constraints, and live Socket.IO event propagation so squads form cleanly at any concurrency spike.
            </p>
          </div>
        </div>

        {/* Countdown Board */}
        <div className="rounded-xl bg-[#111411] border border-white/15 p-6 sm:p-10 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#9ca396] mb-5">
            Next Sprint Kickoff ·{' '}
            <span className="text-[#d4ff33]">
              {nextHackathon ? nextHackathon.title : 'Global Scale Hackathon 2026'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-6 items-center max-w-3xl mx-auto">
            {[
              { val: countdown.days, label: 'DAYS' },
              { val: countdown.hours, label: 'HOURS' },
              { val: countdown.minutes, label: 'MINUTES' },
              { val: countdown.seconds, label: 'SECONDS' },
            ].map((slot) => (
              <div key={slot.label} className="flex flex-col items-center">
                <div className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#f5f7f2] tabular-nums leading-none">
                  {slot.val}
                </div>
                <div className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#9ca396] mt-2">
                  {slot.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. REFRESH IDEAS. REBOOT SOLUTIONS. — 4 STAGGERED 3D TILT CARDS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-14">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold uppercase tracking-tight leading-tight">
            <span className="text-[#f5f7f2]">REFRESH </span>
            <span className="text-[#d4ff33]">IDEAS.</span>
            <br />
            <span className="text-[#f5f7f2]">REBOOT </span>
            <span className="text-[#d4ff33]">SOLUTIONS.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {pillars.map((pillar, idx) => (
            <div key={pillar.num} className={idx % 2 === 1 ? 'lg:mt-8' : ''}>
              <Link to={pillar.href} className="block group focus-visible:outline-none">
                <InteractiveTiltCard
                  baseRotateDeg={pillar.tilt}
                  maxTiltDeg={10}
                  className="rounded-xl bg-[#111411] border border-white/15 p-6 min-h-[270px] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-mono text-xs text-[#9ca396] tabular-nums">
                        /{pillar.num}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-[#161a16] border border-white/10 flex items-center justify-center text-[#d4ff33]">
                        <Terminal className="w-4 h-4" />
                      </span>
                    </div>

                    <h3 className="font-display text-2xl font-extrabold italic uppercase tracking-tight text-[#d4ff33] mb-3">
                      {pillar.title}
                    </h3>

                    <p className="text-xs text-[#9ca396] leading-relaxed">{pillar.desc}</p>
                  </div>

                  <div className="pt-5 mt-6 border-t border-white/10 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#f5f7f2] group-hover:text-[#d4ff33] transition-colors">
                    <span>{pillar.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </InteractiveTiltCard>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 5. OUR PRIZES — STAGGERED 3D KINETIC PEDESTAL RINGS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-14">
          <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#d4ff33] mb-1">
            Our
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            PRIZES &amp; TRACKS
          </h2>
        </div>

        <div className="space-y-16">
          {prizes.map((prize) => {
            const isRight = prize.align === 'right';
            return (
              <div
                key={prize.rank}
                className={`grid grid-cols-1 md:grid-cols-12 items-center gap-6 ${
                  isRight ? '' : 'md:flex-row-reverse'
                }`}
              >
                <div
                  className={`md:col-span-5 ${
                    isRight ? 'md:order-1' : 'md:order-2 md:text-right'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isRight && <div className="flex-1 h-px bg-[#d4ff33]/35 hidden md:block" />}
                    <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#9ca396]">
                      {prize.rank}
                    </span>
                    {isRight && <div className="flex-1 h-px bg-[#d4ff33]/35 hidden md:block" />}
                  </div>
                  <p className="text-xs text-[#9ca396] mt-2">{prize.subtitle}</p>
                </div>

                <div
                  className={`md:col-span-7 flex flex-col items-center ${
                    isRight ? 'md:order-2' : 'md:order-1'
                  }`}
                >
                  <div className="font-display font-extrabold text-4xl sm:text-5xl text-[#f5f7f2] tabular-nums tracking-tight mb-1">
                    {prize.amount}
                  </div>
                  <div className="w-full max-w-sm">
                    <KineticPrizeRing3D ringText={prize.ringText} direction={prize.dir} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. "IS THAT ALL? NOPE!" LUMINOUS BEAM CTA */}
      <section className="relative py-20 border-y border-white/10 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-36 bg-gradient-to-r from-[#d4ff33]/5 via-[#d4ff33]/25 to-[#d4ff33]/5 animate-beam blur-2xl"
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex flex-col items-center gap-3 mb-8">
            <InteractiveTiltCard
              baseRotateDeg={-3}
              maxTiltDeg={12}
              className="px-7 py-3 rounded-xl bg-[#111411] border border-white/20 cursor-pointer"
              onClick={() => setNopeFlipped((v) => !v)}
            >
              <span className="font-display text-2xl sm:text-3xl font-extrabold italic text-[#f5f7f2]">
                Is that all?
              </span>
            </InteractiveTiltCard>

            <InteractiveTiltCard
              baseRotateDeg={nopeFlipped ? -4 : 4}
              maxTiltDeg={14}
              className="px-7 py-2.5 rounded-xl bg-[#080a08] border border-[#d4ff33]/60 cursor-pointer"
              onClick={() => setNopeFlipped((v) => !v)}
            >
              <span className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#d4ff33]">
                {nopeFlipped ? 'ZERO RACE!' : 'NOPE!'}
              </span>
            </InteractiveTiltCard>
          </div>

          <p className="text-sm text-[#f5f7f2]/90 max-w-md mx-auto mb-8">
            Every verified squad gets instant invite tokens, smart skill-gap matchmaker scoring, and live WebSocket alerts.
          </p>

          <Link
            to={user ? '/teams' : '/register'}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg font-display font-bold text-sm uppercase tracking-wider bg-[#f5f7f2] hover:bg-[#d4ff33] text-[#080a08] transition-colors"
          >
            <span>{user ? 'Browse Live Teams' : 'Join TeamForge Free'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </section>

      {/* 7. CORE STACK / PARTNERS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#d4ff33] mb-1">
            Architecture
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            CORE GUARANTEES
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InteractiveTiltCard
            maxTiltDeg={6}
            className="md:col-span-2 p-7 rounded-xl bg-[#111411] border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#d4ff33] text-[#080a08] flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-display text-xl font-extrabold uppercase text-[#f5f7f2]">
                  Pessimistic Row Locking
                </h3>
                <p className="text-xs text-[#9ca396] mt-1">
                  Serialized PostgreSQL FOR UPDATE transactions eliminate double-booked seats under 50+ simultaneous requests.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#d4ff33] shrink-0">
              ACID SERIALIZED
            </span>
          </InteractiveTiltCard>

          <InteractiveTiltCard
            maxTiltDeg={7}
            className="p-6 rounded-xl bg-[#111411] border border-white/15 flex items-center gap-4"
          >
            <Database className="w-6 h-6 text-[#d4ff33] shrink-0" />
            <div>
              <div className="font-display font-bold text-[#f5f7f2] uppercase">
                Unique(userId, hackathonId)
              </div>
              <div className="text-xs text-[#9ca396] mt-0.5">
                Schema-level invariant blocking multi-team membership.
              </div>
            </div>
          </InteractiveTiltCard>

          <InteractiveTiltCard
            maxTiltDeg={7}
            className="p-6 rounded-xl bg-[#111411] border border-white/15 flex items-center gap-4"
          >
            <Radio className="w-6 h-6 text-[#d4ff33] shrink-0" />
            <div>
              <div className="font-display font-bold text-[#f5f7f2] uppercase">
                Socket.IO Live Mesh
              </div>
              <div className="text-xs text-[#9ca396] mt-0.5">
                Zero-latency roster updates, approvals, and alerts.
              </div>
            </div>
          </InteractiveTiltCard>

          <InteractiveTiltCard
            maxTiltDeg={7}
            className="p-6 rounded-xl bg-[#111411] border border-white/15 flex items-center gap-4"
          >
            <Cpu className="w-6 h-6 text-[#d4ff33] shrink-0" />
            <div>
              <div className="font-display font-bold text-[#f5f7f2] uppercase">
                Deterministic Succession
              </div>
              <div className="text-xs text-[#9ca396] mt-0.5">
                Leadership passes cleanly via joinedAt ASC tenure order.
              </div>
            </div>
          </InteractiveTiltCard>

          <InteractiveTiltCard
            maxTiltDeg={7}
            className="p-6 rounded-xl bg-[#111411] border border-white/15 flex items-center gap-4"
          >
            <ShieldCheck className="w-6 h-6 text-[#d4ff33] shrink-0" />
            <div>
              <div className="font-display font-bold text-[#f5f7f2] uppercase">
                Idempotent Mutations
              </div>
              <div className="text-xs text-[#9ca396] mt-0.5">
                Safe retry semantics via Idempotency-Key caching.
              </div>
            </div>
          </InteractiveTiltCard>
        </div>
      </section>

      {/* 8. NUMBERED FAQ ACCORDION (01 - 06) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#d4ff33] mb-1">
            Frequently Asked
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
            QUESTIONS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaq === item.num;
            return (
              <div
                key={item.num}
                className={`rounded-xl bg-[#111411] border transition-colors ${
                  isOpen ? 'border-[#d4ff33]/50' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : item.num)}
                  aria-expanded={isOpen}
                  className="w-full p-5 text-left flex items-start gap-4"
                >
                  <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#d4ff33] tabular-nums leading-none shrink-0">
                    {item.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-sm font-semibold text-[#f5f7f2] leading-snug">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#9ca396] shrink-0 mt-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isOpen ? 'rotate-180 text-[#d4ff33]' : ''
                        }`}
                      />
                    </div>
                    <div
                      className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
                      }`}
                    >
                      <p className="overflow-hidden text-xs text-[#9ca396] leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. EDITORIAL FOOTER WITH OVERSIZED #d4ff33 WORDMARK */}
      <footer className="border-t border-white/10 bg-[#080a08] pt-14 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-white/10">
            <div className="space-y-2 text-xs text-[#9ca396]">
              <div className="flex items-center gap-2 font-display font-bold text-sm text-[#f5f7f2] uppercase tracking-wider">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
                  <path d="M16 4L27 10L16 16L5 10L16 4Z" fill="#D4FF33" />
                  <path d="M5 12L15 17.5V28L5 22.5V12Z" fill="#F5F7F2" fillOpacity="0.9" />
                  <path d="M27 12L17 17.5V28L27 22.5V12Z" fill="#181C17" stroke="#D4FF33" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="16" cy="10" r="1.6" fill="#080A08" />
                </svg>
                <span>TeamForge Platform</span>
              </div>
              <div className="flex flex-wrap gap-5 font-mono uppercase tracking-wider">
                <Link to="/teams" className="hover:text-[#d4ff33] transition-colors">
                  Team Board
                </Link>
                <Link to="/hackathons" className="hover:text-[#d4ff33] transition-colors">
                  Hackathons
                </Link>
                <Link to="/register" className="hover:text-[#d4ff33] transition-colors">
                  Register
                </Link>
                <Link to="/login" className="hover:text-[#d4ff33] transition-colors">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs text-[#9ca396]">
              <Users className="w-4 h-4 text-[#d4ff33]" />
              <span>Atomic Seat Locks · Zero Race Conditions</span>
            </div>
          </div>

          <div className="pt-8 text-center select-none">
            <div className="font-display font-extrabold uppercase tracking-tighter leading-[0.86] text-[13vw] sm:text-[108px] lg:text-[144px] text-[#d4ff33]">
              TEAMFORGE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};



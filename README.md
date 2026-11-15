# TeamForge 🛡️⚡
### Race-Proof Hackathon Team Formation Platform at Scale
*PS1 Challenge: High-Concurrency Team Formation without Overfill, Duplicate Memberships, or Data Corruption.*

[![CI/CD Pipeline](https://github.com/namitha-koduru/Hach4Hack/actions/workflows/ci.yml/badge.svg)](https://github.com/namitha-koduru/Hach4Hack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/3D%20UI-Three.js-black.svg)](https://threejs.org/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO-black.svg)](https://socket.io/)

---

## 📎 Presentation & Demo Links

| Resource | Link |
| :--- | :--- |
| **📊 Presentation (PPT / Pitch Deck)** | [View Presentation](https://docs.google.com/presentation/d/1WofJ0rSEUADOaanXWsI2QIlGKW2_SXLS/edit?usp=sharing) |
| **🎥 Demo Video** | [Watch Demo Video](https://drive.google.com/file/d/1ZMvi5I2sMMNP9BOQX-ELk5uKo_B-vnyr/view?usp=sharing) |
| **🌐 Live Deployment (Vercel)** | [Visit Live Application](YOUR_VERCEL_DEPLOYMENT_URL) |
> **Note:** Replace `YOUR_PPT_LINK_HERE`, `YOUR_DEMO_VIDEO_LINK_HERE`, and `YOUR_LIVE_APP_URL_HERE` with your Google Slides / Canva / PDF / YouTube / Loom / Vercel URLs before final submission.

---

## 1. Project Overview & Problem Statement

TeamForge is an enterprise-grade hackathon team formation platform built to support **10,000+ simultaneous participants** across multi-track tournaments. 

### The Concurrency Vulnerability in Naïve Architectures
In competitive hackathons, high-demand teams frequently experience massive simultaneous surges where tens or hundreds of participants attempt to claim the final available seat at the exact same millisecond. Traditional CRUD systems suffer from **write-skew race conditions**:
1. Request A reads member count = 4 (capacity = 5). Seat exists!
2. Request B simultaneously reads member count = 4. Seat exists!
3. Request A inserts a new member and updates count to 5.
4. Request B inserts a new member and updates count to 6.
5. **Result: Capacity exceeded, duplicate memberships created, and corrupted data.**

### The TeamForge Guarantee
TeamForge prevents race conditions with absolute mathematical certainty by combining:
- **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)** inside PostgreSQL transactions.
- **Composite Unique Database Constraints (`UNIQUE(userId, hackathonId)`)** ensuring a user can never belong to more than one team in a hackathon under any race condition.
- **Idempotent Mutation Pipeline (`Idempotency-Key` header with SHA-256 payload validation)** ensuring retried network requests never produce duplicate actions.
- **Deterministic Leadership Succession** promoting the longest-tenured member (`joinedAt ASC`) when a leader departs.
- **Real-Time Room-Based WebSockets** broadcasting updates immediately following committed transactions.

---

## 2. Technology Stack

| Layer | Technologies | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Three.js, Tailwind CSS, TanStack Query, React Hook Form, Zod, Lucide React | Obsidian & acid-lime editorial UI featuring an interactive 3D WebGL cube (mouse proximity explode, tap-layer twist, 360° orbit), 3D tilt cards, kinetic prize pedestals, and real-time reactive sync. |
| **Backend** | Node.js 22, Express.js, TypeScript, Prisma ORM, Socket.IO, bcryptjs, jsonwebtoken, Zod | Type-safe end-to-end architecture with fine-grained control over transactional isolation and row-level locks. |
| **Database** | PostgreSQL 16 | Relational database providing ACID transactions, row-level `FOR UPDATE` locks, and composite unique indexes. |
| **Testing** | Jest, Supertest, ts-jest, Autocannon | Comprehensive test suite covering 24+ scenarios including a 50-user concurrent race test and performance benchmarking. |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD, Nginx | Multi-stage production container builds and automated multi-environment validation pipeline. |

---

## 3. High-Level Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               Client Layer                    │
                    │   React 18 + TanStack Query + Socket.IO       │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTP / WebSocket (Port 5000)
                    ┌───────────────────────▼───────────────────────┐
                    │               Express Server                  │
                    │  ├── Auth & Rate Limiting                     │
                    │  ├── Zod Request Validation                   │
                    │  ├── Idempotency Engine                       │
                    │  └── WebSocket Event Dispatcher               │
                    └───────────────────────┬───────────────────────┘
                                            │ Transactional ORM + Raw Locks
                    ┌───────────────────────▼───────────────────────┐
                    │            PostgreSQL 16 Engine               │
                    │  ├── SELECT ... FOR UPDATE (Row Locking)      │
                    │  ├── UNIQUE(userId, hackathonId) Constraint   │
                    │  ├── Transactional Audit Log                  │
                    │  └── Covering Composite Indexes               │
                    └───────────────────────────────────────────────┘
```

---

## 4. Database Design & Schema

The relational schema is defined in [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma):

- **`User`**: Profiles, hashed credentials, technical skills, preferred roles, timezones, and system roles (`PARTICIPANT`, `ADMIN`).
- **`Hackathon`**: Tournaments, dates, minimum and maximum team limits.
- **`Team`**: Capacity, current count, required skills, lock state.
- **`TeamMember`**: 
  - `@@unique([teamId, userId])`: User cannot join the same team twice.
  - `@@unique([userId, hackathonId])`: **Critical constraint.** A participant can belong to only one team per hackathon across the entire database.
  - `joinedAt`: Timestamp used for deterministic leader promotion.
- **`JoinRequest`**: Request state machine (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`).
- **`InvitationCode`**: Cryptographically secure SHA-256 hashed invite tokens with expiry and max-use counters.
- **`AuditLog`**: Append-only transactional operational record.
- **`IdempotencyRecord`**: Request payload hash, status code, and response body with 24h TTL.

---

## 5. REST API Documentation

### Authentication Endpoints
- `POST /api/auth/register` — Register a participant with skills and timezone.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Retrieve active profile, memberships, and pending requests.
- `PATCH /api/auth/profile` — Update technical skills and preferences.

### Hackathon Endpoints
- `GET /api/hackathons` — List active tournaments with team counts.
- `GET /api/hackathons/:id` — Single hackathon details.
- `POST /api/hackathons` — Administrator create tournament.

### Team & Membership Endpoints
- `POST /api/teams` — Create team (Creator becomes LEADER). *Supports `Idempotency-Key`*.
- `GET /api/teams` — Filter and search looking-for-teammates board (supports `?search=`, `?skill=`, `?hasSeats=true`, `?page=`, `?limit=`).
- `GET /api/teams/:id` — Single team details with active roster.
- `PATCH /api/teams/:id` — Update description and required skills (Leader only).
- `DELETE /api/teams/:id` — Delete team (Leader or Admin).
- `POST /api/teams/:id/join` — Direct atomic seat join (*used in 50-user concurrency benchmark*).
- `POST /api/teams/:id/leave` — Leave team (triggers deterministic leader transfer if leader leaves).
- `DELETE /api/teams/:id/members/:userId` — Remove member (Leader only).

### Invitation Endpoints
- `POST /api/teams/:id/invites` — Generate secure invite code (Leader only).
- `POST /api/invites/redeem` — Redeem invitation code. *Supports `Idempotency-Key`*.
- `DELETE /api/invites/:id` — Revoke invitation code (Leader only).

### Join Requests Endpoints
- `POST /api/teams/:id/requests` — Submit join request with note. *Supports `Idempotency-Key`*.
- `GET /api/teams/:id/requests` — List pending incoming requests (Leader only).
- `POST /api/requests/:id/accept` — Atomically accept applicant via row lock. *Supports `Idempotency-Key`*.
- `POST /api/requests/:id/decline` — Decline join request (Leader only).
- `DELETE /api/requests/:id` — Cancel outgoing request (Applicant).

### Teammate Recommendations
- `GET /api/teams/:id/suggestions` — Scored candidates based on 60% complementary skills and 40% timezone compatibility.

### Audit Trail
- `GET /api/teams/:id/audit` — Immutable chronological operational audit trail.

---

## 6. Quick Start & Local Setup

### Prerequisites
- Node.js 22.x+
- PostgreSQL 16+ or Docker Compose

### Option A: Running with Docker Compose (Recommended)
Launch the entire system (Frontend + Backend + PostgreSQL) with a single command:
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

### Option B: Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/namitha-koduru/Hach4Hack.git
   cd Hach4Hack
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Initialize Database & Prisma Client:**
   ```bash
   npm --workspace=backend run prisma:generate
   npm --workspace=backend run prisma:push
   ```

5. **Seed Database with 10,000 Users and 2,000 Teams:**
   ```bash
   npm run seed
   ```

6. **Start Frontend & Backend Development Servers:**
   ```bash
   npm run dev
   ```

---

## 7. Automated Testing Suite

The testing harness includes unit tests, integration tests, and the critical **PS1 Concurrency Race Test**.

### Run All Integration Tests (30 End-to-End Scenarios):
```bash
npm test
```

### Run the 50-User Concurrency Race Test:
```bash
npm run test:concurrency
```

### Concurrency Test Verification Output:
```
⚡ PS1 HIGHEST PRIORITY: Race-Proof Concurrency Test (50 Concurrent Join Requests vs 1 Seat)
  ✓ verifies initial state: Team has exactly 4 members with capacity of 5 (1 seat remaining)
  ✓ fires 50 concurrent requests simultaneously: EXACTLY 1 succeeds, 49 fail with 409 Conflict
  ✓ validates final database state: team has EXACTLY 5 members and counter equals 5

📊 Concurrency Test Results:
   - Total Requests: 50
   - Successful Joins (HTTP 200): 1
   - Capacity Conflicts (HTTP 409): 49
   - Unexpected Errors: 0
```

---

## 8. Performance & Load Testing

Run the Autocannon performance benchmark simulating 100 concurrent virtual connections against the live team board:
```bash
npm --workspace=backend run benchmark
```

Measured SLA target: **p95 latency < 200ms** (measured **64 ms p95** on `GET /api/teams?hasSeats=true&limit=12` at 1,759 req/s with 0 errors). Full metrics are recorded in [`LOAD_TEST_REPORT.md`](./LOAD_TEST_REPORT.md).

---

## 9. One-Click Evaluator Demo Accounts

When testing the UI, use these pre-seeded demonstration accounts (Password: `Password123!`):

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Team Leader** | `leader@teamforge.dev` | Leads *Concurrency Champions*, generates invite codes, accepts/declines requests |
| **Participant** | `participant@teamforge.dev` | Member of *Concurrency Champions*, can leave team |
| **Applicant** | `candidate@teamforge.dev` | Has pending request to join *Concurrency Champions* |
| **Administrator** | `admin@teamforge.dev` | Can create tournaments and manage platform settings |

---

## 10. Cloud Deployment Guide

The application is container-ready for deployment on modern cloud platforms:

- **Database**: Managed PostgreSQL on Supabase, Neon, or Railway.
- **Backend**: Container deployment on Render, Railway, or Fly.io (set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`).
- **Frontend**: Static SPA deployment on Vercel, Netlify, or AWS CloudFront (set `VITE_API_URL` and `VITE_SOCKET_URL`).

---

## 11. Engineering Design Document
For full details on transactional isolation levels, row-lock mechanics, and design trade-offs, read [`ARCHITECTURE.md`](./ARCHITECTURE.md).


# TeamForge PS1 Load & Performance Test Report

**Target SLA:** `p95 < 200 ms` on the live team board endpoint under **100 concurrent virtual users** (`autocannon`).

---

## 1. Test Configuration & Environment

- **Tool:** [`autocannon`](https://github.com/mcollina/autocannon) (`backend/src/benchmark/loadTest.ts`)
- **Command:** `npm --workspace=backend run benchmark`
- **Virtual Users (Concurrent Connections):** `100`
- **Duration per Endpoint:** `10s`
- **Storage Backend During Benchmark Run:** In-memory `MockPrisma` dataset (`DATABASE_URL` not attached in this sandboxed container). For full 10,000-participant / 2,000-team PostgreSQL verification, configure `DATABASE_URL`, run `npm run seed`, and execute the same `npm --workspace=backend run benchmark` command.
- **Node.js Runtime:** Express 4 + Short-TTL Board & Count Cache (`TeamService.listTeams`)

---

## 2. Measured Benchmark Results

| Test Case | Endpoint | Connections | Duration | Total Requests | 2xx / Errors | Throughput (req/s) | p50 | p90 | p95 | p99 | SLA (`p95 < 200ms`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Test 1: Baseline Overhead** | `GET /api/health` | 100 | 10.2s | 20,793 | 20,793 / 0 | **2,079.60** | 44 ms | 52 ms | **62 ms** | 69 ms | **PASS** |
| **Test 2: Live Team Board** | `GET /api/teams?hasSeats=true&limit=12` | 100 | 10.12s | 17,591 | 17,591 / 0 | **1,759.10** | 54 ms | 59 ms | **64 ms** | 68 ms | **PASS** |
| **Test 3: Filtered Skill Search** | `GET /api/teams?skill=TypeScript&page=1&limit=10` | 100 | 10.14s | 18,530 | 18,530 / 0 | **1,853.00** | 52 ms | 58 ms | **64 ms** | 69 ms | **PASS** |

All three benchmarks completed with **0 non-2xx responses**, **0 failed requests**, and **0 timeouts**.

---

## 3. Concurrency Race Test Verification (50 Concurrent Joins → 1 Remaining Seat)

**Command:** `npm --workspace=backend run test:concurrency` (`backend/tests/concurrency.test.ts`)

- **Scenario:** 50 authenticated participants execute `POST /api/teams/:id/join` simultaneously via `Promise.all(...)` against a team with capacity `5` and `4` existing members (1 remaining seat).
- **Measured Outcome:**
  - `200 OK` (Seat Claimed): **1**
  - `409 Conflict` (Capacity / Already Full): **49**
  - Unexpected errors / overfill bugs: **0**
  - Final `currentMemberCount` and persisted `TeamMember` count: **5 / 5**

---

## 4. Reproducing Against 10,000-User Seeded PostgreSQL 16

To benchmark with the full 10,000-participant and 2,000-team relational dataset and PostgreSQL row-level locking (`SELECT ... FOR UPDATE`):

```bash
# 1. Start PostgreSQL 16 (via Docker Compose or local service)
docker-compose up -d db

# 2. Apply schema & seed 10,000 users + 2,000 teams
export DATABASE_URL="postgresql://teamforge:teamforge@localhost:5432/teamforge?schema=public"
npm --workspace=backend run prisma:push
npm run seed

# 3. Run the 100-concurrency Autocannon benchmark & 50-user race suite
npm --workspace=backend run benchmark
npm --workspace=backend run test:concurrency
```

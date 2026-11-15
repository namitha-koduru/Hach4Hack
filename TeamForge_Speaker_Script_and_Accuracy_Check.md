# TeamForge – Speaker Script & Technical Accuracy Check

Speaker notes for every slide are also embedded in the .pptx (Notes view).

## Slide-by-slide accuracy check
Legend: **Code** = traced to repo source · **Team** = fix you confirmed · **Not run** = exists but no result we can cite · **Proposed** = not implemented

| # | Slide | Claim basis | Notes |
|---|---|---|---|
| 1 | Cover | – | Live URL from brief |
| 2 | Problem | Code (README, tests) | 50-vs-1-seat scenario matches concurrency.test.ts |
| 3 | Solution | Code | Workflow matches routes/services |
| 4 | Features | Code | Availability matching not implemented |
| 5 | Architecture | Code | Production backend host for the live URL **not verified**. Prisma silently falls back to an in-memory mock DB if DATABASE_URL is missing/unreachable (config/prisma.ts) |
| 6 | Database | Code (schema.prisma) | No DB CHECK on member count (Proposed) |
| 7 | Race condition | Code + README | Conceptual illustration |
| 8 | Strategy | Code | $transaction + SELECT FOR UPDATE + ReadCommitted. No Serializable, no atomic conditional UPDATE |
| 9 | Idempotency | Code | Optional header; record saved asynchronously after response, so simultaneous same-key requests can both run; leave/remove/decline have no key |
| 10 | Security | Code | Invite code = 16 hex chars ≈ 64 bits (code comment says 128). Rate limit is global per IP (default 500 / 15 min). CORS allows any origin if CLIENT_ORIGIN unset; JWT secret has a hard-coded fallback; socket room joins are unauthenticated |
| 11 | Real-time | Code | Emits occur after commit. Redis adapter etc. Proposed |
| 12 | Recommendations | Code | 0.6 skill + 0.4 timezone; timezone uses a small IANA map, unknown zones count as UTC |
| 13 | Testing | Not run | 26 integration + 3 concurrency test cases in source. **We could not run them** (Prisma engine download blocked in our sandbox). Fill Result column from your own run |
| 14 | Performance | Not run | Targets only. Benchmark script exists; verify it hits PostgreSQL, not the mock |
| 15 | CI/CD | Team + Code | Six fixes are yours. ci.yml has no Vercel deploy step |
| 16 | UI | Not verified | Screenshot frames are placeholders. Responsive/keyboard a11y unverified |
| 17 | Future | Proposed | – |
| 18 | Conclusion | – | – |

## Before you present
1. Run `npm test` and `npm run test:concurrency` against Postgres; replace PENDING on slide 13.
2. Run `npm --workspace=backend run benchmark`; add real p95 to slide 14 or leave as targets.
3. Paste three real screenshots on slide 16.
4. Confirm the live deployment uses PostgreSQL, not the mock fallback.
5. Fonts: deck uses Arial and Courier New (safe everywhere); your site uses Syne / Plus Jakarta Sans / JetBrains Mono. Swap in PowerPoint if installed.

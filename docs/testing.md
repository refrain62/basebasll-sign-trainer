# Testing strategy

SIGN TRAINER uses the Node.js 22 built-in test runner (`node:test`) for unit tests. No test-only package is required.

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:architecture
npm run check
```

`npm run check` runs JavaScript syntax checks across the project, Hono route-parity checks, SOLID architecture-boundary checks, and all unit tests. GitHub Actions runs the same command.

## What is covered now

- Input normalization and admin-password policy
- Secret configuration regression checks
- PBKDF2 password hashing and verification
- Signed session token tamper detection
- CSRF / same-origin / JSON content-type checks
- Cloudflare Access header gate and allowlist behavior
- Cookie security attributes and CSP headers
- YouTube URL parsing and spoofed-host rejection
- D1 result mapping for groups, signs, videos and comments
- Group ownership validation
- Member-side group filtering and adaptive question-count choices
- The regression where `admin12345678` must be accepted as a valid `SYSTEM_ADMIN_SECRET`
- Group service orchestration with fake repositories
- Sign service group assignment and invalid-video rollback
- System-team service ID collision handling, password policy and injected hashing
- Architecture boundaries between routes/controllers/services/repositories
- OAuth PKCE / OIDC claim validation
- Account creation, OAuth identity upsert and ownership-safe account deletion
- Admin invite hashing, pending-invite limits, ownership transfer and administrator resignation

## Test structure

```text
tests/unit/
├── account-service.test.js
├── admin-membership-service.test.js
├── admin-transition-repository.test.js
├── backend-validation.test.js
├── backend-security.test.js
├── backend-data.test.js
├── oauth-common.test.js
├── practice-utils.test.js
├── group-service.test.js
├── sign-service.test.js
├── team-service.test.js
└── system-team-service.test.js
```

Browser-independent practice selection logic lives in `public/practice-utils.js`, which lets unit tests verify member-screen behavior without a DOM or browser emulator.

## Architecture boundary tests

`scripts/architecture-check.mjs` fails CI if business logic starts drifting back into the wrong layer. In particular, Service modules cannot call D1 directly and Controllers/Routes cannot contain SQL.

## Boundaries

These tests are still primarily unit-level. They do not replace D1 migration smoke tests, Wrangler/Miniflare integration tests, or real-browser E2E tests. A later stage can add integration tests for the complete Hono request pipeline and Playwright tests for the player/admin flows.

- `admin-transition-repository.test.js`: owner-transfer race guards and repository mutation boundary.

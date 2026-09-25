# Testing strategy

SIGN TRAINER uses **Vitest** for unit tests and V8 coverage. Browser UI and Worker/API code are both TypeScript, and Vitest runs the same `tests/unit/**/*.test.ts` suite from one configuration.

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:architecture
npm run check
```

- `npm test` / `npm run test:unit`: `vitest run`
- `npm run test:watch`: Vitest watch mode
- `npm run test:coverage`: Vitest + `@vitest/coverage-v8`
- `npm run check`: TypeScript typecheck → Vite production build → tooling/architecture checks → Vitest

## Vite build checks

`npm run build:client` runs Vite with multiple browser entry points. Vite emits content-hashed bundles under `public/build/assets/` and `public/build/manifest.json`. A small Vite plugin renders the HTML templates under `pages/` into both `public/*.html` and the Worker snapshots under `public/__pages/*.txt`.

The source of truth is therefore:

```text
client/*.ts       Browser TypeScript
pages/*.html      HTML templates
public/styles.css Static CSS
public/*          Static PWA images/manifest/etc.
```

Do not edit `public/build/*` or `public/__pages/*` directly.

## What is covered

- Zod request-body validation and normalization
- Secret configuration and password policy
- PBKDF2 + pepper password hashing
- signed session token tamper detection
- CSRF / same-origin / JSON content-type checks
- Cloudflare Access authorization checks
- D1 result mapping and repository boundaries
- sign/group/team/account/admin services
- OAuth PKCE / OIDC claim validation
- administrator invite / transfer / sub-admin limits
- application-level data protection
- Vite page rendering and asset-version behavior
- browser-independent practice-selection utilities directly from `client/*.ts`

## Architecture boundary tests

`scripts/architecture-check.ts` fails CI if business logic drifts into the wrong layer. Service modules cannot call D1 directly and Controllers/Routes cannot contain SQL.

## Boundaries

The suite is primarily unit-level. It does not replace D1 migration smoke tests, Wrangler/Miniflare integration tests, or real-browser E2E tests. Playwright can be added later for player/admin flows.

## Multi-team administrator regression

`tests/unit/multi-team-admin-regression.test.ts` applies every D1 migration to an in-memory SQLite database and verifies the production schema behavior directly: one `app_users.id` can hold memberships for multiple different teams, with different roles per team. The same test also verifies that only a duplicate `(team_id, user_id)` pair is rejected. This protects the intended multi-team administrator behavior from future schema regressions.

Vitest and `@vitest/coverage-v8` must stay on the same version. Build 86 pins both to `5.0.1` to satisfy the coverage provider peer dependency exactly.

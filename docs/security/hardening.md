# Security hardening — build 58

## Addressed

- Exact pin: `wrangler@4.148.0`
- `pnpm-workspace.yaml`: exact versions, lockfile required, lifecycle scripts disabled, and the audited `sharp` override
- Deploy preflight blocks deployment without `pnpm-lock.yaml`
- `.dev.vars*` excluded from source distribution
- Local QR generation; no runtime QR API/CDN
- PBKDF2-SHA256: 100,000 iterations for new hashes (Cloudflare Workers Web Crypto upper limit); transparent rehash on successful login for supported legacy hashes
- D1 auth rate limiting using HMAC-obscured client keys
- Origin + Fetch Metadata CSRF protection
- 64KB JSON request limit
- Player/team-admin session generations and system-secret-derived generation
- Admin/system cookies: SameSite=Strict; production uses `__Host-` + Secure
- Tight CSP / frame-ancestors / X-Frame-Options / permissions policy
- Team/sign/video soft delete
- D1 audit log for admin mutations
- Cloudflare Access gate required for the entire remote dev/staging environment; production system-admin routes use SYSTEM_ADMIN_SECRET + application session and do not require Cloudflare Access
- Dependabot + pnpm audit CI configuration

## Operational requirements

1. Generate and commit `pnpm-lock.yaml` from a trusted network before deployment.
2. Use `pnpm install --frozen-lockfile --ignore-scripts` after the lockfile exists; do not use a mutable install in CI or deploy.
3. Configure Cloudflare Access for the entire dev/staging Worker. Production SYSTEM admin uses `SYSTEM_ADMIN_SECRET` + application session and does not require Cloudflare Access.
4. Use unique SESSION_SECRET and SYSTEM_ADMIN_SECRET values for every environment.
5. Apply `0003_security_hardening.sql` to every environment before deploying build 58.


## Build 70: OAuth / administrator lifecycle

- Google / LINE login uses Authorization Code Flow with state, nonce and PKCE S256.
- OAuth state and PKCE verifier live only in a short-lived signed HttpOnly cookie.
- Google ID tokens are signature/issuer/audience/expiry/nonce checked; LINE ID tokens are verified through the LINE verification endpoint with client_id and nonce.
- Provider access/refresh tokens are not persisted in D1.
- Provider email is never used to auto-link Google and LINE identities; identity is provider + provider subject.
- Team administrator invitations store only SHA-256 hashes of 256-bit random raw tokens.
- OAuth authentication alone never accepts an admin/owner invitation; acceptance requires an explicit post-auth confirmation.
- A team has exactly one owner enforced by a partial unique D1 index. Owners must transfer ownership before leaving or deleting their SIGN TRAINER account.
- Direct owner transfer rechecks the target membership inside the repository mutation to avoid leaving a team ownerless during a concurrent change.
- Owner transfer disables the legacy shared admin password, increments the legacy admin session version, and revokes pending invitations.
- Account deletion is guarded both before and during deletion against remaining owner memberships.
- Team self-registration is rate-limited per authenticated user/client.

Operationally, OAuth client/channel secrets must be configured as Wrangler secrets and never committed to the repository or distributed ZIP.


## Build 71: public-deployment hardening

- Cloudflare Access JWTs are cryptographically validated with Cloudflare JWKS (RS256), exact issuer, Access application audience, expiry, nbf/iat sanity and verified JWT email claim. Remote dev/staging environments fail closed for every route. Production SYSTEM admin no longer requires Cloudflare Access and is protected by `SYSTEM_ADMIN_SECRET` + application session.
- JWKS is cached for five minutes; a signing-key refresh is attempted on rotation and force-refresh is throttled to limit attacker-induced outbound fetches.
- Critical administrator lifecycle operations require a Google / LINE OAuth authentication completed within the previous 10 minutes. Reauthentication is cryptographically bound to the currently signed-in SIGN TRAINER user and cannot switch accounts.
- Claiming a legacy team now creates the owner and disables the shared legacy administrator password in the same D1 batch, incrementing admin_session_version to invalidate old legacy sessions.
- Player/team-admin authentication applies a global client limiter before team lookup and creates team-scoped limiter rows only for existing teams, preventing attacker-controlled random team IDs from growing D1 state.
- Authentication rate-limit garbage collection opportunistically removes rows older than seven days; migration `0007_rate_limit_cleanup_index.sql` indexes the cleanup column.
- Only `CF-Connecting-IP` is used as the network client signal for rate limiting; `X-Forwarded-For` is not trusted.
- Edge/WAF rate limiting should still be configured for public deployments as defense in depth.

Required remote Access configuration:

```text
# dev / staging
REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true
ENVIRONMENT_ACCESS_ALLOWED_EMAILS=user1@example.com,user2@example.com  # optional extra allowlist

# production
REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=false
REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN=false

# dev / staging environment-wide Access
CF_ACCESS_TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com
CF_ACCESS_POLICY_AUD=<Access Application AUD tag>
```

## Build 75: application-level data protection

- Added `PASSWORD_PEPPER` in Wrangler Secret. New password hashes use PBKDF2-SHA256 / 100,000 iterations / 16-byte random salt after HMAC-SHA256 pepper preprocessing. Legacy salt-only hashes at or below the Workers-supported iteration limit are rehashed after successful authentication; higher-iteration hashes must be reset.
- Added AES-256-GCM field encryption with random 96-bit IV and field-bound AAD. Ciphertexts are versioned with `enc:v1:`.
- Added keyed HMAC lookup for Google/LINE provider subjects (`hmac:v1:`) while preserving the original subject only as AES-GCM ciphertext.
- New audit details are redacted before storage; legacy audit details can be rewritten through the system-admin data-protection maintenance action.
- `PASSWORD_PEPPER`, `DATA_ENCRYPTION_KEY`, and `DATA_LOOKUP_KEY` are required per environment and are not stored in D1.
- Apply `0010_data_protection.sql` before deploying build 75, then run the `/admin` data-protection maintenance action until the remaining count is zero.

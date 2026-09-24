# Security hardening — build 58

## Addressed

- Exact pin: `wrangler@4.136.3`
- `.npmrc`: exact versions, lockfile required, lifecycle scripts disabled
- Deploy preflight blocks deployment without `package-lock.json`
- `.dev.vars*` excluded from source distribution
- Local QR generation; no runtime QR API/CDN
- PBKDF2-SHA256: 600,000 iterations for new hashes; transparent rehash on successful login
- D1 auth rate limiting using HMAC-obscured client keys
- Origin + Fetch Metadata CSRF protection
- 64KB JSON request limit
- Player/team-admin session generations and system-secret-derived generation
- Admin/system cookies: SameSite=Strict; production uses `__Host-` + Secure
- Tight CSP / frame-ancestors / X-Frame-Options / permissions policy
- Team/sign/video soft delete
- D1 audit log for admin mutations
- Cloudflare Access gate required for remote system-admin routes
- Dependabot + npm audit CI configuration

## Operational requirements

1. Generate and commit `package-lock.json` from a trusted network before deployment.
2. Use `npm ci --ignore-scripts`, not `npm install`, after the lockfile exists.
3. Configure Cloudflare Access for `/admin*` and `/api/system/*` on dev/staging/production.
4. Use unique SESSION_SECRET and SYSTEM_ADMIN_SECRET values for every environment.
5. Apply `0003_security_hardening.sql` to every environment before deploying build 58.

# Third-party notices

## qrcode

QR generation uses `qrcode` 1.5.4 from npm, with TypeScript declarations supplied by `@types/qrcode` 1.5.6 during development. Vite bundles the runtime library into the production browser assets.

- License: MIT
- Project: `qrcode` (soldair/node-qrcode)
- Types: `@types/qrcode` (DefinitelyTyped), MIT
- Purpose: generate QR codes locally in the browser so team URLs are not sent to a third-party QR generation service.
- Runtime CDN dependency: none; Vite bundles the package into the production client asset.

## Hono

Backend HTTP routing uses Hono 4.13.8.

- License: MIT
- Project: Hono (honojs/hono)
- Purpose: route grouping and middleware composition on Cloudflare Workers.
- Runtime dependencies of Hono: none.
- Version policy: pinned exactly in `package.json`.



## Vite

Browser TypeScript bundling uses Vite 8.3.1.

- License: MIT
- Purpose: TypeScript/browser bundling, code splitting and content-hashed production assets.

## Vitest

Unit testing uses Vitest 5.0.1 with `@vitest/coverage-v8` 5.0.1.

- License: MIT
- Purpose: TypeScript-aware unit test runner, watch mode and V8 coverage.

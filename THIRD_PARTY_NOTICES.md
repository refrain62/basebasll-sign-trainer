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


## LINE Brand Icon

The LP uses a locally bundled LINE-style brand icon for the LINE sharing affordance. Usage should follow the official LINE logo/app icon guideline: https://www.line.me/ja/logo . Do not recolor, distort, rotate, decorate, or crowd the icon.


## ICON BOX QR icon

The LP and install guide use the “QRコードの無料アイコン8” artwork from ICON BOX for QR-code affordances.

- Source artwork: https://iconbox.fun/wp/wp-content/uploads/1031_q_h.svg
- Catalog page: https://iconbox.fun/qr%E3%82%B3%E3%83%BC%E3%83%89%E3%81%AE%E7%84%A1%E6%96%99%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B38/
- Provider description: commercial-use-free icon material; see the provider license page for the current terms.
- Runtime note: the icon is bundled locally as `public/assets/qr-code-icon.svg`; no runtime request to ICON BOX is required.

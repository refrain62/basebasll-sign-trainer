# Third-party notices

## QRCode for JavaScript

`public/vendor/qrcode-local.js` contains a locally vendored/browser-bundled copy of the QR encoding implementation shipped under `qrcode-terminal`'s `vendor/QRCode` directory, originally by Kazuhiko Arase.

- License: MIT
- Original project: QRCode for JavaScript
- Purpose: generate QR codes locally in the browser so team URLs are not sent to a third-party QR generation service.
- Integrity: see `public/vendor/SHA256SUMS`.

The file is served from this application itself; there is no runtime CDN dependency for QR generation.

## Hono

Backend HTTP routing uses Hono 4.13.8.

- License: MIT
- Project: Hono (honojs/hono)
- Purpose: route grouping and middleware composition on Cloudflare Workers.
- Runtime dependencies of Hono: none.
- Version policy: pinned exactly in `package.json`.


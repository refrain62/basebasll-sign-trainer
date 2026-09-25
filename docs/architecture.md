# Backend architecture

SIGN TRAINER uses Hono on Cloudflare Workers and Cloudflare D1. The backend follows a lightweight SOLID-oriented module architecture without introducing an ORM or class-heavy framework.

## Dependency direction

```text
Hono routes
   ↓
Controllers (HTTP boundary)
   ↓
Services (business rules)
   ↓
Repository interfaces
   ↓
D1 repositories
```

Cross-cutting concerns live beside this flow:

- `middleware/`: Cloudflare Access and API mutation guards
- `security/`: password hashing, session tokens, authorization, rate limits
- `validation/`: Zod request schemas, JSON boundary parsing, normalization and YouTube URL validation
- `http/`: response headers, JSON parsing and page asset serving

## Rules enforced by CI

`scripts/architecture-check.ts` enforces these boundaries:

1. Service modules may not call D1 `prepare()` directly.
2. Service modules may not build HTTP `Response` objects.
3. Controllers may not contain SQL/D1 `prepare()` calls.
4. Routes may not access D1 or import the `backend.ts` compatibility facade.
5. D1 access must remain in `src/repositories/`.
6. `src/backend.ts` stays a small compatibility export facade rather than becoming a new monolith.

## Why D1 remains direct

Repositories use the Cloudflare D1 binding directly (`db.prepare().bind()`). An ORM is intentionally not added yet. This keeps SQL visible, preserves the current migration model, reduces runtime dependencies and avoids changing existing data behavior during the architecture refactor.

## Testing

Services accept repository objects, so business rules can be tested without D1. Unit tests inject fake repositories for group, sign and system-team operations. Repository mapping tests separately verify D1 row conversion.


## Account / OAuth boundary

`src/oauth/` owns provider-specific OAuth/OIDC mechanics. `account-controller.ts` owns redirect/cookie HTTP handling, while `account-service.ts` owns account/team-provisioning rules. OAuth provider tokens are not persisted. Team ownership and administrator lifecycle rules live in `admin-membership-service.ts`; D1 membership/invite transitions stay inside repositories.


## Plan / entitlement boundary

将来の課金基盤は商品機能から分離します。D1の `team_subscriptions` / `plan_entitlements` / `team_usage` へのアクセスは `subscription-repository.ts` に限定し、機能可否は `entitlement-service.ts` が返します。

```text
Product feature (future image upload)
   ↓
EntitlementService
   ↓
SubscriptionRepository
   ↓
D1 plan / subscription / usage tables

Stripe webhook (future)
   ↓
SubscriptionRepository.setProviderSubscription()
```

画像アップロード等のServiceがStripe Customer IDやSubscription IDを直接参照することは禁止します。これにより決済事業者変更やFree/有料ポリシー変更を商品コードから切り離します。

## build 75 — data protection boundary

Sensitive persistence is handled at the repository boundary. Services continue to receive plaintext domain values; repositories encrypt before D1 writes and decrypt after reads. `DataProtectionService` is a maintenance use case for migrating legacy plaintext rows, while `security/data-protection.ts` owns AES-GCM/HMAC primitives. Password peppering remains in `security/password.ts` and is injected into services by `service-factory.ts`.


## build 80 — TypeScript / Zod boundary

Worker側の実装は `src/**/*.ts` に統一しています。HonoのBindingsは `src/types.ts` に集約し、`src/index.ts` / routes / middlewareからCloudflare bindingsを型付きで参照します。既存JavaScriptからの段階移行のため現在の`tsconfig.json`は`strict: false`ですが、`noEmit` typecheckをCI/`npm run check`で必須にしています。

HTTP JSON bodyはControllerの入口でZod schemaに通します。Controllerより下のService/Repositoryは「schema validation済みの値」を受け取る前提にし、入力型の判定を各Serviceへ重複させません。一方、DB整合性・権限制御・ビジネス上限（例: サブ管理者5名）はZodだけに依存せず、Service/Repository/D1制約も維持します。


## build 81 — browser UI TypeScript boundary (historical)

Build 81 introduced `client/*.ts` as the browser UI source of truth. Build 83 supersedes its direct-`tsc` output model with Vite bundling; current production output is under `public/build/`.

## build 83 — Vite frontend boundary

Browser UI source lives under `client/` and is bundled by Vite. HTML source lives under `pages/`. Production browser bundles are content-hashed under `public/build/`; the Vite page-render plugin injects those hashed entry URLs into generated `public/*.html` and `public/__pages/*.txt`. Hono/Worker continues to own routing, auth, API handling and HTML delivery. Vite is a frontend build boundary, not the application server.

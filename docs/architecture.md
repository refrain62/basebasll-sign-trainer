# SIGN TRAINER Backend architecture — v1.5.34

Cloudflare Workers + Hono + D1。ORMを使わずRepository / Service境界を持つ。

```text
Hono routes
  -> Controllers (HTTP / validation)
  -> Services (business rules)
  -> Repositories (D1 access)
```

## 主要サービス境界
- `EntitlementService`: Free / Plus / Proの機能可否。商品コードはここ以外でプラン名に直接分岐しない。
- System team service: チーム作成・更新・状態・プラン変更。
- Team admin controllers/services: グループ・サイン・動画・管理者管理。
- Audit repository: 誰が・何を・いつ変更したかを保存。

## Plan / Entitlement
内部コードは `free`, `team_plus`, `team_pro` を維持する。UI表示は `Free`, `Plus`, `Pro`。

- Plus: `multiple_sign_groups`, `multiple_sign_videos`, `custom_video_thumbnail`, `sub_admin_management`, `result_text_share`
- Pro: Plusに加え `practice_analytics`, `activity_log`, `result_image_share`

現在Plus / Proは手動付与で、決済プロバイダとは接続しない。

## 選手データ
サインマスタはD1。回答・履歴・正答率の元データは端末`localStorage`のみ。Pro分析もこの端末内履歴を集計し、分析結果をサーバーへ送らない。

## Soft delete
チーム・サイン・動画等は運用上soft deleteを優先する。チームはactive / suspended / deletedを区別し、deletedからSYSTEM管理で復活可能。

## UI source
- `pages/*.html`: HTML正本
- `client/*.ts`: ブラウザUI正本
- `public/styles.css`: 共通CSS
- `public/build`, `public/__pages`: Vite生成物。手編集しない

## Security
PBKDF2 + pepper、署名Cookie、CSRF防御、rate limit、Cloudflare Access、監査ログを維持する。


## Premium module boundary

分析・共有の有償ロジックは`src/premium-modules/module-sources.ts`に分離し、通常のVite client bundleへimportしない。

`GET /api/premium-module`は次を全て満たす場合だけJavaScript moduleを返す。
1. teamIdが有効でチームがactive
2. 有効な選手セッションがあり、teamId / session versionが一致
3. `EntitlementService.assertFeature`で必要featureが有効

レスポンスは`private, no-store`とし、権限不足は403。クライアントはdynamic importするが、最終認可はWorker側。

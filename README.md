# SIGN TRAINER

野球チーム固有のサインを、動画を使ったクイズ形式で反復練習するCloudflare Workersアプリです。

このREADMEは**入口だけ**を扱います。仕様・運用・セキュリティ・テストの詳細をここへ追記しないでください。目的別の文書は [`docs/INDEX.md`](docs/INDEX.md) から必要なものだけ読んでください。

## 主要URL / ユーザー

- 選手: `/t/{teamId}`。チームの合言葉で利用。
- チーム管理者: `/account` と `/t/{teamId}/admin`。Google / LINE OAuthを利用。
- SYSTEM管理者: `/admin`。`SYSTEM_ADMIN_SECRET` + SYSTEM管理セッションで認証。
- Dev / Staging: Worker全体をCloudflare Accessで保護。Productionの一般利用画面とSYSTEM管理はCloudflare Access必須ではありません。

## 技術構成

- Cloudflare Workers + Hono + D1
- TypeScript + Vite + Vitest
- Repository / Service / Controller / Routeの境界を維持
- 選手の練習履歴・成績元データはブラウザの`localStorage`

## 開発開始

```bash
# Node.js 24.x / npm 11.x を使用
npm run runtime:check
npm ci --ignore-scripts
npm run db:migrate:local
npm run dev
```

WindowsでWranglerのローカルD1が`spawn UNKNOWN` / `UV_HANDLE_CLOSING`になる場合も、Node 24のままWrangler側を確認してください。環境固有の手順は [`docs/operations/local-development.md`](docs/operations/local-development.md) にあります。

## 必須チェック

```bash
npm run check
```

`npm run check`には型チェック、Vite build、ルート/アーキテクチャ、ドキュメント構成、リリースルール、Unit testが含まれます。

## D1 migration

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

migrationは番号順に追加し、既存migrationを後から書き換えないでください。最新の既存migrationは`0025_notice_history_backfill.sql`です。

## デプロイ

GitHub ActionsはCI専用です。通常のWorker deployはCloudflare Workers Buildsで行います。

```text
dev branch     → dev
staging branch → staging
main branch    → production
```

D1 migrationがある場合だけ、対象branchへ反映する前に手元のWrangler OAuthでmigrationを適用し、deployment baselineを更新します。設定と手順は [`docs/operations/cloudflare-workers-builds.md`](docs/operations/cloudflare-workers-builds.md) と [`docs/operations/deploy.md`](docs/operations/deploy.md) を参照してください。

## 利用者向け変更の必須ルール

利用者に見える変更を行う場合は、変更影響を`changes/*.json`へ宣言します。**大きな利用者向けアップデートは、同じ変更内に公開済みSYSTEMお知らせを追加するD1 migrationが必須**です。

```bash
npm run release:policy
npm run release:notice -- --slug feature-name --title "新機能のお知らせ" --body "変更内容を日本語で説明します"
```

CIではPR差分を見て、利用者向けコードが変わったのに変更宣言がない場合や、`major`なのにSYSTEMお知らせmigrationがない場合に失敗します。判断基準とJSON形式は [`docs/engineering/change-policy.md`](docs/engineering/change-policy.md) を参照してください。

## ドキュメントの読み方

AI・開発者ともに、最初に [`docs/INDEX.md`](docs/INDEX.md) を見て**今の作業に必要な文書だけ**を開いてください。過去のbuild履歴は通常の実装では読みません。

- 現行仕様: [`docs/product/spec.md`](docs/product/spec.md)
- プラン/有料化方針: [`docs/product/plans.md`](docs/product/plans.md)
- アーキテクチャ: [`docs/engineering/architecture.md`](docs/engineering/architecture.md)
- テスト: [`docs/engineering/testing.md`](docs/engineering/testing.md)
- 変更・お知らせルール: [`docs/engineering/change-policy.md`](docs/engineering/change-policy.md)
- SYSTEMお知らせ内容・過去分一覧: [`docs/product/system-notices.md`](docs/product/system-notices.md)
- 環境構成: [`docs/operations/environment-overview.md`](docs/operations/environment-overview.md)
- Secret / OAuth: [`docs/operations/secrets-oauth.md`](docs/operations/secrets-oauth.md)
- Cloudflare Access: [`docs/operations/cloudflare-access.md`](docs/operations/cloudflare-access.md)
- ローカル開発: [`docs/operations/local-development.md`](docs/operations/local-development.md)
- デプロイ: [`docs/operations/deploy.md`](docs/operations/deploy.md)
- Cloudflare Workers Builds: [`docs/operations/cloudflare-workers-builds.md`](docs/operations/cloudflare-workers-builds.md)
- migration / rollback: [`docs/operations/migrations-rollback.md`](docs/operations/migrations-rollback.md)
- リリース安全確認: [`docs/operations/release-safety.md`](docs/operations/release-safety.md)
- 運用チェック: [`docs/operations/checklist.md`](docs/operations/checklist.md)
- セキュリティ: [`docs/security/hardening.md`](docs/security/hardening.md)
- データ保護: [`docs/security/data-protection.md`](docs/security/data-protection.md)
- UI/デザイン: [`docs/design/ui.md`](docs/design/ui.md)

## 正本

- `pages/*.html`: HTML正本
- `client/*.ts`: ブラウザUI正本
- `src/**`: Worker正本
- `public/styles.css`: 共通CSS正本
- `migrations/*.sql`: D1 schema/data migration正本
- `public/build` / `public/__pages` / 生成HTML: build生成物。直接編集しない

## 過去のbuildメモ

旧READMEに蓄積していた履歴は [`docs/history/legacy-readme-build-notes.md`](docs/history/legacy-readme-build-notes.md) に退避しています。障害調査や過去仕様の確認時だけ参照してください。

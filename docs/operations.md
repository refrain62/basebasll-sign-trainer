# SIGN TRAINER 運用チェックリスト — v1.5.32


## Wrangler / ローカルD1

- Wrangler は **`4.141.0`** に完全固定します。
- Windows + Node.js 24 で `wrangler 4.136.3` 使用時に `spawn UNKNOWN` / `UV_HANDLE_CLOSING` が発生したため、4.141.0 へ更新しています。
- `version_metadata` は named environment に継承されないため、productionだけでなく `env.dev` / `env.staging` にも `CF_VERSION_METADATA` binding を設定しています。
- ローカルmigrationは `npm run db:migrate:local` を使用してください。

最終更新: 2026-09-26

## 公開前

1. `PUBLIC_OPERATOR_NAME` と `PUBLIC_SUPPORT_URL` を本番値へ設定する。
2. Google / LINE OAuthの本番callback・規約URL・プライバシーURLを確認する。
3. Cloudflare Accessで `/admin*` と `/api/system/*` を保護する。
4. Secret（SESSION_SECRET / SYSTEM_ADMIN_SECRET / PASSWORD_PEPPER / DATA_ENCRYPTION_KEY / DATA_LOOKUP_KEY）を環境ごとに別値で設定する。
5. **`0016_plan_tiers.sql`まで全migrationを適用する。**
6. `package-lock.json`をGit管理し、`npm ci --ignore-scripts`で再現可能にする。
7. `npm run check`, `npm run security:preflight`, `npm run ops:preflight`を通す。

## プラン運用

- Freeは新規チームのデフォルト。
- Plus / Proは現在、特定チーム限定。一般申し込み・オンライン課金はない。
- プラン変更はSYSTEM管理のチーム編集から実施する。
- Plus = チーム運用強化。Pro = Plus + 分析・監査。
- プラン変更は監査ログへ記録する。
- ダウングレードしても上位プランで作成したデータを物理削除しない。

## チーム状態

- 利用中 (`active`)
- 利用停止 (`suspended`)
- 退会済み (`deleted`)

チーム退会は論理削除。SYSTEM管理から復活可能。通常運用で物理削除は行わない。

## SYSTEMお知らせ

公開状態と掲載開始・終了を確認する。チーム側の表示順は固定案内 → 重要 → メンテナンス → その他。

## デプロイ

```bash
npm ci --ignore-scripts
npm run check
npm run security:preflight
npm run ops:preflight
npm run db:migrate:staging
npm run deploy:staging
# 確認後
npm run db:migrate:prod
npm run deploy:prod
```

DB migrationはコードdeployより先に適用が必要な版があるため、stagingで必ず同じ順序を検証する。

# Cloudflare 環境運用手順書

SIGN TRAINER を **local / dev / staging / production** の4環境で安全に運用するための手順です。

この手順書では「環境ごとに別のWorker・D1・Secretを持ち、同じGit commitを dev → staging → production の順で昇格させる」運用を前提にします。

---

## 1. 環境構成

| 環境 | Worker | D1 | 主な用途 |
|---|---|---|---|
| local | `wrangler dev --env dev` | WranglerローカルD1 | 実装・手元確認 |
| dev | `basebasll-sign-trainer-dev` | `sign-trainer-dev` | Cloudflare上での開発確認 |
| staging | `basebasll-sign-trainer-staging` | `sign-trainer-staging` | 本番前の最終確認 |
| production | `basebasll-sign-trainer` | `sign-trainer-production` | 本番 |

D1 ID は `wrangler.jsonc` に環境別で定義済みです。アプリコード側は全環境で `env.DB` だけを参照するため、コード中で環境名によるDB切り替えは行いません。

### 現在のD1 ID

```text
dev        3b47491c-8e2a-412a-b2a7-1a06922b3604
staging    2ca39d6b-e06f-44b4-862b-b0c2932d9310
production bdd534e9-1c42-4db7-adbe-c62e35e123b5
```

---

## 2. 基本ルール

1. **productionで直接修正しない**
2. 同じGit commitを `dev → staging → production` の順で昇格させる
3. D1 / Secret / OAuth callback / Cloudflare Access は環境ごとに分ける
4. migrationがあるリリースは、各環境で **migration → deploy → 動作確認** の順に進める
5. productionへ進める前に `npm run check` を成功させる
6. `SESSION_SECRET`、暗号鍵、pepperは環境間で使い回さない
7. `wrangler.jsonc` やGitへSecret値を書かない

---

## 3. 初回セットアップ

### 3-1. Node / npm

このプロジェクトは以下を前提にしています。

```text
Node.js >=22.12 <25
npm >=10 <12
```

依存関係はlockfileを使って復元します。

```bash
npm ci --ignore-scripts
```

### 3-2. Cloudflareへログイン

```bash
npx wrangler login
npx wrangler whoami
```

`whoami` で対象のCloudflareアカウントが表示されることを確認してください。

---

## 4. Secret設定

環境ごとに**別の値**を登録します。

必須:

```text
SESSION_SECRET
SYSTEM_ADMIN_SECRET
PASSWORD_PEPPER
DATA_ENCRYPTION_KEY
DATA_LOOKUP_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
```

候補値は以下で生成できます。

```bash
npm run security:generate-secrets
```

### dev

```bash
npx wrangler secret put SESSION_SECRET --env dev
npx wrangler secret put SYSTEM_ADMIN_SECRET --env dev
npx wrangler secret put PASSWORD_PEPPER --env dev
npx wrangler secret put DATA_ENCRYPTION_KEY --env dev
npx wrangler secret put DATA_LOOKUP_KEY --env dev
```

### staging

```bash
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put SYSTEM_ADMIN_SECRET --env staging
npx wrangler secret put PASSWORD_PEPPER --env staging
npx wrangler secret put DATA_ENCRYPTION_KEY --env staging
npx wrangler secret put DATA_LOOKUP_KEY --env staging
```

### production

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SYSTEM_ADMIN_SECRET
npx wrangler secret put PASSWORD_PEPPER
npx wrangler secret put DATA_ENCRYPTION_KEY
npx wrangler secret put DATA_LOOKUP_KEY
```

### Secretの要件

- `SESSION_SECRET`: 32文字以上
- `SYSTEM_ADMIN_SECRET`: 12文字以上、英字と数字を各1文字以上
- `PASSWORD_PEPPER`: 32文字以上の十分ランダムな値
- `DATA_ENCRYPTION_KEY`: 32文字以上の十分ランダムな値
- `DATA_LOOKUP_KEY`: 32文字以上の十分ランダムな値
- `GOOGLE_CLIENT_ID`: Google OAuth WebクライアントID（必須）
- `GOOGLE_CLIENT_SECRET`: Google OAuth WebクライアントSecret（必須）
- `LINE_CHANNEL_ID`: LINE LoginチャネルID（必須）
- `LINE_CHANNEL_SECRET`: LINE LoginチャネルSecret（必須）

---

## 5. Google / LINE OAuth

管理者ログインを使うため、各環境のcallback URLをOAuthプロバイダへ登録します。

### Google callback

```text
dev
https://basebasll-sign-trainer-dev.refrain62.workers.dev/api/account/oauth/google/callback

staging
https://basebasll-sign-trainer-staging.refrain62.workers.dev/api/account/oauth/google/callback

production
https://basebasll-sign-trainer.refrain62.workers.dev/api/account/oauth/google/callback
```

Google Secret:

```bash
# dev
npx wrangler secret put GOOGLE_CLIENT_ID --env dev
npx wrangler secret put GOOGLE_CLIENT_SECRET --env dev

# staging
npx wrangler secret put GOOGLE_CLIENT_ID --env staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --env staging

# production
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### LINE callback

Googleと同じホスト構成で、パスを以下にします。

```text
/api/account/oauth/line/callback
```

LINE Secret:

```bash
# dev
npx wrangler secret put LINE_CHANNEL_ID --env dev
npx wrangler secret put LINE_CHANNEL_SECRET --env dev

# staging
npx wrangler secret put LINE_CHANNEL_ID --env staging
npx wrangler secret put LINE_CHANNEL_SECRET --env staging

# production
npx wrangler secret put LINE_CHANNEL_ID
npx wrangler secret put LINE_CHANNEL_SECRET
```

本番と非本番でOAuthアプリを分けられる場合は、production用とdev/staging用を分離すると誤設定を減らせます。

---

## 6. Cloudflare Access

remoteの dev / staging / production では、SYSTEM管理画面をCloudflare Accessで保護します。

保護対象:

```text
/admin*
/api/system/*
```

各環境のSelf-hosted Applicationを作成し、許可するユーザーを限定してください。

`wrangler.jsonc` ではremote環境で以下が有効です。

```text
REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN=true
```

各環境で次を設定します。

```text
CF_ACCESS_TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com
CF_ACCESS_POLICY_AUD=<各Access ApplicationのAUD tag>
```

必要に応じて、SYSTEM管理画面へ入れるメールを以下で追加制限できます。

```text
SYSTEM_ADMIN_ALLOWED_EMAILS=user1@example.com,user2@example.com
```

Access設定が未完成の状態では、remoteのSYSTEM管理画面が403になる設計です。

---

## 7. ローカル開発

初回のみ `.dev.vars.example` をコピーします。

PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars.dev
```

ローカルDB migration:

```bash
npm run db:migrate:local
```

起動:

```bash
npm run dev
```

確認URL:

```text
LP              http://localhost:8787/
サンプルチーム  http://localhost:8787/t/6BnWv2K3zo
アカウント      http://localhost:8787/account
SYSTEM管理      http://localhost:8787/admin
チーム管理      http://localhost:8787/t/6BnWv2K3zo/admin
```

---

## 8. 日常のリリース手順

### STEP 1: local

```bash
npm ci --ignore-scripts
npm run db:migrate:local
npm run check
npm run security:check
npm run dev
```

最低限、以下を確認します。

- LPが開く
- チームページが開く
- 合言葉認証が通る
- チーム専用PWAのmanifestが取得できる
- チーム管理者ログイン導線が開く
- SYSTEM管理画面のローカル確認ができる
- サイン登録・編集・練習ができる

### STEP 2: dev

migration状況確認:

```bash
npm run db:list:dev
```

migration適用:

```bash
npm run db:migrate:dev
```

deploy:

```bash
npm run deploy:dev
```

確認後、devで問題がなければstagingへ進みます。

### STEP 3: staging

```bash
npm run db:list:staging
npm run db:migrate:staging
npm run deploy:staging
```

stagingでは本番相当の確認をします。

- Googleログイン
- LINEログイン
- Cloudflare Access
- SYSTEM管理
- チーム新規登録
- チーム管理
- 選手の合言葉認証
- チーム専用PWAインストール
- PWAから該当チームが直接起動する
- 複数チームを追加した場合にチーム名で識別できる
- スマートフォン表示
- Free / Plus / Pro制御

### STEP 4: production

production直前にもう一度チェックします。

```bash
npm run check
npm run security:check
```

migration確認:

```bash
npm run db:list:prod
```

migrationがある場合:

```bash
npm run db:migrate:prod
```

本番deploy:

```bash
npm run deploy:prod
```

---

## 9. productionデプロイ後のスモークテスト

本番deploy後は、最低限以下だけは毎回確認します。

1. `/` が200で表示される
2. `/account` が表示される
3. Google / LINE管理者ログインが開始できる
4. サンプルまたは確認用チームページ `/t/{teamId}` が表示される
5. 合言葉認証が動作する
6. `/t/{teamId}/admin` が表示される
7. `/admin` がCloudflare Accessで保護されている
8. チーム専用manifestが正しいチーム名・`start_url`を返す
9. 練習開始 → 回答 → 履歴保存まで動く
10. APIで500系エラーが増えていない

---

## 10. migration運用

migrationは必ず番号を追加して管理し、既に適用済みのSQLを書き換えないでください。

通常の流れ:

```text
local migration
  ↓
dev migration → dev deploy → 確認
  ↓
staging migration → staging deploy → 確認
  ↓
production migration → production deploy → 確認
```

破壊的変更（DROP / 大量UPDATE / データ変換）がある場合は、productionへ適用する前にD1のバックアップ・復旧方法を確認し、stagingで同等データ量の動作確認を行ってください。

---

## 11. ロールバック方針

### Workerコードだけ問題がある場合

CloudflareのDeployment Historyから直前の正常なWorker versionへ戻します。

その後、原因修正を **dev → staging → production** の順で再度進めます。

### migrationも含む問題の場合

DB変更はWorkerのロールバックだけでは元に戻りません。

そのため、migrationは原則として後方互換を保ちます。

推奨:

```text
1. 新しいカラム/テーブルを追加
2. 新旧どちらでも動くコードをdeploy
3. データ移行
4. 十分確認後に古い構造を整理
```

緊急時に「コードだけ戻したらDB構造が合わない」状態を避けるためです。

---

## 12. 環境を間違えないための確認

実行前にコマンド末尾を確認します。

```text
--env dev      → dev
--env staging  → staging
--envなし      → production
```

特に以下は `--env` を付け忘れるとproduction対象になるので注意してください。

```bash
npx wrangler secret put ...
wrangler deploy
wrangler d1 migrations apply DB --remote
```

通常は直接Wranglerコマンドを打つより、package.jsonに用意した以下を使ってください。

```bash
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

---

## 13. 推奨Git運用

```text
feature/*
   ↓
local
   ↓
dev
   ↓
staging
   ↓
main / production
```

重要なのはブランチ名そのものではなく、**同じcommitを昇格させること**です。

productionへ出したcommit SHAはリリース記録として残してください。

例:

```text
release: 2026-09-27
commit: abc1234
migration: 0020まで
staging確認: OK
production deploy: OK
```

---

## 14. リリース前チェックリスト

### 共通

- [ ] `npm ci --ignore-scripts` 済み
- [ ] `npm run check` 成功
- [ ] `npm run security:check` 確認
- [ ] migrationの有無を確認
- [ ] Secretをコード/Gitへ書いていない

### dev

- [ ] dev D1へmigration
- [ ] dev deploy
- [ ] OAuth確認
- [ ] PWA確認

### staging

- [ ] staging D1へmigration
- [ ] staging deploy
- [ ] Google / LINEログイン確認
- [ ] Cloudflare Access確認
- [ ] チーム管理確認
- [ ] スマホ/PWA確認

### production

- [ ] stagingと同じcommitである
- [ ] production D1 migration内容確認
- [ ] production deploy
- [ ] deploy後スモークテスト
- [ ] 問題時に戻す直前versionを把握

---

## 15. 将来GitHub Actions化する場合

手動運用が安定してからCI/CD化します。

推奨イメージ:

```text
Pull Request
  → npm ci
  → npm run check

開発用ブランチ
  → dev deploy

staging実行
  → staging deploy

main + 手動承認
  → production deploy
```

GitHub側のSecretsにはCloudflare API Token等を置き、アプリ用SecretはCloudflare Worker Secretとして保持します。

最初からproductionまで完全自動化せず、productionだけ手動承認を残す構成が安全です。

---

## 16. よく使うコマンド一覧

```bash
# ローカル
npm run db:migrate:local
npm run dev

# チェック
npm run check
npm run security:check

# dev
npm run db:list:dev
npm run db:migrate:dev
npm run deploy:dev

# staging
npm run db:list:staging
npm run db:migrate:staging
npm run deploy:staging

# production
npm run db:list:prod
npm run db:migrate:prod
npm run deploy:prod
```

---

## 17. 運用で迷ったときの判断基準

```text
手元で試す             → local
Cloudflare上で試す     → dev
本番直前の確認         → staging
実ユーザーが使う       → production
```

**productionで初めて試す変更を作らない**ことを最優先にしてください。

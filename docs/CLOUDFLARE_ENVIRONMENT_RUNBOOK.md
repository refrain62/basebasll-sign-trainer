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

### 5-1. OAuth設定確認

デプロイ後、Access認証済みのブラウザで `/api/account/providers` を開き、Google / LINEが両方有効になっていることを確認します。

```json
{"providers":{"google":true,"line":true},"environment":"staging"}
```

`environment` はdevでは `dev`、stagingでは `staging`、productionでは `production` になります。

### 5-2. 共通の公開設定

`wrangler.jsonc` では以下の公開設定も環境ごとに管理します。

```text
ACCOUNT_TEAM_CREATE_LIMIT=3
PUBLIC_SUPPORT_URL=https://<問い合わせフォームURL>
```

`ACCOUNT_TEAM_CREATE_LIMIT=3` は、1つのOAuth管理者アカウントから**新規作成できるチームを最大3チーム**に制限します。招待されてサブ管理者として参加したチームはこの上限に含みません。

チーム管理画面の「お問い合わせ」は `PUBLIC_SUPPORT_URL` へ遷移し、問い合わせ先URLに次の情報をクエリパラメータとして付与します。

```text
teamId
teamName
plan
environment
```

Googleフォームで実際のフォーム項目へ事前入力したい場合は、Googleフォーム側の `entry.<id>` に合わせたURLへ調整してください。現在の実装は上記の汎用パラメータを付与します。

### 5-3. 非本番環境バッジ

LOCAL / DEV / STAGINGでは、誤操作防止のためページ右下に環境バッジを表示します。Productionでは表示しません。

```text
LOCAL 環境
DEV 環境
STAGING 環境
```

バッジはクリックするとそのページでは閉じられますが、ページ遷移後は再表示されます。これは誤環境での操作を防ぐための仕様です。

---

## 6. Cloudflare Access

### 6-1. 公開方針

環境ごとの公開範囲は次のとおりです。

| 環境 | 公開範囲 | Worker側の設定 |
|---|---|---|
| local | ローカルのみ | Access検証をスキップ |
| dev | **一般公開しない。許可ユーザーのみ** | `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true` |
| staging | **一般公開しない。許可ユーザーのみ** | `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true` |
| production | 一般公開 | `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=false` |

Dev / Staging はLP、チーム画面、管理画面、API、静的アセットを含む**Worker全体**をCloudflare Accessで保護します。Worker側でも `Cf-Access-Jwt-Assertion` を検証するため、Cloudflare Accessの設定漏れや不正なJWTがある場合はfail closedで403になります。

Productionは一般公開のままですが、SYSTEM管理画面だけは従来どおりCloudflare Accessを必須にします。

```text
REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN=true
```

### 6-2. Dev / Staging のAccess Application

Cloudflare Zero Trustで、Dev用とStaging用にそれぞれWorker全体を対象にしたAccess Applicationを作成します。許可Policyには、自分・開発メンバー・テスターなど**接続を許可するメールアドレスだけ**を指定してください。

例:

```text
SIGN TRAINER DEV
  Host: basebasll-sign-trainer-dev.refrain62.workers.dev
  Path: /*

SIGN TRAINER STAGING
  Host: basebasll-sign-trainer-staging.refrain62.workers.dev
  Path: /*
```

Dev / StagingではSYSTEM管理用に別のAccess Applicationを重ねず、環境全体のAccess Applicationをそのまま使用します。SYSTEM管理はさらに `SYSTEM_ADMIN_SECRET` で二重認証されます。

### 6-3. Workerへ指定する値

`CF_ACCESS_TEAM_DOMAIN` はZero Trust組織のTeam Domainです。通常はDev / Staging / Productionで共通です。

```text
CF_ACCESS_TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com
```

`CF_ACCESS_POLICY_AUD` は**その環境でWorkerを保護しているAccess Applicationの Application Audience (AUD) tag**を指定します。

```text
# dev
CF_ACCESS_POLICY_AUD=<DEV Worker全体を保護するAccess ApplicationのAUD>

# staging
CF_ACCESS_POLICY_AUD=<STAGING Worker全体を保護するAccess ApplicationのAUD>

# production
CF_ACCESS_POLICY_AUD=<SYSTEM管理を保護するProduction Access ApplicationのAUD>
```

Account ID / Application ID / Policy IDではなく、必ず **Application Audience (AUD) tag** を指定します。

### 6-4. 許可メールの二重制限

Cloudflare Access Policy側の許可ユーザーに加えて、Worker側でもDev / Stagingの利用者を限定したい場合は、`ENVIRONMENT_ACCESS_ALLOWED_EMAILS` にカンマ区切りで設定します。

```text
ENVIRONMENT_ACCESS_ALLOWED_EMAILS=user1@example.com,user2@example.com
```

空欄の場合はCloudflare Access Policy側の許可設定を信頼します。安全上、Dev / StagingではAccess Policy側で必ず対象ユーザーを限定してください。

SYSTEM管理をさらに特定の管理者だけに絞る場合は、別途以下を設定できます。

```text
SYSTEM_ADMIN_ALLOWED_EMAILS=admin1@example.com,admin2@example.com
```

### 6-5. fail closedの確認

Dev / Stagingのremote環境では、以下のいずれかに該当するとWorker全体が403になります。

- `Cf-Access-Jwt-Assertion` がない
- `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_POLICY_AUD` が未設定または不正
- JWTの署名・issuer・audience・有効期限が不正
- `ENVIRONMENT_ACCESS_ALLOWED_EMAILS` を設定していて、JWTのemailが一覧にない

ローカルホスト (`localhost` / `127.0.0.1`) は開発できるよう環境全体のAccess検証をスキップします。

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
- チーム専用アプリのmanifestが取得できる
- チーム管理者ログイン導線が開く
- SYSTEM管理画面のローカル確認ができる
- サイン登録・編集・練習ができる

### STEP 2: dev

まずSecretが揃っていることを確認します。

```bash
npx wrangler secret list --env dev
```

Google / LINEを含む9個の必須Secretがあることを確認します。

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

デプロイ後は、未許可のブラウザからWorkerへアクセスしてCloudflare Accessで止まることを確認します。許可ユーザーでAccess認証後、以下も確認します。

```text
https://basebasll-sign-trainer-dev.refrain62.workers.dev/api/account/providers
```

期待値:

```json
{"providers":{"google":true,"line":true},"environment":"dev"}
```

確認後、devで問題がなければstagingへ進みます。

### STEP 3: staging

Secret一覧を確認してからmigration / deployします。

```bash
npx wrangler secret list --env staging
npm run db:list:staging
npm run db:migrate:staging
npm run deploy:staging
```

デプロイ後、未許可のブラウザではWorker全体がCloudflare Accessで止まることを確認します。許可ユーザーで認証後、以下が有効になっていることも確認します。

```text
https://basebasll-sign-trainer-staging.refrain62.workers.dev/api/account/providers
```

期待値:

```json
{"providers":{"google":true,"line":true},"environment":"staging"}
```

stagingでは本番相当の確認をします。

- Googleログイン
- LINEログイン
- Cloudflare Access
- SYSTEM管理
- チーム新規登録
- チーム管理
- 選手の合言葉認証
- チーム専用アプリをホームに追加
- ホーム画面から該当チームが直接起動する
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

- [ ] Dev Worker全体のCloudflare Access Application / Allow Policyを設定
- [ ] `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true` を確認
- [ ] `CF_ACCESS_TEAM_DOMAIN` / Dev用 `CF_ACCESS_POLICY_AUD` を設定
- [ ] dev D1へmigration
- [ ] dev deploy
- [ ] 未許可ユーザーがWorker全体へアクセスできないことを確認
- [ ] OAuth確認
- [ ] ホーム画面追加確認

### staging

- [ ] Staging Worker全体のCloudflare Access Application / Allow Policyを設定
- [ ] `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true` を確認
- [ ] `CF_ACCESS_TEAM_DOMAIN` / Staging用 `CF_ACCESS_POLICY_AUD` を設定
- [ ] staging D1へmigration
- [ ] staging deploy
- [ ] 未許可ユーザーがWorker全体へアクセスできないことを確認
- [ ] Google / LINEログイン確認
- [ ] チーム管理確認
- [ ] スマホ/ホーム画面追加確認

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

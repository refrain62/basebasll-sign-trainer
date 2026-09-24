# SIGN TRAINER — build 63

野球チーム固有のサインを動画で反復練習する Web / PWA です。D1 は local / dev / staging / production で分離し、チーム情報・サイン・YouTube URLのみを保存します。選手の回答・正答率・練習履歴は端末の `localStorage` のみに保存します。

本番URL: `https://basebasll-sign-trainer.refrain62.workers.dev/`

## build 60 のセキュリティ強化

- Wrangler を **`4.136.3` に完全固定**（`^` 不使用）
- `.npmrc` で `save-exact=true` / `ignore-scripts=true`
- deploy 前の `security-preflight` を追加
- GitHub Dependabot / `npm audit` ワークフローを追加
- 配布ZIPから `.dev.vars*` を除外
- QRコードを外部APIへ送らず、**ブラウザ内でローカル生成**
- PBKDF2-SHA256 を新規ハッシュ **600,000 iterations** に強化
- 旧120,000回ハッシュはログイン成功時に自動再ハッシュ
- 認証APIにD1ベースのレート制限を追加
- POST/PUT/PATCH/DELETE に Origin / Fetch Metadata ベースのCSRF防御を追加
- API JSON を64KBまでに制限
- チーム合言葉・管理者パスワード変更時に既存セッションを失効
- `SYSTEM_ADMIN_SECRET` 変更時も既存システム管理セッションを失効
- 管理Cookieは `SameSite=Strict`、本番では `__Host-` + `Secure`
- CSPを縮小し、外部QR画像・外部スクリプト依存を廃止
- チーム/サイン/動画削除をsoft delete化
- 管理操作の `audit_log` をD1へ記録
- production / dev / staging の `/admin` と `/api/system/*` は Cloudflare Access 必須

## 重要: package-lock.json

この配布環境では npm registry へ接続できないため、`package-lock.json` 自体は生成していません。**deploy script は lockfile がない状態では失敗するようにしています。**

最初に信頼できるネットワーク上で一度だけ実行してください。

```bash
npm install --package-lock-only --ignore-scripts
npm ci --ignore-scripts
npm run security:preflight
```

生成された `package-lock.json` は必ずGit管理してください。以後は `npm install` ではなく **`npm ci --ignore-scripts`** を使います。

## 環境構成

| 環境 | Worker | D1 |
|---|---|---|
| local | `wrangler dev --env dev` | WranglerローカルD1 |
| dev | `basebasll-sign-trainer-dev` | `sign-trainer-dev` |
| staging | `basebasll-sign-trainer-staging` | `sign-trainer-staging` |
| production | `basebasll-sign-trainer` | `sign-trainer-production` |

アプリコードは全環境で `env.DB` のみ参照します。

## D1 ID

```text
dev        3b47491c-8e2a-412a-b2a7-1a06922b3604
staging    2ca39d6b-e06f-44b4-862b-b0c2932d9310
production bdd534e9-1c42-4db7-adbe-c62e35e123b5
```

## ローカル開発

`.dev.vars.example` をコピーして `.dev.vars` を作り、**32文字以上**の `SESSION_SECRET` と **12文字以上で英字・数字を含む** `SYSTEM_ADMIN_SECRET` を設定します。

```powershell
Copy-Item .dev.vars.example .dev.vars
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

例:

```env
SESSION_SECRET=<32bytes以上のランダム値>
SYSTEM_ADMIN_SECRET=<12文字以上・英字と数字を含む管理キー>
```

migration:

```bash
npm run db:migrate:local
```

起動:

```bash
npm run dev
```

```text
LP              http://localhost:8787/
サンプルチーム  http://localhost:8787/t/6BnWv2K3zo
システム管理    http://localhost:8787/admin
チーム管理      http://localhost:8787/t/6BnWv2K3zo/admin
```

ローカルホストでは Cloudflare Access チェックを自動的にスキップします。

## migration

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

- `0001_initial.sql` — 基本テーブル
- `0002_seed_sample.sql` — サンプルチーム + 10サイン
- `0003_security_hardening.sql` — セッション世代、rate limit、audit log、soft delete

サンプルチーム:

```text
Team ID: 6BnWv2K3zo
選手用合言葉: ホームラン
```

## Secret設定

環境ごとに別の値を使用してください。

```bash
# dev
npx wrangler secret put SESSION_SECRET --env dev
npx wrangler secret put SYSTEM_ADMIN_SECRET --env dev

# staging
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put SYSTEM_ADMIN_SECRET --env staging

# production
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SYSTEM_ADMIN_SECRET
```

`SESSION_SECRET` は32文字以上、`SYSTEM_ADMIN_SECRET` は12文字以上かつ英字・数字をそれぞれ1文字以上含む値を必須としています。

## Cloudflare Access（必須）

remote の dev / staging / production では `/admin*` と `/api/system/*` を Cloudflare Access で保護してください。`wrangler.jsonc` の `REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN` は3環境とも `true` です。

Cloudflare Zero Trust で各Workerに Self-hosted Application を作り、最低でも以下を保護します。

```text
/admin*
/api/system/*
```

Access policyで許可するメール/IdPユーザーを限定してください。Worker側でも `Cf-Access-Authenticated-User-Email` と `Cf-Access-Jwt-Assertion` の存在を確認し、その上で `SYSTEM_ADMIN_SECRET` を要求する二重防御です。

必要なら `SYSTEM_ADMIN_ALLOWED_EMAILS` にカンマ区切りで許可メールを設定できます。空欄の場合はAccess policy側の許可設定を信頼します。

## デプロイ

lockfile生成後:

```bash
npm ci --ignore-scripts
npm run check
npm run security:check
```

```bash
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod
```

各deployの前に `scripts/security-preflight.mjs` が実行され、Wranglerの完全固定・package-lockの存在・想定外の直接依存を検査します。

## 認証・セッション

認証は3種類です。

1. 選手用合言葉 — `/t/{teamId}`
2. チーム管理者パスワード — `/t/{teamId}/admin`
3. システム管理者 — Cloudflare Access + `SYSTEM_ADMIN_SECRET` — `/admin`

チーム管理者パスワードは新規設定/変更時 **12文字以上＋英字1文字以上＋数字1文字以上**です。記号は必須ではありません。

合言葉・管理者パスワードはD1に平文保存しません。PBKDF2-SHA256でsalt付きハッシュとして保存します。

## 認証レート制限

- 選手合言葉: 10回 / 10分 / team + client
- チーム管理者: 8回 / 15分 / team + client
- システム管理者: 6回 / 15分 / client

client IPはそのまま保存せず、`SESSION_SECRET` を鍵にHMACしたキーのみD1へ保存します。ログイン成功時に該当カウンタを消去します。

## CSRF / API入力制限

状態変更APIは以下を要求します。

- `Origin` が現在のoriginと完全一致
- `Sec-Fetch-Site` が存在する場合 `same-origin`
- JSONボディの場合 `application/json`
- JSON最大64KB

## セッション失効

`teams` に `player_session_version` / `admin_session_version` を持ちます。

- 選手用合言葉変更 → 既存選手Cookie失効
- 管理者パスワード変更 → 既存チーム管理Cookie失効
- チーム停止/削除 → 両方失効
- `SYSTEM_ADMIN_SECRET` 変更 → システム管理Cookie失効

## soft delete / 監査ログ

チーム・サイン・動画の「削除」はD1上ではsoft deleteです。通常画面/APIからは見えなくなりますが、事故調査・復旧用データは残ります。

`audit_log` には管理系の作成/変更/削除/管理ログイン成功を記録します。秘密値・合言葉・パスワードは記録しません。

## QRコード

QRは `public/vendor/qrcode-local.js` でブラウザ内生成します。チームURLを第三者QRサービスへ送信しません。由来とライセンスは `THIRD_PARTY_NOTICES.md`、ファイルハッシュは `public/vendor/SHA256SUMS` を参照してください。

## CSP / 外部通信

トップレベルページのCSPは原則 `self` のみです。動画iframeのみ `youtube-nocookie.com` を許可します。QRコード・JSライブラリを外部CDNから読み込む構成はありません。

## 選手の練習履歴

以下はD1へ保存しません。

- ○×回答
- 正答率
- 練習時間
- 間違えたサイン
- 練習履歴

利用端末の `localStorage` のみに保存し、別端末へ自動同期しません。

## 主なファイル

```text
public/index.html          LP
public/landing.js          LP操作
public/team.html           選手画面
public/team.js             練習・履歴・結果演出
public/admin.html          管理画面
public/admin.js            チーム/システム管理
public/share-utils.js      動的共有URL + ローカルQR
public/vendor/             vendored QR encoder
src/index.js               Worker / API / security controls
migrations/                D1 migration
scripts/security-preflight.mjs
```


## build 60: 管理画面UI/UX・動画コメント

管理画面は一覧中心に再設計し、チーム・サイン・動画の登録/編集はページ遷移せずモーダル（スマホではボトムシート）で完結します。YouTube動画は管理画面内のプレビューモーダルで確認できます。

複数動画の用途や撮影条件を残せるよう `sign_videos.comment` を追加しました。既存環境では次のmigrationを適用してください。

```bash
npm run db:migrate:local
# または db:migrate:dev / db:migrate:staging / db:migrate:prod
```

追加migration: `migrations/0004_video_comments.sql`


## build 60: サイングループ

`0005_sign_groups.sql` を追加しました。日付とは紐付けず、チーム管理者がグループ名・説明・説明用YouTube動画・所属サインを管理します。選手は練習開始前にグループ説明を確認し、その日に使うグループを選んで練習できます。

```bash
npm run db:migrate:local
# remote環境は db:migrate:dev / staging / prod
```


## build 61: 管理者パスワードポリシー

- チーム管理者パスワード: 12文字以上、英字1文字以上、数字1文字以上。記号は任意。
- `SYSTEM_ADMIN_SECRET`: 同じく12文字以上、英字1文字以上、数字1文字以上。
- `SESSION_SECRET` はセッション署名用のため、従来どおり32文字以上を維持します。
- 既存PBKDF2ハッシュは変更せず、新規設定・変更時の入力ポリシーのみ更新します。


## build 62: 認証エラーの原因分離

- 選手・チーム管理者・システム管理者のログインで、`SESSION_SECRET` 未設定/短すぎ、`SYSTEM_ADMIN_SECRET` 不備、保存済みパスワードハッシュ不備、入力ミスを別エラーとして返します。
- `/api/system/session` と `/api/team-admin/session` でも認証設定不備を503で明示し、ログイン画面にその理由を表示します。
- `SESSION_SECRET` は32文字以上、`SYSTEM_ADMIN_SECRET` は12文字以上かつ英字・数字を含む必要があります。
- チーム管理者の既存パスワードはログイン時に12文字ルールを強制しません。12文字ルールは新規設定・変更時のみです。


## build 63: メンバー画面のグループ選択を2ステップ化

メンバー画面は「STEP 1: 今日練習するグループを明示的に決定」「STEP 2: 問題数を選択」の順に変更しました。グループカードを触っただけでは選択されず、「このグループで練習する」で確定します。説明は別ボタンからモーダルで確認でき、選択後は現在のグループ名と変更ボタンを常時表示します。「すべてのサイン」はグループ一覧と視覚的に分離しています。DB migrationはありません。


## build 64: LP機能説明

トップページに、サイングループ・グループ説明動画・2ステップ練習選択・スマホ管理画面・複数動画コメント・共有/PWAの説明セクションを追加しました。

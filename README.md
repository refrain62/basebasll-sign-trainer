# SIGN TRAINER

野球チーム固有のサインを動画で反復練習する Web / PWA です。**build 55** では、Cloudflare D1 を **local / dev / staging / production** で分離する構成へ変更しています。

本番URL: `https://basebasll-sign-trainer.refrain62.workers.dev/`

## 環境構成

SIGN TRAINER 全体で複数チームを1つのD1に保存しますが、D1自体は環境ごとに完全分離します。

| 環境 | Worker | D1 | 用途 |
|---|---|---|---|
| local | `wrangler dev --env dev` | WranglerローカルD1 | PCでの開発 |
| dev | `basebasll-sign-trainer-dev` | `sign-trainer-dev` | 開発共有 |
| staging | `basebasll-sign-trainer-staging` | `sign-trainer-staging` | 本番前確認 |
| production | `basebasll-sign-trainer` | `sign-trainer-production` | 本番 |

アプリコードは全環境で `env.DB` だけを参照します。接続先D1は `wrangler.jsonc` が切り替えます。

## 重要: 本番を誤操作しないための方針

- 通常のローカル起動は `npm run dev` を使用します。これは `--env dev` かつローカルD1で起動します。
- dev / staging / production へのmigrationはそれぞれ別コマンドです。
- deployも `deploy:dev` / `deploy:staging` / `deploy:prod` に分けています。
- genericな `npm run deploy` は用意していません。
- 練習結果・回答内容はD1へ保存せず、利用端末の `localStorage` のみに保存します。

## 1. 依存関係

```bash
npm install
```

## 2. ローカル開発

`.dev.vars` をプロジェクト直下に作成します。

```env
SESSION_SECRET=local-development-secret-change-me
SYSTEM_ADMIN_SECRET=local-system-admin
```

ローカルD1へmigrationを適用します。

```bash
npm run db:migrate:local
```

起動します。

```bash
npm run dev
```

通常は以下で確認できます。

```text
LP                    http://localhost:8787/
サンプルチーム        http://localhost:8787/t/6BnWv2K3zo
システム管理          http://localhost:8787/admin
チーム管理            http://localhost:8787/t/6BnWv2K3zo/admin
```

ローカルではCloudflare上の `sign-trainer-dev` を直接変更しません。`wrangler dev` のローカルD1を使います。

## 3. Cloudflare D1を3つ作成

Cloudflareへログインします。

```bash
npx wrangler login
```

D1を作ります。

```bash
npx wrangler d1 create sign-trainer-dev
npx wrangler d1 create sign-trainer-staging
npx wrangler d1 create sign-trainer-production
```

それぞれ表示された `database_id` を `wrangler.jsonc` の次のプレースホルダーへ設定します。

```text
3b47491c-8e2a-412a-b2a7-1a06922b3604
2ca39d6b-e06f-44b4-862b-b0c2932d9310
bdd534e9-1c42-4db7-adbe-c62e35e123b5
```

### `wrangler.jsonc` の対応

```text
env.dev.d1_databases       -> sign-trainer-dev
env.staging.d1_databases   -> sign-trainer-staging
top-level d1_databases     -> sign-trainer-production
```

productionをトップレベルにしているのは、既存の本番Worker名 `basebasll-sign-trainer` と本番URLを変更しないためです。

## 4. migration

### local

```bash
npm run db:migrate:local
```

### dev

```bash
npm run db:migrate:dev
```

### staging

```bash
npm run db:migrate:staging
```

### production

```bash
npm run db:migrate:prod
```

migrationは全環境共通です。

- `migrations/0001_initial.sql` — `teams`, `signs`, `sign_videos`
- `migrations/0002_seed_sample.sql` — サンプルチームと10サイン

サンプルチーム:

```text
Team ID: 6BnWv2K3zo
選手用合言葉: ホームラン
```

## 5. Secretも環境ごとに設定

Secretは環境間で共有しません。各Workerへ個別に設定します。

### dev

```bash
npx wrangler secret put SESSION_SECRET --env dev
npx wrangler secret put SYSTEM_ADMIN_SECRET --env dev
```

### staging

```bash
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put SYSTEM_ADMIN_SECRET --env staging
```

### production

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SYSTEM_ADMIN_SECRET
```

`SESSION_SECRET` は十分長いランダム値を使用してください。

例:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 6. デプロイ

事前チェック:

```bash
npm run check
```

### dev

```bash
npm run deploy:dev
```

想定Worker: `basebasll-sign-trainer-dev`

### staging

```bash
npm run deploy:staging
```

想定Worker: `basebasll-sign-trainer-staging`

### production

```bash
npm run deploy:prod
```

本番Worker: `basebasll-sign-trainer`

## 7. migration状態確認

```bash
npm run db:list:local
npm run db:list:dev
npm run db:list:staging
npm run db:list:prod
```

## データ構造

### `teams`

- `id`
- `name`
- `passphrase_hash`
- `admin_password_hash`
- `status`
- timestamps

### `signs`

- `id`
- `team_id`
- `name`
- `sort_order`
- `enabled`
- timestamps

### `sign_videos`

- `id`
- `sign_id`
- `youtube_url`
- `youtube_video_id`
- `sort_order`
- `enabled`
- timestamp

## 認証

認証は3種類に分離しています。

1. 選手用合言葉 — `/t/{teamId}`
2. チーム管理者パスワード — `/t/{teamId}/admin`
3. `SYSTEM_ADMIN_SECRET` — `/admin`

選手用合言葉とチーム管理者パスワードは平文でD1へ保存せず、PBKDF2-SHA256で保存します。

## HTML / JavaScript

- `public/index.html` — LP
- `public/landing.js` — LP操作
- `public/team.html` — 選手画面
- `public/team.js` — 練習・動画・履歴・結果演出
- `public/admin.html` — 管理画面
- `public/admin-entry.js` — 管理画面ルート判定
- `public/admin.js` — システム管理 / チーム管理
- `public/styles.css` — 共通CSS
- `src/index.js` — Worker / API / HTMLルーティング

## 選手の練習履歴

選手の以下のデータはD1へ保存しません。

- ○×回答
- 正答率
- 練習時間
- 間違えたサイン
- 練習履歴

利用している端末の `localStorage` に保存し、別端末へ自動同期しません。

## API概要

### 選手

- `GET /api/session?teamId=...`
- `POST /api/auth`
- `POST /api/logout`
- `GET /api/signs?teamId=...`

### チーム管理者

- `GET /api/team-admin/session?teamId=...`
- `POST /api/team-admin/auth`
- `POST /api/team-admin/logout`
- `GET /api/team-admin/team?teamId=...`
- `PUT /api/team-admin/team`
- `POST /api/team-admin/signs`
- `PUT/DELETE /api/team-admin/signs/{id}`
- `POST /api/team-admin/signs/{id}/videos`
- `PUT/DELETE /api/team-admin/videos/{id}`

### システム管理者

- `GET /api/system/session`
- `POST /api/system/auth`
- `POST /api/system/logout`
- `GET/POST /api/system/teams`
- `PUT/DELETE /api/system/teams/{teamId}`

### ローカルで `/` が 307 になる場合

build 55 では、LPのルート `/` を Static Assets の `/index.html` へ書き換えず、`/` のまま取得するよう修正しています。Cloudflare Static Assets の `/index.html` → `/` 正規化による 307 ループを回避します。

## 307 リダイレクト対策

`/admin`、`/t/:teamId`、`/t/:teamId/admin` は、Cloudflare Static Assets の HTML 正規化に依存せず、Worker が内部の `public/__pages/*.txt` を読み込んで `text/html` の 200 Response として返します。これにより `.html` への内部フェッチが 307 を返して同一URLへループする問題を避けています。

## build 55: チームメンバーへの共有

選手向けチームページとチーム管理画面の両方から、メンバー用URLを共有できます。

- 参加リンクをコピー
- QRコードを表示（SIGN TRAINERアイコン付き）
- LINEで共有
- Web Share API対応端末では「その他のアプリで共有」
- 共有URLは現在の環境の `/t/:teamId` を使用（local/dev/staging/productionで自動的に切り替わる）
- 合言葉はURL・QRコード・共有メッセージに含めず、チーム内で別途伝える

チーム管理画面では合言葉の平文をD1から取り出すことはできません。必要な場合は「チーム設定」で新しい合言葉へ再設定してください。


## build 55: 登録サイン数に応じた出題数

- 0件: 練習開始不可。管理者へサイン・動画登録を案内
- 1〜4件: 登録済みの全サイン数だけで練習
- 5件: 5問（全サイン）
- 6〜9件: 5問 / 全サイン
- 10件以上: 5問 / 10問 / 全サイン
- 出題は1セット内で重複なし。要求数が登録数を超えても自動で実数へ丸めます。

## 現在のD1 ID

| 環境 | D1 | Database ID |
|---|---|---|
| dev | `sign-trainer-dev` | `3b47491c-8e2a-412a-b2a7-1a06922b3604` |
| staging | `sign-trainer-staging` | `2ca39d6b-e06f-44b4-862b-b0c2932d9310` |
| production | `sign-trainer-production` | `bdd534e9-1c42-4db7-adbe-c62e35e123b5` |

全環境のbinding名は `DB` に統一しています。ローカル開発では `remote: true` を使わず、WranglerのローカルD1を利用します。

## QR / 共有URLの環境追従

共有URLとQRコードは固定の本番URLを持たず、ブラウザ実行時の `window.location.origin` から動的に生成します。

- local: `http://localhost:8787/t/{teamId}`
- dev: dev Worker の origin
- staging: staging Worker の origin
- production: production Worker の origin

QR・リンクコピーには合言葉、セッション、管理画面URL、`openExternalBrowser` などのクエリを含めません。LINE共有時のみ必要に応じて外部ブラウザ用クエリを付与します。

対象: LPサンプルチームQR、選手画面の共有QR、チーム管理画面QR、新規チーム登録完了QR。

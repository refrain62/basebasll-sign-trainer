# SIGN TRAINER — build 101

野球チーム固有のサインを動画で反復練習する Web / PWA です。D1 は local / dev / staging / production で分離し、チーム・サイン・動画設定に加えて、管理者アカウントの識別情報・チーム権限・招待状態を保存します。選手の回答・正答率・練習履歴は端末の `localStorage` のみに保存します。OAuthのaccess token / refresh tokenは保存しません。

本番URL: `https://basebasll-sign-trainer.refrain62.workers.dev/`




## v1.5.32

- PCのクイズ画面を「動画 / 質問・回答操作」の2カラムに変更し、回答ボタンがファーストビューから隠れないようにしました。
- 動画は画面高に合わせて最大サイズを調整し、短いPC画面でもスクロール量を抑えます。

## v1.5.31

- PCの練習トップ・練習履歴・成績分析を最大1120pxのワークスペースへ広げ、横の余白を有効活用します。
- 練習トップ、練習履歴、成績分析、履歴詳細に「練習チーム」＋チーム名を大きく表示し、どのチームの画面か明確にしました。
- サイングループカードの「説明を見る」「このグループで練習する」は横並びをやめ、上下に並べて押しやすくしました。
- PCではサイングループカードを2列表示し、動画サムネイルをより大きく使えるようにしました。
- DB migrationの追加はありません。

## v1.5.30

- 練習トップにチーム名を明示し、どのチームの練習ページか一目で分かるようにしました。
- 練習ページのメニューから重複していた「トップページ」を削除し、「練習ページ」を先頭導線に整理しました。
- PCのクイズ画面は固定640px幅を廃止し、最大1120pxまで広げて動画を大きく表示します。スマホは従来どおり画面幅に追従します。
- サインの並び順は数値入力をやめ、サイン一覧の ↑ / ↓ ボタンで直感的に変更できるようにしました。
- DB migrationの追加はありません。

## v1.5.29

- Wrangler を **`4.141.0` に完全固定**しました。Windows + Node.js 24 環境で `wrangler 4.136.3` のローカルD1 migrationが `spawn UNKNOWN` / libuv assertionで落ちる事象を回避します。
- `version_metadata` は named environment に継承されないため、`env.dev` / `env.staging` に `CF_VERSION_METADATA` binding を明示しました。
- `security-preflight` で Wrangler の固定バージョンと production/dev/staging の `version_metadata` binding を検証します。


- プランを **Free / Plus / Pro** の3段階に整理しました。
  - Free: 基本練習、1サイングループ、1サイン1動画、メイン管理者1名、Google / LINE OAuth。
  - Plus: Free + 複数サイングループ、1サイン複数動画、動画プレビュー開始位置、サブ管理者最大5名。
  - Pro: Plus + 正答率・苦手分析、グループ／サイン／動画別分析、最近のアクティビティ／監査ログ。
- Plus / Pro は現在、SYSTEM管理者が特定チームへ手動付与する限定提供です。一般申し込み・オンライン課金はありません。
- SYSTEM管理のプラン変更、LP、チーム管理・練習画面の機能ロック表示を3段階の権限へ同期しました。
- サイングループ登録モーダルに、実際の野球運用を想定した使用例を追加しました。例を選ぶとグループ名と説明へ反映できます。
- `docs/spec.md`, `design.md`, `operations.md`, `monetization.md`, `architecture.md`, `testing.md` を現行実装へ同期しました。
- `migrations/0016_plan_tiers.sql` を追加しました。

## v1.5.27

- 練習ページのメニューをヘッダの外側へ移し、`backdrop-filter` による fixed 要素の包含問題を解消しました。
- スマホでは練習メニューを画面全体の最前面ドロワーとして表示し、本文の下へ埋没しないようにしました。
- PCではヘッダ直下の前面メニューパネルとして表示します。

## build 60 のセキュリティ強化

- Wrangler を **`4.141.0` に完全固定**（`^` 不使用）
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

`.dev.vars.example` をコピーして `.dev.vars.dev` を作り、**32文字以上**の `SESSION_SECRET` と **12文字以上で英字・数字を含む** `SYSTEM_ADMIN_SECRET` を設定します。

```powershell
Copy-Item .dev.vars.example .dev.vars.dev
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

`npm run dev` は `scripts/dev.ts` 経由で `CLOUDFLARE_CF_FETCH_ENABLED=false` をローカルWranglerプロセスに設定します。SIGN TRAINERは `Request.cf` を利用していないため、MiniflareがCloudflareから疑似CF情報を取得する際のタイムアウトを避けつつ、本番Workerの挙動には影響しません。

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
- `0004_video_comments.sql` — 動画用途コメント
- `0005_sign_groups.sql` — サイングループ・グループ説明動画
- `0006_accounts_and_team_admins.sql` — Google / LINE管理者アカウント、メイン管理者・サブ管理者・ワンタイム招待
- `0007_rate_limit_cleanup_index.sql` — 認証レート制限の期限切れデータ削除を支えるインデックス
- `0008_legal_consent.sql` — 利用規約・プライバシーポリシー同意履歴
- `0009_plans_and_entitlements.sql` — Free運用と将来有料化に備えたプラン・Entitlement・Usage基盤
- `0010_data_protection.sql` — OAuth識別子暗号文・audit保護状態。既存本文の暗号化は管理画面の段階移行で実行
- `0011_sub_admin_limit.sql` — サブ管理者最大5名をD1側でも強制する最終ガード
- `0012_system_notices.sql` — SYSTEM管理のお知らせ登録・公開期間・種別
- `0013_audit_actor_and_login_history.sql` — 監査ログの操作主体と管理者ログイン履歴
- `0014_limited_paid_features.sql` — 限定提供機能のEntitlement
- `0015_video_plan_features.sql` — 1サイン複数動画・動画プレビュー開始位置のプラン制御
- `0016_plan_tiers.sql` — Free / Plus / Proの役割を確定（Plus=運用強化、Pro=分析・監査）

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
npx wrangler secret put PASSWORD_PEPPER --env dev
npx wrangler secret put DATA_ENCRYPTION_KEY --env dev
npx wrangler secret put DATA_LOOKUP_KEY --env dev

# staging
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put SYSTEM_ADMIN_SECRET --env staging
npx wrangler secret put PASSWORD_PEPPER --env staging
npx wrangler secret put DATA_ENCRYPTION_KEY --env staging
npx wrangler secret put DATA_LOOKUP_KEY --env staging

# production
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SYSTEM_ADMIN_SECRET
npx wrangler secret put PASSWORD_PEPPER
npx wrangler secret put DATA_ENCRYPTION_KEY
npx wrangler secret put DATA_LOOKUP_KEY
```

`SESSION_SECRET` は32文字以上、`SYSTEM_ADMIN_SECRET` は12文字以上かつ英字・数字をそれぞれ1文字以上含む値を必須としています。`PASSWORD_PEPPER` / `DATA_ENCRYPTION_KEY` / `DATA_LOOKUP_KEY` は各32文字以上のランダムな値を環境ごとに別々に設定します。`npm run security:generate-secrets` で候補値を生成できます。

## Cloudflare Access（必須）

remote の dev / staging / production では `/admin*` と `/api/system/*` を Cloudflare Access で保護してください。`wrangler.jsonc` の `REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN` は3環境とも `true` です。

Cloudflare Zero Trust で各Workerに Self-hosted Application を作り、最低でも以下を保護します。

```text
/admin*
/api/system/*
```

Access policyで許可するメール/IdPユーザーを限定してください。Worker側では `Cf-Access-Jwt-Assertion` を **RS256署名・issuer・audience・有効期限まで検証**し、検証済みJWTの `email` claimだけを使用します。その上で `SYSTEM_ADMIN_SECRET` も要求する二重防御です。

必要なら `SYSTEM_ADMIN_ALLOWED_EMAILS` にカンマ区切りで許可メールを設定できます。空欄の場合はAccess policy側の許可設定を信頼します。

Access JWT検証には次の2つを各remote環境で設定してください。値自体はSecretではありません。

```text
CF_ACCESS_TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com
CF_ACCESS_POLICY_AUD=<Access Application の AUD tag>
```

`REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN=true` のremote環境では、これらが未設定またはJWT検証に失敗するとシステム管理画面を **fail closed (403)** します。ローカルホストだけは従来どおりAccess検証をスキップします。

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

各deployの前に `scripts/security-preflight.ts` が実行され、Wranglerの完全固定・package-lockの存在・想定外の直接依存を検査します。

## 認証・セッション

認証は4系統です。

1. 選手用合言葉 — `/t/{teamId}`
2. 管理者アカウント — Google / LINE OAuth + SIGN TRAINER account session — `/account`
3. 既存チーム用の旧管理者パスワード — `/t/{teamId}/admin`（移行互換。任意で無効化可能）
4. システム管理者 — Cloudflare Access + `SYSTEM_ADMIN_SECRET` — `/admin`

旧チーム管理者パスワードは新規設定/変更時 **12文字以上＋英字1文字以上＋数字1文字以上**です。記号は必須ではありません。LPから新規登録したチームは共有管理者パスワードを作らず、最初に認証したアカウントがオーナーになります。

合言葉・管理者パスワードはD1に平文保存しません。新規ハッシュは、16-byteランダムsalt + Cloudflare Secretの`PASSWORD_PEPPER`を使ったPBKDF2-SHA256（600,000 iterations）です。旧salt-onlyハッシュは正常ログイン時にpepper付き形式へ自動再ハッシュします。

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

QRは `qrcode` + `@types/qrcode` をVite bundleへ同梱してブラウザ内生成します。チームURLを第三者QRサービスへ送信しません。ランタイムCDNへの依存もありません。ライセンスは `THIRD_PARTY_NOTICES.md` を参照してください。

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
pages/*.html               HTMLテンプレート（編集元）
client/*.ts                ブラウザUI TypeScript（編集元）
client/vendor/             vendored QR encoder
public/styles.css          固定CSS
public/assets/             固定画像
public/build/              Vite生成bundle（編集しない）
public/__pages/            Worker用HTML snapshot（Vite生成）
src/index.ts               Worker / API / security controls
migrations/                D1 migration
vite.config.ts             UI bundle + HTML生成
vitest.config.ts           unit test設定
scripts/security-preflight.ts
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


## build 65: LP Workerスナップショット同期

LPの最新機能説明（サイングループ、グループ説明動画、2ステップ練習など）を `public/index.html` から Worker 配信用の `public/__pages/index.txt` へ同期しました。`team.html` / `admin.html` についても対応する TXT スナップショットを正本HTMLと再同期しています。DB変更はありません。

## build 66: Honoへバックエンドルーティングを移行

バックエンドのルーティングを手書きの `if (pathname...)` / 正規表現ディスパッチから **Hono 4.13.8** へ移行しました。Honoは完全固定バージョンで追加し、Cloudflare Workers / D1 の構成はそのまま維持しています。

```text
src/
├── index.js              # Honoアプリ / 共通middleware / Assets配信
├── backend.js            # 認証・業務ロジック・D1アクセス
└── routes/
    ├── player.js         # 選手API
    ├── team-admin.js     # チーム管理API
    └── system.js         # システム管理API
```

DBはORMへ変更していません。従来どおり **Cloudflare D1 Binding (`env.DB`) + `prepare().bind()`** を直接利用します。既存のprepared statement、PBKDF2、D1レート制限、CSRF、Cloudflare Access、Cookie、soft delete、audit logなどのセキュリティ処理も維持しています。

Honoを追加したため、このbuildを展開した後は一度依存関係を更新してください。

```bash
npm install --ignore-scripts
npm run check
npm run security:preflight
```

`security:preflight` は従来どおり `package-lock.json` が無い状態ではdeployを止めます。DBスキーマ変更はないため migration は不要です。



## build 67: Unit tests

Node.js 22〜24 で利用できる標準の `node:test` を使ったユニットテストを追加しました。テスト専用の外部依存はありません。

```bash
npm test
npm run test:watch
npm run test:coverage
```

`npm run check` に `npm run test:unit` を組み込んでいるため、構文チェック・ルート整合性チェックと一緒にユニットテストも実行されます。`.github/workflows/ci.yml` の GitHub Actions でも `npm run check` 経由でテストが走ります。`package-lock.json` が存在する場合は依存関係の `npm audit` も実行します。

主なテスト対象:

- 管理者パスワード要件と Secret 設定エラー
- PBKDF2 パスワードハッシュ / 検証
- 署名付きセッショントークン改ざん検知
- CSRF / Content-Type / Cloudflare Access 判定
- Cookie セキュリティ属性と CSP
- YouTube URL パース
- サイングループ / サイン / 動画コメントの D1 行マッピング
- メンバー画面のグループ絞り込みと問題数選択ロジック
- `admin12345678` がシステム管理者 Secret として受理される回帰テスト

フロントの問題数選択ロジックは `public/practice-utils.js` に切り出し、DOM に依存せず直接テストできるようにしています。DB スキーマ変更はありません。

テスト方針の詳細は `docs/testing.md` を参照してください。


## build 68: SOLID-oriented backend refactor

Hono / Cloudflare Workers / D1 の技術スタックとAPI互換を維持したまま、バックエンドを責務別に再構成しました。DBスキーマ変更はありません。

```text
src/
├── index.js                 # Hono composition root / Assets
├── routes/                  # URL と controller の対応だけ
├── middleware/              # API guard / Cloudflare Access
├── controllers/             # HTTP Request/Response 境界
├── services/                # 業務ルール。HTTP/D1へ直接依存しない
├── repositories/            # Cloudflare D1 SQLアクセス
├── security/                # session / password / auth / rate limit
├── validation/              # 入力正規化・YouTube検証
├── http/                    # JSON response / security headers / page serving
└── backend.js               # 後方互換用の薄いexport facade
```

### SOLIDで特に改善した点

- **S (Single Responsibility)**: 旧 `backend.js` のルーティング・認証・SQL・バリデーション・業務処理を分離。`backend.js` は互換exportのみ。
- **O (Open/Closed)**: 新しいサイン種別や管理APIは、既存の巨大dispatcherを変更せずService/Repositoryを追加して拡張可能。
- **I (Interface Segregation)**: Group / Sign / Video / Team ごとに小さいRepository/Serviceへ分割。
- **D (Dependency Inversion)**: ServiceはD1を直接触らず、Repository interfaceを受け取る。ユニットテストではfake repositoryを注入可能。
- **L (Liskov Substitution)**: 継承を使わず関数・object interfaceで構成し、fake実装への置換をテストで確認。

`node scripts/architecture-check.ts` を追加し、ServiceでのD1直接アクセス、Controller/RouteでのSQL、Routeから互換 `backend.ts` への依存をCIで禁止しています。

ユニットテストはService / Security / OAuth / Repository境界を中心に整備し、D1なしのfake repositoryでも業務ロジックを検証します。

```bash
npm test
npm run test:architecture
npm run check
```

build 68単体ではDB migrationは不要です。


## build 69: Node 24 / npm 11 compatibility

- `engines.node` を `>=22 <25` に変更し、Node.js 22〜24 を許可しました。
- `engines.npm` は `>=10 <12` とし、npm 10 / 11 を許可します。
- `packageManager` は npm 11.6.2 に更新しました。
- Hono 4.13.8 は引き続き完全固定です。
- `npm install` が `EBADENGINE` で停止して Hono が未インストールになる問題を解消しました。

## build 70: LPセルフ登録 / Google・LINE管理者アカウント

LPの「チームを登録する」からGoogleまたはLINEで管理者登録し、そのままチームを新規作成できます。新規チームは共有の管理者パスワードを持たず、管理者ごとのOAuthアカウントで管理します。

### 権限モデル

- **メイン管理者**: チームごとに1人。サブ管理者追加・削除、メイン管理者交代、旧管理者パスワード無効化を実行できます。
- **サブ管理者**: 1チーム最大5人。サイン・グループ・動画・チーム情報を管理でき、自分でチーム管理者から退会できます。
- オーナーは、そのまま退会できません。別の管理者へオーナーを交代してから退会します。
- オーナー交代は、登録済み管理者への即時交代またはワンタイム交代リンクで行えます。
- オーナー交代時は旧共有管理者パスワードを自動無効化し、古い承認待ち招待も無効化します。
- SIGN TRAINERアカウント自体の退会は、オーナー権限が残っている間はできません。

### 既存チームの移行

既存の管理者パスワードでチーム管理画面へ入り、「管理者アカウントへ移行」からGoogle / LINEを連携できます。最初に連携したアカウントがオーナーになります。**移行成立と同じD1 transaction内で旧共有管理者パスワードを自動無効化し、旧管理者セッション世代も更新**します。既存のチーム・サイン・動画は変更されません。

### OAuthセキュリティ設計

- Google / LINEとも Authorization Code Flow + `state` + `nonce` + PKCE (`S256`) を使用。
- OAuth途中状態とPKCE verifierは、10分で失効する署名済みHttpOnly Cookieへ保存。
- Google ID tokenはGoogle JWKSで署名・`aud`・`iss`・`exp`・`nonce`を検証。
- LINE ID tokenはLINE公式verify endpointへ`client_id`と`nonce`を渡して検証。
- OAuth access token / refresh tokenはD1へ保存しません。
- GoogleとLINEをメールアドレスだけで自動的に同一人物へ統合しません。provider + subjectを本人識別子とします。
- SIGN TRAINERの「アカウント退会」はD1上のOAuth identityとチーム所属を削除し、ユーザー行を匿名化する処理です。監査ログの整合性のため匿名IDは残ります。Google / LINE側で付与済みのアプリ連携許可は、各サービスのアカウント設定から必要に応じて解除します。
- 管理者招待の生トークンは発行時に一度だけ表示し、D1にはSHA-256ハッシュのみ保存します。
- 招待は1回限り・1〜72時間。承認待ちは1チーム10件までです。
- 招待URLからOAuth認証しただけでは権限を付与せず、認証後の確認画面で「招待を承認する」を押した時点で参加・オーナー交代を確定します。
- 登録済み管理者への直接オーナー交代は、交代先が処理直前まで管理者であることをD1更新条件でも再確認し、競合時にオーナー不在にならないよう防御しています。
- 新規チーム作成APIはアカウント＋クライアント単位で24時間10回までに制限しています。

### Google OAuth設定

Google Cloud Consoleで OAuth 2.0 Client の種類を **Web application** として作成し、利用する環境ごとに正確なredirect URIを登録してください。

production:

```text
https://basebasll-sign-trainer.refrain62.workers.dev/api/account/oauth/google/callback
```

ローカルGoogle確認では、たとえば以下を登録できます。

```text
http://127.0.0.1:8787/api/account/oauth/google/callback
```

ローカルの `.dev.vars.dev`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

remote環境:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --env dev
npx wrangler secret put GOOGLE_CLIENT_SECRET --env dev
npx wrangler secret put GOOGLE_CLIENT_ID --env staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --env staging
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### LINE Login設定

LINE Developers Consoleで **LINE Login v2.1** のチャネルを作り、各環境のcallback URLを登録します。productionは以下です。

```text
https://basebasll-sign-trainer.refrain62.workers.dev/api/account/oauth/line/callback
```

LINEはcallback URLにHTTPSを使用する運用を推奨しているため、ローカルで実認証まで確認する場合はHTTPSトンネルまたはdeploy済みdev Workerを使い、その**実際のURLと完全一致するcallback**を登録してください。

ローカルの `.dev.vars.dev`:

```env
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
LINE_REQUEST_EMAIL=false
```

remote環境:

```bash
npx wrangler secret put LINE_CHANNEL_ID --env dev
npx wrangler secret put LINE_CHANNEL_SECRET --env dev
npx wrangler secret put LINE_CHANNEL_ID --env staging
npx wrangler secret put LINE_CHANNEL_SECRET --env staging
npx wrangler secret put LINE_CHANNEL_ID
npx wrangler secret put LINE_CHANNEL_SECRET
```

LINEからメールアドレスを取得する場合だけ、LINE Developers側で必要な申請・権限設定を完了したうえで `LINE_REQUEST_EMAIL=true` にしてください。通常は `false` のままで動作します。

### migration 0006

このbuildをdeployする前に、**必ずDB migrationを先に適用**してください。

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

### ローカル `Request.cf` timeout対策

`npm run dev` は `scripts/dev.ts` 経由になり、SIGN TRAINERが使用していないMiniflareの `Request.cf` リモート取得をローカルだけ自動で無効化します。Windows/macOS/Linuxで同じコマンドを使えます。



## build 71: 公開運用向けセキュリティ強化

### Cloudflare Access JWTを暗号学的に検証

remote のシステム管理画面では、Accessヘッダーの「存在確認」ではなく `Cf-Access-Jwt-Assertion` を検証します。

- RS256署名をCloudflare Access JWKSで検証
- `iss` を `CF_ACCESS_TEAM_DOMAIN` と完全一致で確認
- `aud` に `CF_ACCESS_POLICY_AUD` が含まれることを確認
- `exp` / `nbf` / `iat` を時刻検証
- 検証済みJWTの `email` claimだけをallowlist判定に使用
- JWKSは5分キャッシュし、鍵ローテーション時だけ再取得
- 不正JWTによるJWKS fetch連打を抑えるため強制refreshを30秒に1回へ制限

### 重要操作はOAuth再本人確認

通常の管理者セッションは利便性のため長期間利用できますが、次の重要操作は **直近10分以内のGoogle / LINE認証**を必須にしました。

- オーナー交代 / オーナー交代招待の発行
- 他の管理者の削除
- 管理者自身の退会
- 旧共有管理者パスワードの無効化・変更
- SIGN TRAINERアカウントの退会
- オーナー交代招待の承認

再認証のOAuth stateは現在ログイン中の `userId` に署名付きで束縛し、別のGoogle / LINEアカウントで認証しても管理アカウントがすり替わらないようにしています。

### 旧共有管理者パスワードの自動失効

既存チームをOAuth管理へ移行する処理は、オーナー作成・旧共有パスワード無効化・旧管理者セッション世代更新をD1 `batch()`で一体化しました。移行後に古い共有パスワードが攻撃経路として残りません。

### 認証Rate LimitのDoS / ストレージ対策

- 選手ログインはglobal client limitの後、**存在するチームだけ**team単位のrate-limit行を作成
- チーム管理者ログインも同様に、存在しないteamIdごとのD1行を作らない
- client IPはCloudflareの `CF-Connecting-IP` のみ使用し、spoof可能な `X-Forwarded-For` は信用しない
- 期限切れ `auth_rate_limits` を最大1時間に1回、7日より古いものからopportunistic GC
- `0007_rate_limit_cleanup_index.sql` でcleanup対象列にindex追加

公開時はコード内のrate limitに加えて、Cloudflare WAF / Rate Limiting Rulesでログイン・OAuth・管理APIへedge側制限を設定することを推奨します。Worker bindingのnamespace IDはアカウント固有なので、配布テンプレートには架空値を埋め込んでいません。

### build 71 migration

`0007` はインデックス追加だけですが、build 71をremoteへdeployする前に各環境へ適用してください。

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

## build 72: 利用規約・プライバシー・運用整備

LPと管理者登録導線に、利用規約・プライバシーポリシー・外部送信・運営者/問い合わせ情報を追加しました。

公開URL:

- `/terms`
- `/privacy`
- `/external-transmission`
- `/support`

管理者のOAuth開始時に規約/プライバシーの版を署名済みOAuth stateへ保持し、OAuth完了後に `app_users.terms_version` / `privacy_version` / `legal_accepted_at` へ記録します。新規チーム作成には現行版への同意が必要です。

LINE identityを持つアカウントの退会では、LINEで再本人確認したうえで連動アプリ権限をDeauthorize APIで解除してからSIGN TRAINERアカウントを削除します。

追加migration:

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

本番公開前に `wrangler.jsonc` の `PUBLIC_OPERATOR_NAME` と `PUBLIC_SUPPORT_URL` を実運用値へ変更し、`npm run ops:preflight` を通してください。詳細は `docs/operations.md` を参照してください。


## build 73: Freeプラン / 将来有料化の基盤

現在の基本機能をFree（¥0）として明示し、将来の画像・動画直接アップロード等を有料化できるよう、決済処理とは分離したPlan / Entitlement / Usage基盤を追加しました。

- 既存・新規チームは自動的に `free`。
- `team_plus` / `team_pro` を非販売のEntitlement用プランとして導入（現在はv1.5.29で Plus / Pro の役割を明確化）。
- 商品機能はStripeの契約状態を直接見ず、`EntitlementService` を経由して利用可否を判定。
- 管理画面とアカウント画面に現在のプランを表示。
- LPにFreeプランを明示。現在のPlus / Proの機能境界はv1.5.29の仕様を正とします。
- `team_usage` で将来の保存量・画像数・動画量を追跡できるよう準備。

設計方針・R2アップロード構成・Stripe導入時の境界・価格検討レンジ・法務チェックは `docs/monetization.md` にまとめています。

追加migration:

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:staging
npm run db:migrate:prod
```

現時点ではStripe Checkout・クレジットカード入力・自動課金は実装していません。


## build 74: Windows / Node 24 のローカル起動修正

Node 24 on Windows で `spawn("npx.cmd", ...)` が `EINVAL` になる問題を修正しました。`npm run dev` は Windows では `cmd.exe` 経由でローカルの Wrangler を起動し、macOS / Linux では従来どおり `npx --no-install` を利用します。`CLOUDFLARE_CF_FETCH_ENABLED=false` の自動設定も維持しています。

```bash
npm run dev
```

Windows向け起動コマンドの回帰テストも追加しています。


## build 75: アプリケーションレベルのデータ保護 / Password Pepper

- `PASSWORD_PEPPER` をCloudflare Secretに追加し、新規の選手合言葉・旧管理者パスワードは `PBKDF2-SHA256 + 16-byte random salt + pepper` で保存します。旧ハッシュはログイン成功時に自動移行します。
- `DATA_ENCRYPTION_KEY` を使った AES-256-GCM で、チーム名、管理者の表示名・メール・アバター、サイン名、サイングループ名/説明、YouTube URL/Video ID、動画コメントをD1保存前に暗号化します。暗号文は `enc:v1:` 形式でversionを持ちます。
- Google / LINE の provider subject は `DATA_LOOKUP_KEY` による HMAC-SHA256 (`hmac:v1:`) を検索キーとして保存し、元値はAES-GCM暗号文として別カラムに保持します。メールアドレスによる自動アカウント統合は行いません。
- audit logは秘密値・個人情報・サイン本文を保存しないようキー単位でredactし、既存audit detailも保護メンテナンスで書き換えます。
- migration `0010_data_protection.sql` を**build 75のコードをdeployする前に**適用してください。migration後、`/admin` の「保存データの保護」から既存平文データを暗号化してください。
- 暗号鍵/lookup鍵/pepperはD1には保存しません。dev / staging / productionで別値を使い、production値は安全なパスワードマネージャー等にもバックアップしてください。鍵を失うと暗号化済みデータを復号できません。
- 詳細とローテーション時の注意は `docs/data-protection.md` を参照してください。


## build 76: 問い合わせをGoogleフォームへ移行

公開メールアドレスをHTMLへ出さない構成へ変更しました。`PUBLIC_SUPPORT_EMAIL` は廃止し、HTTPSの問い合わせフォームURLを指定する `PUBLIC_SUPPORT_URL` を使用します。`/support`、利用規約、プライバシーポリシー、外部送信ページはいずれも同じフォームURLへリンクします。アプリ側はフォームURLへ氏名・メールアドレス等の個人情報を追加しません。

例: `PUBLIC_SUPPORT_URL=https://forms.gle/...`


## build 78: メイン管理者1名 + サブ管理者最大5名

- `owner` はUI上「メイン管理者」、`admin` は「サブ管理者」と表示します。内部role値は後方互換のため変更していません。
- サブ管理者は1チーム最大5名です。承認待ちのサブ管理者招待も空き枠を予約するため、5枠を超えて招待リンクを発行できません。
- 招待承認時にもServiceとD1更新条件で上限を再確認し、同時操作でも6人目が参加しないよう防御します。
- `0011_sub_admin_limit.sql` はD1へ直接INSERTする経路にも5名上限の最終ガードを追加します。
- メイン管理者交代時、旧メイン管理者がサブ管理者として残る場合も5名上限を確認します。


## build 80: TypeScript + Zod

Cloudflare Worker / API 実装を `src/**/*.ts` へ移行し、Wranglerのエントリポイントも `src/index.ts` に変更しました。HTTPリクエストのJSON bodyはControllersで直接信用せず、`src/validation/schemas.ts` のZod schemaを `parseJsonBody()` に通してからServiceへ渡します。対象は選手認証、チーム管理認証、チーム/グループ/サイン/動画更新、管理者招待・権限移譲、アカウント作成/削除、システム管理API、データ保護メンテナンスです。

```bash
npm run typecheck
npm run check
```

`npm run check` は TypeScript typecheck → ブラウザ/ツールJS構文確認 → route parity → architecture boundary → unit tests の順で実行します。Zodのvalidation errorはHTTP境界で `400 invalid_request` に統一し、64KiB超のJSONはZod処理前に `413 payload_too_large` で拒否します。

ブラウザへ直接配信する `public/*.js` は、追加のclient bundlerを導入してPWA配信経路を変えないため今回そのままです。Worker/API・Repository・Service・Security・OAuth・Validation・unit testsはTypeScriptへ移行済みです。ブラウザ側もTypeScript source + build outputへ切り替える場合は別途client build工程を追加できます。

この変更によるD1 schema変更はありません。既存migration 0011まで適用済みなら追加migrationは不要です。


## build 81: UIコードもTypeScriptへ移行

ブラウザ向けのSIGN TRAINER自前UIコードもTypeScriptをsource of truthにしました。`client/account.ts`、`client/admin-entry.ts`、`client/admin.ts`、`client/landing.ts`、`client/legal.ts`、`client/practice-utils.ts`、`client/share-utils.ts`、`client/team.ts` を `tsconfig.client.json` でコンパイルし、実際にブラウザへ配信する `public/*.js` を生成します。`public/*.js` は直接編集せず、UI変更は `client/*.ts` に対して行います。

```bash
npm run build:client   # client/*.ts -> public/*.js
npm run typecheck      # Worker + UI のTypeScript検査
npm run check          # build後に全チェック
npm run dev:ui         # UI TypeScriptだけをwatchコンパイル
```

`npm run dev` の前には `predev` がUIを自動ビルドします。deploy前チェックでもUIを必ず再ビルドします。QR生成は `qrcode` + `@types/qrcode` を利用し、手書き/vendored JavaScriptはclient配下に置きません。


## build 82: 開発・運用スクリプトもTypeScriptへ統一

`scripts/*.mjs` を廃止し、開発サーバー起動、構造検査、route parity、security/operations preflight、client source parity、生成JS構文検査、Secret生成をすべて `scripts/*.ts` へ移行しました。Node上では `--experimental-strip-types` で直接実行し、`tsconfig.scripts.json` で `strict` typecheckします。Node APIの型定義として `@types/node` をdevDependencyに追加しています。これにより自前の編集対象ソースは `src/`、`client/`、`scripts/` のすべてがTypeScriptです。ブラウザへ配信されるJavaScriptはVite生成物だけで、client配下の手書きJavaScriptはありません。


## build 83: Vite + Vitest

ブラウザUIのビルドを `tsc` の直接出力から **Vite** へ移行し、単体テストを Node.js built-in test runner から **Vitest** へ移行しました。Vitest 5の要件に合わせ、Node.js engineは `>=22.12 <25` です。

### UI build

```bash
npm run build:client
```

Viteのentryは `client/landing.ts` / `team.ts` / `admin-entry.ts` / `account.ts` / `legal.ts` です。共通moduleはViteが自動でchunk化し、`public/build/assets/*-[hash].js` として出力します。`admin-entry.ts` からの管理画面本体もViteのdynamic importでchunk化されるため、旧 `/admin.js?v=...` の手動importはありません。

HTMLの編集元は `pages/*.html` です。各テンプレートの `<!-- VITE_ENTRY:... -->` をVite pluginがcontent-hashed script URLへ置換し、Worker用の `public/__pages/*.txt` と `public/*.html` を生成します。生成物は直接編集しません。

favicon / Web App Manifest / `public/styles.css` などVite bundle外の固定アセットについては、従来のCloudflare Worker version metadataによる `__ASSET_VERSION__` を継続利用します。JS bundle自体はViteのcontent hashがcache-busterになるため、Worker側でJS本文を書き換えません。

### tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

テストrunnerはVitestです。coverageは`@vitest/coverage-v8`を使います。

### development

```bash
npm run dev
```

最初にVite production buildを実行した後、Wranglerと `vite build --watch` を同時起動します。UIのTypeScript変更はViteが再bundleし、生成HTML/Worker page snapshotも更新します。


## build 84: QR生成もTypeScript対応npmライブラリへ移行

旧 `client/vendor/qrcode-local.js` と型shimを削除し、`@synapxlab/qrcode` 1.0.0へ一度移行しました。QRはブラウザ内で生成し、外部QR APIやCDNへチームURLを送信しない構成です。`scripts/client-source-check.ts` はclient配下に `.js/.mjs/.cjs` が残った場合に失敗するよう強化しています。


## build 85: qrcode + @types/qrcode へ統一

QR生成ライブラリを `@synapxlab/qrcode` から `qrcode` 1.5.4へ変更し、TypeScript型は `@types/qrcode` 1.5.6をdevDependencyとして利用します。`client/qr-code.ts` は `QRCode.toString(..., { type: "svg" })` を非同期で呼び出し、SVG data URLを生成します。Viteがruntimeの `qrcode` をproduction bundleへ取り込むため、外部CDNやQR生成APIへURLを送信しません。


## build 86: Vitest依存整合 + 複数チーム管理者回帰テスト

`vitest` と `@vitest/coverage-v8` を **5.0.1** に統一し、npmのpeer dependency競合を解消しました。あわせて、同一の `app_users.id` が複数チームの `team_admin_memberships` を持てることを、実際の全D1 migrationをSQLite in-memoryへ適用するVitest回帰テストとして追加しています。テストは同一ユーザーが Team A の owner、Team B / Team C の admin として同時に登録でき、3件すべて取得できること、および同一チーム内の重複所属だけが複合主キー `(team_id, user_id)` で拒否されることを確認します。


## build 87: TypeScript 7 test narrowing fixes

TypeScript 7で `node:assert/strict` の `assert.rejects` 検証コールバック引数が `unknown` として扱われる箇所を、Vitestの `expect(...).rejects.toMatchObject(...)` へ移行した。これにより `ServiceError` の `code` / `status` / `details` を型安全に検証する。Cloudflare Access JWTテストのJWKは、Web Crypto標準の `JsonWebKey` に `kid` / `alg` / `use` を明示的に交差型として追加した。


## build 88: 画像軽量化

本番配信画像を約3.81 MiBから約0.86 MiBへ削減しました。さらに、未参照だった2.5 MiBの `docs/reference-lp.png` はWebPへ変換し約169 KiBに縮小しました。1207×1207 / 約1.21 MiBだったブランド画像は表示用途に十分な256×256 WebPへ変更し、`why-baseball.png` はWebP化してlazy-load、OG画像はJPEG化しました。PWA用PNGは128色へ最適化し、参照されていなかった統合版インストール画像2枚を削除しています。さらに、クライアントTSから `public/assets` のブランド画像をVite importして二重出力していた構成をやめ、静的URL参照へ変更しました。`scripts/image-budget-check.ts` を `npm run tooling:check` に追加し、public配下の各画像160 KiB以下・合計1.2 MiB以下を回帰チェックします。

## build 89: N+1防止 + CSP inline style除去

プラン一覧の欠損補完をチームごとの逐次DBアクセスから一括provisioningへ変更し、チーム数が増えてもDB往復回数が増えない構成にしました。単一サイン取得は「対象サイン1件 + その動画」の2クエリ、単一グループ取得は1クエリに変更しています。`tests/unit/query-count-regression.test.ts` でクエリ数の回帰を監視します。

また、厳格な `style-src 'self'` CSPでブロックされていた `element.style` / `style.setProperty()` を廃止しました。進捗率と正答率は `pct-0`〜`pct-100` のCSS class、クリップボードfallbackは `.clipboard-fallback` classで表現します。`tests/unit/csp-inline-style-regression.test.ts` はfirst-party UIへinline style操作が再導入された場合に失敗します。


## build 90: チーム管理画面を目的別ページへ分割

チーム管理ダッシュボードから詳細情報を外し、グループ数・サイン数・動画数、主要メニュー、システムのお知らせの要約だけを表示する構成へ変更しました。`/t/:teamId/admin/groups`、`signs`、`share`、`plan-auth`、`notices`、`settings` を専用URLとして追加し、PCでは固定サイドメニュー、モバイルでは管理メニュー選択から直接遷移できます。チームメンバー管理は追加していません。既存機能のサイングループ、サイン/YouTube動画、選手用ページ共有、プラン、管理者認証・権限、チーム設定を各画面へ分離しています。システムのお知らせは、実際の認証状態・初期設定状態・プラン状態と管理画面更新情報から生成します。


## build 91: サブ管理者管理を独立画面化

チーム管理メニューに **「管理者」** を追加し、`/t/:teamId/admin/admins` を管理者専用画面として追加しました。メイン管理者はここからサブ管理者（最大5名）の招待、既存サブ管理者の解除、承認待ち招待の取り消し、メイン管理者の交代、旧共有パスワードの無効化を行えます。サブ管理者本人は同画面からチーム管理者を退会できます。選手・一般チームメンバー管理は追加していません。`プラン・認証` は契約情報と現在の認証方式の確認に絞り、管理者操作を分離しました。


## build 92: モバイル管理メニューをハンバーガー化

チーム管理画面のモバイルナビゲーションをselectからハンバーガーボタンへ変更しました。ボタンを押すと画面全体のメニュー一覧を開き、ダッシュボード・サイングループ・サイン管理・共有・管理者・プラン/認証・システムのお知らせ・チーム設定へ直接移動できます。PC左上の `TEAM ADMIN` 表記は `チーム管理` に変更し、各管理ページ見出しに重複していた `PLAN & AUTH` / `GROUPS` / `SIGNS` などの英語kickerは削除して日本語だけに統一しました。


## build 93: サイン管理からグループ追加 + モバイルカード幅修正

サイン管理画面に既存のグループ作成モーダルを直接開く「グループ追加」ボタンを追加しました。APIや作成ロジックはサイングループ画面と共通で、重複実装はありません。あわせてスマホ幅ではダッシュボードの3枚サマリーカードを縦1列に切り替え、ページアクションも1列化し、主要カードに `min-width: 0; max-width: 100%` を適用して横方向につぶれないようにしています。


## build 94: モバイル一覧カードの横幅修正

build 93でモバイル時の3枚サマリーを1列化していましたが、これは戻して3枚横並びを維持します。今回の修正対象は一覧カード内部の横幅です。サイングループ・サイン・動画一覧のカードと、その内部のタイトル・説明・操作領域に `width:100% / min-width:0 / max-width:100% / box-sizing:border-box` を明示し、狭い画面で子要素の幅計算に引っ張られてカード内容が押し潰されないようにしました。グループカードの操作列も「説明動画を確認」を可変幅、「編集」を必要幅にして、50/50固定による窮屈さをなくしています。


## build 95: スマホの一覧見出し余白調整

スマホ表示（620px以下）だけ、サイングループ／サイン管理の一覧カード上部にある「登録グループ」「登録サイン」サマリーへ左右15pxの余白を追加しました。PC/タブレットのレイアウトや、ダッシュボードの3枚サマリーカードには影響しません。


## build 96: システム管理画面も目的別ページへ分割

チーム管理画面で行った情報設計の見直しをシステム管理側にも適用しました。`/admin` は登録チーム数・利用中チーム数・登録サイン数と主要機能への入口だけを表示するダッシュボードにし、`/admin/teams` へチーム登録・編集・停止/再開、`/admin/security` へ既存データ保護、`/admin/notices` へ更新・運用上のお知らせを分離しています。PCは左メニュー、スマホはハンバーガーから全画面メニューを開きます。従来の `/register` は互換性のためチーム管理を開いて登録モーダルを表示します。Cloudflare Accessの保護対象にも `/admin/*` を含めています。

## v1.5.24: 動画サムネイル・限定機能整理・成績分析導線

- サイン管理のYouTube動画にYouTube標準サムネイルを表示します。
- Freeは1サイン1動画、対象チーム限定プランでは1サインに複数動画を登録できます。
- 対象チーム限定プランでは動画プレビュー開始位置を秒数で指定できます。YouTubeの一覧サムネイル画像自体はYouTube標準画像を使用します。
- 練習履歴には成績サマリーだけを表示し、グループ別・サイン別・動画パターン別の詳細分析は専用の「成績分析」ページへ分離しました。
- サイングループの例示は、用途が具体的に伝わる `バッティングサイン` / `守備サイン（ランナーなし）` / `守備サイン（2塁ランナーあり）` / `ピッチングサイン` / `走塁サイン` に統一しました。
- LPのFree / 対象チーム限定機能の説明も同じ内容へ更新しました。一般申し込み・オンライン課金はまだ提供していません。
- DB変更として `migrations/0015_video_plan_features.sql` を追加しています。既存環境ではコードdeploy前にmigrationを適用してください。

## v1.5.25: 練習メニュー・検索導線・プラン説明の改善

- 練習ページのハンバーガーメニューをチーム管理と同系統のカード型メニューへ変更し、チーム名・アイコン・現在位置を分かりやすく表示します。スマホでは全画面メニューとして開きます。
- サイングループに説明動画が登録されている場合、練習開始前のグループ選択画面へYouTube標準サムネイルを表示します。
- SYSTEM管理のチーム一覧を、チーム名 / ID・プラン・利用状態で組み合わせて絞り込めるようにしました。
- SYSTEM管理の「管理画面」は「チーム管理画面を開く」へ、チーム管理の「選手用ページ」は「選手用ページを開く」へ名称を変更しました。通常ブラウザでは別タブ、PWA standalone時は同一画面で開きます。
- サイングループ管理に名称検索を追加しました。
- LPに「プランについて」の比較表示を追加し、Freeと現在特定チーム限定で提供している有償機能の差を明記しました。一般申し込み・オンライン課金には未対応です。

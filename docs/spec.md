# SIGN TRAINER 仕様書 — build 73

## 目的

野球チーム固有のサインを、実際のサイン動画を使って反復練習するWeb/PWA。

## ユーザー区分

### 選手
- `/t/{teamId}`
- チーム合言葉で認証
- 動画クイズ・自己採点・復習・端末内履歴

### チーム管理者
- `/account` でGoogle / LINE認証
- `/t/{teamId}/admin` でチーム情報・合言葉・サイングループ・説明動画・サイン・YouTube動画を管理
- チームごとにメイン管理者1人 + サブ管理者最大5人
- メイン管理者はワンタイムリンクでサブ管理者を最大5人まで追加でき、メイン管理者交代も可能
- 既存チームは旧管理者パスワードからアカウント管理へ移行可能

### システム管理者
- `/admin`
- Cloudflare Access JWT（RS256署名 / issuer / audience / expiry検証）+ Worker Secret `SYSTEM_ADMIN_SECRET` の二重認証
- 全チーム登録・編集・利用停止・削除


## 環境分離

D1はチームごとではなく環境ごとに分離する。

- local: WranglerローカルD1（`wrangler dev --env dev`）
- dev: `sign-trainer-dev`
- staging: `sign-trainer-staging`
- production: `sign-trainer-production`

アプリコードは全環境で `env.DB` を参照し、Wrangler設定で接続先を切り替える。本番はトップレベル環境を使用し、既存Worker名 `basebasll-sign-trainer` を維持する。

## データ

Cloudflare D1に `teams`, `signs`, `sign_videos`, `sign_groups`, `app_users`, `user_identities`, `team_admin_memberships`, `team_admin_invites`, `plans`, `plan_entitlements`, `team_subscriptions`, `team_usage` を保存する。

練習結果・回答内容はサーバーへ保存せず、利用端末のlocalStorageへ保存する。

## チーム

- ランダムなURL-safe ID
- チーム名
- 選手用合言葉のハッシュ
- 旧チーム管理者パスワードのハッシュ（アカウント移行後は無効化可能）
- メイン管理者 / サブ管理者アカウント
- active / suspended

## サイン

- チームに所属
- サイン名
- 並び順
- 有効 / 無効
- 1サインに複数YouTube動画を登録可能

## 認証

- 選手セッション: 約30日
- 管理セッション: 既定12時間
- HttpOnly / SameSite=Lax / 本番Secure Cookie
- セッションtokenはSESSION_SECRETでHMAC署名
- 合言葉・チーム管理者パスワードはPBKDF2-SHA256で保存
- 管理者アカウントの通常セッションとは別に、オーナー交代・退会・管理者削除など重要な管理者操作は直近10分以内のGoogle / LINE OAuth再認証を要求する
- OAuth再認証は現在のSIGN TRAINER userIdへ署名付きstateで束縛し、別アカウントへのすり替えを拒否する
- 既存チームをOAuthアカウント管理へ移行した時点で旧共有管理者パスワードを同一D1 batch内で自動無効化する
- 認証rate limitはglobal client制限を先に適用し、存在するチームだけteam単位制限を作成する。期限切れrate-limit行は定期的に削除する

## サイン情報の保護

未認証のブラウザへサイン名・YouTube video IDを返さない。認証後に `/api/signs?teamId=...` から取得する。

## 共有

選手用URLは `/t/{teamId}`。QR・LINE・URLコピーで共有できる。合言葉は共有URLへ含めない。

## 練習履歴

- localStorage
- teamIdごとに分離
- 最大50件
- 日時、モード、○×、正答率、練習時間、利用したvideo ID
- 別端末へ同期しない



## プラン

- 現在の基本機能は `free`（¥0）。
- 既存・新規チームは自動的にFreeへ所属する。
- 将来用の `team_plus` / `team_pro` は非販売状態で保持し、価格は未確定。
- 画像/動画の直接アップロード等は `EntitlementService` で利用可否を判定する。
- 現時点では決済・Stripe Checkout・自動課金を行わない。
- 将来のクラウド保存量は `team_usage` で管理する。

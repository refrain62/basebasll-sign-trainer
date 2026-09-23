# SIGN TRAINER 仕様書 — build 50

## 目的

野球チーム固有のサインを、実際のサイン動画を使って反復練習するWeb/PWA。

## ユーザー区分

### 選手
- `/t/{teamId}`
- チーム合言葉で認証
- 動画クイズ・自己採点・復習・端末内履歴

### チーム管理者
- `/t/{teamId}/admin`
- 管理者パスワードで認証
- チーム情報・合言葉・サイン・YouTube動画を管理

### システム管理者
- `/admin`
- Worker Secret `SYSTEM_ADMIN_SECRET` で認証
- 全チーム登録・編集・利用停止・削除


## 環境分離

D1はチームごとではなく環境ごとに分離する。

- local: WranglerローカルD1（`wrangler dev --env dev`）
- dev: `sign-trainer-dev`
- staging: `sign-trainer-staging`
- production: `sign-trainer-production`

アプリコードは全環境で `env.DB` を参照し、Wrangler設定で接続先を切り替える。本番はトップレベル環境を使用し、既存Worker名 `basebasll-sign-trainer` を維持する。

## データ

Cloudflare D1に `teams`, `signs`, `sign_videos` を保存する。

練習結果・回答内容はサーバーへ保存せず、利用端末のlocalStorageへ保存する。

## チーム

- ランダムなURL-safe ID
- チーム名
- 選手用合言葉のハッシュ
- チーム管理者パスワードのハッシュ
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


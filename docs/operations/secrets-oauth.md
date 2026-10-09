# Secret・Google / LINE OAuth設定

環境一覧は [`environment-overview.md`](environment-overview.md) を参照してください。

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
pnpm run security:generate-secrets
```

### dev

```bash
pnpm exec wrangler secret put SESSION_SECRET --env dev
pnpm exec wrangler secret put SYSTEM_ADMIN_SECRET --env dev
pnpm exec wrangler secret put PASSWORD_PEPPER --env dev
pnpm exec wrangler secret put DATA_ENCRYPTION_KEY --env dev
pnpm exec wrangler secret put DATA_LOOKUP_KEY --env dev
```

### staging

```bash
pnpm exec wrangler secret put SESSION_SECRET --env staging
pnpm exec wrangler secret put SYSTEM_ADMIN_SECRET --env staging
pnpm exec wrangler secret put PASSWORD_PEPPER --env staging
pnpm exec wrangler secret put DATA_ENCRYPTION_KEY --env staging
pnpm exec wrangler secret put DATA_LOOKUP_KEY --env staging
```

### production

```bash
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put SYSTEM_ADMIN_SECRET
pnpm exec wrangler secret put PASSWORD_PEPPER
pnpm exec wrangler secret put DATA_ENCRYPTION_KEY
pnpm exec wrangler secret put DATA_LOOKUP_KEY
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
pnpm exec wrangler secret put GOOGLE_CLIENT_ID --env dev
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET --env dev

# staging
pnpm exec wrangler secret put GOOGLE_CLIENT_ID --env staging
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET --env staging

# production
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

### LINE callback

Googleと同じホスト構成で、パスを以下にします。

```text
/api/account/oauth/line/callback
```

LINE Secret:

```bash
# dev
pnpm exec wrangler secret put LINE_CHANNEL_ID --env dev
pnpm exec wrangler secret put LINE_CHANNEL_SECRET --env dev

# staging
pnpm exec wrangler secret put LINE_CHANNEL_ID --env staging
pnpm exec wrangler secret put LINE_CHANNEL_SECRET --env staging

# production
pnpm exec wrangler secret put LINE_CHANNEL_ID
pnpm exec wrangler secret put LINE_CHANNEL_SECRET
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

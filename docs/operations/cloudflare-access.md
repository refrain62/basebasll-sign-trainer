# Cloudflare Access設定

Dev / Stagingの非公開運用に必要な設定だけをまとめます。

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

Productionは一般公開のままです。SYSTEM管理画面にもCloudflare Accessは要求せず、SIGN TRAINER内の `SYSTEM_ADMIN_SECRET` + SYSTEM管理セッションで保護します。

```text
REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN=false
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

Dev / StagingではSYSTEM管理用に別のAccess Applicationを重ねず、環境全体のAccess Applicationをそのまま使用します。環境全体Access通過後、SYSTEM管理はさらに `SYSTEM_ADMIN_SECRET` + SYSTEM管理セッションで認証されます。

### 6-3. Workerへ指定する値

`CF_ACCESS_TEAM_DOMAIN` はZero Trust組織のTeam Domainです。現在はDev / Stagingの環境全体Accessで使用します。ProductionのSYSTEM管理では使用しません。

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
# SYSTEM管理ではCloudflare Accessを使わないためAUDは不要
```

Account ID / Application ID / Policy IDではなく、必ず **Application Audience (AUD) tag** を指定します。

### 6-4. 許可メールの二重制限

Cloudflare Access Policy側の許可ユーザーに加えて、Worker側でもDev / Stagingの利用者を限定したい場合は、`ENVIRONMENT_ACCESS_ALLOWED_EMAILS` にカンマ区切りで設定します。

```text
ENVIRONMENT_ACCESS_ALLOWED_EMAILS=user1@example.com,user2@example.com
```

空欄の場合はCloudflare Access Policy側の許可設定を信頼します。安全上、Dev / StagingではAccess Policy側で必ず対象ユーザーを限定してください。

`SYSTEM_ADMIN_ALLOWED_EMAILS` はSYSTEM管理専用のCloudflare Accessゲートを無効化している現在の構成では使用しません。

### 6-5. fail closedの確認

Dev / Stagingのremote環境では、以下のいずれかに該当するとWorker全体が403になります。

- `Cf-Access-Jwt-Assertion` がない
- `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_POLICY_AUD` が未設定または不正
- JWTの署名・issuer・audience・有効期限が不正
- `ENVIRONMENT_ACCESS_ALLOWED_EMAILS` を設定していて、JWTのemailが一覧にない

ローカルホスト (`localhost` / `127.0.0.1`) は開発できるよう環境全体のAccess検証をスキップします。

---

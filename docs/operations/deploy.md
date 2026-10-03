# dev / staging / production デプロイ

環境設定は [`environment-overview.md`](environment-overview.md)、Cloudflare Workers Buildsの設定は [`cloudflare-workers-builds.md`](cloudflare-workers-builds.md)、migrationとrollbackは [`migrations-rollback.md`](migrations-rollback.md) を参照してください。

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

通常は`dev` branchへ反映すると、Cloudflare Workers Buildsが自動でdev Workerをbuild/deployします。

migrationがない変更:

```text
PR / CI成功
→ dev branchへmerge
→ Workers Builds
→ basebasll-sign-trainer-devへdeploy
```

D1 migrationがある場合は、branchへ反映する前に手元のWrangler OAuthでdev DBへ適用してbaselineを更新します。

```bash
npx wrangler login
npm run db:list:dev
npm run db:migrate:dev
npm run db:list:dev
npm run db:baseline:dev -- --confirm-applied
```

`config/deployment-migrations.json`の変更もcommitしたうえで`dev`へ反映します。

デプロイ後は、未許可のブラウザからWorkerへアクセスしてCloudflare Accessで止まることを確認します。許可ユーザーでAccess認証後、以下も確認します。

```text
https://basebasll-sign-trainer-dev.refrain62.workers.dev/api/account/providers
```

期待値:

```json
{"providers":{"google":true,"line":true},"environment":"dev"}
```

### STEP 3: staging

`staging` branchへ反映すると、Cloudflare Workers Buildsがstaging Workerへdeployします。

migrationがある場合は、staging branchへ反映する前に次を実行します。

```bash
npx wrangler login
npm run db:list:staging
npm run db:migrate:staging
npm run db:list:staging
npm run db:baseline:staging -- --confirm-applied
```

その後、baseline変更を含めて`staging`へ反映します。

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

productionは`main` branchへのmergeでCloudflare Workers Buildsがdeployします。`main`への直接pushは避け、PR + CI成功 + review後にmergeする運用にします。

migrationがある場合は、mainへmergeする前にproduction DBへ適用してbaselineを更新します。

```bash
npx wrangler login
npm run db:list:prod
npm run db:migrate:prod
npm run db:list:prod
npm run db:baseline:prod -- --confirm-applied
```

productionのbaseline変更を含めてmainへmergeするとWorkers Buildsがdeployします。

---

## 9. productionデプロイ後のスモークテスト

本番deploy後は、最低限以下だけは毎回確認します。

1. `/` が200で表示される
2. `/account` が表示される
3. Google / LINE管理者ログインが開始できる
4. サンプルまたは確認用チームページ `/t/{teamId}` が表示される
5. 合言葉認証が動作する
6. `/t/{teamId}/admin` が表示される
7. `/admin` が `SYSTEM_ADMIN_SECRET` でログインでき、未認証状態ではSYSTEM管理APIが拒否される
8. チーム専用manifestが正しいチーム名・`start_url`を返す
9. 練習開始 → 回答 → 履歴保存まで動く
10. APIで500系エラーが増えていない

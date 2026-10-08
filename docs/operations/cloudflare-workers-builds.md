# Cloudflare Workers Buildsによるdev / staging / productionデプロイ

最終更新: 2026-10-03

## 方針

GitHub Actionsは通常CIを担当し、任意タイミングのデプロイ時だけCloudflare Deploy HookをPOSTします。Cloudflareへの実build/deployはWorkers Buildsへ任せ、GitHubへ`CLOUDFLARE_API_TOKEN`や`CLOUDFLARE_ACCOUNT_ID`を保存しません。

Cloudflare Workers Builds自体はCloudflare側で管理されるBuild用API tokenを使います。GitHub Secretsとして永続トークンを持たせる方式ではありません。

D1 migrationはWorkers Buildsから自動適用しません。Cloudflareが自動生成するBuild用tokenはWorker deploy向けであり、D1 migrationまで同じ権限に広げない運用にします。migrationを含むリリースだけ、手元のWrangler OAuthで先に対象DBへ適用し、`config/deployment-migrations.json`のゲートを更新してから対象branchへ反映します。

## 3環境の対応

| 環境 | Cloudflare Worker | Git branch | Build command | Deploy command |
| --- | --- | --- | --- | --- |
| dev | `basebasll-sign-trainer-dev` | `dev` | `npm run workers:build:dev` | `npm run deploy:dev` |
| staging | `basebasll-sign-trainer-staging` | `staging` | `npm run workers:build:staging` | `npm run deploy:staging` |
| production | `basebasll-sign-trainer` | `main` | `npm run workers:build:prod` | `npm run deploy:prod` |

それぞれのWorkerを同じGitHub repositoryへ接続し、Cloudflare Dashboardの **Workers & Pages → 対象Worker → Settings → Builds** でbranchとコマンドを設定します。

## Cloudflare Dashboardで1回だけ設定するもの

各Workerで次を設定します。

1. Git Repository: `refrain62/basebasll-sign-trainer`
2. Production branch: 上表のbranch
3. Root directory: repository root
4. Build command: 上表の`workers:build:*`
5. Deploy command: 上表の`deploy:*`
6. Preview builds: この3環境運用では原則OFF
7. Build variable: `SKIP_DEPENDENCY_INSTALL=1`

`SKIP_DEPENDENCY_INSTALL=1`にする理由は、依存インストールをCloudflareの自動処理と二重化せず、repository側のbuild scriptが`npm ci --ignore-scripts`を明示的に実行するためです。

`wrangler.jsonc`にも`build.command`を定義し、直接`wrangler deploy`した場合もViteの生成物と全ページのasset整合性を検査してからWorkerをbundleします。Workers BuildsはWrangler設定のCustom Buildsを使わないため、Cloudflare DashboardのBuild commandには上表の`workers:build:*`を設定し、Deploy commandには上表の`deploy:*`を設定してください。

Nodeはrepository rootの`.nvmrc` / `.node-version`で24系を指定しています。

初回接続前に、Node 24 + npm 11.6.2でlockfileを同期してcommitします。

```bash
node -v
npm -v
npm install --package-lock-only --ignore-scripts
git add package-lock.json
git commit -m "chore: sync lockfile for Node 24"
```

Workers Buildsのbuild scriptは`npm ci --ignore-scripts`を使うため、`package.json`と`package-lock.json`が不一致ならdeployしません。

## GitHub Actionsの役割

通常のpush / Pull Requestでは`.github/workflows/ci.yml`が検証だけを行います。

```text
push / Pull Request
  → Node 24
  → npm ci
  → npm run check
  → release policy diff guard
  → npm audit
```

任意タイミングで再デプロイしたい場合は`.github/workflows/manual-deploy.yml`を手動実行し、選択した環境のCloudflare Deploy HookをPOSTします。

```text
Actions → manual-deploy → Run workflow
  → dev / staging / production を選択
  → 対象GitHub EnvironmentのCLOUDFLARE_DEPLOY_HOOKを取得
  → Deploy HookへPOST
  → Workers Buildsが対応branchをbuild/deploy
```

GitHub Actionsから`wrangler deploy`、remote D1 migration、Cloudflare API token認証は実行しません。そのため`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`はGitHub Secretへ置きません。

### Deploy Hookを1回だけ設定する

Cloudflare Dashboardの **Workers & Pages → 対象Worker → Settings → Builds → Deploy Hooks** で、各Workerにbranch固定のHookを作成します。

| GitHub Environment | Cloudflare Worker | Hook branch | Environment secret |
| --- | --- | --- | --- |
| `dev` | `basebasll-sign-trainer-dev` | `dev` | `CLOUDFLARE_DEPLOY_HOOK` |
| `staging` | `basebasll-sign-trainer-staging` | `staging` | `CLOUDFLARE_DEPLOY_HOOK` |
| `production` | `basebasll-sign-trainer` | `main` | `CLOUDFLARE_DEPLOY_HOOK` |

GitHubの **Settings → Environments** で`dev` / `staging` / `production`を作り、それぞれのEnvironment secretとして同じ名前`CLOUDFLARE_DEPLOY_HOOK`に対応URLを登録します。Hook URLは知っている人がbuildを起動できるためSecretとして扱い、repositoryへ書きません。

### productionは承認後だけ実行する

`production` GitHub Environmentでは **Required reviewers** を有効にし、承認者を設定します。可能なら **Prevent self-review** も有効にします。

`manual-deploy.yml`のproduction jobは`environment: production`を参照するため、承認が通るまでjobは開始せず、production用`CLOUDFLARE_DEPLOY_HOOK`にもアクセスできません。承認後にだけDeploy HookをPOSTします。

DEV / STAGINGはRequired reviewersを付けなければ、そのまま手動実行できます。

## 通常のデプロイ

migrationがない変更はbranchへ反映するだけです。

```text
feature branch
  ↓ PR / CI

dev branch
  ↓ Workers Builds → dev

staging branch
  ↓ Workers Builds → staging

main branch
  ↓ Workers Builds → production
```

Workers Builds内では`WORKERS_CI_BRANCH`を検査し、dev Workerが`dev`以外、staging Workerが`staging`以外、production Workerが`main`以外からdeployされる設定ミスを拒否します。

## D1 migrationがある場合

永続Cloudflare tokenをGitHubへ置かない代わりに、migrationだけは対象branchへ反映する前に手元から適用します。

例: stagingへ`0026_xxx.sql`を出す場合。

```bash
npx wrangler login
npm run db:list:staging
npm run db:migrate:staging
npm run db:list:staging
npm run db:baseline:staging -- --confirm-applied
```

`config/deployment-migrations.json`の`staging`が`0026`になったことを確認し、この変更を含めて`staging` branchへ反映します。

productionなら同様です。

```bash
npx wrangler login
npm run db:list:prod
npm run db:migrate:prod
npm run db:list:prod
npm run db:baseline:prod -- --confirm-applied
```

migration fileの最新番号と対象環境のbaselineが一致しない場合、`workers-build-preflight.ts`がCloudflare deployを止めます。これにより「新コードだけ先に出てDBが古い」状態を防ぎます。

## Secret

アプリ実行時のSecretは従来どおり各Cloudflare Worker側で管理します。

- `SESSION_SECRET`
- `SYSTEM_ADMIN_SECRET`
- `PASSWORD_PEPPER`
- `DATA_ENCRYPTION_KEY`
- `DATA_LOOKUP_KEY`
- Google OAuth Secret
- LINE OAuth Secret

Build用変数とWorker runtime Secretは別物です。OAuth Secret等をBuild variableへコピーしません。

## productionの保護

通常の自動デプロイは`main`へのpushでWorkers Buildsが実行します。GitHub側では`main`を直接push不可にし、PR + CI成功 + review後にmergeする運用を推奨します。

任意タイミングの再デプロイは`manual-deploy`で`production`を選び、GitHub EnvironmentのRequired reviewers承認後にだけDeploy Hookを実行します。

D1 migrationを含む場合は、migration適用・baseline更新が済んでいないとproduction buildが失敗します。

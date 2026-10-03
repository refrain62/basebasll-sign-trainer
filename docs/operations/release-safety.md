# リリース安全確認・Git運用・コマンド

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
migration: 0025まで
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
- [ ] migrationがある場合、dev D1へ先に適用してbaseline更新
- [ ] dev branchのWorkers Build成功
- [ ] 未許可ユーザーがWorker全体へアクセスできないことを確認
- [ ] OAuth確認
- [ ] ホーム画面追加確認

### staging

- [ ] Staging Worker全体のCloudflare Access Application / Allow Policyを設定
- [ ] `REQUIRE_CF_ACCESS_FOR_ENVIRONMENT=true` を確認
- [ ] `CF_ACCESS_TEAM_DOMAIN` / Staging用 `CF_ACCESS_POLICY_AUD` を設定
- [ ] migrationがある場合、staging D1へ先に適用してbaseline更新
- [ ] staging branchのWorkers Build成功
- [ ] 未許可ユーザーがWorker全体へアクセスできないことを確認
- [ ] Google / LINEログイン確認
- [ ] チーム管理確認
- [ ] スマホ/ホーム画面追加確認

### production

- [ ] stagingと同じcommitである
- [ ] migrationがある場合、production D1へ先に適用してbaseline更新
- [ ] main branchのproduction Workers Build成功
- [ ] deploy後スモークテスト
- [ ] 問題時に戻す直前versionを把握

---

## 15. Cloudflare Workers Builds deploy

GitHub Actionsは通常`.github/workflows/ci.yml`でCIを担当し、任意デプロイ時だけ`.github/workflows/manual-deploy.yml`からCloudflare Deploy Hookを呼びます。実build/deployはdev / staging / productionすべてWorkers Buildsへ統一します。

```text
GitHub push / Pull Request
  → ci.ymlでcheck / audit

dev branch
  → Workers Builds → dev Worker

staging branch
  → Workers Builds → staging Worker

main branch
  → Workers Builds → production Worker

Actions / manual-deploy
  → 環境選択
  → Deploy Hook
  → Workers Builds
```

productionを手動実行するjobはGitHub Environment `production`を参照し、Required reviewers承認後だけ開始します。DEV / STAGINGは承認なしで任意実行できます。

GitHubには`CLOUDFLARE_API_TOKEN`や`CLOUDFLARE_ACCOUNT_ID`を保存しません。Deploy Hook URLだけを各GitHub Environmentの`CLOUDFLARE_DEPLOY_HOOK` Secretとして保存します。Cloudflare側のGit integrationとBuild用tokenでWorker deployを実行します。

D1 migrationはWorkers Buildsから自動適用せず、手元のWrangler OAuthで対象DBへ適用します。適用後に`config/deployment-migrations.json`のbaselineを更新しない限り、対象環境のWorkers Build preflightがdeployを拒否します。詳細は[`cloudflare-workers-builds.md`](cloudflare-workers-builds.md)を参照してください。

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

# 環境構成・初回セットアップ

Secret/OAuth/Access/ローカル開発は別文書へ分離しています。

## 1. 環境構成

| 環境 | Worker | D1 | 主な用途 |
|---|---|---|---|
| local | `wrangler dev --env dev` | WranglerローカルD1 | 実装・手元確認 |
| dev | `basebasll-sign-trainer-dev` | `sign-trainer-dev` | Cloudflare上での開発確認 |
| staging | `basebasll-sign-trainer-staging` | `sign-trainer-staging` | 本番前の最終確認 |
| production | `basebasll-sign-trainer` | `sign-trainer-production` | 本番 |

D1 ID は `wrangler.jsonc` に環境別で定義済みです。アプリコード側は全環境で `env.DB` だけを参照するため、コード中で環境名によるDB切り替えは行いません。

### 現在のD1 ID

```text
dev        3b47491c-8e2a-412a-b2a7-1a06922b3604
staging    2ca39d6b-e06f-44b4-862b-b0c2932d9310
production bdd534e9-1c42-4db7-adbe-c62e35e123b5
```

---

## 2. 基本ルール

1. **productionで直接修正しない**
2. 同じGit commitを `dev → staging → production` の順で昇格させる
3. D1 / Secret / OAuth callback / Cloudflare Access は環境ごとに分ける
4. migrationがあるリリースは、各環境で **migration → deploy → 動作確認** の順に進める
5. productionへ進める前に `pnpm run check` を成功させる
6. `SESSION_SECRET`、暗号鍵、pepperは環境間で使い回さない
7. `wrangler.jsonc` やGitへSecret値を書かない

---

## 3. 初回セットアップ

### 3-1. Node / pnpm

このプロジェクトは以下を前提にしています。

```text
Node.js >=24 <25
pnpm >=12 <13
```

Node.jsは24系だけをサポートします。`.nvmrc` / `.node-version`も`24`に固定し、CIもNode 24で実行します。`@types/node`も24系を使用し、DependabotではNode型定義のメジャー更新を自動提案しない設定です。

依存関係はlockfileを使って復元します。Node 24へ切り替える初回だけ、**Node 24 / pnpm 12で**lockfileのルート情報も更新してコミットしてください。

```bash
node -v   # v24.x
pnpm -v    # 12.x
pnpm install --lockfile-only --ignore-scripts
pnpm install --frozen-lockfile --ignore-scripts
```

`security-preflight`は`package.json`と`pnpm-lock.yaml`の依存関係・devDependency・Node/pnpm engineが一致していることも検査します。

### 3-2. Cloudflareへログイン

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

`whoami` で対象のCloudflareアカウントが表示されることを確認してください。

---

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
5. productionへ進める前に `npm run check` を成功させる
6. `SESSION_SECRET`、暗号鍵、pepperは環境間で使い回さない
7. `wrangler.jsonc` やGitへSecret値を書かない

---

## 3. 初回セットアップ

### 3-1. Node / npm

このプロジェクトは以下を前提にしています。

```text
Node.js >=22.12 <25
npm >=10 <12
```

依存関係はlockfileを使って復元します。

```bash
npm ci --ignore-scripts
```

### 3-2. Cloudflareへログイン

```bash
npx wrangler login
npx wrangler whoami
```

`whoami` で対象のCloudflareアカウントが表示されることを確認してください。

---

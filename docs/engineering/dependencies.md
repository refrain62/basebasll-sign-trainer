# 依存関係・Node.js更新ポリシー

この文書は、Dependabotや手動のnpm依存更新を安全に処理するためのルールです。通常の機能開発では読みません。

## 基準

現在の依存更新基準（2026-10-03）は `hono 4.13.11`、`vitest/@vitest/coverage-v8 5.0.2`、`@types/node 22.20.5`、`wrangler 4.143.0`。Dependabot PRを取り込む際も、別依存のダウングレードをlockfileへ混入させない。

- 実行・CIのNode.jsは **22系** に固定する。
- `package.json` の `engines.node` は `>=22.12 <23` とする。
- `@types/node` もNode 22系に合わせる。実行環境より新しいメジャーの型定義へ先行更新しない。
- `vitest` と `@vitest/coverage-v8` は必ず同一バージョンにする。
- 直接依存は `^` / `~` を使わず完全固定し、`package-lock.json` をGit管理する。
- CI/ローカルの再現確認は `npm ci --ignore-scripts` を使う。

## Dependabot

- `@types/node` のメジャー更新は自動PR対象外にする。Node本体を上げる変更と同じPR/変更セットで更新する。
- `vitest` と `@vitest/*` は同一グループで更新し、バージョンずれを作らない。
- patch/minorでも `npm run check` と `npm audit --audit-level=high` が通ることを確認する。

## lockfileの更新

依存バージョンを変更したら `npm run dependency:sync` で `package-lock.json` を再生成し、続けて `npm ci --ignore-scripts` と `npm run check` を実行する。Dependabot PRのlockfileに、別依存の意図しないダウングレードが混ざっていないことも確認する。

## 自動検査

`npm run dependency:policy` は次を検査する。

1. 直接依存が完全固定されていること。
2. Node engine / GitHub Actions / `@types/node` がNode 22で揃っていること。
3. `vitest` と `@vitest/coverage-v8` が同一バージョンであること。
4. `package-lock.json` のroot依存が `package.json` と一致すること。
5. DependabotにNode型のメジャー更新抑止とVitestグループ設定があること。

`npm run check` とdeploy前処理の両方から実行する。依存更新時はこの検査を弱めて通すのではなく、実行環境と依存の組み合わせ自体を整える。

## Nodeメジャーを上げる場合

Node 23以降へ移行する場合は、`engines.node`、GitHub Actionsの`node-version`、`@types/node`、ローカル開発文書を同じ変更で更新し、Windows上のWrangler/D1も含めて回帰確認する。

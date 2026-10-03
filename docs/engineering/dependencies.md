# 依存関係・Node.js更新ポリシー

この文書はDependabotや手動のnpm依存更新を安全に処理するためのルールです。通常の機能開発では読みません。

## 現在の実行基準

SIGN TRAINERはNode.js 24 / npm 11を実行基準にします。正本は`package.json`とrootのNode指定ファイルです。

- Node.js: `>=24 <25`
- npm: `>=11 <12`
- package manager: `npm@11.6.2`
- `@types/node`: Node 24系に固定
- `vitest`と`@vitest/coverage-v8`: 同一バージョンを使用
- 直接依存は意図しないmajor更新を避ける
- `package-lock.json`をGit管理し、CI/Workers Buildsでは`npm ci --ignore-scripts`を使う

現在の具体的な依存バージョンは`package.json`を正本とし、この文書へ重複して固定値を列挙しません。

## Dependabot

- `@types/node`のmajor更新は、Node本体を上げる変更とは分離しない。
- `vitest`と`@vitest/*`は同一グループで更新する。
- GitHub ActionsもDependabotで監視し、Action内部runtimeの非推奨化を放置しない。
- patch/minor更新でも`npm run check`と`npm audit --audit-level=high`を通す。

## GitHub Actions

CI runnerは`ubuntu-24.04`へ固定し、Node 24 runtimeのAction世代を使います。

- `actions/checkout@v5`
- `actions/setup-node@v5`
- `node-version: 24`

`ubuntu-latest`は将来のrunner OS切替で挙動が変わるため使用しません。

## lockfile更新

依存を変更したらNode 24 / npm 11環境でlockfileを更新し、そのlockfileをcommitします。

```bash
npm install --package-lock-only --ignore-scripts
npm ci --ignore-scripts
npm run check
npm audit --audit-level=high
```

Dependabot PRでも、対象外依存の意図しないダウングレードやmajor更新が`package-lock.json`へ混ざっていないことを確認します。

## Nodeメジャーを上げる場合

Node 25以降へ移行する場合は、少なくとも次を同じ変更セットで更新します。

- `package.json`の`engines.node`
- `.nvmrc` / `.node-version`
- GitHub Actionsの`node-version`
- `@types/node`
- `scripts/runtime-version-check.ts`
- `scripts/security-preflight.ts`
- ローカル開発・テスト文書

Node本体だけを先行更新しません。

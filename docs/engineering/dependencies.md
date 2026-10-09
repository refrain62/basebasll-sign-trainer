# 依存関係・Node.js更新ポリシー

この文書はDependabotや手動のpnpm依存更新を安全に処理するためのルールです。通常の機能開発では読みません。

## 現在の実行基準

SIGN TRAINERはNode.js 24 / pnpm 12を実行基準にします。正本は`package.json`とrootのNode指定ファイルです。

- Node.js: `>=24 <25`
- pnpm: `>=12 <13`
- package manager: `pnpm@12.10.0`
- `@types/node`: Node 24系に固定
- `vitest`と`@vitest/coverage-v8`: 同一バージョンを使用
- 直接依存は意図しないmajor更新を避ける
- `pnpm-lock.yaml`をGit管理し、CI/Workers Buildsでは`pnpm install --frozen-lockfile --ignore-scripts`を使う

現在の具体的な依存バージョンは`package.json`を正本とし、この文書へ重複して固定値を列挙しません。

## Dependabot

- `@types/node`のmajor更新は、Node本体を上げる変更とは分離しない。
- `vitest`と`@vitest/*`は同一グループで更新する。
- GitHub ActionsもDependabotで監視し、Action内部runtimeの非推奨化を放置しない。
- patch/minor更新でも`pnpm run check`と`pnpm audit --audit-level=high`を通す。

## GitHub Actions

CI runnerは`ubuntu-24.04`へ固定し、Node 24 runtimeのActionを使います。リモートActionの`uses:`参照は40桁の小文字commit SHAで固定し、同じ行にDependabotが追跡できるリリース番号コメント`# vMAJOR.MINOR.PATCH`を残します。短縮SHA、数字タグ、コメントのないSHAはpreflightと回帰テストで拒否します。

SHAはActionの公式リポジトリで対応するリリースタグが指すコミットと照合してから採用します。たとえば[actions/checkoutのv7.0.1リリース](https://github.com/actions/checkout/releases/tag/v7.0.1)と[actions/setup-nodeのv7.0.0リリース](https://github.com/actions/setup-node/releases/tag/v7.0.0)のコミットSHAを確認し、workflowの同じ行に`# v7.0.1` / `# v7.0.0`を付けます。

- `node-version: 24`

`ubuntu-latest`は将来のrunner OS切替で挙動が変わるため使用しません。

## lockfile更新

依存を変更したらNode 24 / pnpm 12環境でlockfileを更新し、そのlockfileをcommitします。

```bash
pnpm install --lockfile-only --ignore-scripts
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check
pnpm audit --audit-level=high
```

Dependabot PRでも、対象外依存の意図しないダウングレードやmajor更新が`pnpm-lock.yaml`へ混ざっていないことを確認します。

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

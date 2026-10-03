# Testing strategy — v1.5.37

SIGN TRAINERはVitest + TypeScript + Vite production build + tooling checksを`npm run check`でまとめて実行する。

## Runtime baseline
- ローカル/CI/リリース作業はNode.js 24.x + npm 11.xに統一する。
- GitHub Actions runnerは`ubuntu-24.04`へ固定し、`actions/checkout@v5` / `actions/setup-node@v5`を使用する。これらv5 action自体もNode 24 runtimeで動作するため、旧Node 20 action runtime警告を出さない。
- `ubuntu-latest`は将来のrunner OS切替で挙動が変わるため使用しない。GitHub Actions dependencyはDependabotでも監視する。
- `npm run runtime:check`でNode majorを検証し、`npm run check`の先頭でも実行する。
- `@types/node`は24系に固定し、Node 25/26向け型定義へ先行更新しない。
- `tests/unit/node24-runtime-regression.test.ts`でNode 24固定がCI/engines/Dependabotから外れないことを回帰確認する。

```bash
npm ci --ignore-scripts
npm run check
npm run test:coverage
```

## 必須回帰観点

### Plan / Entitlement
- Free: 複数グループ不可、複数動画不可、サブ管理者不可、分析不可、監査表示不可
- Plus: サイン最大20個・グループ最大3つ・複数動画・動画開始位置・サブ管理者可、分析・監査は不可
- Pro: Plus機能 + 分析・監査可
- Plus: `result_text_share`可、`result_image_share`不可
- Pro: `result_text_share` / `result_image_share`可
- OAuthはFreeでも利用可
- SYSTEM管理からFree / Plus / Proを変更できる
- ダウングレードで既存データを削除しない

### サイングループ
- Freeで最初の1グループは作成できる
- Freeで2つ目はサーバー側でも拒否する
- Plus / Proは複数作成可能
- 登録モーダルの使用例選択で名称・説明へ反映する

### 動画
- Freeは1サイン1動画
- Plus / Proは複数動画
- YouTube標準サムネイル表示
- Plus / Proのみプレビュー開始位置を保存可能
- グループ説明動画には秒指定を持たせない

### Pro分析
- Plusでは詳細分析ページをロック
- Proではグループ／サイン／動画別集計を表示
- 苦手判定は原則3回答以上
- 履歴画面はサマリー、詳細は専用ページ

### 監査・退会
- activity APIはProのみ
- チーム退会はメイン管理者のみ
- 退会は論理削除、SYSTEMから復活可能
- 退会・復活・プラン変更を監査ログへ記録

## UI checks
- PC管理画面の左サイドメニュー
- スマホの全画面メニューが本文の下へ潜らない
- 一覧ページャー・検索・フィルター
- 375px幅でカード枠・余白が重ならない

### 有償機能の直アクセス耐性
- Freeで`/api/premium-module?module=result-text`を直接叩いて403
- Plusで`module=analytics` / `module=result-image`を直接叩いて403
- Proで`analytics` / `result-text` / `result-image`を取得可能
- `client/team.ts`にPro分析アルゴリズム本体を同梱しない
- DevToolsで`state.entitlements`相当を改変してもpremium module取得時のサーバー判定を突破できない

## Migration
空DBへ`0001`〜`0025`を順番に適用できることを確認する。既存DBを想定し、ALTER/UPSERTの再適用方針も確認する。
## Documentation / release governance
- `npm run docs:check`でREADME肥大化、`docs/INDEX.md`未登録文書、主要Markdownのリンク切れを検出する。
- `npm run release:policy`で`changes/*.json`とmajor向けSYSTEMお知らせmigrationを検証する。
- PR / direct pushのCIでは差分を見て、利用者向けコード変更に`changes/*.json`が伴うことを検証する。
- `tests/unit/release-governance.test.ts`で上記ガードが通常チェックから外れないことを回帰確認する。


## Deployment governance
- GitHub ActionsはCloudflare API credential・`wrangler deploy`・remote D1 migrationを持たない。任意デプロイはEnvironment secretのDeploy Hook URLへPOSTするだけとし、実deployはWorkers Buildsへ任せる。
- dev / staging / productionのWorkers Builds用build scriptとbranch対応を`tests/unit/cloudflare-workers-builds-regression.test.ts`で固定する。
- `scripts/workers-build-preflight.ts`は`WORKERS_CI_BRANCH`と対象環境を照合し、誤branchからのdeployを拒否する。
- repository最新migrationと`config/deployment-migrations.json`の対象環境baselineが一致しない場合はdeployを拒否する。
- `.github/workflows/manual-deploy.yml`はdev / staging / productionの3 Environmentを参照し、productionはGitHub EnvironmentのRequired reviewersで承認後にだけHook Secretへアクセスする運用とする。

## Client source artifact policy
- `public/`直下の手書き/旧生成JavaScriptは原則禁止し、Vite build前に`scripts/clean-client-artifacts.ts`で削除する。
- PWAのService Worker `public/sw.js`だけはVite entryとは別の静的runtime assetとして明示的に許可する。
- `scripts/client-source-check.ts`は`sw.js`以外の`public/*.{js,mjs,cjs}`が残っていれば失敗する。
- `tests/unit/client-source-policy-regression.test.ts`でこの例外とbuild前cleanupが外れないことを回帰確認する。
- 参照用・旧画像は`public/`へ置かず`docs/assets/reference-unused/`へ退避し、配信画像だけをimage budgetの対象にする。
- LPの大きな写真素材は表示サイズに合わせて縮小・WebP再圧縮し、`npm run tooling:check`の1画像160 KiB / 合計1200 KiB制限を維持する。

## Static asset cleanup
- `npm run build:client`の前に`scripts/clean-client-artifacts.ts`を実行し、旧Vite直書きJS、過去版の重量PNG、未使用の旧WebP/参考画像を削除する。
- 現行配信画像はWebP/JPEG等の軽量版を正とし、重量PNGに加えて旧install結合WebP、旧recommend/ref画像など現在のページから参照されない画像をpublicへ戻さない。ZIPを既存Git作業ツリーへ上書きしてもcleanupがこれらを除去する。
- `scripts/image-budget-check.ts`で1画像160 KiB、public画像合計1.2 MiB以下を回帰確認する。

## Regression fixture maintenance
- UI文言・共有component・Node/runtime方針を変更した場合、実装を旧仕様へ戻してテストを通すのではなく、現行の正本に合わせて回帰テストのfixture/期待値を更新する。
- `render-vite-pages.ts`のunit fixtureは`pages/components/`の共有componentも用意し、本番render条件と同じ前提で確認する。
- CSP回帰テストは`pages/`/`client/`のinline styleを禁止するため、余白などはCSS classで指定する。

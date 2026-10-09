# Testing strategy — v1.5.37

SIGN TRAINERはVitest + TypeScript + Vite production build + tooling checksを`pnpm run check`でまとめて実行する。

## Runtime baseline
- ローカル/CI/リリース作業はNode.js 24.x + pnpm 12.xに統一する。
- GitHub Actions runnerは`ubuntu-24.04`へ固定し、リモートActionの`uses:`参照を40桁の小文字commit SHAと同じ行の`# vMAJOR.MINOR.PATCH`コメントで固定する。preflightと回帰テストで数字タグ、短縮SHA、コメントなしの参照を拒否する。
- `ubuntu-latest`は将来のrunner OS切替で挙動が変わるため使用しない。GitHub Actions dependencyはDependabotでも監視する。
- `pnpm run runtime:check`でNode majorを検証し、`pnpm run check`の先頭でも実行する。
- `@types/node`は24系に固定し、Node 25/26向け型定義へ先行更新しない。
- `tests/unit/node24-runtime-regression.test.ts`でNode 24固定がCI/engines/Dependabotから外れないことを回帰確認する。

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check
pnpm run test:coverage
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
- `pnpm run docs:check`でREADME肥大化、`docs/INDEX.md`未登録文書、主要Markdownのリンク切れを検出する。
- `pnpm run release:policy`で`changes/*.json`とmajor向けSYSTEMお知らせmigrationを検証する。
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
- LPの大きな写真素材は表示サイズに合わせて縮小・WebP再圧縮し、`pnpm run tooling:check`の1画像160 KiB / 合計1200 KiB制限を維持する。

## Static asset cleanup
- `pnpm run build:client`の前に`scripts/clean-client-artifacts.ts`を実行し、旧Vite直書きJS、過去版の重量PNG、未使用の旧WebP/参考画像を削除する。
- 現行配信画像はWebP/JPEG等の軽量版を正とし、重量PNGに加えて旧install結合WebP、旧recommend/ref画像など現在のページから参照されない画像をpublicへ戻さない。ZIPを既存Git作業ツリーへ上書きしてもcleanupがこれらを除去する。
- `scripts/image-budget-check.ts`で1画像160 KiB、public画像合計1.2 MiB以下を回帰確認する。

## Regression fixture maintenance
- UI文言・共有component・Node/runtime方針を変更した場合、実装を旧仕様へ戻してテストを通すのではなく、現行の正本に合わせて回帰テストのfixture/期待値を更新する。
- `render-vite-pages.ts`のunit fixtureは`pages/components/`の共有componentも用意し、本番render条件と同じ前提で確認する。
- CSP回帰テストは`pages/`/`client/`のinline styleを禁止するため、余白などはCSS classで指定する。

## Playwright E2E regression tests

ブラウザで実際のWorkerを通して確認する回帰テストはPlaywrightで行う。Unit testの文字列確認だけでは見つけにくい「ページの生成漏れ」「Worker routeと静的HTMLの不整合」「LP内リンク切れ」「build後assetの404」「共有ナビゲーションの動作不良」「モバイルでの横はみ出し」を対象にする。

Playwright Testは`@playwright/test`を固定バージョンでdevDependencyに置き、`pnpm-lock.yaml`にも固定する。`pnpm install --frozen-lockfile`のあと、初回またはブラウザ更新時にChromiumを導入する。

```bash
# Node 24 / pnpm 12
pnpm install --frozen-lockfile --ignore-scripts
pnpm run e2e:install
pnpm run typecheck:e2e
pnpm run test:e2e

# 画面を見ながら確認
pnpm run test:e2e:headed

# HTML reportを開く
pnpm run test:e2e:report
```

通常はPlaywrightが`http://127.0.0.1:8787`で専用の`wrangler dev --env dev`を自動起動する。起動前に`.wrangler/e2e-state`を作り直してD1 migrationを適用し、E2E専用の固定テストSecretをCLI変数として注入するため、普段のローカルD1や`.dev.vars`を汚さない。既存サーバーの再利用もしない。

`PLAYWRIGHT_BASE_URL`を指定するとPlaywright側のlocal webServer起動を行わず、公開ページの確認を外部環境へ向けられる。ただし、システム管理・チーム管理のE2Eはチーム作成や更新などデータ変更を伴うため、**`PLAYWRIGHT_BASE_URL`を指定した時点で自動skip**する（localhost指定でもskip）。管理E2EはPlaywright自身が起動した隔離サーバー＋専用D1でのみ実行し、外部dev/staging/productionや普段のローカルDBへテストデータを作らない。

CIでは通常の`checks` job成功後にE2E jobを実行し、Chromiumを導入してdesktop 1440px / mobile 390pxの2条件を確認する。失敗時はPlaywrightのtrace・screenshot・videoを`test-results/`、HTML reportを`playwright-report/`へ生成し、GitHub Actionsでは14日間のfailure artifactとして保存する。

### E2Eで固定する回帰条件

- `/`, `/plans`, `/install`, `/support`と法務系LPが実Worker経由でHTTP 200かつHTMLを返す。
- `/plans/`・`/plans.html`、`/install/`・`/install.html`も含め、過去障害の「ページを読み込めませんでした。」を再発させない。
- LPから見える同一originリンクを巡回し、4xx/5xxや存在しないfragmentを検出する。
- 各LPが参照する同一originの画像・CSS・JS・manifest等に4xx/5xxがない。
- uncaught JavaScript error、`console.error`、同一originのHTTP 4xx/5xxをテスト失敗にする。
- desktop共有ナビゲーション、mobile hamburger navigation、トップの共有ダイアログ、料金比較表、FAQ展開が実ブラウザで動く。
- desktop/mobileともbody全体の意図しない横スクロールを許可しない。料金比較表など局所的な横スクロール領域は可。
- SYSTEM管理はログイン、チーム新規登録、プラン変更、退会・復活、お知らせ公開・削除、データ保護ステータス表示を実ブラウザ＋ローカルD1で確認する。
- チーム管理はログイン後の`dashboard/activity/groups/signs/share/admins/plan-auth/notices/settings`を巡回し、セッション維持と表示崩れを確認する。
- ProテストチームをE2E内で作成し、サイングループ／サインの作成・編集・削除、動画の編集・複数追加・削除・開始秒指定、チーム名設定変更を実APIまで通して確認する。
- mobileではSYSTEM管理とチーム管理のハンバーガーメニューから実際に画面遷移でき、横スクロールが発生しないことを確認する。

# Testing strategy — v1.5.34

SIGN TRAINERはVitest + TypeScript + Vite production build + tooling checksを`npm run check`でまとめて実行する。

```bash
npm ci --ignore-scripts
npm run check
npm run test:coverage
```

## 必須回帰観点

### Plan / Entitlement
- Free: 複数グループ不可、複数動画不可、サブ管理者不可、分析不可、監査表示不可
- Plus: 複数グループ・複数動画・動画開始位置・サブ管理者可、分析・監査は不可
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
空DBへ`0001`〜`0017`を順番に適用できることを確認する。既存DBを想定し、ALTER/UPSERTの再適用方針も確認する。

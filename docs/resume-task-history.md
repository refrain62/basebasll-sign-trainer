# 完了タスク履歴

## 2026-10-09 E2E・pnpm対応の昇格

### 実施内容

- 添付の`basebasll-sign-trainer-main-playwright-admin-e2e-20261009.zip`から管理画面Playwright E2Eとpnpm対応を取り込み、PR #41で`develop`へマージした。merge commit: `bb89444251243eade090eacc9591b840524c699d`。
- PR #42で`develop`から`dev`へ昇格した。merge commit: `2dff390af96d59e6779c2c48101d571b4363396f`。
- Cloudflare Dev WorkerのProduction branchを`dev`へ変更し、Preview buildsをOFFにした。
- `dev`から`staging`へのPR #43は競合したため閉じた。昇格用ブランチでstagingの既存履歴を統合し、pnpm lockfileへの移行と依存ポリシーテストの現行版を保持してPR #44から`staging`へマージした。merge commit: `45f8f55dd33fe7cee7a6cec44567bfb69cddbf69`。
- PR #45で`staging`から`main`へ昇格した。merge commit: `baec736b470a7955978b5aaa54b75f8b1791c865`。

### 検証結果

- PR #41、#42、#44、#45でCIとPlaywright E2Eが成功した。
- Devのマージ後CI/E2E run `37942987272`が成功した。
- Stagingのマージ後CI/E2E run `37944641323`が成功した。Cloudflare Build `24dbfd57-30b1-4985-ab51-e63c9b51a2a9`は成功し、Version `ac175240-01a5-42c0-ab1a-9eb34d2996b9`をデプロイした。
- Mainのマージ後CI/E2E run `37945242387`が成功した。Cloudflare Build `5c2d7efe-f7ac-4da4-8342-bbedccb8c8f9`は成功し、Version `5292596c-2069-497d-a2f0-4bd21c4d387c`が本番のアクティブVersionになった。Workerの公開トップページが表示されることも確認した。

### 未完了の停止条件

DevのCloudflare Build `8b19467b-4e32-4f52-b31e-0708cb92a2e0`は、Workerに必要なSecretが不足して失敗した。エラーに表示された名前は`DATA_ENCRYPTION_KEY`、`DATA_LOOKUP_KEY`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`SESSION_SECRET`、`SYSTEM_ADMIN_SECRET`。値はこの記録へ保存していない。

Dev側のSecret設定と再デプロイ確認が残っているため、停止条件と再開手順を[作業再開リスト](resume-task-list.md)に残す。

## 2026-10-24 セキュリティ監査と対策

### 確認結果

- 依存監査で、`zod`のメモリ枯渇とWrangler配下`undici`のサービス拒否につながるHigh脆弱性を確認した。Moderateを含めて合計4件だった。
- 認証試行回数の更新が読取と書込に分かれており、並列試行でカウントを取りこぼしてレート制限を回避できる問題を確認した。
- Entitlement取得失敗時にサブ管理者上限を5名として扱い、一時障害時に管理者招待を許可し得るフェイルオープンを確認した。
- 認可、テナント境界、CSRF、OAuth、セッション、XSS、秘密情報の主要経路を敵対的に確認し、上記以外のCritical / High / Medium指摘はなかった。

### 対策と検証

- 実装Draft PR #65で、レート制限をD1の原子的なUPSERTへ変更し、Entitlement取得失敗を`503`で拒否するようにした。
- `zod`を`4.6.6`へ更新し、`undici`を`7.30.1`へ固定した。再監査では既知脆弱性0件を確認した。
- `pnpm test`は67ファイル268テスト、`pnpm build`、`npm run check`が成功した。
- 独立した敵対的再レビューで、Critical / High / Mediumの残存指摘がないことを確認した。

### 継続条件

- PR #65はレビュー用Draftとして作成した。CIと人間のレビュー後に`develop`へマージする。
- 実D1での並列レート制限テストは低優先の追加検証候補とする。現行のSQL構文と境界条件はレビュー済み。

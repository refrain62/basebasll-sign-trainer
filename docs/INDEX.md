# SIGN TRAINER ドキュメント索引

このファイルは「どの文書を読むか」を決めるための索引です。AIも開発者も、作業開始時に全ドキュメントを一括で読まず、下表から必要なものだけ開いてください。

| 目的 | 読むファイル | 更新するタイミング |
| --- | --- | --- |
| 現在の機能・ユーザー・プラン仕様 | [`product/spec.md`](product/spec.md) | 利用者向け仕様が変わるとき |
| SYSTEMお知らせの内容・過去アップデート一覧 | [`product/system-notices.md`](product/system-notices.md) | お知らせ追加・過去分整備・文章ルール変更時 |
| Plus / Pro・将来の課金設計 | [`product/plans.md`](product/plans.md) | プラン/Entitlement/価格方針が変わるとき |
| Route / Controller / Service / Repository設計 | [`engineering/architecture.md`](engineering/architecture.md) | 技術境界や主要構成が変わるとき |
| テスト戦略・必須回帰 | [`engineering/testing.md`](engineering/testing.md) | テスト方針・重要回帰条件が変わるとき |
| 依存関係・Node.js更新 | [`engineering/dependencies.md`](engineering/dependencies.md) | pnpm/Node/Dependabot/GitHub Actionsの依存方針が変わるとき |
| 変更影響判定・SYSTEMお知らせmigration | [`engineering/change-policy.md`](engineering/change-policy.md) | **利用者向け変更を行うたび確認** |
| 環境構成・初回セットアップ | [`operations/environment-overview.md`](operations/environment-overview.md) | Worker/D1構成や初回準備が変わるとき |
| Secret・Google / LINE OAuth | [`operations/secrets-oauth.md`](operations/secrets-oauth.md) | Secret/OAuth設定が変わるとき |
| Cloudflare Access | [`operations/cloudflare-access.md`](operations/cloudflare-access.md) | Dev/Staging Access設定が変わるとき |
| ローカル開発・PBKDF2 | [`operations/local-development.md`](operations/local-development.md) | ローカル起動/暗号実装上限が変わるとき |
| dev→staging→production | [`operations/deploy.md`](operations/deploy.md) | デプロイ順序・スモークテストが変わるとき |
| Cloudflare Workers Builds deploy | [`operations/cloudflare-workers-builds.md`](operations/cloudflare-workers-builds.md) | dev/staging/productionのbranch・build/deploy設定が変わるとき |
| Google Search Console / SEO | [`operations/search-console-seo.md`](operations/search-console-seo.md) | verification・index対象・canonical・robots/sitemapが変わるとき |
| D1 migration・rollback | [`operations/migrations-rollback.md`](operations/migrations-rollback.md) | DB変更/復旧方針が変わるとき |
| リリース安全確認・Git・コマンド | [`operations/release-safety.md`](operations/release-safety.md) | チェックリスト/Git/CI運用が変わるとき |
| 公開前/日常運用チェック | [`operations/checklist.md`](operations/checklist.md) | 運用確認項目が変わるとき |
| セキュリティ方針 | [`security/hardening.md`](security/hardening.md) | 認証・認可・Cookie・CSRF等が変わるとき |
| 暗号化・pepper・鍵ローテーション | [`security/data-protection.md`](security/data-protection.md) | 保存データ保護方式が変わるとき |
| UI原則・デザイン資産 | [`design/ui.md`](design/ui.md) | UI原則・共通デザインが変わるとき |
| 過去build履歴（通常は読まない） | [`history/legacy-readme-build-notes.md`](history/legacy-readme-build-notes.md) | 過去経緯を保存するときだけ |
| 作業の再開・停止条件 | [`resume-task-list.md`](resume-task-list.md) | 作業中タスクの再開時・状態更新時 |
| 完了タスクの実施・検証履歴 | [`resume-task-history.md`](resume-task-history.md) | 完了タスクの記録、再検証、監査時 |

## 旧パス互換ドキュメント

過去のURLやGit履歴から参照される旧パスは、古い内容を残さず現行の正本へ誘導する短い互換文書だけを置きます。通常の実装では読みません。

- [`CLOUDFLARE_ENVIRONMENT_RUNBOOK.md`](CLOUDFLARE_ENVIRONMENT_RUNBOOK.md)
- [`architecture.md`](architecture.md)
- [`data-protection.md`](data-protection.md)
- [`design.md`](design.md)
- [`monetization.md`](monetization.md)
- [`operations.md`](operations.md)
- [`security-hardening.md`](security-hardening.md)
- [`spec.md`](spec.md)
- [`testing.md`](testing.md)

## 画像資料

- [`assets/reference-lp.webp`](assets/reference-lp.webp): LP参照画像。UI実装の正本ではありません。

## 文書メンテナンスの原則

1. READMEへ詳細仕様を増やさず、目的別ドキュメントへ書く。
2. 同じ事実を複数ファイルへ重複記載しない。必要ならリンクする。
3. 利用者向け仕様変更では`product/spec.md`を更新する。
4. セキュリティ/運用だけの変更では、関係する文書だけ更新する。
5. 新しいMarkdown文書を追加したら、このINDEXへ必ず登録する。`pnpm run docs:check`が未登録文書を検出する。
6. 古い履歴は`history/`へ移し、現行仕様文書に混ぜない。

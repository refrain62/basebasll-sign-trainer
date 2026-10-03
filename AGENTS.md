# AI / coding agent rules for SIGN TRAINER

1. 最初に`README.md`と`docs/INDEX.md`だけ読む。全docsを一括ロードしない。
2. `docs/INDEX.md`から、今回の変更に必要な文書だけ追加で読む。
3. 開発・テスト・migration・deployのNode.jsは24系、npmは11系を使用する。Node 22/26へ切り替えて問題回避しない。`.nvmrc` / `.node-version` / CI / `@types/node`をNode 24に揃える。
4. 現行仕様は`docs/product/spec.md`を正とし、過去経緯が必要な場合だけ`docs/history/`を読む。
5. UI/機能変更では既存デザインを局所修正し、依頼のない全面再設計をしない。
6. 利用者に見える変更を行う前に`docs/engineering/change-policy.md`を読み、`changes/*.json`へ影響度を宣言する。
7. `impact: "major"`の利用者向けアップデートでは、**同じ変更でSYSTEMお知らせを`published`としてINSERTする新規D1 migrationを必ず作成する**。既存migrationの書き換えは禁止。
8. SYSTEMお知らせの本文は、内部用イベント名や実装用語ではなく、利用者が理解できる日本語にする。お知らせを追加・修正するときだけ`docs/product/system-notices.md`を読み、過去分との重複も確認する。
9. 変更後は`npm run check`を通す。PRではCIのrelease policy diff guardも通す。
10. ドキュメントは関係する目的別ファイルだけ更新し、READMEへbuild履歴を追記しない。

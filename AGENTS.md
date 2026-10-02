# AI / coding agent rules for SIGN TRAINER

1. 最初に`README.md`と`docs/INDEX.md`だけ読む。全docsを一括ロードしない。
2. `docs/INDEX.md`から、今回の変更に必要な文書だけ追加で読む。
3. 現行仕様は`docs/product/spec.md`を正とし、過去経緯が必要な場合だけ`docs/history/`を読む。
4. UI/機能変更では既存デザインを局所修正し、依頼のない全面再設計をしない。
5. 利用者に見える変更を行う前に`docs/engineering/change-policy.md`を読み、`changes/*.json`へ影響度を宣言する。
6. `impact: "major"`の利用者向けアップデートでは、**同じ変更でSYSTEMお知らせを`published`としてINSERTする新規D1 migrationを必ず作成する**。既存migrationの書き換えは禁止。
7. SYSTEMお知らせの本文は、内部用イベント名や実装用語ではなく、利用者が理解できる日本語にする。
8. 変更後は`npm run check`を通す。PRではCIのrelease policy diff guardも通す。
9. ドキュメントは関係する目的別ファイルだけ更新し、READMEへbuild履歴を追記しない。

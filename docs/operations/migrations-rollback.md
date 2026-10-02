# D1 migration・ロールバック

利用者向け大規模更新のSYSTEMお知らせmigrationルールは [`../engineering/change-policy.md`](../engineering/change-policy.md) を参照してください。

## 10. migration運用

migrationは必ず番号を追加して管理し、既に適用済みのSQLを書き換えないでください。

通常の流れ:

```text
local migration
  ↓
dev migration → dev deploy → 確認
  ↓
staging migration → staging deploy → 確認
  ↓
production migration → production deploy → 確認
```

破壊的変更（DROP / 大量UPDATE / データ変換）がある場合は、productionへ適用する前にD1のバックアップ・復旧方法を確認し、stagingで同等データ量の動作確認を行ってください。

---

## 11. ロールバック方針

### Workerコードだけ問題がある場合

CloudflareのDeployment Historyから直前の正常なWorker versionへ戻します。

その後、原因修正を **dev → staging → production** の順で再度進めます。

### migrationも含む問題の場合

DB変更はWorkerのロールバックだけでは元に戻りません。

そのため、migrationは原則として後方互換を保ちます。

推奨:

```text
1. 新しいカラム/テーブルを追加
2. 新旧どちらでも動くコードをdeploy
3. データ移行
4. 十分確認後に古い構造を整理
```

緊急時に「コードだけ戻したらDB構造が合わない」状態を避けるためです。

---

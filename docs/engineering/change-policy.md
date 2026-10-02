# 変更影響・SYSTEMお知らせルール

## 目的

利用者向けの大きな変更が、告知なしでproductionへ入ることを防ぐ。AI・人間のどちらが実装しても同じ判断手順を使う。

## 変更のたびに行うこと

利用者に見えるコード（`client/`, `pages/`, UI CSS、利用者向けController/Service等）を変更する場合は、`changes/<id>.json`を同じPR/変更セットで追加する。

例:

```json
{
  "id": "2026-10-02-team-admin-name",
  "summary": "チームごとの管理者名を設定できるようにする",
  "impact": "major",
  "docs": ["docs/product/spec.md"],
  "noticeMigration": "migrations/0025_notice_team_admin_name.sql"
}
```

`impact`は`none` / `minor` / `major`のいずれか。

## major とする基準

次のいずれかに該当する場合は原則`major`とする。

- 新しい主要機能、または既存の主要操作フローを変える
- ログイン、認証、権限、管理者、招待など利用方法が変わる
- Free / Plus / Proの機能・上限・提供条件が変わる
- 利用者が知っておくべきデータ移行や保存仕様の変更がある
- ナビゲーションや画面構成を広範囲に変更する
- 利用者が「何が変わったのか」を事前/事後に知る価値が高い

単純な文言修正、局所的な見た目調整、利用方法を変えない不具合修正は通常`minor`。内部リファクタ・テスト・ドキュメントだけなら`none`。

迷う場合は`major`を選ぶ。

## major の必須条件

お知らせの文章ルール・過去分の正本は[`../product/system-notices.md`](../product/system-notices.md)を参照する。

`impact: "major"`では`noticeMigration`を必須とし、そのmigrationは`system_notices`へ公開お知らせをINSERTする。

```sql
INSERT INTO system_notices(
  title, body, kind, status, publish_at, expires_at, updated_at
) VALUES (
  '新機能のお知らせ',
  '利用者が理解できる日本語で変更内容を説明します。',
  'update',
  'published',
  CURRENT_TIMESTAMP,
  NULL,
  CURRENT_TIMESTAMP
);
```

- `kind`: 通常は`update`。重要な変更は`important`。
- `status`: 必ず`published`。
- `publish_at`: 原則`CURRENT_TIMESTAMP`。
- 内部イベント名・DB名・API名だけで説明しない。
- migrationはschema変更がなくても「お知らせ配布」のために作成してよい。

生成コマンド:

```bash
npm run release:notice -- --slug feature-name --title "新機能のお知らせ" --body "変更内容"

# 過去分を登録するときだけ公開日時を明示
npm run release:notice -- --slug historical-feature --title "過去のお知らせ" --body "変更内容" --publish-at "2026-09-26T00:00:00Z"
```

## 自動チェック

`npm run release:policy`は全`changes/*.json`を検証する。

PRのCIではさらに差分を確認し、以下を失敗させる。

- 利用者向けコードを変更したのに、新しい`changes/*.json`がない
- `major`なのに`noticeMigration`がない
- 指定migrationが同じ差分に含まれない
- migrationに`INSERT INTO system_notices` / `published` / `update|important`がない
- `docs`で指定した文書が存在しない

機械的に「majorかどうか」を完全判定することはできないため、`AGENTS.md`とPRテンプレートでも判定ルールを必須化する。

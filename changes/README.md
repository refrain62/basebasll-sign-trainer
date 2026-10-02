# Change declarations

利用者向け変更の影響度を1変更セット1JSONで記録します。詳細は`docs/engineering/change-policy.md`。

```json
{
  "id": "YYYY-MM-DD-short-name",
  "summary": "変更概要",
  "impact": "minor",
  "docs": ["docs/product/spec.md"],
  "noticeMigration": null
}
```

`major`では`noticeMigration`を必ず指定します。過去JSONは監査用に残し、同じidを再利用しません。

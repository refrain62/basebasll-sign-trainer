# ローカル開発・PBKDF2注意事項

## 7. ローカル開発

初回のみ `.dev.vars.example` をコピーします。

PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars.dev
```

ローカルDB migration:

```bash
npm run db:migrate:local
```

起動:

```bash
npm run dev
```

確認URL:

```text
LP              http://localhost:8787/
サンプルチーム  http://localhost:8787/t/6BnWv2K3zo
アカウント      http://localhost:8787/account
SYSTEM管理      http://localhost:8787/admin
チーム管理      http://localhost:8787/t/6BnWv2K3zo/admin
```

---

## PBKDF2 / 合言葉の注意Cloudflare Workers Web CryptoではPBKDF2のiteration countは100,000以下を使用する。SIGN TRAINERの新規合言葉・旧管理者パスワードは `PBKDF2-SHA256 + PASSWORD_PEPPER + 16-byte random salt + 100,000 iterations` で保存する。

`0022_cloudflare_pbkdf2_compat.sql` は、旧seedのまま残っているサンプルチーム `6BnWv2K3zo` の選手用合言葉「ホームラン」を100,000回のlegacy hashへ修復する。STAGING/DEVで以下を適用する。

```powershell
npm run db:migrate:staging
# または
npm run db:migrate:dev
```

100,000回を超える既存PBKDF2 hashはWorkersでは検証できないため、該当チームはSYSTEM管理またはチーム管理から合言葉/旧管理者パスワードを再設定する。

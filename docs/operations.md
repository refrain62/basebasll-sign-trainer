# SIGN TRAINER 運用チェックリスト

## 公開前に必須で確認すること

1. `wrangler.jsonc` の `PUBLIC_OPERATOR_NAME` を実際の運営者名へ変更する。
2. `PUBLIC_SUPPORT_URL` を実際の問い合わせフォームURLへ変更する。Google Formsの場合は共有用URL（`https://forms.gle/...` または `https://docs.google.com/forms/...`）を設定する。
3. Google Cloud Console の OAuth 同意画面に以下を登録する。
   - ホームページ: `https://<本番ドメイン>/`
   - プライバシーポリシー: `https://<本番ドメイン>/privacy`
   - 利用規約: `https://<本番ドメイン>/terms`
4. LINE Developers Console に以下を登録する。
   - プライバシーポリシーURL: `https://<本番ドメイン>/privacy`
   - サービス利用規約URL: `https://<本番ドメイン>/terms`
5. `0009_plans_and_entitlements.sql` まで全環境へ適用する。
6. `npm install` で生成した `package-lock.json` をGit管理し、`npm ci --ignore-scripts` で再現可能にする。
7. `npm run check`、`npm run security:preflight`、`npm run ops:preflight` を実行する。
8. 本番OAuth callback URL、Cloudflare Access、D1 binding、Secretを確認する。

## 公開している文書

- `/terms` — 利用規約
- `/privacy` — プライバシーポリシー
- `/external-transmission` — 外部送信について
- `/support` — 運営者情報、退会、セキュリティ連絡、問い合わせフォーム

## 同意の記録

管理者がOAuth認証へ進む際に現在の利用規約・プライバシーポリシー版をOAuth stateの署名済みセッションへ保持し、OAuth完了後に `app_users` の以下へ記録します。

- `terms_version`
- `privacy_version`
- `legal_accepted_at`

新規チーム作成時は、現在版への同意記録が無いアカウントを拒否します。

## 退会

- メイン管理者は別の管理者へメイン管理者権限を移さない限り退会できません。
- サブ管理者は1チーム最大5名です。承認待ちのサブ管理者招待も枠として予約されます。
- 退会時にアカウントの直接識別情報を匿名化し、OAuth identityとチーム所属を削除します。
- LINE identityを持つアカウントは、退会完了前にLINEで本人確認し、LINEの連動アプリ権限をDeauthorize APIで解除します。
- Google側の許可は利用者自身がGoogleアカウントの接続管理から解除できます。本サービス側ではGoogleアクセストークン/リフレッシュトークンを恒久保存しません。

## インシデント対応

個人データ漏えい等が疑われる場合は、被害拡大防止、事実確認、影響範囲特定、再発防止を実施し、法令上必要な場合は関係機関への報告・本人通知を行います。運用責任者、連絡経路、証跡保全方法を公開前にチーム内で決めてください。

## Free運用と将来の有料化

現在はFreeプランのみを提供し、決済・自動課金・Stripe Checkoutは実装していません。`0009_plans_and_entitlements.sql` によりプラン/Entitlement/Usageの境界だけを先に用意し、有料プランは購入不可の状態にしています。

将来オンラインで有料プランを販売する場合は、価格・支払時期・提供時期・自動更新・解約・返金・保存データの扱い等の表示に加え、事業形態に応じた特定商取引法上の表示が必要かを公開前に確認してください。技術・商品設計は `docs/monetization.md` を参照してください。

## build 75 — データ保護Secretの運用

公開前に `PASSWORD_PEPPER` / `DATA_ENCRYPTION_KEY` / `DATA_LOOKUP_KEY` を dev・staging・production それぞれ別値で設定する。値はD1・Git・配布ZIPに保存しない。

```bash
npm run security:generate-secrets
```

上記は候補値を標準出力へ表示するだけでファイルには保存しない。production値はCloudflare Secretへ登録したうえで、アクセス制御されたパスワードマネージャー等へバックアップする。

build 75への更新順序:

1. 3つのSecretを設定する。
2. `0010_data_protection.sql` を適用する。
3. build 75をdeployする。
4. `/admin` の「保存データの保護」を実行する。
5. 未保護件数が0になったことを確認する。
6. 通常ログインを通じて旧salt-only password hashをpepper付きへ段階移行する。

鍵はDBバックアップとは別系統で保管する。`DATA_ENCRYPTION_KEY`を失うと暗号化データは復号できず、`DATA_LOOKUP_KEY`を失うとOAuth identityの検索ができず、`PASSWORD_PEPPER`を失うとpepper付きパスワードハッシュを検証できない。単純な値の変更はローテーションではなくデータ喪失につながるため、変更前に再暗号化/再HMAC/dual-pepper移行を実装する。


## build 76 — 問い合わせフォーム運用

公開メールアドレスは使用せず、`PUBLIC_SUPPORT_URL` にHTTPSの問い合わせフォームURLを設定します。現在はGoogle Formsを想定しています。SIGN TRAINERはフォームURLをそのまま外部リンクとして表示し、氏名・メールアドレス・teamId等をクエリ文字列へ自動付与しません。Google Formsで「事前入力したリンク」を使う場合も、個人情報をURLへ埋め込まないでください。

`PUBLIC_SUPPORT_URL` はSecretではありません。利用者に公開されるURLです。問い合わせ内容はフォーム提供事業者側で管理されるため、フォームの閲覧権限、回答保存先、削除ルール、通知先アカウントの2段階認証を運用側で管理してください。

## 静的アセットのversion管理（build 79以降）

HTML / JavaScript / CSS / Web App Manifestでは、cache-busterの数字を手作業で更新しない。ソース上は `__ASSET_VERSION__` を固定で使用し、Workerが `CF_VERSION_METADATA.id` をレスポンス時に差し込む。CloudflareへのデプロイでWorker versionが変われば、CSS・JS・favicon・PWA icon・画像URLも自動的に別versionになる。ローカルでversion metadataが得られない場合は `dev` にフォールバックし、非production環境の静的アセットはno-cacheで配信する。

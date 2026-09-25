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
5. `0011_sub_admin_limit.sql` まで全環境へ適用する。
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


## 静的アセットversion管理

Viteで生成するJavaScript bundleはcontent hash付きファイル名を使います。HTMLテンプレート、`public/styles.css`、Web App Manifest、favicon/PWA iconなどVite bundle外の固定アセットだけ `__ASSET_VERSION__` を使い、Workerの `CF_VERSION_METADATA.id` をレスポンス時に自動挿入します。デプロイごとの `?v=<数字>` 手修正は不要です。


## build 80 — TypeScript / Zod運用

Worker/APIソースは `src/**/*.ts` です。変更時は `npm run typecheck` と `npm run check` を必ず実行してください。APIへ新しいJSON bodyを追加する場合は `src/validation/schemas.ts` にZod schemaを追加し、Controllerで `parseJsonBody()` を使用します。Service層のビジネス制約・D1制約はZodとは別に維持してください。TypeScript/Zod化だけではD1 migrationは発生しません。

## build 83 — Vite UI運用

ブラウザUIのsource of truthは `client/*.ts`、HTMLのsource of truthは `pages/*.html` です。`npm run build:client` はViteでcontent-hashed bundleを `public/build/` に生成し、同時に `public/*.html` と `public/__pages/*.txt` を生成します。これら生成物は直接編集しません。

`npm run dev` は初回Vite build後、Wranglerと `vite build --watch` を同時起動します。UIだけを監視する場合は `npm run dev:ui` を使います。QR生成は`qrcode` + `@types/qrcode` をVite bundleへ同梱します。client配下にvendored JavaScriptは置かず、外部QR API/CDNへチームURLを送信しません。


## build 84 — QRライブラリ

旧vendored `client/vendor/qrcode-local.js` と手書き型shimを削除し、QR生成をnpm依存へ移行しました。

## build 85 — qrcode + @types/qrcode

QR生成はruntimeに `qrcode` 1.5.4、TypeScript型定義に `@types/qrcode` 1.5.6を使用します。`client/qr-code.ts` は `QRCode.toString(..., { type: "svg" })` を非同期で呼び出し、SVG data URLとして `<img>` に渡します。Viteがruntime依存をbundleするため、ブラウザ実行時のCDN依存や外部QR APIへのURL送信はありません。


## build 88 — image budget

本番画像は `scripts/image-budget-check.ts` で容量上限を検査します。`public/build` のVite生成物は対象外で、静的画像は1ファイル160 KiB以下、合計1.2 MiB以下を維持します。大きな写真はWebP/JPEG、PWA iconは必要サイズのPNGを維持し、LP下部の `why-baseball.webp` はlazy-loadします。

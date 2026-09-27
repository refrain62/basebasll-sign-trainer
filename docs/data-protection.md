# SIGN TRAINER data protection — build 75

## 目的

D1そのもののプラットフォーム保護に加え、DBダンプやD1読み取り権限だけでは個人情報・チームのサイン情報を読めないよう、アプリケーションレベルの保護を追加する。

## Secret

各環境で別々の値を使う。D1やGitには保存しない。

- `PASSWORD_PEPPER` — 32文字以上。パスワード前処理HMAC用。
- `DATA_ENCRYPTION_KEY` — 32文字以上。AES-256-GCM用。内部でSHA-256から256-bit鍵を導出。
- `DATA_LOOKUP_KEY` — 32文字以上。OAuth provider subjectの検索用HMAC-SHA256。

候補値は `npm run security:generate-secrets` で生成できる。

## Password hashing

新規形式:

```text
pbkdf2-sha256-pepper-v1$600000$<salt-base64url>$<hash-base64url>
```

1. 入力をNFC正規化・trimする。
2. `PASSWORD_PEPPER`をHMAC-SHA256鍵としてパスワードを前処理する。
3. 16-byte CSPRNG saltを生成する。
4. PBKDF2-HMAC-SHA256 / 600,000 iterations / 256-bit outputを生成する。
5. saltとhashのみD1へ保存する。pepperはWrangler Secretのみ。

旧 `pbkdf2-sha256$...` は検証可能なまま残し、ログイン成功時に新形式へ再ハッシュする。

## AES-256-GCM

保存形式:

```text
enc:v1:<12-byte-iv-base64url>:<ciphertext+tag-base64url>
```

各暗号化で新しい96-bit IVをCSPRNG生成する。AADに `sign-trainer:v1:<table.field>` を入れ、別フィールドへの暗号文差し替えを復号時に拒否する。

現在暗号化するデータ:

- `teams.name`
- `app_users.display_name / email / avatar_url`
- `user_identities.provider_email / display_name / avatar_url`
- `user_identities.provider_subject` の原値（`provider_subject_ciphertext`）
- `signs.name`
- `sign_groups.name / description / explanation_youtube_url / explanation_youtube_video_id`
- `sign_videos.youtube_url / youtube_video_id / comment`

チームID、DB主キー、role、enabled、sort order、プラン/利用量など、検索・結合に必要で機密本文ではない値は暗号化しない。

## OAuth subject lookup

provider subjectを暗号化だけすると検索できないため、検索カラムには以下を保存する。

```text
hmac:v1:<HMAC-SHA256(DATA_LOOKUP_KEY, provider+subject)>
```

元のsubjectはAES-GCMで `provider_subject_ciphertext` に保存する。旧plaintext subjectは、OAuthログイン時または管理画面の既存データ保護処理で移行する。

## Audit log

新規audit detailは保存前に、name/email/comment/url/description/password/secret/token/subject等の値を `[redacted]` に置換する。`0010_data_protection.sql` で `protected_at` を追加し、既存audit detailも管理画面の保護処理でredactする。

## 導入順序

1. dev/staging/productionそれぞれに3つのSecretを設定。
2. `0010_data_protection.sql` を適用。
3. build 75をdeploy。
4. `/admin` → 「保存データの保護」→「既存データを保護」を実行し、未保護件数が0になることを確認。
5. 通常の選手/管理者ログインを行うと、旧password hashは成功時にpepper付きへ段階移行する。

**0010適用前にbuild 75をdeployしないこと。** 新コードは追加カラムを参照する。

## 鍵管理 / ローテーション

- production鍵はD1とは別系統のパスワードマネージャー等へ安全にバックアップする。
- dev / staging / productionで鍵を共有しない。
- `DATA_ENCRYPTION_KEY` を単純に変更すると既存暗号文を復号できなくなる。
- `DATA_LOOKUP_KEY` を単純に変更すると既存OAuth identityを検索できなくなる。
- `PASSWORD_PEPPER` を単純に変更するとpepper付きpassword hashを検証できなくなる。
- したがって鍵ローテーションは「旧鍵を保持した再暗号化/再HMAC移行」を実装してから行う。緊急ローテーション時は先にバックアップを確認する。

## 非対象

OAuth access/refresh token、Google client secret、LINE channel secret、session secret、system admin secretはD1へ恒久保存しない。これらは引き続きCloudflare Secretまたは短命Cookieで扱う。

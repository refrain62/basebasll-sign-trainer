# SIGN TRAINER

野球チーム向けのサイン練習Webアプリのです。

- サンプルチームID: `6BnWv2K3zo`
- LINEでチーム専用URLを配布
- 初回のみ合言葉認証
- 認証後にのみサイン名・YouTube動画IDを取得
- 5問 / 10問 / 全サイン
- シャッフル出題
- YouTube限定公開動画
- ○ / × 自己採点
- 間違えたサインだけ復習
- Cloudflare Workers + Static Assets


## サービス上の利用導線

トップページのCTAは **「サンプルチームで試す」** とし、固定チームID `6BnWv2K3zo` の体験ページへ移動します。

正式利用時は次の流れを想定します。

```text
チーム登録
  ↓
チーム専用ページ / URLを発行
  ↓
監督・コーチがLINEなどでURLを共有
  ↓
メンバーがチームの合言葉を入力
  ↓
サイン練習
```

サンプルチームは、この正式導線の操作感を登録なしで確認するためのものです。

## 1. 必要なもの

- Node.js
- npm
- Cloudflareアカウント（本番デプロイ時のみ）

## 2. ローカル起動

```bash
npm install
npm run dev
```

ブラウザで Wrangler が表示するローカルURL（通常は `http://localhost:8787`）を開きます。

ローカル確認用のローカル合言葉は `.dev.vars` に入っています。

```text
ホームラン
```

> `.dev.vars` は `.gitignore` 済みです。本番用の合言葉をここへコミットしないでください。

## 3. ローカルで開くURL

公開LP:

```text
http://localhost:8787/
```

サンプルチームURL:

```text
http://localhost:8787/t/6BnWv2K3zo
```

正式利用では、チーム登録後にチームごとの専用URLを発行し、LINEなどで共有する想定です。サンプルURLをLINEで確認する場合は末尾に `?openExternalBrowser=1` を付ける運用を想定しています。

## 4. 登録済みサイン動画

`src/signs.js` の `DEFAULT_SIGNS` に、チーム用のYouTube Shorts動画を10種類登録済みです。

| No. | サイン | YouTube動画ID |
|---:|---|---|
| 01 | 盗塁 | `TNUjEP60Gh0` |
| 02 | バント | `_2ujH2nEtOc` |
| 03 | 待て | `fT0yEpxO9PQ` |
| 04 | ヒットエンドラン | `HNRRYqcpWEk` |
| 05 | バスター | `A2FEzscDhJY` |
| 06 | セーフティバント | `nqnyCmyfZ7k` |
| 07 | スクイズ | `8cYBvzQKelc` |
| 08 | ランエンドヒット | `JYT0yxyvHJU` |
| 09 | サイン解除／自由に打て | `SLGZzjdatb0` |
| 10 | 送りバント | `76OBENrzcXc` |

YouTube Shortsも、アプリ側では通常のYouTube動画と同じく動画IDで再生します。

同じサインに複数動画を登録したい場合は、`videos` 配列へ動画IDを追加できます。

```js
{
  id: "steal",
  name: "盗塁",
  videos: ["VIDEO_ID_A", "VIDEO_ID_B", "VIDEO_ID_C"]
}
```

### 環境変数でサインを上書きする方法

`SIGNS_JSON` を設定すると `src/signs.js` より優先されます。

`.dev.vars.example` に例があります。

## 5. 合言葉

ローカルでは `.dev.vars`:

```dotenv
TEAM_PASSPHRASE=ホームラン
SESSION_SECRET=sign-trainer-local-dev-secret-change-me-2026
```

本番ではソースコードに入れず、Cloudflare Secretsとして設定します。

```bash
npx wrangler secret put TEAM_PASSPHRASE
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` は十分に長いランダム文字列を設定してください。

## 6. Cloudflareへデプロイ

最初にCloudflareへログイン:

```bash
npx wrangler login
```

Secretsを設定:

```bash
npx wrangler secret put TEAM_PASSPHRASE
npx wrangler secret put SESSION_SECRET
```

デプロイ:

```bash
npm run deploy
```

Wranglerが発行する `*.workers.dev` URLで動作確認できます。独自ドメインを使う場合はCloudflare DashboardでWorkerへCustom Domainを割り当ててください。

## 7. LINEで配るURL

本番URLが:

```text
https://basebasll-sign-trainer.refrain62.workers.dev
```

の場合:

```text
https://basebasll-sign-trainer.refrain62.workers.dev/t/6BnWv2K3zo?openExternalBrowser=1
```

配布文例:

```text
⚾ サイン練習はこちら
https://basebasll-sign-trainer.refrain62.workers.dev/t/6BnWv2K3zo?openExternalBrowser=1

初回のみ合言葉が必要です。
```

合言葉はURLには含めません。

## 8. 認証の考え方

1. チーム専用URLへアクセス
2. `/api/session` で認証状態確認
3. 未認証なら合言葉画面
4. `/api/auth` でWorker側が合言葉を検証
5. 成功すると署名済みHttpOnly Cookieを発行
6. `/api/signs` はCookieが有効な場合だけサインデータを返す

認証前のHTML/JavaScriptには、実運用のサイン名・YouTube動画IDは含まれません。

認証Cookieは標準で約30日です。`wrangler.jsonc` の `SESSION_DAYS` で変更できます。

## 9. YouTube限定公開について

このバージョンの合言葉はSIGN TRAINERへのアクセスを制限するものであり、YouTube限定公開動画そのものを完全に非公開にする仕組みではありません。

一度YouTube動画URLが別途共有された場合は、SIGN TRAINERを経由せず視聴される可能性があります。

## 10. 主なファイル

```text
sign-trainer/
├─ public/
│  ├─ app.js            # LP・認証・クイズUI
│  ├─ styles.css        # モバイル優先デザイン
│  ├─ index.html
│  ├─ favicon.svg
│  └─ og.png
├─ src/
│  ├─ index.js          # Worker/API/認証
│  └─ signs.js          # サーバー側サイン設定
├─ .dev.vars            # ローカル専用秘密情報
├─ .dev.vars.example
├─ wrangler.jsonc
└─ package.json
```

## 11. 現バージョンで意図的に入れていないもの

- マルチチーム管理
- 管理画面
- 選手アカウント
- 個人成績保存
- ランキング
- LINEログイン
- PWAインストール誘導
- プッシュ通知

まず「LINE → 合言葉 → 動画を見る → 答える → 復習」が説明なしで使えるかを検証するためです。

## 12. デザイン

`docs/design.md` にLP・合言葉・練習設定・問題・動画エラー・正解・採点遷移・結果・間違い復習まで、実装のデザイン基準をまとめています。今回の実装は、会話内で作成した縦長LP案とスマートフォン画面案を基準に全面的に再構成しています。

## 2026-09-22 UI / 合言葉入力修正

- 合言葉入力を `type="password"` から日本語IME対応の `type="text"` に変更しました。
- `inputmode="text"` / `lang="ja"` を指定し、ひらがな・カタカナ・漢字の合言葉を入力できます。
- IME変換中のEnterで誤送信しないよう composition イベントを考慮しています。
- サーバー側では合言葉をUnicode NFC正規化して比較します。
- PC表示の合言葉画面はLPと同じコーチ写真を使った2カラム構成、スマホではデザイン案どおり1カラムのアプリ画面に切り替わります。
- アプリ内CTAはLPのカプセル型ではなく、操作画面のデザイン案に合わせた角丸ボタンに調整しています。


## v0.4 LP redesign

トップページLPを参照デザインに合わせてHTML/CSSで全面再構築。Hero、4特徴、サイン練習の意義、3ステップ、対象ユーザー、声、CTA、FAQ、フッターまで再現。画像は `public/assets/hero-wide.webp` と `public/assets/why-baseball.png` を追加。


## v0.7 修正
- LP「なぜサインの練習が大切？」セクションの画像を背景画像ではなく `<img>` 描画に変更し、見切れないように修正しました。


## YouTube Shorts の再生について

YouTube Shorts も通常動画と同じ動画IDを使い、`https://www.youtube.com/embed/{VIDEO_ID}` 形式で再生します。
IFrame Player API の `onReady` 待ちには依存しないため、APIイベントが返らずローディング表示が残り続ける問題を避けています。
動画iframeが12秒以内に読み込まれない場合は、再試行または問題スキップを選べるエラー表示へ切り替わります。



## v0.9 練習履歴

練習を最後まで完了すると、結果をブラウザの `localStorage` に自動保存します。

- 日時
- 練習モード（5問 / 10問 / 全サイン / 間違い復習）
- 正解数 / 不正解数 / スキップ数
- 正答率
- 練習時間
- 各問題の○×
- 間違えたサイン
- 出題時の動画ID

練習開始画面の「練習履歴を見る」から一覧を表示し、詳細画面から間違えた問題だけを再練習できます。履歴はチームIDごとに最大50件まで、この端末内だけに保存されます。サーバーや他端末には同期しません。

## v0.8 UI/UX review

- 最新の透過アイコンを全ブランド表示、favicon、Apple Touch Icon、Web App Icon、OG画像へ統一
- 間違えた問題一覧の各カードから、その問題の動画を直接確認できるよう改善
- LP、FAQ、結果、復習、操作ボタンの文字サイズを引き上げ、視認性を改善
- 架空の利用者レビューをやめ、実際の利用シーンを説明するセクションへ変更
- スキップがある場合でも結果の分母は出題数を維持


## Cloudflare 本番認証の必須設定

本番では `.dev.vars` は使われません。Cloudflare Worker に次の2つの Secret が必要です。

```bash
npx wrangler login
npx wrangler secret put TEAM_PASSPHRASE
npx wrangler secret put SESSION_SECRET
```

`TEAM_PASSPHRASE` にはチームの合言葉（例: `ホームラン`）を入力します。
`SESSION_SECRET` は十分に長いランダム文字列にしてください。Node.js が使える環境では次で生成できます。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

このプロジェクトの `wrangler.jsonc` は、現在利用中の Worker `basebasll-sign-trainer` を対象にしています。また `TEAM_PASSPHRASE` と `SESSION_SECRET` を必須 Secret として宣言しているため、今後は Secret が未設定のまま `npm run deploy` するとデプロイ時点で検出できます。

設定確認:

```bash
npx wrangler secret list
```

両方が表示されたら:

```bash
npm run deploy
```

### `/api/auth` が 503 / 認証設定エラーになる場合

Cloudflare 上の Worker に `TEAM_PASSPHRASE` または `SESSION_SECRET` が設定されていません。入力した合言葉の間違いではありません。上記の `wrangler secret put` を実行してください。


## Wrangler 4.136+ の secrets 設定

`wrangler.jsonc` の `secrets` は配列ではなく、次の形式です。

```json
"secrets": {
  "required": ["TEAM_PASSPHRASE", "SESSION_SECRET"]
}
```

本番値は `wrangler.jsonc` に書かず、`wrangler secret put` で登録してください。


## 共有機能（build 22）

- LPからSIGN TRAINERトップページをURL・QR・共有メニューで共有できます。
- 認証後の練習設定画面からチーム専用ページをURL・QR・LINEで共有できます。
- チーム用共有URLには `openExternalBrowser=1` を付け、LINEから開いた際に外部ブラウザへ誘導する前提です。
- 合言葉はURL/QRには含めません。メンバーには別経路・別メッセージで伝えてください。
- QR表示は `api.qrserver.com` を利用し、送信される情報は共有対象URLのみです。


## YouTubeプレイヤー表示（build 24）

クイズ動画は、サイン動作が操作UIで隠れにくいように YouTube の埋め込みプレイヤーを最小UIで表示します。

- `controls=0`: プレイヤーの操作バーを非表示
- `fs=0`: 全画面ボタンを非表示
- `disablekb=1`: キーボード操作を無効化
- `iv_load_policy=3`: アノテーションを非表示
- `playsinline=1`: モバイルでインライン再生

YouTube側が必須として表示するロゴ・再生前後の表示などは完全には除去できません。


## Build 25

- iPhone/Safari向けにYouTubeを問題表示時に即ロードし、mute付きautoplayを試行します。
- Safariのiframe loadイベント待ちで画面が止まらないよう、独自ローディング表示を短時間で外します。
- インストール用アイコン（Apple Touch / PWA / maskable）は緑を端まで敷いたフルブリード版にし、OS側の白フチを防ぎます。

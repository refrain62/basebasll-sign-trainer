# SIGN TRAINER 無料運用・将来有料化設計

最終更新: 2026-09-25

## 1. 方針

SIGN TRAINERは、まずチームのサイン練習に必要な基本機能を **Free（¥0）** で提供する。
現時点では決済・自動課金・Stripe Checkoutは実装しない。

有料化の対象は「機能そのもの」ではなく、主に運営側で継続的な実費が発生する機能とする。
特に、画像・動画をSIGN TRAINERへ直接アップロードして保存・配信する機能は、R2等のストレージ・転送・画像/動画処理コストが発生するため、将来の有料プラン候補とする。

## 2. Freeで提供する現在の基本機能

- チーム登録
- Google / LINE 管理者認証
- 管理者追加・交代・退会
- サイン登録・編集
- サイングループ
- グループ説明・YouTube説明動画
- 1サインへの複数YouTube動画とコメント
- グループを選んで5問 / 10問 / 全問の練習
- 練習履歴（端末内保存）
- URL / QR / LINE共有
- PWA

現在のFreeプランに決済情報の入力は要求しない。

## 3. 将来プラン案

料金は未決定であり、以下は商品設計の検討レンジであって契約条件ではない。LP・利用規約・DBにも確定価格としては登録しない。

| プラン | 想定 | 検討価格帯 |
| --- | --- | ---: |
| Free | 現在の基本機能 | ¥0 |
| Team Plus | 画像の直接アップロード、例: 2GBクラウド保存 | ¥500〜800 / 月 / チームを検討 |
| Team Pro | 動画の直接アップロード、例: 10GBクラウド保存 | ¥1,000〜1,500 / 月 / チームを検討 |

有料化時は実測したR2・動画処理・配信・サポートコストをもとに再計算する。

## 4. 実装済みの課金準備基盤

`0009_plans_and_entitlements.sql` で次を追加する。

- `plans`: プランの表示情報。Free / Team Plus / Team Proを保持する。
- `plan_entitlements`: プランが利用できる機能と上限値。
- `team_subscriptions`: チームが現在どのプランにいるか。将来のStripe識別子を格納できる。
- `team_usage`: クラウド保存量・画像数・動画量等の利用量。

既存チームと新規チームは自動的に `free` になる。Team Plus / Team Proは `available_for_purchase=0` であり、現時点では購入できない。

新しいチーム作成経路が増えてもFree行を作り忘れないよう、D1 triggerでも `team_subscriptions` と `team_usage` を初期化する。

## 5. Feature / Entitlement 境界

機能コードは `src/config/features.js` に集約する。

- `direct_image_upload`
- `direct_video_upload`
- `cloud_storage`

業務コードはStripe契約の有無を直接確認してはいけない。必ず `EntitlementService` を介して判定する。

```js
await entitlements.assertFeature(teamId, FEATURE_KEYS.DIRECT_IMAGE_UPLOAD);
```

これにより、将来Stripeから別の決済基盤へ変更しても画像アップロード機能側を変更しない。

## 6. Stripe導入時の境界

将来の流れは次を想定する。

1. 管理者がプランを選択
2. BackendがStripe Checkout Sessionを生成
3. Stripe Checkoutで決済
4. Stripe WebhookをSIGN TRAINERが受信
5. Webhook署名を検証
6. `team_subscriptions` を更新
7. `EntitlementService` の結果が変わり、機能が利用可能になる

画面の「決済完了URL」を契約状態の正として信用しない。契約状態は検証済みStripe Webhookを正とする。

主に取り扱うイベント候補:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Stripe Customer / Subscription IDは `team_subscriptions` に保持するが、商品機能から直接参照しない。

## 7. 画像直接アップロードを追加するとき

推奨構成:

```text
Browser
  ↓ 1. upload permission / entitlement check
Worker + Hono
  ↓ 2. short-lived upload authorization
Cloudflare R2
  ↑ 3. browser uploads object
Worker
  ↑ 4. completion / metadata registration
D1
```

大きなバイナリを常にWorkerへ通す構成は避ける。R2への直接アップロードを基本とし、Workerは権限・容量・メタデータを管理する。

### 必須セキュリティ

- 拡張子だけでなくMagic Number / MIMEを確認
- JPEG / PNG / WebP等、許可形式をallow-list化
- SVG / HTML / 実行可能ファイルは画像アップロードとして受け付けない
- 1ファイル最大サイズ
- 最大画像ピクセル数
- 利用者ファイル名をObject Keyとして信用しない
- 暗号学的ランダムなObject Key
- EXIF（特にGPS）を削除して保存
- 画像再エンコードを検討
- `Content-Disposition` / `Content-Type` を安全に配信
- Entitlement確認と保存容量予約をサーバー側で行う
- チームをまたぐObject参照を禁止
- 削除・退会・プランダウン時のデータ保持方針を規約へ明記

動画は画像より変換・配信コストが大きいため、画像機能より後に実装する。

## 8. Usage管理

`team_usage.storage_bytes` を総量の正とする。画像・動画テーブルを追加したときは、アップロード確定・削除を同一の業務処理でUsageへ反映する。

将来、同時アップロード時に上限超過しないよう、単なる「現在量をSELECTしてからUPLOAD」ではなく、予約・確定方式またはD1 transaction相当の原子的な容量確保を実装する。

## 9. UI/UX方針

現段階では管理画面に「Free」を表示するが、有料プランへの強い誘導はしない。

画像アップロード機能を公開した時点で、利用できないボタンを単にdisableするのではなく、次の情報を示す。

- なぜ利用できないか
- 何が追加されるか
- 保存容量
- 料金
- 解約後のデータ
- 「プランを見る」導線

選手画面には課金情報を表示しない。契約操作はオーナー権限に限定する。

## 10. 法務・運用

有料プランを実際に販売する前に以下を追加・レビューする。

- 利用規約の料金・支払・自動更新・解約・返金条項
- 保存容量超過時の扱い
- 支払失敗時の猶予期間
- 解約 / ダウングレード時のファイル保持期間
- 特定商取引法に基づく表記の要否・内容
- `/commerce` 等の表示ページ
- プライバシーポリシーのアップロードファイル取扱い
- 外部送信ページのR2 / Stripe記載
- インシデント対応手順

価格や条件が確定するまでは、`plans.monthly_price_yen` の有料プランをNULL、`available_for_purchase=0` のまま維持する。

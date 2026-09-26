# SIGN TRAINER プラン / Entitlement設計

最終更新: 2026-09-26（v1.5.32）

## 方針

商品機能は決済サービスを直接参照せず、`EntitlementService`だけで利用可否を判定する。現在、Plus / Proは特定チーム限定でSYSTEM管理者が手動付与する。一般申し込み・オンライン課金・Stripe Checkoutは未実装。

## 3段階の役割

### Free — 基本練習
- サイン登録・編集
- サイングループ1つ
- 1サイン1YouTube動画
- グループ説明・説明動画
- クイズ・復習・端末内履歴（最大50件）
- QR / LINE共有、PWA
- Google / LINE OAuth
- メイン管理者1名

### Plus — チーム運用強化
Freeの全機能に加えて:
- 複数サイングループ
- 1サイン複数動画
- 動画プレビュー開始位置指定
- サブ管理者 最大5名

### Pro — 分析・監査
Plusの全機能に加えて:
- 正答率・苦手分析
- サイングループ別／サイン別／動画パターン別分析
- 最近のアクティビティ
- 監査ログ表示

## Entitlement対応

| feature_key | Free | Plus | Pro |
| --- | :---: | :---: | :---: |
| `multiple_sign_groups` | - | ✓ | ✓ |
| `multiple_sign_videos` | - | ✓ | ✓ |
| `custom_video_thumbnail` | - | ✓ | ✓ |
| `sub_admin_management` | - | ✓ | ✓ |
| `practice_analytics` | - | - | ✓ |
| `activity_log` | - | - | ✓ |

OAuth認証は全プランで利用可能で、Entitlementによるロック対象にしない。

## ダウングレード

Plus / Proから下位プランへ変更しても、既存の複数グループ・複数動画・サブ管理者データを削除しない。下位プランで許可されない新規作成・管理画面アクセスだけを制限し、再昇格時に再利用できるようにする。

## 現在の販売状態

- Free: ¥0
- Plus: 価格未確定、限定提供、購入不可
- Pro: 価格未確定、限定提供、購入不可
- 一般向け決済UIなし
- SYSTEM管理者が対象チームへ手動でプラン付与

LP・管理画面で「購入できる」ような表現や架空価格を表示しない。

## 将来の決済境界

Stripe等を導入する場合でも、決済完了画面ではなく検証済みWebhookで`team_subscriptions`を更新し、商品機能は`EntitlementService`だけを見る。

## 将来のクラウド保存

`direct_image_upload`, `direct_video_upload`, `cloud_storage`は将来拡張用Entitlementとして残す。実際に公開する際はR2・容量制御・法務表記・ダウングレード時の保持期間を別途確定する。

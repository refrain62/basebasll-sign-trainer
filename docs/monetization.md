# SIGN TRAINER プラン / Entitlement設計

最終更新: 2026-09-26（v1.5.34）

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
- 今回の練習結果を文章で共有（Web Share API / コピー）

### Pro — 分析・監査
Plusの全機能に加えて:
- 正答率・苦手分析
- サイングループ別／サイン別／動画パターン別分析
- 最近のアクティビティ
- 監査ログ表示
- 今回の練習結果・成績分析を画像カードで共有

## Entitlement対応

| feature_key | Free | Plus | Pro |
| --- | :---: | :---: | :---: |
| `multiple_sign_groups` | - | ✓ | ✓ |
| `multiple_sign_videos` | - | ✓ | ✓ |
| `custom_video_thumbnail` | - | ✓ | ✓ |
| `sub_admin_management` | - | ✓ | ✓ |
| `practice_analytics` | - | - | ✓ |
| `activity_log` | - | - | ✓ |
| `result_text_share` | - | ✓ | ✓ |
| `result_image_share` | - | - | ✓ |

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


## 有償機能モジュールの配信

Pro分析や結果共有の有償ロジックは通常のクライアントbundleへ同梱しない。選手セッションとチームのEntitlementをWorker側で再確認した上で、`/api/premium-module?teamId=...&module=...` から `no-store` のJavaScript moduleとして配信する。

- `analytics` → `practice_analytics` が必要（Pro）
- `result-text` → `result_text_share` が必要（Plus / Pro）
- `result-image` → `result_image_share` が必要（Pro）

UI上の非表示やクライアントstateだけを認可根拠にしない。URL直打ち、API直叩き、DevToolsでのstate改変でも、サーバー側Entitlementが不足していれば403で拒否する。

共有する成績データは端末の`localStorage`からブラウザ内で読み出して整形・画像生成し、共有画像生成のためにサーバーへ送信しない。デフォルト共有には具体的なサイン内容・動画URLを含めない。

## v1.5.34 有償機能の見せ方

- Free利用中でもPlus / Pro機能のボタンや導線は隠さない。
- 利用不可機能は鍵アイコンと必要プランを表示し、クリック時は `/plans` の該当機能アンカーを**別タブ**で開く。
- クライアント上の表示制御は案内目的だけであり、認可は従来どおりWorker側のEntitlement判定を正とする。
- LP本体は主要価値と開始導線を優先し、詳細比較は `/plans`、PWA導入手順は `/install` に分離する。

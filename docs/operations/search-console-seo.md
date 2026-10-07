# Google Search Console / SEO運用

本番サイトの検索エンジン登録と、公開マーケティングページのSEO設定を管理します。

## 本番URL

- Origin: `https://basebasll-sign-trainer.refrain62.workers.dev`
- Google確認ファイル: `/googlee59132d0fb2c06ae.html`
- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`

Google確認ファイルは内容・ファイル名を変更しません。Workerは`public/`に存在するこのファイルをルートURLから静的配信します。

## Search Console登録

HTMLファイル確認を使う場合は、上記本番URLのURLプレフィックスプロパティで登録し、productionへdeployしたあと次のURLがそのまま表示できることを確認します。

`https://basebasll-sign-trainer.refrain62.workers.dev/googlee59132d0fb2c06ae.html`

確認後、Search Consoleの「サイトマップ」で次を送信します。

`https://basebasll-sign-trainer.refrain62.workers.dev/sitemap.xml`

Dev / StagingはCloudflare Accessで保護する検証環境なのでSearch Consoleへ登録しません。

## インデックス対象

検索結果へ載せる対象は公開マーケティングページに限定します。

- `/`
- `/plans`
- `/install`
- `/support`

これらはcanonical、description、robots、Open Graph、Twitter Cardを持ち、`sitemap.xml`にも掲載します。トップページには`WebSite` / `WebApplication`のJSON-LDも出力します。

## noindex対象

アカウント、管理、チーム固有ページ、招待ページなど検索流入が不要な画面は、Workerの`X-Robots-Tag: noindex`を維持します。公開FAQの`/support`だけはSEO対象としてallowlistへ含めます。

## 変更時の確認

SEO対象ページを追加・削除するときは次を同じ変更で更新します。

1. `pages/<page>.html`のcanonical/OG/Twitter metadata
2. `src/http/pages.ts`のindexable allowlist
3. `public/sitemap.xml`
4. 必要に応じて`public/robots.txt`
5. `scripts/seo-check.ts`と回帰テスト

`npm run check`の`seo:check`が、Google確認ファイル・canonical・SNS metadata・robots・sitemapの不整合を検出します。

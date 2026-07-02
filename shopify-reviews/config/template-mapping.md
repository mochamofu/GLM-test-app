# ファイル配置対応表

Shopify の管理画面でテーマのコード編集を開き、以下の対応表に従ってファイルを配置してください。

## 配置先一覧

| リポジトリ内のファイル | Shopify の配置先 | 新規作成 or 上書き |
|---|---|---|
| `snippets/product-reviews.liquid` | `snippets/product-reviews.liquid` | 新規作成 |
| `templates/page.reviews-admin.liquid` | `templates/page.reviews-admin.liquid` | 新規作成 |
| `assets/reviews.js` | `assets/reviews.js` | 新規作成 |
| `assets/reviews.css` | `assets/reviews.css` | 新規作成 |
| `assets/reviews-admin.js` | `assets/reviews-admin.js` | 新規作成 |
| `assets/papaparse.min.js` | `assets/papaparse.min.js` | 新規作成 |
| `assets/encoding.min.js` | `assets/encoding.min.js` | 新規作成 |

## 配置後の編集が必要な箇所

### 1. 商品ページにレビューブロックを表示

`sections/main-product.liquid`（または使用中のテーマの商品ページセクション）の、レビューを表示したい場所に以下を追記：

```liquid
{% render 'product-reviews', product: product %}
```

> ※ Dawn テーマ等では、商品説明の下（`product-info` セクション内）に配置するのが一般的です。

### 2. 管理画面ページを作成

管理画面 → **オンラインストア** → **ページ** → **ページを追加** で新規ページを作成：

- タイトル: `レビュー管理`（任意）
- テーマテンプレート: `page.reviews-admin` を選択（配置後に選択可能になります）
- 内容: 空欄でOK

このページのURL（例: `/pages/reviews-management`）にアクセスすると、CSV 入出力画面が表示されます。

### 3. Storefront API トークンの設定（本番運用時）

`snippets/product-reviews.liquid` 内の以下の箇所を書き換えます：

```liquid
data-storefront-token="PASTE_YOUR_STOREFRONT_PUBLIC_TOKEN_HERE"
```

→ 取得した public token に置き換え。

> トークンの取得手順は `README.md` の「Storefront API トークンの取得」を参照。

## 動作モード

| モード | 条件 | 挙動 |
|---|---|---|
| デモモード | トークン未設定 | レビューは `localStorage` に保存。あなたのブラウザでだけ見える。テスト用。 |
| 本番モード | トークン設定済 | Storefront API で読み込み。書き込みは App Proxy 必要（後述）。 |
| 完全本番 | App Proxy 設定 | 全機能。バックエンド（Remix/Express アプリ）のデプロイが必要。 |

## ファイルツリー（リポジトリ側）

```
shopify-reviews/
├── README.md
├── snippets/
│   └── product-reviews.liquid
├── templates/
│   └── page.reviews-admin.liquid
├── assets/
│   ├── reviews.js
│   ├── reviews.css
│   ├── reviews-admin.js
│   ├── papaparse.min.js
│   └── encoding.min.js
└── config/
    └── template-mapping.md  ← このファイル
```

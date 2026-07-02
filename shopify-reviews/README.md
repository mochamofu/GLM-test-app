# Shopify レビューシステム（Theme 埋め込み型）

商品ページに組み込める、星1〜5（0.5刻み）のレビュー機能。CSV でのエクスポート（Excel 対応）とインポートに対応。

## ✨ 機能

- ⭐ **0.5刻みの星レーティング**（1.0 / 1.5 / 2.0 … 5.0）
- 📊 **平均評価の自動計算**（商品ページ上部に表示）
- 📝 **レビュー項目**：評価 / タイトル / 内容 / メールアドレス / 投稿日 / 更新日
- 💾 **CSV エクスポート**（UTF-8 BOM付き / Shift-JIS の2形式で Excel 対応）
- 📥 **CSV インポート**（外部レビューをプレビュー付きで取り込み）
- 🔁 **同一メールアドレスは更新**（重複投稿を防止）

## 🎮 動作モード

このアプリは **2つのモード** で動かせます。

### モード A: デモモード（設定不要・今すぐ試せる）
トークンを設定しない状態。レビューは `localStorage` に保存され、あなたのブラウザでのみ見えます。
テスト・UI確認用。**他の人からは見えません**。

### モード B: 本番モード（Storefront API トークン設定済）
商品メタフィールドにレビューを保存。世界中の人が投稿・閲覧できます。
ただし **書き込みには追加設定** が必要です（後述）。

---

## 🚀 導入手順（デモモードでまず試す）

所要時間：約 10 分

### Step 1: テーマのコード編集を開く

1. Shopify 管理画面 → **オンラインストア** → **テーマ**
2. 現在のテーマの **⋯** → **コードを編集**

### Step 2: ファイルを配置

以下の対応表に従って、`assets/` `snippets/` `templates/` の各フォルダにファイルを作成し、中身を貼り付けます。

> 対応表は [`config/template-mapping.md`](./config/template-mapping.md) を参照。

**新規ファイルを作成** ボタンから、同名のファイルを作ってコピペ：

- `snippets/product-reviews.liquid`
- `templates/page.reviews-admin.liquid`
- `assets/reviews.js`
- `assets/reviews.css`
- `assets/reviews-admin.js`
- `assets/papaparse.min.js`
- `assets/encoding.min.js`

### Step 3: 商品ページにレビューを表示

`sections/main-product.liquid`（Dawn テーマの場合）を開き、レビューを表示したい場所に以下を追記：

```liquid
{% render 'product-reviews', product: product %}
```

> 例：`</product-info>` の直後あたりがおすすめ。

### Step 4: 管理画面ページを作成

1. **オンラインストア** → **ページ** → **ページを追加**
2. タイトル: `レビュー管理`（任意）
3. **テーマテンプレート** で `page.reviews-admin` を選択
4. 保存

### Step 5: 確認

- 商品ページを開く → レビュー欄と投稿フォームが表示されるはず
- 投稿してみる → 平均星とレビュー一覧に反映される（デモモードなので自分だけが見える）
- `/pages/レビュー管理のハンドル` にアクセス → CSV 入出力画面

🎉 **これでデモモード完成！**

---

## 🔐 本番モードにするには（Storefront API）

実際に顧客が投稿できる状態にするには、**書き込み先のバックエンド** が必要です。
Liquid + JS だけでは、セキュアな書き込みができないため。

### 必要なもの

1. **Storefront API の public access token**（読み込み用）
2. **App Proxy** または **バックエンドアプリ**（書き込み用）

### Storefront API トークンの取得

1. Shopify 管理画面 → **アプリ** → **アプリとセールスチャネルの設定** → **開発者向け設定**
2. **Storefront API** セクションで「パブリックアクセス権」を有効化
3. 表示された token をコピー
4. `snippets/product-reviews.liquid` の以下を書き換え：
   ```liquid
   data-storefront-token="PASTE_YOUR_STOREFRONT_PUBLIC_TOKEN_HERE"
   ```
   ↓
   ```liquid
   data-storefront-token="あなたのtoken"
   ```

### 書き込み用バックエンド（完全本番）

レビューをメタフィールドに書き込むには、Admin API アクセス権を持つバックエンドが必要です。
このリポジトリには同梱していませんが、以下のいずれかで実装可能：

- **Shopify Remix アプリ**（公式テンプレート）
- **Express + Shopify Admin API**（軽量）
- **Cloudflare Workers / Vercel Functions**（サーバーレス）

`reviews.js` は `data-proxy-url` 属性が設定されていれば、そこへ POST します：
```liquid
data-proxy-url="/apps/reviews-submit"
```

実装が必要になったらお声がけください。

---

## 📋 CSV 形式

### エクスポートされる CSV

```
product_id,rating,title,content,email,created_at,updated_at
1234567890,4.5,素晴らしい,とても使いやすいです。,taro@example.com,2025-01-15T10:30:00Z,2025-01-15T10:30:00Z
```

- `product_id`: Shopify の商品 ID（数字）
- `rating`: 0.5〜5.0 の数値（0.5刻み）
- `title`: レビュータイトル
- `content`: レビュー本文
- `email`: 投稿者メールアドレス
- `created_at`: 投稿日時（ISO 8601）
- `updated_at`: 更新日時（ISO 8601）

### インポートする CSV

上記と同じ形式。1行目はヘッダー行。
同じメールアドレスのレビューは更新、それ以外は新規追加されます。

**ヘッダー名の別名も対応**：
- `評価` / `Rating` → `rating`
- `タイトル` / `Title` → `title`
- `内容` / `Content` / `review` → `content`
- `メール` / `Email` → `email`
- `投稿日` / `CreatedAt` → `created_at`
- `更新日` / `UpdatedAt` → `updated_at`

---

## 📁 ファイル構成

```
shopify-reviews/
├── README.md                           ← このファイル
├── snippets/
│   └── product-reviews.liquid          ← 商品ページ埋め込み
├── templates/
│   └── page.reviews-admin.liquid       ← CSV 管理画面
├── assets/
│   ├── reviews.js                      ← 表示・投稿ロジック
│   ├── reviews.css                     ← スタイル
│   ├── reviews-admin.js                ← CSV 入出力ロジック
│   ├── papaparse.min.js                ← CSV パーサ（MIT）
│   └── encoding.min.js                 ← Shift-JIS 変換（MIT）
└── config/
    └── template-mapping.md             ← 配置対応表
```

## ⚠️ 注意事項

- **デモモード** はあくまで動作確認用。保存先はあなたのブラウザの localStorage です。
- 本番で顧客に投稿させるには、書き込み用バックエンドが必要です。
- Shift-JIS 変換には `encoding.min.js` が必要です（同梱済み）。

## 📜 ライセンス

- アプリ部分: MIT
- PapaParse: MIT (https://www.papaparse.com/)
- Encoding.js: MIT (https://github.com/polygonplanet/Encoding.js)

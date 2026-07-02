/**
 * 商品ページ埋め込み型レビューシステム
 * -------------------------------------------------------
 * 機能:
 *  - 商品メタフィールドからレビュー取得・表示
 *  - 平均評価（0.5刻み）の計算と星表示
 *  - レビュー投稿（Storefront API 経由でメタフィールド更新）
 *
 * データ構造（メタフィールド名前空間: reviews, key: list）:
 *   reviews.list = [
 *     { rating, title, content, email, created_at, updated_at },
 *     ...
 *   ]
 *
 * 注意: Storefront API の public token では、セキュアな書き込みが制限される場合が
 * あります。本番運用では App Proxy（バックエンド）経由での書き込みを推奨。
 * ローカル検証用途では、デモモード（localStorage）にフォールバックします。
 */

(function () {
  "use strict";

  // ===== ユーティリティ =====
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mm = ("0" + d.getMinutes()).slice(-2);
    return y + "-" + m + "-" + day + " " + hh + ":" + mm;
  }

  function maskEmail(email) {
    if (!email || email.indexOf("@") === -1) return email || "";
    var parts = email.split("@");
    var name = parts[0];
    var domain = parts[1];
    var visible = name.length <= 2 ? name[0] : name.slice(0, 2);
    return visible + "***@" + domain;
  }

  // ===== 星描画（0.5刻み対応） =====
  // rating: 0〜5（小数可）。size: px
  function renderStars(rating, size) {
    size = size || 20;
    var pct = (Math.max(0, Math.min(5, rating)) / 5) * 100;
    var starChar = "★★★★★";
    var html =
      '<span class="stars" style="font-size:' + size + 'px;line-height:1;" aria-hidden="true">' +
        '<span class="stars__bg">' + starChar + '</span>' +
        '<span class="stars__fg" style="width:' + pct + '%">' + starChar + '</span>' +
      '</span>';
    return html;
  }

  // ===== メタフィールド読み書き（Storefront API） =====
  var ReviewsStore = {
    /**
     * Storefront API 経由で商品レビュー一覧を取得。
     * @returns {Promise<Array>} レビュー配列
     */
    fetch: function (shopDomain, productId, storefrontToken) {
      var query =
        "query($id: ID!) {" +
        "  product(id: $id) {" +
        "    metafield(namespace: \"reviews\", key: \"list\") {" +
        "      value" +
        "    }" +
        "  }" +
        "}";
      var variables = { id: "gid://shopify/Product/" + productId };
      return fetch("https://" + shopDomain + "/api/2024-01/graphql.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({ query: query, variables: variables }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Storefront API error: " + r.status);
          return r.json();
        })
        .then(function (json) {
          var mf = json && json.data && json.data.product && json.data.product.metafield;
          if (!mf || !mf.value) return [];
          try { return JSON.parse(mf.value); }
          catch (e) { return []; }
        });
    },

    /**
     * レビュー保存。
     * 注意: Storefront public token ではメタフィールド書き込みができません。
     * App Proxy または Admin API が必要です。ここでは App Proxy エンドポイントを
     * 想定して POST します。エンドポイントが未設定の場合は localStorage に
     * フォールバックします（デモ用）。
     */
    save: function (shopDomain, productId, reviews, opts) {
      opts = opts || {};
      // App Proxy パス（例: /apps/reviews-submit）。設定がなければ localStorage へ。
      if (opts.proxyUrl) {
        return fetch(opts.proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId, reviews: reviews }),
        }).then(function (r) {
          if (!r.ok) throw new Error("保存に失敗しました (" + r.status + ")");
          return r.json();
        });
      }
      // フォールバック: localStorage（デモ用・他者には見えない）
      return new Promise(function (resolve) {
        var key = "product_reviews_" + productId;
        localStorage.setItem(key, JSON.stringify(reviews));
        resolve({ ok: true, demo: true });
      });
    },
  };

  // ===== 星入力（0.5刻み） =====
  function initStarInput(root) {
    var container = $('[data-role="star-input"]', root);
    if (!container) return { getValue: function () { return 0; } };
    var valueEl = $('[data-role="star-value"]', container);
    var buttons = $all(".star-input__star", container);

    function setValue(v) {
      container.setAttribute("data-value", String(v));
      if (valueEl) valueEl.textContent = v > 0 ? v + " / 5" : "未選択";
      buttons.forEach(function (btn) {
        var full = parseFloat(btn.getAttribute("data-star-full"));
        var half = parseFloat(btn.getAttribute("data-star-half"));
        btn.classList.remove("is-full", "is-half");
        if (v >= full) btn.classList.add("is-full");
        else if (v >= half) btn.classList.add("is-half");
      });
    }

    // マウス位置で半星/全星を切り替え
    buttons.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var full = parseFloat(btn.getAttribute("data-star-full"));
        setValue(x < rect.width / 2 ? full - 0.5 : full);
      });
      btn.addEventListener("click", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var full = parseFloat(btn.getAttribute("data-star-full"));
        setValue(x < rect.width / 2 ? full - 0.5 : full);
      });
    });
    // マウスが外れたら確定値に戻す（確定値は setValue で保持）
    container.addEventListener("mouseleave", function () {
      setValue(parseFloat(container.getAttribute("data-value")) || 0);
    });

    return { getValue: function () { return parseFloat(container.getAttribute("data-value")) || 0; } };
  }

  // ===== UI描画 =====
  function renderReviews(root, reviews) {
    var listEl = $('[data-role="reviews-list"]', root);
    var emptyEl = $('[data-role="reviews-empty"]', root);
    if (!listEl) return;

    // 既存のレビュー要素をクリア（emptyメッセージ以外）
    $all(".review-item", listEl).forEach(function (n) { n.remove(); });

    if (!reviews.length) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    // 投稿日降順でソート
    var sorted = reviews.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    sorted.forEach(function (rev) {
      var item = document.createElement("div");
      item.className = "review-item";
      item.innerHTML =
        '<div class="review-item__header">' +
          '<span class="review-item__stars">' + renderStars(rev.rating, 18) + "</span>" +
          '<span class="review-item__title"></span>' +
        "</div>" +
        '<div class="review-item__content"></div>' +
        '<div class="review-item__meta">' +
          '<span class="review-item__author"></span>' +
          '<span class="review-item__date">' + formatDate(rev.created_at) + "</span>" +
          (rev.updated_at && rev.updated_at !== rev.created_at
            ? ' <span class="review-item__updated">（更新: ' + formatDate(rev.updated_at) + "）</span>"
            : "") +
        "</div>";
      // XSS 対策: textContent で設定
      $(".review-item__title", item).textContent = rev.title || "";
      $(".review-item__content", item).textContent = rev.content || "";
      $(".review-item__author", item).textContent = maskEmail(rev.email);
      listEl.appendChild(item);
    });
  }

  function renderSummary(root, reviews) {
    var avgEl = $('[data-role="avg-number"]', root);
    var countEl = $('[data-role="review-count"]', root);
    var starsEl = $('[data-role="avg-stars"]', root);
    if (!reviews.length) {
      if (avgEl) avgEl.textContent = "—";
      if (countEl) countEl.textContent = "0";
      if (starsEl) starsEl.innerHTML = renderStars(0, 22);
      return;
    }
    // 0.5刻みに丸めた平均
    var raw = reviews.reduce(function (s, r) { return s + (parseFloat(r.rating) || 0); }, 0) / reviews.length;
    var avg = Math.round(raw * 2) / 2;
    if (avgEl) avgEl.textContent = avg.toFixed(1);
    if (countEl) countEl.textContent = String(reviews.length);
    if (starsEl) starsEl.innerHTML = renderStars(avg, 22);
  }

  // ===== 初期化 =====
  function init(root) {
    var productId = root.getAttribute("data-product-id");
    var shopDomain = root.getAttribute("data-shop-domain");
    var storefrontToken = root.getAttribute("data-storefront-token");
    var tokenIsPlaceholder = !storefrontToken || storefrontToken.indexOf("PASTE_") === 0;

    var state = { reviews: [] };
    var starInput = initStarInput(root);

    function refresh() {
      renderSummary(root, state.reviews);
      renderReviews(root, state.reviews);
    }

    // 読み込み
    if (tokenIsPlaceholder) {
      // デモモード: localStorage から取得
      var key = "product_reviews_" + productId;
      try { state.reviews = JSON.parse(localStorage.getItem(key) || "[]"); }
      catch (e) { state.reviews = []; }
      refresh();
    } else {
      ReviewsStore.fetch(shopDomain, productId, storefrontToken)
        .then(function (reviews) {
          state.reviews = reviews || [];
          refresh();
        })
        .catch(function () {
          // 取得失敗時も localStorage にフォールバック
          try { state.reviews = JSON.parse(localStorage.getItem("product_reviews_" + productId) || "[]"); }
          catch (e) { state.reviews = []; }
          refresh();
        });
    }

    // 投稿フォーム
    var form = $('[data-role="review-form"]', root);
    var msgEl = $('[data-role="form-message"]', root);
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var rating = starInput.getValue();
        var title = $('[data-role="input-title"]', form).value.trim();
        var content = $('[data-role="input-content"]', form).value.trim();
        var email = $('[data-role="input-email"]', form).value.trim();

        if (msgEl) { msgEl.textContent = ""; msgEl.className = "reviews-form__message"; }
        if (rating <= 0) return fail(msgEl, "評価を選択してください。");
        if (!title) return fail(msgEl, "タイトルを入力してください。");
        if (!content) return fail(msgEl, "レビュー内容を入力してください。");
        if (!email || email.indexOf("@") === -1) return fail(msgEl, "正しいメールアドレスを入力してください。");

        var now = new Date().toISOString();
        // 同一メールアドレスなら更新、それ以外は新規追加
        var existing = state.reviews.find(function (r) { return r.email === email; });
        var newReview;
        if (existing) {
          existing.rating = rating;
          existing.title = title;
          existing.content = content;
          existing.updated_at = now;
          newReview = existing;
        } else {
          newReview = {
            rating: rating,
            title: title,
            content: content,
            email: email,
            created_at: now,
            updated_at: now,
          };
          state.reviews.push(newReview);
        }

        var proxyUrl = root.getAttribute("data-proxy-url") || null;
        ReviewsStore.save(shopDomain, productId, state.reviews, { proxyUrl: proxyUrl })
          .then(function (res) {
            // localStorage にも同期（デモ/オフライン表示用）
            try { localStorage.setItem("product_reviews_" + productId, JSON.stringify(state.reviews)); } catch (e) {}
            refresh();
            form.reset();
            if (msgEl) {
              msgEl.textContent = existing ? "レビューを更新しました！" : "レビューを投稿しました！";
              msgEl.className = "reviews-form__message is-success";
            }
          })
          .catch(function (err) {
            if (msgEl) {
              msgEl.textContent = "保存に失敗しました: " + err.message;
              msgEl.className = "reviews-form__message is-error";
            }
          });
      });
    }
  }

  function fail(msgEl, text) {
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.className = "reviews-form__message is-error";
    }
  }

  // 複数の商品レビューブロック対応（通常は1つ）
  function start() {
    var blocks = $all(".product-reviews");
    blocks.forEach(function (b) { init(b); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

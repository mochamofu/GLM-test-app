/**
 * レビュー管理画面（CSV エクスポート/インポート）
 * -------------------------------------------------------
 * 依存: papaparse.min.js (PapaParse)
 *
 * 機能:
 *  - 全商品のレビューを表で表示（Storefront API 経由 or localStorage デモ）
 *  - CSV ダウンロード（BOM付きUTF-8 / Shift-JIS 両対応でExcel対応）
 *  - 外部CSVのパース・プレビュー・インポート
 *
 * カラム:
 *   product_id, rating, title, content, email, created_at, updated_at
 *
 * 注意:
 *  - Storefront public token では全商品の一括取得ができません。
 *    デモモードでは localStorage に保存されたレビューを集計します。
 *  - 本番で全商品を扱う場合は Admin API（バックエンド）が必要です。
 *    本スクリプトは App Proxy エンドポイントがあればそれを使います。
 */

(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var CSV_HEADERS = ["product_id", "rating", "title", "content", "email", "created_at", "updated_at"];

  var root = $(".reviews-admin");
  if (!root) return;

  var status = {
    loadedReviews: [],   // エクスポート用に読み込んだレビュー
    parsedRows: [],      // インポート用にパースした行
  };

  // ===== タブ切り替え =====
  $all(".reviews-admin__tab", root).forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-tab");
      $all(".reviews-admin__tab", root).forEach(function (t) { t.classList.toggle("is-active", t === tab); });
      $all(".reviews-admin__panel", root).forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-panel") === name);
      });
    });
  });

  // ===== ステータス表示 =====
  function setStatus(role, text, kind) {
    var el = $('[data-role="' + role + '"]', root);
    if (!el) return;
    el.textContent = text || "";
    el.className = "reviews-admin__status" + (kind ? " is-" + kind : "");
  }

  // ===== テーブル描画 =====
  function renderTable(tbody, rows) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = CSV_HEADERS.length;
      td.className = "reviews-admin__empty";
      td.textContent = "データがありません。";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      CSV_HEADERS.forEach(function (h) {
        var td = document.createElement("td");
        td.textContent = row[h] != null ? String(row[h]) : "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // ===== レビュー読み込み（エクスポート用） =====
  // デモ: localStorage を走査して全商品のレビューを集計
  function loadAllReviews() {
    var all = [];
    // App Proxy があれば使う（将来的拡張）
    var proxyUrl = root.getAttribute("data-proxy-url");
    if (proxyUrl) {
      setStatus("export-status", "読み込み中...", "info");
      return fetch(proxyUrl + "?action=list")
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (data) {
          status.loadedReviews = (data && data.reviews) || [];
          finishLoad();
        })
        .catch(function (err) {
          // フォールバック
          status.loadedReviews = collectFromLocalStorage();
          finishLoad("（デモモード: " + err.message + "）");
        });
    }
    // localStorage デモ
    status.loadedReviews = collectFromLocalStorage();
    finishLoad();
  }

  function collectFromLocalStorage() {
    var result = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf("product_reviews_") !== 0) continue;
      var productId = key.replace("product_reviews_", "");
      var reviews = [];
      try { reviews = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
      reviews.forEach(function (r) {
        result.push({
          product_id: productId,
          rating: r.rating,
          title: r.title,
          content: r.content,
          email: r.email,
          created_at: r.created_at,
          updated_at: r.updated_at,
        });
      });
    }
    return result;
  }

  function finishLoad(note) {
    renderTable($('[data-role="export-tbody"]', root), status.loadedReviews);
    var n = status.loadedReviews.length;
    setStatus("export-status", n + " 件のレビューを読み込みました。" + (note || ""), n > 0 ? "success" : "info");
    // ダウンロードボタンを有効化
    $('[data-action="export-csv"]', root).disabled = n === 0;
    $('[data-action="export-sjis"]', root).disabled = n === 0;
  }

  // ===== CSV 出力 =====
  function rowsToCsv(rows) {
    var lines = [CSV_HEADERS.join(",")];
    rows.forEach(function (row) {
      var cells = CSV_HEADERS.map(function (h) {
        var v = row[h] != null ? String(row[h]) : "";
        // RFC4180: " で囲む。改行・カンマ・" を含む場合はエスケープ
        if (/[",\n\r]/.test(v)) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      });
      lines.push(cells.join(","));
    });
    return lines.join("\r\n");
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // UTF-8 BOM 付き（Excel で文字化けしない）
  function exportUtf8() {
    if (!status.loadedReviews.length) return;
    var bom = "\uFEFF";
    var csv = bom + rowsToCsv(statusToCsvRows());
    var ts = timestamp();
    download("reviews_" + ts + ".csv", csv, "text/csv;charset=utf-8;");
    setStatus("export-status", "CSV（UTF-8）をダウンロードしました。", "success");
  }

  // Shift-JIS で出力（日本語 Excel 向け）
  function exportShiftJis() {
    if (!status.loadedReviews.length) return;
    var csv = rowsToCsv(statusToCsvRows());
    var sjis;
    try {
      sjis = Encoding.convert(unescape(encodeURIComponent(csv)), "SJIS", "UTF8");
    } catch (e) {
      // Encoding.js がない場合は BOM付きUTF-8 にフォールバック
      setStatus("export-status", "Shift-JIS 変換ライブラリがないため UTF-8 で出力します。", "warn");
      exportUtf8();
      return;
    }
    var ts = timestamp();
    download("reviews_" + ts + "_sjis.csv", new Uint8Array(sjis), "text/csv;charset=Shift_JIS;");
    setStatus("export-status", "CSV（Shift-JIS）をダウンロードしました。", "success");
  }

  function statusToCsvRows() {
    return status.loadedReviews.map(function (r) {
      return {
        product_id: r.product_id,
        rating: r.rating,
        title: r.title || "",
        content: r.content || "",
        email: r.email || "",
        created_at: r.created_at || "",
        updated_at: r.updated_at || "",
      };
    });
  }

  function timestamp() {
    var d = new Date();
    var p = function (n) { return ("0" + n).slice(-2); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes());
  }

  // ===== インポート（CSV パース） =====
  function setupImport() {
    var fileInput = $('[data-role="import-file"]', root);
    var filenameEl = $('[data-role="import-filename"]', root);
    var parseBtn = $('[data-action="parse-csv"]', root);
    var importBtn = $('[data-action="import-csv"]', root);

    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (file) {
        filenameEl.textContent = file.name;
        parseBtn.disabled = false;
        importBtn.disabled = true;
        status.parsedRows = [];
        setStatus("import-status", "", "");
      } else {
        filenameEl.textContent = "ファイル未選択";
        parseBtn.disabled = true;
        importBtn.disabled = true;
      }
    });

    parseBtn.addEventListener("click", function () {
      var file = fileInput.files[0];
      if (!file) return;
      setStatus("import-status", "パース中...", "info");
      if (typeof Papa === "undefined") {
        setStatus("import-status", "PapaParse ライブラリが読み込まれていません。", "error");
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          var rows = validateRows(results.data);
          if (rows.errors.length) {
            setStatus("import-status", rows.errors.length + " 件のエラーがあります。確認してください。", "error");
          } else {
            setStatus("import-status", rows.valid.length + " 件のレビューを検出しました。「取り込む」で確定します。", "info");
          }
          status.parsedRows = rows.valid;
          renderTable($('[data-role="import-tbody"]', root), rows.valid);
          importBtn.disabled = rows.valid.length === 0;
        },
        error: function (err) {
          setStatus("import-status", "パース失敗: " + err.message, "error");
        },
      });
    });

    importBtn.addEventListener("click", function () {
      if (!status.parsedRows.length) return;
      doImport(status.parsedRows);
    });
  }

  function validateRows(rawRows) {
    var valid = [];
    var errors = [];
    rawRows.forEach(function (row, idx) {
      // ヘッダー名のバリエーションを吸収
      var norm = {
        product_id: row.product_id || row.ProductId || row["商品ID"] || row.id,
        rating: parseFloat(row.rating || row.Rating || row["評価"] || 0),
        title: row.title || row.Title || row["タイトル"] || "",
        content: row.content || row.Content || row["内容"] || row.review || "",
        email: row.email || row.Email || row["メール"] || "",
        created_at: row.created_at || row.CreatedAt || row["投稿日"] || new Date().toISOString(),
        updated_at: row.updated_at || row.UpdatedAt || row["更新日"] || new Date().toISOString(),
      };
      // バリデーション
      var rowErrors = [];
      if (!norm.product_id) rowErrors.push("商品IDなし");
      if (!norm.rating || norm.rating < 0.5 || norm.rating > 5) {
        rowErrors.push("評価は0.5〜5の範囲で指定してください（値:" + norm.rating + "）");
      }
      // 0.5刻みに丸める
      norm.rating = Math.round(norm.rating * 2) / 2;
      if (!norm.email || norm.email.indexOf("@") === -1) rowErrors.push("メールアドレス不正");
      if (rowErrors.length) {
        errors.push("行" + (idx + 2) + ": " + rowErrors.join(" / "));
      } else {
        valid.push(norm);
      }
    });
    return { valid: valid, errors: errors };
  }

  function doImport(rows) {
    setStatus("import-status", "取り込み中...", "info");
    var proxyUrl = root.getAttribute("data-proxy-url");
    if (proxyUrl) {
      fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", reviews: rows }),
      })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function () { finishImport(rows); })
        .catch(function (err) {
          // フォールバック: localStorage に取り込み（デモ）
          importToLocalStorage(rows);
          finishImport(rows, "（デモモード: " + err.message + "）");
        });
      return;
    }
    // localStorage デモ
    importToLocalStorage(rows);
    finishImport(rows);
  }

  function importToLocalStorage(rows) {
    // 商品IDごとにグループ化
    var byProduct = {};
    rows.forEach(function (r) {
      var pid = String(r.product_id);
      if (!byProduct[pid]) byProduct[pid] = [];
      var existing = byProduct[pid].find(function (x) { return x.email === r.email; });
      if (existing) {
        existing.rating = r.rating;
        existing.title = r.title;
        existing.content = r.content;
        existing.updated_at = new Date().toISOString();
      } else {
        byProduct[pid].push({
          rating: r.rating,
          title: r.title,
          content: r.content,
          email: r.email,
          created_at: r.created_at,
          updated_at: r.updated_at,
        });
      }
    });
    Object.keys(byProduct).forEach(function (pid) {
      var key = "product_reviews_" + pid;
      var existing = [];
      try { existing = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
      // 既存をマージ（同メールは更新）
      byProduct[pid].forEach(function (nr) {
        var found = existing.find(function (x) { return x.email === nr.email; });
        if (found) {
          found.rating = nr.rating;
          found.title = nr.title;
          found.content = nr.content;
          found.updated_at = nr.updated_at;
        } else {
          existing.push(nr);
        }
      });
      localStorage.setItem(key, JSON.stringify(existing));
    });
  }

  function finishImport(rows, note) {
    setStatus("import-status", rows.length + " 件のレビューを取り込みました。" + (note || ""), "success");
    $('[data-action="import-csv"]', root).disabled = true;
  }

  // ===== バインド =====
  $('[data-action="load-reviews"]', root).addEventListener("click", loadAllReviews);
  $('[data-action="export-csv"]', root).addEventListener("click", exportUtf8);
  $('[data-action="export-sjis"]', root).addEventListener("click", exportShiftJis);
  setupImport();
})();

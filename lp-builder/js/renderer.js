/* =========================================================
   renderer.js — プロジェクト状態 → HTML 文字列（プレビュー/出力で共用）
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  // LP 本体CSS（プレビュー/出力で同一）。
  // js/lp-styles.js に CSS 文字列が埋め込まれているため file:// でも動く。
  // （なければ fetch で css/preview.css を取る fallback）
  let _cssCache = null;
  function loadPreviewCssSync() {
    if (_cssCache != null) return _cssCache;
    _cssCache = (LP.LP_CSS != null) ? LP.LP_CSS : false;
    return _cssCache;
  }
  async function loadPreviewCss() {
    if (_cssCache != null) return _cssCache;
    if (LP.LP_CSS != null) { _cssCache = LP.LP_CSS; return _cssCache; }
    try {
      const res = await fetch('css/preview.css');
      if (res.ok) { _cssCache = await res.text(); return _cssCache; }
    } catch (e) { /* fall through */ }
    _cssCache = false; // false の場合は link タグを使用
    return _cssCache;
  }

  // カウントダウン用スクリプト
  const COUNTDOWN_JS = `
(function(){
  function tick(){
    document.querySelectorAll('.lp-cd[data-deadline]').forEach(function(box){
      var dl = box.getAttribute('data-deadline');
      if(!dl) return;
      var t = new Date(dl).getTime();
      var now = Date.now();
      var diff = Math.max(0, t - now);
      var d = Math.floor(diff/86400000);
      var h = Math.floor(diff%86400000/3600000);
      var m = Math.floor(diff%3600000/60000);
      var s = Math.floor(diff%60000/1000);
      var setN = function(k,v){ var el = box.querySelector('[data-cd="'+k+'"]'); if(el) el.textContent = v; };
      setN('d', d); setN('h', ('0'+h).slice(-2)); setN('m', ('0'+m).slice(-2)); setN('s', ('0'+s).slice(-2));
    });
  }
  tick(); setInterval(tick, 1000);
})();`;

  // プレビュー iframe 内で動く: 親への高さ通知 ＋ モジュール選択通知 ＋ スライダー等の簡易動作
  const EDITOR_HOOK_JS = `
(function(){
  // 親へドキュメント高さを通知（ミニマップ用）
  function notifyHeight(){
    var h = document.documentElement.scrollHeight;
    parent.postMessage({ source:'lp-builder', type:'height', height: h }, '*');
  }
  // 親から選択モジュールへのスクロール要求を受信
  window.addEventListener('message', function(e){
    var d = e.data;
    if (!d || d.target !== 'lp-iframe') return;
    if (d.type === 'scrollTo' && d.moduleId) {
      var el = document.querySelector('[data-mid="' + d.moduleId + '"]');
      if (el) el.scrollIntoView({ behavior: d.smooth === false ? 'auto' : 'smooth', block: 'center' });
    }
  });
  // ロード完了・画像ロード・リサイズで高さ通知
  notifyHeight();
  window.addEventListener('load', notifyHeight);
  window.addEventListener('resize', notifyHeight);
  setTimeout(notifyHeight, 300);
  setTimeout(notifyHeight, 1200);
  document.querySelectorAll('img').forEach(function(img){
    if (!img.complete) img.addEventListener('load', notifyHeight);
  });
  // モジュール選択クリック通知
  document.addEventListener('click', function(e){
    var el = e.target.closest ? e.target.closest('[data-mid]') : null;
    if (el) { e.preventDefault(); parent.postMessage({ source:'lp-builder', type:'select', moduleId: el.getAttribute('data-mid') }, '*'); }
  }, true);
  // お知らせスライダー簡易切替
  document.querySelectorAll('.lp-notice-slider').forEach(function(slider){
    var slides = slider.querySelectorAll('.lp-nt-slide');
    if (slides.length < 2) return;
    var i = 0;
    setInterval(function(){
      slides[i].classList.remove('active');
      i = (i+1) % slides.length;
      slides[i].classList.add('active');
    }, 3500);
  });
})();`;

  // モジュール HTML を組み立て（data-mid 付きで編集選択に使用可）
  function renderModules(project, opts) {
    opts = opts || {};
    const ctx = LP.buildCtx(project.theme);
    return project.modules.map(mod => {
      const def = LP.Modules.getDefForModule(mod);
      if (!def) return '';
      let html;
      try { html = def.render(mod.data, ctx); } catch (e) {
        console.error('render error', mod.type, e);
        html = '<!-- render error: ' + (mod.type) + ' -->';
      }
      if (opts.editable) {
        // 編集ハイライト用: 一番外側の要素に class を付与したいが、安全のため全体を div で包む
        // ※ただし notice/hero 等は背景全面なので包むとレイアウトが崩れる。
        //   そのため、各モジュール render の「最初の要素タグ」に class を注入する簡易アプローチ。
        html = injectBlockClass(html, mod.id, opts.selectedId === mod.id);
      }
      return html;
    }).join('\n');
  }

  // 文字列中の「最初の HTML 開きタグ」に class と data-mid を注入
  function injectBlockClass(html, id, selected) {
    const cls = 'lp-block' + (selected ? ' lp-selected' : '');
    const midAttr = ' data-mid="' + id + '"';
    // 最初の開きタグ <tag ...> を特定
    const m = html.match(/^\s*<(section|div|footer|nav|aside|header|details)([\s>\/])/);
    if (!m) {
      // 該当タグでなければ包む
      return '<div class="' + cls + '"' + midAttr + '>' + html + '</div>';
    }
    const insertAt = m[0].length;
    const rest = html.slice(insertAt);
    // 直後に class=" が続く場合は class に追記
    if (/^\s*class="/.test(rest)) {
      const before = html.slice(0, insertAt);
      const after = rest.replace(/^(\s*class=")/, '$1' + cls + ' ');
      return before + after.slice(0, after.length) + midAttr + after.slice(after.length);
    }
    // 直後に style=" が続く場合はその前（タグ名直後）に class と data-mid 挿入
    if (/^\s*(style=|>)/.test(rest)) {
      return html.slice(0, insertAt) + ' class="' + cls + '"' + midAttr + rest;
    }
    return html.slice(0, insertAt) + ' class="' + cls + '"' + midAttr + rest;
  }

  // 完全 HTML 文書を生成
  async function renderDocument(project, opts) {
    opts = opts || {};
    let css = opts.inlineCss;
    if (css === undefined) css = loadPreviewCssSync(); // LP.LP_CSS を優先
    if (css === false || css == null) css = await loadPreviewCss();
    const theme = project.theme || {};
    const styleVars = [
      '--lp-primary:' + (theme.primary||'#e87a8b'),
      '--lp-accent:' + (theme.accent||'#f6c453'),
      '--lp-bg:' + (theme.bg||'#ffffff'),
      '--lp-text:' + (theme.text||'#2d2a26'),
      '--lp-radius:' + (theme.radius!=null?theme.radius:12) + 'px',
      "--lp-font:" + (theme.font||"'Hiragino Sans',sans-serif")
    ].join(';');
    const body = renderModules(project, opts);
    const editingClass = opts.editable ? ' lp-editing' : '';
    const title = (project.title || project.name || 'ランディングページ');
    const cssTag = css
      ? '<style>' + css + '</style>'
      : '<link rel="stylesheet" href="css/preview.css">';
    const metaViewport = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    const og = '<meta property="og:title" content="' + escapeAttr(title) + '">' +
               '<meta property="og:type" content="website">';

    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
${metaViewport}
<title>${escapeHTML(title)}</title>
${og}
${cssTag}
</head>
<body>
<div class="lp-root${editingClass}" style="${styleVars}">
${body}
</div>
<script>${COUNTDOWN_JS}</script>
${opts.editable ? '<script>'+EDITOR_HOOK_JS+'</script>' : ''}
</body>
</html>`;
  }

  // プレビュー iframe 内で動く、モジュール選択イベントのフック
  // （EDITOR_HOOK_JS は上部で定義済み: 高さ通知＋選択通知＋スライダー動作を含む）

  function escapeHTML(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(s) { return escapeHTML(s).replace(/"/g,'&quot;'); }

  LP.Renderer = {
    renderModules,
    renderDocument,
    loadPreviewCss,
    injectBlockClass,
    COUNTDOWN_JS
  };
})();

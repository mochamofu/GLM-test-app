/* =========================================================
   app.js — 起動・イベント結線・UI 構築
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // プレビュー更新 debounce
  let _renderTimer = null;
  function scheduleRender(quick) {
    if (_renderTimer) clearTimeout(_renderTimer);
    _renderTimer = setTimeout(() => {
      LP.Preview.render(LP.State.project);
      updateStatus();
    }, quick ? 60 : 150);
  }

  function flashStatus(msg, ok) {
    const el = $('#status-msg');
    el.textContent = msg;
    el.classList.toggle('flash', !!ok);
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.classList.remove('flash'); }, 1600);
  }

  function updateStatus() {
    const n = LP.State.project ? LP.State.project.modules.length : 0;
    $('#status-count').textContent = n + ' モジュール';
  }

  // ============ 左ペイン: モジュール一覧 ============
  function buildModuleList() {
    const wrap = $('#module-list');
    wrap.innerHTML = LP.Modules.all.map(m => `
      <div class="module-card" data-mtype="${m.type}" title="${escapeHTML(m.desc)}">
        <span class="mc-icon">${m.icon}</span>
        <div>
          <div class="mc-name">${escapeHTML(m.name)}</div>
          <div class="mc-desc">${escapeHTML(m.desc)}</div>
        </div>
      </div>`).join('');
    wrap.addEventListener('click', (e) => {
      const card = e.target.closest('[data-mtype]');
      if (!card) return;
      LP.State.addModule(card.getAttribute('data-mtype'));
      flashStatus('モジュールを追加しました', true);
    });
  }

  // ============ 左ペイン: テンプレート一覧 ============
  function buildTemplateList(filter) {
    const wrap = $('#template-list');
    const list = filter ? LP.Templates.byGenre(filter) : LP.Templates.all;
    wrap.innerHTML = list.map(t => {
      const th = t.theme();
      const sw = `<span class="tpl-sw" style="background:${th.primary}"></span>` +
                 `<span class="tpl-sw" style="background:${th.accent}"></span>` +
                 `<span class="tpl-sw" style="background:${th.bg};border-color:#ccc"></span>`;
      const genreLabel = { cosme:'コスメ・美容', fashion:'ファッション・雑貨', digital:'デジタル・サービス' }[t.genre] || t.genre;
      return `<div class="tpl-card" data-tpl="${t.id}" title="${escapeHTML(t.desc)}">
        <div class="tpl-name">${escapeHTML(t.name)}</div>
        <div class="tpl-swatches">${sw}</div>
        <div class="tpl-genre">${escapeHTML(genreLabel)} · ${t.structure().length}モジュール構成</div>
      </div>`;
    }).join('');
    // 既存リスナを避けるため: 削除して再バインド
    wrap.onclick = (e) => {
      const card = e.target.closest('[data-tpl]');
      if (!card) return;
      applyTemplate(card.getAttribute('data-tpl'));
    };
  }

  function applyTemplate(id) {
    const tpl = LP.Templates.get(id);
    if (!tpl) return;
    if (LP.State.project.modules.length > 0) {
      if (!confirm('現在の編集内容をテンプレート構成で上書きしますか？\n（「キャンセル」でテーマ色だけ適用）')) {
        // 色だけ適用
        LP.State.setTemplate(id);
        syncProjectPanel();
        flashStatus('テーマ色を適用しました', true);
        return;
      }
    }
    // 新しいプロジェクト構築
    const proj = LP.State.createBlankProject();
    proj.templateId = id;
    proj.theme = tpl.theme();
    proj.name = tpl.name + ' のLP';
    proj.title = tpl.name;
    // テンプレ構成を読込（各モジュールは先頭バリアントを使用）
    tpl.structure().forEach(type => {
      const def = LP.Modules.get(type);
      if (!def) return;
      const variant = def.variants[0];
      proj.modules.push({
        id: LP.State.genId(type),
        type: type,
        data: Object.assign({ variantId: variant.id }, LP.Modules.defaultData(variant.schema))
      });
    });
    LP.State.replaceProject(proj);
    syncProjectPanel();
    flashStatus('テンプレ「' + tpl.name + '」を読み込みました', true);
  }

  // ============ 右ペイン: インスペクタ反映 ============
  function refreshInspector() {
    const sel = LP.State.getSelected();
    const idx = sel ? LP.State._findIndex(sel.id) : -1;
    const total = LP.State.project ? LP.State.project.modules.length : 0;
    LP.Inspector.render(sel, idx, total);
    LP.Inspector.bindInputs();
  }

  // ============ プロジェクト設定ペインの同期 ============
  function syncProjectPanel() {
    const p = LP.State.project;
    if (!p) return;
    $('#proj-name').value = p.name || '';
    $('#proj-title').value = p.title || '';
    $('#proj-font').value = p.theme.font || '';
    $('#proj-radius').value = p.theme.radius != null ? p.theme.radius : 12;
    setColorPair('primary', p.theme.primary);
    setColorPair('accent', p.theme.accent);
    setColorPair('bg', p.theme.bg);
    setColorPair('text', p.theme.text);
    $('#project-name-label').textContent = p.name || '無題のプロジェクト';
  }
  function setColorPair(key, val) {
    $('#proj-color-' + key).value = val;
    $('#proj-color-' + key + '-text').value = val;
  }

  // ============ エクスポート モーダル ============
  const ExportModal = {
    open(kind) {
      const modal = $('#export-modal');
      const title = $('#export-modal-title');
      const code = $('#export-code');
      title.textContent = kind === 'html' ? '📄 完全 HTML 出力' : '💧 Shopify Liquid section 出力';
      code.textContent = '生成中...';
      modal.classList.remove('hidden');
      modal._kind = kind;
      (kind === 'html' ? LP.Export.standaloneHTML(LP.State.project)
                       : LP.Export.liquidSection(LP.State.project))
        .then(out => {
          modal._code = out;
          code.textContent = out;
          code._filename = (LP.State.project.name || 'lp').replace(/[\\/:*?"<>|]/g,'_').slice(0,40)
            + (kind === 'html' ? '.html' : '.liquid');
        })
        .catch(err => { code.textContent = 'エラー: ' + err.message; });
    },
    close() { $('#export-modal').classList.add('hidden'); },
    download() {
      const modal = $('#export-modal');
      const blob = new Blob([modal._code || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = $('#export-code')._filename || 'lp.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flashStatus('ファイルを保存しました', true);
    },
    copy() {
      navigator.clipboard.writeText($('#export-modal')._code || '').then(
        () => flashStatus('コピーしました', true),
        () => flashStatus('コピー失敗（手動で選択してください）', false)
      );
    },
    openTab() {
      const modal = $('#export-modal');
      const kind = modal._kind;
      const code = modal._code || '';
      if (kind === 'html') {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        // Liquid は別タブ表示不可なのでダウンロード
        ExportModal.download();
      }
    }
  };

  // ============ タブ切替 ============
  function setupTabs() {
    // 左ペインタブ
    $$('.pane-tab[data-left-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-left-tab');
        $$('.pane-tab[data-left-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $('#left-modules').classList.toggle('hidden', key !== 'modules');
        $('#left-templates').classList.toggle('hidden', key !== 'templates');
      });
    });
    // 右ペインタブ
    $$('.pane-tab[data-right-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-right-tab');
        $$('.pane-tab[data-right-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $('#right-edit').classList.toggle('hidden', key !== 'edit');
        $('#right-project').classList.toggle('hidden', key !== 'project');
      });
    });
  }

  // ============ デバイストグル ============
  function setupDeviceToggle() {
    $$('.dev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.dev-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        LP.Preview.setDevice(btn.getAttribute('data-device'));
      });
    });
  }

  // ============ 全体表示（ミニマップ）トグル ============
  function setupOverviewToggle() {
    const btn = $('#btn-overview');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const on = !btn.classList.contains('active');
      btn.classList.toggle('active', on);
      LP.Preview.setOverview(on);
      flashStatus(on ? '全体表示モード: LP全体を俯瞰中' : '通常表示に戻しました');
    });
  }

  // ============ トップバー ボタン ============
  function setupTopbar() {
    $('#btn-undo').addEventListener('click', () => { LP.State.undo(); flashStatus('元に戻しました'); });
    $('#btn-redo').addEventListener('click', () => { LP.State.redo(); flashStatus('やり直しました'); });
    $('#btn-save-json').addEventListener('click', () => {
      LP.Persistence.downloadJSON(LP.State.project);
      flashStatus('プロジェクトを保存しました', true);
    });
    $('#input-load-json').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await LP.Persistence.loadFromFile(file);
        if (!data.modules) throw new Error('プロジェクト形式が不正です');
        LP.State.replaceProject(data);
        syncProjectPanel();
        flashStatus('プロジェクトを読み込みました', true);
      } catch (err) {
        alert('読込エラー: ' + err.message);
      }
      e.target.value = '';
    });
    $('#btn-export-html').addEventListener('click', () => ExportModal.open('html'));
    $('#btn-export-liquid').addEventListener('click', () => ExportModal.open('liquid'));
    $('#btn-open-preview').addEventListener('click', () => LP.Preview.openInNewTab(LP.State.project));

    // モーダル
    $('#export-close').addEventListener('click', () => ExportModal.close());
    $('#export-modal').addEventListener('click', (e) => { if (e.target.id === 'export-modal') ExportModal.close(); });
    $('#export-download').addEventListener('click', () => ExportModal.download());
    $('#export-copy').addEventListener('click', () => ExportModal.copy());
    $('#export-open').addEventListener('click', () => ExportModal.openTab());
  }

  // ============ プロジェクト設定ペイン入力 ============
  function setupProjectPanel() {
    $('#proj-name').addEventListener('input', (e) => {
      LP.State.updateProjectMeta('name', e.target.value);
      $('#project-name-label').textContent = e.target.value || '無題のプロジェクト';
    });
    $('#proj-title').addEventListener('input', (e) => LP.State.updateProjectMeta('title', e.target.value));
    $('#proj-font').addEventListener('change', (e) => LP.State.updateTheme('font', e.target.value));
    $('#proj-radius').addEventListener('input', (e) => LP.State.updateTheme('radius', Number(e.target.value)));
    bindColorPair('primary');
    bindColorPair('accent');
    bindColorPair('bg');
    bindColorPair('text');
    $('#btn-clear-all').addEventListener('click', () => {
      if (confirm('すべてのモジュールを削除しますか？')) {
        LP.State.clearAllModules();
        flashStatus('モジュールを全削除しました');
      }
    });
    $('#btn-new-project').addEventListener('click', () => {
      if (!confirm('新規プロジェクトを作成しますか？（現在の編集内容は失われます）')) return;
      const proj = LP.State.createBlankProject();
      LP.State.replaceProject(proj);
      syncProjectPanel();
      flashStatus('新規プロジェクトを作成しました', true);
    });
  }
  function bindColorPair(key) {
    const ci = $('#proj-color-' + key);
    const ti = $('#proj-color-' + key + '-text');
    ci.addEventListener('input', () => { ti.value = ci.value; LP.State.updateTheme(key, ci.value); });
    ti.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(ti.value)) { ci.value = ti.value; LP.State.updateTheme(key, ti.value); }
      else if (/^#[0-9a-fA-F]{3}$/.test(ti.value)) { const v='#'+ti.value[1]+ti.value[1]+ti.value[2]+ti.value[2]+ti.value[3]+ti.value[3]; ci.value=v; LP.State.updateTheme(key, v); }
    });
  }

  // ============ テンプレートフィルタ ============
  function setupTemplateFilter() {
    $('#template-genre-filter').addEventListener('change', (e) => {
      buildTemplateList(e.target.value);
    });
  }

  // ============ キーボードショートカット ============
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      // Ctrl+Z / Ctrl+Y (入力中は OS 既定)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !inField) {
        e.preventDefault(); LP.State.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !inField) {
        e.preventDefault(); LP.State.redo();
      } else if (e.key === 'Escape') {
        $('#export-modal').classList.add('hidden');
      }
    });
  }

  // ============ State リスナ登録 ============
  function bindStateListeners() {
    LP.State.on('loaded', () => {
      syncProjectPanel();
      LP.Preview.setDevice('pc');
      LP.Preview.render(LP.State.project);
      updateStatus();
    });
    LP.State.on('changed', () => {
      scheduleRender();
      // 選択中モジュールが編集されたらインスペクタ再描画は不要（値は双方向）
      // ただしリピータ追加/削除/移動時は再描画が必要
      refreshInspectorIfNeeded();
    });
    LP.State.on('selection', (id) => {
      refreshInspector();
      // 選択ハイライト更新のため再描画
      scheduleRender(true);
      // 選択モジュールへスクロール（プレビュー内）
      if (id) setTimeout(() => LP.Preview.scrollToModule(id), 80);
    });
    LP.State.on('renamed', (name) => {
      $('#project-name-label').textContent = name || '無題のプロジェクト';
    });
    LP.State.on('autosaved', () => {
      $('#status-saved').textContent = '✓ 自動保存済み ' + new Date().toLocaleTimeString('ja-JP');
    });
    LP.State.on('history', (h) => {
      $('#btn-undo').disabled = !h.canUndo;
      $('#btn-redo').disabled = !h.canRedo;
    });
  }

  let _lastInspectorMod = null;
  function refreshInspectorIfNeeded() {
    const sel = LP.State.getSelected();
    // モジュール自体が変わった（追加/削除/複製/順序）場合のみ再描画
    const cur = sel ? sel.id : null;
    if (cur !== _lastInspectorMod) {
      refreshInspector();
      _lastInspectorMod = cur;
    } else if (sel) {
      // 同一モジュール内でリピータ構成が変わった可能性: 簡易的に再描画
      // （値編集ではフォーカスが外れるのを避けるため、入力中はスキップ）
      // → 構成変更時のみ State 側で明示的に selection を emit する設計なので、ここでは静観
    }
  }

  // ============ 起動 ============
  function boot() {
    // CSS を先にロードしてキャッシュ（出力時の fetch 遅延を回避）
    LP.Renderer.loadPreviewCss().then(() => {
      LP.Preview.init();
      LP.Inspector.init();
      buildModuleList();
      buildTemplateList();
      setupTabs();
      setupDeviceToggle();
      setupOverviewToggle();
      setupTopbar();
      setupProjectPanel();
      setupTemplateFilter();
      setupKeyboard();
      bindStateListeners();
      LP.State.init();
      $('#status-saved').textContent = '— 自動保存: オン（localStorage）';
      // 初回描画
      LP.Preview.render(LP.State.project);
    }).catch(err => {
      console.error('起動エラー', err);
      $('#status-msg').textContent = '起動エラー: ' + err.message;
    });
  }

  function escapeHTML(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

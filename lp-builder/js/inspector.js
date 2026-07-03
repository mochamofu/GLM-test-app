/* =========================================================
   inspector.js — 選択中モジュールの編集フォーム（スキーマから自動生成）
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const Inspector = {
    container: null,
    empty: null,
    _currentId: null,

    init() {
      this.container = document.getElementById('inspector-content');
      this.empty = document.getElementById('inspector-empty');
    },

    /** 選択変更を反映。mod===null なら空状態を表示 */
    render(mod, position, total) {
      if (!mod) {
        this.container.classList.add('hidden');
        this.empty.classList.remove('hidden');
        this._currentId = null;
        return;
      }
      this._currentId = mod.id;
      this.empty.classList.add('hidden');
      this.container.classList.remove('hidden');

      const def = LP.Modules.get(mod.type);
      if (!def) return;

      // ヘッダ: アイコン・名前・上下移動・複製・削除
      const head = `
        <div class="inspector-head">
          <span class="ih-icon">${def.icon}</span>
          <span class="ih-name">${escapeHTML(def.name)} <span class="muted" style="font-weight:400;font-size:11px">(${position+1}/${total})</span></span>
          <button class="icon-btn" data-act="up" title="上へ移動">▲</button>
          <button class="icon-btn" data-act="down" title="下へ移動">▼</button>
          <button class="icon-btn" data-act="dup" title="複製">⧉</button>
          <button class="icon-btn danger" data-act="del" title="削除">🗑</button>
        </div>`;

      // スキーマからフィールド生成
      const fields = def.schema.map(f => this._renderField(mod, f)).join('');

      this.container.innerHTML = head + fields;
      this._bindHead(mod.id);
    },

    _bindHead(id) {
      this.container.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.getAttribute('data-act');
          if (act === 'up') LP.State.moveModule(id, -1);
          else if (act === 'down') LP.State.moveModule(id, 1);
          else if (act === 'dup') LP.State.duplicateModule(id);
          else if (act === 'del') {
            if (confirm('このモジュールを削除しますか？')) LP.State.removeModule(id);
          }
        });
      });
    },

    _renderField(mod, f) {
      const id = 'fld-' + mod.id + '-' + f.key;
      const val = mod.data[f.key];
      let input = '';
      switch (f.type) {
        case 'textarea':
          input = `<textarea class="text-input" id="${id}" data-fkey="${f.key}" placeholder="${escapeHTML(f.placeholder||'')}">${escapeHTML(val)}</textarea>`;
          break;
        case 'number':
          input = `<input type="number" class="text-input" id="${id}" data-fkey="${f.key}" value="${escapeAttr(val)}" step="any">`;
          break;
        case 'color':
          input = `<div class="color-row">
            <input type="color" class="color-input" id="${id}-c" data-fkey="${f.key}" value="${escapeAttr(val)}">
            <input type="text" class="text-input mono" id="${id}-t" data-fkey="${f.key}-text" value="${escapeAttr(val)}">
          </div>`;
          break;
        case 'image':
          input = `<input type="url" class="text-input" id="${id}" data-fkey="${f.key}" value="${escapeAttr(val)}" placeholder="画像URL または空欄=プレースホルダ">`;
          break;
        case 'url':
          input = `<input type="url" class="text-input" id="${id}" data-fkey="${f.key}" value="${escapeAttr(val)}" placeholder="${escapeHTML(f.placeholder||'https://')}">`;
          break;
        case 'select':
          input = `<select class="select" id="${id}" data-fkey="${f.key}">${f.options.map(o => `<option value="${escapeAttr(o.v)}"${o.v==val?' selected':''}>${escapeHTML(o.l)}</option>`).join('')}</select>`;
          break;
        case 'check':
          input = `<label class="check-row" style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="${id}" data-fkey="${f.key}"${val?' checked':''}> ${escapeHTML(f.label||'オン')}</label>`;
          break;
        case 'richlist':
          input = this._renderRepeater(mod, f);
          break;
        default: // text
          input = `<input type="text" class="text-input" id="${id}" data-fkey="${f.key}" value="${escapeAttr(val)}" placeholder="${escapeHTML(f.placeholder||'')}">`;
      }
      if (f.type === 'check') {
        return `<div class="inspector-section">${input}</div>`;
      }
      return `<div class="inspector-section">
        <label class="fld-label" for="${id}">${escapeHTML(f.label)}${f.hint?` <span class="fld-hint">${escapeHTML(f.hint)}</span>`:''}</label>
        ${input}
      </div>`;
    },

    _renderRepeater(mod, f) {
      const items = Array.isArray(mod.data[f.key]) ? mod.data[f.key] : [];
      const itemsHtml = items.map((it, idx) => {
        const fieldsHtml = f.itemFields.map(iff => {
          const subId = `rte-${mod.id}-${f.key}-${idx}-${iff.key}`;
          let sub;
          const v = it[iff.key];
          if (iff.type === 'textarea') {
            sub = `<textarea class="text-input" id="${subId}" data-rte="1" data-fkey="${f.key}" data-ridx="${idx}" data-rkey="${iff.key}">${escapeHTML(v)}</textarea>`;
          } else if (iff.type === 'number') {
            sub = `<input type="number" class="text-input" id="${subId}" data-rte="1" data-fkey="${f.key}" data-ridx="${idx}" data-rkey="${iff.key}" value="${escapeAttr(v)}" step="any">`;
          } else if (iff.type === 'image' || iff.type === 'url') {
            sub = `<input type="url" class="text-input" id="${subId}" data-rte="1" data-fkey="${f.key}" data-ridx="${idx}" data-rkey="${iff.key}" value="${escapeAttr(v)}" placeholder="URL">`;
          } else if (iff.type === 'check') {
            sub = `<input type="checkbox" id="${subId}" data-rte="1" data-fkey="${f.key}" data-ridx="${idx}" data-rkey="${iff.key}"${v?' checked':''}>`;
          } else {
            sub = `<input type="text" class="text-input" id="${subId}" data-rte="1" data-fkey="${f.key}" data-ridx="${idx}" data-rkey="${iff.key}" value="${escapeAttr(v)}">`;
          }
          return `<div class="inspector-section"><label class="fld-label">${escapeHTML(iff.label)}</label>${sub}</div>`;
        }).join('');
        return `<div class="repeater-item">
          <div class="ri-head">
            <span class="ri-title">${idx+1} 件目</span>
            <div class="ri-actions">
              <button class="icon-btn" data-act="rup" data-fkey="${f.key}" data-ridx="${idx}" title="上へ">▲</button>
              <button class="icon-btn" data-act="rdown" data-fkey="${f.key}" data-ridx="${idx}" title="下へ">▼</button>
              <button class="icon-btn danger" data-act="rdel" data-fkey="${f.key}" data-ridx="${idx}" title="削除">×</button>
            </div>
          </div>
          ${fieldsHtml}
        </div>`;
      }).join('');

      return `<div class="inspector-section">
        <label class="fld-label">${escapeHTML(f.label)} <span class="fld-hint">（${items.length}件）</span></label>
        ${itemsHtml}
        <button class="add-item-btn" data-act="radd" data-fkey="${f.key}">＋ 追加</button>
      </div>`;
    },

    /** 入力イベントを束ねる（app.js から呼ぶ） */
    bindInputs() {
      const root = this.container;
      // 通常フィールド
      root.addEventListener('input', (e) => {
        const t = e.target;
        const fkey = t.getAttribute('data-fkey');
        if (!fkey || !this._currentId) return;
        if (t.getAttribute('data-rte') === '1') {
          // リピータ内
          const idx = parseInt(t.getAttribute('data-ridx'), 10);
          const rkey = t.getAttribute('data-rkey');
          let v = t.type === 'checkbox' ? t.checked : t.value;
          LP.State.updateRepeaterItem(this._currentId, fkey, idx, rkey, v);
          return;
        }
        // color: -text ペア
        if (fkey.endsWith('-text')) {
          const realKey = fkey.slice(0, -5);
          const colorVal = t.value;
          // 対になる color input を更新
          const colorInput = root.querySelector(`[data-fkey="${realKey}"][type="color"]`);
          if (colorInput) colorInput.value = colorVal;
          LP.State.updateModuleData(this._currentId, realKey, colorVal);
          return;
        }
        let v = t.type === 'checkbox' ? t.checked : t.value;
        if (t.type === 'number') v = t.value === '' ? '' : Number(t.value);
        // color input の場合は対になる text を更新
        if (t.type === 'color') {
          const textInput = root.querySelector(`[data-fkey="${fkey}-text"]`);
          if (textInput) textInput.value = t.value;
        }
        LP.State.updateModuleData(this._currentId, fkey, v);
      });
      root.addEventListener('change', (e) => {
        // select 等の change も input として扱う
        const t = e.target;
        if (t.tagName === 'SELECT') {
          const fkey = t.getAttribute('data-fkey');
          if (fkey && this._currentId) LP.State.updateModuleData(this._currentId, fkey, t.value);
        }
      });
      // リピータ操作ボタン
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || !this._currentId) return;
        const act = btn.getAttribute('data-act');
        const fkey = btn.getAttribute('data-fkey');
        if (act === 'radd') {
          const f = LP.Modules.get(LP.State.getSelected().type).schema.find(x => x.key === fkey);
          const item = Object.assign({}, f.itemDefault || {});
          LP.State.addRepeaterItem(this._currentId, fkey, item);
        } else if (act === 'rdel') {
          LP.State.removeRepeaterItem(this._currentId, fkey, parseInt(btn.getAttribute('data-ridx'),10));
        } else if (act === 'rup') {
          LP.State.moveRepeaterItem(this._currentId, fkey, parseInt(btn.getAttribute('data-ridx'),10), -1);
        } else if (act === 'rdown') {
          LP.State.moveRepeaterItem(this._currentId, fkey, parseInt(btn.getAttribute('data-ridx'),10), 1);
        }
      });
    }
  };

  function escapeHTML(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function escapeAttr(s){return escapeHTML(s).replace(/"/g,'&quot;');}

  LP.Inspector = Inspector;
})();

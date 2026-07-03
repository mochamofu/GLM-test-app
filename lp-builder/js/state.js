/* =========================================================
   state.js — プロジェクト状態 ＋ 履歴（Undo/Redo）＋ 自動保存
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const HISTORY_LIMIT = 60;
  const AUTOSAVE_DELAY = 500;

  // モジュール ID 採番
  let _idCounter = 0;
  function genId(prefix) {
    _idCounter += 1;
    return (prefix || 'm') + '_' + Date.now().toString(36) + '_' + (_idCounter).toString(36);
  }

  /** 新規の空プロジェクト */
  function createBlankProject() {
    return {
      version: 1,
      name: '無題のプロジェクト',
      title: '',
      templateId: 'cosme-clear-pink',
      theme: {
        font: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
        radius: 12,
        primary: '#e87a8b',
        accent: '#f6c453',
        bg: '#ffffff',
        text: '#2d2a26'
      },
      modules: []
    };
  }

  const State = {
    project: null,
    selectedId: null,
    device: 'pc',

    // 屷史
    _undo: [],
    _redo: [],
    _suspendHistory: false,
    _autosaveTimer: null,

    // リスナ（app.js が登録）
    _listeners: {},
    on(event, fn) { (this._listeners[event] = this._listeners[event] || []).push(fn); },
    _emit(event, payload) {
      (this._listeners[event] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
    },

    /** 初期化: localStorage があれば復元、無ければ空プロジェクト */
    init() {
      const saved = LP.Persistence.loadLocal();
      if (saved && saved.version === 1) {
        this.project = saved;
        // _idCounter の重複回避: 既存 id の最大値を拾う（簡易）
      } else {
        this.project = createBlankProject();
      }
      this._undo = [];
      this._redo = [];
      this._emit('loaded', this.project);
      return this.project;
    },

    /** 現在の状態を履歴に保存してから変更を行うためのスナップショット */
    _snapshot() {
      this._undo.push(JSON.stringify(this.project));
      if (this._undo.length > HISTORY_LIMIT) this._undo.shift();
      this._redo = [];
      this._emitHistory();
    },

    _emitHistory() {
      this._emit('history', { canUndo: this._undo.length > 0, canRedo: this._redo.length > 0 });
    },

    /** 変更を履歴付きで開始（batch update で1履歴にまとめるなら transaction 使用） */
    beginChange() {
      if (!this._suspendHistory) this._snapshot();
      this._scheduleAutosave();
    },

    /** 自動保存（debounce） */
    _scheduleAutosave() {
      if (this._autosaveTimer) clearTimeout(this._autosaveTimer);
      this._autosaveTimer = setTimeout(() => {
        if (this.project) {
          LP.Persistence.saveLocal(this.project);
          this._emit('autosaved');
        }
      }, AUTOSAVE_DELAY);
    },

    /** プロジェクト全体を差し替え（テンプレート読込・JSON読込用）。履歴1件。 */
    replaceProject(newProject) {
      this._snapshot();
      this.project = newProject;
      this.selectedId = null;
      this._scheduleAutosave();
      this._emit('changed');
      this._emit('selection', null);
    },

    // ============ モジュール操作 ============
    addModule(type, atIndex, variantId) {
      if (!LP.Modules) return null;
      const def = LP.Modules.get(type);
      if (!def) return null;
      const variant = LP.Modules.getVariant(type, variantId) || def.variants[0];
      this.beginChange();
      const mod = {
        id: genId(type),
        type: type,
        // 選択バリアントのスキーマからデフォルト値を生成 + variantId を付与
        data: Object.assign(
          { variantId: variant.id },
          LP.Modules.defaultData(variant.schema)
        )
      };
      if (typeof atIndex === 'number') {
        this.project.modules.splice(atIndex, 0, mod);
      } else {
        this.project.modules.push(mod);
      }
      this.selectedId = mod.id;
      this._emit('changed');
      this._emit('selection', mod.id);
      return mod;
    },

    removeModule(id) {
      const idx = this._findIndex(id);
      if (idx < 0) return;
      this.beginChange();
      this.project.modules.splice(idx, 1);
      if (this.selectedId === id) this.selectedId = null;
      this._emit('changed');
      this._emit('selection', this.selectedId);
    },

    duplicateModule(id) {
      const idx = this._findIndex(id);
      if (idx < 0) return;
      const src = this.project.modules[idx];
      this.beginChange();
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = genId(src.type);
      this.project.modules.splice(idx + 1, 0, copy);
      this.selectedId = copy.id;
      this._emit('changed');
      this._emit('selection', copy.id);
    },

    /** バリアント切替: 共通キーは保持、新バリアント専用キーは初期値を補完、旧専用キーは削除 */
    switchVariant(id, newVariantId) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod) return;
      const type = mod.type;
      const newVariant = LP.Modules.getVariant(type, newVariantId);
      if (!newVariant || newVariant.id === (mod.data.variantId)) return;
      const oldVariant = LP.Modules.getVariant(type, mod.data.variantId);
      const oldKeys = oldVariant ? oldVariant.schema.map(f => f.key) : [];
      const newKeys = newVariant.schema.map(f => f.key);
      // 新バリアントのデフォルト値
      const newDefaults = LP.Modules.defaultData(newVariant.schema);
      this.beginChange();
      const newData = { variantId: newVariant.id };
      // 新スキーマの各キーについて、旧データに同名キーがあれば保持、無ければデフォルト
      newKeys.forEach(k => {
        newData[k] = (mod.data[k] !== undefined) ? mod.data[k] : newDefaults[k];
      });
      mod.data = newData;
      this._emit('changed', { moduleId: id, variant: true });
      this._emit('selection', id);
    },

    moveModule(id, dir) {
      const idx = this._findIndex(id);
      if (idx < 0) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= this.project.modules.length) return;
      this.beginChange();
      const arr = this.project.modules;
      const [item] = arr.splice(idx, 1);
      arr.splice(newIdx, 0, item);
      this._emit('changed');
    },

    reorder(fromId, toId, position) {
      const fromIdx = this._findIndex(fromId);
      const toIdx = this._findIndex(toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      this.beginChange();
      const arr = this.project.modules;
      const [item] = arr.splice(fromIdx, 1);
      // position 'before' or 'after' は toId 基準
      let insertAt = arr.findIndex(m => m.id === toId);
      if (position === 'after') insertAt += 1;
      arr.splice(insertAt, 0, item);
      this._emit('changed');
    },

    select(id) {
      this.selectedId = id;
      this._emit('selection', id);
    },

    getSelected() {
      if (!this.selectedId) return null;
      return this.project.modules.find(m => m.id === this.selectedId) || null;
    },

    /** モジュールのデータを更新。field はドット区切り可（例: 'title'）。 */
    updateModuleData(id, field, value) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod) return;
      this.beginChange();
      // ドット区切りは使わず、フィールド名そのまま（スキーマはフラット）
      mod.data[field] = value;
      this._emit('changed', { moduleId: id, field });
    },

    /** リピータ用: 配列フィールドへアイテム追加/削除/更新 */
    addRepeaterItem(id, field, item) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod) return;
      this.beginChange();
      if (!Array.isArray(mod.data[field])) mod.data[field] = [];
      mod.data[field].push(item);
      this._emit('changed', { moduleId: id, field });
    },
    updateRepeaterItem(id, field, index, key, value) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod || !Array.isArray(mod.data[field])) return;
      const item = mod.data[field][index];
      if (!item) return;
      this.beginChange();
      item[key] = value;
      this._emit('changed', { moduleId: id, field });
    },
    removeRepeaterItem(id, field, index) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod || !Array.isArray(mod.data[field])) return;
      this.beginChange();
      mod.data[field].splice(index, 1);
      this._emit('changed', { moduleId: id, field });
    },
    moveRepeaterItem(id, field, index, dir) {
      const mod = this.project.modules.find(m => m.id === id);
      if (!mod || !Array.isArray(mod.data[field])) return;
      const arr = mod.data[field];
      const ni = index + dir;
      if (ni < 0 || ni >= arr.length) return;
      this.beginChange();
      const [it] = arr.splice(index, 1);
      arr.splice(ni, 0, it);
      this._emit('changed', { moduleId: id, field });
    },

    // ============ テーマ/プロジェクト設定 ============
    updateTheme(key, value) {
      this.beginChange();
      this.project.theme[key] = value;
      this._emit('changed');
    },
    updateProjectMeta(key, value) {
      this.beginChange();
      this.project[key] = value;
      this._emit('changed');
      if (key === 'name') this._emit('renamed', value);
    },
    setTemplate(templateId) {
      this.beginChange();
      this.project.templateId = templateId;
      // テーマ色も上書き
      const tpl = LP.Templates.get(templateId);
      if (tpl) {
        this.project.theme = Object.assign({}, this.project.theme, tpl.theme());
      }
      this._emit('changed');
    },
    clearAllModules() {
      this.beginChange();
      this.project.modules = [];
      this.selectedId = null;
      this._emit('changed');
      this._emit('selection', null);
    },

    // ============ 屷史操作 ============
    undo() {
      if (this._undo.length === 0) return;
      this._redo.push(JSON.stringify(this.project));
      const prev = this._undo.pop();
      this._suspendHistory = true;
      try {
        this.project = JSON.parse(prev);
      } finally {
        this._suspendHistory = false;
      }
      LP.Persistence.saveLocal(this.project);
      this._emit('changed');
      this._emit('selection', this.selectedId);
      this._emitHistory();
    },
    redo() {
      if (this._redo.length === 0) return;
      this._undo.push(JSON.stringify(this.project));
      const next = this._redo.pop();
      this._suspendHistory = true;
      try {
        this.project = JSON.parse(next);
      } finally {
        this._suspendHistory = false;
      }
      LP.Persistence.saveLocal(this.project);
      this._emit('changed');
      this._emit('selection', this.selectedId);
      this._emitHistory();
    },

    _findIndex(id) {
      return this.project.modules.findIndex(m => m.id === id);
    },

    createBlankProject,
    genId
  };

  LP.State = State;
})();

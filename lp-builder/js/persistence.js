/* =========================================================
   persistence.js — localStorage 自動保存 ＋ JSON 入出力
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};
  const STORAGE_KEY = 'lp-builder.project.v1';

  const Persistence = {
    /** localStorage へ保存（自動保存で使用）。失敗は握りつぶす。 */
    saveLocal(project) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        return true;
      } catch (e) {
        console.warn('localStorage 保存に失敗:', e);
        return false;
      }
    },

    /** localStorage から読込。無ければ null。 */
    loadLocal() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('localStorage 読込に失敗:', e);
        return null;
      }
    },

    clearLocal() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    },

    /** JSON ファイルとしてダウンロード */
    downloadJSON(project) {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = (project.name || 'lp-project').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'lp-project';
      a.href = url;
      a.download = safe + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /** File オブジェクトからプロジェクトを読込 → Promise<project> */
    loadFromFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            resolve(data);
          } catch (e) {
            reject(new Error('JSON の解析に失敗しました: ' + e.message));
          }
        };
        reader.onerror = () => reject(new Error('ファイルの読込に失敗しました'));
        reader.readAsText(file, 'utf-8');
      });
    },

    STORAGE_KEY
  };

  LP.Persistence = Persistence;
})();

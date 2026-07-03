/* =========================================================
   preview.js — プレビュー iframe の描画 ＋ デバイストグル
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const SIZES = { pc: 1280, tablet: 768, sp: 375 };
  const SIZE_LABEL = { pc: '1280px', tablet: '768px', sp: '375px' };

  const Preview = {
    iframe: null,
    sizer: null,
    sizeLabel: null,
    device: 'pc',
    _pendingDoc: null, // iframe 初期化前の一時保持

    init() {
      this.iframe = document.getElementById('preview-iframe');
      this.sizer = document.getElementById('preview-sizer');
      this.sizeLabel = document.getElementById('preview-size');
      // iframe への書込は srcdoc を使う（file:// でも動く）
      this._setupMessage();
    },

    setDevice(device) {
      if (!SIZES[device]) return;
      this.device = device;
      this.sizer.setAttribute('data-device', device);
      if (this.sizeLabel) this.sizeLabel.textContent = SIZE_LABEL[device];
      // iframe 高さを画面に合わせる
      this._adjustHeight();
    },

    _adjustHeight() {
      // sizer の幅が狭いと、iframe 内容がはみ出さないよう高さ調整は CSS vh で充分
    },

    // postMessage 受信（iframe 内からのモジュール選択通知）
    _setupMessage() {
      window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.source !== 'lp-builder') return;
        if (d.type === 'select' && d.moduleId) {
          LP.State.select(d.moduleId);
        }
      });
    },

    // プロジェクトを描画（srcdoc で完全ドキュメント注入）
    async render(project) {
      if (!this.iframe) return;
      const doc = await LP.Renderer.renderDocument(project, {
        editable: true,
        selectedId: LP.State.selectedId
      });
      this.iframe.srcdoc = doc;
    },

    /** プレビュー全体の HTML を取得（別タブ表示用） */
    async getStandaloneHTML(project) {
      return await LP.Renderer.renderDocument(project, { editable: false });
    },

    /** 別タブでプレビュー表示（Blob URL） */
    async openInNewTab(project) {
      const html = await this.getStandaloneHTML(project);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  LP.Preview = Preview;
})();

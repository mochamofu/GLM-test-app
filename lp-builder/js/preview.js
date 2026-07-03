/* =========================================================
   preview.js — プレビュー iframe 描画 ＋ デバイストグル ＋ ミニマップ（全体俯瞰）
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const SIZES = { pc: 1280, tablet: 768, sp: 375 };
  const SIZE_LABEL = { pc: '1280px', tablet: '768px', sp: '375px' };

  const Preview = {
    iframe: null,
    sizer: null,
    stage: null,
    sizeLabel: null,
    device: 'pc',
    overview: false, // 全体俯瞰モード
    contentHeight: 0, // iframe 内ドキュメントの実高さ
    _scrollPending: false,

    init() {
      this.iframe = document.getElementById('preview-iframe');
      this.sizer = document.getElementById('preview-sizer');
      this.stage = document.getElementById('preview-stage');
      this.sizeLabel = document.getElementById('preview-size');
      this._setupMessage();
    },

    setDevice(device) {
      if (!SIZES[device]) return;
      this.device = device;
      this.sizer.setAttribute('data-device', device);
      if (this.sizeLabel) this.sizeLabel.textContent = SIZE_LABEL[device];
      this.applyOverview();
    },

    /** 全体俯瞰モードの ON/OFF */
    setOverview(on) {
      this.overview = on;
      this.sizer.classList.toggle('overview', on);
      this.applyOverview();
      // ボタン状態は app.js で制御
    },

    /** 全体モードの scale を計算して適用 */
    applyOverview() {
      if (!this.overview) {
        // 通常モード: scale リセット、iframe高さは固定
        this.sizer.style.transform = '';
        this.sizer.style.transformOrigin = '';
        this.sizer.style.height = '';
        this.iframe.style.height = '75vh';
        return;
      }
      // 全体モード: iframe の高さを実内容に合わせ、sizer全体を縮小
      const stageW = this.stage.clientWidth - 48; // padding 24px*2
      const stageH = this.stage.clientHeight - 48;
      const baseW = SIZES[this.device];
      // 内容高さが未確定なら一旦仮置き
      const contentH = this.contentHeight || 2000;
      // 幅が収まる scale と、高さが収まる scale の小さい方
      const scaleW = stageW / baseW;
      const scaleH = stageH / contentH;
      const scale = Math.min(scaleW, scaleH, 1);
      this.sizer.style.transform = `scale(${scale})`;
      this.sizer.style.transformOrigin = 'top center';
      // iframe の高さを実内容に合わせ（scale前の実寸）
      this.iframe.style.height = contentH + 'px';
    },

    _setupMessage() {
      window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.source !== 'lp-builder') return;
        if (d.type === 'select' && d.moduleId) {
          LP.State.select(d.moduleId);
        } else if (d.type === 'height' && typeof d.height === 'number') {
          this.contentHeight = d.height;
          if (this.overview) this.applyOverview();
        }
      });
    },

    /** プロジェクトを描画 */
    async render(project) {
      if (!this.iframe) return;
      const doc = await LP.Renderer.renderDocument(project, {
        editable: true,
        selectedId: LP.State.selectedId
      });
      this.iframe.srcdoc = doc;
      // 高さは iframe ロード後に通知が来るので再計算
      setTimeout(() => { if (this.overview) this.applyOverview(); }, 400);
    },

    /** 選択モジュールへスクロール（iframe内へメッセージ送信） */
    scrollToModule(moduleId, smooth) {
      if (!this.iframe || !moduleId) return;
      this.iframe.contentWindow.postMessage({
        target: 'lp-iframe', type: 'scrollTo', moduleId: moduleId, smooth: smooth !== false
      }, '*');
    },

    async getStandaloneHTML(project) {
      return await LP.Renderer.renderDocument(project, { editable: false });
    },

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

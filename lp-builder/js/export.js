/* =========================================================
   export.js — エクスポート生成
   1) 完全HTML 1枚（Shopify ページ本文に貼る / 単体動作）
   2) Shopify Liquid section（Online Store 2.0, blocks 型）
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  const Export = {
    /** 完全HTML 1枚（renderer を編集モードOFFで流用） */
    async standaloneHTML(project) {
      // CSS は LP.LP_CSS（文字列）を inline 化（出力後は単体で動く）
      const css = LP.LP_CSS || '';
      return await LP.Renderer.renderDocument(project, { editable: false, inlineCss: css });
    },

    /** Shopify Liquid section 形式
     *  各モジュールを1つの block として settings 付きで出力。
     *  ただし全モジュールのスキーマを settings に展開すると巨大になるため、
     *  「一般的なカスタマイズ可能な主要項目」を settings に、本文詳細は block.settings に格納する構成。
     *  → 実装上は「モジュールのHTML出力をそのまま Liquid に埋め込む簡易方式」＋
     *    「テーマカラー等のグローバル設定」を section settings として出力。
     *  これにより、Shopify 管理画面のカスタマイズで色変更が可能。
     */
    async liquidSection(project) {
      const css = LP.LP_CSS || '';
      const theme = project.theme || {};
      const body = LP.Renderer.renderModules(project, {});

      // section settings（Shopify 管理画面で編集可能）
      const settings = [
        { type: 'header', content: '🎨 LP Builder 設定' },
        { type: 'color', id: 'primary', label: 'テーマカラー', default: theme.primary || '#e87a8b' },
        { type: 'color', id: 'accent', label: 'アクセントカラー', default: theme.accent || '#f6c453' },
        { type: 'color', id: 'bg', label: '背景色', default: theme.bg || '#ffffff' },
        { type: 'color', id: 'text', label: '文字色', default: theme.text || '#2d2a26' },
        { type: 'range', id: 'radius', label: '角丸', min: 0, max: 48, step: 1, default: theme.radius != null ? theme.radius : 12, unit: 'px' },
        { type: 'select', id: 'font', label: 'フォント', default: (theme.font||'').slice(0,40) || "'Hiragino Sans',sans-serif",
          options: [
            { value: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", label: 'ヒラギノ / Noto Sans JP' },
            { value: "'Yu Gothic','YuGothic','Noto Sans JP',sans-serif", label: '游ゴシック系' },
            { value: "'Noto Serif JP','Hiragino Mincho ProN',serif", label: '明朝（Noto Serif JP）' },
            { value: "'Hiragino Maru Gothic ProN',sans-serif", label: '丸ゴシック系' }
          ] }
      ];
      // Liquid内で正しく出力できるよう、schema settings の JSON を文字列化
      const settingsJSON = JSON.stringify(settings, null, 6)
        .replace(/\{/g, '{').replace(/\}/g, '}');

      // CSS を Liquid に埋め込み、CSS変数を section.settings から注入
      const liquidCss = (css || '')
        // CSS 変数のデフォルトを上書きせず、Liquid 側で style タグ出力する
      ;

      const blocks = project.modules.map(m => {
        const def = LP.Modules.get(m.type);
        return {
          type: m.type,
          name: def ? def.name : m.type
          // 各 block の settings は省略: 編集はエディタ側で完結する設計のため
        };
      });

      const schema = {
        name: 'LP Builder',
        tag: 'section',
        class: 'lp-builder-section',
        settings: settings,
        blocks: blocks.map(b => ({ type: b.type, name: b.name, limit: 1 })),
        max_blocks: 20,
        presets: [
          { name: 'LP Builder', blocks: project.modules.slice(0, 6).map(m => ({ type: m.type })) }
        ]
      };

      // 出力: section liquid ファイル
      const liquid = `{%- comment -%}
  LP Builder が出力した Shopify section
  ファイル場所: sections/lp-builder.liquid
  使い方: テーマエディタ「セクションを追加」→「LP Builder」を選択
  ※ 本文（モジュール内容）は LP Builder で編集した内容がそのまま出力されます。
    テーマカラー等は section settings から動的に変更可能。
{%- endcomment -%}

<style>
${liquidCss}
</style>

<div class="lp-root"
  style="--lp-primary: {{ section.settings.primary }};
         --lp-accent: {{ section.settings.accent }};
         --lp-bg: {{ section.settings.bg }};
         --lp-text: {{ section.settings.text }};
         --lp-radius: {{ section.settings.radius }}px;
         --lp-font: {{ section.settings.font }};">
${indent(body, '  ')}
</div>

<script>
${LP.Renderer.COUNTDOWN_JS}
</script>

{% schema %}
${JSON.stringify(schema, null, 2)}
{% endschema %}
`;
      return liquid;
    }
  };

  function indent(str, prefix) {
    return String(str).split('\n').map(l => prefix + l).join('\n');
  }

  LP.Export = Export;
})();

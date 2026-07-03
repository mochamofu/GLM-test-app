/* =========================================================
   modules.js — 16 種の日本向け LP モジュール定義
   各モジュール: { type, name, icon, desc, schema, render(data,ctx), liquid(schema名), defaultStructure }
   ctx = { theme, escape, img, formatPrice }
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  // ---------- 共有ヘルパ ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // 改行 → <br>
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

  // 画像未指定時のプレースホルダ SVG（差し替え前提）
  const img = (url, w, h, label) => {
    if (url) return url;
    const W = w || 800, H = h || 600;
    const t = esc(label || '画像');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>` +
      `<rect width='100%' height='100%' fill='#eef0f3'/>` +
      `<text x='50%' y='50%' font-family='Hiragino Sans, sans-serif' font-size='${Math.round(Math.min(W, H) / 12)}' fill='#aeb4bd' text-anchor='middle' dominant-baseline='middle'>${t}</text>` +
      `<text x='50%' y='62%' font-family='Hiragino Sans, sans-serif' font-size='${Math.round(Math.min(W, H) / 22)}' fill='#c4c9d2' text-anchor='middle'>${W}×${H}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  // 税込価格表示（日本LPらしく「税込」表記）
  const formatPrice = (n) => {
    const num = Number(n);
    if (isNaN(num)) return esc(n);
    return '¥' + num.toLocaleString('ja-JP');
  };

  // 数字 → 漢数字（手順用。1-99）
  const toKan = (n) => {
    const kan = ['','一','二','三','四','五','六','七','八','九'];
    const tens = ['','十','二十','三十','四十','五十','六十','七十','八十','九十'];
    if (n <= 0) return String(n);
    if (n < 10) return kan[n];
    if (n < 100) return tens[Math.floor(n/10)] + kan[n%10];
    return String(n);
  };

  // スキーマのフィールド型
  // { key, label, type: 'text'|'textarea'|'number'|'color'|'image'|'url'|'select'|'richlist', options?, default, hint?, placeholder? }
  // richlist: { type:'richlist', itemFields:[{key,label,type,...}], itemDefault:{...} }

  function defaultData(schema) {
    const out = {};
    schema.forEach(f => {
      if (f.type === 'richlist') {
        out[f.key] = (f.default || []).map(it => Object.assign({}, f.itemDefault || {}, it));
      } else if (f.type === 'check') {
        out[f.key] = f.default === undefined ? true : f.default;
      } else {
        out[f.key] = f.default != null ? f.default : '';
      }
    });
    return out;
  }

  // ---------- モジュール定義 ----------
  const MODULES = [

    /* 1. お知らせバー ------------------------------------------ */
    {
      type: 'notice', name: 'お知らせバー', icon: '📢',
      desc: '画面上部の細い告知帯。セール・送料無料など。',
      schema: [
        { key: 'text', label: '表示テキスト', type: 'text', default: '🎉 今だけ！全品送料無料 ＋ 初回購入で10%OFFクーポン配布中', placeholder: 'セール・送料無料告知など' },
        { key: 'bg', label: '背景色', type: 'color', default: '#e87a8b' },
        { key: 'fg', label: '文字色', type: 'color', default: '#ffffff' },
        { key: 'linkUrl', label: 'リンク先URL（任意）', type: 'url', default: '', placeholder: 'https://...' },
        { key: 'linkText', label: 'リンク文言（任意）', type: 'text', default: '詳細はこちら →', placeholder: '空欄でリンクなし' }
      ],
      render(d, ctx) {
        const linkInner = d.linkText ? `<span class="nt-link">${esc(d.linkText)}</span>` : '';
        const inner = `<span class="nt-text">${esc(d.text)}</span>${linkInner}`;
        const style = `background:${esc(d.bg)};color:${esc(d.fg)};`;
        if (d.linkUrl) {
          return `<div class="lp-notice" style="${style}"><a href="${esc(d.linkUrl)}" style="color:inherit">${inner}</a></div>`;
        }
        return `<div class="lp-notice" style="${style}">${inner}</div>`;
      },
      liquid() { return null; } //Liquidは sections の blocks として出力; 個別HTMLはrenderを流用
    },

    /* 2. ヒーロー（ファーストビュー） -------------------------- */
    {
      type: 'hero', name: 'ヒーロー（ファーストビュー）', icon: '🌅',
      desc: '商品名・キャッチコピー・CTAを画像背景で大判表示。',
      schema: [
        { key: 'image', label: '背景画像', type: 'image', default: '', placeholder: '推奨 1600×900' },
        { key: 'align', label: 'テキスト位置', type: 'select', default: 'left',
          options: [{v:'left',l:'左'},{v:'center',l:'中央'},{v:'right',l:'右'}] },
        { key: 'eyebrow', label: 'アイキャッチ（小テキスト）', type: 'text', default: '期間限定・先行予約', placeholder: 'サブテキスト' },
        { key: 'title', label: 'メインキャッチコピー', type: 'text', default: '毎日のスキンケアが、<br>明日の自信にかわる。', placeholder: '太字で大きく表示' },
        { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '話題の美容成分を贅沢に配合。30日間の返金保証付きで、お気軽にお試しいただけます。' },
        { key: 'ctaText', label: 'メインボタン文言', type: 'text', default: '今すぐお試しする' },
        { key: 'ctaUrl', label: 'ボタンリンク先', type: 'url', default: '#cta' },
        { key: 'ctaSub', label: '補足（ボタン下）', type: 'text', default: '▲ 今だけ送料無料・代引手数料無料' },
        { key: 'overlay', label: '暗さ（0〜0.8）', type: 'number', default: 0.35, hint: '背景画像の上の黒透過' },
        { key: 'height', label: '高さ（px）', type: 'number', default: 560, hint: 'PC表示時。SPは自動縮小' }
      ],
      render(d, ctx) {
        const style = `background-image:linear-gradient(rgba(0,0,0,${esc(d.overlay)}),rgba(0,0,0,${esc(d.overlay)})),url('${ctx.img(d.image,1600,900,'ヒーロー画像')}');min-height:${esc(d.height)}px;text-align:${esc(d.align)};`;
        return `<section class="lp-hero" style="${style}">
          <div class="lp-container lp-hero-inner lp-align-${esc(d.align)}">
            ${d.eyebrow ? `<p class="lp-eyebrow">${esc(d.eyebrow)}</p>` : ''}
            <h1 class="lp-hero-title">${d.title}</h1>
            ${d.subtitle ? `<p class="lp-hero-sub">${nl2br(d.subtitle)}</p>` : ''}
            ${d.ctaText ? `<div class="lp-hero-cta"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>` : ''}
            ${d.ctaSub ? `<p class="lp-hero-note">${esc(d.ctaSub)}</p>` : ''}
          </div>
        </section>`;
      }
    },

    /* 3. リード文（導入） -------------------------------------- */
    {
      type: 'lead', name: 'リード文（導入）', icon: '📝',
      desc: '中央寄せの導入文。見出し＋本文。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'ABOUT' },
        { key: 'title', label: '見出し', type: 'text', default: 'こんなお悩み、ありませんか？' },
        { key: 'body', label: '本文', type: 'textarea', default: '朝晩の忙しい時間。鏡を見るたび、肌のハリやくすみが気になっていませんか。\nいつものスキンケアでは物足りない、そんな方に。' },
        { key: 'bg', label: '背景色', type: 'color', default: '#fff7f8' }
      ],
      render(d, ctx) {
        return `<section class="lp-lead" style="background:${esc(d.bg)}">
          <div class="lp-container lp-center">
            ${d.eyebrow ? `<p class="lp-eyebrow">${esc(d.eyebrow)}</p>` : ''}
            <h2 class="lp-h2">${esc(d.title)}</h2>
            <div class="lp-lead-body">${nl2br(d.body)}</div>
          </div>
        </section>`;
      }
    },

    /* 4. 3つのメリット ---------------------------------------- */
    {
      type: 'features', name: '3つのメリット', icon: '✨',
      desc: 'アイコン＋見出し＋説明の3カラム。強みアピール。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FEATURES' },
        { key: 'title', label: '見出し', type: 'text', default: '選ばれる3つの理由' },
        { key: 'features', label: '特徴リスト', type: 'richlist', itemDefault: {icon:'✨', title:'特徴', desc:'説明文'},
          default: [
            { icon:'💧', title:'うるおい持続', desc:'独自の保湿処方で、朝まで潤い続く肌へ。' },
            { icon:'🌱', title:'無添加処方', desc:'パラベン・鉱物油フリー。敏感肌の方にも。' },
            { icon:'🌸', title:'国産・安心', desc:'日本の工場で丁寧に製造。品質へのこだわり。' }
          ],
          itemFields: [
            { key:'icon', label:'アイコン（絵文字）', type:'text' },
            { key:'title', label:'見出し', type:'text' },
            { key:'desc', label:'説明文', type:'textarea' }
          ] }
      ],
      render(d, ctx) {
        const items = (d.features||[]).map(f => `
          <div class="lp-feature">
            <div class="lp-feature-icon">${esc(f.icon)}</div>
            <h3 class="lp-feature-title">${esc(f.title)}</h3>
            <p class="lp-feature-desc">${nl2br(f.desc)}</p>
          </div>`).join('');
        return `<section class="lp-features">
          <div class="lp-container">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-feature-grid">${items}</div>
          </div>
        </section>`;
      }
    },

    /* 5. 画像＋文章（交互レイアウト） -------------------------- */
    {
      type: 'imageText', name: '画像＋文章（交互）', icon: '🖼️',
      desc: '画像と文章のペア。複数追加で左右交互レイアウト。',
      schema: [
        { key: 'items', label: '画像＋文章のペア', type: 'richlist',
          itemDefault: { image:'', title:'見出し', body:'説明文', ctaText:'', ctaUrl:'' },
          default: [
            { image:'', title:'こだわりの原料', body:'厳選した3種の植物由来成分を配合。\n肌に優しく、ハリを与えます。', ctaText:'詳しく見る', ctaUrl:'#' },
            { image:'', title:'使い続けるほどの変化', body:'使い始めの1週間。肌の調子が違うと感じていただけるはず。', ctaText:'', ctaUrl:'' }
          ],
          itemFields: [
            { key:'image', label:'画像', type:'image' },
            { key:'title', label:'見出し', type:'text' },
            { key:'body', label:'本文', type:'textarea' },
            { key:'ctaText', label:'ボタン文言（任意）', type:'text' },
            { key:'ctaUrl', label:'ボタンリンク先', type:'url' }
          ] }
      ],
      render(d, ctx) {
        const items = (d.items||[]).map((it, i) => {
          const rev = i % 2 === 1 ? ' lp-it-reverse' : '';
          const cta = it.ctaText ? `<a class="lp-btn lp-btn-outline" href="${esc(it.ctaUrl||'#')}">${esc(it.ctaText)}</a>` : '';
          return `<div class="lp-it-row${rev}">
            <div class="lp-it-img"><img src="${ctx.img(it.image,800,600,'画像'+(i+1))}" alt="${esc(it.title)}" loading="lazy"></div>
            <div class="lp-it-text">
              <h3 class="lp-it-title">${esc(it.title)}</h3>
              <p class="lp-it-body">${nl2br(it.body)}</p>
              ${cta}
            </div>
          </div>`;
        }).join('');
        return `<section class="lp-image-text"><div class="lp-container">${items}</div></section>`;
      }
    },

    /* 6. ステップ・手順 ---------------------------------------- */
    {
      type: 'steps', name: 'ステップ・手順', icon: '📋',
      desc: '使い方・流れを順番に。番号付き。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'HOW TO USE' },
        { key: 'title', label: '見出し', type: 'text', default: 'たった3ステップで、もっと綺麗に' },
        { key: 'steps', label: 'ステップ', type: 'richlist',
          itemDefault: { title:'ステップ', desc:'説明文' },
          default: [
            { title:'洗顔後、清潔な肌に', desc:'朝晩の洗顔後、タオルで優しく水分を拭き取ります。' },
            { title:'適量を手に取り', desc:'パール粒大を手に取り、顔全体に優しくなじませます。' },
            { title:'ハンドプレスで浸透', desc:'手のひらで包み込むよう、体温で肌へ馴染ませます。' }
          ],
          itemFields: [
            { key:'title', label:'見出し', type:'text' },
            { key:'desc', label:'説明文', type:'textarea' }
          ] }
      ],
      render(d, ctx) {
        const steps = (d.steps||[]).map((s, i) => `
          <div class="lp-step">
            <div class="lp-step-num">${ctx.toKan(i+1)}</div>
            <div class="lp-step-body">
              <h3 class="lp-step-title">${esc(s.title)}</h3>
              <p class="lp-step-desc">${nl2br(s.desc)}</p>
            </div>
          </div>`).join('');
        return `<section class="lp-steps">
          <div class="lp-container">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-step-list">${steps}</div>
          </div>
        </section>`;
      }
    },

    /* 7. 比較表（自社 vs 他社） -------------------------------- */
    {
      type: 'compare', name: '比較表', icon: '⚖️',
      desc: '他社/従来品との比較表。自社列だけハイライト。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'COMPARISON' },
        { key: 'title', label: '見出し', type: 'text', default: '他社製品との違い' },
        { key: 'usLabel', label: '自社（ハイライト列）', type: 'text', default: '本商品' },
        { key: 'otherLabel', label: '比較対象', type: 'text', default: '従来品' },
        { key: 'rows', label: '比較項目', type: 'richlist',
          itemDefault: { label:'項目', us:'○', other:'×' },
          default: [
            { label:'保湿成分の種類', us:'5種類', other:'1種類' },
            { label:'無添加・フリー処方', us:'○', other:'×' },
            { label:'日本製', us:'○', other:'△' },
            { label:'返金保証', us:'30日間', other:'なし' }
          ],
          itemFields: [
            { key:'label', label:'項目', type:'text' },
            { key:'us', label:'自社の値', type:'text' },
            { key:'other', label:'比較対象の値', type:'text' }
          ] }
      ],
      render(d, ctx) {
        const rows = (d.rows||[]).map(r => `
          <tr>
            <td class="lp-cmp-label">${esc(r.label)}</td>
            <td class="lp-cmp-other">${esc(r.other)}</td>
            <td class="lp-cmp-us">${esc(r.us)}</td>
          </tr>`).join('');
        return `<section class="lp-compare">
          <div class="lp-container lp-narrow">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-table-wrap">
              <table class="lp-cmp-table">
                <thead><tr>
                  <th></th>
                  <th class="lp-cmp-other">${esc(d.otherLabel)}</th>
                  <th class="lp-cmp-us">${esc(d.usLabel)}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </section>`;
      }
    },

    /* 8. 仕様スペック表 ---------------------------------------- */
    {
      type: 'spec', name: '仕様スペック表', icon: '🔩',
      desc: '商品のスペック一覧。名称：値の表。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'SPECIFICATION' },
        { key: 'title', label: '見出し', type: 'text', default: '商品仕様' },
        { key: 'rows', label: '仕様項目', type: 'richlist',
          itemDefault: { label:'項目', value:'値' },
          default: [
            { label:'内容量', value:'50mL' },
            { label:'原材料', value:'水、グリセリン、ヒアルロン酸Na、他' },
            { label:'生産国', value:'日本' },
            { label:'賞味期限', value:'製造より3年（開封後6ヶ月）' },
            { label:'保管方法', value:'直射日光・高温多湿を避けて保管' }
          ],
          itemFields: [
            { key:'label', label:'項目名', type:'text' },
            { key:'value', label:'値', type:'text' }
          ] }
      ],
      render(d, ctx) {
        const rows = (d.rows||[]).map(r => `
          <tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('');
        return `<section class="lp-spec">
          <div class="lp-container lp-narrow">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <table class="lp-spec-table"><tbody>${rows}</tbody></table>
          </div>
        </section>`;
      }
    },

    /* 9. 価格表（税込表示） ----------------------------------- */
    {
      type: 'pricing', name: '価格表（税込）', icon: '💰',
      desc: 'コース比較の価格表。日本向け税込・割引表示。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'PRICE' },
        { key: 'title', label: '見出し', type: 'text', default: 'お得なコース' },
        { key: 'plans', label: 'プラン', type: 'richlist',
          itemDefault: { name:'プラン', price:'4980', period:'（税込）', badge:'', features:[], ctaText:'選択する', ctaUrl:'#cta', highlight:false },
          default: [
            { name:'お試し1個', price:'3278', period:'（税込）', features:['1回限りのお試し','送料無料'], ctaText:'1個で試す', ctaUrl:'#cta' },
            { name:'定期便（人気）', price:'4980', period:'（税込／2個セット）', badge:'おすすめ', features:['毎月2個お届け','いつでも解約OK','10%OFFクーポン付き'], ctaText:'定期便を始める', ctaUrl:'#cta', highlight:true },
            { name:'たっぷり3個', price:'6500', period:'（税込／3個セット）', features:['約2ヶ月分','まとめ買い割引'], ctaText:'3個セットで購入', ctaUrl:'#cta' }
          ],
          itemFields: [
            { key:'name', label:'プラン名', type:'text' },
            { key:'price', label:'価格（数値）', type:'number' },
            { key:'period', label:'単位・注記', type:'text', hint:'例: （税込／2個セット）' },
            { key:'badge', label:'バッジ（任意）', type:'text', hint:'おすすめ・人気 など' },
            { key:'features', label:'特徴（1行1つ）', type:'textarea' },
            { key:'ctaText', label:'ボタン文言', type:'text' },
            { key:'ctaUrl', label:'リンク先', type:'url' },
            { key:'highlight', label:'ハイライト', type:'check' }
          ] }
      ],
      render(d, ctx) {
        const plans = (d.plans||[]).map(p => {
          const feats = (p.features||[]).map(f => `<li>${esc(f)}</li>`).join('');
          const badge = p.badge ? `<div class="lp-plan-badge">${esc(p.badge)}</div>` : '';
          return `<div class="lp-plan${p.highlight?' lp-plan-featured':''}">
            ${badge}
            <h3 class="lp-plan-name">${esc(p.name)}</h3>
            <div class="lp-plan-price">${ctx.formatPrice(p.price)}<span class="lp-plan-period">${esc(p.period||'')}</span></div>
            <ul class="lp-plan-features">${feats}</ul>
            <a class="lp-btn ${p.highlight?'lp-btn-primary':'lp-btn-outline'} lp-btn-block" href="${esc(p.ctaUrl||'#cta')}">${esc(p.ctaText||'選択する')}</a>
          </div>`;
        }).join('');
        return `<section class="lp-pricing" id="cta">
          <div class="lp-container">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-plan-grid">${plans}</div>
            <p class="lp-pricing-note">※ 表示価格はすべて消費税込です。</p>
          </div>
        </section>`;
      }
    },

    /* 10. ギャラリー ------------------------------------------ */
    {
      type: 'gallery', name: 'ギャラリー', icon: '🖼️',
      desc: '商品画像の並列表示。3〜4カラム。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'GALLERY' },
        { key: 'title', label: '見出し', type: 'text', default: '商品のディテール' },
        { key: 'cols', label: '列数（PC）', type: 'select', default: '4',
          options:[{v:'2',l:'2列'},{v:'3',l:'3列'},{v:'4',l:'4列'}] },
        { key: 'images', label: '画像リスト', type: 'richlist',
          itemDefault: { image:'', caption:'キャプション' },
          default: [
            { image:'', caption:'製品全体' },
            { image:'', caption:'テクスチャ' },
            { image:'', caption:'パッケージ' },
            { image:'', caption:'使用イメージ' }
          ],
          itemFields: [
            { key:'image', label:'画像', type:'image' },
            { key:'caption', label:'キャプション（任意）', type:'text' }
          ] }
      ],
      render(d, ctx) {
        const items = (d.images||[]).map(im => `
          <figure class="lp-gallery-item">
            <img src="${ctx.img(im.image,600,600,'ギャラリー')}" alt="${esc(im.caption||'')}" loading="lazy">
            ${im.caption?`<figcaption>${esc(im.caption)}</figcaption>`:''}
          </figure>`).join('');
        return `<section class="lp-gallery">
          <div class="lp-container">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-gallery-grid lp-gal-${esc(d.cols)}">${items}</div>
          </div>
        </section>`;
      }
    },

    /* 11. お客様の声（星評価） --------------------------------- */
    {
      type: 'reviews', name: 'お客様の声（星評価）', icon: '⭐',
      desc: '口コミと星評価。実名・年齢付き。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'REVIEWS' },
        { key: 'title', label: '見出し', type: 'text', default: 'ご利用者様の声' },
        { key: 'avgRating', label: '平均評価', type: 'number', default: 4.8, hint: '4.8 など' },
        { key: 'avgLabel', label: '平均評価の補足', type: 'text', default: '（2,341件のレビューより）' },
        { key: 'reviews', label: 'レビュー', type: 'richlist',
          itemDefault: { name:'お名前', meta:'30代・女性', rating:5, title:'タイトル', body:'感想' },
          default: [
            { name:'M.K様', meta:'30代・女性', rating:5, title:'使い心地が最高です', body:'さらっとしていてベタつかないのに、朝までしっかり潤っています。もう手放せません。' },
            { name:'T.S様', meta:'40代・女性', rating:5, title:'肌の調子が違います', body:'1週間でハリが出たと主人に言われました。リピート決定です。' },
            { name:'R.Y様', meta:'20代・女性', rating:4, title:'無添加で安心', body:'敏感肌ですが刺激もなく使えています。もう少し安いと嬉しいです。' }
          ],
          itemFields: [
            { key:'name', label:'お名前', type:'text' },
            { key:'meta', label:'属性（年代・性別）', type:'text' },
            { key:'rating', label:'評価（1〜5）', type:'number' },
            { key:'title', label:'タイトル', type:'text' },
            { key:'body', label:'本文', type:'textarea' }
          ] }
      ],
      render(d, ctx) {
        const stars = (n) => {
          const v = Math.max(0, Math.min(5, Number(n)||0));
          const full = Math.floor(v);
          const half = (v - full) >= 0.5;
          let s = '';
          for (let i=0;i<full;i++) s += '★';
          if (half) s += '☆';
          for (let i=full+(half?1:0); i<5;i++) s += '・';
          return s;
        };
        const items = (d.reviews||[]).map(r => `
          <div class="lp-review">
            <div class="lp-review-stars">${stars(r.rating)}</div>
            <p class="lp-review-title">${esc(r.title)}</p>
            <p class="lp-review-body">${nl2br(r.body)}</p>
            <p class="lp-review-meta">${esc(r.name)} ／ ${esc(r.meta)}</p>
          </div>`).join('');
        const avg = d.avgRating ? `<div class="lp-reviews-avg">
          <span class="lp-reviews-avg-num">${esc(d.avgRating)}</span>
          <span class="lp-reviews-avg-stars">${stars(d.avgRating)}</span>
          <span class="lp-reviews-avg-label">${esc(d.avgLabel||'')}</span>
        </div>` : '';
        return `<section class="lp-reviews">
          <div class="lp-container">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
              ${avg}
            </div>
            <div class="lp-review-grid">${items}</div>
          </div>
        </section>`;
      }
    },

    /* 12. よくある質問（アコーディオン） ------------------------ */
    {
      type: 'faq', name: 'よくある質問（アコーディオン）', icon: '❓',
      desc: 'Q&Aの折りたたみリスト。不安解消。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FAQ' },
        { key: 'title', label: '見出し', type: 'text', default: 'よくあるご質問' },
        { key: 'faqs', label: 'Q&A', type: 'richlist',
          itemDefault: { q:'質問', a:'回答' },
          default: [
            { q:'敏感肌でも使えますか？', a:'パラベン・鉱物油フリーの低刺激処方ですが、 万一お肌に合わない場合はご利用を中止し、専門医にご相談ください。' },
            { q:'送料はいくらですか？', a:'全国どこでも送料無料です。お届けはご注文後2〜4日程度です。' },
            { q:'返品・交換はできますか？', a:'商品不良やご注文と異なる場合は、商品到着後7日以内にご連絡ください。まずは30日間の返金保証もご利用いただけます。' },
            { q:'定期便の解約はいつでもできますか？', a:'はい、次回お届け日の7日前までのご連絡で、いつでも解約・休止が可能です。' }
          ],
          itemFields: [
            { key:'q', label:'質問', type:'text' },
            { key:'a', label:'回答', type:'textarea' }
          ] }
      ],
      render(d, ctx) {
        const items = (d.faqs||[]).map((f, i) => `
          <details class="lp-faq-item"${i===0?' open':''}>
            <summary class="lp-faq-q"><span class="lp-faq-mark">Q.</span>${esc(f.q)}</summary>
            <div class="lp-faq-a"><span class="lp-faq-mark lp-faq-mark-a">A.</span>${nl2br(f.a)}</div>
          </details>`).join('');
        return `<section class="lp-faq">
          <div class="lp-container lp-narrow">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            <div class="lp-faq-list">${items}</div>
          </div>
        </section>`;
      }
    },

    /* 13. 動画 ----------------------------------------------- */
    {
      type: 'video', name: '動画', icon: '🎬',
      desc: 'YouTube/MP4動画の埋込。商品紹介に。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'MOVIE' },
        { key: 'title', label: '見出し', type: 'text', default: '商品紹介動画' },
        { key: 'videoType', label: '動画の種類', type: 'select', default: 'youtube',
          options:[{v:'youtube',l:'YouTube'},{v:'mp4',l:'MP4 (直リンク)'}] },
        { key: 'youtubeId', label: 'YouTube 動画ID', type: 'text', default: 'dQw4w9WgXcQ', hint:'URLの watch?v= 以降' },
        { key: 'mp4Url', label: 'MP4 URL', type: 'url', default: '', placeholder:'https://.../movie.mp4' },
        { key: 'poster', label: 'サムネイル画像（MP4用）', type: 'image', default: '' }
      ],
      render(d, ctx) {
        let media = '';
        if (d.videoType === 'youtube' && d.youtubeId) {
          media = `<div class="lp-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(d.youtubeId)}" title="${esc(d.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        } else {
          const poster = d.poster ? ctx.img(d.poster,1280,720,'動画サムネイル') : '';
          media = `<div class="lp-video-frame"><video controls playsinline ${poster?`poster="${poster}"`:''}><source src="${esc(d.mp4Url)}" type="video/mp4"></video></div>`;
        }
        return `<section class="lp-video-sec">
          <div class="lp-container lp-narrow">
            <div class="lp-section-head lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
            </div>
            ${media}
          </div>
        </section>`;
      }
    },

    /* 14. カウントダウンタイマー ------------------------------- */
    {
      type: 'countdown', name: 'カウントダウンタイマー', icon: '⏰',
      desc: 'セール終了までの残り時間。緊急性アピール。',
      schema: [
        { key: 'eyebrow', label: '小見出し', type: 'text', default: 'LIMITED TIME' },
        { key: 'title', label: '見出し', type: 'text', default: 'キャンペーン終了まであと' },
        { key: 'deadline', label: '終了日時', type: 'text', default: '', hint:'YYYY-MM-DDTHH:MM 形式（例: 2026-12-31T23:59）', placeholder:'2026-12-31T23:59' },
        { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '終了前に購入する' },
        { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' }
      ],
      render(d, ctx) {
        const dl = esc(d.deadline || '');
        return `<section class="lp-countdown">
          <div class="lp-container lp-center">
            ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
            <h2 class="lp-h2">${esc(d.title)}</h2>
            <div class="lp-cd" data-deadline="${dl}">
              <div class="lp-cd-unit"><span class="lp-cd-num" data-cd="d">--</span><span class="lp-cd-lbl">日</span></div>
              <div class="lp-cd-unit"><span class="lp-cd-num" data-cd="h">--</span><span class="lp-cd-lbl">時間</span></div>
              <div class="lp-cd-unit"><span class="lp-cd-num" data-cd="m">--</span><span class="lp-cd-lbl">分</span></div>
              <div class="lp-cd-unit"><span class="lp-cd-num" data-cd="s">--</span><span class="lp-cd-lbl">秒</span></div>
            </div>
            ${d.ctaText?`<a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a>`:''}
          </div>
        </section>`;
      }
    },

    /* 15. CTA（申込） ----------------------------------------- */
    {
      type: 'cta', name: 'CTA（申込）', icon: '🔔',
      desc: '申込を促す最終アクション。強調。',
      schema: [
        { key: 'title', label: '見出し', type: 'text', default: '今すぐ、あなたの肌に自信を。' },
        { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '30日間の返金保証付き。\n初めての方も安心してお試しいただけます。' },
        { key: 'ctaText', label: 'ボタン文言', type: 'text', default: 'ご購入はこちら' },
        { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
        { key: 'note', label: '注釈（ボタン下）', type: 'text', default: '▲ 今だけ送料無料・クーポン配布中' },
        { key: 'bg', label: '背景色', type: 'color', default: '#e87a8b' },
        { key: 'fg', label: '文字色', type: 'color', default: '#ffffff' }
      ],
      render(d, ctx) {
        return `<section class="lp-cta" id="cta-2" style="background:${esc(d.bg)};color:${esc(d.fg)}">
          <div class="lp-container lp-center">
            <h2 class="lp-cta-title">${esc(d.title)}</h2>
            ${d.subtitle?`<p class="lp-cta-sub">${nl2br(d.subtitle)}</p>`:''}
            ${d.ctaText?`<div class="lp-cta-btn"><a class="lp-btn lp-btn-white lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}
            ${d.note?`<p class="lp-cta-note">${esc(d.note)}</p>`:''}
          </div>
        </section>`;
      }
    },

    /* 16. フッター（会社情報） --------------------------------- */
    {
      type: 'footer', name: 'フッター（会社情報）', icon: '🏷️',
      desc: '特定商取引法に基づく表記・会社情報。',
      schema: [
        { key: 'shopName', label: 'ショップ名', type: 'text', default: '〇〇ストア' },
        { key: 'links', label: 'リンク（1行1つ: 表示名|URL）', type: 'textarea', default:'特定商取引法に基づく表記|/pages/tokushoho\nプライバシーポリシー|/pages/privacy\n利用規約|/pages/terms\nお問い合わせ|/pages/contact' },
        { key: 'company', label: '会社名', type: 'text', default: '株式会社〇〇' },
        { key: 'address', label: '所在地', type: 'text', default: '〒100-0001 東京都千代田区〇〇1-2-3' },
        { key: 'phone', label: '電話番号', type: 'text', default: '03-0000-0000' },
        { key: 'email', label: 'メールアドレス', type: 'text', default: 'support@example.com' },
        { key: 'copyright', label: 'コピーライト', type: 'text', default: '© 2026 〇〇ストア All Rights Reserved.' }
      ],
      render(d, ctx) {
        const links = (d.links||'').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const [name, url] = l.split('|');
          return `<a href="${esc((url||'#').trim())}">${esc((name||'').trim())}</a>`;
        }).join('<span class="lp-foot-sep">／</span>');
        return `<footer class="lp-footer">
          <div class="lp-container">
            <div class="lp-foot-shop">${esc(d.shopName)}</div>
            ${links?`<nav class="lp-foot-links">${links}</nav>`:''}
            <div class="lp-foot-info">
              ${d.company?`<div>${esc(d.company)}</div>`:''}
              ${d.address?`<div>${esc(d.address)}</div>`:''}
              ${d.phone?`<div>TEL: ${esc(d.phone)}</div>`:''}
              ${d.email?`<div>Email: ${esc(d.email)}</div>`:''}
            </div>
            <div class="lp-foot-copy">${esc(d.copyright)}</div>
          </div>
        </footer>`;
      }
    }
  ];

  // マップ化
  const BY_TYPE = {};
  MODULES.forEach(m => { BY_TYPE[m.type] = m; });

  LP.Modules = {
    all: MODULES,
    get(type) { return BY_TYPE[type] || null; },
    defaultData,
    ctxHelpers() { return { escape: esc, img, formatPrice, toKan, nl2br }; }
  };

  // LP.ctx: renderer/export で使う共通コンテキスト構築
  LP.buildCtx = function (theme) {
    const helpers = LP.Modules.ctxHelpers();
    return Object.assign({}, helpers, { theme });
  };
})();

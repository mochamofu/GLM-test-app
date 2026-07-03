/* =========================================================
   modules.js — 16 種の日本向け LP モジュール定義
   各モジュール: { type, name, icon, desc, variants: [{id, name, schema, render}] }
   各バリアントは独立の schema と render を持つ。
   バリアント間で共通キーを使うことで、切替時に入力内容を保持。
   ctx = { theme, escape:esc, img, formatPrice, toKan, nl2br }
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  // ---------- 共有ヘルパ ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

  // 画像未指定時のプレースホルダ SVG
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
  const formatPrice = (n) => {
    const num = Number(n);
    if (isNaN(num)) return esc(n);
    return '¥' + num.toLocaleString('ja-JP');
  };
  const toKan = (n) => {
    const kan = ['','一','二','三','四','五','六','七','八','九'];
    const tens = ['','十','二十','三十','四十','五十','六十','七十','八十','九十'];
    if (n <= 0) return String(n);
    if (n < 10) return kan[n];
    if (n < 100) return tens[Math.floor(n/10)] + kan[n%10];
    return String(n);
  };
  // 星文字列生成
  const stars = (n) => {
    const v = Math.max(0, Math.min(5, Number(n)||0));
    const full = Math.floor(v), half = (v - full) >= 0.5;
    let s = '';
    for (let i=0;i<full;i++) s += '★';
    if (half) s += '☆';
    for (let i=full+(half?1:0); i<5;i++) s += '・';
    return s;
  };

  // schema → デフォルト data（variantId は含めない、呼び出し元で付与）
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

  // ---------- モジュール定義（各モジュールに2-3バリアント） ----------
  const MODULES = [

    /* ============================================================
       1. お知らせバー  A.細帯 / B.マーキー風 / C.角丸バナー
       ============================================================ */
    {
      type: 'notice', name: 'お知らせバー', icon: '📢',
      desc: '画面上部の細い告知帯。セール・送料無料など。',
      variants: [
        { id: 'plain', name: '細帯',
          schema: [
            { key: 'text', label: '表示テキスト', type: 'text', default: '🎉 今だけ！全品送料無料 ＋ 初回購入で10%OFFクーポン配布中' },
            { key: 'bg', label: '背景色', type: 'color', default: '#e87a8b' },
            { key: 'fg', label: '文字色', type: 'color', default: '#ffffff' },
            { key: 'linkUrl', label: 'リンク先URL（任意）', type: 'url', default: '' },
            { key: 'linkText', label: 'リンク文言（任意）', type: 'text', default: '詳細はこちら →' }
          ],
          render(d, ctx) {
            const linkInner = d.linkText ? `<span class="nt-link">${esc(d.linkText)}</span>` : '';
            const inner = `<span class="nt-text">${esc(d.text)}</span>${linkInner}`;
            const style = `background:${esc(d.bg)};color:${esc(d.fg)};`;
            if (d.linkUrl) return `<div class="lp-notice" data-variant="plain" style="${style}"><a href="${esc(d.linkUrl)}" style="color:inherit">${inner}</a></div>`;
            return `<div class="lp-notice" data-variant="plain" style="${style}">${inner}</div>`;
          }
        },
        { id: 'marquee', name: 'マーキー風',
          schema: [
            { key: 'text', label: '表示テキスト（繰り返し流れます）', type: 'text', default: '🚚 送料無料キャンペーン実施中！・🎁 初回購入特典あり・⏰ 期間限定セール' },
            { key: 'bg', label: '背景色', type: 'color', default: '#1f3a5f' },
            { key: 'fg', label: '文字色', type: 'color', default: '#ffd166' },
            { key: 'linkUrl', label: 'リンク先URL（任意）', type: 'url', default: '' }
          ],
          render(d, ctx) {
            const inner = `<span class="nt-text">${esc(d.text)}</span>`;
            const style = `background:${esc(d.bg)};color:${esc(d.fg)};`;
            const body = `<div class="lp-notice-marquee-track">${inner} <span class="nt-sep">◆</span> ${inner}</div>`;
            if (d.linkUrl) return `<div class="lp-notice lp-notice-marquee" data-variant="marquee" style="${style}"><a href="${esc(d.linkUrl)}" style="color:inherit">${body}</a></div>`;
            return `<div class="lp-notice lp-notice-marquee" data-variant="marquee" style="${style}">${body}</div>`;
          }
        },
        { id: 'banner', name: '角丸バナー',
          schema: [
            { key: 'text', label: '表示テキスト', type: 'text', default: '⚡ タイムセール本日24時まで！' },
            { key: 'bg', label: '背景色', type: 'color', default: '#e87a8b' },
            { key: 'fg', label: '文字色', type: 'color', default: '#ffffff' },
            { key: 'linkUrl', label: 'リンク先URL（任意）', type: 'url', default: '' },
            { key: 'linkText', label: 'ボタン文言', type: 'text', default: '見にいく' }
          ],
          render(d, ctx) {
            const btn = d.linkText ? `<span class="nt-btn">${esc(d.linkText)}</span>` : '';
            const style = `background:${esc(d.bg)};color:${esc(d.fg)};`;
            const inner = `<span class="nt-text">${esc(d.text)}</span>${btn}`;
            if (d.linkUrl) return `<div class="lp-notice lp-notice-banner" data-variant="banner" style="${style}"><a href="${esc(d.linkUrl)}" style="color:inherit">${inner}</a></div>`;
            return `<div class="lp-notice lp-notice-banner" data-variant="banner" style="${style}">${inner}</div>`;
          }
        }
      ]
    },

    /* ============================================================
       2. ヒーロー  A.背景全面 / B.分割(画像+文章) / C.中央寄せ
       ============================================================ */
    {
      type: 'hero', name: 'ヒーロー（ファーストビュー）', icon: '🌅',
      desc: '商品名・キャッチコピー・CTAを大判表示。',
      variants: [
        { id: 'bg', name: '背景画像全面',
          schema: [
            { key: 'image', label: '背景画像', type: 'image', default: '' },
            { key: 'align', label: 'テキスト位置', type: 'select', default: 'left', options:[{v:'left',l:'左'},{v:'center',l:'中央'},{v:'right',l:'右'}] },
            { key: 'eyebrow', label: 'アイキャッチ', type: 'text', default: '期間限定・先行予約' },
            { key: 'title', label: 'メインキャッチコピー', type: 'text', default: '毎日のスキンケアが、<br>明日の自信にかわる。' },
            { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '話題の美容成分を贅沢に配合。30日間の返金保証付き。' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '今すぐお試しする' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'ctaSub', label: '補足', type: 'text', default: '▲ 今だけ送料無料・代引手数料無料' },
            { key: 'overlay', label: '暗さ（0〜0.8）', type: 'number', default: 0.35 },
            { key: 'height', label: '高さ（px）', type: 'number', default: 560 }
          ],
          render(d, ctx) {
            const style = `background-image:linear-gradient(rgba(0,0,0,${esc(d.overlay)}),rgba(0,0,0,${esc(d.overlay)})),url('${ctx.img(d.image,1600,900,'ヒーロー画像')}');min-height:${esc(d.height)}px;text-align:${esc(d.align)};`;
            return `<section class="lp-hero" data-variant="bg" style="${style}">
              <div class="lp-container lp-hero-inner lp-align-${esc(d.align)}">
                ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
                <h1 class="lp-hero-title">${d.title}</h1>
                ${d.subtitle?`<p class="lp-hero-sub">${nl2br(d.subtitle)}</p>`:''}
                ${d.ctaText?`<div class="lp-hero-cta"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}
                ${d.ctaSub?`<p class="lp-hero-note">${esc(d.ctaSub)}</p>`:''}
              </div>
            </section>`;
          }
        },
        { id: 'split', name: '分割（画像＋文章）',
          schema: [
            { key: 'image', label: '画像', type: 'image', default: '' },
            { key: 'imageSide', label: '画像の位置', type: 'select', default: 'right', options:[{v:'right',l:'右'},{v:'left',l:'左'}] },
            { key: 'eyebrow', label: 'アイキャッチ', type: 'text', default: 'NEW ARRIVAL' },
            { key: 'title', label: 'メインキャッチコピー', type: 'text', default: '機能美を、<br>毎日に。' },
            { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '長年の研究から生まれた新処方。あなたの日常を、もっと快適に。' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '詳しく見る' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'bg', label: '背景色', type: 'color', default: '#fff7f8' }
          ],
          render(d, ctx) {
            const imgHtml = `<div class="lp-hero-split-img"><img src="${ctx.img(d.image,900,900,'ヒーロー画像')}" alt="${esc(d.eyebrow||'')}" loading="lazy"></div>`;
            const txt = `<div class="lp-hero-split-text">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h1 class="lp-hero-title">${d.title}</h1>
              ${d.subtitle?`<p class="lp-hero-sub">${nl2br(d.subtitle)}</p>`:''}
              ${d.ctaText?`<div class="lp-hero-cta"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}
            </div>`;
            const inner = d.imageSide === 'left' ? imgHtml + txt : txt + imgHtml;
            return `<section class="lp-hero lp-hero-split" data-variant="split" style="background:${esc(d.bg)}"><div class="lp-container lp-hero-split-row">${inner}</div></section>`;
          }
        },
        { id: 'center', name: '中央寄せ（画像背景なし）',
          schema: [
            { key: 'eyebrow', label: 'アイキャッチ', type: 'text', default: 'オンライン相談・無料' },
            { key: 'title', label: 'メインキャッチコピー', type: 'text', default: 'もっと、あなたらしく。<br>始めてみませんか？' },
            { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '30日間の返金保証付き。初めての方も安心してお試しいただけます。' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '無料相談を予約する' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'ctaSub', label: '補足', type: 'text', default: '▲ 30秒で完了・いつでもキャンセル可' },
            { key: 'bg', label: '背景色', type: 'color', default: '#f6f4f0' }
          ],
          render(d, ctx) {
            return `<section class="lp-hero lp-hero-center" data-variant="center" style="background:${esc(d.bg)}">
              <div class="lp-container lp-center">
                ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
                <h1 class="lp-hero-title lp-hero-title-center">${d.title}</h1>
                ${d.subtitle?`<p class="lp-hero-sub">${nl2br(d.subtitle)}</p>`:''}
                ${d.ctaText?`<div class="lp-hero-cta"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}
                ${d.ctaSub?`<p class="lp-hero-note">${esc(d.ctaSub)}</p>`:''}
              </div>
            </section>`;
          }
        }
      ]
    },

    /* ============================================================
       3. リード文  A.中央寄せ / B.左寄せ+装飾 / C.引用風
       ============================================================ */
    {
      type: 'lead', name: 'リード文（導入）', icon: '📝',
      desc: '導入文。見出し＋本文。',
      variants: [
        { id: 'center', name: '中央寄せ',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'ABOUT' },
            { key: 'title', label: '見出し', type: 'text', default: 'こんなお悩み、ありませんか？' },
            { key: 'body', label: '本文', type: 'textarea', default: '朝晩の忙しい時間。鏡を見るたび、肌のハリやくすみが気になっていませんか。\nいつものスキンケアでは物足りない、そんな方に。' },
            { key: 'bg', label: '背景色', type: 'color', default: '#fff7f8' }
          ],
          render(d, ctx) {
            return `<section class="lp-lead" data-variant="center" style="background:${esc(d.bg)}"><div class="lp-container lp-center">
              ${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-h2">${esc(d.title)}</h2>
              <div class="lp-lead-body">${nl2br(d.body)}</div>
            </div></section>`;
          }
        },
        { id: 'left', name: '左寄せ＋装飾線',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'STORY' },
            { key: 'title', label: '見出し', type: 'text', default: '私たちがこの商品を作った理由' },
            { key: 'body', label: '本文', type: 'textarea', default: '創業当時、私たち自身が感じていた悩み。それは「本当に良いものが、手に取りにくい」ということでした。\nだからこそ、品質を妥協せず、手頃な価格で。' },
            { key: 'bg', label: '背景色', type: 'color', default: '#ffffff' }
          ],
          render(d, ctx) {
            return `<section class="lp-lead lp-lead-left" data-variant="left" style="background:${esc(d.bg)}"><div class="lp-container">
              ${d.eyebrow?`<p class="lp-lead-left-eyebrow">${esc(d.eyebrow)}</p>`:''}
              <h2 class="lp-lead-left-title">${esc(d.title)}</h2>
              <div class="lp-lead-body">${nl2br(d.body)}</div>
            </div></section>`;
          }
        },
        { id: 'quote', name: '引用風',
          schema: [
            { key: 'title', label: '引用文', type: 'textarea', default: '使って3日目で、肌のもっちり感が違うと実感しました。\nもう手放せません。' },
            { key: 'cite', label: '引用元', type: 'text', default: 'ご利用者 M.K様（30代）' },
            { key: 'bg', label: '背景色', type: 'color', default: '#f6f4f0' }
          ],
          render(d, ctx) {
            return `<section class="lp-lead lp-lead-quote" data-variant="quote" style="background:${esc(d.bg)}"><div class="lp-container lp-narrow lp-center">
              <blockquote class="lp-quote">"${nl2br(d.title)}"</blockquote>
              ${d.cite?`<cite class="lp-quote-cite">— ${esc(d.cite)}</cite>`:''}
            </div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       4. 3つのメリット  A.アイコン3カラム / B.カード(画像) / C.縦並び番号
       ============================================================ */
    {
      type: 'features', name: '3つのメリット', icon: '✨',
      desc: 'アイコン＋見出し＋説明の強みアピール。',
      variants: [
        { id: 'icon3', name: 'アイコン3カラム',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FEATURES' },
            { key: 'title', label: '見出し', type: 'text', default: '選ばれる3つの理由' },
            { key: 'features', label: '特徴リスト', type: 'richlist', itemDefault:{icon:'✨',title:'特徴',desc:'説明文'},
              default:[
                { icon:'💧', title:'うるおい持続', desc:'独自の保湿処方で、朝まで潤い続く肌へ。' },
                { icon:'🌱', title:'無添加処方', desc:'パラベン・鉱物油フリー。敏感肌の方にも。' },
                { icon:'🌸', title:'国産・安心', desc:'日本の工場で丁寧に製造。品質へのこだわり。' }
              ],
              itemFields:[{key:'icon',label:'アイコン（絵文字）',type:'text'},{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.features||[]).map(f => `<div class="lp-feature"><div class="lp-feature-icon">${esc(f.icon)}</div><h3 class="lp-feature-title">${esc(f.title)}</h3><p class="lp-feature-desc">${nl2br(f.desc)}</p></div>`).join('');
            return `<section class="lp-features" data-variant="icon3"><div class="lp-container">
              <div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>
              <div class="lp-feature-grid">${items}</div></div></section>`;
          }
        },
        { id: 'card', name: 'カード型（画像付き）',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FEATURES' },
            { key: 'title', label: '見出し', type: 'text', default: '3つのこだわり' },
            { key: 'features', label: '特徴リスト', type: 'richlist', itemDefault:{image:'',title:'特徴',desc:'説明文'},
              default:[
                { image:'', title:'原料へのこだわり', desc:'厳選した3種の植物由来成分を配合。' },
                { image:'', title:'製法へのこだわり', desc:'低温抽出で成分を損なわず凝縮。' },
                { image:'', title:'品質へのこだわり', desc:'日本の工場で1つずつ丁寧に。' }
              ],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.features||[]).map(f => `<div class="lp-feature-card"><div class="lp-feature-card-img"><img src="${ctx.img(f.image,600,400,'特徴')}" alt="${esc(f.title)}" loading="lazy"></div><div class="lp-feature-card-body"><h3 class="lp-feature-title">${esc(f.title)}</h3><p class="lp-feature-desc">${nl2br(f.desc)}</p></div></div>`).join('');
            return `<section class="lp-features" data-variant="card"><div class="lp-container">
              <div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>
              <div class="lp-feature-grid lp-feature-grid-card">${items}</div></div></section>`;
          }
        },
        { id: 'numbered', name: '番号付き縦並び',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FEATURES' },
            { key: 'title', label: '見出し', type: 'text', default: '選ばれる3つの理由' },
            { key: 'features', label: '特徴リスト', type: 'richlist', itemDefault:{title:'特徴',desc:'説明文'},
              default:[
                { title:'うるおい持続', desc:'独自の保湿処方で、朝まで潤い続く肌へ。' },
                { title:'無添加処方', desc:'パラベン・鉱物油フリー。敏感肌の方にも。' },
                { title:'国産・安心', desc:'日本の工場で丁寧に製造。品質へのこだわり。' }
              ],
              itemFields:[{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.features||[]).map((f,i) => `<div class="lp-feature-num"><div class="lp-feature-num-n">${i+1}</div><div><h3 class="lp-feature-title">${esc(f.title)}</h3><p class="lp-feature-desc">${nl2br(f.desc)}</p></div></div>`).join('');
            return `<section class="lp-features" data-variant="numbered"><div class="lp-container lp-narrow">
              <div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>
              <div class="lp-feature-num-list">${items}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       5. 画像＋文章  A.左右交互 / B.重ね合わせ / C.カード
       ============================================================ */
    {
      type: 'imageText', name: '画像＋文章', icon: '🖼️',
      desc: '画像と文章のペア。複数でレイアウト。',
      variants: [
        { id: 'alternate', name: '左右交互',
          schema: [
            { key: 'items', label: '画像＋文章のペア', type: 'richlist', itemDefault:{image:'',title:'見出し',body:'説明文',ctaText:'',ctaUrl:''},
              default:[
                { image:'', title:'こだわりの原料', body:'厳選した3種の植物由来成分を配合。\n肌に優しく、ハリを与えます。', ctaText:'詳しく見る', ctaUrl:'#' },
                { image:'', title:'使い続けるほどの変化', body:'使い始めの1週間。肌の調子が違うと感じていただけるはず。', ctaText:'', ctaUrl:'' }
              ],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'title',label:'見出し',type:'text'},{key:'body',label:'本文',type:'textarea'},{key:'ctaText',label:'ボタン文言（任意）',type:'text'},{key:'ctaUrl',label:'ボタンリンク先',type:'url'}] }
          ],
          render(d, ctx) {
            const items = (d.items||[]).map((it,i) => {
              const rev = i % 2 === 1 ? ' lp-it-reverse' : '';
              const cta = it.ctaText ? `<a class="lp-btn lp-btn-outline" href="${esc(it.ctaUrl||'#')}">${esc(it.ctaText)}</a>` : '';
              return `<div class="lp-it-row${rev}"><div class="lp-it-img"><img src="${ctx.img(it.image,800,600,'画像'+(i+1))}" alt="${esc(it.title)}" loading="lazy"></div><div class="lp-it-text"><h3 class="lp-it-title">${esc(it.title)}</h3><p class="lp-it-body">${nl2br(it.body)}</p>${cta}</div></div>`;
            }).join('');
            return `<section class="lp-image-text" data-variant="alternate"><div class="lp-container">${items}</div></section>`;
          }
        },
        { id: 'overlap', name: '重ね合わせ（ズーム）',
          schema: [
            { key: 'items', label: '画像＋文章のペア', type: 'richlist', itemDefault:{image:'',title:'見出し',body:'説明文'},
              default:[
                { image:'', title:'こだわりの原料', body:'厳選した植物由来成分を配合。' },
                { image:'', title:'丁寧な製法', body:'低温抽出で成分を凝縮。' }
              ],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'title',label:'見出し',type:'text'},{key:'body',label:'本文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.items||[]).map((it,i) => `<div class="lp-it-overlap"><div class="lp-it-overlap-img"><img src="${ctx.img(it.image,1000,500,'画像'+(i+1))}" alt="${esc(it.title)}" loading="lazy"></div><div class="lp-it-overlap-card"><h3 class="lp-it-title">${esc(it.title)}</h3><p class="lp-it-body">${nl2br(it.body)}</p></div></div>`).join('');
            return `<section class="lp-image-text" data-variant="overlap"><div class="lp-container lp-narrow">${items}</div></section>`;
          }
        },
        { id: 'card', name: 'カード型',
          schema: [
            { key: 'items', label: 'カード', type: 'richlist', itemDefault:{image:'',title:'見出し',body:'説明文'},
              default:[
                { image:'', title:'特徴1', body:'説明文が入ります。' },
                { image:'', title:'特徴2', body:'説明文が入ります。' },
                { image:'', title:'特徴3', body:'説明文が入ります。' }
              ],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'title',label:'見出し',type:'text'},{key:'body',label:'本文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.items||[]).map(it => `<div class="lp-it-card"><div class="lp-it-card-img"><img src="${ctx.img(it.image,600,400,it.title)}" alt="${esc(it.title)}" loading="lazy"></div><div class="lp-it-card-body"><h3 class="lp-it-title">${esc(it.title)}</h3><p class="lp-it-body">${nl2br(it.body)}</p></div></div>`).join('');
            return `<section class="lp-image-text" data-variant="card"><div class="lp-container"><div class="lp-it-card-grid">${items}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       6. ステップ  A.漢数字丸 / B.矢印つなぎ / C.タイムライン縦
       ============================================================ */
    {
      type: 'steps', name: 'ステップ・手順', icon: '📋',
      desc: '使い方・流れを順番に。',
      variants: [
        { id: 'kanji', name: '漢数字丸',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'HOW TO USE' },
            { key: 'title', label: '見出し', type: 'text', default: 'たった3ステップで、もっと綺麗に' },
            { key: 'steps', label: 'ステップ', type: 'richlist', itemDefault:{title:'ステップ',desc:'説明文'},
              default:[
                { title:'洗顔後、清潔な肌に', desc:'朝晩の洗顔後、タオルで優しく水分を拭き取ります。' },
                { title:'適量を手に取り', desc:'パール粒大を手に取り、顔全体に優しくなじませます。' },
                { title:'ハンドプレスで浸透', desc:'手のひらで包み込むよう、体温で肌へ馴染ませます。' }
              ],
              itemFields:[{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const steps = (d.steps||[]).map((s,i) => `<div class="lp-step"><div class="lp-step-num">${ctx.toKan(i+1)}</div><div class="lp-step-body"><h3 class="lp-step-title">${esc(s.title)}</h3><p class="lp-step-desc">${nl2br(s.desc)}</p></div></div>`).join('');
            return `<section class="lp-steps" data-variant="kanji"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-step-list">${steps}</div></div></section>`;
          }
        },
        { id: 'arrow', name: '矢印つなぎ',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'HOW TO USE' },
            { key: 'title', label: '見出し', type: 'text', default: '3ステップで完了' },
            { key: 'steps', label: 'ステップ', type: 'richlist', itemDefault:{title:'ステップ',desc:'説明文'},
              default:[
                { title:'選ぶ', desc:'お好きなコースを選択。' },
                { title:'注文する', desc:'必要事項を入力して決済。' },
                { title:'届く', desc:'2〜4日でお届け。' }
              ],
              itemFields:[{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const steps = (d.steps||[]).map((s,i) => `<div class="lp-step-arrow"><div class="lp-step-arrow-n">STEP ${i+1}</div><h3 class="lp-step-arrow-title">${esc(s.title)}</h3><p class="lp-step-desc">${nl2br(s.desc)}</p>${i<(d.steps||[]).length-1?'<div class="lp-step-arrow-mark">→</div>':''}</div>`).join('');
            return `<section class="lp-steps" data-variant="arrow"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-step-arrow-list">${steps}</div></div></section>`;
          }
        },
        { id: 'timeline', name: 'タイムライン縦',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FLOW' },
            { key: 'title', label: '見出し', type: 'text', default: 'ご利用の流れ' },
            { key: 'steps', label: 'ステップ', type: 'richlist', itemDefault:{title:'ステップ',desc:'説明文'},
              default:[
                { title:'お申込み', desc:'フォームからお申込みください。' },
                { title:'お届け', desc:'ご注文後2〜4日でお届けします。' },
                { title:'使い始め', desc:'毎日継続してお使いいただくのがコツ。' },
                { title:'サポート', desc:'ご不明点はお気軽にご相談を。' }
              ],
              itemFields:[{key:'title',label:'見出し',type:'text'},{key:'desc',label:'説明文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const steps = (d.steps||[]).map((s,i) => `<div class="lp-step-tl"><div class="lp-step-tl-dot"></div><div class="lp-step-tl-body"><span class="lp-step-tl-n">STEP ${i+1}</span><h3 class="lp-step-title">${esc(s.title)}</h3><p class="lp-step-desc">${nl2br(s.desc)}</p></div></div>`).join('');
            return `<section class="lp-steps" data-variant="timeline"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-step-tl-list">${steps}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       7. 比較表  A.ハイライト列 / B.チェックバツ / C.カード比較
       ============================================================ */
    {
      type: 'compare', name: '比較表', icon: '⚖️',
      desc: '他社/従来品との比較。',
      variants: [
        { id: 'highlight', name: 'ハイライト列',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'COMPARISON' },
            { key: 'title', label: '見出し', type: 'text', default: '他社製品との違い' },
            { key: 'usLabel', label: '自社（ハイライト列）', type: 'text', default: '本商品' },
            { key: 'otherLabel', label: '比較対象', type: 'text', default: '従来品' },
            { key: 'rows', label: '比較項目', type: 'richlist', itemDefault:{label:'項目',us:'○',other:'×'},
              default:[
                { label:'保湿成分の種類', us:'5種類', other:'1種類' },
                { label:'無添加・フリー処方', us:'○', other:'×' },
                { label:'日本製', us:'○', other:'△' },
                { label:'返金保証', us:'30日間', other:'なし' }
              ],
              itemFields:[{key:'label',label:'項目',type:'text'},{key:'us',label:'自社の値',type:'text'},{key:'other',label:'比較対象の値',type:'text'}] }
          ],
          render(d, ctx) {
            const rows = (d.rows||[]).map(r => `<tr><td class="lp-cmp-label">${esc(r.label)}</td><td class="lp-cmp-other">${esc(r.other)}</td><td class="lp-cmp-us">${esc(r.us)}</td></tr>`).join('');
            return `<section class="lp-compare" data-variant="highlight"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-table-wrap"><table class="lp-cmp-table"><thead><tr><th></th><th class="lp-cmp-other">${esc(d.otherLabel)}</th><th class="lp-cmp-us">${esc(d.usLabel)}</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
          }
        },
        { id: 'check', name: 'チェック/バツ',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'COMPARISON' },
            { key: 'title', label: '見出し', type: 'text', default: '本商品でできること' },
            { key: 'usLabel', label: '本商品（左列）', type: 'text', default: '本商品' },
            { key: 'otherLabel', label: '他社品（右列）', type: 'text', default: '他社品' },
            { key: 'rows', label: '比較項目', type: 'richlist', itemDefault:{label:'項目',us:'yes',other:'no'},
              default:[
                { label:'全成分公開', us:'yes', other:'no' },
                { label:'返金保証あり', us:'yes', other:'no' },
                { label:'日本国内製造', us:'yes', other:'yes' },
                { label:'定期縛りなし', us:'yes', other:'no' }
              ],
              itemFields:[{key:'label',label:'項目',type:'text'},{key:'us',label:'本商品（yes/no）',type:'select',options:[{v:'yes',l:'○'},{v:'no',l:'×'},{v:'triangle',l:'△'}]},{key:'other',label:'他社品（yes/no）',type:'select',options:[{v:'yes',l:'○'},{v:'no',l:'×'},{v:'triangle',l:'△'}]}] }
          ],
          render(d, ctx) {
            const mk = (v) => v==='yes'?'<span class="lp-ico lp-ico-ok">✓</span>':v==='triangle'?'<span class="lp-ico lp-ico-tri">△</span>':'<span class="lp-ico lp-ico-ng">×</span>';
            const rows = (d.rows||[]).map(r => `<tr><td class="lp-cmp-label">${esc(r.label)}</td><td class="lp-cmp-us">${mk(r.us)}</td><td class="lp-cmp-other">${mk(r.other)}</td></tr>`).join('');
            return `<section class="lp-compare lp-compare-check" data-variant="check"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-table-wrap"><table class="lp-cmp-table"><thead><tr><th></th><th class="lp-cmp-us">${esc(d.usLabel)}</th><th class="lp-cmp-other">${esc(d.otherLabel)}</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
          }
        },
        { id: 'cards', name: 'カード比較',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'COMPARISON' },
            { key: 'title', label: '見出し', type: 'text', default: '比べてみました' },
            { key: 'usLabel', label: '自社カード名', type: 'text', default: '本商品' },
            { key: 'otherLabel', label: '比較カード名', type: 'text', default: '従来品' },
            { key: 'rows', label: '比較項目', type: 'richlist', itemDefault:{label:'項目',us:'○',other:'×'},
              default:[
                { label:'成分の種類', us:'5種類', other:'1種類' },
                { label:'無添加', us:'○', other:'×' },
                { label:'返金保証', us:'30日間', other:'なし' }
              ],
              itemFields:[{key:'label',label:'項目',type:'text'},{key:'us',label:'自社の値',type:'text'},{key:'other',label:'比較対象の値',type:'text'}] }
          ],
          render(d, ctx) {
            const usItems = (d.rows||[]).map(r => `<li><span class="lp-cmp-card-k">${esc(r.label)}</span><span class="lp-cmp-card-v">${esc(r.us)}</span></li>`).join('');
            const otherItems = (d.rows||[]).map(r => `<li><span class="lp-cmp-card-k">${esc(r.label)}</span><span class="lp-cmp-card-v">${esc(r.other)}</span></li>`).join('');
            return `<section class="lp-compare" data-variant="cards"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-cmp-cards"><div class="lp-cmp-card lp-cmp-card-other"><h3 class="lp-cmp-card-name">${esc(d.otherLabel)}</h3><ul>${otherItems}</ul></div><div class="lp-cmp-card lp-cmp-card-us"><div class="lp-cmp-card-badge">おすすめ</div><h3 class="lp-cmp-card-name">${esc(d.usLabel)}</h3><ul>${usItems}</ul></div></div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       8. 仕様スペック表  A.zebra / B.枠囲み / C.2カラム
       ============================================================ */
    {
      type: 'spec', name: '仕様スペック表', icon: '🔩',
      desc: '商品のスペック一覧。',
      variants: [
        { id: 'zebra', name: 'zebra行',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'SPECIFICATION' },
            { key: 'title', label: '見出し', type: 'text', default: '商品仕様' },
            { key: 'rows', label: '仕様項目', type: 'richlist', itemDefault:{label:'項目',value:'値'},
              default:[
                { label:'内容量', value:'50mL' },{ label:'原材料', value:'水、グリセリン、ヒアルロン酸Na、他' },
                { label:'生産国', value:'日本' },{ label:'賞味期限', value:'製造より3年（開封後6ヶ月）' }
              ],
              itemFields:[{key:'label',label:'項目名',type:'text'},{key:'value',label:'値',type:'text'}] }
          ],
          render(d, ctx) {
            const rows = (d.rows||[]).map(r => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('');
            return `<section class="lp-spec" data-variant="zebra"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><table class="lp-spec-table"><tbody>${rows}</tbody></table></div></section>`;
          }
        },
        { id: 'bordered', name: '枠囲み',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'SPECIFICATION' },
            { key: 'title', label: '見出し', type: 'text', default: '商品仕様' },
            { key: 'rows', label: '仕様項目', type: 'richlist', itemDefault:{label:'項目',value:'値'},
              default:[{ label:'内容量', value:'50mL' },{ label:'生産国', value:'日本' },{ label:'賞味期限', value:'3年' }],
              itemFields:[{key:'label',label:'項目名',type:'text'},{key:'value',label:'値',type:'text'}] }
          ],
          render(d, ctx) {
            const rows = (d.rows||[]).map(r => `<div class="lp-spec-bd-row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('');
            return `<section class="lp-spec lp-spec-bordered" data-variant="bordered"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><dl class="lp-spec-bd">${rows}</dl></div></section>`;
          }
        },
        { id: 'twocol', name: '2カラム',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'SPECIFICATION' },
            { key: 'title', label: '見出し', type: 'text', default: '商品仕様' },
            { key: 'rows', label: '仕様項目', type: 'richlist', itemDefault:{label:'項目',value:'値'},
              default:[
                { label:'内容量', value:'50mL' },{ label:'原材料', value:'植物由来成分' },
                { label:'生産国', value:'日本' },{ label:'賞味期限', value:'3年' }
              ],
              itemFields:[{key:'label',label:'項目名',type:'text'},{key:'value',label:'値',type:'text'}] }
          ],
          render(d, ctx) {
            const rows = (d.rows||[]).map(r => `<div class="lp-spec-2c-item"><div class="lp-spec-2c-k">${esc(r.label)}</div><div class="lp-spec-2c-v">${esc(r.value)}</div></div>`).join('');
            return `<section class="lp-spec lp-spec-2col" data-variant="twocol"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-spec-2c-grid">${rows}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       9. 価格表  A.3カラム / B.リスト型(縦) / C.強調1プラン
       ============================================================ */
    {
      type: 'pricing', name: '価格表（税込）', icon: '💰',
      desc: 'コース比較。日本向け税込表示。',
      variants: [
        { id: 'col3', name: '3カラム',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'PRICE' },
            { key: 'title', label: '見出し', type: 'text', default: 'お得なコース' },
            { key: 'plans', label: 'プラン', type: 'richlist', itemDefault:{name:'プラン',price:'4980',period:'（税込）',badge:'',features:[],ctaText:'選択する',ctaUrl:'#cta',highlight:false},
              default:[
                { name:'お試し1個', price:'3278', period:'（税込）', features:['1回限りのお試し','送料無料'], ctaText:'1個で試す', ctaUrl:'#cta' },
                { name:'定期便（人気）', price:'4980', period:'（税込／2個セット）', badge:'おすすめ', features:['毎月2個お届け','いつでも解約OK','10%OFFクーポン付き'], ctaText:'定期便を始める', ctaUrl:'#cta', highlight:true },
                { name:'たっぷり3個', price:'6500', period:'（税込／3個セット）', features:['約2ヶ月分','まとめ買い割引'], ctaText:'3個セットで購入', ctaUrl:'#cta' }
              ],
              itemFields:[{key:'name',label:'プラン名',type:'text'},{key:'price',label:'価格（数値）',type:'number'},{key:'period',label:'単位・注記',type:'text'},{key:'badge',label:'バッジ（任意）',type:'text'},{key:'features',label:'特徴（1行1つ）',type:'textarea'},{key:'ctaText',label:'ボタン文言',type:'text'},{key:'ctaUrl',label:'リンク先',type:'url'},{key:'highlight',label:'ハイライト',type:'check'}] }
          ],
          render(d, ctx) {
            const plans = (d.plans||[]).map(p => {
              const feats = (p.features||[]).map(f => `<li>${esc(f)}</li>`).join('');
              const badge = p.badge ? `<div class="lp-plan-badge">${esc(p.badge)}</div>` : '';
              return `<div class="lp-plan${p.highlight?' lp-plan-featured':''}">${badge}<h3 class="lp-plan-name">${esc(p.name)}</h3><div class="lp-plan-price">${ctx.formatPrice(p.price)}<span class="lp-plan-period">${esc(p.period||'')}</span></div><ul class="lp-plan-features">${feats}</ul><a class="lp-btn ${p.highlight?'lp-btn-primary':'lp-btn-outline'} lp-btn-block" href="${esc(p.ctaUrl||'#cta')}">${esc(p.ctaText||'選択する')}</a></div>`;
            }).join('');
            return `<section class="lp-pricing" data-variant="col3" id="cta"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-plan-grid">${plans}</div><p class="lp-pricing-note">※ 表示価格はすべて消費税込です。</p></div></section>`;
          }
        },
        { id: 'list', name: 'リスト型（縦）',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'PRICE' },
            { key: 'title', label: '見出し', type: 'text', default: 'お得なコース' },
            { key: 'plans', label: 'プラン', type: 'richlist', itemDefault:{name:'プラン',price:'4980',period:'（税込）',features:[],ctaText:'選択する',ctaUrl:'#cta',highlight:false},
              default:[
                { name:'お試し1個', price:'3278', period:'（税込）', features:['1回限りのお試し','送料無料'], ctaText:'1個で試す', ctaUrl:'#cta' },
                { name:'定期便（人気）', price:'4980', period:'（税込／2個セット）', features:['毎月2個お届け','いつでも解約OK'], ctaText:'定期便を始める', ctaUrl:'#cta', highlight:true }
              ],
              itemFields:[{key:'name',label:'プラン名',type:'text'},{key:'price',label:'価格（数値）',type:'number'},{key:'period',label:'単位・注記',type:'text'},{key:'features',label:'特徴（1行1つ）',type:'textarea'},{key:'ctaText',label:'ボタン文言',type:'text'},{key:'ctaUrl',label:'リンク先',type:'url'},{key:'highlight',label:'ハイライト',type:'check'}] }
          ],
          render(d, ctx) {
            const plans = (d.plans||[]).map(p => {
              const feats = (p.features||[]).map(f => `<li>${esc(f)}</li>`).join('');
              return `<div class="lp-plan-row${p.highlight?' lp-plan-row-featured':''}"><div class="lp-plan-row-info"><h3 class="lp-plan-name">${esc(p.name)}</h3><ul class="lp-plan-features">${feats}</ul></div><div class="lp-plan-row-price"><div class="lp-plan-price">${ctx.formatPrice(p.price)}<span class="lp-plan-period">${esc(p.period||'')}</span></div><a class="lp-btn ${p.highlight?'lp-btn-primary':'lp-btn-outline'}" href="${esc(p.ctaUrl||'#cta')}">${esc(p.ctaText||'選択する')}</a></div></div>`;
            }).join('');
            return `<section class="lp-pricing lp-pricing-list" data-variant="list" id="cta"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-plan-row-list">${plans}</div><p class="lp-pricing-note">※ 表示価格はすべて消費税込です。</p></div></section>`;
          }
        },
        { id: 'single', name: '強調1プラン',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'PRICE' },
            { key: 'name', label: 'プラン名', type: 'text', default: '定期便（2個セット）' },
            { key: 'price', label: '価格（数値）', type: 'number', default: 4980 },
            { key: 'oldPrice', label: '通常価格（任意・割引表示用）', type: 'number', default: 6800 },
            { key: 'period', label: '単位・注記', type: 'text', default: '（税込／2個セット）' },
            { key: 'features', label: '特徴（1行1つ）', type: 'textarea', default:'毎月2個お届け\nいつでも解約OK\n10%OFFクーポン付き\n送料無料' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '今すぐお試しする' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'note', label: '注釈', type: 'text', default: '▲ 30日間返金保証付き' }
          ],
          render(d, ctx) {
            const feats = (d.features||'').split('\n').map(f => f.trim()).filter(Boolean).map(f => `<li>${esc(f)}</li>`).join('');
            const oldP = d.oldPrice ? `<span class="lp-plan-old">${ctx.formatPrice(d.oldPrice)}</span>` : '';
            return `<section class="lp-pricing lp-pricing-single" data-variant="single" id="cta"><div class="lp-container lp-narrow"><div class="lp-plan-single"><div class="lp-plan-single-info"><p class="lp-eyebrow">${esc(d.eyebrow||'PRICE')}</p><h3 class="lp-plan-name">${esc(d.name)}</h3><div class="lp-plan-price">${oldP}${ctx.formatPrice(d.price)}<span class="lp-plan-period">${esc(d.period||'')}</span></div><ul class="lp-plan-features lp-plan-features-2col">${feats}</ul></div><div class="lp-plan-single-cta"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a>${d.note?`<p class="lp-pricing-note">${esc(d.note)}</p>`:''}</div></div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       10. ギャラリー  A.等サイズグリッド / B.大小ミックス / C.スライダー風
       ============================================================ */
    {
      type: 'gallery', name: 'ギャラリー', icon: '🖼️',
      desc: '商品画像の並列表示。',
      variants: [
        { id: 'grid', name: '等サイズグリッド',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'GALLERY' },
            { key: 'title', label: '見出し', type: 'text', default: '商品のディテール' },
            { key: 'cols', label: '列数（PC）', type: 'select', default: '4', options:[{v:'2',l:'2列'},{v:'3',l:'3列'},{v:'4',l:'4列'}] },
            { key: 'images', label: '画像リスト', type: 'richlist', itemDefault:{image:'',caption:'キャプション'},
              default:[{image:'',caption:'製品全体'},{image:'',caption:'テクスチャ'},{image:'',caption:'パッケージ'},{image:'',caption:'使用イメージ'}],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'caption',label:'キャプション（任意）',type:'text'}] }
          ],
          render(d, ctx) {
            const items = (d.images||[]).map(im => `<figure class="lp-gallery-item"><img src="${ctx.img(im.image,600,600,'ギャラリー')}" alt="${esc(im.caption||'')}" loading="lazy">${im.caption?`<figcaption>${esc(im.caption)}</figcaption>`:''}</figure>`).join('');
            return `<section class="lp-gallery" data-variant="grid"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-gallery-grid lp-gal-${esc(d.cols)}">${items}</div></div></section>`;
          }
        },
        { id: 'mosaic', name: '大小ミックス',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'GALLERY' },
            { key: 'title', label: '見出し', type: 'text', default: '商品のディテール' },
            { key: 'images', label: '画像リスト（5枚推奨）', type: 'richlist', itemDefault:{image:'',caption:''},
              default:[{image:'',caption:''},{image:'',caption:''},{image:'',caption:''},{image:'',caption:''},{image:'',caption:''}],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'caption',label:'キャプション（任意）',type:'text'}] }
          ],
          render(d, ctx) {
            const items = (d.images||[]).map((im,i) => `<figure class="lp-gallery-mos-item lp-gal-mos-${i+1}"><img src="${ctx.img(im.image,800,800,'ギャラリー'+(i+1))}" alt="${esc(im.caption||'')}" loading="lazy">${im.caption?`<figcaption>${esc(im.caption)}</figcaption>`:''}</figure>`).join('');
            return `<section class="lp-gallery" data-variant="mosaic"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-gallery-mosaic">${items}</div></div></section>`;
          }
        },
        { id: 'scroll', name: '横スクロール',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'GALLERY' },
            { key: 'title', label: '見出し', type: 'text', default: '商品のディテール' },
            { key: 'images', label: '画像リスト', type: 'richlist', itemDefault:{image:'',caption:''},
              default:[{image:'',caption:''},{image:'',caption:''},{image:'',caption:''},{image:'',caption:''},{image:'',caption:''},{image:'',caption:''}],
              itemFields:[{key:'image',label:'画像',type:'image'},{key:'caption',label:'キャプション（任意）',type:'text'}] }
          ],
          render(d, ctx) {
            const items = (d.images||[]).map(im => `<figure class="lp-gallery-scroll-item"><img src="${ctx.img(im.image,500,500,'ギャラリー')}" alt="${esc(im.caption||'')}" loading="lazy">${im.caption?`<figcaption>${esc(im.caption)}</figcaption>`:''}</figure>`).join('');
            return `<section class="lp-gallery" data-variant="scroll"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-gallery-scroll">${items}</div><p class="lp-gallery-scroll-hint">← 横にスクロール →</p></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       11. お客様の声  A.3カラム / B.1件大きく / C.平均+引用
       ============================================================ */
    {
      type: 'reviews', name: 'お客様の声（星評価）', icon: '⭐',
      desc: '口コミと星評価。',
      variants: [
        { id: 'col3', name: '3カラムカード',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'REVIEWS' },
            { key: 'title', label: '見出し', type: 'text', default: 'ご利用者様の声' },
            { key: 'avgRating', label: '平均評価', type: 'number', default: 4.8 },
            { key: 'avgLabel', label: '平均評価の補足', type: 'text', default: '（2,341件のレビューより）' },
            { key: 'reviews', label: 'レビュー', type: 'richlist', itemDefault:{name:'お名前',meta:'30代・女性',rating:5,title:'タイトル',body:'感想'},
              default:[
                { name:'M.K様', meta:'30代・女性', rating:5, title:'使い心地が最高です', body:'さらっとしていてベタつかないのに、朝までしっかり潤っています。もう手放せません。' },
                { name:'T.S様', meta:'40代・女性', rating:5, title:'肌の調子が違います', body:'1週間でハリが出たと主人に言われました。リピート決定です。' },
                { name:'R.Y様', meta:'20代・女性', rating:4, title:'無添加で安心', body:'敏感肌ですが刺激もなく使えています。もう少し安いと嬉しいです。' }
              ],
              itemFields:[{key:'name',label:'お名前',type:'text'},{key:'meta',label:'属性（年代・性別）',type:'text'},{key:'rating',label:'評価（1〜5）',type:'number'},{key:'title',label:'タイトル',type:'text'},{key:'body',label:'本文',type:'textarea'}] }
          ],
          render(d, ctx) {
            const avg = d.avgRating ? `<div class="lp-reviews-avg"><span class="lp-reviews-avg-num">${esc(d.avgRating)}</span><span class="lp-reviews-avg-stars">${stars(d.avgRating)}</span><span class="lp-reviews-avg-label">${esc(d.avgLabel||'')}</span></div>` : '';
            const items = (d.reviews||[]).map(r => `<div class="lp-review"><div class="lp-review-stars">${stars(r.rating)}</div><p class="lp-review-title">${esc(r.title)}</p><p class="lp-review-body">${nl2br(r.body)}</p><p class="lp-review-meta">${esc(r.name)} ／ ${esc(r.meta)}</p></div>`).join('');
            return `<section class="lp-reviews" data-variant="col3"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2>${avg}</div><div class="lp-review-grid">${items}</div></div></section>`;
          }
        },
        { id: 'big', name: '1件大きく',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'REVIEW' },
            { key: 'title', label: '見出し', type: 'text', default: 'お客様の声' },
            { key: 'name', label: 'お名前', type: 'text', default: 'M.K様' },
            { key: 'meta', label: '属性', type: 'text', default: '30代・女性' },
            { key: 'rating', label: '評価（1〜5）', type: 'number', default: 5 },
            { key: 'body', label: '本文', type: 'textarea', default: 'さらっとしていてベタつかないのに、朝までしっかり潤っています。使い始めて1ヶ月、肌の調子が明らかに違います。もう手放せません。' },
            { key: 'image', label: 'お客様の写真（任意）', type: 'image', default: '' }
          ],
          render(d, ctx) {
            const imgHtml = d.image ? `<div class="lp-review-big-img"><img src="${ctx.img(d.image,200,200,'お客様')}" alt="${esc(d.name)}"></div>` : '';
            return `<section class="lp-reviews lp-review-big" data-variant="big"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-review-big-card">${imgHtml}<div class="lp-review-big-body"><div class="lp-review-stars">${stars(d.rating)}</div><p class="lp-review-big-text">"${nl2br(d.body)}"</p><p class="lp-review-meta">${esc(d.name)} ／ ${esc(d.meta)}</p></div></div></div></section>`;
          }
        },
        { id: 'avg', name: '平均＋引用',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'REVIEWS' },
            { key: 'title', label: '見出し', type: 'text', default: 'ご利用者様の声' },
            { key: 'avgRating', label: '平均評価', type: 'number', default: 4.8 },
            { key: 'avgLabel', label: '件数', type: 'text', default: '2,341件のレビュー' },
            { key: 'reviews', label: '引用レビュー', type: 'richlist', itemDefault:{body:'感想',name:'お名前'},
              default:[
                { body:'肌の調子が明らかに良くなりました。', name:'30代女性' },
                { body:'無添加で安心して使えています。', name:'40代女性' },
                { body:'リピート決定！手放せません。', name:'20代女性' }
              ],
              itemFields:[{key:'body',label:'引用文',type:'text'},{key:'name',label:'お名前',type:'text'}] }
          ],
          render(d, ctx) {
            const quotes = (d.reviews||[]).map(r => `<figure class="lp-review-quote"><blockquote>"${esc(r.body)}"</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`).join('');
            return `<section class="lp-reviews lp-reviews-avg" data-variant="avg"><div class="lp-container"><div class="lp-reviews-avg-hero"><div class="lp-reviews-avg-big">${esc(d.avgRating)}</div><div><div class="lp-reviews-avg-stars">${stars(d.avgRating)}</div><p class="lp-reviews-avg-label">${esc(d.avgLabel||'')}</p></div></div><div class="lp-review-quote-grid">${quotes}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       12. FAQ  A.アコーディオン / B.2カラム / C.展開リスト
       ============================================================ */
    {
      type: 'faq', name: 'よくある質問', icon: '❓',
      desc: 'Q&A。不安解消。',
      variants: [
        { id: 'accordion', name: 'アコーディオン',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FAQ' },
            { key: 'title', label: '見出し', type: 'text', default: 'よくあるご質問' },
            { key: 'faqs', label: 'Q&A', type: 'richlist', itemDefault:{q:'質問',a:'回答'},
              default:[
                { q:'敏感肌でも使えますか？', a:'パラベン・鉱物油フリーの低刺激処方ですが、お肌に合わない場合はご利用を中止し、専門医にご相談ください。' },
                { q:'送料はいくらですか？', a:'全国どこでも送料無料です。お届けはご注文後2〜4日程度です。' },
                { q:'返品・交換はできますか？', a:'商品不良やご注文と異なる場合は、商品到着後7日以内にご連絡ください。' },
                { q:'定期便の解約はいつでもできますか？', a:'次回お届け日の7日前までのご連絡で、いつでも解約・休止が可能です。' }
              ],
              itemFields:[{key:'q',label:'質問',type:'text'},{key:'a',label:'回答',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.faqs||[]).map((f,i) => `<details class="lp-faq-item"${i===0?' open':''}><summary class="lp-faq-q"><span class="lp-faq-mark">Q.</span>${esc(f.q)}</summary><div class="lp-faq-a"><span class="lp-faq-mark lp-faq-mark-a">A.</span>${nl2br(f.a)}</div></details>`).join('');
            return `<section class="lp-faq" data-variant="accordion"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-faq-list">${items}</div></div></section>`;
          }
        },
        { id: 'twocol', name: '2カラムQ&A',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FAQ' },
            { key: 'title', label: '見出し', type: 'text', default: 'よくあるご質問' },
            { key: 'faqs', label: 'Q&A', type: 'richlist', itemDefault:{q:'質問',a:'回答'},
              default:[
                { q:'敏感肌でも使えますか？', a:'低刺激処方ですが、合わない場合はご利用を中止してください。' },
                { q:'送料は？', a:'全国送料無料です。' },
                { q:'返品は？', a:'7日以内にご連絡ください。' },
                { q:'解約は？', a:'次回お届け7日前までにご連絡を。' }
              ],
              itemFields:[{key:'q',label:'質問',type:'text'},{key:'a',label:'回答',type:'textarea'}] }
          ],
          render(d, ctx) {
            const items = (d.faqs||[]).map(f => `<div class="lp-faq-2c-item"><div class="lp-faq-2c-q"><span class="lp-faq-mark">Q.</span>${esc(f.q)}</div><div class="lp-faq-2c-a"><span class="lp-faq-mark lp-faq-mark-a">A.</span>${nl2br(f.a)}</div></div>`).join('');
            return `<section class="lp-faq lp-faq-2col" data-variant="twocol"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-faq-2c-grid">${items}</div></div></section>`;
          }
        },
        { id: 'list', name: '展開リスト（+ボタン）',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'FAQ' },
            { key: 'title', label: '見出し', type: 'text', default: 'よくあるご質問' },
            { key: 'faqs', label: 'Q&A', type: 'richlist', itemDefault:{q:'質問',a:'回答'},
              default:[
                { q:'敏感肌でも使えますか？', a:'低刺激処方ですが、合わない場合はご利用を中止してください。' },
                { q:'送料はいくらですか？', a:'全国送料無料です。' },
                { q:'定期便の解約は？', a:'次回お届け7日前までにご連絡を。' }
              ],
              itemFields:[{key:'q',label:'質問',type:'text'},{key:'a',label:'回答',type:'textarea'}] }
          ],
          render(d, ctx) {
            // アコーディオンと同じdetailsだが、スタイルで「+」角型に見せる
            const items = (d.faqs||[]).map((f,i) => `<details class="lp-faq-item lp-faq-list2"${i===0?' open':''}><summary class="lp-faq-q lp-faq-list2-q"><span>${esc(f.q)}</span></summary><div class="lp-faq-a">${nl2br(f.a)}</div></details>`).join('');
            return `<section class="lp-faq lp-faq-list2-sec" data-variant="list"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div><div class="lp-faq-list">${items}</div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       13. 動画  A.16:9 / B.正方形/円形 / C.全幅
       ============================================================ */
    {
      type: 'video', name: '動画', icon: '🎬',
      desc: 'YouTube/MP4動画の埋込。',
      variants: [
        { id: 'wide', name: '16:9',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'MOVIE' },
            { key: 'title', label: '見出し', type: 'text', default: '商品紹介動画' },
            { key: 'videoType', label: '動画の種類', type: 'select', default: 'youtube', options:[{v:'youtube',l:'YouTube'},{v:'mp4',l:'MP4 (直リンク)'}] },
            { key: 'youtubeId', label: 'YouTube 動画ID', type: 'text', default: 'dQw4w9WgXcQ' },
            { key: 'mp4Url', label: 'MP4 URL', type: 'url', default: '' },
            { key: 'poster', label: 'サムネイル画像（MP4用）', type: 'image', default: '' }
          ],
          render(d, ctx) {
            let media = '';
            if (d.videoType === 'youtube' && d.youtubeId) media = `<div class="lp-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(d.youtubeId)}" title="${esc(d.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
            else { const poster = d.poster ? ctx.img(d.poster,1280,720,'動画サムネイル') : ''; media = `<div class="lp-video-frame"><video controls playsinline ${poster?`poster="${poster}"`:''}><source src="${esc(d.mp4Url)}" type="video/mp4"></video></div>`; }
            return `<section class="lp-video-sec" data-variant="wide"><div class="lp-container lp-narrow"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>${media}</div></section>`;
          }
        },
        { id: 'square', name: '正方形（縦）',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'MOVIE' },
            { key: 'title', label: '見出し', type: 'text', default: '商品紹介動画' },
            { key: 'videoType', label: '動画の種類', type: 'select', default: 'youtube', options:[{v:'youtube',l:'YouTube'},{v:'mp4',l:'MP4 (直リンク)'}] },
            { key: 'youtubeId', label: 'YouTube 動画ID', type: 'text', default: 'dQw4w9WgXcQ' },
            { key: 'mp4Url', label: 'MP4 URL', type: 'url', default: '' }
          ],
          render(d, ctx) {
            let media = '';
            if (d.videoType === 'youtube' && d.youtubeId) media = `<div class="lp-video-frame lp-video-sq"><iframe src="https://www.youtube-nocookie.com/embed/${esc(d.youtubeId)}" title="${esc(d.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
            else media = `<div class="lp-video-frame lp-video-sq"><video controls playsinline><source src="${esc(d.mp4Url)}" type="video/mp4"></video></div>`;
            return `<section class="lp-video-sec lp-video-square-sec" data-variant="square"><div class="lp-container"><div class="lp-section-head lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>${media}</div></section>`;
          }
        },
        { id: 'full', name: '全幅',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'MOVIE' },
            { key: 'title', label: '見出し', type: 'text', default: '商品紹介動画' },
            { key: 'videoType', label: '動画の種類', type: 'select', default: 'youtube', options:[{v:'youtube',l:'YouTube'},{v:'mp4',l:'MP4 (直リンク)'}] },
            { key: 'youtubeId', label: 'YouTube 動画ID', type: 'text', default: 'dQw4w9WgXcQ' },
            { key: 'mp4Url', label: 'MP4 URL', type: 'url', default: '' }
          ],
          render(d, ctx) {
            let media = '';
            if (d.videoType === 'youtube' && d.youtubeId) media = `<div class="lp-video-frame lp-video-full"><iframe src="https://www.youtube-nocookie.com/embed/${esc(d.youtubeId)}" title="${esc(d.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
            else media = `<div class="lp-video-frame lp-video-full"><video controls playsinline><source src="${esc(d.mp4Url)}" type="video/mp4"></video></div>`;
            return `<section class="lp-video-sec lp-video-full-sec" data-variant="full"><div class="lp-section-head lp-center" style="padding:0 20px">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2></div>${media}</section>`;
          }
        }
      ]
    },

    /* ============================================================
       14. カウントダウン  A.4分割 / B.バー型 / C.円形
       ============================================================ */
    {
      type: 'countdown', name: 'カウントダウンタイマー', icon: '⏰',
      desc: 'セール終了までの残り時間。',
      variants: [
        { id: 'boxes', name: '4分割ボックス',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'LIMITED TIME' },
            { key: 'title', label: '見出し', type: 'text', default: 'キャンペーン終了まであと' },
            { key: 'deadline', label: '終了日時', type: 'text', default: '', hint:'YYYY-MM-DDTHH:MM' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '終了前に購入する' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' }
          ],
          render(d, ctx) {
            return `<section class="lp-countdown" data-variant="boxes"><div class="lp-container lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2><div class="lp-cd" data-deadline="${esc(d.deadline||'')}"><div class="lp-cd-unit"><span class="lp-cd-num" data-cd="d">--</span><span class="lp-cd-lbl">日</span></div><div class="lp-cd-unit"><span class="lp-cd-num" data-cd="h">--</span><span class="lp-cd-lbl">時間</span></div><div class="lp-cd-unit"><span class="lp-cd-num" data-cd="m">--</span><span class="lp-cd-lbl">分</span></div><div class="lp-cd-unit"><span class="lp-cd-num" data-cd="s">--</span><span class="lp-cd-lbl">秒</span></div></div>${d.ctaText?`<a class="lp-btn lp-btn-white lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a>`:''}</div></section>`;
          }
        },
        { id: 'bar', name: 'バー型',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'LIMITED TIME' },
            { key: 'title', label: '見出し', type: 'text', default: 'セール終了まで残り' },
            { key: 'deadline', label: '終了日時', type: 'text', default: '', hint:'YYYY-MM-DDTHH:MM' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '今すぐ購入' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' }
          ],
          render(d, ctx) {
            return `<section class="lp-countdown lp-countdown-bar" data-variant="bar"><div class="lp-container"><div class="lp-cd-bar-inner">${d.eyebrow?`<span class="lp-cd-bar-eb">${esc(d.eyebrow)}</span>`:''}<span class="lp-cd-bar-title">${esc(d.title)}</span><span class="lp-cd lp-cd-bar-time" data-deadline="${esc(d.deadline||'')}"><span data-cd="d">--</span>日 <span data-cd="h">--</span>:<span data-cd="m">--</span>:<span data-cd="s">--</span></span>${d.ctaText?`<a class="lp-btn lp-btn-white" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a>`:''}</div></div></section>`;
          }
        },
        { id: 'circles', name: '円形',
          schema: [
            { key: 'eyebrow', label: '小見出し', type: 'text', default: 'LIMITED TIME' },
            { key: 'title', label: '見出し', type: 'text', default: 'キャンペーン終了まであと' },
            { key: 'deadline', label: '終了日時', type: 'text', default: '', hint:'YYYY-MM-DDTHH:MM' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: '終了前に購入する' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' }
          ],
          render(d, ctx) {
            return `<section class="lp-countdown lp-countdown-circles" data-variant="circles"><div class="lp-container lp-center">${d.eyebrow?`<p class="lp-eyebrow">${esc(d.eyebrow)}</p>`:''}<h2 class="lp-h2">${esc(d.title)}</h2><div class="lp-cd lp-cd-circles" data-deadline="${esc(d.deadline||'')}"><div class="lp-cd-circle"><span class="lp-cd-num" data-cd="d">--</span><span class="lp-cd-lbl">DAYS</span></div><div class="lp-cd-circle"><span class="lp-cd-num" data-cd="h">--</span><span class="lp-cd-lbl">HRS</span></div><div class="lp-cd-circle"><span class="lp-cd-num" data-cd="m">--</span><span class="lp-cd-lbl">MIN</span></div><div class="lp-cd-circle"><span class="lp-cd-num" data-cd="s">--</span><span class="lp-cd-lbl">SEC</span></div></div>${d.ctaText?`<a class="lp-btn lp-btn-white lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a>`:''}</div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       15. CTA  A.帯 / B.カード / C.分割
       ============================================================ */
    {
      type: 'cta', name: 'CTA（申込）', icon: '🔔',
      desc: '申込を促す最終アクション。',
      variants: [
        { id: 'band', name: '帯（背景色）',
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
            return `<section class="lp-cta" data-variant="band" id="cta-2" style="background:${esc(d.bg)};color:${esc(d.fg)}"><div class="lp-container lp-center"><h2 class="lp-cta-title">${esc(d.title)}</h2>${d.subtitle?`<p class="lp-cta-sub">${nl2br(d.subtitle)}</p>`:''}${d.ctaText?`<div class="lp-cta-btn"><a class="lp-btn lp-btn-white lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}${d.note?`<p class="lp-cta-note">${esc(d.note)}</p>`:''}</div></section>`;
          }
        },
        { id: 'card', name: 'カード',
          schema: [
            { key: 'title', label: '見出し', type: 'text', default: '今すぐ始めませんか？' },
            { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '30日間の返金保証付き。初めての方も安心。' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: 'お試しする' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'note', label: '注釈', type: 'text', default: '▲ 今だけ送料無料' },
            { key: 'bg', label: '背景色', type: 'color', default: '#fff7f8' }
          ],
          render(d, ctx) {
            return `<section class="lp-cta lp-cta-card-sec" data-variant="card" style="background:${esc(d.bg)}"><div class="lp-container"><div class="lp-cta-card"><h2 class="lp-cta-title">${esc(d.title)}</h2>${d.subtitle?`<p class="lp-cta-sub">${nl2br(d.subtitle)}</p>`:''}${d.ctaText?`<div class="lp-cta-btn"><a class="lp-btn lp-btn-primary lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}${d.note?`<p class="lp-cta-note">${esc(d.note)}</p>`:''}</div></div></section>`;
          }
        },
        { id: 'split', name: '分割（文章＋画像）',
          schema: [
            { key: 'title', label: '見出し', type: 'text', default: 'あなたの始めの一歩を、応援します。' },
            { key: 'subtitle', label: 'サブテキスト', type: 'textarea', default: '30日間の返金保証付き。' },
            { key: 'ctaText', label: 'ボタン文言', type: 'text', default: 'ご購入はこちら' },
            { key: 'ctaUrl', label: 'リンク先', type: 'url', default: '#cta' },
            { key: 'image', label: '画像', type: 'image', default: '' },
            { key: 'bg', label: '背景色', type: 'color', default: '#e87a8b' },
            { key: 'fg', label: '文字色', type: 'color', default: '#ffffff' }
          ],
          render(d, ctx) {
            return `<section class="lp-cta lp-cta-split" data-variant="split" style="background:${esc(d.bg)};color:${esc(d.fg)}"><div class="lp-container lp-cta-split-row"><div class="lp-cta-split-text"><h2 class="lp-cta-title">${esc(d.title)}</h2>${d.subtitle?`<p class="lp-cta-sub">${nl2br(d.subtitle)}</p>`:''}${d.ctaText?`<div class="lp-cta-btn"><a class="lp-btn lp-btn-white lp-btn-lg" href="${esc(d.ctaUrl||'#cta')}">${esc(d.ctaText)}</a></div>`:''}</div><div class="lp-cta-split-img"><img src="${ctx.img(d.image,700,700,'CTA画像')}" alt=""></div></div></section>`;
          }
        }
      ]
    },

    /* ============================================================
       16. フッター  A.標準 / B.4カラム / C.ミニマル
       ============================================================ */
    {
      type: 'footer', name: 'フッター（会社情報）', icon: '🏷️',
      desc: '特定商取引法に基づく表記・会社情報。',
      variants: [
        { id: 'standard', name: '標準',
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
            const links = (d.links||'').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name,url]=l.split('|'); return `<a href="${esc((url||'#').trim())}">${esc((name||'').trim())}</a>`; }).join('<span class="lp-foot-sep">／</span>');
            return `<footer class="lp-footer" data-variant="standard"><div class="lp-container"><div class="lp-foot-shop">${esc(d.shopName)}</div>${links?`<nav class="lp-foot-links">${links}</nav>`:''}<div class="lp-foot-info">${d.company?`<div>${esc(d.company)}</div>`:''}${d.address?`<div>${esc(d.address)}</div>`:''}${d.phone?`<div>TEL: ${esc(d.phone)}</div>`:''}${d.email?`<div>Email: ${esc(d.email)}</div>`:''}</div><div class="lp-foot-copy">${esc(d.copyright)}</div></div></footer>`;
          }
        },
        { id: 'columns', name: '4カラム',
          schema: [
            { key: 'shopName', label: 'ショップ名', type: 'text', default: '〇〇ストア' },
            { key: 'shopDesc', label: 'ショップ説明', type: 'textarea', default: '日本の肌のために、丁寧に作ったスキンケアをお届けします。' },
            { key: 'linkCol1', label: 'リンク1（1行1つ: 名前|URL）', type: 'textarea', default:'商品一覧|/collections/all\n新着商品|/collections/new\nセール|/collections/sale' },
            { key: 'linkCol2', label: 'リンク2', type: 'textarea', default:'よくある質問|/pages/faq\nお問い合わせ|/pages/contact\n配送について|/pages/shipping' },
            { key: 'linkCol3', label: 'リンク3', type: 'textarea', default:'会社概要|/pages/about\n利用規約|/pages/terms\nプライバシー|/pages/privacy' },
            { key: 'company', label: '会社名', type: 'text', default: '株式会社〇〇' },
            { key: 'copyright', label: 'コピーライト', type: 'text', default: '© 2026 〇〇ストア' }
          ],
          render(d, ctx) {
            const col = (txt) => (txt||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [n,u]=l.split('|');return `<li><a href="${esc((u||'#').trim())}">${esc((n||'').trim())}</a></li>`;}).join('');
            return `<footer class="lp-footer lp-footer-cols" data-variant="columns"><div class="lp-container"><div class="lp-foot-cols"><div class="lp-foot-col-brand"><div class="lp-foot-shop">${esc(d.shopName)}</div><p class="lp-foot-desc">${nl2br(d.shopDesc)}</p></div><div class="lp-foot-col"><h4>ショッピング</h4><ul>${col(d.linkCol1)}</ul></div><div class="lp-foot-col"><h4>サポート</h4><ul>${col(d.linkCol2)}</ul></div><div class="lp-foot-col"><h4>会社情報</h4><ul>${col(d.linkCol3)}</ul></div></div><div class="lp-foot-copy">${esc(d.copyright)} · ${esc(d.company)}</div></div></footer>`;
          }
        },
        { id: 'minimal', name: 'ミニマル',
          schema: [
            { key: 'shopName', label: 'ショップ名', type: 'text', default: '〇〇ストア' },
            { key: 'links', label: 'リンク（1行1つ: 表示名|URL）', type: 'textarea', default:'特定商取引法に基づく表記|/pages/tokushoho\nプライバシー|/pages/privacy\n利用規約|/pages/terms' },
            { key: 'copyright', label: 'コピーライト', type: 'text', default: '© 2026 〇〇ストア' }
          ],
          render(d, ctx) {
            const links = (d.links||'').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name,url]=l.split('|'); return `<a href="${esc((url||'#').trim())}">${esc((name||'').trim())}</a>`; }).join('<span class="lp-foot-sep">・</span>');
            return `<footer class="lp-footer lp-footer-minimal" data-variant="minimal"><div class="lp-container lp-center"><div class="lp-foot-shop">${esc(d.shopName)}</div>${links?`<nav class="lp-foot-links">${links}</nav>`:''}<div class="lp-foot-copy">${esc(d.copyright)}</div></div></footer>`;
          }
        }
      ]
    }
  ];

  // マップ化
  const BY_TYPE = {};
  MODULES.forEach(m => { BY_TYPE[m.type] = m; });

  // モジュールインスタンス(mod) から適切なバリアント定義を取得
  // variantId が未設定・不正なら variants[0] を返す（旧データ互換）
  function getDefForModule(mod) {
    const m = BY_TYPE[mod.type];
    if (!m) return null;
    const vid = mod.data && mod.data.variantId;
    if (vid) {
      const v = m.variants.find(x => x.id === vid);
      if (v) return Object.assign({ name: m.name, icon: m.icon }, v);
    }
    const v0 = m.variants[0];
    return Object.assign({ name: m.name, icon: m.icon }, v0);
  }

  // type と variantId からバリアント定義を取得
  function getVariant(type, variantId) {
    const m = BY_TYPE[type];
    if (!m) return null;
    return m.variants.find(x => x.id === variantId) || m.variants[0];
  }

  LP.Modules = {
    all: MODULES,
    get(type) { return BY_TYPE[type] || null; },
    getDefForModule,
    getVariant,
    defaultData,
    ctxHelpers() { return { escape: esc, img, formatPrice, toKan, nl2br }; }
  };

  LP.buildCtx = function (theme) {
    const helpers = LP.Modules.ctxHelpers();
    return Object.assign({}, helpers, { theme });
  };
})();

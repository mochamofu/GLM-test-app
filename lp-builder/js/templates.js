/* =========================================================
   templates.js — 40 種のテンプレート（ジャンル × 配色）
   各テンプレ: { id, name, genre, desc, palette, font, structure }
   - palette/theme(): { primary, accent, bg, text, radius }
   - structure(): モジュール構成の配列 [{type}, ...]（モジュール選択時にサンプル構成を読込）
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP = window.LP || {};

  // パレット（primary / accent / bg / text）。radiusは個別に。
  // structure は モジュール type の配列。app.js が各 type の defaultData を当てる。
  // ※モジュールの本文は modules.js のデフォルトそのままだと汎用的なので、
  //   テンプレごとに一言ジャンル文言を渡せるよう、一部構造で「override」を付ける。

  // 汎用: ジャンル別のベース構成（必要に応じて上書き）
  function baseStructureCosme() {
    return ['notice','hero','lead','features','imageText','steps','reviews','compare','pricing','faq','cta','footer'];
  }
  function baseStructureFashion() {
    return ['notice','hero','gallery','imageText','features','reviews','pricing','faq','cta','footer'];
  }
  function baseStructureDigital() {
    return ['notice','hero','lead','features','steps','imageText','compare','reviews','pricing','faq','video','cta','footer'];
  }

  // 共通: hero / lead 等の一部文言をジャンルらしく置換するヘルパ
  // （app.js でモジュール生成時に template.cosmetics を参照して上書き）
  // ここでは「tone」でジャンル別サンプル文言セットを返す。
  const COSME_COPY = {
    eyebrow:'期間限定・先行予約', hero:'毎日のスキンケアが、<br>明日の自信にかわる。',
    leadT:'こんなお悩み、ありませんか？', leadB:'朝晩の忙しい時間。鏡を見るたび、肌のハリやくすみが気になっていませんか。\nいつものスキンケアでは物足りない、そんな方に。',
    featT:'選ばれる3つの理由'
  };
  const FASHION_COPY = {
    eyebrow:'NEW ARRIVAL', hero:'あなたらしさは、<br>着るもので始まる。',
    leadT:'毎日のコーディネート、もっと自由に', leadB:'「あれもこれも似合わない」と決めつけていませんか？\n似合わせのひと品で、クローゼットが生まれ変わります。'
  };
  const DIGITAL_COPY = {
    eyebrow:'START FREE', hero:'仕事を、もっと早く。<br>もっと楽しく。',
    leadT:'「時間が足りない」を終わらせます', leadB:'毎日の繰り返し作業。手作業のミス。情報の行き違い。\nもっと本質的な仕事に、時間を割いていませんか？'
  };

  function build(id, name, genre, desc, palette, font, structure) {
    return {
      id, name, genre, desc,
      font: font || "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      _palette: palette,
      _structure: structure,
      theme() {
        return { primary: palette[0], accent: palette[1], bg: palette[2], text: palette[3], radius: palette[4] || 12 };
      },
      structure() { return structure; },
      copy() {
        if (genre === 'cosme') return COSME_COPY;
        if (genre === 'fashion') return FASHION_COPY;
        return DIGITAL_COPY;
      }
    };
  }

  // ===================== コスメ・美容（14種） =====================
  const COSME = [
    build('cosme-clear-pink','透明感ピンク','cosme','爽やかなピンク×白の王道美容LP',
      ['#e87a8b','#f6c453','#fff7f8','#2d2a26',14], null, baseStructureCosme()),
    build('cosme-luxe-gold','ラグジュアリーゴールド','cosme','黒×ゴールドの高級美容液向け',
      ['#1c1a18','#c9a24b','#faf7f1','#1c1a18',6], "'Noto Serif JP','Hiragino Mincho ProN',serif", ['notice','hero','gallery','features','compare','reviews','pricing','faq','cta','footer']),
    build('cosme-natural-green','ナチュラルグリーン','cosme','オーガニック・無添加の自然派',
      ['#6b8e5a','#d4a373','#f5f3ec','#3a3a30',18], null, baseStructureCosme()),
    build('cosme-mono-luxe','モノトーン高級感','cosme','白黒で近代的な美容医療感',
      ['#111111','#a0a0a0','#ffffff','#111111',2], null, baseStructureCosme()),
    build('cosme-rose-bloom','ローズブロッサム','cosme','深みのあるローズ系女性向け',
      ['#b23a6b','#e8b4c8','#fdf2f6','#3d2030',16], null, baseStructureCosme()),
    build('cosme-coral-fresh','コーラルフレッシュ','cosme','若層向け明るいコーラル',
      ['#ff7e67','#ffd166','#fff5f0','#3a2a26',20], null, baseStructureCosme()),
    build('cosme-lavender-cool','ラベンダークール','cosme','紫系の洗練された大人女性向け',
      ['#7c6bad','#c8b6e2','#f7f5fb','#2e2940',10], null, baseStructureCosme()),
    build('cosme-mint-pure','ミントピュア','cosme','清涼感のあるミント系スキンケア',
      ['#4fb3a9','#e8f5f3','#f2faf9','#1f3a37',16], null, baseStructureCosme()),
    build('cosme-berry-deep','ベリー深彩','cosme','ベリー系の濃厚・夜の美容LP',
      ['#6a2b45','#d98ca5','#fdf4f8','#2a1620',8], "'Noto Serif JP','Hiragino Mincho ProN',serif", baseStructureCosme()),
    build('cosme-cream-beige','クリームベージュ','cosme','ベージュ系のやさしい基礎化粧品',
      ['#c9a27e','#9c8467','#f6f1ea','#3d3328',22], null, baseStructureCosme()),
    build('cosme-white-pure','ピュアホワイト','cosme','徹底的に白で清潔感',
      ['#5a8dee','#bcd4ff','#ffffff','#1a2b40',12], null, baseStructureCosme()),
    build('cosme-terracotta','テラコッタ大地','cosme','陶器のような温かみある土色',
      ['#b56a4f','#e0a378','#f7eee6','#3a261d',14], null, baseStructureCosme()),
    build('cosme-sakura-pastel','桜パステル','cosme','春向け・淡い桜色',
      ['#f4a8b8','#ffe0e8','#fff8fa','#4a2e36',24], null, baseStructureCosme()),
    build('cosme-noir-emerald','ノワールエメラルド','cosme','黒×エメラルドのクーポン系',
      ['#0f2a26','#1ec8a5','#0a1f1c','#e8f5f0',4], "'Noto Serif JP','Hiragino Mincho ProN',serif", ['notice','hero','features','reviews','pricing','faq','cta','footer'])
  ];

  // ===================== ファッション・雑貨（13種） =====================
  const FASHION = [
    build('fashion-minimal-beige','ミニマルベージュ','fashion','ベージュ系セレブ系アパレル',
      ['#9c8467','#c9a27e','#f6f1ea','#3d3328',10], "'Yu Gothic','YuGothic','Noto Sans JP',sans-serif", baseStructureFashion()),
    build('fashion-trend-yellow','トレンドイエロー','fashion','ポップなイエロー若層向け',
      ['#f2c14e','#222222','#fff8e6','#222222',24], null, baseStructureFashion()),
    build('fashion-nuance-tone','ニュアンスカラー','fashion','くすみカラー大人女性向け',
      ['#9e8aa5','#c8b6a0','#efe9e0','#3a323a',16], null, baseStructureFashion()),
    build('fashion-classic-navy','クラシックネイビー','fashion','ネイビー×白の紳士・ベーシック',
      ['#1f3a5f','#c0392b','#f4f6fa','#1a2540',6], "'Noto Serif JP','Hiragino Mincho ProN',serif", baseStructureFashion()),
    build('fashion-burgundy-elegant','バーガンディエレガント','fashion','深赤の上品フォーマル系',
      ['#7a1f2e','#caa472','#f8f0ee','#2e1014',8], "'Noto Serif JP','Hiragino Mincho ProN',serif", baseStructureFashion()),
    build('fashion-olive-casual','オリーブカジュアル','fashion','アウトドア寄りオリーブ系',
      ['#5a6240','#a89b6c','#f0ede2','#2c2e1e',14], null, baseStructureFashion()),
    build('fashion-mono-mode','モノトーン モード','fashion','ストリート系モノクロ',
      ['#111111','#e0e0e0','#ffffff','#111111',0], null, baseStructureFashion()),
    build('fashion-powder-pink','パウダーピンク','fashion','淡ピンクの甘めガーリー',
      ['#e8a0b8','#fde2ea','#fff6f9','#4a2e36',26], null, baseStructureFashion()),
    build('fashion-denim-blue','デニムブルー','fashion','カジュアルデニム系',
      ['#2f4a6b','#d9843a','#eef2f6','#1a2540',12], null, baseStructureFashion()),
    build('fashion-terracotta-warm','テラコッタウォーム','fashion','温かみ雑貨・レザー系',
      ['#b56a4f','#d4a373','#f7eee6','#3a261d',14], null, baseStructureFashion()),
    build('fashion-sage-calm','セージカルム','fashion','落ち着いたセージグリーン',
      ['#8a9a7b','#c2b89e','#f0f1ea','#2e3326',18], null, baseStructureFashion()),
    build('fashion-ivory-clean','アイボリークリーン','fashion','白基調清潔感ランジェリー系',
      ['#b8a070','#e8dec8','#fffdf8','#3a3326',20], null, baseStructureFashion()),
    build('fashion-graphite-street','グラファイトストリート','fashion','ダーク系ストリート',
      ['#2a2d33','#d9b44a','#1a1c20','#e8e9eb',2], null, ['notice','hero','gallery','features','pricing','faq','cta','footer'])
  ];

  // ===================== デジタル・サービス（13種） =====================
  const DIGITAL = [
    build('digital-tech-blue','テックブルー','digital','SaaS王道の信頼感ブルー',
      ['#2563eb','#06b6d4','#f5f8ff','#0f1e3d',8], null, baseStructureDigital()),
    build('digital-trust-navy','信頼感ネイビー','digital','金融・法人向けネイビー',
      ['#0f2a4a','#3b82f6','#f1f5fb','#0a1830',6], null, baseStructureDigital()),
    build('digital-pop-orange','ポップオレンジ','digital','親しみやすいオレンジ系ツール',
      ['#f97316','#fbbf24','#fff7ed','#2a1a0e',20], null, baseStructureDigital()),
    build('digital-green-growth','グリーングロース','digital','成長・健康系グリーン',
      ['#16a34a','#84cc16','#f0fdf4','#0a2a14',12], null, baseStructureDigital()),
    build('digital-purple-creative','パープルクリエイティブ','digital','クリエイター向け紫',
      ['#7c3aed','#a78bfa','#f7f5ff','#1f1340',14], null, baseStructureDigital()),
    build('digital-dark-mode','ダークモード','digital','黒基調の開発者向け',
      ['#0a0a0a','#22d3ee','#0f0f0f','#e5e7eb',8], null, ['notice','hero','features','video','reviews','pricing','faq','cta','footer']),
    build('digital-mono-minimal','モノミニマル','digital','徹底的にミニマル白黒',
      ['#111111','#999999','#ffffff','#111111',4], null, baseStructureDigital()),
    build('digital-mint-fresh','ミントフレッシュ','digital','爽やか教育・学習系',
      ['#10b981','#34d399','#ecfdf5','#062a20',16], null, baseStructureDigital()),
    build('digital-coral-warm','コーラルウォーム','digital','アットホームなコミュニティ系',
      ['#f43f5e','#fb7185','#fff1f3','#2a0e14',18], null, baseStructureDigital()),
    build('digital-indigo-pro','インディゴプロ','digital','プロフェッショナル向け深藍',
      ['#312e81','#818cf8','#f3f4fc','#10103a',6], "'Noto Serif JP','Hiragino Mincho ProN',serif", baseStructureDigital()),
    build('digital-sunshine-edu','サンシャイン教育','digital','子ども教材向け明るい黄色',
      ['#f59e0b','#ef4444','#fffbeb','#3a2400',24], null, baseStructureDigital()),
    build('digital-rose-launch','ローズローンチ','digital','女性向けサービスのローズ',
      ['#e11d48','#fda4af','#fff0f3','#2a0612',16], null, baseStructureDigital()),
    build('digital-slate-corporate','スレート法人','digital','B2B法人向けグレー基調',
      ['#334155','#0ea5e9','#f1f5f9','#0f172a',6], null, baseStructureDigital())
  ];

  const ALL = COSME.concat(FASHION, DIGITAL); // 14 + 13 + 13 = 40
  const BY_ID = {};
  ALL.forEach(t => { BY_ID[t.id] = t; });

  LP.Templates = {
    all: ALL,
    get(id) { return BY_ID[id] || null; },
    byGenre(genre) { return ALL.filter(t => t.genre === genre); }
  };
})();

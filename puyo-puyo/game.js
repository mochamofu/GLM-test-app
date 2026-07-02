// ===== ぷよぷよ（宝石版） ゲーム本体 =====
// 機能: 一時停止 / 音 / おじゃまぷよ / CPU対戦 / ブリリアントカット宝石描画

// --- 定数 ---
const COLS = 6;
const ROWS = 12;
const CELL = 44;

// 色: 1-4 が宝石、5 がおじゃま
// 1=ルビー(赤) 2=エメラルド(緑) 3=サファイア(青) 4=シトリン(黄) 5=おじゃま
const GEM_STYLE = {
  1: { name: "Ruby",     main: "#e0276b", light: "#ff8fb3", deep: "#7a0033", sparkle: "#ffffff" },
  2: { name: "Emerald",  main: "#16c79a", light: "#7ff0cf", deep: "#0a5a44", sparkle: "#ffffff" },
  3: { name: "Sapphire", main: "#3a7bff", light: "#9bbeff", deep: "#0a2f8f", sparkle: "#ffffff" },
  4: { name: "Citrine",  main: "#ffc933", light: "#ffe599", deep: "#8a6a00", sparkle: "#ffffff" },
  5: { name: "Ojama",    main: "#5a5f6b", light: "#8b91a0", deep: "#2a2d36", sparkle: "#aaaaaa" },
};

// ===================== 音（Web Audio API） =====================
class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
  tone(freq, dur, type = "sine", vol = 0.15) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  rotate()   { this.tone(520, 0.08, "triangle", 0.10); }
  move()     { this.tone(330, 0.05, "square", 0.06); }
  drop()     { this.tone(180, 0.10, "sawtooth", 0.10); }
  land()     { this.tone(140, 0.12, "sine", 0.12); }
  chain(n)   {
    const base = 440 * Math.pow(1.12, n - 1);
    this.tone(base, 0.18, "triangle", 0.14);
    setTimeout(() => this.tone(base * 1.5, 0.18, "sine", 0.10), 60);
  }
  ojama()    { this.tone(90, 0.25, "sawtooth", 0.12); }
  gameOver() {
    [440, 330, 220, 110].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.15), i * 180));
  }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, "triangle", 0.14), i * 120));
  }
  toggle() { this.muted = !this.muted; return this.muted; }
}

// ===================== 宝石描画 =====================
function drawGem(c2d, cx, cy, radius, colorNum, opts = {}) {
  const s = GEM_STYLE[colorNum];
  const t = (opts.t || 0) * 0.001;

  if (colorNum === 5) {
    // おじゃま: 石炭のような濁ったグレーの塊
    c2d.save();
    const g = c2d.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
    g.addColorStop(0, s.light);
    g.addColorStop(0.6, s.main);
    g.addColorStop(1, s.deep);
    c2d.fillStyle = g;
    c2d.beginPath();
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rr = radius * (0.85 + Math.sin(i * 2.3) * 0.12);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (i === 0) c2d.moveTo(px, py); else c2d.lineTo(px, py);
    }
    c2d.closePath();
    c2d.fill();
    c2d.fillStyle = "rgba(255,255,255,0.18)";
    c2d.beginPath();
    c2d.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    c2d.fill();
    c2d.strokeStyle = s.deep;
    c2d.lineWidth = 1;
    c2d.beginPath();
    c2d.moveTo(cx - radius * 0.4, cy - radius * 0.2);
    c2d.lineTo(cx + radius * 0.1, cy + radius * 0.1);
    c2d.lineTo(cx + radius * 0.4, cy + radius * 0.4);
    c2d.stroke();
    c2d.restore();
    return;
  }

  // --- ブリリアントカット（丸型）宝石 ---
  c2d.save();
  // 外側ベゼル
  const bezel = c2d.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
  bezel.addColorStop(0, s.main);
  bezel.addColorStop(1, s.deep);
  c2d.fillStyle = bezel;
  c2d.beginPath();
  c2d.arc(cx, cy, radius, 0, Math.PI * 2);
  c2d.fill();

  // クラウン（外側ファセット）
  const tableR = radius * 0.55;
  const facets = 8;
  for (let i = 0; i < facets; i++) {
    const a0 = (i / facets) * Math.PI * 2;
    const a1 = ((i + 1) / facets) * Math.PI * 2;
    const mx = cx + Math.cos((a0 + a1) / 2) * tableR;
    const my = cy + Math.sin((a0 + a1) / 2) * tableR;
    const grad = c2d.createLinearGradient(cx, cy, mx, my);
    if (i % 2 === 0) {
      grad.addColorStop(0, s.light);
      grad.addColorStop(1, s.main);
    } else {
      grad.addColorStop(0, s.main);
      grad.addColorStop(1, s.deep);
    }
    c2d.fillStyle = grad;
    c2d.beginPath();
    c2d.moveTo(cx, cy);
    c2d.lineTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius);
    c2d.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
    c2d.closePath();
    c2d.fill();
  }

  // テーブル面（中央の明るい円）
  const tg = c2d.createRadialGradient(cx - radius * 0.15, cy - radius * 0.15, radius * 0.05, cx, cy, tableR);
  tg.addColorStop(0, s.light);
  tg.addColorStop(0.7, s.main);
  tg.addColorStop(1, s.deep);
  c2d.fillStyle = tg;
  c2d.beginPath();
  c2d.arc(cx, cy, tableR, 0, Math.PI * 2);
  c2d.fill();

  // テーブル面内のファセットライン
  c2d.strokeStyle = "rgba(255,255,255,0.25)";
  c2d.lineWidth = 0.8;
  for (let i = 0; i < facets; i++) {
    const a = (i / facets) * Math.PI * 2;
    c2d.beginPath();
    c2d.moveTo(cx, cy);
    c2d.lineTo(cx + Math.cos(a) * tableR, cy + Math.sin(a) * tableR);
    c2d.stroke();
  }

  // アウトライン
  c2d.strokeStyle = s.deep;
  c2d.lineWidth = 1;
  c2d.beginPath();
  c2d.arc(cx, cy, radius, 0, Math.PI * 2);
  c2d.stroke();

  // キラキラ（時間で動く星型ハイライト）
  const sparkAngle = t * 1.5 + (cx + cy) * 0.01;
  const sparkX = cx + Math.cos(sparkAngle) * radius * 0.25;
  const sparkY = cy + Math.sin(sparkAngle) * radius * 0.25 - radius * 0.1;
  drawSparkle(c2d, sparkX, sparkY, radius * 0.22, s.sparkle, 0.85);

  // 固定ハイライト
  c2d.fillStyle = "rgba(255,255,255,0.5)";
  c2d.beginPath();
  c2d.ellipse(cx - radius * 0.3, cy - radius * 0.3, radius * 0.15, radius * 0.1, -0.6, 0, Math.PI * 2);
  c2d.fill();

  c2d.restore();
}

function drawSparkle(c2d, x, y, size, color, alpha) {
  c2d.save();
  c2d.globalAlpha = alpha;
  c2d.fillStyle = color;
  c2d.beginPath();
  c2d.moveTo(x, y - size);
  c2d.lineTo(x + size * 0.18, y - size * 0.18);
  c2d.lineTo(x + size, y);
  c2d.lineTo(x + size * 0.18, y + size * 0.18);
  c2d.lineTo(x, y + size);
  c2d.lineTo(x - size * 0.18, y + size * 0.18);
  c2d.lineTo(x - size, y);
  c2d.lineTo(x - size * 0.18, y - size * 0.18);
  c2d.closePath();
  c2d.fill();
  c2d.restore();
}

// ===================== ぷよゲームエンジン =====================
class PuyoGame {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.nextCanvas = opts.nextCanvas;
    this.scoreEl = opts.scoreEl;
    this.attackFillEl = opts.attackFillEl;
    this.attackCountEl = opts.attackCountEl;
    this.sound = opts.sound;
    this.onAttack = opts.onAttack || (() => {});
    this.onGameOver = opts.onGameOver || (() => {});
    this.onChain = opts.onChain || (() => {});
    this.isPlayer = !!opts.isPlayer;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.score = 0;
    this.pendingAttack = 0;
    this.current = null;
    this.nextPair = this.makePair();
    this.isLocked = false;
    this.gameOver = false;
    this.dropInterval = this.isPlayer ? 800 : 1100;
    this.lastDropTime = 0;
    this.spawnPair();
  }

  makePair() {
    return {
      a: 1 + Math.floor(Math.random() * 4),
      b: 1 + Math.floor(Math.random() * 4),
    };
  }

  spawnPair() {
    const colors = this.nextPair;
    this.nextPair = this.makePair();
    const col = 2;
    this.current = {
      pivot: { col, row: 0 },
      sub: { col, row: -1 },
      pivotColor: colors.a,
      subColor: colors.b,
    };
    if (!this.canPlace(this.current)) {
      this.endGame();
    }
  }

  pairCells(pair) {
    return [
      { col: pair.pivot.col, row: pair.pivot.row, color: pair.pivotColor },
      { col: pair.sub.col, row: pair.sub.row, color: pair.subColor },
    ];
  }

  canPlace(pair) {
    const cells = this.pairCells(pair);
    for (const c of cells) {
      if (c.col < 0 || c.col >= COLS) return false;
      if (c.row >= ROWS) return false;
      if (c.row >= 0 && this.grid[c.row][c.col] !== 0) return false;
    }
    return true;
  }

  move(dx, dy) {
    if (!this.current || this.isLocked || this.gameOver) return false;
    const moved = {
      ...this.current,
      pivot: { col: this.current.pivot.col + dx, row: this.current.pivot.row + dy },
      sub: { col: this.current.sub.col + dx, row: this.current.sub.row + dy },
    };
    if (this.canPlace(moved)) {
      this.current = moved;
      if (this.sound && dx !== 0) this.sound.move();
      return true;
    }
    return false;
  }

  rotate() {
    if (!this.current || this.isLocked || this.gameOver) return;
    const dc = this.current.sub.col - this.current.pivot.col;
    const dr = this.current.sub.row - this.current.pivot.row;
    const ndc = -dr;
    const ndr = dc;
    const rotated = {
      ...this.current,
      sub: { col: this.current.pivot.col + ndc, row: this.current.pivot.row + ndr },
    };
    if (this.canPlace(rotated)) {
      this.current = rotated;
      if (this.sound) this.sound.rotate();
      return;
    }
    const kicks = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [kx, ky] of kicks) {
      const kicked = {
        ...rotated,
        pivot: { col: rotated.pivot.col + kx, row: rotated.pivot.row + ky },
        sub: { col: rotated.sub.col + kx, row: rotated.sub.row + ky },
      };
      if (this.canPlace(kicked)) {
        this.current = kicked;
        if (this.sound) this.sound.rotate();
        return;
      }
    }
  }

  softDrop() {
    if (!this.current || this.isLocked || this.gameOver) return;
    if (!this.move(0, 1)) this.lockPair();
    else if (this.sound) this.sound.drop();
  }

  hardDrop() {
    if (!this.current || this.isLocked || this.gameOver) return;
    let dropped = false;
    while (this.move(0, 1)) { dropped = true; }
    if (dropped && this.sound) this.sound.drop();
    this.lockPair();
  }

  lockPair() {
    this.isLocked = true;
    const cells = this.pairCells(this.current);
    for (const c of cells) {
      if (c.row >= 0 && c.row < ROWS && c.col >= 0 && c.col < COLS) {
        this.grid[c.row][c.col] = c.color;
      }
    }
    this.current = null;
    if (this.sound) this.sound.land();
    setTimeout(() => this.resolveChains(), 120);
  }

  async resolveChains() {
    let chain = 0;
    while (true) {
      const { removeSet, ojamaRemoveSet } = this.findGroups();
      if (removeSet.size === 0) break;
      chain++;
      const all = new Set([...removeSet, ...ojamaRemoveSet]);
      this.score += chainBonus(chain) * all.size * 10;
      this.pendingAttack += Math.floor(all.size * chainBonus(chain) * 0.4);
      for (const key of all) {
        const [r, c] = key.split(",").map(Number);
        this.grid[r][c] = 0;
      }
      if (this.sound) this.sound.chain(chain);
      this.onChain(chain);
      this.updateHud();
      this.draw();
      await sleep(220);
      this.applyGravity();
      this.draw();
      await sleep(180);
    }
    if (this.pendingAttack > 0) {
      this.onAttack(this.pendingAttack);
      this.pendingAttack = 0;
      this.updateHud();
    }
    this.isLocked = false;
    if (!this.gameOver) this.spawnPair();
  }

  receiveOjama(amount) {
    if (this.gameOver) return false;
    let toPlace = amount;
    while (toPlace > 0) {
      let placed = false;
      for (let r = 0; r < ROWS && !placed; r++) {
        for (let dc = 0; dc < COLS && !placed; dc++) {
          const col = (dc % 2 === 0) ? dc / 2 : COLS - 1 - Math.floor(dc / 2);
          if (this.grid[r][col] === 0) {
            this.grid[r][col] = 5;
            toPlace--;
            placed = true;
          }
        }
      }
      if (!placed) {
        this.endGame();
        return false;
      }
    }
    if (this.sound) this.sound.ojama();
    this.applyGravity();
    return true;
  }

  findGroups() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const removeSet = new Set();
    const ojamaRemoveSet = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = this.grid[r][c];
        if (v === 0 || v === 5 || visited[r][c]) continue;
        const group = [];
        const adjacentOjama = [];
        const stack = [[r, c]];
        while (stack.length) {
          const [cr, cc] = stack.pop();
          if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
          if (visited[cr][cc]) continue;
          const cv = this.grid[cr][cc];
          if (cv === 0) continue;
          if (cv === 5) {
            adjacentOjama.push([cr, cc]);
            continue;
          }
          if (cv !== v) continue;
          visited[cr][cc] = true;
          group.push([cr, cc]);
          stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);
        }
        if (group.length >= 4) {
          for (const [gr, gc] of group) removeSet.add(`${gr},${gc}`);
          for (const [or_, oc] of adjacentOjama) ojamaRemoveSet.add(`${or_},${oc}`);
        }
      }
    }
    return { removeSet, ojamaRemoveSet };
  }

  applyGravity() {
    for (let c = 0; c < COLS; c++) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] !== 0) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[r][c] = 0;
          }
          writeRow--;
        }
      }
    }
  }

  updateHud() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.attackCountEl) this.attackCountEl.textContent = this.pendingAttack;
    if (this.attackFillEl) {
      const pct = Math.min(100, (this.pendingAttack / 30) * 100);
      this.attackFillEl.style.width = pct + "%";
    }
  }

  endGame() {
    this.gameOver = true;
    this.isLocked = true;
    if (this.sound) this.sound.gameOver();
    this.onGameOver();
  }

  update(time) {
    if (this.gameOver || this.isLocked) {
      this.lastDropTime = time;
      return;
    }
    if (!this.current) return;
    if (!this.lastDropTime) this.lastDropTime = time;
    if (time - this.lastDropTime > this.dropInterval) {
      if (!this.move(0, 1)) this.lockPair();
      this.lastDropTime = time;
    }
  }

  draw(t = 0) {
    const ctx = this.canvas.getContext("2d");
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
    }
    const R = CELL / 2 - 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== 0) {
          drawGem(ctx, c * CELL + CELL / 2, r * CELL + CELL / 2, R, this.grid[r][c], { t });
        }
      }
    }
    if (this.current) {
      for (const cell of this.pairCells(this.current)) {
        if (cell.row >= 0) {
          drawGem(ctx, cell.col * CELL + CELL / 2, cell.row * CELL + CELL / 2, R, cell.color, { t });
        }
      }
    }
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#e94560";
      ctx.font = "bold 22px 'Segoe UI',sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
    }
    this.drawNext(t);
    this.updateHud();
  }

  drawNext(t = 0) {
    if (!this.nextCanvas) return;
    const nctx = this.nextCanvas.getContext("2d");
    nctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    nctx.fillStyle = "#0d1b2a";
    nctx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const r = 16;
    drawGem(nctx, this.nextCanvas.width / 2, r + 6, r, this.nextPair.a, { t });
    drawGem(nctx, this.nextCanvas.width / 2, r * 3 + 8, r, this.nextPair.b, { t });
  }
}

function chainBonus(chain) { return Math.pow(2, chain - 1); }
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

// ===================== CPU AI =====================
class PuyoCPU extends PuyoGame {
  constructor(opts) {
    super({ ...opts, isPlayer: false });
    this.plan = null;
    this.thinkDelay = 350;
    this.lastThink = 0;
  }

  think() {
    if (!this.current) return null;
    const colorA = this.current.pivotColor;
    const colorB = this.current.subColor;
    let best = null;
    let bestScore = -Infinity;
    for (let col = 0; col < COLS; col++) {
      for (let dir = 0; dir < 4; dir++) {
        const sim = this.simulatePlacement(col, dir, colorA, colorB);
        if (!sim) continue;
        const ev = this.evaluate(sim.grid, colorA, colorB);
        if (ev > bestScore) {
          bestScore = ev;
          best = { col, dir };
        }
      }
    }
    return best;
  }

  simulatePlacement(targetCol, dir, colorA, colorB) {
    const offs = [[0,-1],[1,0],[0,1],[-1,0]];
    const [adc] = offs[dir];
    const adr = offs[dir][1];
    const grid = this.grid.map((row) => row.slice());
    const pivotCol = targetCol;
    const subCol = targetCol + adc;
    if (subCol < 0 || subCol >= COLS) return null;
    const dropInCol = (g, col) => {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (g[r][col] === 0) return r;
      }
      return -1;
    };
    const g = grid;
    if (adc === 0) {
      const lowCol = pivotCol;
      let pivotRow, subRow;
      if (adr < 0) {
        pivotRow = dropInCol(g, lowCol);
        if (pivotRow < 0) return null;
        g[pivotRow][lowCol] = colorA;
        subRow = dropInCol(g, lowCol);
        if (subRow < 0) { g[pivotRow][lowCol] = 0; return null; }
        g[subRow][lowCol] = colorB;
      } else {
        subRow = dropInCol(g, lowCol);
        if (subRow < 0) return null;
        g[subRow][lowCol] = colorB;
        pivotRow = dropInCol(g, lowCol);
        if (pivotRow < 0) { g[subRow][lowCol] = 0; return null; }
        g[pivotRow][lowCol] = colorA;
      }
    } else {
      const pivotRow = dropInCol(g, pivotCol);
      const subRow = dropInCol(g, subCol);
      if (pivotRow < 0 || subRow < 0) return null;
      const lowRow = Math.max(pivotRow, subRow);
      let targetRow = lowRow;
      while (targetRow >= 0 && (g[targetRow][pivotCol] !== 0 || g[targetRow][subCol] !== 0)) {
        targetRow--;
      }
      if (targetRow < 0) return null;
      g[targetRow][pivotCol] = colorA;
      g[targetRow][subCol] = colorB;
    }
    return { grid: g };
  }

  evaluate(grid, colorA, colorB) {
    let score = 0;
    let maxH = 0;
    for (let c = 0; c < COLS; c++) {
      let h = 0;
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c] !== 0) { h = ROWS - r; break; }
      }
      if (h > maxH) maxH = h;
    }
    score -= maxH * 3;
    const colors = new Set([colorA, colorB]);
    let adjacency = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        if (!colors.has(v)) continue;
        if (c + 1 < COLS && grid[r][c + 1] === v) adjacency++;
        if (r + 1 < ROWS && grid[r + 1][c] === v) adjacency++;
      }
    }
    score += adjacency * 8;
    return score;
  }

  update(time) {
    if (this.gameOver || this.isLocked) {
      this.lastDropTime = time;
      return;
    }
    if (!this.current) return;
    if (!this.plan) {
      if (!this.lastThink) this.lastThink = time;
      if (time - this.lastThink > this.thinkDelay) {
        this.plan = this.think();
        this.lastThink = 0;
      } else {
        return;
      }
    }
    if (!this.plan) return;
    const targetCol = this.plan.col;
    const curCol = this.current.pivot.col;
    if (curCol < targetCol) this.move(1, 0);
    else if (curCol > targetCol) this.move(-1, 0);
    else {
      if (!this.move(0, 1)) this.lockPair();
      this.plan = null;
    }
  }
}

// ===================== アプリ本体 =====================
const sound = new Sound();
let app = null;

class App {
  constructor() {
    this.mode = null;
    this.playerGame = null;
    this.cpuGame = null;
    this.paused = false;
    this.rafId = null;
    this.menu = document.getElementById("menu");
    this.gameScreen = document.getElementById("game-screen");
    this.stage = document.getElementById("stage");
    this.messageEl = document.getElementById("message");
    this.btnPause = document.getElementById("btn-pause");
    this.btnMute = document.getElementById("btn-mute");
    this.btnQuit = document.getElementById("btn-quit");
    this.bindMenu();
  }

  bindMenu() {
    document.getElementById("btn-solo").addEventListener("click", () => this.start("solo"));
    document.getElementById("btn-vs").addEventListener("click", () => this.start("vs"));
    this.btnPause.addEventListener("click", () => this.togglePause());
    this.btnMute.addEventListener("click", () => this.toggleMute());
    this.btnQuit.addEventListener("click", () => this.quit());
  }

  start(mode) {
    this.mode = mode;
    this.menu.classList.add("hidden");
    this.gameScreen.classList.remove("hidden");
    this.messageEl.textContent = "";
    this.messageEl.className = "";
    if (mode === "solo") {
      this.buildSoloStage();
    } else {
      this.buildVsStage();
    }
    sound.ensure();
    this.paused = false;
    this.loop();
  }

  buildSoloStage() {
    this.stage.innerHTML = "";
    const panel = this.makePlayerPanel("you", "あなた");
    this.stage.appendChild(panel.root);
    const opts = {
      canvas: panel.canvas,
      nextCanvas: panel.nextCanvas,
      scoreEl: panel.scoreEl,
      attackFillEl: null,
      attackCountEl: null,
      sound,
      isPlayer: true,
      onChain: (chain) => {
        if (chain >= 2) this.flashMessage(`${chain}連鎖!`);
      },
      onGameOver: () => this.flashMessage("GAME OVER", "lose"),
    };
    this.playerGame = new PuyoGame(opts);
  }

  buildVsStage() {
    this.stage.innerHTML = "";
    const youPanel = this.makePlayerPanel("you", "あなた");
    const cpuPanel = this.makePlayerPanel("cpu", "CPU");
    this.stage.appendChild(youPanel.root);
    this.stage.appendChild(cpuPanel.root);

    const youOpts = {
      canvas: youPanel.canvas,
      nextCanvas: youPanel.nextCanvas,
      scoreEl: youPanel.scoreEl,
      attackFillEl: youPanel.attackFill,
      attackCountEl: youPanel.attackCount,
      sound,
      isPlayer: true,
      onAttack: (amt) => {
        if (this.cpuGame && !this.cpuGame.gameOver) this.cpuGame.receiveOjama(amt);
      },
      onChain: (chain) => { if (chain >= 2) this.flashMessage(`${chain}連鎖!`); },
      onGameOver: () => this.endMatch("lose"),
    };
    const cpuOpts = {
      canvas: cpuPanel.canvas,
      nextCanvas: cpuPanel.nextCanvas,
      scoreEl: cpuPanel.scoreEl,
      attackFillEl: cpuPanel.attackFill,
      attackCountEl: cpuPanel.attackCount,
      sound,
      isPlayer: false,
      onAttack: (amt) => {
        if (this.playerGame && !this.playerGame.gameOver) this.playerGame.receiveOjama(amt);
      },
      onChain: () => {},
      onGameOver: () => this.endMatch("win"),
    };
    this.playerGame = new PuyoGame(youOpts);
    this.cpuGame = new PuyoCPU(cpuOpts);
  }

  makePlayerPanel(kind, name) {
    const root = document.createElement("div");
    root.className = "player-panel";
    const nameEl = document.createElement("div");
    nameEl.className = `player-name ${kind}`;
    nameEl.textContent = name;
    const boardWrap = document.createElement("div");
    boardWrap.className = "player-board";
    const side = document.createElement("div");
    side.className = "side-panel";
    side.innerHTML = `
      <div class="next-box"><div class="label">NEXT</div><canvas class="next-canvas" width="80" height="60"></canvas></div>
      <div class="score-box"><div class="label">SCORE</div><div class="score">0</div></div>
    `;
    if (this.mode === "vs") {
      const atk = document.createElement("div");
      atk.className = "attack-bar";
      atk.innerHTML = `
        <div class="label">攻撃</div>
        <div class="attack-count">0</div>
        <div class="attack-meter"><div class="attack-meter-fill"></div></div>
      `;
      side.appendChild(atk);
    }
    const canvas = document.createElement("canvas");
    canvas.className = "board-canvas";
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    boardWrap.appendChild(side);
    boardWrap.appendChild(canvas);
    root.appendChild(nameEl);
    root.appendChild(boardWrap);
    return {
      root,
      canvas,
      nextCanvas: side.querySelector(".next-canvas"),
      scoreEl: side.querySelector(".score"),
      attackFill: side.querySelector(".attack-meter-fill"),
      attackCount: side.querySelector(".attack-count"),
    };
  }

  flashMessage(text, cls = "") {
    this.messageEl.textContent = text;
    this.messageEl.className = cls;
    if (cls === "") {
      setTimeout(() => { if (this.messageEl.textContent === text) this.messageEl.textContent = ""; }, 1200);
    }
  }

  endMatch(result) {
    if (result === "win") {
      this.flashMessage("WIN!", "win");
      sound.win();
    } else {
      this.flashMessage("LOSE...", "lose");
      sound.gameOver();
    }
    this.paused = true;
  }

  togglePause() {
    if (!this.playerGame) return;
    if (this.playerGame.gameOver) return;
    if (this.mode === "vs" && this.cpuGame && this.cpuGame.gameOver) return;
    if (this.messageEl.textContent === "WIN!" || this.messageEl.textContent === "LOSE...") return;
    this.paused = !this.paused;
    this.btnPause.textContent = this.paused ? "▶ 再開" : "⏸ 一時停止";
    if (this.paused) {
      this.showPauseOverlay();
    } else {
      this.hidePauseOverlay();
    }
  }

  showPauseOverlay() {
    const ov = document.createElement("div");
    ov.className = "pause-overlay";
    ov.id = "pause-overlay";
    ov.textContent = "PAUSE";
    this.stage.style.position = "relative";
    this.stage.appendChild(ov);
  }

  hidePauseOverlay() {
    const ov = document.getElementById("pause-overlay");
    if (ov) ov.remove();
  }

  toggleMute() {
    const muted = sound.toggle();
    this.btnMute.textContent = muted ? "🔇 音なし" : "🔊 音あり";
  }

  quit() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.paused = false;
    this.playerGame = null;
    this.cpuGame = null;
    this.stage.innerHTML = "";
    this.gameScreen.classList.add("hidden");
    this.menu.classList.remove("hidden");
    this.messageEl.textContent = "";
    this.btnPause.textContent = "⏸ 一時停止";
  }

  loop(t = 0) {
    if (!this.playerGame) return;
    if (!this.paused) {
      this.playerGame.update(t);
      this.playerGame.draw(t);
      if (this.cpuGame) {
        this.cpuGame.update(t);
        this.cpuGame.draw(t);
      }
    }
    this.rafId = requestAnimationFrame((nt) => this.loop(nt));
  }
}

document.addEventListener("keydown", (e) => {
  if (!app || !app.playerGame) return;
  const g = app.playerGame;
  if (e.key === "p" || e.key === "P") {
    app.togglePause();
    e.preventDefault();
    return;
  }
  if (app.paused || g.gameOver || g.isLocked || !g.current) return;
  switch (e.key) {
    case "ArrowLeft":  g.move(-1, 0); e.preventDefault(); break;
    case "ArrowRight": g.move(1, 0);  e.preventDefault(); break;
    case "ArrowDown":  g.softDrop(); app.playerGame.lastDropTime = performance.now(); e.preventDefault(); break;
    case "ArrowUp":    g.rotate();    e.preventDefault(); break;
    case " ":          g.hardDrop(); app.playerGame.lastDropTime = performance.now(); e.preventDefault(); break;
  }
});

app = new App();

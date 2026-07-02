// ===== ぷよぷよ ゲーム本体 =====

// --- 定数 ---
const COLS = 6;            // 横6マス
const ROWS = 12;           // 縦12マス（一番上は出現枠）
const CELL = 50;           // 1マス50px
const COLORS = [null, "red", "green", "blue", "yellow"]; // 1-4 を色に対応
const COLOR_HEX = {
  red:    "#e94560",
  green:  "#06d6a0",
  blue:   "#4361ee",
  yellow: "#ffd166",
};

// ぷよの組：[colOffset, rowOffset] の2つ組。
// pivot を中心に回転させる。dir: 0=上 1=右 2=下 3=左
// pivot(0,0) に対するサブの相対位置
const SUB_OFFSETS = [
  [0, -1],  // 0: 上
  [1,  0],  // 1: 右
  [0,  1],  // 2: 下
  [-1, 0],  // 3: 左
];

// --- DOM ---
const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nctx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("start");

// --- ゲーム状態 ---
let grid;            // grid[row][col] = 0(空) or 1-4(色番号)
let current;         // { pivot:{col,row}, sub:{col,row}, pivotColor, subColor }
let nextPair;        // { a:color, b:color }
let score;
let isPlaying = false;
let isLocked = false; // 消去/落下アニメ中などで入力を受け付けない
let dropInterval;
let lastDropTime;
let rafId = null;

// --- 初期化 ---
function resetGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  scoreEl.textContent = "0";
  messageEl.textContent = "";
  isLocked = false;
  nextPair = makePair();
  spawnPair();
}

function makePair() {
  return {
    a: 1 + Math.floor(Math.random() * 4),
    b: 1 + Math.floor(Math.random() * 4),
  };
}

// 新しい組みを盤面上に出現させる。置けなければゲームオーバー。
function spawnPair() {
  const colors = nextPair;
  nextPair = makePair();
  const col = 2;             // 中央付近
  const pivotRow = 0;
  const subRow = -1;         // pivot の上
  current = {
    pivot: { col, row: pivotRow },
    sub:   { col, row: subRow },
    pivotColor: colors.a,
    subColor:   colors.b,
  };
  drawNext();
  if (!canPlace(current)) {
    gameOver();
  }
}

// --- 衝突判定 ---
function canPlace(pair) {
  const cells = pairCells(pair);
  for (const c of cells) {
    if (c.col < 0 || c.col >= COLS) return false;
    if (c.row >= ROWS) return false;
    if (c.row >= 0 && grid[c.row][c.col] !== 0) return false;
  }
  return true;
}

function pairCells(pair) {
  return [
    { col: pair.pivot.col, row: pair.pivot.row, color: pair.pivotColor },
    { col: pair.sub.col,   row: pair.sub.row,   color: pair.subColor },
  ];
}

// --- 操作：移動 ---
function move(dx, dy) {
  if (!current || isLocked) return false;
  const moved = {
    ...current,
    pivot: { col: current.pivot.col + dx, row: current.pivot.row + dy },
    sub:   { col: current.sub.col + dx,   row: current.sub.row + dy },
  };
  if (canPlace(moved)) {
    current = moved;
    return true;
  }
  return false;
}

// --- 操作：回転（時計回り） ---
function rotate() {
  if (!current || isLocked) return;
  // pivot を中心に sub を時計回りに1段階回す
  const dc = current.sub.col - current.pivot.col;
  const dr = current.sub.row - current.pivot.row;
  // (dc, dr) -> (-dr, dc) で時計回り
  const ndc = -dr;
  const ndr = dc;
  let rotated = {
    ...current,
    sub: { col: current.pivot.col + ndc, row: current.pivot.row + ndr },
  };
  if (canPlace(rotated)) {
    current = rotated;
    return;
  }
  // ぶつかって回れない場合、pivot をずらして回転試行（簡易 Wall kick）
  const kicks = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [kx, ky] of kicks) {
    const kicked = {
      ...rotated,
      pivot: { col: rotated.pivot.col + kx, row: rotated.pivot.row + ky },
      sub:   { col: rotated.sub.col + kx,   row: rotated.sub.row + ky },
    };
    if (canPlace(kicked)) {
      current = kicked;
      return;
    }
  }
}

// --- 1段落とす ---
function softDrop() {
  if (!current || isLocked) return;
  if (!move(0, 1)) {
    lockPair();
  }
}

// 一気に落とす（ハードドロップ）
function hardDrop() {
  if (!current || isLocked) return;
  while (move(0, 1)) {}
  lockPair();
}

// --- 組を固定して消去処理へ ---
function lockPair() {
  isLocked = true;
  const cells = pairCells(current);
  for (const c of cells) {
    if (c.row >= 0 && c.row < ROWS && c.col >= 0 && c.col < COLS) {
      grid[c.row][c.col] = c.color;
    }
  }
  current = null;
  // 連鎖処理を少し遅らせて視認性を上げる
  setTimeout(() => resolveChains(), 120);
}

// --- 連鎖消去 ---
async function resolveChains() {
  let chain = 0;
  while (true) {
    const toRemove = findGroups();
    if (toRemove.size === 0) break;
    chain++;
    // スコア加算
    const removed = toRemove.size;
    const bonus = chainBonus(chain) * removed * 10;
    score += bonus;
    scoreEl.textContent = score;

    // 消去マスを 0 に
    for (const key of toRemove) {
      const [r, c] = key.split(",").map(Number);
      grid[r][c] = 0;
    }
    draw();
    await sleep(220);

    // 落下（重力で隙間を埋める）
    applyGravity();
    draw();
    await sleep(180);
  }
  isLocked = false;
  if (chain > 0) {
    messageEl.textContent = chain >= 2 ? `${chain} 連鎖!` : "";
    setTimeout(() => { messageEl.textContent = ""; }, 1200);
  }
  spawnPair();
}

function chainBonus(chain) {
  // 1連鎖=1倍, 2連鎖=2倍, 3連鎖=4倍, 4連鎖=8倍…
  return Math.pow(2, chain - 1);
}

// 4つ以上つながっている同色グループを探す
function findGroups() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const removeSet = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 0 || visited[r][c]) continue;
      const color = grid[r][c];
      const group = [];
      const stack = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
        if (visited[cr][cc]) continue;
        if (grid[cr][cc] !== color) continue;
        visited[cr][cc] = true;
        group.push([cr, cc]);
        stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);
      }
      if (group.length >= 4) {
        for (const [gr, gc] of group) removeSet.add(`${gr},${gc}`);
      }
    }
  }
  return removeSet;
}

// 各列で浮いているぷよを下に寄せる
function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== 0) {
        const v = grid[r][c];
        grid[r][c] = 0;
        grid[writeRow][c] = v;
        writeRow--;
      }
    }
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// --- ゲームオーバー ---
function gameOver() {
  isPlaying = false;
  isLocked = true;
  messageEl.textContent = "GAME OVER";
  if (rafId) cancelAnimationFrame(rafId);
}

// --- 描画 ---
function draw() {
  // 背景
  ctx.fillStyle = "#0d1b2a";
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  // グリッド線
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, ROWS * CELL);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(COLS * CELL, r * CELL);
    ctx.stroke();
  }

  // 固定済みぷよ
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== 0) {
        drawPuyo(ctx, c, r, grid[r][c]);
      }
    }
  }

  // 操作中の組
  if (current) {
    const cells = pairCells(current);
    for (const cell of cells) {
      if (cell.row >= 0) {
        drawPuyo(ctx, cell.col, cell.row, cell.color);
      }
    }
  }
}

function drawPuyo(c2d, col, row, colorNum) {
  const colorName = COLORS[colorNum];
  const x = col * CELL;
  const y = row * CELL;
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  const radius = CELL / 2 - 2;

  // 本体
  const grad = c2d.createRadialGradient(
    cx - 6, cy - 6, 4,
    cx, cy, radius
  );
  grad.addColorStop(0, lighten(COLOR_HEX[colorName], 60));
  grad.addColorStop(1, COLOR_HEX[colorName]);
  c2d.fillStyle = grad;
  c2d.beginPath();
  c2d.arc(cx, cy, radius, 0, Math.PI * 2);
  c2d.fill();

  // ハイライト
  c2d.fillStyle = "rgba(255,255,255,0.45)";
  c2d.beginPath();
  c2d.arc(cx - 8, cy - 8, radius / 4, 0, Math.PI * 2);
  c2d.fill();

  // 目（簡易）
  c2d.fillStyle = "#222";
  c2d.beginPath();
  c2d.arc(cx - 6, cy + 2, 2.2, 0, Math.PI * 2);
  c2d.arc(cx + 6, cy + 2, 2.2, 0, Math.PI * 2);
  c2d.fill();
}

function lighten(hex, amount) {
  // hex (#rrggbb) を明るくする簡易関数
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0xff) + amount;
  let b = (num & 0xff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `rgb(${r},${g},${b})`;
}

// NEXT表示（CELL サイズに依存しない専用描画）
function drawNext() {
  nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nctx.fillStyle = "#0d1b2a";
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const s = 26;
  const cx = nextCanvas.width / 2;
  drawPuyoAt(nctx, cx, s + 4, s, nextPair.a);
  drawPuyoAt(nctx, cx, s * 2 + 8, s, nextPair.b);
}

function drawPuyoAt(c2d, cx, cy, radius, colorNum) {
  const colorName = COLORS[colorNum];
  const grad = c2d.createRadialGradient(
    cx - 5, cy - 5, 3,
    cx, cy, radius
  );
  grad.addColorStop(0, lighten(COLOR_HEX[colorName], 60));
  grad.addColorStop(1, COLOR_HEX[colorName]);
  c2d.fillStyle = grad;
  c2d.beginPath();
  c2d.arc(cx, cy, radius, 0, Math.PI * 2);
  c2d.fill();
  c2d.fillStyle = "rgba(255,255,255,0.45)";
  c2d.beginPath();
  c2d.arc(cx - 6, cy - 6, radius / 4, 0, Math.PI * 2);
  c2d.fill();
}

// --- メインループ ---
function loop(time) {
  if (!isPlaying) return;
  if (!isLocked && current) {
    if (!lastDropTime) lastDropTime = time;
    if (time - lastDropTime > dropInterval) {
      if (!move(0, 1)) {
        lockPair();
      }
      lastDropTime = time;
    }
  } else {
    lastDropTime = time;
  }
  draw();
  rafId = requestAnimationFrame(loop);
}

// --- 入力 ---
document.addEventListener("keydown", (e) => {
  if (!isPlaying || !current || isLocked) return;
  switch (e.key) {
    case "ArrowLeft":
      move(-1, 0);
      e.preventDefault();
      break;
    case "ArrowRight":
      move(1, 0);
      e.preventDefault();
      break;
    case "ArrowDown":
      softDrop();
      lastDropTime = performance.now();
      e.preventDefault();
      break;
    case "ArrowUp":
      rotate();
      e.preventDefault();
      break;
    case " ":
      hardDrop();
      lastDropTime = performance.now();
      e.preventDefault();
      break;
  }
});

// --- スタートボタン ---
startBtn.addEventListener("click", () => {
  if (rafId) cancelAnimationFrame(rafId);
  isPlaying = true;
  dropInterval = 700; // ms
  lastDropTime = 0;
  resetGame();
  messageEl.textContent = "";
  rafId = requestAnimationFrame(loop);
});

// 初回描画（空盤）
grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
draw();

// いたずラッシュの共通部分（大盛りの新しいステージ）。stages.js のあと、game.js の前に読む。
// ステージの形は stages.js と同じ。STAGE_LIST と ZUKAN_EXTRA に足すと、設定（window.ITAZU.stages）で選べるようになる。
'use strict';
Object.assign(sfx, {
  scribble() { noise(0.05, rnd(2500, 4000), 2, 0.07); },
  slosh(k) { noise(0.08, 500 + k * 900, 1.2, 0.15 + k * 0.1, 'bandpass'); },
  pssh() { noise(0.5, 3000, 0.5, 0.35, 'highpass'); tone(900, 300, 0.2, 0.05, 'sine'); },
  fizz(v) { noise(0.09, rnd(2500, 4500), 0.6, 0.05 + v * 0.1, 'highpass'); },
  scoop() { tone(rnd(300, 380), 600, 0.08, 0.1, 'sine'); },
  gulp() { tone(180, 90, 0.12, 0.18, 'sine'); tone(660, 990, 0.15, 0.06, 'square', 0.1); },
  peel() { noise(0.07, 5000, 1, 0.12, 'highpass'); },
  stick() { tone(220, 140, 0.06, 0.15, 'sine'); },
  kick() { tone(120, 60, 0.1, 0.35, 'sine'); noise(0.05, 800, 1, 0.2); },
  bark() { tone(520, 340, 0.09, 0.2, 'square'); tone(560, 360, 0.09, 0.18, 'square', 0.14); },
  rustle() { noise(0.25, 2200, 0.8, 0.2, 'bandpass'); },
  thud() { tone(140, 70, 0.12, 0.25, 'sine'); }
});

/* ---------- 大盛り1: 落書き ---------- */
const CRAYONS = ['#ff5a4e', '#2f8fd6', '#2fb5a3', '#a66cf0', '#ff9e3d', '#231b2e'];
const WALL_PATCH = 3; // m。これを超えて描いたら、消しゴムでは落ちないので壁紙の張り替え
const WALL_SEC = 600, WALL_YEN = 1500; // 張り替え1回の時間と値段
const graffiti = {
  key: 'graffiti', name: '落書き', prompt: '描け！', hint: 'なぞって 壁に落書き', bg: '#f3e7d3',
  bgm: song(136, [ // のびのびお絵かき
    ['square', 0.045, '72 . 76 . 79 . 76 . 81 - 79 . 76 . 72 . 74 . 77 . 81 . 77 . 84 - 81 . 77 . 74 .'],
    ['triangle', 0.15, '48 . . . 55 . . . 50 . . . 57 . . . 53 . . . 57 . . . 55 . . . 43 . . .']
  ], ['k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.h.']),
  shop: [['メラミンスポンジ', 'メラミンスポンジ'], ['壁紙の補修シート', '壁紙 補修シート']],
  bill(t) {
    const m = t.graffiti || 0, w = t.wallpaper || 0;
    return { v: m.toFixed(1) + 'm', n: (w ? '壁紙の張り替え ' + w + '回・' : '') + '消しゴムでこする', sec: m * 20 + w * WALL_SEC, yen: w * WALL_YEN };
  },
  init() { this.m = 0; this.lines = []; this.ptr = {}; this.acc = 0; this.npts = 0; },
  started() { return this.m > 0.05; },
  result() { return this.m.toFixed(1) + 'm'; },
  commit(tot) { add(tot, 'graffiti', this.m); mx(tot, 'graffitiMax', this.m); add(tot, 'wallpaper', this.m > WALL_PATCH ? 1 : 0); },
  geo() { const s = SC(); return { s, top: H * 0.12, floor: H * 0.86, pxm: 400 * s }; },
  down(id, x, y) {
    const g = this.geo();
    const line = { c: CRAYONS[this.lines.length % CRAYONS.length], pts: [[x, clamp(y, g.top, g.floor)]] };
    this.lines.push(line); this.ptr[id] = line;
  },
  move(id, x, y) {
    const line = this.ptr[id]; if (!line) return;
    const g = this.geo(), last = line.pts[line.pts.length - 1], yy = clamp(y, g.top, g.floor);
    const d = Math.hypot(x - last[0], yy - last[1]); if (d < 3) return;
    if (this.npts < 5000) { line.pts.push([x, yy]); this.npts++; }
    if (scoring()) this.m += d / g.pxm;
    this.acc += d; if (this.acc > 40) { this.acc = 0; sfx.scribble(); }
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  update() {},
  draw() {
    const g = this.geo(), s = g.s;
    // 壁紙（細いストライプと小花）
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.floor);
    ctx.fillStyle = 'rgba(201,86,60,.08)'; for (let x = 0; x < W; x += 36 * s) ctx.fillRect(x, 0, 12 * s, g.floor);
    ctx.fillStyle = 'rgba(201,86,60,.25)';
    for (let y = 30 * s, r = 0; y < g.floor; y += 60 * s, r++) for (let x = (r % 2) * 30 * s + 15 * s; x < W; x += 60 * s) { ctx.beginPath(); ctx.arc(x, y, 3 * s, 0, Math.PI * 2); ctx.fill(); }
    // 幅木と床
    ctx.fillStyle = '#8a5a32'; ctx.fillRect(0, g.floor, W, 14 * s);
    ctx.fillStyle = '#d9a066'; ctx.fillRect(0, g.floor + 14 * s, W, H - g.floor);
    ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    // クレヨンの線（2回重ねて、かすれた感じに）
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const ln of this.lines) {
      if (ln.pts.length < 2) continue;
      for (const [w, a, o] of [[10 * s, 0.85, 0], [6 * s, 0.6, 1.5 * s]]) {
        ctx.beginPath(); ctx.moveTo(ln.pts[0][0] + o, ln.pts[0][1] + o);
        for (const p of ln.pts) ctx.lineTo(p[0] + o, p[1] + o);
        ctx.globalAlpha = a; ctx.lineWidth = w; ctx.strokeStyle = ln.c; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // クレヨンの箱
    rr(W - 92 * s, H - 64 * s, 76 * s, 44 * s, 6 * s); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    CRAYONS.forEach((c, i) => { rr(W - 86 * s + i * 11 * s, H - 80 * s, 8 * s, 24 * s, 3 * s); ctx.fillStyle = c; ctx.fill(); });
    if (this.m > WALL_PATCH) bigText('もう消えない…', W / 2, g.top + 30 * s, 24 * s, HOT, INK, W * 0.7);
  },
  drawHint(t) { const p = (t * 0.9) % 1; finger(W * 0.2 + p * W * 0.6, H * 0.45 + Math.sin(p * Math.PI * 4) * 60, 0.9); }
};

/* ---------- 大盛り2: 炭酸 ---------- */
const SODA_ML = 500; // 1本の量
const soda = {
  key: 'soda', name: '炭酸', prompt: '振れ！', hint: '上下に振って、タップで開ける', bg: '#cfeef9',
  bgm: song(160, [ // しゅわしゅわ
    ['bub', 0.08, '76 79 83 . 76 79 83 . 74 78 81 . 74 78 81 . 73 76 81 . 73 76 81 . 74 78 83 - - . . .'],
    ['square', 0.05, '40 . 52 . 40 . 52 . 38 . 50 . 38 . 50 . 37 . 49 . 37 . 49 . 38 . 50 . 42 . 54 .']
  ], ['k.hhs.hhk.hhs.hhk.hhs.hhk.hhs.hh']),
  shop: [['炭酸飲料のケース', '炭酸飲料 ケース']],
  bill(t) {
    const ml = t.soda || 0, b = t.sodaBottles || 0;
    return { v: Math.floor(ml) + 'mL', n: 'ペットボトル ' + b + '本・天井と床をふく', sec: ml / 100 * 60, yen: b * 160 };
  },
  init() { this.ml = 0; this.bottles = 0; this.state = 'shake'; this.p = 0; this.left = 0; this.k = 0; this.ptr = {}; this.off = 0; this.drops = []; this.pool = 0; this.t = 0; this.st = 0; this.ft = 0; },
  started() { return this.p > 0.02 || this.ml > 0; },
  result() { return Math.floor(this.ml) + 'mL'; },
  commit(tot) { add(tot, 'soda', this.ml); add(tot, 'sodaBottles', this.bottles); mx(tot, 'sodaMax', this.ml); },
  geo() { const s = SC(); return { s, cx: W / 2, by: H * 0.55, floor: H * 0.86 }; },
  down(id, x, y) { this.ptr[id] = { y, y0: y, t0: clock, moved: 0 }; },
  move(id, x, y) { // 押したまま上下に動かすと振れる（圧が上がる）
    const p = this.ptr[id]; if (!p) return;
    const dy = y - p.y; p.y = y; p.moved += Math.abs(dy);
    if (this.state !== 'shake') return;
    const s = SC();
    this.p = Math.min(1, this.p + Math.abs(dy) / (1200 * s));
    this.off = clamp(this.off + dy, -80 * s, 80 * s);
    this.st += Math.abs(dy); if (this.st > 60 * s) { this.st = 0; sfx.slosh(this.p); }
  },
  up(id) {
    if (id == null) { this.ptr = {}; return; }
    const p = this.ptr[id]; delete this.ptr[id]; if (!p) return;
    if (p.moved < 12 * SC() && clock - p.t0 < 0.4 && this.state === 'shake') this.open(); // タップで開ける
  },
  open() {
    this.state = 'spray'; this.left = 40 + this.p * (SODA_ML - 40); this.k = 0; this.bottles++; sfx.pssh();
  },
  update(dt) {
    this.t += dt; this.off *= Math.exp(-dt * 6);
    const g = this.geo(), s = g.s;
    if (this.state === 'spray') {
      const d = Math.min(this.left, 600 * dt); this.left -= d;
      if (scoring()) this.ml += d; // 時間切れのあとに噴き出した分は数えない
      this.pool = Math.min(1, this.pool + d / 1500);
      this.ft -= dt; if (this.ft <= 0) { this.ft = 0.07; sfx.fizz(this.p); }
      for (let i = 0; i < Math.ceil(d / 4); i++) this.drops.push({ x: g.cx + rnd(-6, 6) * s, y: g.by - 120 * s, vx: rnd(-1, 1) * 220 * s, vy: -rnd(400, 900) * s * (0.4 + this.p), r: rnd(3, 6) * s, life: rnd(0.6, 1.2) });
      if (this.left <= 0) { this.state = 'next'; this.k = 0; }
    } else if (this.state === 'next') { this.k += dt / 0.35; if (this.k >= 1) { this.state = 'shake'; this.p = 0; } }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.vy += 1300 * s * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      if (d.y < 8 * s) { d.y = 8 * s; d.vy = Math.abs(d.vy) * 0.2; } // 天井に当たる
      if (d.life <= 0 || d.y > g.floor + 20 * s) this.drops.splice(i, 1);
    }
    if (this.drops.length > 600) this.drops.splice(0, this.drops.length - 600);
  },
  bottle(x, y, s, shakeK) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(shakeK * 0.15);
    rr(-34 * s, -80 * s, 68 * s, 170 * s, 22 * s); ctx.fillStyle = 'rgba(191,232,201,.9)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,158,61,.85)'; rr(-30 * s, -40 * s, 60 * s, 126 * s, 18 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; // 泡
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-18 * s + sr(i) * 36 * s, -30 * s + sr(i + 5) * 110 * s, (2 + sr(i + 9) * 3) * s * (0.6 + this.p), 0, Math.PI * 2); ctx.fill(); }
    rr(-34 * s, 0, 68 * s, 34 * s, 4 * s); ctx.fillStyle = HOT; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = PAPER; ctx.font = `${Math.round(13 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ソーダ', 0, 17 * s);
    rr(-14 * s, -102 * s, 28 * s, 24 * s, 4 * s); ctx.fillStyle = '#e8eef2'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); // 首
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.floor);
    ctx.fillStyle = '#e8d2b0'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    if (this.pool > 0) { ctx.beginPath(); ctx.ellipse(g.cx, g.floor + 18 * s, W * 0.45 * this.pool, 16 * s * this.pool + 4, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,158,61,.55)'; ctx.fill(); }
    ctx.fillStyle = 'rgba(255,158,61,.45)'; ctx.fillRect(0, 0, W, 8 * s * this.pool * 2); // 天井のしみ
    const shakeK = this.state === 'shake' ? this.off / (80 * s) : 0;
    if (this.state === 'next') { const e = this.k; this.bottle(g.cx - e * W, g.by, s, 0); this.bottle(g.cx + (1 - e) * W, g.by, s, 0); }
    else this.bottle(g.cx, g.by + this.off * 0.6, s, shakeK);
    if (this.state === 'spray') { rr(g.cx + 30 * s, g.by - 150 * s, 30 * s, 18 * s, 4 * s); ctx.fillStyle = '#e8eef2'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); } // 飛んだフタ
    ctx.fillStyle = '#ffb35c';
    for (const d of this.drops) { ctx.globalAlpha = Math.min(1, d.life * 2); ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (this.state === 'shake') { // 圧のゲージ
      const gw = 160 * s, gx = g.cx - gw / 2, gy = g.by + 120 * s;
      rr(gx, gy, gw, 16 * s, 8 * s); ctx.fillStyle = INK; ctx.fill();
      if (this.p > 0) { rr(gx + 3, gy + 3, Math.max(10 * s, (gw - 6) * this.p), 16 * s - 6, 5 * s); ctx.fillStyle = this.p >= 1 ? POP : HOT; ctx.fill(); }
      if (this.p >= 1) bigText('タップで開けろ！', g.cx, gy + 40 * s, 24 * s, POP, INK, W * 0.8);
    }
  },
  drawHint(t) { const g = this.geo(), p = (t * 2) % 1; finger(g.cx + 70 * g.s, g.by + Math.sin(p * Math.PI * 2) * 70 * g.s, 0.9); }
};

/* ---------- 大盛り3: プリン ---------- */
const PUDDING_BITES = 3; // 何口で1個食べ終わるか
const PUDDING_NAMES = ['パパ', 'ママ', 'おにいちゃん', 'おねえちゃん', 'おばあちゃん'];
const pudding = {
  key: 'pudding', name: 'プリン', prompt: '食べちゃえ！', hint: '下から上へ すくう', bg: '#fff3dc',
  bgm: song(116, [ // あまい
    ['bell', 0.07, '79 . . 76 . . 72 . 74 . 76 . 79 - - . 81 . . 79 . . 76 . 77 . 76 . 72 - - .'],
    ['triangle', 0.13, '48 . . . 55 . . . 53 . . . 55 . . . 45 . . . 52 . . . 48 . . . 43 . . .']
  ], ['k...h...s...h...k...h...s...h...']),
  shop: [['プリン', 'プリン']],
  bill(t) { const n = t.pudding || 0; return { v: n + '個', n: '名前が書いてあったプリンを買い直して謝る', sec: n * 60, yen: n * 150 }; },
  init() { this.n = 0; this.bites = 0; this.ptr = {}; this.slide = 0; this.who = Math.floor(Math.random() * PUDDING_NAMES.length); this.spoon = 0; this.t = 0; },
  started() { return this.bites > 0 || this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'pudding', this.n); mx(tot, 'puddingMax', this.n); },
  geo() { const s = SC(); return { s, cx: W / 2, py: H * 0.55, table: H * 0.68 }; },
  down(id, x, y) { this.ptr[id] = { y, t: clock }; },
  move(id, x, y) { // 下から上へすばやくなぞると1口
    const p = this.ptr[id]; if (!p) return;
    if (y > p.y) { p.y = y; p.t = clock; return; }
    if (p.y - y >= 120 * SC() && clock - p.t < 0.6) { p.y = y; p.t = clock; this.bite(); }
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  bite() {
    if (this.slide > 0 || !scoring()) return;
    this.bites++; this.spoon = 1; sfx.scoop();
    if (this.bites >= PUDDING_BITES) { this.bites = 0; this.n++; this.slide = 1; sfx.gulp(); this.who = (this.who + 1) % PUDDING_NAMES.length; }
  },
  update(dt) { this.t += dt; this.spoon = Math.max(0, this.spoon - dt * 4); if (this.slide > 0) this.slide = Math.max(0, this.slide - dt / 0.25); },
  cup(x, y, s, left, who) {
    // 容器
    ctx.beginPath(); ctx.moveTo(x - 70 * s, y - 50 * s); ctx.lineTo(x + 70 * s, y - 50 * s); ctx.lineTo(x + 52 * s, y + 60 * s); ctx.lineTo(x - 52 * s, y + 60 * s); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    // 中身（食べた分だけ減る）
    if (left > 0) {
      const top = y + 55 * s - 100 * s * left, wTop = 52 * s + (70 - 52) * s * left;
      ctx.beginPath(); ctx.moveTo(x - wTop + 4 * s, top); ctx.lineTo(x + wTop - 4 * s, top); ctx.lineTo(x + 48 * s, y + 56 * s); ctx.lineTo(x - 48 * s, y + 56 * s); ctx.closePath();
      ctx.fillStyle = '#ffd36b'; ctx.fill();
      const cy = Math.max(top, y + 42 * s), cw = 48 * s + (y + 56 * s - cy) * 18 / 110; // カラメル（容器の底にたまっている）
      ctx.beginPath(); ctx.moveTo(x - cw, cy); ctx.lineTo(x + cw, cy); ctx.lineTo(x + 48 * s, y + 56 * s); ctx.lineTo(x - 48 * s, y + 56 * s); ctx.closePath();
      ctx.fillStyle = '#9a4f1c'; ctx.fill();
    }
    // 名前
    rr(x - 50 * s, y - 92 * s, 100 * s, 30 * s, 6 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = HOT; fitText(PUDDING_NAMES[who] + 'の', x, y - 76 * s, 90 * s, `${Math.round(15 * s)}px ${DISPLAY}`, 'center');
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.table);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let y = 20; y < g.table; y += 44 * s) ctx.fillRect(0, y, W, 2); // 冷蔵庫の棚
    ctx.fillStyle = '#c98b52'; ctx.fillRect(0, g.table, W, H - g.table); ctx.fillStyle = INK; ctx.fillRect(0, g.table - 2, W, 3);
    ctx.textBaseline = 'middle';
    const left = 1 - this.bites / PUDDING_BITES;
    if (this.slide > 0) { const e = this.slide; this.cup(g.cx - (1 - e) * W, g.py, s, 0, (this.who + PUDDING_NAMES.length - 1) % PUDDING_NAMES.length); this.cup(g.cx + e * W, g.py, s, 1, this.who); }
    else this.cup(g.cx, g.py, s, left, this.who);
    // スプーン（すくうと上に動く）
    const sy = g.py + 120 * s - this.spoon * 140 * s;
    ctx.save(); ctx.translate(g.cx + 90 * s, sy); ctx.rotate(-0.5);
    rr(-6 * s, 0, 12 * s, 110 * s, 6 * s); ctx.fillStyle = '#c7ced5'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -10 * s, 18 * s, 24 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#c7ced5'; ctx.fill(); ctx.stroke();
    if (this.spoon > 0) { ctx.beginPath(); ctx.ellipse(0, -14 * s, 12 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffd36b'; ctx.fill(); }
    ctx.restore();
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.6) % 1; finger(g.cx, g.py + 90 * g.s - p * 150 * g.s, 0.9 * (1 - p * 0.5)); }
};

/* ---------- 大盛り4: シール ---------- */
const STICKER_REMOVER = 10; // 1回でこの枚数以上貼ったら、はがし剤がいる
const STICKER_COLORS = ['#ff5a4e', '#ffd23f', '#2fb5a3', '#4f86f7', '#a66cf0', '#ff9ecf'];
const sticker = {
  key: 'sticker', name: 'シール', prompt: '貼れ！', hint: 'シールを家具へ ドラッグ', bg: '#fde7c8',
  bgm: song(150, [ // ぺたぺた
    ['square', 0.045, '84 . 81 . 79 . 76 . 79 . 81 . 84 - . . 86 . 84 . 81 . 79 . 81 . 79 . 76 - . .'],
    ['triangle', 0.15, '48 . 48 . 55 . 55 . 53 . 53 . 55 . 55 . 50 . 50 . 57 . 57 . 55 . 55 . 48 . 48 .']
  ], ['k.c.k.c.k.c.kkc.k.c.k.c.k.c.kkc.']),
  shop: [['シールはがし', 'シールはがし']],
  bill(t) {
    const n = t.sticker || 0, r = t.stickerRem || 0;
    return { v: n + '枚', n: (r ? 'シールはがし剤・' : '') + '1枚ずつはがす', sec: n * 30, yen: r * 600 };
  },
  init() { this.n = 0; this.items = []; this.ptr = {}; },
  started() { return this.n > 0; },
  result() { return this.n + '枚'; },
  commit(tot) { add(tot, 'sticker', this.n); add(tot, 'stickerRem', this.n >= STICKER_REMOVER ? 1 : 0); mx(tot, 'stickerMax', this.n); },
  geo() { const s = SC(); return { s, sheetY: H * 0.84, floor: H * 0.72 }; },
  down(id, x, y) { // どこを押してもシートから1枚はがして指につく
    this.ptr[id] = { x, y, x0: x, y0: y, shape: Math.floor(Math.random() * 3), c: STICKER_COLORS[Math.floor(Math.random() * STICKER_COLORS.length)], r: rnd(-0.4, 0.4) };
    sfx.peel();
  },
  move(id, x, y) { const p = this.ptr[id]; if (p) { p.x = x; p.y = y; } },
  up(id) {
    if (id == null) { this.ptr = {}; return; }
    const p = this.ptr[id]; delete this.ptr[id]; if (!p) return;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) < 40 * SC()) return; // ほとんど動かしていなければ貼らない
    this.items.push(p); if (this.items.length > 300) this.items.shift();
    if (scoring()) this.n++;
    sfx.stick();
  },
  update() {},
  shapePath(p, z) {
    ctx.beginPath();
    if (p.shape === 0) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, d = k % 2 ? z * 0.45 : z; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d); } ctx.closePath(); }
    else if (p.shape === 1) { ctx.moveTo(0, z * 0.9); ctx.bezierCurveTo(-z * 1.3, -z * 0.2, -z * 0.5, -z * 1.1, 0, -z * 0.4); ctx.bezierCurveTo(z * 0.5, -z * 1.1, z * 1.3, -z * 0.2, 0, z * 0.9); }
    else { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.moveTo(Math.cos(a) * z * 0.55 + z * 0.4, Math.sin(a) * z * 0.55); ctx.arc(Math.cos(a) * z * 0.55, Math.sin(a) * z * 0.55, z * 0.4, 0, Math.PI * 2); } }
  },
  drawSticker(p, z, lifted) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
    if (lifted) { ctx.translate(4, 6); this.shapePath(p, z); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill(); ctx.translate(-4, -6); }
    this.shapePath(p, z + 3); ctx.fillStyle = '#ffffff'; ctx.fill();
    this.shapePath(p, z); ctx.fillStyle = p.c; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.floor);
    ctx.fillStyle = '#d9a066'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    // タンス
    const tw = Math.min(W * 0.7, 280 * s), th = g.floor - H * 0.2, tx = (W - tw) / 2, ty = H * 0.2;
    rr(tx, ty, tw, th, 8 * s); ctx.fillStyle = '#b97a45'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const dy = ty + 14 * s + i * (th - 28 * s) / 4;
      rr(tx + 14 * s, dy, tw - 28 * s, (th - 28 * s) / 4 - 10 * s, 5 * s); ctx.fillStyle = '#d29a62'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      rr(W / 2 - 18 * s, dy + ((th - 28 * s) / 4 - 10 * s) / 2 - 4 * s, 36 * s, 8 * s, 4 * s); ctx.fillStyle = '#7a4b2a'; ctx.fill();
    }
    for (const p of this.items) this.drawSticker(p, 16 * s, false);
    // シールのシート
    rr(W * 0.12, g.sheetY - 30 * s, W * 0.76, 66 * s, 8 * s); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    for (let i = 0; i < 6; i++) this.drawSticker({ x: W * 0.2 + i * W * 0.12, y: g.sheetY + 3 * s, shape: i % 3, c: STICKER_COLORS[i], r: 0 }, 13 * s, false);
    for (const k in this.ptr) this.drawSticker(this.ptr[k], 19 * s, true);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.2) % 1; finger(W / 2 + p * 40, g.sheetY - p * H * 0.45, 0.9); }
};

/* ---------- 大盛り5: 靴飛ばし ---------- */
const SHOE_COLORS = ['#ff5a4e', '#4f86f7', '#2fb5a3', '#ffd23f', '#a66cf0'];
const SHOE_SEC = { roof: 180, tree: 120, dog: 60 }; // 1個取ってくるのにかかる秒（屋根ははしご、木は棒、犬小屋は犬をなだめる）
const SHOE_DOG_YEN = 1500; // 犬小屋に入った靴は、かじられて買い直し
const shoe = {
  key: 'shoe', name: '靴飛ばし', prompt: '飛ばせ！', hint: '上にはじいて 靴を飛ばす', bg: '#bfe3f5',
  bgm: song(172, [ // あーした天気になーれ
    ['sawtooth', 0.03, '76 76 . 79 . 76 . 74 . 76 76 . 81 . 79 . 76 76 . 79 . 83 . 81 . 79 76 . 74 . 71 .'],
    ['square', 0.05, '40 . 40 . 52 . 40 . 45 . 45 . 57 . 45 . 43 . 43 . 55 . 43 . 47 . 47 . 59 . 47 .']
  ], ['k.s.k.s.kks.k.s.k.s.k.s.kks.k.s.']),
  shop: [['子ども用スニーカー', '子供 スニーカー']],
  bill(t) {
    const r = t.shoeRoof || 0, w = t.shoeTree || 0, d = t.shoeDog || 0;
    const where = [r && '屋根' + r, w && '木' + w, d && '犬小屋' + d].filter(Boolean).join('・');
    return { v: (r + w + d) + '個', n: (where ? where + 'から' : '') + '取ってくる' + (d ? '・かじられて買い直し' : ''),
      sec: r * SHOE_SEC.roof + w * SHOE_SEC.tree + d * SHOE_SEC.dog, yen: d * SHOE_DOG_YEN };
  },
  init() { this.n = 0; this.hit = { roof: 0, tree: 0, dog: 0 }; this.shoes = []; this.landed = []; this.pops = []; this.ptr = {}; this.hapAt = hapTime(); this.pt = 0; this.hapK = -1; this.dog = null; this.dogCatch = 0; },
  started() { return this.n > 0 || this.shoes.length > 0 || this.landed.length > 0; },
  result() { return this.n + '個'; },
  commit(tot) {
    add(tot, 'shoeRoof', this.hit.roof); add(tot, 'shoeTree', this.hit.tree); add(tot, 'shoeDog', this.hit.dog);
    mx(tot, 'shoeRoofMax', this.hit.roof); if (this.hapK >= 0) tot.hapShoe = 1;
  },
  geo() {
    const s = SC();
    return { s, by: H * 0.82, ground: H * 0.58, dogY: H * 0.66, // dogY: ハプニングのイヌが靴をキャッチする高さ
      // 引っかかる場所。下（手前）から順に、靴がその高さを通るときの横の位置で決まる
      tg: [{ k: 'dog', y: H * 0.55, x0: W * 0.06, x1: W * 0.28, say: 'ワン！' },
        { k: 'tree', y: H * 0.36, x0: W * 0.72, x1: W * 0.98, say: '引っかかった！' },
        { k: 'roof', y: H * 0.24, x0: W * 0.25, x1: W * 0.75, say: '屋根の上！' }] };
  },
  down(id, x, y) { this.ptr[id] = { x, y, t: clock }; },
  move(id, x, y) { // 上へすばやくはじくと、その向きに靴が飛ぶ
    const p = this.ptr[id]; if (!p || p.done) return;
    if (y > p.y) { p.x = x; p.y = y; p.t = clock; return; }
    const dx = x - p.x, dy = p.y - y, s = SC();
    if (dy >= 50 * s && clock - p.t < 0.5) { p.done = true; this.kick(dx / dy); }
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  kick(slope) {
    const g = this.geo(), sp = 1500 * g.s;
    const ang = Math.atan2(-1, clamp(slope, -1.2, 1.2));
    this.shoes.push({ x: W / 2, y: g.by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 0, c: SHOE_COLORS[Math.floor(Math.random() * SHOE_COLORS.length)] });
    sfx.kick();
  },
  size(y) { const g = this.geo(); return 22 * g.s * clamp(1 - (g.by - y) / (H * 1.5), 0.5, 1); }, // 遠くへ行くほど小さく見える
  update(dt) {
    const g = this.geo();
    // ハプニング：イヌが犬小屋から飛び出してきて庭を走り回り、頭の上を通る靴をジャンプでキャッチする
    if (this.hapK >= 0) this.hapK += dt;
    if (scoring()) {
      this.pt += dt;
      if (this.hapAt >= 0 && this.hapK < 0 && this.pt >= this.hapAt) { this.hapK = 0; this.dog = { x: W * 0.17, vx: W * 0.45, hold: 0, c: null }; sfx.woof(); sfx.hap(); }
    }
    const d = this.dog;
    if (d) {
      d.hold = Math.max(0, d.hold - dt); if (d.hold === 0) d.c = null;
      d.x += d.vx * dt;
      if (d.x > W * 0.88) { d.x = W * 0.88; d.vx = -Math.abs(d.vx); } else if (d.x < W * 0.12) { d.x = W * 0.12; d.vx = Math.abs(d.vx); }
    }
    for (let i = this.shoes.length - 1; i >= 0; i--) {
      const b = this.shoes[i], py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += dt * 12;
      if (d && d.hold === 0 && py > g.dogY && b.y <= g.dogY && Math.abs(b.x - d.x) < 36 * g.s) { // キャッチされた靴は、犬小屋に入ったのと同じ（かじられて買い直し）
        this.shoes.splice(i, 1); d.hold = 0.6; d.c = b.c; this.dogCatch++;
        if (scoring()) { this.n++; this.hit.dog++; }
        this.pops.push({ x: d.x, y: g.dogY - 10 * g.s, say: 'ナイスキャッチ！', life: 1 }); sfx.woof();
        continue;
      }
      const t = g.tg.find(t => py > t.y && b.y <= t.y && b.x >= t.x0 && b.x <= t.x1);
      if (t) {
        this.shoes.splice(i, 1);
        // 引っかかった場所に残す（犬小屋は入り口の中、屋根は少しばらけて重ならないように）
        const x = t.k === 'dog' ? clamp(b.x, W * 0.13, W * 0.21) : t.k === 'roof' ? clamp(b.x + rnd(-0.07, 0.07) * W, W * 0.3, W * 0.7) : b.x;
        const y = t.k === 'dog' ? H * 0.62 : t.k === 'roof' ? t.y + rnd(-0.02, 0.03) * H : t.y;
        this.landed.push({ x, y, r: t.k === 'dog' ? 0.3 : rnd(-0.7, 0.7), c: b.c, k: t.k }); if (this.landed.length > 200) this.landed.shift();
        if (scoring()) { this.n++; this.hit[t.k]++; } // 時間切れのあとに引っかかった分は数えない
        this.pops.push({ x, y: t.y, say: t.say, life: 1 });
        if (t.k === 'dog') sfx.bark(); else if (t.k === 'tree') sfx.rustle(); else sfx.thud();
        continue;
      }
      if (b.y < -60 || b.x < -60 || b.x > W + 60) this.shoes.splice(i, 1); // 空のかなたへ（数えない）
    }
    for (let i = this.pops.length - 1; i >= 0; i--) { this.pops[i].life -= dt * 1.4; if (this.pops[i].life <= 0) this.pops.splice(i, 1); }
  },
  drawShoe(x, y, r, z, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    ctx.beginPath(); ctx.moveTo(-z, z * 0.3); ctx.lineTo(-z, -z * 0.55); ctx.quadraticCurveTo(-z * 0.65, -z * 0.7, -z * 0.3, -z * 0.5);
    ctx.lineTo(z * 0.15, -z * 0.2); ctx.quadraticCurveTo(z, -z * 0.25, z, z * 0.3); ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    rr(-z * 1.05, z * 0.22, z * 2.1, z * 0.3, z * 0.12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke(); // 靴底
    ctx.restore();
  },
  drawLanded(k) { for (const p of this.landed) if (p.k === k) this.drawShoe(p.x, p.y - this.size(p.y) * 0.4, p.r, this.size(p.y), p.c); },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.ground);
    ctx.fillStyle = '#8fbf6a'; ctx.fillRect(0, g.ground, W, H - g.ground); ctx.fillStyle = INK; ctx.fillRect(0, g.ground - 2, W, 3); // 庭の芝生
    ctx.lineWidth = 4; ctx.strokeStyle = INK;
    // 家（正面）
    const wy = H * 0.27, wh = g.ground - wy;
    ctx.fillStyle = '#f4e6cf'; ctx.fillRect(W * 0.22, wy, W * 0.56, wh); ctx.strokeRect(W * 0.22, wy, W * 0.56, wh);
    ctx.fillStyle = '#9fd3ef'; for (const x of [0.27, 0.61]) { ctx.fillRect(W * x, H * 0.33, W * 0.12, H * 0.07); ctx.strokeRect(W * x, H * 0.33, W * 0.12, H * 0.07); }
    ctx.fillStyle = '#b97a45'; ctx.fillRect(W * 0.44, H * 0.44, W * 0.12, g.ground - H * 0.44); ctx.strokeRect(W * 0.44, H * 0.44, W * 0.12, g.ground - H * 0.44); // 玄関
    ctx.beginPath(); ctx.moveTo(W / 2, H * 0.1); ctx.lineTo(W * 0.86, H * 0.29); ctx.lineTo(W * 0.14, H * 0.29); ctx.closePath(); ctx.fillStyle = '#c4523f'; ctx.fill(); ctx.stroke(); // 屋根
    this.drawLanded('roof');
    // 木
    ctx.fillStyle = '#8a5a35'; ctx.fillRect(W * 0.83, H * 0.4, W * 0.06, g.ground - H * 0.4 + 6 * s); ctx.strokeRect(W * 0.83, H * 0.4, W * 0.06, g.ground - H * 0.4 + 6 * s);
    ctx.fillStyle = '#4f9a4a';
    for (const [dx, dy, r] of [[-0.06, 0.02, 0.1], [0.06, 0.03, 0.1], [0, -0.03, 0.12]]) { ctx.beginPath(); ctx.arc(W * (0.86 + dx), H * (0.35 + dy), W * r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    this.drawLanded('tree');
    // 犬小屋
    ctx.fillStyle = '#d29a62'; ctx.fillRect(W * 0.05, H * 0.5, W * 0.24, H * 0.13); ctx.strokeRect(W * 0.05, H * 0.5, W * 0.24, H * 0.13);
    ctx.beginPath(); ctx.moveTo(W * 0.17, H * 0.43); ctx.lineTo(W * 0.31, H * 0.51); ctx.lineTo(W * 0.03, H * 0.51); ctx.closePath(); ctx.fillStyle = '#4f86f7'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.11, H * 0.63); ctx.lineTo(W * 0.11, H * 0.57); ctx.arc(W * 0.17, H * 0.57, W * 0.06, Math.PI, 0); ctx.lineTo(W * 0.23, H * 0.63); ctx.fillStyle = '#3a2a22'; ctx.fill(); ctx.stroke(); // 入り口
    this.drawLanded('dog');
    if (this.dog) this.drawDog(this.dog);
    for (const b of this.shoes) this.drawShoe(b.x, b.y, b.r, this.size(b.y), b.c);
    const last = this.shoes[this.shoes.length - 1];
    if (!last || last.y < g.by - 60 * s) this.drawShoe(W / 2, g.by, 0, 22 * s, '#ff9e3d'); // 次の靴
    for (const p of this.pops) { ctx.globalAlpha = Math.min(1, p.life * 2); bigText(p.say, clamp(p.x, W * 0.25, W * 0.75), p.y - 30 * s - (1 - p.life) * 30 * s, Math.round(24 * s), HOT, PAPER, W * 0.5); ctx.globalAlpha = 1; }
    hapBanner('イヌが飛び出してきた！', this.hapK);
  },
  drawDog(d) { // ハプニングのイヌ（横から見たところ。走る向きを向く。キャッチした靴をくわえる）
    const g = this.geo(), s = g.s, dir = d.vx >= 0 ? 1 : -1, k = Math.sin(clock * 18) * 6 * s;
    const jump = d.hold > 0 ? Math.sin(Math.PI * (1 - d.hold / 0.6)) * 26 * s : 0, y = g.dogY + 34 * s - jump;
    ctx.save(); ctx.translate(d.x, y); ctx.scale(dir, 1);
    ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(-14 * s, 6 * s); ctx.lineTo(-14 * s - k, 20 * s); ctx.moveTo(14 * s, 6 * s); ctx.lineTo(14 * s + k, 20 * s); ctx.stroke(); // 脚
    ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(-22 * s, -4 * s); ctx.quadraticCurveTo(-34 * s, -12 * s, -30 * s, -22 * s); ctx.stroke(); // しっぽ
    ctx.lineWidth = 3; ctx.fillStyle = '#f2d1a0';
    ctx.beginPath(); ctx.ellipse(0, 0, 24 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // 体
    ctx.beginPath(); ctx.arc(24 * s, -14 * s, 12 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // 頭
    ctx.fillStyle = '#b9824e'; ctx.beginPath(); ctx.ellipse(17 * s, -19 * s, 5 * s, 9 * s, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // 耳
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(28 * s, -17 * s, 2 * s, 0, Math.PI * 2); ctx.arc(36 * s, -12 * s, 3 * s, 0, Math.PI * 2); ctx.fill(); // 目と鼻
    ctx.restore();
    if (d.c) this.drawShoe(d.x + dir * 38 * s, y - 6 * s, dir * 0.3, 13 * s, d.c);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.3) % 1; finger(W / 2, g.by - p * g.by * 0.5, 0.9 * (1 - p * 0.6)); }
};

STAGE_LIST.push(graffiti, soda, pudding, sticker, shoe);
ZUKAN_EXTRA.push(
  { id: 'graffiti', name: '壁の芸術家', desc: '落書きを1回で6m描く', ok: t => (t.graffitiMax || 0) >= 6 },
  { id: 'soda', name: '人間噴水', desc: '炭酸を1回で1000mL噴き出させる', ok: t => (t.sodaMax || 0) >= 1000 },
  { id: 'pudding', name: 'つまみ食い名人', desc: 'プリンを1回で5個食べる', ok: t => (t.puddingMax || 0) >= 5 },
  { id: 'sticker', name: 'デコり職人', desc: 'シールを1回で20枚貼る', ok: t => (t.stickerMax || 0) >= 20 },
  { id: 'shoe', name: 'あーした天気になーれ', desc: '靴を1回で5個 屋根にのせる', ok: t => (t.shoeRoofMax || 0) >= 5 },
  { id: 'hapShoe', name: 'ナイスキャッチ', desc: '靴飛ばしでイヌが靴をキャッチする', secret: '靴飛ばしで、まれに起きる何か', ok: t => !!t.hapShoe }
);

/* ===== 第2弾（2026-10-24 追加） ===== */
Object.assign(sfx, {
  rip() { noise(0.18, rnd(1800, 2600), 0.6, 0.3); },
  suck() { tone(rnd(500, 700), 1400, 0.12, 0.08, 'sine'); noise(0.1, 3000, 0.8, 0.08, 'highpass'); },
  boing(k) { tone(160 + k * 200, 320 + k * 400, 0.18, 0.2, 'sine'); },
  snip() { noise(0.04, 5000, 2, 0.2, 'highpass'); tone(2400, 1800, 0.03, 0.05, 'square'); },
  blub() { tone(rnd(700, 1100), rnd(1300, 1700), 0.06, 0.05, 'sine'); },
  popb() { noise(0.04, rnd(3000, 4500), 2, 0.12, 'highpass'); }
});
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/* ---------- 大盛り6: 日めくりカレンダー ---------- */
const CAL_REBUY = 15, CAL_YEN = 1000; // 1回でこの枚数以上破ったら、カレンダーの買い直し
const calendar = {
  key: 'calendar', name: 'カレンダー', prompt: '破れ！', hint: 'ページを 下へ引っぱる', bg: '#efe3cf',
  bgm: song(150, [
    ['pluck', 0.09, '72 . 76 . 79 . 76 . 72 . 76 . 79 - . . 74 . 77 . 81 . 77 . 74 . 77 . 81 - . .'],
    ['triangle', 0.14, '48 . . . 55 . . . 48 . . . 55 . . . 50 . . . 57 . . . 50 . . . 57 . . .']
  ], ['k.h.s.h.k.h.s.hhk.h.s.h.k.h.s.h.']),
  shop: [['日めくりカレンダー', '日めくりカレンダー']],
  bill(t) { const n = t.calendar || 0, r = t.calendarRebuy || 0; return { v: n + '日', n: (r ? 'カレンダーの買い直し' + (r > 1 ? r + '冊' : '') + '・' : '') + '破った紙を拾う', sec: n * 3, yen: r * CAL_YEN }; },
  init() { this.n = 0; this.day = new Date(); this.ptr = {}; this.flying = []; this.pile = []; this.newYear = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '日'; },
  commit(tot) { add(tot, 'calendar', this.n); add(tot, 'calendarRebuy', this.n >= CAL_REBUY ? 1 : 0); mx(tot, 'calendarMax', this.n); },
  geo() { const s = SC(), w = Math.min(W * 0.62, 250 * s), h = w * 1.25; return { s, x: (W - w) / 2, y: H * 0.2, w, h }; },
  down(id, x, y) { this.ptr[id] = { x0: x, y0: y, x, y }; },
  move(id, x, y) {
    const p = this.ptr[id]; if (!p || p.done) return;
    p.x = x; p.y = y;
    if (y - p.y0 > 40 * SC()) { p.done = true; this.tear(x - p.x0); } // 少し下へ引っぱれば1枚。1回なぞって1枚（指を離すまで次は破れない）
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  tear(dx) {
    const g = this.geo();
    const dir = dx < 0 ? -1 : 1; // まっすぐ下に引いても、どちらかへ飛ぶ
    this.flying.push({ d: new Date(this.day), x: g.x, y: g.y, vx: dir * rnd(150, 300), vy: rnd(-80, 40), r: 0, vr: dir * rnd(2, 5) });
    const y0 = this.day.getFullYear(); this.day.setDate(this.day.getDate() + 1);
    if (this.day.getFullYear() !== y0) this.newYear = 1.6;
    if (scoring()) this.n++;
    sfx.rip();
  },
  update(dt) {
    this.newYear = Math.max(0, this.newYear - dt);
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.y > H * 0.78) { this.pile.push({ x: f.x + rnd(-20, 20), r: f.r, sun: f.d.getDay() === 0 }); if (this.pile.length > 120) this.pile.shift(); this.flying.splice(i, 1); }
    }
  },
  page(d, x, y, w, h) {
    const s = SC(), sun = d.getDay() === 0, sat = d.getDay() === 6;
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = sun ? HOT : sat ? '#4f86f7' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(w * 0.12)}px ${DISPLAY}`; ctx.fillText(d.getFullYear() + '年 ' + (d.getMonth() + 1) + '月', x + w / 2, y + h * 0.14);
    ctx.font = `${Math.round(w * 0.5)}px ${DISPLAY}`; ctx.fillText(d.getDate(), x + w / 2, y + h * 0.52);
    ctx.font = `${Math.round(w * 0.11)}px ${DISPLAY}`; ctx.fillText(WEEK[d.getDay()] + '曜日', x + w / 2, y + h * 0.86);
    ctx.textAlign = 'left';
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.8, W, H * 0.2); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.8 - 2, W, 3); // 床
    for (const p of this.pile) { ctx.save(); ctx.translate(p.x, H * 0.84); ctx.rotate(p.r); ctx.fillStyle = PAPER; ctx.fillRect(-18 * s, -12 * s, 36 * s, 24 * s); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-18 * s, -12 * s, 36 * s, 24 * s); ctx.restore(); }
    // 次のページ（下の束）と、今のページ。引っぱっている間は、引っぱった方向にめくれる
    ctx.fillStyle = '#d9d2c3'; ctx.fillRect(g.x + 4 * s, g.y + 6 * s, g.w, g.h);
    const p = Object.values(this.ptr)[0];
    const next = new Date(this.day); next.setDate(next.getDate() + 1);
    this.page(next, g.x, g.y, g.w, g.h);
    ctx.save();
    if (p && !p.done) { const dx = p.x - p.x0, dy = Math.max(0, p.y - p.y0); ctx.translate(g.x + g.w / 2, g.y); ctx.rotate(clamp(dx / 300, -0.35, 0.35) * Math.min(1, dy / (40 * s))); ctx.scale(1, 1 + Math.min(0.1, dy / 400)); ctx.translate(-(g.x + g.w / 2), -g.y); }
    this.page(this.day, g.x, g.y, g.w, g.h);
    ctx.restore();
    rr(g.x - 8 * s, g.y - 18 * s, g.w + 16 * s, 24 * s, 6 * s); ctx.fillStyle = '#3a2a22'; ctx.fill(); // とじ具
    ctx.beginPath(); ctx.arc(W / 2, g.y - 30 * s, 6 * s, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); // くぎ
    for (const f of this.flying) { ctx.save(); ctx.translate(f.x + g.w / 2, f.y + g.h / 2); ctx.rotate(f.r); ctx.scale(0.45, 0.45); this.page(f.d, -g.w / 2, -g.h / 2, g.w, g.h); ctx.restore(); }
    if (this.newYear > 0) bigText('来年に突入！', W / 2, H * 0.12, Math.round(34 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.3) % 1; finger(g.x + g.w * 0.75 + p * 50, g.y + g.h * 0.75 + p * 90, 0.9); }
};

/* ---------- 大盛り7: 掃除機 ---------- */
const VAC_LEGO = 10, VAC_YEN = 2000; // 1回でレゴをこの数以上吸ったら、詰まって修理
const VAC_SEC = 20; // 紙パックを開けて探す（1個）
const JUNK = [
  { k: 'sock', name: '靴下', c: '#ffffff' }, { k: 'lego', name: 'レゴ', c: '#ff5a4e' }, { k: 'lego', name: 'レゴ', c: '#4f86f7' },
  { k: 'marble', name: 'ビー玉', c: '#9fd3ef' }, { k: 'ring', name: 'イヤリング', c: '#ffd23f' }, { k: 'coin', name: '小銭', c: '#c7ced5' }
];
const vacuum = {
  key: 'vacuum', name: '掃除機', prompt: '吸え！', hint: '掃除機を 動かして吸う', bg: '#e8d6b8',
  bgm: song(140, [
    ['square', 0.04, '64 . 67 . 71 . 67 . 64 . 67 . 72 - . . 62 . 66 . 69 . 66 . 62 . 66 . 71 - . .'],
    ['sawtooth', 0.04, '40 40 . 40 47 . 40 . 40 40 . 40 47 . 40 . 38 38 . 38 45 . 38 . 38 38 . 38 45 . 38 .']
  ], ['k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.hh']),
  shop: [['掃除機の紙パック', '掃除機 紙パック']],
  bill(t) { const n = t.vacuum || 0, r = t.vacuumFix || 0; return { v: n + '個', n: (r ? '掃除機の修理' + (r > 1 ? r + '回' : '') + '・' : '') + '紙パックを開けて探す', sec: n * VAC_SEC, yen: r * VAC_YEN }; },
  init() { this.n = 0; this.lego = 0; this.hx = W / 2; this.hy = H * 0.8; this.ptr = null; this.items = []; this.sucking = []; this.spawn(16); this.hum = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'vacuum', this.n); add(tot, 'vacuumFix', this.lego >= VAC_LEGO ? 1 : 0); mx(tot, 'vacuumMax', this.n); },
  spawn(k) { for (let i = 0; i < k; i++) { const j = JUNK[Math.floor(Math.random() * JUNK.length)]; this.items.push({ ...j, x: rnd(W * 0.08, W * 0.92), y: rnd(H * 0.18, H * 0.72), r: rnd(0, 6) }); } },
  down(id, x, y) { if (this.ptr == null) this.ptr = id; this.tx = x; this.ty = y; },
  move(id, x, y) { if (id === this.ptr) { this.tx = x; this.ty = y; } },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  update(dt) {
    const s = SC();
    if (this.ptr != null) { // ヘッドは指の位置へ少し遅れてついてくる
      const k = 1 - Math.exp(-dt * 14); this.hx += (this.tx - this.hx) * k; this.hy += (this.ty - 30 * s - this.hy) * k;
      this.hum -= dt; if (this.hum <= 0) { noise(0.12, 900, 0.6, 0.05, 'bandpass'); this.hum = 0.1; }
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (Math.abs(it.x - this.hx) < 46 * s && Math.abs(it.y - this.hy) < 24 * s) {
          this.items.splice(i, 1); this.sucking.push({ ...it, t: 0 }); sfx.suck();
          if (scoring()) { this.n++; if (it.k === 'lego') this.lego++; }
        }
      }
      if (this.items.length < 6) this.spawn(8);
    }
    for (let i = this.sucking.length - 1; i >= 0; i--) { const q = this.sucking[i]; q.t += dt * 5; q.x += (this.hx - q.x) * 0.3; q.y += (this.hy - q.y) * 0.3; if (q.t >= 1) this.sucking.splice(i, 1); }
  },
  item(it, z) {
    const s = SC() * z; ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.r); ctx.fillStyle = it.c; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    if (it.k === 'sock') { ctx.beginPath(); ctx.moveTo(-8 * s, -14 * s); ctx.lineTo(4 * s, -14 * s); ctx.lineTo(4 * s, 4 * s); ctx.lineTo(14 * s, 6 * s); ctx.lineTo(14 * s, 14 * s); ctx.lineTo(-8 * s, 14 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (it.k === 'lego') { rr(-11 * s, -7 * s, 22 * s, 14 * s, 2 * s); ctx.fill(); ctx.stroke(); for (const dx of [-5, 5]) { ctx.beginPath(); ctx.arc(dx * s, -1 * s, 3 * s, 0, Math.PI * 2); ctx.stroke(); } }
    else if (it.k === 'ring') { ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, Math.PI * 2); ctx.lineWidth = 4 * s; ctx.strokeStyle = it.c; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -8 * s, 3 * s, 0, Math.PI * 2); ctx.fillStyle = '#ff9ecf'; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 0, (it.k === 'coin' ? 8 : 6) * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  },
  draw() {
    const s = SC();
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 2; for (let y = 0; y < H; y += 46 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } // フローリング
    for (const it of this.items) this.item(it, 1.5);
    for (const q of this.sucking) this.item(q, 1.5 * (1 - q.t));
    // ホースと本体（画面の下）
    ctx.strokeStyle = INK; ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.moveTo(W / 2, H + 10); ctx.quadraticCurveTo(W / 2, H * 0.9, this.hx, this.hy + 30 * s); ctx.stroke();
    ctx.strokeStyle = '#7a8a99'; ctx.lineWidth = 6 * s; ctx.stroke();
    rr(this.hx - 48 * s, this.hy - 14 * s, 96 * s, 28 * s, 8 * s); ctx.fillStyle = '#4f86f7'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    if (this.ptr != null) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 3; i++) { const a = (clock * 6 + i) % 1; ctx.beginPath(); ctx.arc(this.hx + (i - 1) * 24 * s, this.hy - 20 * s - a * 14 * s, 3 * s, 0, Math.PI * 2); ctx.fill(); } }
  },
  drawHint(t) { const p = (t * 0.8) % 1; finger(W * (0.3 + p * 0.4), H * 0.8 - p * H * 0.3, 0.9); }
};

/* ---------- 大盛り8: 布団トランポリン（自分の目線） ---------- */
const FUTON_G = 6;          // 重力（高さ1＝天井まで）
const FUTON_WIN = 0.15;     // 着地のこの秒数前までに押せば、タイミングが合ったことにする
const FUTON_SORRY = 5, FUTON_REDO = 7, FUTON_YEN = 2000; // 1回でこの回数以上跳ねたら、下の階へ謝りに行く／布団の打ち直し
const futon = {
  key: 'futon', name: '布団', prompt: '跳ねろ！', hint: '着地の瞬間に タップ', bg: '#f6e6c4',
  bgm: song(128, [
    ['wob', 0.11, '60 . . 67 . . 72 . 71 . . 67 . . 64 . 60 . . 67 . . 72 . 74 . . 72 . . . .'],
    ['triangle', 0.13, '36 . . . 43 . . . 36 . . . 43 . . . 41 . . . 48 . . . 43 . . . 43 . . .']
  ], ['k...s...k...s...k...s...k.k.s...']),
  shop: [['敷き布団', '敷き布団']],
  bill(t) {
    const n = t.futon || 0, c = t.futonCeil || 0, sorry = t.futonSorry || 0, redo = t.futonRedo || 0;
    return { v: n + '回', n: (redo ? '布団の打ち直し' + (redo > 1 ? redo + '回' : '') + '・' : '') + (sorry ? '下の階へ謝りに行く' : 'シーツを直す') + (c ? '・天井の手あとふき' : ''), sec: (t.futonSec || 0) + c * 60, yen: redo * FUTON_YEN };
  },
  init() { this.n = 0; this.ceil = 0; this.h = 0; this.v = 0; this.peak = 0.25; this.tap = -9; this.say = ''; this.sayT = 0; this.hand = 0; this.go = false; this.early = false; this.landT = -9; },
  started() { return this.n > 0; },
  result() { return this.n + '回'; },
  commit(tot) { // 謝りに行く（15分）なら、シーツを直す時間（1回10秒）は数えない
    add(tot, 'futon', this.n); add(tot, 'futonCeil', this.ceil); add(tot, 'futonSorry', this.n >= FUTON_SORRY ? 1 : 0); add(tot, 'futonRedo', this.n >= FUTON_REDO ? 1 : 0);
    add(tot, 'futonSec', this.n >= FUTON_SORRY ? 900 : this.n * 10);
  },
  down() { // 最初のタップで跳び始める。そのあとは着地の直前（FUTON_WIN 秒以内）に押すと高く跳ぶ
    if (!this.go) { this.go = true; this.v = Math.sqrt(2 * FUTON_G * this.peak); this.tap = clock; return; }
    if (clock - this.landT < 0.2) { this.say = 'おそい！'; this.sayT = 0.6; return; } // 着地したあとに押した
    if (this.landIn() > FUTON_WIN) this.early = true; // 早すぎ（連打もここに入る）
    else this.tap = clock;
  },
  landIn() { return this.go ? (this.v + Math.sqrt(this.v * this.v + 2 * FUTON_G * this.h)) / FUTON_G : Infinity; }, // 着地までの秒
  move() {}, up() {},
  update(dt) {
    this.sayT = Math.max(0, this.sayT - dt); this.hand = Math.max(0, this.hand - dt);
    if (!this.go) return;
    this.v -= FUTON_G * dt; this.h += this.v * dt;
    if (this.h >= 1 && this.v > 0) { this.h = 1; this.v = 0; this.hand = 0.5; sfx.thud(); if (scoring()) this.ceil++; this.say = '天井タッチ！'; this.sayT = 0.8; }
    if (this.h <= 0 && this.v < 0) { // 着地。直前に押していれば高くなり、押していなければ低くなる
      this.h = 0;
      const e = clock - this.tap;
      if (!this.early && e >= 0 && e <= FUTON_WIN) { const q = 1 - e / FUTON_WIN; this.peak = Math.min(1.1, this.peak + 0.12 + 0.18 * q); this.say = q > 0.6 ? 'ぴったり！' : 'いいね！'; }
      else { this.peak = Math.max(0.15, this.peak * 0.75); this.say = this.early ? 'はやい！' : ''; }
      this.sayT = 0.6; this.tap = -9; this.early = false; this.landT = clock;
      this.v = Math.sqrt(2 * FUTON_G * this.peak);
      if (scoring()) this.n++;
      sfx.boing(Math.min(1, this.peak));
    }
  },
  photo(x, y, w, h, who) { // 額に入った写真。顔の色と形は、ハプニングのイヌ（泥んこ足）・ネコ（障子）に合わせる
    const s = SC(), cx = x + w / 2, cy = y + h * 0.56, R = Math.min(w, h) * 0.3;
    rr(x, y, w, h, 4 * s); ctx.fillStyle = '#b97a45'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = who === 'dog' ? '#cfe8c4' : '#ffe1ea'; ctx.fillRect(x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s); ctx.strokeRect(x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s);
    if (who === 'dog') {
      ctx.fillStyle = '#e8c39e'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a5a32'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + k * R * 0.95, cy - R * 0.1, R * 0.32, R * 0.6, -k * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } // たれ耳
      ctx.fillStyle = '#f6e3cc'; ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.35, R * 0.45, R * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + k * R * 0.38, cy - R * 0.15, R * 0.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.22, R * 0.16, R * 0.11, 0, 0, Math.PI * 2); ctx.fill(); // 鼻
      ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.58, R * 0.12, R * 0.16, 0, 0, Math.PI * 2); ctx.fill(); // 舌
    } else {
      ctx.fillStyle = '#f2a65a';
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + k * R * 0.9, cy - R * 0.3); ctx.lineTo(cx + k * R * 0.6, cy - R * 1.3); ctx.lineTo(cx + k * R * 0.1, cy - R * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + k * R * 0.38, cy - R * 0.1, R * 0.1, R * 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.moveTo(cx - R * 0.1, cy + R * 0.15); ctx.lineTo(cx + R * 0.1, cy + R * 0.15); ctx.lineTo(cx, cy + R * 0.28); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.5; ctx.beginPath(); for (const k of [-1, 1]) for (const dy of [0.2, 0.35]) { ctx.moveTo(cx + k * R * 0.25, cy + R * dy); ctx.lineTo(cx + k * R * 0.85, cy + R * (dy + (dy - 0.27))); } ctx.stroke(); // ひげ
    }
    ctx.lineWidth = 3;
  },
  draw() {
    const s = SC(), cam = this.h * H * 0.75; // 高く跳ぶほど部屋が下へ流れ、天井が近づく
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, cam);
    const ceilY = -H * 0.55;
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, ceilY - H, W, H); ctx.fillStyle = INK; ctx.fillRect(0, ceilY - 2, W, 4); // 天井
    ctx.beginPath(); ctx.arc(W / 2, ceilY + 16 * s, 26 * s, 0, Math.PI); ctx.fillStyle = POP; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); // 電灯
    this.photo(W * 0.1, H * 0.06, W * 0.34, H * 0.2, 'dog'); this.photo(W * 0.56, H * 0.1, W * 0.34, H * 0.2, 'cat'); // 壁の写真（泥んこ足のイヌと、障子のネコ）
    ctx.fillStyle = '#ffffff'; rr(-10, H * 0.72, W + 20, H * 0.4, 30 * s); ctx.fill(); ctx.stroke(); // 布団
    ctx.fillStyle = '#4f86f7'; for (let x = 0; x < W; x += 40 * s) ctx.fillRect(x, H * 0.76, 20 * s, 6 * s);
    ctx.restore();
    if (this.hand > 0) { ctx.globalAlpha = this.hand * 2; ctx.fillStyle = '#f2c9a0'; for (const x of [0.35, 0.65]) { ctx.beginPath(); ctx.arc(W * x, H * 0.08, 22 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.globalAlpha = 1; }
    // 着地までの目安：輪が縮んで、中の円と重なった瞬間が着地
    if (this.go && this.v < 0) {
      const tl = this.landIn();
      const r = 28 * s + Math.min(1, tl / 0.6) * 70 * s;
      ctx.beginPath(); ctx.arc(W / 2, H * 0.6, 28 * s, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,90,78,.25)'; ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2, H * 0.6, r, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = HOT; ctx.stroke();
    }
    // 高さのメーター
    rr(W - 22 * s, H * 0.2, 10 * s, H * 0.5, 5 * s); ctx.fillStyle = 'rgba(35,27,46,.15)'; ctx.fill();
    rr(W - 22 * s, H * 0.7 - H * 0.5 * Math.min(1, this.h), 10 * s, H * 0.5 * Math.min(1, this.h), 5 * s); ctx.fillStyle = HOT; ctx.fill();
    if (this.sayT > 0 && this.say) bigText(this.say, W / 2, H * 0.45, Math.round(34 * s), HOT, PAPER, W * 0.8);
  },
  drawHint(t) { tapHint(W / 2, H * 0.6, t, 1.6); }
};

/* ---------- 大盛り9: 新聞を切り刻む ---------- */
const NEWS_SPAN = 0.5; // 新聞の幅のこの割合を1回でなぞれたら、1本切れる
const NEWS_YEN = 150;  // 切った新聞（1回のステージで1部）の買い直し
const NEWS_SEC = 30;   // 紙くずのそうじ（1本）
const news = {
  key: 'news', name: '新聞', prompt: '切れ！', hint: 'ハサミで 新聞を横に切る', bg: '#dfe9f0',
  bgm: song(132, [
    ['bell', 0.06, '84 . . 79 . . 76 . 77 . . 81 . . 79 . 84 . . 79 . . 76 . 74 . . 77 . . 72 .'],
    ['triangle', 0.13, '48 . 55 . 52 . 55 . 53 . 57 . 55 . 59 . 48 . 55 . 52 . 55 . 50 . 55 . 43 . 47 .']
  ], ['k..hs..hk..hs.hhk..hs..hk.k.s..h']),
  shop: [['ほうきとちりとり', 'ほうき ちりとり セット']],
  bill(t) { const n = t.news || 0, p = t.newsPaper || 0; return { v: n + '本', n: (p ? 'パパの新聞を' + p + '部買い直す・' : '') + '紙くずをそうじ', sec: n * NEWS_SEC, yen: p * NEWS_YEN }; },
  init() { this.n = 0; this.ptr = null; this.sx = W / 2; this.sy = H * 0.85; this.strips = []; this.slide = 0; this.reset(); },
  reset() { const g = this.geo(); this.bottom = g.top + g.h; },
  started() { return this.n > 0; },
  result() { return this.n + '本'; },
  commit(tot) { add(tot, 'news', this.n); add(tot, 'newsPaper', this.n > 0 ? 1 : 0); mx(tot, 'newsMax', this.n); },
  geo() { const s = SC(), x = W * 0.12, w = W * 0.76, top = H * 0.12, h = H * 0.64; return { s, x, w, top, h }; },
  down(id, x, y) { if (this.ptr == null) { this.ptr = id; this.cut = { y, xa: x, xb: x }; } this.sx = x; this.sy = y; },
  move(id, x, y) {
    if (id !== this.ptr) return;
    const g = this.geo(), c = this.cut;
    this.sx = x; this.sy = y;
    if (Math.abs(y - c.y) > 30 * g.s) { this.cut = { y, xa: x, xb: x }; return; } // 高さが大きくずれたら、そこから切り直し
    c.xa = Math.min(c.xa, x); c.xb = Math.max(c.xb, x);
    if (Math.random() < 0.3) sfx.snip();
    const lo = Math.max(c.xa, g.x), hi = Math.min(c.xb, g.x + g.w);
    if (hi - lo >= g.w * NEWS_SPAN && c.y > g.top + 16 * g.s && c.y < this.bottom - 8 * g.s && this.slide === 0) { // 横に切れた。線から下が落ちる
      this.strips.push({ y0: c.y, y1: this.bottom, x: 0, y: 0, vx: rnd(-60, 60), vy: rnd(0, 80), r: 0, vr: rnd(-1.5, 1.5) });
      this.bottom = c.y;
      if (scoring()) this.n++;
      sfx.rip();
      this.cut = { y, xa: x, xb: x };
      if (this.bottom - g.top < g.h * 0.15) this.slide = 1; // 短くなりすぎたら、次のページ
    }
  },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  update(dt) {
    if (this.slide > 0) { this.slide = Math.max(0, this.slide - dt / 0.35); if (this.slide === 0) this.reset(); }
    for (let i = this.strips.length - 1; i >= 0; i--) { const t = this.strips[i]; t.vy += 900 * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.r += t.vr * dt; if (t.y > H) this.strips.splice(i, 1); }
  },
  paper(y0, y1) { // 新聞の y0〜y1 の部分（見出し・写真・記事の行）
    const g = this.geo(), s = g.s;
    ctx.save(); ctx.beginPath(); ctx.rect(g.x - 2, y0, g.w + 4, y1 - y0); ctx.clip();
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(g.x, g.top, g.w, g.h); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(g.x, g.top, g.w, g.h);
    ctx.fillStyle = INK; ctx.font = `${Math.round(30 * s)}px ${DISPLAY}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('朝刊', g.x + g.w - 12 * s, g.top + 10 * s); ctx.textAlign = 'left';
    ctx.fillRect(g.x + 12 * s, g.top + 50 * s, g.w - 24 * s, 3);
    ctx.font = `${Math.round(22 * s)}px ${DISPLAY}`; ctx.fillText('いたずら、ふえる', g.x + 14 * s, g.top + 62 * s);
    ctx.fillStyle = '#b8c4cc'; ctx.fillRect(g.x + 14 * s, g.top + 100 * s, g.w * 0.42, g.h * 0.24); ctx.strokeRect(g.x + 14 * s, g.top + 100 * s, g.w * 0.42, g.h * 0.24); // 写真
    ctx.fillStyle = '#8f8a80';
    for (let yy = g.top + 100 * s; yy < g.top + g.h - 10 * s; yy += 9 * s) { // 記事の行
      const left = yy < g.top + 100 * s + g.h * 0.24 + 6 * s ? g.x + g.w * 0.42 + 24 * s : g.x + 14 * s;
      ctx.fillRect(left, yy, g.x + g.w - 14 * s - left, 3 * s);
    }
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.8, W, H * 0.2); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.8 - 2, W, 3);
    ctx.save(); if (this.slide > 0) ctx.translate(-(1 - this.slide) * W, 0); this.paper(g.top, this.bottom); ctx.restore();
    if (this.slide > 0) { ctx.save(); ctx.translate(this.slide * W, 0); this.paper(g.top, g.top + g.h); ctx.restore(); }
    for (const t of this.strips) { ctx.save(); const cy = (t.y0 + t.y1) / 2; ctx.translate(t.x + W / 2, t.y + cy); ctx.rotate(t.r); ctx.translate(-W / 2, -cy); this.paper(t.y0, t.y1); ctx.restore(); }
    const c = this.cut;
    if (this.ptr != null && c && c.xb > c.xa) { ctx.setLineDash([6 * s, 5 * s]); ctx.lineWidth = 2; ctx.strokeStyle = HOT; ctx.beginPath(); ctx.moveTo(Math.max(c.xa, g.x), c.y); ctx.lineTo(Math.min(c.xb, g.x + g.w), c.y); ctx.stroke(); ctx.setLineDash([]); } // 切りかけの線
    // ハサミ
    const op = this.ptr != null ? Math.abs(Math.sin(clock * 20)) * 0.4 : 0.35;
    ctx.save(); ctx.translate(this.sx, this.sy); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * op); ctx.fillStyle = '#c7ced5'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-44 * s, -4 * s); ctx.lineTo(0, 4 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(14 * s, k * 10 * s, 8 * s, 0, Math.PI * 2); ctx.fillStyle = HOT; ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  },
  drawHint(t) { const g = this.geo(), p = (t * 0.9) % 1; finger(g.x + p * g.w, g.top + g.h * 0.75, 0.9); }
};

/* ---------- 大盛り10: シャボン玉 ---------- */
const BUBBLE_PER = 50, BUBBLE_YEN = 100; // シャボン液1本で吹ける数と値段
const BUBBLE_SEC = 10; // 家具と床をふく（1個）
const bubble = {
  key: 'bubble', name: 'シャボン玉', prompt: 'ふけ！', hint: '押したまま 向きを変える', bg: '#e9f3ea',
  bgm: song(120, [
    ['bub', 0.1, '79 . 84 . 88 . 84 . 79 . 84 . 91 . . . 77 . 81 . 86 . 81 . 77 . 81 . 89 . . .'],
    ['ep', 0.1, '48 . . . 52 . . . 55 . . . 52 . . . 50 . . . 53 . . . 57 . . . 53 . . .']
  ], ['k...h.h.s...h...k...h.h.s...h.h.']),
  shop: [['シャボン玉液', 'シャボン玉 液']],
  bill(t) { const n = t.bubble || 0, b = t.bubbleBottle || 0; return { v: n + '個', n: '家具と床をふく' + (b ? '・シャボン液 ' + b + '本' : ''), sec: n * BUBBLE_SEC, yen: b * BUBBLE_YEN }; },
  init() { this.n = 0; this.blown = 0; this.bs = []; this.spots = []; this.ptr = null; this.tx = W / 2; this.ty = H * 0.4; this.acc = 0; },
  started() { return this.blown > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'bubble', this.n); add(tot, 'bubbleBottle', Math.ceil(this.blown / BUBBLE_PER)); mx(tot, 'bubbleMax', this.n); },
  geo() { const s = SC(); return { s, wx: W / 2, wy: H * 0.86, things: [ // 当たると割れて跡がつく家具（x, y, w, h, 種類）
    [W * 0.04, H * 0.2, W * 0.34, H * 0.48, 'cabinet'], [W * 0.6, H * 0.33, W * 0.36, H * 0.19, 'tv'], [W * 0.6, H * 0.52, W * 0.36, H * 0.16, 'stand'], [W * 0.43, H * 0.06, W * 0.14, W * 0.14, 'clock']] }; },
  furniture(t) { // 食器棚・テレビ・テレビ台・壁時計
    const s = SC(), [x, y, w, h, k] = t;
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    if (k === 'cabinet') {
      rr(x, y, w, h, 4 * s); ctx.fillStyle = '#b97a45'; ctx.fill(); ctx.stroke();
      const gy = y + 8 * s, gh = h * 0.55;
      for (const dx of [0, 1]) { // ガラス戸の中にお皿とコップ
        const gx = x + 8 * s + dx * (w - 16 * s) / 2, gw = (w - 16 * s) / 2 - 4 * s;
        ctx.fillStyle = '#d8eef7'; ctx.fillRect(gx, gy, gw, gh); ctx.strokeRect(gx, gy, gw, gh);
        ctx.fillStyle = INK; ctx.fillRect(gx, gy + gh * 0.5, gw, 3);
        ctx.fillStyle = PAPER; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(gx + gw * (0.3 + i * 0.4), gy + gh * 0.4, gw * 0.16, gw * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#ff9ecf'; for (let i = 0; i < 2; i++) { ctx.fillRect(gx + gw * (0.2 + i * 0.4), gy + gh * 0.75, gw * 0.2, gh * 0.22); ctx.strokeRect(gx + gw * (0.2 + i * 0.4), gy + gh * 0.75, gw * 0.2, gh * 0.22); }
      }
      for (let i = 0; i < 2; i++) { const dy = gy + gh + 8 * s + i * (h - gh - 24 * s) / 2; ctx.fillStyle = '#d29a62'; ctx.fillRect(x + 8 * s, dy, w - 16 * s, (h - gh - 24 * s) / 2 - 4 * s); ctx.strokeRect(x + 8 * s, dy, w - 16 * s, (h - gh - 24 * s) / 2 - 4 * s); ctx.fillStyle = INK; ctx.fillRect(x + w / 2 - 10 * s, dy + 8 * s, 20 * s, 4 * s); } // 引き出し
    } else if (k === 'tv') {
      rr(x, y, w, h, 6 * s); ctx.fillStyle = '#2f2a3a'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4f86f7'; ctx.fillRect(x + 8 * s, y + 8 * s, w - 16 * s, h - 16 * s); // 画面
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + 14 * s, y + 12 * s); ctx.lineTo(x + w * 0.4, y + 12 * s); ctx.lineTo(x + 14 * s, y + h * 0.6); ctx.closePath(); ctx.fill();
    } else if (k === 'stand') {
      ctx.fillStyle = '#8a5a35'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#b97a45'; ctx.fillRect(x + 6 * s, y + 6 * s, w / 2 - 9 * s, h - 12 * s); ctx.strokeRect(x + 6 * s, y + 6 * s, w / 2 - 9 * s, h - 12 * s); ctx.fillRect(x + w / 2 + 3 * s, y + 6 * s, w / 2 - 9 * s, h - 12 * s); ctx.strokeRect(x + w / 2 + 3 * s, y + 6 * s, w / 2 - 9 * s, h - 12 * s);
    } else { // 壁時計
      const r = w / 2; ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r, y + r); ctx.lineTo(x + r, y + r * 0.35); ctx.moveTo(x + r, y + r); ctx.lineTo(x + r * 1.5, y + r); ctx.stroke();
    }
  },
  down(id, x, y) { if (this.ptr == null) this.ptr = id; this.tx = x; this.ty = y; },
  move(id, x, y) { if (id === this.ptr) { this.tx = x; this.ty = y; } },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  update(dt) {
    const g = this.geo(), s = g.s;
    if (this.ptr != null) { // 押している間、指の方向へ吹き続ける
      this.acc += dt * 14;
      while (this.acc >= 1) {
        this.acc -= 1;
        const a = Math.atan2(this.ty - g.wy, this.tx - g.wx) + rnd(-0.25, 0.25), sp = rnd(220, 340) * s;
        this.bs.push({ x: g.wx, y: g.wy - 30 * s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(16, 34) * s, life: rnd(2.5, 4), ph: rnd(0, 6) });
        if (scoring()) this.blown++; sfx.blub();
      }
    }
    for (let i = this.bs.length - 1; i >= 0; i--) {
      const b = this.bs[i];
      b.vx *= Math.exp(-dt * 1.2); b.vy = b.vy * Math.exp(-dt * 1.2) - 12 * s * dt; b.x += b.vx * dt + Math.sin(clock * 3 + b.ph) * 12 * s * dt; b.y += b.vy * dt; b.life -= dt;
      const hit = g.things.find(t => b.x > t[0] - b.r * 0.5 && b.x < t[0] + t[2] + b.r * 0.5 && b.y > t[1] - b.r * 0.5 && b.y < t[1] + t[3] + b.r * 0.5);
      if (hit || b.life <= 0 || b.y < -40 || b.x < -40 || b.x > W + 40) {
        if (hit) { this.spots.push({ x: b.x, y: b.y, r: b.r }); if (this.spots.length > 150) this.spots.shift(); if (scoring()) this.n++; sfx.popb(); }
        this.bs.splice(i, 1);
      }
    }
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.68, W, H * 0.32); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.68 - 2, W, 3);
    for (const t of g.things) this.furniture(t);
    for (const p of this.spots) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill(); }
    for (const b of this.bs) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(180,220,255,.25)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,140,220,.8)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    }
    // ストロー（輪）。指の方を向く
    const a = Math.atan2(this.ty - g.wy, this.tx - g.wx);
    ctx.save(); ctx.translate(g.wx, g.wy); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#ff9ecf'; ctx.fillRect(-4 * s, 0, 8 * s, 60 * s); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(-4 * s, 0, 8 * s, 60 * s);
    ctx.beginPath(); ctx.arc(0, -10 * s, 14 * s, 0, Math.PI * 2); ctx.lineWidth = 5 * s; ctx.strokeStyle = '#ff5a9e'; ctx.stroke();
    ctx.restore();
  },
  drawHint(t) { const p = (t * 0.7) % 1; finger(W * (0.25 + p * 0.5), H * 0.45, 0.9); }
};

STAGE_LIST.push(calendar, vacuum, futon, news, bubble);
ZUKAN_EXTRA.push(
  { id: 'calendar', name: '未来人', desc: 'カレンダーを1回で25日めくる', ok: t => (t.calendarMax || 0) >= 25 },
  { id: 'vacuum', name: 'なんでも吸引', desc: '掃除機で1回で40個吸う', ok: t => (t.vacuumMax || 0) >= 40 },
  { id: 'futon', name: '天井タッチ', desc: '布団で跳ねて天井に手が届く', ok: t => (t.futonCeil || 0) >= 1 },
  { id: 'news', name: 'シュレッダー', desc: '新聞を1回で20本に切る', ok: t => (t.newsMax || 0) >= 20 },
  { id: 'bubble', name: 'シャボン職人', desc: 'シャボン玉を1回で70個 家具に当てる', ok: t => (t.bubbleMax || 0) >= 70 }
);

/* ===== 第3弾（2026-10-24 追加） ===== */
Object.assign(sfx, {
  key(m) { const f = mtof(m); tone(f, f, 0.9, 0.09, 'triangle'); tone(f * 2, f * 2, 0.35, 0.03, 'sine'); },
  knock() { tone(90, 45, 0.18, 0.55, 'sine'); noise(0.12, 300, 0.8, 0.45, 'lowpass'); },
  whump() { noise(0.16, rnd(400, 600), 0.7, 0.4, 'lowpass'); tone(130, 70, 0.1, 0.15, 'sine'); },
  click() { tone(2200, 1400, 0.02, 0.14, 'square'); noise(0.025, 4500, 2, 0.18, 'highpass'); }
});
function catHead(cx, cy, R) { // ネコの顔（障子・布団の写真のネコと同じ顔）
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#f2a65a';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + k * R * 0.9, cy - R * 0.3); ctx.lineTo(cx + k * R * 0.6, cy - R * 1.3); ctx.lineTo(cx + k * R * 0.1, cy - R * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + k * R * 0.38, cy - R * 0.1, R * 0.1, R * 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.moveTo(cx - R * 0.1, cy + R * 0.15); ctx.lineTo(cx + R * 0.1, cy + R * 0.15); ctx.lineTo(cx, cy + R * 0.28); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 1.5; ctx.beginPath(); for (const k of [-1, 1]) for (const dy of [0.2, 0.35]) { ctx.moveTo(cx + k * R * 0.25, cy + R * dy); ctx.lineTo(cx + k * R * 0.85, cy + R * (dy + (dy - 0.27))); } ctx.stroke();
  ctx.lineWidth = 3;
}

/* ---------- 大盛り11: 夜中のピアノ ---------- */
const PIANO_SORRY = 65, PIANO_YEN = 1000; // 1回でこの音数以上鳴らしたら、お隣へお詫び（菓子折り）
const PIANO_KEYS = 12, PIANO_LO = 60;     // 白鍵の数と、いちばん左の音（ド）
const P_WHITE = [0, 2, 4, 5, 7, 9, 11], P_BLACK = [1, 1, 0, 1, 1, 1, 0]; // 白鍵の音、右に黒鍵があるか
const piano = {
  key: 'piano', name: 'ピアノ', prompt: '弾け！', hint: '鍵盤を なぞる・たたく', bg: '#1d2340',
  bgm: song(84, [
    ['bell', 0.035, '72 . . . 76 . . . 79 . . . 76 . . . 74 . . . 77 . . . 81 . . . 77 . . .'],
    ['ep', 0.05, '48 . . . . . . . 55 . . . . . . . 50 . . . . . . . 55 . . . . . . .']
  ], ['.']),
  shop: [['ピアノの防音マット', 'ピアノ 防音マット']],
  bill(t) { const n = t.piano || 0, s = t.pianoSorry || 0; return { v: n + '音', n: s ? 'お隣へお詫び（菓子折り）' : '起こした家族に謝る', sec: t.pianoSec || 0, yen: s * PIANO_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.lit = {}; this.notes = []; this.don = 0; this.nextDon = PIANO_SORRY; },
  started() { return this.n > 0; },
  result() { return this.n + '音'; },
  commit(tot) { add(tot, 'piano', this.n); add(tot, 'pianoSorry', this.n >= PIANO_SORRY ? 1 : 0); add(tot, 'pianoSec', this.n >= PIANO_SORRY ? 600 : this.n > 0 ? 300 : 0); mx(tot, 'pianoMax', this.n); },
  geo() { const s = SC(), x = W * 0.04, w = W * 0.92, y = H * 0.62, h = Math.min(H * 0.24, 190 * s); return { s, x, w, y, h, kw: w / PIANO_KEYS }; },
  keyAt(x, y) { // 黒鍵（上の6割）を先に見る
    const g = this.geo(); if (x < g.x || x > g.x + g.w || y < g.y || y > g.y + g.h) return null;
    const i = Math.min(PIANO_KEYS - 1, Math.floor((x - g.x) / g.kw)), o = Math.floor(i / 7) * 12, j = i % 7;
    if (y < g.y + g.h * 0.6) {
      const fx = (x - g.x) / g.kw - i;
      if (fx > 0.7 && P_BLACK[j] && i < PIANO_KEYS - 1) return PIANO_LO + o + P_WHITE[j] + 1;
      if (fx < 0.3 && j > 0 && P_BLACK[j - 1]) return PIANO_LO + o + P_WHITE[j] - 1;
      if (fx < 0.3 && j === 0 && i > 0) return PIANO_LO + o - 1;
    }
    return PIANO_LO + o + P_WHITE[j];
  },
  hit(m) {
    if (m == null) return;
    sfx.key(m); this.lit[m] = 0.18;
    const g = this.geo();
    if (this.notes.length < 24) this.notes.push({ x: rnd(g.x + 20 * g.s, g.x + g.w - 20 * g.s), y: H * 0.43, vy: rnd(-90, -60) * g.s, t: 0, k: Math.random() < 0.5 ? '♪' : '♫' });
    if (scoring()) { this.n++; if (this.n >= this.nextDon) { this.don = 0.7; this.nextDon += 40; sfx.knock(); setTimeout(() => sfx.knock(), 160); } }
  },
  down(id, x, y) { const m = this.keyAt(x, y); this.ptr[id] = m; this.hit(m); },
  move(id, x, y) { if (!(id in this.ptr)) return; const m = this.keyAt(x, y); if (m !== this.ptr[id]) { this.ptr[id] = m; this.hit(m); } },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  update(dt) {
    for (const k in this.lit) { this.lit[k] -= dt; if (this.lit[k] <= 0) delete this.lit[k]; }
    for (let i = this.notes.length - 1; i >= 0; i--) { const q = this.notes[i]; q.t += dt; q.y += q.vy * dt; if (q.t > 1.4) this.notes.splice(i, 1); }
    this.don = Math.max(0, this.don - dt);
  },
  draw() {
    const g = this.geo(), s = g.s, shake = this.don > 0 && !calm ? Math.sin(clock * 90) * 6 * this.don : 0;
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = this.bg; ctx.fillRect(-10, 0, W + 20, H);
    // 窓：月と星と、お向かいの家。鳴らすほど窓の明かりがつく
    const wx = W * 0.52, wy = H * 0.14, ww = W * 0.42, wh = H * 0.24;
    ctx.fillStyle = '#0d1230'; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = POP; ctx.beginPath(); ctx.arc(wx + ww * 0.8, wy + wh * 0.22, 14 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d1230'; ctx.beginPath(); ctx.arc(wx + ww * 0.8 + 6 * s, wy + wh * 0.22 - 4 * s, 12 * s, 0, Math.PI * 2); ctx.fill(); // 三日月
    ctx.fillStyle = PAPER; for (let i = 0; i < 6; i++) { ctx.fillRect(wx + ww * sr(i), wy + wh * 0.45 * sr(i + 9), 2 * s, 2 * s); }
    ctx.fillStyle = '#2b2f4a'; ctx.beginPath(); ctx.moveTo(wx + ww * 0.05, wy + wh); ctx.lineTo(wx + ww * 0.05, wy + wh * 0.62); ctx.lineTo(wx + ww * 0.35, wy + wh * 0.4); ctx.lineTo(wx + ww * 0.65, wy + wh * 0.62); ctx.lineTo(wx + ww * 0.65, wy + wh); ctx.closePath(); ctx.fill(); // お向かいの家
    const lights = Math.min(4, Math.floor(this.n / 15));
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i < lights ? POP : '#161a33'; ctx.fillRect(wx + ww * (0.12 + (i % 2) * 0.3), wy + wh * (0.68 + Math.floor(i / 2) * 0.16), ww * 0.14, wh * 0.1); }
    ctx.lineWidth = 4; ctx.strokeStyle = '#6b5a48'; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    // 壁時計（夜11時40分）
    const cx = W * 0.25, cy = H * 0.3, R = 34 * s;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#d8d2c0'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-Math.PI / 2 + (11 + 40 / 60) / 12 * Math.PI * 2) * R * 0.5, cy + Math.sin(-Math.PI / 2 + (11 + 40 / 60) / 12 * Math.PI * 2) * R * 0.5);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-Math.PI / 2 + 40 / 60 * Math.PI * 2) * R * 0.8, cy + Math.sin(-Math.PI / 2 + 40 / 60 * Math.PI * 2) * R * 0.8); ctx.stroke();
    ctx.font = `${Math.round(15 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c9cbe0'; ctx.fillText('夜11:40', cx, cy + R + 16 * s); ctx.textAlign = 'left';
    // ピアノ（アップライト）。手元のスタンドの明かりだけ
    const grd = ctx.createRadialGradient(W / 2, g.y, 10, W / 2, g.y, W * 0.7); grd.addColorStop(0, 'rgba(255,220,140,.35)'); grd.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, H * 0.3, W, H * 0.7);
    rr(g.x - 6 * s, H * 0.44, g.w + 12 * s, g.y - H * 0.44 + 10 * s, 8 * s); ctx.fillStyle = '#3a2418'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = PAPER; ctx.fillRect(W / 2 - 50 * s, H * 0.47, 100 * s, g.y - H * 0.47 - 12 * s); ctx.strokeRect(W / 2 - 50 * s, H * 0.47, 100 * s, g.y - H * 0.47 - 12 * s); // 楽譜
    ctx.fillStyle = INK; for (let i = 0; i < 4; i++) ctx.fillRect(W / 2 - 42 * s, H * 0.49 + i * 9 * s, 84 * s, 1.5);
    ctx.fillStyle = '#3a2418'; ctx.fillRect(g.x - 6 * s, g.y + g.h, g.w + 12 * s, H - g.y - g.h); ctx.strokeRect(g.x - 6 * s, g.y + g.h, g.w + 12 * s, H - g.y - g.h);
    ctx.fillStyle = POP2; for (const k of [-1, 0, 1]) { rr(W / 2 + k * 34 * s - 9 * s, H - 26 * s, 18 * s, 12 * s, 4 * s); ctx.fill(); ctx.stroke(); } // ペダル
    for (let i = 0; i < PIANO_KEYS; i++) {
      const m = PIANO_LO + Math.floor(i / 7) * 12 + P_WHITE[i % 7];
      ctx.fillStyle = this.lit[m] ? POP : PAPER; ctx.fillRect(g.x + i * g.kw, g.y, g.kw, g.h); ctx.lineWidth = 2; ctx.strokeRect(g.x + i * g.kw, g.y, g.kw, g.h);
    }
    for (let i = 0; i < PIANO_KEYS - 1; i++) if (P_BLACK[i % 7]) {
      const m = PIANO_LO + Math.floor(i / 7) * 12 + P_WHITE[i % 7] + 1;
      ctx.fillStyle = this.lit[m] ? HOT : INK; ctx.fillRect(g.x + (i + 0.7) * g.kw, g.y, g.kw * 0.6, g.h * 0.6);
    }
    ctx.font = `${Math.round(30 * s)}px ${DISPLAY}`; ctx.textAlign = 'center';
    for (const q of this.notes) { ctx.globalAlpha = 1 - q.t / 1.4; ctx.fillStyle = POP; ctx.fillText(q.k, q.x, q.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
    if (this.don > 0) bigText('ドンッ！（壁）', W / 2, H * 0.4, Math.round(40 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 0.9) % 1; finger(g.x + g.w * (0.1 + p * 0.8), g.y + g.h * 0.8, 0.9); }
};

/* ---------- 大盛り12: 枕をふりまわす ---------- */
const PILLOW_RIP = 280, PILLOW_YEN = 1000; // 1回で羽がこの枚数以上出たら、枕が破れて買い直し
const PILLOW_SEC = 1;  // 羽を拾う（1枚）
const PILLOW_SWING = 400, PILLOW_PUFF = 50; // この速さ px/秒（SC()）より速く振りまわすと、この長さ px（SC()）動くたびに羽が1枚こぼれる
const pillow = {
  key: 'pillow', name: '枕', prompt: 'ふりまわせ！', hint: '枕を ふりまわす・ぶつける', bg: '#f6dcc0',
  bgm: song(150, [
    ['square', 0.04, '67 . 67 . 72 . 67 . 69 . 69 . 74 . 69 . 71 . 71 . 76 . 74 . 72 . . . . . . .'],
    ['triangle', 0.13, '43 . . 43 . . 43 . 45 . . 45 . . 45 . 47 . . 47 . . 47 . 48 . . . 43 . . .']
  ], ['k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.ss']),
  shop: [['枕', '枕 羽毛']],
  bill(t) { const n = t.pillow || 0, r = t.pillowRip || 0; return { v: '羽根' + n + '枚', n: (r ? '枕の買い直し・' : '') + '羽根を拾う', sec: n * PILLOW_SEC, yen: r * PILLOW_YEN }; },
  init() { this.n = 0; this.ptr = null; this.x = W * 0.3; this.y = this.geo().floor - this.geo().ph / 2; this.vx = 0; this.vy = 0; this.tx = this.x; this.ty = this.y; this.fs = []; this.pile = []; this.touch = {}; this.sq = 0; this.ripT = 0; this.swing = 0; },
  started() { return this.n > 0; },
  result() { return '羽根' + this.n + '枚'; },
  commit(tot) { add(tot, 'pillow', this.n); add(tot, 'pillowRip', this.n >= PILLOW_RIP ? 1 : 0); mx(tot, 'pillowMax', this.n); },
  geo() { const s = SC(); return { s, pw: 140 * s, ph: 88 * s, top: H * 0.14, floor: H * 0.8 }; },
  down(id, x, y) { if (this.ptr == null) this.ptr = id; this.tx = x; this.ty = y; },
  move(id, x, y) { if (id === this.ptr) { this.tx = x; this.ty = y; } },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  burst(x, y, nx, ny, sp) { // 当たったところから羽が舞う
    const g = this.geo(), k = clamp(Math.round(sp / (160 * g.s)), 2, 14);
    for (let i = 0; i < k; i++) this.fs.push({ x, y, vx: nx * rnd(60, 260) * g.s + rnd(-120, 120) * g.s, vy: ny * rnd(60, 260) * g.s + rnd(-200, 40) * g.s, r: rnd(0, 6), vr: rnd(-4, 4), ph: rnd(0, 6) });
    this.count(k); this.sq = 0.15; sfx.whump();
  },
  puff(sp) { // 振りまわすと、うしろ側から羽が1枚こぼれる
    const g = this.geo(), ux = -this.vx / sp, uy = -this.vy / sp;
    this.fs.push({ x: this.x + ux * g.pw * 0.4 + rnd(-10, 10) * g.s, y: this.y + uy * g.ph * 0.4 + rnd(-10, 10) * g.s, vx: ux * rnd(40, 160) * g.s + rnd(-60, 60) * g.s, vy: uy * rnd(40, 160) * g.s + rnd(-80, 20) * g.s, r: rnd(0, 6), vr: rnd(-4, 4), ph: rnd(0, 6) });
    this.count(1);
  },
  count(k) { if (scoring()) { const b = this.n; this.n += k; if (b < PILLOW_RIP && this.n >= PILLOW_RIP) this.ripT = 1.2; } },
  update(dt) {
    const g = this.geo(), s = g.s, hw = g.pw * 0.56, hh = g.ph * 0.6, ox = this.x, oy = this.y;
    if (this.ptr != null) {
      const k = 1 - Math.exp(-dt * 30); this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.vx = (this.x - ox) / dt; this.vy = (this.y - oy) / dt;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > PILLOW_SWING * s) { this.swing += sp * dt; if (this.swing > PILLOW_PUFF * s) { this.swing = 0; this.puff(sp); } } else this.swing = 0; // ゆっくり動かした分はためない
    }
    else { this.vx *= Math.exp(-dt * 2); this.vy += 1600 * s * dt; this.x += this.vx * dt; this.y += this.vy * dt; }
    // 壁・天井・床（ベッド）に当たったら止めて、速さに応じて羽を出す
    const walls = [['l', this.x - hw < 0, -1, 0], ['r', this.x + hw > W, 1, 0], ['t', this.y - hh < g.top, 0, -1], ['b', this.y + hh > g.floor, 0, 1]];
    for (const [k, hit, nx, ny] of walls) {
      if (hit && !this.touch[k]) { const sp = Math.abs(nx ? this.vx : this.vy); if (sp > 500 * s) this.burst(this.x + nx * hw, this.y + ny * hh, -nx, -ny, sp); }
      this.touch[k] = hit;
    }
    this.x = clamp(this.x, hw, W - hw); this.y = clamp(this.y, g.top + hh, g.floor - hh);
    if (this.ptr == null && this.y >= g.floor - hh - 0.5) { this.vy = 0; this.vx *= Math.exp(-dt * 8); }
    this.sq = Math.max(0, this.sq - dt); this.ripT = Math.max(0, this.ripT - dt);
    for (let i = this.fs.length - 1; i >= 0; i--) {
      const f = this.fs[i]; f.vx *= Math.exp(-dt * 2.5); f.vy = f.vy * Math.exp(-dt * 2.5) + 90 * s * dt; f.x += f.vx * dt + Math.sin(clock * 4 + f.ph) * 30 * s * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.y > g.floor + rnd(0, H * 0.12)) { this.pile.push({ x: f.x, y: f.y, r: f.r }); if (this.pile.length > 300) this.pile.shift(); this.fs.splice(i, 1); }
    }
  },
  feather(x, y, r, z) { const s = SC() * z; ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(0, 0, 9 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(35,27,46,.6)'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-11 * s, 0); ctx.lineTo(9 * s, 0); ctx.stroke(); ctx.restore(); },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let y = g.top + 20 * s; y < g.floor; y += 40 * s) for (let x = 20 * s; x < W; x += 40 * s) { ctx.beginPath(); ctx.arc(x + (y / (40 * s) % 2) * 20 * s, y, 4 * s, 0, Math.PI * 2); ctx.fill(); } // 壁紙の水玉
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, W, g.top); ctx.fillStyle = INK; ctx.fillRect(0, g.top - 2, W, 3); // 天井
    // ベッド
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rr(-20, g.floor - 150 * s, 36 * s, H, 14 * s); ctx.fillStyle = '#8a5a35'; ctx.fill(); ctx.stroke(); // 頭板
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, g.floor, W, H * 0.06); ctx.fillStyle = '#8a5a35'; ctx.fillRect(0, g.floor + H * 0.06, W, H); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3); ctx.fillRect(0, g.floor + H * 0.06 - 1, W, 3);
    rr(W * 0.5, g.floor - 18 * s, W * 0.56, H * 0.12, 18 * s); ctx.fillStyle = '#ffb81f'; ctx.fill(); ctx.stroke(); // 掛け布団
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(W * (0.58 + i * 0.08), g.floor + (i % 2 ? 14 : 34) * s, 6 * s, 0, Math.PI * 2); ctx.fill(); }
    for (const p of this.pile) this.feather(p.x, p.y, p.r, 1);
    // 枕。当たった瞬間はつぶれる。破れたら裂け目
    const q = this.sq / 0.15;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(clamp(this.vx / 4000, -0.4, 0.4)); ctx.scale(1 + q * 0.15, 1 - q * 0.2);
    const pw = g.pw / 2, ph = g.ph / 2;
    ctx.beginPath(); ctx.moveTo(-pw, -ph); ctx.quadraticCurveTo(0, -ph * 1.45, pw, -ph); ctx.quadraticCurveTo(pw * 1.18, 0, pw, ph); ctx.quadraticCurveTo(0, ph * 1.45, -pw, ph); ctx.quadraticCurveTo(-pw * 1.18, 0, -pw, -ph); ctx.closePath(); // 角がとがって、ふちがふくらんだ枕の形
    ctx.fillStyle = '#bfe0ff'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = PAPER; for (let y = -ph; y < ph * 1.2; y += 16 * s) for (let x = -pw; x < pw * 1.2; x += 18 * s) { ctx.beginPath(); ctx.arc(x + (Math.round(y / (16 * s)) % 2) * 9 * s, y, 3.5 * s, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); // 枕カバーの水玉
    ctx.beginPath(); ctx.moveTo(-pw, -ph); ctx.quadraticCurveTo(0, -ph * 1.45, pw, -ph); ctx.quadraticCurveTo(pw * 1.18, 0, pw, ph); ctx.quadraticCurveTo(0, ph * 1.45, -pw, ph); ctx.quadraticCurveTo(-pw * 1.18, 0, -pw, -ph); ctx.closePath(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); // 水玉を描いたあとなので、ふちの線はもう一度なぞる
    ctx.lineWidth = 2; ctx.beginPath(); for (const [kx, ky] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(kx * pw * 0.92, ky * ph * 0.88); ctx.quadraticCurveTo(kx * pw * 0.7, ky * ph * 0.75, kx * pw * 0.62, ky * ph * 0.45); } ctx.stroke(); // 角のしわ
    if (this.n >= PILLOW_RIP) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.pw * 0.1, -g.ph * 0.5); ctx.lineTo(g.pw * 0.18, -g.ph * 0.25); ctx.lineTo(g.pw * 0.08, -g.ph * 0.1); ctx.lineTo(g.pw * 0.2, g.ph * 0.1); ctx.stroke(); }
    ctx.restore();
    for (const f of this.fs) this.feather(f.x, f.y, f.r, 1.2);
    if (this.ripT > 0) bigText('ビリッ！', W / 2, H * 0.3, Math.round(44 * s), HOT, PAPER, W * 0.8);
  },
  drawHint(t) { const p = (t * 1.2) % 1; finger(this.x + p * W * 0.5, this.y - p * H * 0.25, 0.9); }
};

/* ---------- 大盛り13: ソファの破れ目 ---------- */
const SOFA_MAX = 40;    // 穴の大きさ（cm）。ここまで広がったら次のクッション
const SOFA_PX = 90;     // 左右にほじる距離。この px で穴が1cm広がる（SC() を掛ける）
const SOFA_SEC = 5;     // 出てきたわたを拾い集める（1cm）
const SOFA_REDO = 40, SOFA_YEN = 1000; // 1回で穴をこの大きさ以上広げたら、ソファの張り替え
const SOFA_C = ['#5f9e8f', '#c86b5a', '#6b7fc8'];
const sofa = {
  key: 'sofa', name: 'ソファ', prompt: 'ほじれ！', hint: '破れ目を 左右にほじる', bg: '#efe3d0',
  bgm: song(136, [
    ['pluck', 0.09, '64 . 64 67 . 64 . 62 . 60 . 62 64 . . . 64 . 64 67 . 69 . 67 . 64 . 62 60 . . .'],
    ['triangle', 0.13, '40 . . . 47 . . . 45 . . . 47 . . . 40 . . . 47 . . . 43 . . . 40 . . .']
  ], ['k..sk..sk..sk.ss', 'h.h.h.h.h.h.h.h.']),
  shop: [['ソファの補修シート', 'ソファ 補修シート']],
  bill(t) { const n = Math.floor(t.sofa || 0), r = t.sofaRedo || 0; return { v: n + 'cm', n: (r ? 'ソファの張り替え・' : '') + 'わたを拾い集める', sec: n * SOFA_SEC, yen: r * SOFA_YEN }; },
  init() { this.n = 0; this.ptr = null; this.lx = 0; this.fluff = []; this.pile = []; this.slide = 0; this.say = ''; this.sayT = 0; this.ci = 0; this.reset(); },
  reset() { this.size = 0; this.seed = Math.random() * 100; },
  started() { return this.n > 0; },
  result() { return Math.floor(this.n) + 'cm'; },
  commit(tot) { add(tot, 'sofa', this.n); add(tot, 'sofaRedo', this.n >= SOFA_REDO ? 1 : 0); mx(tot, 'sofaMax', Math.floor(this.n)); },
  geo() { const s = SC(); return { s, x: W * 0.13, y: H * 0.2, w: W * 0.74, h: H * 0.36, hx: W / 2, hy: H * 0.38, seat: H * 0.56, floor: H * 0.8 }; },
  hole() { const g = this.geo(), k = this.size / SOFA_MAX; return { rx: (10 + k * 120) * g.s, ry: (6 + k * 84) * g.s }; },
  down(id, x, y) { if (this.ptr == null) { this.ptr = id; this.lx = x; } },
  move(id, x, y) {
    if (id !== this.ptr) return;
    const g = this.geo(), h = this.hole(), dx = Math.abs(x - this.lx); this.lx = x;
    if (this.slide > 0 || Math.abs(x - g.hx) > h.rx + 70 * g.s || Math.abs(y - g.hy) > h.ry + 70 * g.s) return; // 破れ目のあたりをほじったときだけ
    const d = dx / (SOFA_PX * g.s), before = this.n;
    this.size = Math.min(SOFA_MAX, this.size + d);
    if (scoring()) { this.n += d; if (before < SOFA_REDO && this.n >= SOFA_REDO) { this.say = 'もう直せない！'; this.sayT = 0.9; } }
    for (let k = 0; k < dx / 40; k++) this.fluff.push({ x: g.hx + rnd(-h.rx, h.rx) * 0.6, y: g.hy + rnd(-h.ry, h.ry) * 0.4, vx: rnd(-260, 260) * g.s, vy: -rnd(120, 380) * g.s, r: rnd(7, 15) * g.s, ph: rnd(0, 6) });
    if (Math.random() < 0.3) sfx.rip();
    if (this.size >= SOFA_MAX) { this.slide = 1; this.say = '次のソファ！'; this.sayT = 0.8; }
  },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  update(dt) {
    const g = this.geo(), s = g.s;
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.slide > 0) { this.slide = Math.max(0, this.slide - dt / 0.45); if (this.slide === 0) { this.reset(); this.ci++; this.pile = this.pile.filter(p => !p.seat); } }
    for (let i = this.fluff.length - 1; i >= 0; i--) { // わたはふわっと落ちて、座面か床にたまる
      const f = this.fluff[i]; f.vx *= Math.exp(-dt * 2); f.vy = Math.min(f.vy + 700 * s * dt, 260 * s); f.x += f.vx * dt; f.y += f.vy * dt;
      const onSeat = f.x > W * 0.14 && f.x < W * 0.86 && f.y > g.seat + 6 * s && f.y < g.seat + 30 * s, onFloor = f.y > g.floor + rnd(8, H - g.floor - 10);
      if (f.vy > 0 && this.slide === 0 && (onSeat || onFloor)) { this.pile.push({ x: f.x, y: f.y, r: f.r, seat: onSeat && !onFloor }); if (this.pile.length > 260) this.pile.shift(); this.fluff.splice(i, 1); }
      else if (f.y > H + 30) this.fluff.splice(i, 1);
    }
  },
  puff(x, y, r) { // わたのかたまり（小さい丸を5つ重ねる）
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, cx = x + Math.cos(a) * r * 0.5, cy = y + Math.sin(a) * r * 0.5; ctx.moveTo(cx + r * 0.6, cy); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); }
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(35,27,46,.45)'; ctx.stroke(); ctx.fillStyle = PAPER; ctx.fill(); // ふちを先に描いてから塗るので、外側の線だけ残る
  },
  cushion(dx, size, seed, col) { // 背もたれのクッションと破れ目。穴のふちはギザギザ、中からわたがはみ出す
    const g = this.geo(), s = g.s, x = g.x + dx;
    rr(x, g.y, g.w, g.h, 22 * s); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(35,27,46,.25)'; for (const fx of [0.25, 0.75]) for (const fy of [0.3, 0.7]) { ctx.beginPath(); ctx.arc(x + g.w * fx, g.y + g.h * fy, 4 * s, 0, Math.PI * 2); ctx.fill(); } // ボタン
    const k = size / SOFA_MAX, rx = (10 + k * 120) * s, ry = (6 + k * 84) * s, hx = g.hx + dx, N = 18;
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, j = 1 + 0.22 * (sr(seed + i % N) - 0.5) * 2; ctx.lineTo(hx + Math.cos(a) * rx * j, g.hy + Math.sin(a) * ry * j); }
    ctx.closePath(); ctx.fillStyle = '#f4e9c8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); // 穴（中は黄色っぽいスポンジ）
    if (size > 2) for (let i = 0; i < 3 + Math.floor(k * 10); i++) this.puff(hx + (sr(seed + i * 3) - 0.5) * rx * 1.2, g.hy + (sr(seed + i * 5) - 0.5) * ry * 1.1, (10 + k * 22) * s); // はみ出したわた
  },
  draw() {
    const g = this.geo(), s = g.s, col = SOFA_C[this.ci % SOFA_C.length];
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    // ソファ（穴が広がりきったら、ソファごと次のソファに入れ替わる）
    ctx.save(); if (this.slide > 0) ctx.translate(-(1 - this.slide) * W, 0);
    this.body(col); this.cushion(0, this.size, this.seed, col); for (const p of this.pile) if (p.seat) this.puff(p.x, p.y, p.r);
    ctx.restore();
    if (this.slide > 0) { const nc = SOFA_C[(this.ci + 1) % SOFA_C.length]; ctx.save(); ctx.translate(this.slide * W, 0); this.body(nc); this.cushion(0, 0, this.seed + 7, nc); ctx.restore(); }
    for (const p of this.pile) if (!p.seat) this.puff(p.x, p.y, p.r);
    for (const f of this.fluff) this.puff(f.x + Math.sin(clock * 4 + f.ph) * 6 * s, f.y, f.r);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.14, Math.round(32 * s), HOT, PAPER, W * 0.8);
  },
  body(col) { // ソファ本体（ひじかけ・座面・脚）
    const g = this.geo(), s = g.s;
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = col;
    rr(W * 0.02, g.y + g.h * 0.35, W * 0.14, g.seat - g.y - g.h * 0.35 + H * 0.16, 16 * s); ctx.fill(); ctx.stroke();
    rr(W * 0.84, g.y + g.h * 0.35, W * 0.14, g.seat - g.y - g.h * 0.35 + H * 0.16, 16 * s); ctx.fill(); ctx.stroke();
    rr(W * 0.12, g.seat, W * 0.76, H * 0.12, 16 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a22'; for (const lx of [0.08, 0.88]) { ctx.fillRect(W * lx, g.seat + H * 0.16, W * 0.04, g.floor - g.seat - H * 0.16); ctx.strokeRect(W * lx, g.seat + H * 0.16, W * 0.04, g.floor - g.seat - H * 0.16); }
  },
  drawHint(t) { const g = this.geo(), p = Math.sin(t * 7); finger(g.hx + p * 50 * g.s, g.hy, 0.9); }
};

/* ---------- 大盛り14: 電気のスイッチ ---------- */
const LIGHT_BREAK = 35, LIGHT_YEN = 1000; // 1回でこの回数以上パチパチしたら、スイッチが壊れて交換
const LIGHT_SEC = 5;  // ネコをなだめる（1回）
const light = {
  key: 'light', name: '電気のスイッチ', prompt: 'パチパチ！', hint: '上下に はじく', bg: '#f3ead8',
  bgm: song(144, [
    ['square', 0.04, '76 . 72 . 76 . 72 . 77 . 74 . 77 . 74 . 79 . 76 . 79 . 76 . 84 . . . 72 . . .'],
    ['triangle', 0.13, '48 . 48 . 55 . 55 . 50 . 50 . 57 . 57 . 52 . 52 . 59 . 59 . 48 . 55 . 48 . . .']
  ], ['k.hhs.h.k.hhs.h.k.hhs.h.k.k.s.s.']),
  shop: [['LED電球', 'LED電球']],
  bill(t) { const n = t.light || 0, b = t.lightBroke || 0; return { v: n + '回', n: (b ? 'スイッチの交換・' : '') + 'ネコをなだめる', sec: n * LIGHT_SEC, yen: b * LIGHT_YEN }; },
  init() { this.n = 0; this.on = true; this.ptr = {}; this.flick = 0; this.scared = 0; this.jump = 0; this.broke = false; this.crack = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '回'; },
  commit(tot) { add(tot, 'light', this.n); add(tot, 'lightBroke', this.n >= LIGHT_BREAK ? 1 : 0); mx(tot, 'lightMax', this.n); },
  geo() { // 壁のスイッチ（ドアの横、実物の大きさ）と、それを拡大して見せる吹き出し
    const s = SC(), sw = 22 * s, sh = 34 * s, R = Math.min(W * 0.3, 118 * s);
    return { s, sx: W * 0.3, sy: H * 0.52, sw, sh, cx: W * 0.66, cy: H * 0.34, R };
  },
  set(v) {
    if (v === this.on) return;
    this.on = v; this.flick = 0.12; sfx.click();
    if (scoring()) { this.n++; if (this.n === LIGHT_BREAK) { this.broke = true; this.crack = 0.8; sfx.crunch(); } }
    if (++this.scared >= 6 && this.jump <= 0) { this.jump = 0.7; this.scared = 0; sfx.meow(); }
  },
  down(id, x, y) { this.ptr[id] = y; }, // 押しただけでは切り替わらない（上下にはじく）
  move(id, x, y) { // 上下にはじく。向きが変わったら、そこから測り直す
    if (!(id in this.ptr)) return;
    const dy = y - this.ptr[id], s = SC();
    if (dy < -24 * s) { this.set(true); this.ptr[id] = y; } else if (dy > 24 * s) { this.set(false); this.ptr[id] = y; }
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  update(dt) { this.flick = Math.max(0, this.flick - dt); this.jump = Math.max(0, this.jump - dt); this.crack = Math.max(0, this.crack - dt); },
  cat(x, y, s, dark) { // 床に座っているネコ。びっくりすると跳ねて毛が逆立つ
    const j = this.jump > 0 ? Math.sin((1 - this.jump / 0.7) * Math.PI) : 0, cy = y - j * 90 * s;
    if (dark) { ctx.fillStyle = '#ffe14a'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k * 11 * s, cy - 44 * s, 5 * s, (j > 0 ? 8 : 6) * s, 0, 0, Math.PI * 2); ctx.fill(); } return; } // 暗いと目だけ光る
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#f2a65a';
    ctx.beginPath(); ctx.moveTo(x + 26 * s, cy); ctx.quadraticCurveTo(x + 60 * s, cy - 10 * s, x + 50 * s, cy - (j > 0 ? 70 : 40) * s); ctx.lineCap = 'round'; ctx.lineWidth = 11 * s; ctx.stroke(); ctx.lineWidth = 6 * s; ctx.strokeStyle = '#f2a65a'; ctx.stroke(); ctx.lineCap = 'butt'; ctx.lineWidth = 3; ctx.strokeStyle = INK; // しっぽ
    ctx.beginPath(); ctx.ellipse(x, cy - 14 * s, 30 * s, 24 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (j > 0) { ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.moveTo(x + Math.cos(a) * 30 * s, cy - 14 * s + Math.sin(a) * 24 * s); ctx.lineTo(x + Math.cos(a) * 40 * s, cy - 14 * s + Math.sin(a) * 34 * s); } ctx.stroke(); } // 逆立った毛
    catHead(x, cy - 44 * s, 20 * s);
  },
  plate(x, y, w, h, lw) { // スイッチのプレート。入のときは上側が押し込まれている。暗いときは緑のランプが光る
    const s = SC();
    ctx.lineWidth = lw; ctx.strokeStyle = INK;
    rr(x, y, w, h, w * 0.08); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    const rx = x + w * 0.22, ry = y + h * 0.16, rw = w * 0.56, rh = h * 0.68;
    rr(rx, ry, rw, rh, w * 0.05); ctx.fillStyle = '#ece6d6'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(35,27,46,.18)'; if (this.on) ctx.fillRect(rx + lw, ry + lw, rw - lw * 2, rh / 2 - lw); else ctx.fillRect(rx + lw, ry + rh / 2, rw - lw * 2, rh / 2 - lw);
    ctx.fillStyle = INK; ctx.fillRect(rx + lw, ry + rh / 2 - lw / 2, rw - lw * 2, lw);
    if (this.broke) { ctx.lineWidth = Math.max(1, lw * 0.7); ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h * 0.2); ctx.lineTo(x + w * 0.3, y + h * 0.35); ctx.lineTo(x + w * 0.18, y + h * 0.5); ctx.lineTo(x + w * 0.32, y + h * 0.7); ctx.stroke(); ctx.lineWidth = 3; } // ひび
    return { lx: x + w / 2, ly: ry + rh * 0.8 };
  },
  lamp(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(125,255,138,.25)'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#7dff8a'; ctx.fill(); },
  draw() {
    const g = this.geo(), s = g.s, lit = this.on && !(this.flick > 0 && Math.random() < 0.5);
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.82, W, H * 0.18); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.82 - 2, W, 3);
    // ドア（スイッチはその横）
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.fillStyle = '#b97a45'; ctx.fillRect(W * 0.03, H * 0.38, W * 0.2, H * 0.44); ctx.strokeRect(W * 0.03, H * 0.38, W * 0.2, H * 0.44);
    ctx.fillStyle = '#d29a62'; ctx.fillRect(W * 0.06, H * 0.41, W * 0.14, H * 0.16); ctx.strokeRect(W * 0.06, H * 0.41, W * 0.14, H * 0.16); ctx.fillRect(W * 0.06, H * 0.6, W * 0.14, H * 0.18); ctx.strokeRect(W * 0.06, H * 0.6, W * 0.14, H * 0.18);
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.6, 5 * s, 0, Math.PI * 2); ctx.fillStyle = POP; ctx.fill(); ctx.stroke(); // ドアノブ
    // ソファ
    rr(W * 0.5, H * 0.66, W * 0.6, H * 0.17, 14 * s); ctx.fillStyle = '#4f86f7'; ctx.fill(); ctx.stroke(); rr(W * 0.56, H * 0.6, W * 0.5, H * 0.1, 12 * s); ctx.fill(); ctx.stroke();
    // 天井の電灯
    ctx.fillStyle = INK; ctx.fillRect(W / 2 - 1.5, 0, 3, H * 0.12);
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.14, 70 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fillStyle = lit ? '#fff7c2' : '#d8d4c8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    if (lit) { const grd = ctx.createRadialGradient(W / 2, H * 0.14, 10, W / 2, H * 0.14, H * 0.7); grd.addColorStop(0, 'rgba(255,240,160,.45)'); grd.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H); }
    const small = this.plate(g.sx - g.sw / 2, g.sy - g.sh / 2, g.sw, g.sh, 2);
    this.cat(W * 0.4, H * 0.88, s, false);
    if (!lit) { // 消したら部屋が真っ暗。スイッチの小さいランプとネコの目だけ見える
      ctx.fillStyle = 'rgba(8,8,24,.9)'; ctx.fillRect(0, 0, W, H);
      this.lamp(small.lx, small.ly, 2 * s);
      this.cat(W * 0.4, H * 0.88, s, true);
    }
    // 吹き出し：壁のスイッチを拡大して見せる（しっぽは壁のスイッチを指す）
    const a = Math.atan2(g.sy - g.cy, g.sx - g.cx), tip = 0.22;
    ctx.beginPath(); ctx.moveTo(g.cx + Math.cos(a - tip) * g.R, g.cy + Math.sin(a - tip) * g.R); ctx.lineTo(g.sx + Math.cos(a + Math.PI) * g.sw * 0.9, g.sy + Math.sin(a + Math.PI) * g.sw * 0.9); ctx.lineTo(g.cx + Math.cos(a + tip) * g.R, g.cy + Math.sin(a + tip) * g.R); ctx.closePath();
    ctx.fillStyle = lit ? PAPER : '#3a3850'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = lit ? INK : '#8d8aa8'; ctx.stroke();
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.fillStyle = lit ? '#f6efdd' : '#3a3850'; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R - 2, 0, Math.PI * 2); ctx.clip();
    const pw = g.R * 0.95, ph = pw * g.sh / g.sw * 0.95;
    const big = this.plate(g.cx - pw / 2, g.cy - ph / 2, pw, ph, 3);
    if (!lit) { ctx.fillStyle = 'rgba(8,8,24,.75)'; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2); this.lamp(big.lx, big.ly, 5 * s); }
    ctx.restore();
    if (this.jump > 0.3) bigText('ニャッ！', W * 0.4, H * 0.66, Math.round(30 * s), POP, INK, W * 0.5);
    if (this.crack > 0) bigText('バキッ！', g.cx, g.cy - g.R - 18 * s, Math.round(40 * s), HOT, PAPER, W * 0.8);
  },
  drawHint(t) { const g = this.geo(), p = Math.sin(t * 6); finger(g.cx, g.cy + p * g.R * 0.45, 0.9); }
};

/* ---------- 大盛り15: 毛糸玉（ネコといっしょ） ---------- */
const YARN_LEN = 25;  // 毛糸玉1個の長さ（m）。使い切ったら次の玉
const YARN_PX = 120;   // 転がったこの px で1mほどける（SC() を掛ける）
const YARN_KNIT = 30, YARN_YEN = 1000; // 編みかけのセーターに使った毛糸の長さ（m）。玉を使い切ってセーターまでほどいたら、毛糸の買い直し
const YARN_SEC = 10;  // 毛糸を巻き直す（1m）
const YARN_C = ['#ff5a9e', '#4f86f7', '#5fb35a', '#ffb81f'];
const yarn = {
  key: 'yarn', name: '毛糸玉', prompt: 'ころがせ！', hint: '毛糸玉を はじく', bg: '#e9dcc6',
  bgm: song(132, [
    ['pluck', 0.09, '72 . 74 . 76 . 79 . 76 . 74 . 72 . . . 74 . 76 . 77 . 81 . 79 . 77 . 76 . . .'],
    ['triangle', 0.13, '48 . . 55 . . 48 . 53 . . 60 . . 53 . 50 . . 57 . . 50 . 55 . . 59 . . 55 .']
  ], ['k...s..hk.h.s...']),
  shop: [['毛糸', '毛糸 玉']],
  bill(t) { const n = Math.floor(t.yarn || 0), r = t.yarnRebuy || 0; return { v: n + 'm', n: (r ? 'セーターの毛糸の買い直し・' : '') + '毛糸を巻き直す', sec: n * YARN_SEC, yen: r * YARN_YEN }; },
  init() {
    const s = SC();
    this.n = 0; this.ptr = {}; this.ci = 0; this.trails = []; this.newBall(W * 0.5, H * 0.7); this.trails[0].pts.unshift([W * 0.16, H * 0.95 - 96 * s]); // 最初の毛糸は、かごの編みかけのセーター（編み棒）からつながっている
    this.knit = YARN_KNIT; this.unknit = false; this.sweaterT = 0; this.say = ''; this.sayT = 0;
    this.cat = { x: W * 0.2, y: H * 0.4, face: 1, cd: 0, paw: 0, awake: false, step: 0 };
  },
  newBall(x, y) { this.b = { x, y, vx: 0, vy: 0, left: YARN_LEN, rot: 0 }; this.trails.push({ c: YARN_C[this.ci++ % YARN_C.length], pts: [[x, y]] }); },
  started() { return this.n > 0; },
  result() { return (this.n < 10 ? this.n.toFixed(1) : Math.floor(this.n)) + 'm'; },
  commit(tot) { add(tot, 'yarn', this.n); add(tot, 'yarnRebuy', this.unknit ? 1 : 0); mx(tot, 'yarnMax', Math.floor(this.n)); },
  geo() { const s = SC(); return { s, top: H * 0.15, bottom: H * 0.95, br: (n) => (9 + 21 * n) * s }; },
  down(id, x, y) { this.ptr[id] = [[x, y, clock]]; },
  move(id, x, y) { const h = this.ptr[id]; if (!h) return; h.push([x, y, clock]); while (h.length > 2 && clock - h[0][2] > 0.1) h.shift(); },
  up(id) {
    if (id == null) { this.ptr = {}; return; }
    const h = this.ptr[id]; delete this.ptr[id]; if (!h || h.length < 2) return;
    const a = h[0], z = h[h.length - 1], dt = Math.max(0.016, z[2] - a[2]), vx = (z[0] - a[0]) / dt, vy = (z[1] - a[1]) / dt, sp = Math.hypot(vx, vy), s = SC();
    if (sp < 150 * s) return;
    const k = Math.min(1, 2000 * s / sp); // はじいた向きと速さで転がる（どこではじいてもよい）
    this.b.vx = vx * k; this.b.vy = vy * k; this.cat.awake = true; sfx.whump();
  },
  update(dt) {
    const g = this.geo(), s = g.s, b = this.b, r = g.br(clamp(b.left / YARN_LEN, 0, 1));
    this.sayT = Math.max(0, this.sayT - dt); this.sweaterT = Math.max(0, this.sweaterT - dt);
    const ox = b.x, oy = b.y;
    b.vx *= Math.exp(-dt * 1.1); b.vy *= Math.exp(-dt * 1.1); b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y < g.top + r) { b.y = g.top + r; b.vy = Math.abs(b.vy) * 0.8; } if (b.y > g.bottom - r) { b.y = g.bottom - r; b.vy = -Math.abs(b.vy) * 0.8; }
    const d = Math.hypot(b.x - ox, b.y - oy); b.rot += d / r;
    if (d > 0) {
      const m = d / (YARN_PX * s);
      if (b.left > 0) b.left -= m;
      else if (this.knit > 0) { // 玉を使い切ったら、つながっているセーターがほどける
        if (this.knit === YARN_KNIT) { this.sweaterT = 1.8; sfx.rip(); }
        this.knit = Math.max(0, this.knit - m); if (scoring()) this.unknit = true;
      }
      if (scoring()) this.n += m;
      const tr = this.trails[this.trails.length - 1].pts, last = tr[tr.length - 1];
      if (Math.hypot(b.x - last[0], b.y - last[1]) > 6 * s) { tr.push([b.x + rnd(-3, 3) * s, b.y + rnd(-3, 3) * s]); if (tr.length > 900) tr.shift(); }
      if (b.left <= 0 && this.knit <= 0) { this.say = '次の毛糸！'; this.sayT = 0.8; this.newBall(W * 0.14, g.bottom - 70 * s); this.b.vx = 380 * s; this.b.vy = -420 * s; }
    }
    // ネコ：転がり始めたら毛糸玉を追いかけて、近づいたら前足ではたく
    const c = this.cat; c.cd -= dt; c.paw = Math.max(0, c.paw - dt);
    if (c.awake) {
      const dx = b.x - c.x, dy = b.y - c.y, dist = Math.hypot(dx, dy), sp = (Math.hypot(b.vx, b.vy) > 60 * s ? 300 : 160) * s;
      if (dist > 40 * s) { c.x += dx / dist * Math.min(sp * dt, dist - 40 * s); c.y += dy / dist * Math.min(sp * dt, dist - 40 * s); c.step += dt * 10; }
      if (Math.abs(dx) > 4) c.face = dx > 0 ? 1 : -1;
      if (dist < 60 * s && c.cd <= 0) { const a = Math.atan2(dy, dx) + rnd(-0.8, 0.8), p = rnd(500, 900) * s; b.vx += Math.cos(a) * p; b.vy += Math.sin(a) * p; c.cd = rnd(0.5, 0.9); c.paw = 0.2; if (Math.random() < 0.4) sfx.meow(); }
    }
  },
  sweater(kx, ky, s) { // 編み物かごと、編みかけのセーター（毛糸玉と同じ色）。ほどけると上の段から減って、袖もなくなる
    const k = this.knit / YARN_KNIT, top = ky - 70 * s, hgt = 70 * s * k, cut = ky - hgt;
    ctx.save(); ctx.beginPath(); ctx.rect(kx - 80 * s, cut, 160 * s, hgt + 40 * s); ctx.clip();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = YARN_C[0];
    ctx.beginPath(); ctx.moveTo(kx - 30 * s, top + 8 * s); ctx.lineTo(kx - 56 * s, top + 34 * s); ctx.lineTo(kx - 44 * s, top + 46 * s); ctx.lineTo(kx - 30 * s, top + 34 * s); ctx.lineTo(kx - 30 * s, ky); ctx.lineTo(kx + 30 * s, ky); ctx.lineTo(kx + 30 * s, top + 34 * s); ctx.lineTo(kx + 44 * s, top + 46 * s); ctx.lineTo(kx + 56 * s, top + 34 * s); ctx.lineTo(kx + 30 * s, top + 8 * s); ctx.lineTo(kx + 10 * s, top + 4 * s); ctx.quadraticCurveTo(kx, top + 14 * s, kx - 10 * s, top + 4 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); // 袖のあるセーター
    ctx.strokeStyle = 'rgba(35,27,46,.3)'; ctx.lineWidth = 1.5; for (let y = top + 16 * s; y < ky; y += 7 * s) { ctx.beginPath(); ctx.moveTo(kx - 28 * s, y); ctx.lineTo(kx + 28 * s, y); ctx.stroke(); } // 編み目
    ctx.restore();
    if (k > 0) { ctx.strokeStyle = '#c7ced5'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(kx - 40 * s, cut - 10 * s); ctx.lineTo(kx + 16 * s, cut + 6 * s); ctx.moveTo(kx + 40 * s, cut - 12 * s); ctx.lineTo(kx - 16 * s, cut + 6 * s); ctx.stroke(); ctx.lineCap = 'butt'; } // 編み棒（いちばん上の段に刺さっている）
    ctx.beginPath(); ctx.ellipse(kx, ky + 4 * s, 52 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#b97a45'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); // かご
    ctx.strokeStyle = 'rgba(35,27,46,.35)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(kx + i * 18 * s, ky - 10 * s); ctx.lineTo(kx + i * 18 * s, ky + 22 * s); ctx.stroke(); }
    if (this.trails[0]) this.trails[0].pts[0] = [kx, cut]; // 1本目の毛糸は、ほどけているいちばん上の段から出る
  },
  ball(x, y, r, rot, col) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(35,27,46,.45)';
    for (let i = 0; i < 4; i++) { const a = rot + i * 0.8; ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 0.35, a, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  },
  drawCat(c, s) { // ネコ（横向きの全身）
    const x = c.x, y = c.y, f = c.face, leg = Math.sin(c.step) * 6 * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#f2a65a';
    ctx.beginPath(); ctx.moveTo(-30 * s, -6 * s); ctx.quadraticCurveTo(-60 * s, -10 * s, -52 * s, -44 * s + Math.sin(clock * 5) * 6 * s); ctx.lineCap = 'round'; ctx.lineWidth = 11 * s; ctx.stroke(); ctx.lineWidth = 6 * s; ctx.strokeStyle = '#f2a65a'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = INK; // しっぽ
    for (const [lx, ph] of [[-20, 1], [-8, -1], [12, -1], [24, 1]]) { ctx.beginPath(); ctx.moveTo(lx * s, 0); ctx.lineTo(lx * s + (lx > 20 && c.paw > 0 ? 18 * s : leg * ph), 20 * s - (lx > 20 && c.paw > 0 ? 10 * s : 0)); ctx.lineWidth = 10 * s; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 5 * s; ctx.strokeStyle = '#f2a65a'; ctx.stroke(); } ctx.lineCap = 'butt'; ctx.lineWidth = 3; ctx.strokeStyle = INK; // 足（前足ではたく）
    ctx.beginPath(); ctx.ellipse(0, -4 * s, 34 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    catHead(x + f * 32 * s, y - 22 * s, 17 * s);
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d6c4a5'; for (let y = g.top; y < H; y += 60 * s) ctx.fillRect(0, y, W, 2); // じゅうたんの模様
    ctx.fillStyle = '#c9b48f'; ctx.fillRect(0, 0, W, g.top); ctx.fillStyle = INK; ctx.fillRect(0, g.top - 2, W, 3); // 奥の壁ぎわ
    this.sweater(W * 0.16, g.bottom - 40 * s, s);
    // ほどけた毛糸
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const t of this.trails) { if (t.pts.length < 2) continue; ctx.beginPath(); ctx.moveTo(t.pts[0][0], t.pts[0][1]); for (const p of t.pts) ctx.lineTo(p[0], p[1]); ctx.lineWidth = 3 * s; ctx.strokeStyle = t.c; ctx.stroke(); }
    ctx.lineCap = 'butt';
    const b = this.b; this.ball(b.x, b.y, g.br(clamp(b.left / YARN_LEN, 0, 1)), b.rot, this.trails[this.trails.length - 1].c);
    this.drawCat(this.cat, s);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.3, Math.round(32 * s), HOT, PAPER, W * 0.8);
    if (this.sweaterT > 0) { bigText('ママのセーターまで', W / 2, H * 0.36, Math.round(28 * s), HOT, PAPER, W * 0.9); bigText('ほどけてきた！', W / 2, H * 0.42, Math.round(28 * s), HOT, PAPER, W * 0.9); }
  },
  drawHint(t) { const p = (t * 1.3) % 1; finger(this.b.x + p * 40, this.b.y - p * 120, 0.9); }
};

STAGE_LIST.push(piano, pillow, sofa, light, yarn);
ZUKAN_EXTRA.push(
  { id: 'piano', name: '真夜中のリサイタル', desc: 'ピアノを1回で110音 鳴らす', ok: t => (t.pianoMax || 0) >= 110 },
  { id: 'pillow', name: '羽根まみれ', desc: '枕から1回で羽根を400枚 出す', ok: t => (t.pillowMax || 0) >= 400 },
  { id: 'sofa', name: 'ほじり名人', desc: 'ソファの破れ目を1回で70cm ほじる', ok: t => (t.sofaMax || 0) >= 70 },
  { id: 'light', name: 'チカチカ大王', desc: '電気のスイッチを1回で50回 パチパチする', ok: t => (t.lightMax || 0) >= 50 },
  { id: 'yarn', name: 'ネコの相棒', desc: '毛糸玉を1回で45m ころがす', ok: t => (t.yarnMax || 0) >= 45 }
);

/* ===== 第4弾（2026-10-25 追加） ===== */
Object.assign(sfx, {
  bang() { noise(0.12, 700, 0.8, 0.5, 'lowpass'); tone(220, 90, 0.1, 0.25, 'square'); },
  inflate(k) { tone(300 + k * 500, 340 + k * 520, 0.05, 0.04, 'sine'); },
  pop() { noise(0.18, 3000, 0.6, 0.7, 'highpass'); tone(180, 60, 0.12, 0.3, 'sine'); },
  pon() { tone(260, 110, 0.07, 0.3, 'sine'); noise(0.05, 500, 0.8, 0.25, 'lowpass'); }
});

/* ---------- 大盛り16: 押し入れの布団 ---------- */
const CLOSET_N = 6;         // 1回に積んである布団の枚数
const CLOSET_PULL = 0.3;    // 布団の幅のこの割合まで横に引き抜いたら、なだれ
const CLOSET_SEC = 20;      // 布団をたたみ直す（1枚）
const CLOSET_DOOR = 24, CLOSET_YEN = 1000; // 1回でこの枚数以上落としたら、ふすまが外れて修理
const FUTON_C = ['#ffd6e8', '#cfe0ff', '#fff1b8', '#d4efc9', '#ffdcc8', '#e4dbff']; // 布団の色（うすい色）
const closet = {
  key: 'closet', name: '押し入れ', prompt: '崩せ！', hint: 'いちばん下の布団を 横に引き抜く', bg: '#efe3cf',
  bgm: song(140, [
    ['pluck', 0.09, '67 . 69 . 72 . . 69 72 . 74 . 76 . . . 76 . 74 . 72 . 69 . 67 . 69 . 72 . . .'],
    ['triangle', 0.13, '43 . . . 48 . . . 43 . . . 48 . . . 45 . . . 50 . . . 43 . . . 48 . . .']
  ], ['k..sk.s.k..sk.ss']),
  shop: [['布団収納袋', '布団 収納袋']],
  bill(t) { const n = t.closet || 0, d = t.closetDoor || 0; return { v: n + '枚', n: (d ? 'ふすまの修理・' : '') + '布団をたたみ直す', sec: n * CLOSET_SEC, yen: d * CLOSET_YEN }; },
  init() { this.n = 0; this.ptr = null; this.x0 = 0; this.stack = this.newStack(); this.drop = 0; this.falling = []; this.pile = []; this.wait = 0; this.say = ''; this.sayT = 0; this.door = false; },
  newStack() { const c0 = Math.floor(Math.random() * FUTON_C.length); return Array.from({ length: CLOSET_N }, (_, i) => ({ c: FUTON_C[(c0 + i) % FUTON_C.length], off: 0 })); }, // 0がいちばん下
  started() { return this.n > 0; },
  result() { return this.n + '枚'; },
  commit(tot) { add(tot, 'closet', this.n); add(tot, 'closetDoor', this.n >= CLOSET_DOOR ? 1 : 0); mx(tot, 'closetMax', this.n); },
  geo() { const s = SC(), fh = 30 * s; return { s, fh, x: W * 0.12, w: W * 0.6, shelf: H * 0.5, top: H * 0.14, floor: H * 0.8 }; },
  down(id, x, y) {
    const g = this.geo();
    if (this.ptr != null || !this.stack || this.drop > 0) return;
    if (y > g.shelf - g.fh * 1.8 && y < g.shelf + 50 * g.s) { this.ptr = id; this.x0 = x; } // いちばん下の布団のあたりを押す
  },
  move(id, x) {
    if (id !== this.ptr || !this.stack) return;
    const g = this.geo(), dx = x - this.x0; this.stack[0].off = dx;
    if (Math.abs(dx) > g.w * CLOSET_PULL) this.collapse(Math.sign(dx));
  },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  collapse(dir) { // 下の1枚を引き抜くと、上の布団がなだれ落ちる
    const g = this.geo(), s = g.s, before = this.n;
    this.stack.forEach((f, i) => {
      const y = g.shelf - (i + 1) * g.fh;
      this.falling.push({ c: f.c, x: g.x + f.off, y, vx: i === 0 ? dir * 900 * s : rnd(-60, 160) * s, vy: i === 0 ? -150 * s : -rnd(0, 80) * s, r: 0, vr: i === 0 ? dir * 2 : rnd(-1.2, 1.2), delay: i === 0 ? 0 : 0.04 * i });
    });
    if (scoring()) { this.n += CLOSET_N; if (before < CLOSET_DOOR && this.n >= CLOSET_DOOR) { this.door = true; this.say = 'ふすまが外れた！'; this.sayT = 1; sfx.crunch(); } }
    if (this.sayT <= 0) { this.say = 'ドサドサッ！'; this.sayT = 0.6; }
    this.stack = null; this.ptr = null; this.wait = 0.45; sfx.slide(); setTimeout(() => sfx.thud(), 180);
  },
  update(dt) {
    const g = this.geo(), s = g.s;
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.stack && this.ptr == null) this.stack[0].off *= Math.exp(-dt * 14); // 途中で離したら戻る
    if (!this.stack) { this.wait -= dt; if (this.wait <= 0) { this.stack = this.newStack(); this.drop = 1; } } // 次の布団が上から積まれる
    this.drop = Math.max(0, this.drop - dt / 0.3);
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i]; if (f.delay > 0) { f.delay -= dt; continue; }
      f.vy += 1800 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; f.k = Math.min(1, (f.k || 0) + dt / 0.35);
      const land = g.floor + rnd(0, H * 0.1) - g.fh;
      if (f.y > land && f.vy > 0) { this.pile.push({ c: f.c, x: f.x, y: Math.min(f.y, H - g.fh), r: clamp(f.r % 0.6, -0.4, 0.4) }); if (this.pile.length > 36) this.pile.shift(); this.falling.splice(i, 1); }
    }
  },
  futon(x, y, w, h, c, r) { // たたんだ布団（手前の折り目が丸い）
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(r || 0);
    rr(-w / 2, -h / 2, w, h, h * 0.45); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-w * 0.36 + k * w * 0.18, 0, h * 0.13, 0, Math.PI * 2); ctx.fill(); } // 柄
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d8d49a'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3); // 畳
    ctx.strokeStyle = 'rgba(35,27,46,.2)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += W / 3) { ctx.beginPath(); ctx.moveTo(x, g.floor); ctx.lineTo(x, H); ctx.stroke(); }
    // 押し入れ（中段の板で上下に分かれる）。右にふすまが寄せてある
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.fillStyle = '#6b5440'; ctx.fillRect(W * 0.06, g.top, W * 0.88, g.floor - g.top); ctx.strokeRect(W * 0.06, g.top, W * 0.88, g.floor - g.top);
    ctx.fillStyle = '#4a3a2c'; ctx.fillRect(W * 0.08, g.top + 8 * s, W * 0.84, g.floor - g.top - 8 * s);
    ctx.fillStyle = '#b98a5a'; ctx.fillRect(W * 0.06, g.shelf, W * 0.88, 14 * s); ctx.strokeRect(W * 0.06, g.shelf, W * 0.88, 14 * s); // 中段
    for (const [bx, bw, bh] of [[0.12, 0.26, 0.1], [0.42, 0.2, 0.07]]) { ctx.fillStyle = '#c8a070'; ctx.fillRect(W * bx, g.floor - H * bh, W * bw, H * bh); ctx.strokeRect(W * bx, g.floor - H * bh, W * bw, H * bh); } // 下の段の箱
    // 積んである布団（引き抜いている途中は、下の1枚だけ横にずれる）
    if (this.stack) {
      const dy = -this.drop * H * 0.35;
      this.stack.forEach((f, i) => this.futon(g.x + f.off, g.shelf - (i + 1) * g.fh + dy, g.w, g.fh, f.c, i === 0 ? f.off / 1200 : 0));
    }
    // ふすま（外れたら、手前に倒れている）
    if (!this.door) { ctx.fillStyle = '#f3ecd8'; ctx.fillRect(W * 0.75, g.top + 4 * s, W * 0.21, g.floor - g.top - 4 * s); ctx.strokeRect(W * 0.75, g.top + 4 * s, W * 0.21, g.floor - g.top - 4 * s); ctx.beginPath(); ctx.arc(W * 0.78, (g.top + g.floor) / 2, 6 * s, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.save(); ctx.translate(W * 0.6, g.floor + 30 * s); ctx.rotate(-0.15); ctx.fillStyle = '#f3ecd8'; ctx.fillRect(0, -16 * s, W * 0.5, 32 * s); ctx.strokeRect(0, -16 * s, W * 0.5, 32 * s); ctx.restore(); }
    for (const p of this.pile) this.futon(p.x + g.w * 0.2, p.y - g.fh * 0.3, g.w * 0.6, g.fh * 1.5, p.c, p.r * 0.5); // 床に落ちた布団は、くしゃっと短く厚く
    for (const f of this.falling) { const k = f.k || 0; this.futon(f.x + g.w * 0.2 * k, f.y - g.fh * 0.3 * k, g.w * (1 - 0.4 * k), g.fh * (1 + 0.5 * k), f.c, f.r); } // 落ちながら、くしゃっとなる
    if (this.sayT > 0) bigText(this.say, W / 2, g.top - 6 * s + 30 * s, Math.round(32 * s), HOT, PAPER, W * 0.85);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.2) % 1; finger(g.x + g.w * (0.5 + p * 0.4), g.shelf - g.fh / 2, 0.9); }
};

/* ---------- 大盛り17: ロールスクリーン ---------- */
const ROLL_MIN = 0.45;  // 窓のこの割合より下まで引き下ろしてから離すと、勢いよく巻き上がって「バチン！」
const ROLL_SEC = 20;    // ずれたスクリーンを直す（1回）
const ROLL_BREAK = 8, ROLL_YEN = 1000; // 1回でこの回数以上バチンとやったら、バネが壊れて買い直し
const roll = {
  key: 'roll', name: 'ロールスクリーン', prompt: 'ビヨーン！', hint: '下に引っぱって はなす', bg: '#e9e2d6',
  bgm: song(150, [
    ['square', 0.04, '72 . 79 . 76 . 79 . 72 . 79 . 76 . 79 . 74 . 81 . 77 . 81 . 74 . 81 . 79 . . .'],
    ['triangle', 0.13, '48 . . 48 . . 55 . 48 . . 48 . . 55 . 50 . . 50 . . 57 . 43 . . 43 . . 50 .']
  ], ['k.h.s.hhk.h.s.h.']),
  shop: [['ロールスクリーン', 'ロールスクリーン']],
  bill(t) { const n = t.roll || 0, b = t.rollBroke || 0; return { v: n + '回', n: (b ? 'ロールスクリーンの買い直し・' : '') + 'ずれたスクリーンを直す', sec: n * ROLL_SEC, yen: b * ROLL_YEN }; },
  init() { this.n = 0; this.len = 0.12; this.v = 0; this.ptr = null; this.armed = false; this.bang = 0; this.spin = 0; this.broke = false; this.say = ''; },
  started() { return this.n > 0; },
  result() { return this.n + '回'; },
  commit(tot) { add(tot, 'roll', this.n); add(tot, 'rollBroke', this.n >= ROLL_BREAK ? 1 : 0); mx(tot, 'rollMax', this.n); },
  geo() { const s = SC(); return { s, x: W * 0.12, y: H * 0.2, w: W * 0.76, h: H * 0.5 }; },
  down(id, x, y) { if (this.ptr == null) { this.ptr = id; this.y0 = y; this.len0 = this.len; this.v = 0; } },
  move(id, x, y) { if (id === this.ptr) { const g = this.geo(); this.len = clamp(this.len0 + (y - this.y0) / g.h, 0.12, 1.08); } },
  up(id) {
    if (id != null && id !== this.ptr) return;
    if (this.ptr == null) return;
    this.ptr = null; this.armed = this.len >= ROLL_MIN; this.v = -(2 + this.len * 4); // 離すとバネで巻き上がる
  },
  update(dt) {
    this.bang = Math.max(0, this.bang - dt); this.spin += this.v * dt * -8;
    if (this.ptr == null && this.v < 0) {
      this.v -= 10 * dt; this.len += this.v * dt;
      if (this.len <= 0.12) {
        this.len = 0.12; this.v = 0;
        if (this.armed) { this.armed = false; this.bang = 0.35; sfx.bang(); if (scoring()) { this.n++; if (this.n === ROLL_BREAK) { this.broke = true; this.say = 'バネがこわれた！'; this.bang = 0.8; sfx.crunch(); } } }
      }
    }
  },
  draw() {
    const g = this.geo(), s = g.s, shake = this.bang > 0 && !calm ? Math.sin(clock * 80) * 5 * this.bang : 0;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.84, W, H * 0.16); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.84 - 2, W, 3);
    // 窓の外（青空と雲と木）
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    const sky = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); sky.addColorStop(0, '#7cc4f5'); sky.addColorStop(1, '#cdeafc');
    ctx.fillStyle = sky; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = PAPER; for (const [cx, cy, r] of [[0.3, 0.25, 22], [0.4, 0.22, 28], [0.7, 0.4, 20]]) { ctx.beginPath(); ctx.arc(g.x + g.w * cx, g.y + g.h * cy, r * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#5fb35a'; ctx.beginPath(); ctx.arc(g.x + g.w * 0.8, g.y + g.h * 0.85, 60 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b97a45'; ctx.fillRect(g.x - 10 * s, g.y + g.h, g.w + 20 * s, 14 * s); ctx.strokeRect(g.x - 10 * s, g.y + g.h, g.w + 20 * s, 14 * s); // 窓台
    ctx.strokeRect(g.x, g.y, g.w, g.h); ctx.beginPath(); ctx.moveTo(g.x + g.w / 2, g.y); ctx.lineTo(g.x + g.w / 2, g.y + g.h); ctx.stroke();
    // スクリーン（壊れたら斜めにたれる）
    ctx.save(); ctx.translate(shake, 0);
    const sh = g.h * this.len, tilt = this.broke ? 0.08 : 0;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(tilt);
    ctx.fillStyle = '#f2e2c4'; ctx.fillRect(4 * s, 0, g.w - 8 * s, sh); ctx.strokeRect(4 * s, 0, g.w - 8 * s, sh);
    ctx.strokeStyle = 'rgba(185,122,69,.35)'; ctx.lineWidth = 2; for (let y = 16 * s; y < sh - 6 * s; y += 22 * s) { ctx.beginPath(); ctx.moveTo(8 * s, y); ctx.lineTo(g.w - 8 * s, y); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rr(0, sh - 6 * s, g.w, 14 * s, 6 * s); ctx.fillStyle = '#8a5a35'; ctx.fill(); ctx.stroke(); // 下のバー
    ctx.beginPath(); ctx.moveTo(g.w / 2, sh + 8 * s); ctx.lineTo(g.w / 2, sh + 34 * s); ctx.stroke(); ctx.beginPath(); ctx.arc(g.w / 2, sh + 42 * s, 8 * s, 0, Math.PI * 2); ctx.stroke(); // ひもの輪
    ctx.restore();
    // 巻き取りの箱（巻き上がるとき回る）
    rr(g.x - 14 * s, g.y - 26 * s, g.w + 28 * s, 30 * s, 8 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(g.x - 14 * s, g.y - 26 * s, g.w + 28 * s, 30 * s); ctx.clip(); ctx.strokeStyle = 'rgba(35,27,46,.3)';
    for (let i = 0; i < 12; i++) { const xx = g.x + ((i * 30 * s + this.spin * 20 * s) % (g.w + 28 * s)); ctx.beginPath(); ctx.moveTo(xx, g.y - 24 * s); ctx.lineTo(xx - 10 * s, g.y + 2 * s); ctx.stroke(); } ctx.restore();
    ctx.restore();
    if (this.bang > 0) bigText(this.broke && this.bang > 0.35 ? this.say : 'バチン！', W / 2, H * 0.12, Math.round(40 * s), HOT, PAPER, W * 0.85);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.1) % 1; finger(W / 2, g.y + g.h * (0.15 + p * 0.5), 0.9); }
};

/* ---------- 大盛り18: パーティーの風船 ---------- */
const BALLOON_PX = 400;    // 取っ手を押し込んだ長さ（指の動き）の合計がこの px（SC() を掛ける）になると割れる（風船ごとに15%前後する）
const BALLOON_STROKE = 240; // 取っ手を下まで押し込むのに指を動かす長さ px（SC()）。下まで押し切ったら、それ以上は空気が入らない
const BALLOON_SEC = 60;    // 飾りつけのやり直し（1個）
const BALLOON_BUY = 3, BALLOON_YEN = 1000; // 1回でこの数以上割ったら、パーティー用の風船を買い直し
const BALLOON_C = ['#ff5a4e', '#4f86f7', '#ffd23f', '#5fb35a', '#ff9ecf', '#b99cff'];
const balloon = {
  key: 'balloon', name: '風船', prompt: '割れ！', hint: '空気入れを 下にスワイプ', bg: '#fff0d6',
  bgm: song(144, [
    ['bell', 0.05, '72 . 76 . 79 . 84 . 79 . 76 . 72 . . . 74 . 77 . 81 . 86 . 81 . 77 . 74 . . .'],
    ['triangle', 0.13, '48 . . . 55 . . . 48 . . . 55 . . . 50 . . . 57 . . . 43 . . . 50 . . .']
  ], ['k.h.s.h.k.hhs.h.']),
  shop: [['パーティー用の風船', '風船 パーティー 飾り']],
  bill(t) { const n = t.balloon || 0, b = t.balloonBuy || 0; return { v: n + '個', n: (b ? '風船の買い直し・' : '') + '飾りつけのやり直し', sec: n * BALLOON_SEC, yen: b * BALLOON_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.bits = []; this.popT = 0; this.depth = 0; this.flowT = 0; this.ci = Math.floor(Math.random() * BALLOON_C.length); this.next(); },
  next() { this.b = { air: 0, k: 0, limit: BALLOON_PX * SC() * rnd(0.85, 1.15), c: BALLOON_C[this.ci++ % BALLOON_C.length], in: 1 }; this.tick = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'balloon', this.n); add(tot, 'balloonBuy', this.n >= BALLOON_BUY ? 1 : 0); mx(tot, 'balloonMax', this.n); },
  geo() { const s = SC(); return { s, cx: W * 0.44, cy: H * 0.44, px: W * 0.78, py: H * 0.84 }; },
  down(id, x, y) { this.ptr[id] = y; },
  move(id, x, y) { // 取っ手が指についてくる。押し込んだ長さのぶんだけ空気が入る（上へもどすと取っ手が上がる）
    if (!(id in this.ptr)) return;
    const st = BALLOON_STROKE * SC(), d0 = this.depth;
    this.depth = clamp(d0 + (y - this.ptr[id]) / st, 0, 1); this.ptr[id] = y;
    if (this.depth > d0) this.pump((this.depth - d0) * st);
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  pump(dy) {
    const g = this.geo(), s = g.s, b = this.b;
    this.flowT = 0.12; if (b.in > 0) return;
    b.air += dy; this.tick += dy;
    if (this.tick > 60 * s) { this.tick = 0; sfx.inflate(b.air / b.limit); sfx.pump(); }
    if (b.air >= b.limit) { // 限界でパーン。次の風船へ
      const R = this.radius();
      for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(200, 520) * s; this.bits.push({ x: g.cx + Math.cos(a) * R * 0.6, y: g.cy + Math.sin(a) * R * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(0, 6), c: i % 3 ? b.c : BALLOON_C[(this.ci + i) % BALLOON_C.length] }); }
      if (scoring()) this.n++;
      this.popT = 0.45; sfx.pop(); this.next();
    }
  },
  update(dt) {
    const g = this.geo(), s = g.s, b = this.b;
    this.popT = Math.max(0, this.popT - dt); this.flowT = Math.max(0, this.flowT - dt); b.in = Math.max(0, b.in - dt / 0.15);
    b.k += (b.air / b.limit - b.k) * (1 - Math.exp(-dt * 18)); // 押すたびに、すっとふくらむ
    if (!Object.keys(this.ptr).length) this.depth = Math.max(0, this.depth - dt / 0.2); // 指をはなすと取っ手がもどる
    for (let i = this.bits.length - 1; i >= 0; i--) { const f = this.bits[i]; f.vx *= Math.exp(-dt * 2); f.vy = f.vy * Math.exp(-dt * 2) + 500 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 6; if (f.y > H + 20) this.bits.splice(i, 1); }
  },
  radius() { const s = SC(), k = Math.min(1, this.b.k); return (34 + 116 * k) * s * (1 - this.b.in * 0.6); },
  draw() {
    const g = this.geo(), s = g.s, b = this.b, k = b.air >= b.limit * 0.8 ? 1 : 0; // 割れそうになると、ふるえる
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.84, W, H * 0.16); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.84 - 2, W, 3);
    // 飾りつけ：三角の旗と「おたんじょうび おめでとう」、すみの風船
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, H * 0.16); ctx.quadraticCurveTo(W / 2, H * 0.22, W, H * 0.16); ctx.stroke();
    for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9, x = W * t, y = H * 0.16 + Math.sin(t * Math.PI) * H * 0.03; ctx.beginPath(); ctx.moveTo(x - 14 * s, y); ctx.lineTo(x + 14 * s, y); ctx.lineTo(x, y + 26 * s); ctx.closePath(); ctx.fillStyle = BALLOON_C[i % BALLOON_C.length]; ctx.fill(); ctx.stroke(); }
    ctx.font = `${Math.round(20 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = HOT; ctx.fillText('おたんじょうび おめでとう', W / 2, H * 0.27); ctx.textAlign = 'left';
    for (const [x, c] of [[0.08, '#ff9ecf'], [0.92, '#4f86f7']]) { ctx.beginPath(); ctx.moveTo(W * x, H * 0.5); ctx.lineTo(W * x, H * 0.84); ctx.stroke(); ctx.beginPath(); ctx.ellipse(W * x, H * 0.45, 24 * s, 30 * s, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 2; }
    // 空気入れとチューブ。取っ手は押し込んだ深さの位置。棒は本体の後ろ
    const px = g.px, py = g.py, hy = py - 160 * s + this.depth * 58 * s; // 取っ手の上の端
    const t0x = px - 18 * s, t0y = py - 24 * s, tcx = g.cx, tcy = py - 10 * s, t1x = g.cx, t1y = g.cy + this.radius() + 8 * s; // チューブ（2次ベジェ）
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(t0x, t0y); ctx.quadraticCurveTo(tcx, tcy, t1x, t1y); ctx.lineWidth = 6 * s; ctx.stroke(); ctx.lineWidth = 3;
    if (this.flowT > 0) for (let i = 0; i < 4; i++) { // 空気が入っている間、チューブの中を白い粒が流れる
      const u = (clock * 3 + i / 4) % 1, v = 1 - u, qx = v * v * t0x + 2 * u * v * tcx + u * u * t1x, qy = v * v * t0y + 2 * u * v * tcy + u * u * t1y;
      ctx.beginPath(); ctx.arc(qx, qy, 2.5 * s, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill();
    }
    ctx.fillStyle = INK; ctx.fillRect(px - 3 * s, hy + 6 * s, 6 * s, py - 50 * s - hy);
    rr(px - 18 * s, py - 90 * s, 36 * s, 90 * s, 6 * s); ctx.fillStyle = HOT; ctx.fill(); ctx.stroke();
    rr(px - 30 * s, hy, 60 * s, 12 * s, 5 * s); ctx.fillStyle = INK; ctx.fill();
    // 風船（限界が近いとふるえる）
    const R = this.radius(), jit = k && b.air > 0 && !calm ? 4 * s : 0, bx = g.cx + rnd(-jit, jit), by = g.cy + rnd(-jit, jit);
    ctx.beginPath(); ctx.ellipse(bx, by, R * 0.88, R, 0, 0, Math.PI * 2); ctx.fillStyle = b.c; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx - R * 0.35, by - R * 0.45, R * 0.12, R * 0.22, -0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - 8 * s, by + R + 10 * s); ctx.lineTo(bx + 8 * s, by + R + 10 * s); ctx.lineTo(bx, by + R - 2 * s); ctx.closePath(); ctx.fillStyle = b.c; ctx.fill(); ctx.stroke(); // 結び目
    for (const f of this.bits) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.fillStyle = f.c; ctx.fillRect(-7 * s, -4 * s, 14 * s, 8 * s); ctx.restore(); }
    if (this.popT > 0) bigText('パーン！', W / 2, H * 0.36, Math.round(48 * s), HOT, PAPER, W * 0.8);
  },
  drawHint(t) { const p = (t * 1.2) % 1; finger(W * 0.78, H * 0.84 - 150 * SC() + p * 160 * SC(), 0.9); }
};

/* ---------- 大盛り19: 家じゅうの時計 ---------- */
const CLOCK_LATE = 12, CLOCK_YEN = 1000; // 1回でこの時間以上進めたら、翌朝みんな大あわてでタクシー
const CLOCK_SEC = 30;   // 家じゅうの時計を合わせ直す（1時間）
const CLOCK_START = 21; // 夜9時から進める
const wallClock = {
  key: 'clock', name: '時計', prompt: '進めろ！', hint: '針を ぐるぐる回す', bg: '#efe3cf',
  bgm: song(132, [
    ['bell', 0.05, '84 . 79 . 76 . 79 . 84 . 79 . 76 . 79 . 86 . 81 . 77 . 81 . 86 . 81 . 77 . 81 .'],
    ['triangle', 0.13, '48 . . . . . . . 43 . . . . . . . 50 . . . . . . . 43 . . . . . . .']
  ], ['r...r...r...r.r.']),
  shop: [['電波時計', '電波時計 掛け時計']],
  bill(t) { const n = Math.floor(t.clock || 0), l = t.clockLate || 0; return { v: n + '時間', n: (l ? 'みんな大あわてでタクシー・' : '') + '家じゅうの時計を合わせ直す', sec: n * CLOCK_SEC, yen: l * CLOCK_YEN }; },
  init() { this.n = 0; this.mins = 0; this.ptr = null; this.la = 0; this.alarm = 0; this.rang = false; },
  started() { return this.n >= 1; },
  result() { return Math.floor(this.n) + '時間'; },
  commit(tot) { add(tot, 'clock', Math.floor(this.n)); add(tot, 'clockLate', this.n >= CLOCK_LATE ? 1 : 0); mx(tot, 'clockMax', Math.floor(this.n)); },
  geo() { const s = SC(); return { s, cx: W / 2, cy: H * 0.5, R: Math.min(W * 0.4, 150 * s) }; },
  down(id, x, y) { if (this.ptr == null) { const g = this.geo(); this.ptr = id; this.la = Math.atan2(y - g.cy, x - g.cx); } },
  move(id, x, y) { // 指で円をかくと長針がついてくる。右回りで進む（左回りでもどる）
    if (id !== this.ptr) return;
    const g = this.geo(); if (Math.hypot(x - g.cx, y - g.cy) < g.R * 0.15) return;
    const a = Math.atan2(y - g.cy, x - g.cx); let d = a - this.la; this.la = a;
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    const before = this.mins; this.mins = Math.max(0, this.mins + d / (Math.PI * 2) * 60);
    if (Math.floor(this.mins / 5) !== Math.floor(before / 5)) sfx.tick();
    if (Math.floor(this.mins / 60) > Math.floor(before / 60)) sfx.ding(Math.floor(this.mins / 60));
    if (scoring()) this.n = Math.max(this.n, this.mins / 60);
    if (!this.rang && this.mins / 60 >= 24 - CLOCK_START + 7) { this.rang = true; this.alarm = 1; sfx.alarm(); } // 翌朝7時を過ぎたら目覚ましが鳴る
  },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  update(dt) { this.alarm = Math.max(0, this.alarm - dt); },
  sky(h) { // 時刻ごとの空の色
    if (h < 5 || h >= 19) return ['#1d2340', '#2b3566'];
    if (h < 7) return ['#ff9a6b', '#ffd6a0'];
    if (h < 17) return ['#7cc4f5', '#cdeafc'];
    return ['#ff8a5c', '#ffc78a'];
  },
  draw() {
    const g = this.geo(), s = g.s, total = CLOCK_START * 60 + this.mins, h = (total / 60) % 24, m = total % 60, day = Math.floor(total / 60 / 24);
    const [c1, c2] = this.sky(h), night = h < 5 || h >= 19;
    ctx.fillStyle = night ? '#9a8f80' : this.bg; ctx.fillRect(0, 0, W, H);
    // 窓（外が朝・昼・夕方・夜に変わる）
    const wx = W * 0.08, wy = H * 0.15, ww = W * 0.3, wh = H * 0.13;
    const gr = ctx.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = night ? POP : '#fff3a0'; ctx.beginPath(); ctx.arc(wx + ww * 0.7, wy + wh * 0.4, 10 * s, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(wx, wy, ww, wh);
    ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, H * 0.86, W, H * 0.14); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.86 - 2, W, 3);
    // 大きな掛け時計
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R + 14 * s, 0, Math.PI * 2); ctx.fillStyle = '#8a5a35'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${Math.round(g.R * 0.2)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI * 2; ctx.fillText(i, g.cx + Math.cos(a) * g.R * 0.78, g.cy + Math.sin(a) * g.R * 0.78); }
    const ah = -Math.PI / 2 + ((h % 12) + m / 60) / 12 * Math.PI * 2, am = -Math.PI / 2 + m / 60 * Math.PI * 2;
    ctx.lineCap = 'round'; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx + Math.cos(ah) * g.R * 0.5, g.cy + Math.sin(ah) * g.R * 0.5); ctx.stroke();
    ctx.lineWidth = 6 * s; ctx.strokeStyle = HOT; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx + Math.cos(am) * g.R * 0.82, g.cy + Math.sin(am) * g.R * 0.82); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(g.cx, g.cy, 8 * s, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    // 今の時刻（朝・昼・夜）と、何日後か
    const hh = Math.floor(h), word = hh < 4 ? '夜中' : hh < 10 ? '朝' : hh < 16 ? '昼' : hh < 19 ? '夕方' : '夜';
    ctx.font = `${Math.round(24 * s)}px ${DISPLAY}`; ctx.fillStyle = INK;
    ctx.fillText(word + ' ' + (hh % 12 === 0 ? 12 : hh % 12) + ':' + String(Math.floor(m)).padStart(2, '0') + (day ? '（' + day + '日後）' : ''), g.cx, g.cy + g.R + 46 * s);
    ctx.textAlign = 'left';
    if (this.alarm > 0) bigText('ジリリリリ！', W / 2, H * 0.24, Math.round(36 * s), HOT, PAPER, W * 0.85);
  },
  drawHint(t) { const g = this.geo(), a = t * 5; finger(g.cx + Math.cos(a) * g.R * 0.6, g.cy + Math.sin(a) * g.R * 0.6, 0.9); }
};

/* ---------- 大盛り20: ハンコ ---------- */
const HANKO_PAGE = 24;   // 書類1枚に押せる数。いっぱいになったら次の書類
const HANKO_SEC = 15;    // ハンコを修正テープで消す（1個）
const HANKO_REDO = 24, HANKO_YEN = 1000; // 1回でこの数以上（書類1枚ぶん）押したら、パパが書類を作り直し
const HANKO_WORDS = ['済', '至急', '秘', '重要', '確認', '承認']; // 押すたびに順番に
const hanko = {
  key: 'hanko', name: 'ハンコ', prompt: '押しまくれ！', hint: '書類を タップ', bg: '#c9a77c',
  bgm: song(150, [
    ['square', 0.04, '76 . . 76 79 . 76 . 74 . . 74 77 . 74 . 72 . . 72 76 . 72 . 71 . 74 . 79 . . .'],
    ['triangle', 0.13, '48 . 55 . 48 . 55 . 50 . 57 . 50 . 57 . 45 . 52 . 45 . 52 . 43 . 50 . 43 . 50 .']
  ], ['k.s.k.s.k.s.k.ss']),
  shop: [['朱肉', '朱肉']],
  bill(t) { const n = t.hanko || 0, r = t.hankoRedo || 0; return { v: n + '個', n: (r ? 'パパの書類の作り直し・' : '') + 'ハンコを修正テープで消す', sec: n * HANKO_SEC, yen: r * HANKO_YEN }; },
  init() { this.n = 0; this.marks = []; this.wi = 0; this.slide = 0; this.press = null; },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'hanko', this.n); add(tot, 'hankoRedo', this.n >= HANKO_REDO ? 1 : 0); mx(tot, 'hankoMax', this.n); },
  geo() { const s = SC(); return { s, x: W * 0.1, y: H * 0.16, w: W * 0.8, h: H * 0.62 }; },
  down(id, x, y) { // どこをタップしても、書類の上の近いところにポン
    if (this.slide > 0) return;
    const g = this.geo(), m = 26 * g.s, px = clamp(x, g.x + m, g.x + g.w - m), py = clamp(y, g.y + m, g.y + g.h - m);
    this.marks.push({ x: px, y: py, w: HANKO_WORDS[this.wi++ % HANKO_WORDS.length], r: rnd(-0.3, 0.3) });
    this.press = { x: px, y: py, t: 0.14 }; sfx.pon();
    if (scoring()) this.n++;
    if (this.marks.length >= HANKO_PAGE) this.slide = 1;
  },
  move() {}, up() {},
  update(dt) {
    if (this.press) { this.press.t -= dt; if (this.press.t <= 0) this.press = null; }
    if (this.slide > 0) { this.slide = Math.max(0, this.slide - dt / 0.4); if (this.slide === 0) this.marks = []; }
  },
  mark(k) { // 赤いハンコ。「済」「秘」は丸、ほかは四角
    const s = SC(), round = k.w.length === 1;
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.r); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#d9302c'; ctx.fillStyle = '#d9302c'; ctx.lineWidth = 3 * s;
    if (round) { ctx.beginPath(); ctx.arc(0, 0, 22 * s, 0, Math.PI * 2); ctx.stroke(); ctx.font = `${Math.round(24 * s)}px ${DISPLAY}`; }
    else { rr(-34 * s, -17 * s, 68 * s, 34 * s, 4 * s); ctx.stroke(); ctx.lineWidth = 1.5 * s; rr(-30 * s, -13 * s, 60 * s, 26 * s, 3 * s); ctx.stroke(); ctx.font = `${Math.round(20 * s)}px ${DISPLAY}`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k.w, 0, 1 * s);
    ctx.restore();
  },
  paper(dx, marks) { // パパの大事な書類
    const g = this.geo(), s = g.s, x = g.x + dx;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 6 * s, g.y + 8 * s, g.w, g.h);
    ctx.fillStyle = PAPER; ctx.fillRect(x, g.y, g.w, g.h); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x, g.y, g.w, g.h);
    ctx.fillStyle = INK; ctx.font = `${Math.round(24 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('契約書', x + g.w / 2, g.y + 34 * s); ctx.textAlign = 'left';
    ctx.fillStyle = '#b8b2a6'; for (let yy = g.y + 70 * s; yy < g.y + g.h - 70 * s; yy += 14 * s) ctx.fillRect(x + 20 * s, yy, g.w - 40 * s - (yy % 3) * 10 * s, 3 * s); // 文の行
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + g.w - 44 * s, g.y + g.h - 40 * s, 20 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#b8b2a6'; ctx.font = `${Math.round(16 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillText('印', x + g.w - 44 * s, g.y + g.h - 40 * s); ctx.textAlign = 'left'; // 本当に押すところ
    for (const k of marks) this.mark({ ...k, x: k.x + dx });
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(90,58,34,.25)'; ctx.lineWidth = 2; for (let y = 20 * s; y < H; y += 36 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 8 * s, W * 0.6, y - 8 * s, W, y); ctx.stroke(); } // 机の木目
    if (this.slide > 0) { this.paper(-(1 - this.slide) * W, this.marks); this.paper(this.slide * W, []); }
    else this.paper(0, this.marks);
    // 朱肉とハンコ（押した瞬間はその場所に下りている）
    const ix = W * 0.82, iy = H * 0.88;
    ctx.beginPath(); ctx.arc(ix, iy, 26 * s, 0, Math.PI * 2); ctx.fillStyle = '#3a3a48'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(ix, iy, 18 * s, 0, Math.PI * 2); ctx.fillStyle = '#d9302c'; ctx.fill();
    const hx = this.press ? this.press.x : W * 0.62, hy = this.press ? this.press.y - 10 * s : H * 0.86;
    rr(hx - 12 * s, hy - 70 * s, 24 * s, 70 * s, 10 * s); ctx.fillStyle = '#e9c88a'; ctx.fill(); ctx.stroke(); // ハンコの柄
    rr(hx - 14 * s, hy - 8 * s, 28 * s, 12 * s, 3 * s); ctx.fillStyle = '#d9302c'; ctx.fill(); ctx.stroke();
  },
  drawHint(t) { const g = this.geo(); tapHint(g.x + g.w / 2, g.y + g.h / 2, t, 2); }
};

STAGE_LIST.push(closet, roll, balloon, wallClock, hanko);
ZUKAN_EXTRA.push(
  { id: 'closet', name: '布団なだれ', desc: '押し入れの布団を1回で40枚くずす', ok: t => (t.closetMax || 0) >= 40 },
  { id: 'rollScreen', name: 'ビヨーン名人', desc: 'ロールスクリーンを1回で15回 バチンとさせる', ok: t => (t.rollMax || 0) >= 15 }, // id の roll はトイレットペーパーの項目が使っている
  { id: 'balloon', name: 'パーティー台なし', desc: '風船を1回で12個 割る', ok: t => (t.balloonMax || 0) >= 12 },
  { id: 'clock', name: '未来へ早送り', desc: '時計を1回で20時間 進める', ok: t => (t.clockMax || 0) >= 20 },
  { id: 'hanko', name: 'ハンコ部長', desc: 'ハンコを1回で40個 押す', ok: t => (t.hankoMax || 0) >= 40 }
);

/* ===== 第5弾（2026-10-26 追加） ===== */
Object.assign(sfx, {
  bite() { tone(520, 300, 0.06, 0.15, 'square'); noise(0.05, 1200, 1, 0.15); },
  plop() { tone(420, 120, 0.12, 0.3, 'sine'); noise(0.1, 900, 0.8, 0.2, 'lowpass'); },
  knot() { tone(700, 480, 0.05, 0.12, 'triangle'); noise(0.04, 3000, 2, 0.12); },
  scatter() { for (let i = 0; i < 4; i++) noise(0.04, rnd(2000, 4000), 1, 0.12, 'bandpass', i * 0.03); },
  toss() { noise(0.08, 1500, 1, 0.12, 'highpass'); }
});

/* ---------- 大盛り21: 菓子折り ---------- */
const GIFT_PULL = 90;  // 箱を押したまま、この長さ px（SC()）上へ引っぱると、包み紙がビリッと破れる
const GIFT_SEC = 60;   // 包み紙を買ってきて、包み直す（1箱）
const GIFT_BUY = 5, GIFT_YEN = 1000; // 1回でこの数以上破いたら、お詫びに持っていけないので、菓子折りの買い直し
const GIFT_PAPER = [['#efe0bf', '#b0864f'], ['#d6e4f2', '#4f7fb5'], ['#f4d6dc', '#c0566e'], ['#dbe8cc', '#5f8f4a']]; // 包み紙の地の色・柄の色
const gift = {
  key: 'gift', name: '菓子折り', prompt: '破れ！', hint: '包み紙を 上に引っぱる', bg: '#f1e6d2',
  bgm: song(152, [
    ['square', 0.045, '76 . 79 . 81 . 79 . 76 . 72 . 74 . . . 77 . 81 . 84 . 81 . 77 . 74 . 76 . . .'],
    ['triangle', 0.13, '48 . . . 55 . . . 53 . . . 55 . . . 50 . . . 57 . . . 55 . . . 43 . . .']
  ], ['k.hhs.h.k.hhs.hh']),
  shop: [['菓子折り', '菓子折り'], ['包装紙', '包装紙']],
  bill(t) { const n = t.gift || 0, b = t.giftBuy || 0; return { v: n + '箱', n: (b ? '菓子折りの買い直し・' : '') + '包み直す', sec: n * GIFT_SEC, yen: b * GIFT_YEN }; },
  init() { this.n = 0; this.ptr = null; this.y0 = 0; this.t0 = 0; this.pull = 0; this.pi = Math.floor(Math.random() * GIFT_PAPER.length); this.box = this.newBox(); this.bits = []; this.scraps = []; this.falling = []; this.pile = []; this.wait = 0; this.say = ''; this.sayT = 0; },
  newBox() { return { p: GIFT_PAPER[this.pi++ % GIFT_PAPER.length], in: 1 }; },
  started() { return this.n > 0; },
  result() { return this.n + '箱'; },
  commit(tot) { add(tot, 'gift', this.n); add(tot, 'giftBuy', this.n >= GIFT_BUY ? 1 : 0); mx(tot, 'giftMax', this.n); },
  geo() { const s = SC(); return { s, cx: W / 2, cy: H * 0.46, w: 230 * s, h: 150 * s, floor: H * 0.8 }; },
  down(id, x, y) { // 箱のあたりを押す（次の箱が入ってくる途中でも、ほぼ着いていれば押せる）
    const g = this.geo();
    if (this.ptr == null && this.box && this.box.in < 0.3 && Math.abs(x - g.cx) < g.w * 0.7 && Math.abs(y - g.cy) < g.h * 1.1) { this.ptr = id; this.y0 = y; this.t0 = clock; }
  },
  move(id, x, y) {
    if (id !== this.ptr) return;
    const s = SC(); this.pull = Math.max(0, this.y0 - y);
    if (this.pull > GIFT_PULL * s) this.open(this.pull / Math.max(0.04, clock - this.t0) / s);
  },
  up(id) { if (id == null || id === this.ptr) this.ptr = null; },
  open(sp) { // ビリッ。速く引っぱるほど、紙が細かく派手に飛ぶ
    const g = this.geo(), s = g.s, b = this.box, k = clamp(sp / 1400, 0.35, 1);
    const m = Math.round(12 + k * 26);
    for (let i = 0; i < m; i++) this.bits.push({ x: g.cx + rnd(-0.45, 0.45) * g.w, y: g.cy + rnd(-0.4, 0.3) * g.h, vx: rnd(-1, 1) * 420 * s * k, vy: -rnd(300, 900) * s * k, r: rnd(0, 6), vr: rnd(-8, 8), c: i % 4 ? b.p[0] : PAPER, z: rnd(8, 18) * s * (1.3 - k * 0.5), land: g.floor + rnd(6, H - g.floor - 8) });
    this.bits.push({ x: g.cx, y: g.cy, vx: rnd(-1, 1) * 200 * s, vy: -700 * s, r: 0, vr: rnd(-4, 4), c: 'noshi', z: 0, land: g.floor + rnd(10, H - g.floor - 20) }); // のし紙も飛ぶ
    this.falling.push({ x: g.cx, y: g.cy, vx: rnd(-1, 1) * 160 * s, vy: -120 * s, r: 0, vr: rnd(-1, 1) * 2 });
    if (scoring()) this.n++;
    if (scoring() && this.n === GIFT_BUY) { this.say = 'お詫びに行けない…！'; this.sayT = 1; }
    else if (k > 0.8) { this.say = 'ビリビリビリッ！'; this.sayT = 0.5; } else if (this.sayT <= 0.2) { this.say = 'ビリッ！'; this.sayT = 0.4; }
    sfx.rip(); sfx.scatter();
    this.box = null; this.ptr = null; this.pull = 0; this.wait = 0.2;
  },
  update(dt) {
    const g = this.geo(), s = g.s;
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.ptr == null) this.pull *= Math.exp(-dt * 16); // 途中で離したら戻る
    if (!this.box) { this.wait -= dt; if (this.wait <= 0) this.box = this.newBox(); }
    else this.box.in = Math.max(0, this.box.in - dt / 0.22);
    for (let i = this.bits.length - 1; i >= 0; i--) { // 紙きれは、ひらひら落ちて床に残る
      const f = this.bits[i]; f.vy = Math.min(f.vy + 1300 * s * dt, 260 * s); f.vx *= Math.exp(-dt * 1.5); f.x += f.vx * dt + Math.sin(clock * 6 + f.r) * 30 * s * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.y >= f.land && f.vy > 0) { this.scraps.push(f); this.bits.splice(i, 1); }
    }
    if (this.scraps.length > 200) this.scraps.splice(0, this.scraps.length - 200);
    for (let i = this.falling.length - 1; i >= 0; i--) { // 包み紙のなくなった箱は、床に積まれる
      const f = this.falling[i]; f.vy += 1800 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.y > g.floor + 10 * s && f.vy > 0) { this.pile.push({ x: clamp(f.x + rnd(-1, 1) * W * 0.3, W * 0.15, W * 0.85), y: g.floor + rnd(14, H - g.floor - 30 * s), r: rnd(-0.4, 0.4) }); if (this.pile.length > 10) this.pile.shift(); this.falling.splice(i, 1); }
    }
  },
  scrap(f) { // 紙きれ（のし紙は細長い白に赤い線）
    const s = SC(); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.lineWidth = 2; ctx.strokeStyle = INK;
    if (f.c === 'noshi') { ctx.fillStyle = PAPER; ctx.fillRect(-14 * s, -40 * s, 28 * s, 80 * s); ctx.strokeRect(-14 * s, -40 * s, 28 * s, 80 * s); ctx.fillStyle = '#d9302c'; ctx.fillRect(-14 * s, -6 * s, 28 * s, 4 * s); }
    else { ctx.beginPath(); ctx.moveTo(-f.z, -f.z * 0.6); ctx.lineTo(f.z * 0.8, -f.z * 0.8); ctx.lineTo(f.z, f.z * 0.5); ctx.lineTo(-f.z * 0.6, f.z * 0.7); ctx.closePath(); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  },
  plain(x, y, w, h, r) { // 包み紙をはがした箱（ふたに「銘菓」）
    const s = SC(); ctx.save(); ctx.translate(x, y); ctx.rotate(r || 0); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rr(-w / 2, -h / 2, w, h, 6 * s); ctx.fillStyle = '#f6efe0'; ctx.fill(); ctx.stroke();
    ctx.strokeRect(-w / 2 + 6 * s, -h / 2 + 6 * s, w - 12 * s, h - 12 * s);
    ctx.fillStyle = INK; ctx.font = `${Math.round(h * 0.22)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('銘菓', 0, 0); ctx.textAlign = 'left';
    ctx.restore();
  },
  wrapped(x, y, w, h, p, pull) { // 包み紙とのし紙（「お詫び」）。引っぱると、紙の上のふちがめくれる
    const s = SC();
    this.plain(x, y, w, h);
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    const lift = Math.min(pull, 140 * s);
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h / 2); ctx.quadraticCurveTo(x, y - h / 2 - lift * 0.5, x + w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath();
    ctx.fillStyle = p[0]; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.strokeStyle = p[1]; ctx.globalAlpha = 0.45; ctx.lineWidth = 6 * s; // ななめのしま
    for (let k = -h * 2; k < w + h; k += 22 * s) { ctx.beginPath(); ctx.moveTo(x - w / 2 + k, y + h / 2); ctx.lineTo(x - w / 2 + k + h * 1.4, y - h / 2 - lift); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = PAPER; ctx.fillRect(x - 26 * s, y - h / 2 - lift * 0.3, 52 * s, h + lift * 0.3); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x - 26 * s, y - h / 2 - lift * 0.3, 52 * s, h + lift * 0.3); // のし紙
    ctx.fillStyle = '#d9302c'; ctx.fillRect(x - 26 * s, y - 2 * s, 52 * s, 3 * s); ctx.fillRect(x - 26 * s, y + 4 * s, 52 * s, 3 * s); // 水引
    ctx.fillStyle = INK; ctx.font = `${Math.round(18 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['お', '詫', 'び'].forEach((c, i) => ctx.fillText(c, x, y - h * 0.4 + i * 19 * s)); // 表書きは水引の上、下は「家族一同」
    ctx.font = `${Math.round(12 * s)}px ${DISPLAY}`; ['家', '族', '一', '同'].forEach((c, i) => ctx.fillText(c, x, y + 17 * s + i * 13 * s)); ctx.textAlign = 'left';
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.floor);
    ctx.fillStyle = '#d8d49a'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3); // 畳
    ctx.strokeStyle = 'rgba(35,27,46,.2)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += W / 3) { ctx.beginPath(); ctx.moveTo(x, g.floor); ctx.lineTo(x, H); ctx.stroke(); }
    // 壁のメモ「お隣へ あした持っていく」
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rr(W * 0.6, H * 0.14, W * 0.32, H * 0.09, 4 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${Math.round(15 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('お隣へ', W * 0.76, H * 0.165); ctx.fillText('あした持っていく', W * 0.76, H * 0.2, W * 0.3); ctx.textAlign = 'left';
    // ちゃぶ台
    ctx.fillStyle = '#7a5236'; ctx.fillRect(g.cx - W * 0.3, g.cy + g.h * 0.6, 12 * s, H * 0.14); ctx.fillRect(g.cx + W * 0.3 - 12 * s, g.cy + g.h * 0.6, 12 * s, H * 0.14);
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy + g.h * 0.55, W * 0.44, 30 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#9c6b45'; ctx.fill(); ctx.stroke();
    for (const p of this.pile) this.plain(p.x, p.y, g.w * 0.45, g.h * 0.45, p.r);
    for (const f of this.scraps) this.scrap(f);
    if (this.box) this.wrapped(g.cx + this.box.in * W, g.cy, g.w, g.h, this.box.p, this.pull);
    for (const f of this.falling) this.plain(f.x, f.y, g.w * 0.8, g.h * 0.8, f.r);
    for (const f of this.bits) this.scrap(f);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.3, Math.round(34 * s), HOT, PAPER, W * 0.85);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.3) % 1; finger(g.cx - 60 * g.s, g.cy + 30 * g.s - p * 110 * g.s, 0.9); }
};

/* ---------- 大盛り22: ケーキのいちご ---------- */
const CAKE_N = 6;      // ケーキ1台にのっているいちご
const CAKE_PULL = 50;  // いちごをつまんで、この長さ px（SC()）動かすと、パクッ
const CAKE_GRAB = 70;  // いちごの真ん中からこの距離 px（SC()）までなら、つまめる
const CAKE_SEC = 30;   // いちごを買ってきて、のせ直す（1個）
const CAKE_REDO = 6, CAKE_YEN = 1000; // 1回でこの数以上（1台ぶん）食べたら、ケーキの買い直し
const cake = {
  key: 'cake', name: 'ケーキのいちご', prompt: 'つまめ！', hint: 'いちごを つまんで ひっぱる', bg: '#fde3ea',
  bgm: song(128, [
    ['bell', 0.05, '79 . 76 . 72 . 76 . 79 . 84 . 83 . . . 81 . 77 . 74 . 77 . 81 . 79 . . . . .'],
    ['triangle', 0.13, '48 . . . 52 . . . 55 . . . 52 . . . 53 . . . 57 . . . 55 . . . 50 . . .']
  ], ['k...s...k.k.s...']),
  shop: [['いちご', 'いちご'], ['ホールケーキ', 'ホールケーキ']],
  bill(t) { const n = t.cake || 0, r = t.cakeRedo || 0; return { v: n + '個', n: (r ? 'ケーキの買い直し・' : '') + 'いちごをのせ直す', sec: n * CAKE_SEC, yen: r * CAKE_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.berries = this.newCake(); this.old = null; this.slide = 0; this.wait = 0; this.bites = []; this.say = ''; this.sayT = 0; },
  newCake() { return Array.from({ length: CAKE_N }, (_, i) => ({ a: i / CAKE_N * Math.PI * 2, gone: false, held: false })); },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'cake', this.n); add(tot, 'cakeRedo', this.n >= CAKE_REDO ? 1 : 0); mx(tot, 'cakeMax', this.n); },
  geo() { const s = SC(), rx = Math.min(W * 0.42, 160 * s); return { s, cx: W / 2, cy: H * 0.36, rx, ry: rx * 0.46, ch: 92 * s }; },
  bpos(b, g, dx) { return [g.cx + (dx || 0) + Math.cos(b.a) * g.rx * 0.76, g.cy + Math.sin(b.a) * g.ry * 0.8 - 12 * g.s]; },
  down(id, x, y) { // いちばん近いいちごをつまむ
    if (this.slide > 0 || this.wait > 0) return;
    const g = this.geo(); let best = null, bd = CAKE_GRAB * g.s;
    for (const b of this.berries) { if (b.gone || b.held) continue; const [bx, by] = this.bpos(b, g), d = Math.hypot(x - bx, y - by); if (d < bd) { bd = d; best = b; } }
    if (best) { best.held = true; this.ptr[id] = { b: best, x, y, x0: x, y0: y }; }
  },
  move(id, x, y) {
    const p = this.ptr[id]; if (!p) return;
    p.x = x; p.y = y;
    if (Math.hypot(x - p.x0, y - p.y0) > CAKE_PULL * SC()) { // パクッ
      p.b.gone = true; p.b.held = false; delete this.ptr[id];
      this.bites.push({ x, y, t: 0.45 }); sfx.bite();
      if (scoring()) { this.n++; if (this.n === CAKE_REDO) { this.say = 'いちごが ひとつもない！'; this.sayT = 1; } }
      if (this.berries.every(b => b.gone)) this.wait = 0.25;
    }
  },
  up(id) {
    const drop = p => { p.b.held = false; };
    if (id == null) { Object.values(this.ptr).forEach(drop); this.ptr = {}; return; }
    const p = this.ptr[id]; if (p) { drop(p); delete this.ptr[id]; }
  },
  update(dt) {
    this.sayT = Math.max(0, this.sayT - dt);
    for (let i = this.bites.length - 1; i >= 0; i--) { this.bites[i].t -= dt; if (this.bites[i].t <= 0) this.bites.splice(i, 1); }
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { this.old = this.berries; this.berries = this.newCake(); this.slide = 1; } } // 空になったら次のケーキ
    if (this.slide > 0) { this.slide = Math.max(0, this.slide - dt / 0.35); if (this.slide === 0) this.old = null; }
  },
  berry(x, y, k) { // いちご（へたつき）
    const s = SC() * k;
    ctx.beginPath(); ctx.moveTo(x, y + 18 * s); ctx.bezierCurveTo(x - 20 * s, y + 4 * s, x - 16 * s, y - 14 * s, x, y - 12 * s); ctx.bezierCurveTo(x + 16 * s, y - 14 * s, x + 20 * s, y + 4 * s, x, y + 18 * s);
    ctx.fillStyle = '#ff3b4e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#ffe680'; for (const [a, b] of [[-6, -2], [5, -3], [0, 5], [-7, 7], [7, 6]]) ctx.fillRect(x + a * s - 1, y + b * s - 1, 2.5, 2.5);
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 12 * s); ctx.lineTo(x, y - 6 * s); ctx.lineTo(x + 12 * s, y - 12 * s); ctx.lineTo(x, y - 18 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  },
  cakeDraw(dx, berries, held) {
    const g = this.geo(), s = g.s, cx = g.cx + dx;
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.ellipse(cx, g.cy + g.ch + 8 * s, g.rx * 1.18, g.ry * 1.2, 0, 0, Math.PI * 2); ctx.fillStyle = '#dfe9f2'; ctx.fill(); ctx.stroke(); // お皿
    ctx.beginPath(); ctx.moveTo(cx - g.rx, g.cy); ctx.lineTo(cx - g.rx, g.cy + g.ch); ctx.ellipse(cx, g.cy + g.ch, g.rx, g.ry, 0, Math.PI, 0, true); ctx.lineTo(cx + g.rx, g.cy); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); // 横のクリーム
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(cx - g.rx + 2, g.cy + g.ch * 0.45, g.rx * 2 - 4, 10 * s); // スポンジの切れ目っぽい帯
    ctx.beginPath(); ctx.ellipse(cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.stroke(); // 上の面
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * g.rx * 0.98, g.cy + g.ch + Math.sin(a) * g.ry - 4 * s, 6 * s, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); } // すその飾り
    ctx.lineWidth = 3;
    const order = berries.slice().sort((a, b) => Math.sin(a.a) - Math.sin(b.a));
    const one = b => {
      const [bx, by] = this.bpos(b, g, dx);
      ctx.beginPath(); ctx.ellipse(bx, by + 10 * s, 15 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); // クリームの台
      if (b.gone) { ctx.beginPath(); ctx.ellipse(bx, by + 8 * s, 7 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,59,78,.3)'; ctx.fill(); } // いちごのあと
      else if (!b.held) this.berry(bx, by - 4 * s, 1);
    };
    order.filter(b => Math.sin(b.a) < 0).forEach(one);
    rr(cx - 58 * s, g.cy - 24 * s, 116 * s, 28 * s, 8 * s); ctx.fillStyle = '#6b4226'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); // チョコのプレート
    ctx.fillStyle = PAPER; ctx.font = `${Math.round(13 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('みんなで たべよう', cx, g.cy - 10 * s); ctx.textAlign = 'left';
    order.filter(b => Math.sin(b.a) >= 0).forEach(one);
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c98a5a'; ctx.fillRect(0, H * 0.56, W, H * 0.44); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.56 - 2, W, 3); // テーブル
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 0; x < W; x += 40 * s) ctx.fillRect(x, H * 0.56, 20 * s, H * 0.44); // テーブルクロスのしま
    if (this.slide > 0) { if (this.old) this.cakeDraw(-(1 - this.slide) * W, this.old); this.cakeDraw(this.slide * W, this.berries); }
    else this.cakeDraw(0, this.berries);
    for (const p of Object.values(this.ptr)) this.berry(p.x, p.y - 10 * s, 1.25); // つまんでいるいちご
    for (const b of this.bites) bigText('パクッ', b.x, b.y - 40 * s - (0.45 - b.t) * 60 * s, Math.round(26 * s), HOT, PAPER);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.18, Math.round(30 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.2) % 1, [bx, by] = this.bpos(this.berries.find(b => !b.gone) || this.berries[0], g); finger(bx + p * 40 * g.s, by - p * 50 * g.s, 0.9); }
};

/* ---------- 大盛り23: 入浴剤 ---------- */
const BATH_SEC = 30;   // あわを流して、湯船を洗う（1個）
const BATH_TOSS = 30;  // 押した所からこの長さ px（SC()）以上 上へ動かして離すと、投げる
const BATH_REDO = 6, BATH_YEN = 1000; // 1回でこの数以上入れたら、お湯を全部入れ替え（水道代・ガス代）
const BATH_C = ['#ff7eb6', '#5ab0ff', '#ffd23f', '#6fdc8c', '#b58cff', '#ff9e3d'];
const bath = {
  key: 'bath', name: '入浴剤', prompt: '入れろ！', hint: '上に投げて 湯船へ', bg: '#dff1f7',
  bgm: song(120, [
    ['bub', 0.08, '72 . 76 . 79 . 76 . 74 . 77 . 81 . . . 72 . 76 . 79 . 84 . 83 . 79 . 76 . . .'],
    ['triangle', 0.13, '48 . . . . . 55 . 50 . . . . . 57 . 48 . . . . . 55 . 43 . . . . . 50 .']
  ], ['k..hs..hk..hs.hh']),
  shop: [['入浴剤のセット', '入浴剤 セット'], ['バスボム', 'バスボム']],
  bill(t) { const n = t.bath || 0, r = t.bathRedo || 0; return { v: n + '個', n: (r ? 'お湯の入れ替え・' : '') + 'あわを流して湯船を洗う', sec: n * BATH_SEC, yen: r * BATH_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.fly = []; this.fizz = []; this.bub = []; this.cols = ['#a8dcf5']; this.foam = 0; this.ci = Math.floor(Math.random() * BATH_C.length); this.say = ''; this.sayT = 0; this.over = []; },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'bath', this.n); add(tot, 'bathRedo', this.n >= BATH_REDO ? 1 : 0); mx(tot, 'bathMax', this.n); },
  geo() { const s = SC(); return { s, x: W * 0.06, w: W * 0.88, ty: H * 0.42, by: H * 0.58, wy: H * 0.42 + 18 * s, floor: H * 0.74, kx: W / 2, ky: H * 0.87 }; },
  down(id, x, y) { this.ptr[id] = { x, y, x0: x, y0: y, c: BATH_C[this.ci++ % BATH_C.length] }; }, // どこを押しても、かごから1個手に取る
  move(id, x, y) { const p = this.ptr[id]; if (p) { p.x = x; p.y = y; } },
  up(id) {
    if (id == null) { this.ptr = {}; return; }
    const p = this.ptr[id]; delete this.ptr[id]; if (!p) return;
    const s = SC(); if (p.y0 - p.y < BATH_TOSS * s) return; // 上へ動かしていなければ、かごにもどす
    const g = this.geo(), tx = clamp(p.x + (p.x - p.x0) * 0.8, g.x + 40 * s, g.x + g.w - 40 * s);
    this.fly.push({ x0: p.x, y0: p.y, tx, ty: g.wy + 6 * s, u: 0, c: p.c }); sfx.toss(); // ポイッ。湯船のどこかに必ず入る
    if (scoring()) { this.n++; if (this.n === BATH_REDO) { this.say = 'あわが あふれた！'; this.sayT = 1; } }
  },
  update(dt) {
    const g = this.geo(), s = g.s;
    this.sayT = Math.max(0, this.sayT - dt);
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i]; f.u += dt / 0.42;
      if (f.u >= 1) { this.fly.splice(i, 1); this.fizz.push({ x: f.tx, c: f.c, t: 1.2 }); this.cols.push(f.c); if (this.cols.length > 5) this.cols.shift(); this.foam = Math.min(1.8, this.foam + 0.22); sfx.plop(); sfx.pssh(); }
    }
    for (let i = this.fizz.length - 1; i >= 0; i--) {
      const f = this.fizz[i]; f.t -= dt;
      if (Math.random() < dt * 40) this.bub.push({ x: f.x + rnd(-14, 14) * s, y: g.wy, vy: -rnd(30, 90) * s, r: rnd(3, 8) * s, c: f.c, t: rnd(0.4, 0.9) });
      if (f.t <= 0) this.fizz.splice(i, 1);
    }
    for (let i = this.bub.length - 1; i >= 0; i--) { const b = this.bub[i]; b.y += b.vy * dt; b.t -= dt; if (b.t <= 0) this.bub.splice(i, 1); }
    if (this.foam > 1 && Math.random() < dt * (this.foam - 1) * 30) this.over.push({ x: Math.random() < 0.5 ? g.x + rnd(-6, 10) * s : g.x + g.w + rnd(-10, 6) * s, y: g.ty, vy: rnd(20, 60) * s, r: rnd(8, 16) * s }); // あふれたあわが、ふちからたれる
    for (const o of this.over) { if (o.y < g.floor + rnd(0, 30) * s) o.y += o.vy * dt; }
    if (this.over.length > 80) this.over.shift();
  },
  ball(x, y, c, k) { const s = SC() * (k || 1); ctx.beginPath(); ctx.arc(x, y, 16 * s, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 5 * s, y - 5 * s, 4 * s, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.floor);
    ctx.strokeStyle = 'rgba(80,140,170,.25)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 32 * s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.floor); ctx.stroke(); } for (let y = 0; y < g.floor; y += 32 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } // タイル
    ctx.fillStyle = '#c9d6dc'; ctx.fillRect(0, g.floor, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    // 蛇口と湯気
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    rr(W * 0.7, g.ty - 70 * s, 16 * s, 40 * s, 4 * s); ctx.fillStyle = '#c0c8d0'; ctx.fill(); ctx.stroke();
    rr(W * 0.62, g.ty - 74 * s, 70 * s, 14 * s, 6 * s); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * 0.72, g.ty - 84 * s, 10 * s, 0, Math.PI * 2); ctx.fillStyle = HOT; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const x = W * (0.3 + i * 0.18), y = g.ty - 30 * s - ((clock * 30 + i * 20) % 50) * s; ctx.beginPath(); ctx.moveTo(x, y + 30 * s); ctx.bezierCurveTo(x - 10 * s, y + 20 * s, x + 10 * s, y + 10 * s, x, y); ctx.stroke(); }
    ctx.lineCap = 'butt'; ctx.lineWidth = 3; ctx.strokeStyle = INK;
    // 湯船とお湯（入れた色が、まだらに混ざる）
    rr(g.x, g.ty, g.w, g.floor - g.ty, 18 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.save(); rr(g.x + 10 * s, g.wy, g.w - 20 * s, g.by - g.wy, 12 * s); ctx.clip();
    ctx.fillStyle = this.cols[this.cols.length - 1]; ctx.fillRect(g.x, g.wy, g.w, g.by - g.wy);
    this.cols.slice(0, -1).forEach((c, i) => { ctx.globalAlpha = 0.55; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(g.x + g.w * (0.2 + ((i * 0.31 + clock * 0.05) % 0.7)), g.wy + (g.by - g.wy) * (0.3 + (i % 2) * 0.35), 60 * s, 18 * s, Math.sin(clock + i) * 0.3, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.restore();
    rr(g.x, g.by, g.w, g.floor - g.by, 10 * s); ctx.fillStyle = '#e4eef2'; ctx.fill(); ctx.stroke(); // 湯船の前の板
    const dx = g.x + g.w * 0.75 + Math.sin(clock * 1.5) * 10 * s, dy = g.wy + 14 * s + Math.sin(clock * 3) * 2 * s; // おもちゃのアヒル
    ctx.beginPath(); ctx.ellipse(dx, dy, 20 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fillStyle = POP; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx - 12 * s, dy - 14 * s, 9 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx - 20 * s, dy - 15 * s); ctx.lineTo(dx - 29 * s, dy - 12 * s); ctx.lineTo(dx - 20 * s, dy - 10 * s); ctx.closePath(); ctx.fillStyle = '#ff9e3d'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx - 13 * s, dy - 16 * s, 1.8 * s, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.8); ctx.lineTo(W * 0.24, H * 0.8); ctx.lineTo(W * 0.22, H * 0.9); ctx.lineTo(W * 0.1, H * 0.9); ctx.closePath(); ctx.fillStyle = '#d8b075'; ctx.fill(); ctx.stroke(); // 桶
    for (const b of this.bub) { ctx.globalAlpha = clamp(b.t * 2, 0, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = b.c; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); } ctx.globalAlpha = 1;
    // あわ（入れるほど高くなる）
    if (this.foam > 0) {
      const fh = Math.min(this.foam, 1.2) * 46 * s;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(35,27,46,.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) { const x = g.x + 18 * s + i * (g.w - 36 * s) / 15, r = (10 + sr(i) * 10) * s * (0.6 + this.foam * 0.4); ctx.beginPath(); ctx.arc(x, g.wy - fh * (0.4 + sr(i + 3) * 0.6) + Math.sin(clock * 3 + i) * 2 * s, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    for (const o of this.over) { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(35,27,46,.35)'; ctx.stroke(); }
    // かご（入浴剤がいっぱい）
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    for (let i = 0; i < 5; i++) this.ball(g.kx - 48 * s + i * 24 * s, g.ky - 18 * s - (i % 2) * 6 * s, BATH_C[(this.ci + i) % BATH_C.length], 0.8);
    rr(g.kx - 70 * s, g.ky - 14 * s, 140 * s, 44 * s, 10 * s); ctx.fillStyle = '#d8b075'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,58,34,.5)'; ctx.lineWidth = 2; for (let x = g.kx - 60 * s; x < g.kx + 64 * s; x += 14 * s) { ctx.beginPath(); ctx.moveTo(x, g.ky - 12 * s); ctx.lineTo(x, g.ky + 28 * s); ctx.stroke(); }
    for (const p of Object.values(this.ptr)) this.ball(p.x, p.y, p.c, 1.2);
    for (const f of this.fly) { const u = f.u, x = f.x0 + (f.tx - f.x0) * u, y = f.y0 + (f.ty - f.y0) * u - 140 * s * 4 * u * (1 - u); this.ball(x, y, f.c, 1.1 - u * 0.2); }
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.2, Math.round(32 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.4) % 1; finger(g.kx, g.ky - p * 140 * g.s, 0.9); }
};

/* ---------- 大盛り24: 壁紙 ---------- */
const PEEL_COLS = 3;   // 壁1面に、壁紙が縦に3枚貼ってある。全部はがしたら、となりの壁へ
const PEEL_PX = 300;   // 指をこの長さ px（SC()）下へ動かすと、1枚が下まではがれる
const PEEL_DONE = 0.8; // 1枚のこの割合まではがしたら、はがれきったことにする
const PEEL_SEC = 60;   // 壁紙を貼り直す（1枚）
const PEEL_REDO = 5, PEEL_YEN = 1000; // 1回でこの枚数以上はがしたら、業者さんに張り替えを頼む
const PEEL_WALLS = [ // 壁ごとの壁紙。[地の色, 柄の色, 柄]
  ['#f4f1ea', '#e2dccd', 'stripe'],
  ['#ffd8a0', '#ff8a3d', 'flower'],
  ['#cfe6ff', '#ffffff', 'dot'],
  ['#d9f0d0', '#8fcf86', 'check'],
  ['#3b3f7a', '#ffd23f', 'star']
];
const peel = {
  key: 'peel', name: '壁紙', prompt: 'はがせ！', hint: '壁紙を 下に引っぱる', bg: '#f4f1ea',
  bgm: song(140, [
    ['wob', 0.06, '67 . . 70 . . 72 . 74 . 72 . 70 . 67 . 65 . . 67 . . 70 . 67 . . . . . . .'],
    ['triangle', 0.13, '43 . 43 . 46 . 48 . 43 . 43 . 46 . 41 . 41 . 41 . 43 . 46 . 43 . 43 . 38 . 41 .']
  ], ['k.s.k.sck.s.k.ss']),
  shop: [['壁紙の補修シート', '壁紙 補修シート'], ['のりつき壁紙', 'のりつき 壁紙']],
  bill(t) { const n = t.peel || 0, r = t.peelRedo || 0; return { v: n + '枚', n: (r ? '業者さんに張り替えを頼む・' : '') + '壁紙を貼り直す', sec: n * PEEL_SEC, yen: r * PEEL_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.wall = 0; this.cols = this.newCols(); this.falling = []; this.pile = []; this.say = ''; this.sayT = 0; this.wait = 0; this.pan = 0; },
  newCols() { return Array.from({ length: PEEL_COLS }, () => ({ f: 0, done: false })); },
  started() { return this.n > 0 || this.cols.some(c => c.f > 0.05); },
  result() { return this.n + '枚'; },
  commit(tot) { add(tot, 'peel', this.n); add(tot, 'peelRedo', this.n >= PEEL_REDO ? 1 : 0); mx(tot, 'peelMax', this.n); },
  geo() { const s = SC(); return { s, y: H * 0.1, h: H * 0.72, cw: W / PEEL_COLS, floor: H * 0.82 }; },
  down(id, x, y) { if (this.wait > 0 || this.pan > 0) return; const g = this.geo(), c = Math.floor(clamp(x, 0, W - 1) / g.cw); if (y > g.y - 20 * g.s && y < g.floor && !this.cols[c].done) this.ptr[id] = { c, y }; },
  move(id, x, y) { // 押した列が、指を下へ動かした分だけはがれる（上へはもどらない）
    const p = this.ptr[id]; if (!p) return;
    const col = this.cols[p.c]; if (col.done) return;
    const dy = y - p.y; p.y = y; if (dy <= 0) return;
    const before = col.f; col.f = Math.min(1, col.f + dy / (PEEL_PX * SC()));
    if (Math.floor(before * 8) !== Math.floor(col.f * 8)) sfx.rip();
    if (col.f >= PEEL_DONE) this.off(p.c);
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  off(c) { // 1枚はがれきって、くるくる巻いたのが床に落ちる
    const g = this.geo(), s = g.s, col = this.cols[c]; col.done = true;
    this.falling.push({ x: (c + 0.5) * g.cw, y: g.floor - 20 * s, vy: 0, c: PEEL_WALLS[this.wall % PEEL_WALLS.length] });
    for (const k in this.ptr) if (this.ptr[k].c === c) delete this.ptr[k];
    if (scoring()) { this.n++; if (this.n === PEEL_REDO) { this.say = '壁がボロボロ！'; this.sayT = 1; } }
    sfx.slide();
    if (this.cols.every(k => k.done)) { this.wait = 0.25; this.ptr = {}; if (this.sayT < 0.5) { this.say = 'となりの壁へ！'; this.sayT = 0.7; } } // 1面ぜんぶはがしたら、となりの壁へ
  },
  update(dt) {
    const g = this.geo(), s = g.s;
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.pan = 1; }
    if (this.pan > 0) { this.pan = Math.max(0, this.pan - dt / 0.35); if (this.pan === 0) { this.wall++; this.cols = this.newCols(); } }
    for (let i = this.falling.length - 1; i >= 0; i--) { const f = this.falling[i]; f.vy += 1600 * s * dt; f.y += f.vy * dt; if (f.y > g.floor + 24 * s) { this.pile.push({ x: f.x + rnd(-20, 20) * s, y: g.floor + rnd(16, H - g.floor - 20 * s), r: rnd(-0.5, 0.5), c: f.c }); if (this.pile.length > 16) this.pile.shift(); this.falling.splice(i, 1); sfx.thud(); } }
  },
  pat(L, x, y, w, h, ox) { // 壁紙の柄（ox: 壁の左の端。列をまたいで柄がそろうように、壁全体の位置で描く）
    const s = SC(), [base, ink, kind] = L, y0 = this.geo().y, x1 = x + w;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h); ctx.fillStyle = ink; ctx.strokeStyle = ink;
    if (kind === 'stripe') for (let xx = ox; xx < x1; xx += 24 * s) ctx.fillRect(xx, y, 6 * s, h);
    else if (kind === 'dot') for (let yy = y0, r = 0; yy < y + h + 30 * s; yy += 30 * s, r++) for (let xx = ox + (r % 2) * 15 * s; xx < x1 + 10 * s; xx += 30 * s) { ctx.beginPath(); ctx.arc(xx, yy, 6 * s, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'check') { ctx.globalAlpha = 0.5; for (let xx = ox; xx < x1; xx += 40 * s) ctx.fillRect(xx, y, 20 * s, h); for (let yy = y0; yy < y + h; yy += 40 * s) ctx.fillRect(x, yy, w, 20 * s); }
    else if (kind === 'flower') for (let yy = y0 + 20 * s, r = 0; yy < y + h + 40 * s; yy += 46 * s, r++) for (let xx = ox + (r % 2) * 23 * s + 12 * s; xx < x1 + 20 * s; xx += 46 * s) { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(xx + Math.cos(a) * 7 * s, yy + Math.sin(a) * 7 * s, 5 * s, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(xx, yy, 4 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink; }
    else if (kind === 'star') for (let yy = y0 + 16 * s, r = 0; yy < y + h + 30 * s; yy += 36 * s, r++) for (let xx = ox + (r % 2) * 18 * s + 10 * s; xx < x1 + 10 * s; xx += 36 * s) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, d = (k % 2 ? 3 : 7) * s; ctx[k ? 'lineTo' : 'moveTo'](xx + Math.cos(a) * d, yy + Math.sin(a) * d); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
  },
  board(x, y, w, h) { // 壁紙の下の板（灰色、くぎの点）
    const s = SC();
    ctx.fillStyle = '#cfc9bd'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(35,27,46,.35)'; for (let yy = y + 30 * s; yy < y + h; yy += 60 * s) { ctx.beginPath(); ctx.arc(x + 10 * s, yy, 2 * s, 0, Math.PI * 2); ctx.arc(x + w - 10 * s, yy, 2 * s, 0, Math.PI * 2); ctx.fill(); }
  },
  rollDraw(x, y, w, k, L) { // くるくる巻いた壁紙（うらは白、外側に柄が少し見える）
    const s = SC(), r = (6 + k * 10) * s;
    ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
    rr(x - w / 2, y - r, w, r * 2, r); ctx.fillStyle = '#fbfaf6'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = L[0]; ctx.fillRect(x - w / 2 + r, y + r * 0.2, w - r * 2, r * 0.6);
    ctx.beginPath(); ctx.ellipse(x - w / 2 + r, y, r * 0.5, r * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },
  wallDraw(ox, wi, cols) { // 壁1面（ox: 左の端）
    const g = this.geo(), s = g.s, L = PEEL_WALLS[wi % PEEL_WALLS.length];
    cols.forEach((c, i) => {
      const x = ox + i * g.cw, fy = g.y + c.f * g.h;
      this.board(x, g.y, g.cw, g.floor - g.y);
      if (!c.done) {
        this.pat(L, x, fy, g.cw, g.floor - fy, ox);
        if (c.f > 0) { const gr = ctx.createLinearGradient(0, fy, 0, fy + 24 * s); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x, fy, g.cw, 24 * s); this.rollDraw(x + g.cw / 2, fy, g.cw - 6 * s, c.f, L); }
        else { ctx.beginPath(); ctx.moveTo(x + g.cw - 30 * s, g.y); ctx.lineTo(x + g.cw - 3 * s, g.y); ctx.lineTo(x + g.cw - 3 * s, g.y + 27 * s); ctx.closePath(); ctx.fillStyle = '#fbfaf6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); } // めくれかけの角
      }
      ctx.fillStyle = 'rgba(35,27,46,.25)'; ctx.fillRect(x + g.cw - 1, g.y, 2, g.h); // つなぎ目
    });
    ctx.fillStyle = INK; ctx.fillRect(ox - 2, g.y, 4, g.floor - g.y); // 部屋のすみ
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, g.y); ctx.fillStyle = INK; ctx.fillRect(0, g.y - 2, W, 3); // 天井
    if (this.pan > 0) { this.wallDraw(-(1 - this.pan) * W, this.wall, this.cols); this.wallDraw(this.pan * W, this.wall + 1, this.newCols()); } // となりの壁へ移る
    else this.wallDraw(0, this.wall, this.cols);
    ctx.fillStyle = '#8a5a32'; ctx.fillRect(0, g.floor, W, 14 * s); ctx.fillStyle = '#d9a066'; ctx.fillRect(0, g.floor + 14 * s, W, H - g.floor); ctx.fillStyle = INK; ctx.fillRect(0, g.floor - 2, W, 3);
    for (const p of this.pile) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); this.rollDraw(0, 0, g.cw * 0.7, 1, p.c); ctx.restore(); }
    for (const f of this.falling) this.rollDraw(f.x, f.y, g.cw - 6 * s, 1, f.c);
    if (this.sayT > 0) bigText(this.say, W / 2, g.y + 50 * s, Math.round(30 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.1) % 1, c = this.cols.findIndex(k => !k.done); finger((Math.max(0, c) + 0.5) * g.cw, g.y + 30 * g.s + p * 200 * g.s, 0.9); }
};

/* ---------- 大盛り25: 靴ひも ---------- */
const LACE_SEC = 15;   // 結び目をほどく（1か所）
const LACE_GRAB = 80, LACE_PASS = 48; // 靴の真ん中からこの距離 px（SC()。大きい靴は大きさを掛ける）：押しはじめ・離すとき／なぞっている途中
const LACE_MOVE = 40; // 押した所からこの距離 px（SC()）以上なぞっていないと、離しても結ばない
const LACE_BUY = 10, LACE_YEN = 1000; // 1回でこの数以上結んだら、ほどけないので切って、靴ひもの買い直し
const LACE_SHOES = [['#4f86f7', '#ffffff', 1.15], ['#ff5a4e', '#ffd23f', 1], ['#5fb35a', '#ffffff', 0.85], ['#ffd23f', '#ff5a4e', 0.72]]; // 1足ずつ：靴の色・ひもの色・大きさ
const laces = {
  key: 'laces', name: '靴ひも', prompt: '結べ！', hint: '靴から靴へ なぞって 結ぶ', bg: '#e8e1d6',
  bgm: song(146, [
    ['pluck', 0.09, '72 74 76 . 79 . 76 . 72 74 76 . 81 . 79 . 77 76 74 . 72 . 74 . 76 . 72 . 67 . . .'],
    ['triangle', 0.13, '48 . . . 55 . . . 48 . . . 57 . . . 53 . . . 55 . . . 48 . . . 43 . . .']
  ], ['k.h.k.hsk.h.k.hs']),
  shop: [['靴ひも', '靴ひも'], ['結ばない靴ひも', '結ばない靴ひも']],
  bill(t) { const n = t.laces || 0, b = t.lacesBuy || 0; return { v: n + '個', n: (b ? '靴ひもの買い直し・' : '') + '結び目をほどく', sec: n * LACE_SEC, yen: b * LACE_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.ties = []; this.jig = new Array(8).fill(0); this.say = ''; this.sayT = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'laces', this.n); add(tot, 'lacesBuy', this.n >= LACE_BUY ? 1 : 0); mx(tot, 'lacesMax', this.n); },
  geo() { const s = SC(); return { s, top: H * 0.3, step: H * 0.84 }; },
  shoes() { // 4足を2列に。0〜7（2つずつが1足）
    const g = this.geo(), s = g.s;
    return Array.from({ length: 8 }, (_, i) => { const p = i >> 1, [c, l, k] = LACE_SHOES[p]; return { x: W * (0.15 + (p % 2) * 0.48 + (i % 2) * 0.22), y: g.top + (p < 2 ? 0.22 : 0.56) * (g.step - g.top), c, l, k, i }; });
  },
  hit(x, y, r, not) { let best = -1, bd = 1e9; for (const sh of this.shoes()) { if (sh.i === not) continue; const d = Math.hypot(x - sh.x, y - sh.y); if (d < r * SC() * Math.max(sh.k, 0.9) && d < bd) { bd = d; best = sh.i; } } return best; },
  down(id, x, y) { const i = this.hit(x, y, LACE_GRAB); if (i >= 0) this.ptr[id] = { from: i, x, y, x0: x, y0: y, came: -1 }; },
  move(id, x, y) { // なぞっている途中で別の靴に触れたら、そこで結んで、その靴から続ける（いま離れた靴とは、指がその靴から出るまで結ばない）
    const p = this.ptr[id]; if (!p) return;
    p.x = x; p.y = y;
    if (p.prev != null) { const q = this.shoes()[p.prev]; if (Math.hypot(x - q.x, y - q.y) > LACE_PASS * SC() * Math.max(q.k, 0.9)) p.prev = null; }
    const to = this.hit(x, y, LACE_PASS, p.from); if (to >= 0 && to !== p.prev) { this.tie(p.from, to); p.prev = p.came = p.from; p.from = to; }
  },
  up(id) {
    if (id == null) { this.ptr = {}; return; }
    const p = this.ptr[id]; delete this.ptr[id]; if (!p) return;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) < LACE_MOVE * SC()) return; // 押して離しただけでは結ばない
    const to = this.hit(p.x, p.y, LACE_GRAB, p.from); if (to >= 0 && to !== p.came) this.tie(p.from, to); // いまなぞって来た靴とは結び直さない
  },
  tie(a, b) {
    const sh = this.shoes();
    this.ties.push({ a, b, c: sh[a].l, sag: rnd(-1, 1) }); if (this.ties.length > 80) this.ties.shift();
    this.jig[a] = this.jig[b] = 0.3; sfx.knot();
    if (scoring()) { this.n++; if (this.n === LACE_BUY) { this.say = 'もう ほどけない…！'; this.sayT = 1; } else if (this.sayT <= 0) { this.say = 'ギュッ！'; this.sayT = 0.35; } }
  },
  update(dt) { this.sayT = Math.max(0, this.sayT - dt); for (let i = 0; i < 8; i++) this.jig[i] = Math.max(0, this.jig[i] - dt); },
  shoe(sh, jig) { // 上から見たスニーカー（つま先が上）
    const s = SC() * sh.k, x = sh.x + (jig > 0 && !calm ? Math.sin(clock * 60) * 3 : 0), y = sh.y;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sh.i % 2 ? 0.06 : -0.06); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, 50 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke(); // 靴底
    ctx.beginPath(); ctx.ellipse(0, 2 * s, 21 * s, 44 * s, 0, 0, Math.PI * 2); ctx.fillStyle = sh.c; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 26 * s, 12 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#3a3040'; ctx.fill(); // はき口
    ctx.strokeStyle = sh.l; ctx.lineWidth = 3 * s; for (let k = 0; k < 4; k++) { const yy = -18 * s + k * 9 * s; ctx.beginPath(); ctx.moveTo(-9 * s, yy); ctx.lineTo(9 * s, yy + 6 * s); ctx.moveTo(9 * s, yy); ctx.lineTo(-9 * s, yy + 6 * s); ctx.stroke(); } // ひも
    ctx.restore();
  },
  lace(x1, y1, x2, y2, c, sag, knot) { // たるんだひも（まん中に結び目）
    const s = SC(), mx2 = (x1 + x2) / 2, my = (y1 + y2) / 2, d = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / d, ny = (x2 - x1) / d, k = (20 + d * 0.15) * sag, cx = mx2 + nx * k, cy = my + ny * k + 16 * s;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.lineWidth = 6 * s; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.5 * s; ctx.strokeStyle = c; ctx.stroke();
    if (knot) { const qx = (x1 + 2 * cx + x2) / 4, qy = (y1 + 2 * cy + y2) / 4; for (const a of [-1, 1]) { ctx.beginPath(); ctx.ellipse(qx + a * 8 * s, qy, 8 * s, 5 * s, a * 0.4, 0, Math.PI * 2); ctx.lineWidth = 5 * s; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = c; ctx.stroke(); } }
    ctx.lineCap = 'butt';
  },
  draw() {
    const g = this.geo(), s = g.s, sh = this.shoes();
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.top);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(W * 0.3, g.top - H * 0.24, W * 0.4, H * 0.24 + 4, 6 * s); ctx.fillStyle = '#9c6b45'; ctx.fill(); ctx.stroke(); // 玄関のドア
    ctx.beginPath(); ctx.arc(W * 0.64, g.top - H * 0.11, 6 * s, 0, Math.PI * 2); ctx.fillStyle = POP; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b9b2a6'; ctx.fillRect(0, g.top, W, g.step - g.top); ctx.fillStyle = INK; ctx.fillRect(0, g.top - 2, W, 3); // 玄関の土間（石のタイル）
    ctx.strokeStyle = 'rgba(35,27,46,.18)'; ctx.lineWidth = 2; for (let y = g.top + 50 * s; y < g.step; y += 50 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let x = 0; x < W; x += 60 * s) { ctx.beginPath(); ctx.moveTo(x, g.top); ctx.lineTo(x, g.step); ctx.stroke(); }
    ctx.fillStyle = '#c98a5a'; ctx.fillRect(0, g.step, W, H - g.step); ctx.fillStyle = INK; ctx.fillRect(0, g.step - 2, W, 3); // 上がりかまち
    for (const k of sh) this.shoe(k, this.jig[k.i]);
    for (const t of this.ties) { const a = sh[t.a], b = sh[t.b]; this.lace(a.x, a.y - 6 * s, b.x, b.y - 6 * s, t.c, t.sag, true); }
    for (const p of Object.values(this.ptr)) { const a = sh[p.from]; this.lace(a.x, a.y - 6 * s, p.x, p.y, a.l, 0.3, false); }
    if (this.sayT > 0) bigText(this.say, W / 2, g.top - H * 0.04, Math.round(30 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const sh = this.shoes(), p = (t * 1.1) % 1, a = sh[1], b = sh[2]; finger(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 0.9); }
};

STAGE_LIST.push(gift, cake, bath, peel, laces);
ZUKAN_EXTRA.push(
  { id: 'gift', name: 'お詫びのお詫び', desc: '菓子折りの包み紙を1回で10箱 破る', ok: t => (t.giftMax || 0) >= 10 },
  { id: 'cake', name: 'いちご総取り', desc: 'ケーキのいちごを1回で10個 食べる', ok: t => (t.cakeMax || 0) >= 10 },
  { id: 'bath', name: '七色の湯', desc: '入浴剤を1回で16個 入れる', ok: t => (t.bathMax || 0) >= 16 },
  { id: 'peel', name: 'リフォーム職人', desc: '壁紙を1回で12枚 はがす', ok: t => (t.peelMax || 0) >= 12 },
  { id: 'laces', name: '玄関の結界', desc: '靴ひもの結び目を1回で32個 作る', ok: t => (t.lacesMax || 0) >= 32 }
);

/* ===== 第6弾（2026-10-27 追加） ===== */
Object.assign(sfx, {
  bassa() { noise(0.12, 900, 0.7, 0.32, 'lowpass'); noise(0.06, 2600, 1, 0.16, 'bandpass', 0.02); },
  clack() { tone(900, 600, 0.03, 0.12, 'square'); noise(0.03, 3000, 2, 0.15); },
  spray() { for (let i = 0; i < 7; i++) noise(0.03, rnd(3000, 6000), 1.5, 0.12, 'bandpass', i * 0.025); },
  twist() { noise(0.03, rnd(700, 1000), 3, 0.07); },
  snap() { tone(1400, 500, 0.04, 0.18, 'square'); noise(0.05, 2500, 1, 0.2); }
});

/* ---------- 大盛り26: 傘 ---------- */
const UMB_FLICK = 40;  // 押した所からこの長さ px（SC()）上へ動かすと、傘立ての傘が飛び出して開く
const UMB_SEC = 20;    // 傘をたたんで、傘立てにもどす（1本）
const UMB_BREAK = 6, UMB_YEN = 1000; // 1回でこの数以上開いたら、ぶつかって骨が折れるので、傘の買い直し
const UMB_C = ['#ff5a4e', '#4f86f7', '#ffd23f', '#5fb35a', '#b58cff', '#ff9ecf', 'vinyl']; // vinyl はビニール傘
const umbrella = {
  key: 'umbrella', name: '傘', prompt: '開け！', hint: '上へはじいて 傘を開く', bg: '#e6e0f2',
  bgm: song(144, [
    ['square', 0.045, '72 . 74 . 76 . 79 . 81 . 79 . 76 . . . 74 . 76 . 79 . 84 . 81 . 79 . . .'],
    ['triangle', 0.13, '48 . . . 55 . 48 . 53 . . . 57 . 53 . 50 . . . 57 . 50 . 55 . . . 43 . .']
  ], ['k.h.s.h.k.k.s.hh']),
  shop: [['傘', '傘'], ['ビニール傘', 'ビニール傘']],
  bill(t) { const n = t.umbrella || 0, b = t.umbrellaBuy || 0; return { v: n + '本', n: (b ? '骨が折れた傘の買い直し・' : '') + 'たたんで傘立てにもどす', sec: n * UMB_SEC, yen: b * UMB_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.fly = []; this.opened = []; this.pops = []; this.ci = Math.floor(Math.random() * UMB_C.length); this.say = ''; this.sayT = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '本'; },
  commit(tot) { add(tot, 'umbrella', this.n); add(tot, 'umbrellaBuy', this.n >= UMB_BREAK ? 1 : 0); mx(tot, 'umbrellaMax', this.n); },
  geo() { const s = SC(); return { s, wall: H * 0.44, kx: W * 0.5, ky: H * 0.93 }; },
  down(id, x, y) { this.ptr[id] = { x0: x, y0: y }; }, // どこを押してもよい
  move(id, x, y) {
    const p = this.ptr[id]; if (!p || p.done) return;
    if (p.y0 - y > UMB_FLICK * SC()) { p.done = true; this.launch(x - p.x0); } // 1回はじくと1本
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  launch(dx) { // はじいた向きのほうへ飛んで、空中でバサッと開く
    const g = this.geo(), s = g.s, c = UMB_C[this.ci++ % UMB_C.length];
    const tx = clamp(W / 2 + dx * 3 + rnd(-1, 1) * W * 0.28, W * 0.14, W * 0.86), ty = rnd(H * 0.52, H * 0.76);
    this.fly.push({ x0: g.kx + rnd(-24, 24) * s, y0: g.ky - 90 * s, tx, ty, u: 0, c, rot: rnd(-0.6, 0.6), spin: rnd(-1, 1) * 6, banged: false });
    sfx.toss();
    if (scoring()) { this.n++; if (this.n === UMB_BREAK) { this.say = '骨が折れた…！'; this.sayT = 1; } }
  },
  update(dt) {
    const s = SC();
    this.sayT = Math.max(0, this.sayT - dt);
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i]; f.u += dt / 0.5;
      if (!f.banged && f.u > 0.3) { f.banged = true; sfx.bassa(); const [x, y] = this.fpos(f); this.pops.push({ x, y, t: 0.45 }); }
      if (f.u >= 1) { // 床に落ちて、まわりの傘がゆれる
        this.fly.splice(i, 1);
        for (const o of this.opened) if (Math.hypot(o.x - f.tx, o.y - f.ty) < 120 * s) o.jig = 0.35;
        this.opened.push({ x: f.tx, y: f.ty, c: f.c, rot: f.rot, jig: 0.3 }); if (this.opened.length > 24) this.opened.shift(); // 多すぎたら、いちばん古い傘から消す
        sfx.thud();
      }
    }
    for (const o of this.opened) o.jig = Math.max(0, o.jig - dt);
    for (let i = this.pops.length - 1; i >= 0; i--) { this.pops[i].t -= dt; if (this.pops[i].t <= 0) this.pops.splice(i, 1); }
  },
  fpos(f) { const u = Math.min(f.u, 1), s = SC(); return [f.x0 + (f.tx - f.x0) * u, f.y0 + (f.ty - f.y0) * u - 260 * s * 4 * u * (1 - u)]; },
  kOf(y) { return 0.65 + clamp((y - H * 0.5) / (H * 0.3), 0, 1) * 0.45; }, // 奥ほど小さく
  canopy(x, y, c, rot, k, o) { // 開いた傘（o: 開きぐあい 0〜1）
    const s = SC() * k, R = 64 * s, rx = R * (0.15 + 0.85 * o);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(0, -R * 0.1); ctx.lineTo(0, R * 0.95); ctx.stroke(); // 柄
    ctx.beginPath(); ctx.arc(-9 * s, R * 0.95, 9 * s, 0, Math.PI); ctx.stroke(); // 持ち手
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.ellipse(0, 0, rx, R * 0.8, 0, Math.PI, Math.PI * 2);
    for (let i = 0; i < 4; i++) { const a = rx - i * rx / 2, b = a - rx / 2; ctx.quadraticCurveTo((a + b) / 2, -R * 0.14, b, 0); } // すそのギザギザ
    ctx.closePath();
    ctx.fillStyle = c === 'vinyl' ? 'rgba(225,238,255,.6)' : c; ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2; for (const t of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(0, -R * 0.8); ctx.quadraticCurveTo(rx * t * 0.7, -R * 0.45, rx * t, 0); ctx.stroke(); } // 骨
    if (c !== 'vinyl') { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(0, -R * 0.8); ctx.quadraticCurveTo(-rx * 0.35, -R * 0.45, -rx * 0.5, 0); ctx.quadraticCurveTo(-rx * 0.25, -R * 0.14, 0, 0); ctx.closePath(); ctx.fill(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -R * 0.8); ctx.lineTo(0, -R * 0.8 - 10 * s); ctx.stroke(); // 先っぽ
    ctx.restore();
  },
  closed(x, y, c, rot, k) { // たたんだ傘（持ち手が上）
    const s = SC() * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.arc(-8 * s, -60 * s, 8 * s, Math.PI, 0); ctx.stroke(); // 持ち手
    ctx.beginPath(); ctx.moveTo(0, -60 * s); ctx.lineTo(0, -44 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -46 * s); ctx.quadraticCurveTo(12 * s, -20 * s, 3 * s, 60 * s); ctx.lineTo(-3 * s, 60 * s); ctx.quadraticCurveTo(-12 * s, -20 * s, 0, -46 * s);
    ctx.fillStyle = c === 'vinyl' ? 'rgba(225,238,255,.8)' : c; ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.wall);
    ctx.fillStyle = '#d9b98f'; ctx.fillRect(0, g.wall, W, H - g.wall); ctx.fillStyle = INK; ctx.fillRect(0, g.wall - 2, W, 3); // 床
    ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 2; for (let y = g.wall + 30 * s; y < H; y += 34 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // 窓（外は晴れ）
    ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(W * 0.1, H * 0.08, W * 0.36, H * 0.24, 6 * s); ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.28, H * 0.08); ctx.lineTo(W * 0.28, H * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.15, 14 * s, 0, Math.PI * 2); ctx.fillStyle = POP; ctx.fill(); ctx.stroke();
    // 壁の天気予報のメモ
    rr(W * 0.58, H * 0.12, W * 0.3, H * 0.1, 4 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${Math.round(14 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('きょうは', W * 0.73, H * 0.148); ctx.fillText('一日 晴れ', W * 0.73, H * 0.19); ctx.textAlign = 'left';
    // 開いた傘は、奥から順に描く
    for (const o of this.opened.slice().sort((a, b) => a.y - b.y)) { const k = this.kOf(o.y); this.canopy(o.x, o.y, o.c, o.rot + Math.sin(clock * 40) * o.jig * 0.25, k, 1); }
    // 傘立て（たたんだ傘がささっている）
    for (let i = 0; i < 4; i++) this.closed(g.kx + (i - 1.5) * 16 * s, g.ky - 80 * s - (i % 2) * 8 * s, UMB_C[(this.ci + i) % UMB_C.length], (i - 1.5) * 0.12, 1);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(g.kx - 46 * s, g.ky - 70 * s, 92 * s, 80 * s, 8 * s); ctx.fillStyle = '#8a8f99'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(g.kx - 36 * s, g.ky - 62 * s, 10 * s, 60 * s);
    for (const f of this.fly) { const [x, y] = this.fpos(f), o = clamp((f.u - 0.25) / 0.25, 0, 1), k = 0.8 + 0.3 * this.kOf(f.ty) * f.u; if (o <= 0) this.closed(x, y, f.c, f.rot + f.u * f.spin, k); else this.canopy(x, y, f.c, f.rot * f.u, k, o); }
    for (const p of this.pops) bigText('バサッ', p.x, p.y - 70 * s - (0.45 - p.t) * 50 * s, Math.round(26 * s), HOT, PAPER);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.36, Math.round(32 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.4) % 1; finger(g.kx + 40 * g.s, g.ky - 40 * g.s - p * 120 * g.s, 0.9); }
};

/* ---------- 大盛り27: キーボード ---------- */
const KEY_PULL = 36;   // キーを押したまま、この長さ px（SC()）動かすと、ポンッと外れる
const KEY_GRAB = 40;   // キーのふちからこの距離 px（SC()）までなら、つまめる
const KEY_SEC = 20;    // キーをはめ直す（1個）
const KEY_BUY = 8, KEY_YEN = 1000; // 1回でこの数以上外したら、つめが折れてはまらないキーが出るので、キーボードの買い直し
const KEY_JIS = [ // JISの配列。1段ずつ [字, かな, 幅（キー何個ぶん）]。幅を書かないキーは1。Enter は2段ぶん
  [['半/全', '', 1], ['1', 'ぬ'], ['2', 'ふ'], ['3', 'あ'], ['4', 'う'], ['5', 'え'], ['6', 'お'], ['7', 'や'], ['8', 'ゆ'], ['9', 'よ'], ['0', 'わ'], ['-', 'ほ'], ['^', 'へ'], ['¥', 'ー'], ['BS', '', 1]],
  [['Tab', '', 1.5], ['Q', 'た'], ['W', 'て'], ['E', 'い'], ['R', 'す'], ['T', 'か'], ['Y', 'ん'], ['U', 'な'], ['I', 'に'], ['O', 'ら'], ['P', 'せ'], ['@', '゛'], ['[', '゜'], ['Enter', '', 1.5]],
  [['英数', '', 1.75], ['A', 'ち'], ['S', 'と'], ['D', 'し'], ['F', 'は'], ['G', 'き'], ['H', 'く'], ['J', 'ま'], ['K', 'の'], ['L', 'り'], [';', 'れ'], [':', 'け'], [']', 'む']],
  [['Shift', '', 2.25], ['Z', 'つ'], ['X', 'さ'], ['C', 'そ'], ['V', 'ひ'], ['B', 'こ'], ['N', 'み'], ['M', 'も'], [',', 'ね'], ['.', 'る'], ['/', 'め'], ['\\', 'ろ'], ['Shift', '', 1.75]],
  [['Ctrl', '', 1.5], ['Fn', '', 1.25], ['Alt', '', 1.25], ['無変換', '', 1.25], ['', '', 4.5], ['変換', '', 1.25], ['かな', '', 1.25], ['Alt', '', 1.25], ['Ctrl', '', 1.5]]
];
const keyboard = {
  key: 'keyboard', name: 'キーボード', prompt: '外せ！', hint: 'キーを つまんで 引っぱる', bg: '#dde6ee',
  bgm: song(136, [
    ['square', 0.04, '76 . 76 . 79 . 76 . 72 . 74 . 76 . . . 77 . 77 . 81 . 77 . 74 . 76 . 72 . . .'],
    ['triangle', 0.13, '45 . . . 52 . . . 48 . . . 55 . . . 50 . . . 57 . . . 52 . . . 40 . . .']
  ], ['k.hhs.h.k.hhs.hr']),
  shop: [['キーボード', 'キーボード JIS'], ['キーボードのカバー', 'キーボードカバー']],
  bill(t) { const n = t.keyboard || 0, b = t.keyboardBuy || 0; return { v: n + '個', n: (b ? 'キーボードの買い直し・' : '') + 'キーをはめ直す', sec: n * KEY_SEC, yen: b * KEY_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.keys = this.newBoard(); this.fly = []; this.floor = []; this.wait = 0; this.say = ''; this.sayT = 0; },
  newBoard() { // キーごとに、左からの位置 x と幅 w（キー何個ぶん）、段 r、高さ h（段の数）
    const ks = [];
    KEY_JIS.forEach((row, r) => { let x = 0; for (const [ch, kana, w = 1] of row) { ks.push({ ch, kana, r, x, w, h: ch === 'Enter' ? 2 : 1, gone: false, held: false }); x += w; } });
    return ks;
  },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'keyboard', this.n); add(tot, 'keyboardBuy', this.n >= KEY_BUY ? 1 : 0); mx(tot, 'keyboardMax', this.n); },
  geo() { const s = SC(), u = Math.min(W * 0.95 / 15.5, 40 * s), kw = u * 15.5; return { s, u, x: (W - kw) / 2, y: H * 0.52, kw, kh: u * 5.5, desk: H * 0.44 }; },
  kpos(k, g) { return [g.x + g.u * (0.25 + k.x + k.w / 2), g.y + g.u * (0.25 + k.r + k.h / 2)]; },
  down(id, x, y) { // いちばん近いキーをつまむ（キーの上なら、そのキー）
    if (this.wait > 0) return;
    const g = this.geo(); let best = null, bd = KEY_GRAB * g.s;
    for (const k of this.keys) {
      if (k.gone || k.held) continue;
      const [kx, ky] = this.kpos(k, g), d = Math.hypot(Math.max(0, Math.abs(x - kx) - k.w * g.u / 2), Math.max(0, Math.abs(y - ky) - k.h * g.u / 2)) + Math.hypot(x - kx, y - ky) * 0.01;
      if (d < bd) { bd = d; best = k; }
    }
    if (best) { best.held = true; this.ptr[id] = { k: best, x, y, x0: x, y0: y }; }
  },
  move(id, x, y) {
    const p = this.ptr[id]; if (!p) return;
    p.x = x; p.y = y;
    const d = Math.hypot(x - p.x0, y - p.y0);
    if (d > KEY_PULL * SC()) { // ポンッ。引っぱった向きへ飛ぶ
      const g = this.geo(), s = g.s, [kx, ky] = this.kpos(p.k, g), ux = (x - p.x0) / d, uy = (y - p.y0) / d;
      p.k.gone = true; p.k.held = false; delete this.ptr[id];
      this.fly.push({ x: kx, y: ky, vx: ux * rnd(250, 450) * s, vy: (uy * 300 - rnd(350, 600)) * s, r: 0, vr: rnd(-12, 12), k: p.k, land: rnd(g.y + g.kh + 20 * s, H - 20 * s) });
      sfx.clack(); sfx.pon();
      if (scoring()) { this.n++; if (this.n === KEY_BUY) { this.say = 'つめが折れた…！'; this.sayT = 1; } else if (this.sayT <= 0) { this.say = 'ポンッ！'; this.sayT = 0.3; } }
      if (this.keys.every(k => k.gone)) this.wait = 0.4;
    }
  },
  up(id) {
    if (id == null) { Object.values(this.ptr).forEach(p => { p.k.held = false; }); this.ptr = {}; return; }
    const p = this.ptr[id]; if (p) { p.k.held = false; delete this.ptr[id]; }
  },
  update(dt) {
    const s = SC();
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.keys = this.newBoard(); } // 全部外したら、次のキーボード
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i]; f.vy += 1800 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.vy > 0 && f.y >= f.land) { f.y = f.land; f.x = clamp(f.x, 20 * s, W - 20 * s); this.floor.push(f); this.fly.splice(i, 1); sfx.tick(); }
    }
    if (this.floor.length > 80) this.floor.shift();
  },
  shape(k, u, inset) { // キーの形（真ん中が原点）。Enter はL字
    const w = k.w * u - inset, h = k.h * u - inset, r = Math.min(4, u * 0.15);
    if (k.ch !== 'Enter') { rr(-w / 2, -h / 2, w, h, r); return; }
    const nx = -w / 2 + 0.25 * u; // 下の段は、左を少し細く
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(nx, h / 2); ctx.lineTo(nx, 0); ctx.lineTo(-w / 2, 0); ctx.closePath();
  },
  cap(x, y, k, r, sc) { // キー1個（左上に字、右下にかな）
    const u = this.geo().u * sc, s = SC(), g = Math.max(2, u * 0.1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r || 0); ctx.lineWidth = 1.5; ctx.strokeStyle = INK;
    ctx.save(); ctx.translate(0, u * 0.08); this.shape(k, u, g); ctx.fillStyle = '#b9c0c9'; ctx.fill(); ctx.stroke(); ctx.restore();
    this.shape(k, u, g); ctx.fillStyle = '#f4f6f8'; ctx.fill(); ctx.stroke();
    const w = k.w * u - g, h = k.h * u - g, big = k.ch.length === 1;
    ctx.fillStyle = INK; ctx.textBaseline = 'middle';
    if (big) {
      ctx.font = `${Math.round(u * 0.4)}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.fillText(k.ch, -w / 2 + u * 0.1, -h / 2 + u * 0.27);
      if (k.kana) { ctx.font = `${Math.round(u * 0.32)}px ${BODY}`; ctx.textAlign = 'right'; ctx.fillStyle = '#c0392b'; ctx.fillText(k.kana, w / 2 - u * 0.08, h / 2 - u * 0.25); }
    } else if (k.ch) { ctx.font = `${Math.round(u * 0.27)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillText(k.ch, k.ch === 'Enter' ? u * 0.12 : 0, k.ch === 'Enter' ? -h / 4 : 0, w - u * 0.15); }
    ctx.textAlign = 'left'; ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.desk);
    ctx.fillStyle = '#c99a6b'; ctx.fillRect(0, g.desk, W, H - g.desk); ctx.fillStyle = INK; ctx.fillRect(0, g.desk - 2, W, 3); // 机
    // モニター（パパの会議の資料）
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.fillStyle = '#3a4150'; ctx.fillRect(W / 2 - 14 * s, H * 0.36, 28 * s, g.desk - H * 0.36 + 6 * s);
    rr(W * 0.14, H * 0.06, W * 0.72, H * 0.3, 8 * s); ctx.fillStyle = '#3a4150'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f7fbff'; ctx.fillRect(W * 0.17, H * 0.08, W * 0.66, H * 0.26);
    ctx.fillStyle = INK; ctx.font = `${Math.round(14 * s)}px ${DISPLAY}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillText('会議の資料（作成中）', W * 0.8, H * 0.11, W * 0.44); ctx.textAlign = 'left';
    ctx.fillStyle = '#c4ccd6'; for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.2, H * (0.15 + i * 0.035), W * (0.56 - (i % 3) * 0.1), 6 * s);
    if (Math.floor(clock * 2) % 2) { ctx.fillStyle = INK; ctx.fillRect(W * 0.2 + W * 0.36, H * 0.29 - 8 * s, 3 * s, 16 * s); } // カーソル
    // キーボードの本体と、外したあとの穴
    ctx.lineWidth = 3; rr(g.x, g.y, g.kw, g.kh, 10 * s); ctx.fillStyle = '#5b6372'; ctx.fill(); ctx.stroke();
    for (const k of this.keys) {
      const [kx, ky] = this.kpos(k, g);
      if (k.gone) {
        ctx.save(); ctx.translate(kx, ky); this.shape(k, g.u, Math.max(2, g.u * 0.1)); ctx.fillStyle = '#2b3039'; ctx.fill(); ctx.restore();
        const m = Math.max(3, g.u * 0.18); ctx.fillStyle = '#9aa3ae'; ctx.fillRect(kx - m, ky - m * 0.3, m * 2, m * 0.6); ctx.fillRect(kx - m * 0.3, ky - m, m * 0.6, m * 2);
      } else if (!k.held) this.cap(kx, ky, k, 0, 1);
    }
    for (const p of Object.values(this.ptr)) { const [kx, ky] = this.kpos(p.k, g), d = Math.hypot(p.x - p.x0, p.y - p.y0) || 1, m = Math.min(d, 10 * s); this.cap(kx + (p.x - p.x0) / d * m, ky + (p.y - p.y0) / d * m - 4 * s, p.k, (p.x - p.x0) / d * 0.15, 1.15); } // つまんで浮いているキー
    for (const f of this.floor) this.cap(f.x, f.y, f.k, f.r, 1);
    for (const f of this.fly) this.cap(f.x, f.y, f.k, f.r, 1.1);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.46, Math.round(30 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.2) % 1, k = this.keys.find(k => !k.gone && k.ch === 'G') || this.keys.find(k => !k.gone) || this.keys[0], [kx, ky] = this.kpos(k, g); finger(kx + p * 30 * g.s, ky - p * 40 * g.s, 0.9); }
};

/* ---------- 大盛り28: テーブルの物を落とす ---------- */
const TBL_GRAB = 50;   // 物のふちからこの距離 px（SC()）までなら、押せる（ユーザーの指摘で30pxから広げた）
const TBL_ON = 4;      // テーブルにいつも置いてある物の数（落とすと、だれかが次の物を置く）
const TBL_SEC = 15;    // 拾って、テーブルにもどす（1個）
const TBL_LOST = 6, TBL_YEN = 1000; // 1回でこの数以上落としたら、リモコンの電池のフタが行方不明になるので、リモコンの買い直し
const TBL_ITEMS = [ // 名前・幅・高さ（px）・色
  ['リモコン', 76, 16, '#3a4150'], ['消しゴム', 36, 18, '#ffffff'], ['ペン', 66, 9, '#2f8fd6'], ['コースター', 52, 7, '#c98a5a'],
  ['メガネケース', 64, 22, '#b35a7a'], ['鍵', 38, 12, '#e0b33a'], ['小銭入れ', 46, 26, '#5fb35a'], ['ハンドクリーム', 50, 16, '#ff9ecf']
];
const tabletop = {
  key: 'tabletop', name: 'テーブルの物', prompt: '落とせ！', hint: '指で押して ふちから落とす', bg: '#f3e9d8',
  bgm: song(112, [
    ['pluck', 0.08, '67 . . 71 . . 74 . 72 . . 69 . . 67 . 65 . . 69 . . 72 . 71 . . 67 . . . .'],
    ['triangle', 0.13, '43 . . . 50 . . . 45 . . . 52 . . . 41 . . . 48 . . . 43 . . . 38 . . .']
  ], ['k..h..s.k.kh..s.']),
  shop: [['リモコン', 'テレビ リモコン'], ['テーブルの落下防止', 'テーブル 落下防止 ガード']],
  bill(t) { const n = t.tabletop || 0, b = t.tabletopBuy || 0; return { v: n + '個', n: (b ? 'リモコンの買い直し・' : '') + '拾ってテーブルにもどす', sec: n * TBL_SEC, yen: b * TBL_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.ii = Math.floor(Math.random() * TBL_ITEMS.length); this.on = []; this.fall = []; this.floor = []; this.pops = []; this.wait = 0; this.say = ''; this.sayT = 0; for (let i = 0; i < TBL_ON; i++) this.place(true); },
  started() { return this.n > 0; },
  result() { return this.n + '個'; },
  commit(tot) { add(tot, 'tabletop', this.n); add(tot, 'tabletopBuy', this.n >= TBL_LOST ? 1 : 0); mx(tot, 'tabletopMax', this.n); },
  geo() { const s = SC(); return { s, ty: H * 0.5, lx: W * 0.08, rx: W * 0.92, fy: H * 0.84 }; },
  place(now) { // 空いている所に1個置く
    const g = this.geo(), s = g.s, [name, w0, h0, c] = TBL_ITEMS[this.ii++ % TBL_ITEMS.length], w = w0 * s * 1.15, h = h0 * s * 1.15;
    const step = (g.rx - g.lx) / TBL_ON, free = []; // テーブルを TBL_ON 区画に分けて、空いている区画の真ん中に置く
    for (let i = 0; i < TBL_ON; i++) { const x = clamp(g.lx + step * (i + 0.5), g.lx + w / 2, g.rx - w / 2); if (this.on.every(o => Math.abs(o.x - x) > (o.w + w) / 2 + 4 * s)) free.push(x); }
    if (!free.length) { this.ii--; return; }
    this.on.push({ name, w, h, c, x: free[Math.floor(Math.random() * free.length)], drop: now ? 0 : 1 });
  },
  down(id, x, y) {
    const g = this.geo(), r = TBL_GRAB * g.s; let best = null, bd = 1e9;
    for (const o of this.on) { if (o.held || o.drop > 0.2) continue; const d = Math.abs(x - o.x) - o.w / 2; if (d < r && Math.abs(y - (g.ty - o.h / 2)) < o.h / 2 + r * 1.6 && d < bd) { bd = d; best = o; } }
    if (best) { best.held = true; this.ptr[id] = { o: best, lx: x, vx: 0 }; }
  },
  move(id, x) {
    const p = this.ptr[id]; if (!p) return;
    const g = this.geo(), dx = x - p.lx; p.lx = x; p.o.x += dx; // 指といっしょに横へすべる
    this.shove(p.o, Math.sign(dx));
    for (const o of this.on.slice()) if (o.x < g.lx || o.x > g.rx) this.drop(o); // 押されたとなりの物も、ふちを越えたら落ちる
  },
  shove(a, dir) { // ぶつかったとなりの物も、いっしょに押す
    if (!dir) return;
    for (const o of this.on) { if (o === a || o.drop > 0.2) continue; const gap = (a.w + o.w) / 2; if ((o.x - a.x) * dir >= 0 && Math.abs(o.x - a.x) < gap) { o.x = a.x + dir * gap; this.shove(o, dir); } }
  },
  drop(o) { // ふちから落ちる
    const g = this.geo(), s = g.s, i = this.on.indexOf(o);
    if (i >= 0) this.on.splice(i, 1);
    for (const k in this.ptr) if (this.ptr[k].o === o) delete this.ptr[k];
    const dir = o.x < W / 2 ? -1 : 1;
    this.fall.push({ ...o, y: g.ty - o.h / 2, vx: dir * rnd(60, 140) * s, vy: 0, r: 0, vr: dir * rnd(4, 9), land: rnd(g.fy - 6 * s, H - 20 * s), b: 0 });
    if (scoring()) { this.n++; if (this.n === TBL_LOST) { this.say = '電池のフタが ない…！'; this.sayT = 1; } }
    this.wait = 0.3;
  },
  up(id) {
    if (id == null) { Object.values(this.ptr).forEach(p => { p.o.held = false; }); this.ptr = {}; return; }
    const p = this.ptr[id]; if (p) { p.o.held = false; delete this.ptr[id]; }
  },
  update(dt) {
    const s = SC();
    this.sayT = Math.max(0, this.sayT - dt);
    for (const o of this.on) o.drop = Math.max(0, o.drop - dt / 0.3);
    if (this.on.length < TBL_ON) { this.wait -= dt; if (this.wait <= 0) { this.place(false); this.wait = 0.25; } }
    for (let i = this.fall.length - 1; i >= 0; i--) {
      const f = this.fall[i]; f.vy += 2000 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.vy > 0 && f.y >= f.land) { // コトッ。1回はねて止まる
        f.y = f.land; sfx.thud();
        if (f.b === 0) { f.b = 1; f.vy = -f.vy * 0.3; f.vx *= 0.5; f.vr *= 0.4; this.pops.push({ x: f.x, y: f.y, t: 0.4 }); }
        else { f.x = clamp(f.x, 20 * s, W - 20 * s); f.r = Math.round(f.r / Math.PI) * Math.PI + rnd(-0.3, 0.3); this.floor.push(f); this.fall.splice(i, 1); }
      }
    }
    if (this.floor.length > 40) this.floor.shift();
    for (let i = this.pops.length - 1; i >= 0; i--) { this.pops[i].t -= dt; if (this.pops[i].t <= 0) this.pops.splice(i, 1); }
  },
  item(o, x, y, r) { // 物1個（(x, y) は真ん中）
    const s = SC(), w = o.w, h = o.h;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r || 0); ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
    switch (o.name) {
      case 'リモコン': rr(-w / 2, -h / 2, w, h, 5 * s); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(w * 0.36, -h * 0.05, 3.5 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c4ccd6'; for (let i = 0; i < 4; i++) ctx.fillRect(-w * 0.4 + i * 10 * s, -2 * s, 6 * s, 4 * s); break;
      case '消しゴム': rr(-w / 2, -h / 2, w, h, 3 * s); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2f8fd6'; ctx.fillRect(-w * 0.15, -h / 2, w * 0.65, h); ctx.strokeRect(-w * 0.15, -h / 2, w * 0.65, h); break;
      case 'ペン': rr(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); rr(w * 0.1, -h / 2, w * 0.4, h, h / 2); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); break;
      case '鍵': ctx.beginPath(); ctx.arc(-w * 0.28, 0, h * 0.75, 0, Math.PI * 2); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(-w * 0.28, 0, h * 0.28, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); ctx.fillStyle = o.c; ctx.fillRect(-w * 0.05, -h * 0.25, w * 0.55, h * 0.5); ctx.strokeRect(-w * 0.05, -h * 0.25, w * 0.55, h * 0.5); break;
      case '小銭入れ': rr(-w / 2, -h / 2, w, h, 8 * s); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(-5 * s, -h / 2 - 2 * s, 4 * s, 0, Math.PI * 2); ctx.arc(5 * s, -h / 2 - 2 * s, 4 * s, 0, Math.PI * 2); ctx.fillStyle = POP; ctx.fill(); ctx.stroke(); break;
      case 'ハンドクリーム': ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w * 0.3, -h * 0.3); ctx.lineTo(w * 0.3, h * 0.3); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); rr(w * 0.3, -h * 0.35, w * 0.2, h * 0.7, 2 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); break;
      default: rr(-w / 2, -h / 2, w, h, Math.min(h / 2, 8 * s)); ctx.fillStyle = o.c; ctx.fill(); ctx.stroke(); // コースター・メガネケース
    }
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H * 0.7);
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, H * 0.7, W, H * 0.3); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.7 - 2, W, 3); // 床
    // 壁の絵
    ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(W * 0.3, H * 0.1, W * 0.4, H * 0.2, 4 * s); ctx.fillStyle = '#9fd6c4'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.32, H * 0.28); ctx.lineTo(W * 0.45, H * 0.16); ctx.lineTo(W * 0.55, H * 0.24); ctx.lineTo(W * 0.62, H * 0.19); ctx.lineTo(W * 0.68, H * 0.28); ctx.closePath(); ctx.fillStyle = '#5f9e8f'; ctx.fill(); ctx.stroke();
    // テーブル（横から）
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(g.lx + 14 * s, g.ty + 14 * s, 14 * s, H * 0.86 - g.ty - 14 * s); ctx.fillRect(g.rx - 28 * s, g.ty + 14 * s, 14 * s, H * 0.86 - g.ty - 14 * s);
    ctx.strokeRect(g.lx + 14 * s, g.ty + 14 * s, 14 * s, H * 0.86 - g.ty - 14 * s); ctx.strokeRect(g.rx - 28 * s, g.ty + 14 * s, 14 * s, H * 0.86 - g.ty - 14 * s);
    rr(g.lx, g.ty, g.rx - g.lx, 16 * s, 4 * s); ctx.fillStyle = '#a8703f'; ctx.fill(); ctx.stroke();
    for (const f of this.floor) this.item(f, f.x, f.y - f.h / 2, f.r);
    for (const o of this.on) this.item(o, o.x, g.ty - o.h / 2 - o.drop * o.drop * 160 * s, 0);
    for (const f of this.fall) this.item(f, f.x, f.y, f.r);
    for (const p of this.pops) bigText('コトッ', p.x, p.y - 30 * s - (0.4 - p.t) * 40 * s, Math.round(22 * s), HOT, PAPER);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.4, Math.round(30 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), o = this.on.reduce((a, b) => (Math.abs(b.x - W / 2) > Math.abs(a.x - W / 2) ? b : a), this.on[0]), dir = o && o.x < W / 2 ? -1 : 1, p = (t * 1.1) % 1; finger((o ? o.x : W / 2) - dir * (o ? o.w / 2 : 0) + dir * p * 70 * g.s, g.ty - 6 * g.s, 0.9); }
};

/* ---------- 大盛り29: トランプ ---------- */
const CARD_BEND = 100; // 山を押して、この長さ px（SC()）下へ引くと、いちばん反る。離すと、反ったぶんだけ飛び散る
const CARD_MIN = 16;   // これより短く引いて離したときは、飛ばない
const CARD_MAX = 26;   // いちばん反らせて離したときに飛ぶ枚数
const CARD_SEC = 3;    // 拾って、そろえる（1枚）
const CARD_DECK = 52;  // 1組の枚数
const CARD_LOST = CARD_DECK, CARD_YEN = 1000; // 1回でこの数以上（1組ぶん）ばらまいたら、1枚だけ見つからないので、トランプの買い直し
const CARD_SUIT = [['♠', INK], ['♥', '#e0303a'], ['♦', '#e0303a'], ['♣', INK]], CARD_RANK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const cards = {
  key: 'cards', name: 'トランプ', prompt: 'ばらまけ！', hint: '山を 下に引いて はなす', bg: '#2f7a55',
  bgm: song(160, [
    ['square', 0.045, '79 . 77 . 76 . 74 . 72 . . . 79 . . . 81 . 79 . 77 . 76 . 74 . . . 67 . . .'],
    ['triangle', 0.13, '48 . 55 . 52 . 55 . 48 . 55 . 52 . 55 . 50 . 57 . 53 . 57 . 43 . 50 . 47 . 50 .']
  ], ['k.h.s.h.k.hks.hh']),
  shop: [['トランプ', 'トランプ'], ['トランプケース', 'トランプ ケース']],
  bill(t) { const n = t.cards || 0, b = t.cardsBuy || 0; return { v: n + '枚', n: (b ? '1枚 見つからないトランプの買い直し・' : '') + '拾ってそろえる', sec: n * CARD_SEC, yen: b * CARD_YEN }; },
  init() { this.n = 0; this.ptr = null; this.bend = 0; this.left = CARD_DECK; this.back = 0; this.slide = 0; this.fly = []; this.floor = []; this.say = ''; this.sayT = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '枚'; },
  commit(tot) { add(tot, 'cards', this.n); add(tot, 'cardsBuy', this.n >= CARD_LOST ? 1 : 0); mx(tot, 'cardsMax', this.n); },
  geo() { const s = SC(); return { s, cx: W / 2, cy: H * 0.74, w: 80 * s, h: 114 * s }; },
  down(id, x, y) { if (this.ptr == null && this.slide <= 0) { this.ptr = id; this.y0 = y; this.bend = 0; } }, // どこを押してもよい
  move(id, x, y) { if (id === this.ptr) this.bend = clamp(y - this.y0, 0, CARD_BEND * SC()); },
  up(id) {
    if (id == null) { this.ptr = null; this.bend = 0; return; }
    if (id !== this.ptr) return;
    this.ptr = null; const s = SC(), b = this.bend; this.bend = 0;
    if (b < CARD_MIN * s) return;
    const k = b / (CARD_BEND * s), m = Math.min(this.left, Math.max(2, Math.round(k * CARD_MAX))), g = this.geo();
    for (let i = 0; i < m; i++) this.fly.push({ x: g.cx + rnd(-10, 10) * s, y: g.cy - g.h * 0.3, vx: rnd(-1, 1) * (250 + 450 * k) * s, vy: -rnd(500, 1000 + 600 * k) * s, r: rnd(0, 6), vr: rnd(-10, 10), face: Math.random() < 0.5, su: Math.floor(Math.random() * 4), rk: Math.floor(Math.random() * 13), back: this.back, land: rnd(H * 0.4, H - 30 * s) });
    this.left -= m; sfx.spray();
    if (scoring()) { this.n += m; if (this.n >= CARD_LOST && this.n - m < CARD_LOST) { this.say = '1枚 見つからない…！'; this.sayT = 1.1; } else if (this.sayT <= 0) { this.say = k > 0.8 ? 'バサーッ！' : 'パラパラッ'; this.sayT = 0.4; } }
    if (this.left <= 0) { this.slide = 1; this.left = CARD_DECK; this.back = 1 - this.back; } // 1組使いきったら、次の1組
  },
  update(dt) {
    const s = SC();
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.slide > 0) this.slide = Math.max(0, this.slide - dt / 0.3);
    for (let i = this.fly.length - 1; i >= 0; i--) { // ひらひら落ちて、床に残る
      const f = this.fly[i]; f.vy = Math.min(f.vy + 1500 * s * dt, 240 * s); f.vx *= Math.exp(-dt * 1.8); f.x += f.vx * dt + Math.sin(clock * 5 + f.r) * 40 * s * dt; f.y += f.vy * dt; f.r += f.vr * dt; f.vr *= Math.exp(-dt);
      if (f.vy > 0 && f.y >= f.land) { this.floor.push(f); this.fly.splice(i, 1); }
    }
    if (this.floor.length > 260) this.floor.splice(0, this.floor.length - 260);
  },
  card(x, y, f, k) { // カード1枚（表か裏）
    const s = SC() * k, w = 40 * s, h = 57 * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.r); ctx.lineWidth = 2; ctx.strokeStyle = INK;
    rr(-w / 2, -h / 2, w, h, 4 * s); ctx.fillStyle = f.face ? PAPER : (f.back ? '#3d6fd6' : '#d6403d'); ctx.fill(); ctx.stroke();
    if (f.face) { const [m, c] = CARD_SUIT[f.su]; ctx.fillStyle = c; ctx.font = `${Math.round(20 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(m, 0, 4 * s); ctx.font = `${Math.round(11 * s)}px ${DISPLAY}`; ctx.fillText(CARD_RANK[f.rk], -w * 0.28, -h * 0.34); ctx.textAlign = 'left'; }
    else { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.strokeRect(-w / 2 + 4 * s, -h / 2 + 4 * s, w - 8 * s, h - 8 * s); }
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = '#f0e2c8'; ctx.fillRect(0, 0, W, H * 0.34); // 壁
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, H * 0.34, W, H * 0.66); ctx.fillStyle = INK; ctx.fillRect(0, H * 0.34 - 2, W, 3); // 床
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.62, W * 0.46, H * 0.2, 0, 0, Math.PI * 2); ctx.fillStyle = '#e6c27a'; ctx.fill(); ctx.stroke(); // じゅうたん
    // 壁の「みんなで ババ抜き」の予定
    rr(W * 0.26, H * 0.08, W * 0.48, H * 0.12, 4 * s); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${Math.round(15 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('こんや 8時', W / 2, H * 0.115); ctx.fillText('家族で ババ抜き', W / 2, H * 0.165, W * 0.44); ctx.textAlign = 'left';
    for (const f of this.floor) this.card(f.x, f.y, f, 1);
    // 山（下へ引くと、反る）
    const b = this.bend / (CARD_BEND * s), cx = g.cx + this.slide * W, n = Math.ceil(this.left / 6);
    ctx.save(); ctx.translate(cx, g.cy);
    for (let i = 0; i < n; i++) {
      const y = -i * 2 * s;
      ctx.beginPath(); ctx.moveTo(-g.w / 2, y - g.h / 2); ctx.quadraticCurveTo(0, y - g.h / 2 + b * 34 * s, g.w / 2, y - g.h / 2); ctx.lineTo(g.w / 2, y + g.h / 2); ctx.quadraticCurveTo(0, y + g.h / 2 + b * 34 * s, -g.w / 2, y + g.h / 2); ctx.closePath();
      ctx.fillStyle = this.back ? '#3d6fd6' : '#d6403d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.strokeRect(-g.w / 2 + 6 * s, -(n - 1) * 2 * s - g.h / 2 + 6 * s + b * 17 * s, g.w - 12 * s, g.h - 12 * s);
    ctx.restore();
    for (const f of this.fly) this.card(f.x, f.y, f, 1.1);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.3, Math.round(32 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.2) % 1; finger(g.cx + 20 * g.s, g.cy - 20 * g.s + Math.min(p * 1.4, 1) * 90 * g.s, p < 0.75 ? 0.9 : 0.3); }
};

/* ---------- 大盛り30: スティックのり ---------- */
const GLUE_PX = 700;   // 左右にこすって（ひねって）、指を合わせてこの長さ px（SC()）動かすと、のりが全部くり出て、ポキッと折れる
const GLUE_SEC = 60;   // 机についたのりを、ふき取る（1本）
const GLUE_BUY = 4, GLUE_YEN = 1000; // 1回でこの数以上折ったら、のりの買い直し
const glue = {
  key: 'glue', name: 'スティックのり', prompt: 'くり出せ！', hint: '左右にこすって ひねる', bg: '#e8f0dc',
  bgm: song(132, [
    ['bub', 0.08, '72 . 72 . 79 . . . 77 . 76 . 74 . . . 72 . 72 . 81 . . . 79 . 77 . 76 . . .'],
    ['triangle', 0.13, '48 . . . 55 . . . 53 . . . 55 . . . 48 . . . 57 . . . 55 . . . 43 . . .']
  ], ['k..hs..hk.k.s..h']),
  shop: [['スティックのり', 'スティックのり'], ['テープのり', 'テープのり']],
  bill(t) { const n = t.glue || 0, b = t.glueBuy || 0; return { v: n + '本', n: (b ? 'のりの買い直し・' : '') + '机についたのりをふき取る', sec: n * GLUE_SEC, yen: b * GLUE_YEN }; },
  init() { this.n = 0; this.ptr = {}; this.ext = 0; this.ph = 0; this.slide = 0; this.fly = []; this.blobs = []; this.tw = 0; this.say = ''; this.sayT = 0; },
  started() { return this.n > 0; },
  result() { return this.n + '本'; },
  commit(tot) { add(tot, 'glue', this.n); add(tot, 'glueBuy', this.n >= GLUE_BUY ? 1 : 0); mx(tot, 'glueMax', this.n); },
  geo() { const s = SC(), k = 1.45; return { s, k, cx: W / 2, by: H * 0.84, tw: 60 * s * k, th: 150 * s * k, gw: 46 * s * k, gmax: 130 * s * k, desk: H * 0.56 }; }, // k: のりを大きく描く
  down(id, x) { this.ptr[id] = { x }; }, // どこでもよい
  move(id, x) {
    const p = this.ptr[id]; if (!p) return;
    const dx = x - p.x; p.x = x;
    if (this.slide > 0) return;
    const s = SC(); this.ext += Math.abs(dx) / (GLUE_PX * s); this.ph += dx / (8 * s); this.tw += Math.abs(dx);
    if (this.tw > 60 * s) { this.tw = 0; sfx.twist(); }
    if (this.ext >= 1) this.snap();
  },
  up(id) { if (id == null) this.ptr = {}; else delete this.ptr[id]; },
  snap() { // ポキッ。折れたのりは机に落ちて、ベタッとつく
    const g = this.geo(), s = g.s;
    this.fly.push({ x: g.cx, y: g.by - g.th - g.gmax / 2, vx: rnd(-1, 1) * 260 * s, vy: -rnd(200, 420) * s, r: 0, vr: rnd(-8, 8), land: rnd(g.desk + 30 * s, H - 30 * s) });
    this.ext = 0; this.slide = 1; sfx.snap();
    if (scoring()) { this.n++; if (this.n === GLUE_BUY) { this.say = 'のりが もうない…！'; this.sayT = 1; } else { this.say = 'ポキッ！'; this.sayT = 0.4; } }
  },
  update(dt) {
    const s = SC();
    this.sayT = Math.max(0, this.sayT - dt);
    if (this.slide > 0) this.slide = Math.max(0, this.slide - dt / 0.3);
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i]; f.vy += 1800 * s * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.vy > 0 && f.y >= f.land) { this.blobs.push({ x: clamp(f.x, 30 * s, W - 30 * s), y: f.land, r: f.r }); this.fly.splice(i, 1); sfx.squish(); }
    }
    if (this.blobs.length > 30) this.blobs.shift();
  },
  piece(x, y, r, k) { // 折れたのりのかけら
    const s = SC() * k; ctx.save(); ctx.translate(x, y); ctx.rotate(r); rr(-21 * s, -30 * s, 42 * s, 60 * s, 8 * s); ctx.fillStyle = '#ece4fb'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  },
  stick(cx, g, ext) { // のりの本体（下のダイヤルを回すと、上からのりが出てくる）
    const s = g.s * g.k, top = g.by - g.th;
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    const gh = 8 * s + ext * g.gmax;
    rr(cx - g.gw / 2, top - gh, g.gw, gh + 10 * s, 10 * s); ctx.fillStyle = '#ece4fb'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(181,140,255,.35)'; ctx.fillRect(cx - g.gw / 2 + 6 * s, top - gh + 6 * s, 8 * s, gh - 6 * s); // つや
    rr(cx - g.tw / 2, top, g.tw, g.th - 30 * s, 8 * s); ctx.fillStyle = '#4f86f7'; ctx.fill(); ctx.stroke(); // 筒
    ctx.fillStyle = PAPER; rr(cx - g.tw / 2 + 8 * s, top + 26 * s, g.tw - 16 * s, 54 * s, 4 * s); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${Math.round(16 * s)}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('の', cx, top + 42 * s); ctx.fillText('り', cx, top + 64 * s); ctx.textAlign = 'left';
    ctx.lineWidth = 3; rr(cx - g.tw / 2 - 2 * s, g.by - 30 * s, g.tw + 4 * s, 30 * s, 6 * s); ctx.fillStyle = '#2f5fc0'; ctx.fill(); ctx.stroke(); // 回すダイヤル
    ctx.save(); rr(cx - g.tw / 2 - 2 * s, g.by - 30 * s, g.tw + 4 * s, 30 * s, 6 * s); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3 * s;
    for (let i = -2; i < 10; i++) { const x = cx - g.tw / 2 + (((i * 9 * s + this.ph * 3 * s) % (g.tw + 18 * s)) + g.tw + 18 * s) % (g.tw + 18 * s) - 9 * s; ctx.beginPath(); ctx.moveTo(x, g.by - 28 * s); ctx.lineTo(x, g.by - 2 * s); ctx.stroke(); }
    ctx.restore();
  },
  draw() {
    const g = this.geo(), s = g.s;
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, g.desk);
    ctx.fillStyle = '#d6b07c'; ctx.fillRect(0, g.desk, W, H - g.desk); ctx.fillStyle = INK; ctx.fillRect(0, g.desk - 2, W, 3); // 机
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.save(); ctx.translate(W * 0.2, g.desk + 70 * s); ctx.rotate(-0.15); rr(-50 * s, -34 * s, 100 * s, 68 * s, 3 * s); ctx.fillStyle = '#ffe9a8'; ctx.fill(); ctx.stroke(); ctx.restore(); // 色紙
    rr(W * 0.72, g.by - 34 * s, 70 * s, 34 * s, 10 * s); ctx.fillStyle = '#4f86f7'; ctx.fill(); ctx.stroke(); // はずしたキャップ
    ['#ff5a4e', '#ffd23f', '#5fb35a'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(W * 0.8 + i * 12 * s, g.desk - 84 * s + (i % 2) * 10 * s, 8 * s, 50 * s); ctx.strokeRect(W * 0.8 + i * 12 * s, g.desk - 84 * s + (i % 2) * 10 * s, 8 * s, 50 * s); }); // ペン立て
    rr(W * 0.78, g.desk - 44 * s, 44 * s, 54 * s, 6 * s); ctx.fillStyle = '#9fd6c4'; ctx.fill(); ctx.stroke();
    for (const b of this.blobs) { ctx.save(); ctx.translate(b.x, b.y); ctx.beginPath(); ctx.ellipse(0, 6 * s, 30 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(181,140,255,.35)'; ctx.fill(); ctx.restore(); this.piece(b.x, b.y - 4 * s, Math.PI / 2 + b.r * 0.05, 1); }
    if (this.slide > 0) this.stick(g.cx + this.slide * W, g, 0);
    else this.stick(g.cx, g, this.ext);
    for (const f of this.fly) this.piece(f.x, f.y, f.r, 1.3);
    if (this.ext > 0.75 && this.slide <= 0) bigText('ギリギリ…', g.cx, g.by - g.th - g.gmax - 30 * s, Math.round(20 * s), INK, PAPER);
    if (this.sayT > 0) bigText(this.say, W / 2, H * 0.2, Math.round(32 * s), HOT, PAPER, W * 0.9);
  },
  drawHint(t) { const g = this.geo(), p = Math.sin(t * 7); finger(g.cx + p * 70 * g.s, g.by - 10 * g.s, 0.9); }
};

STAGE_LIST.push(umbrella, keyboard, tabletop, cards, glue);
ZUKAN_EXTRA.push(
  { id: 'umbrella', name: '晴れの日の傘', desc: '部屋の中で傘を1回で17本 開く', ok: t => (t.umbrellaMax || 0) >= 17 },
  { id: 'keyboard', name: '打てない報告書', desc: 'キーボードのキーを1回で17個 外す', ok: t => (t.keyboardMax || 0) >= 17 },
  { id: 'tabletop', name: 'ネコの気持ち', desc: 'テーブルの物を1回で10個 落とす', ok: t => (t.tabletopMax || 0) >= 10 },
  { id: 'cards', name: 'ババ抜き中止', desc: 'トランプを1回で250枚 ばらまく', ok: t => (t.cardsMax || 0) >= 250 },
  { id: 'glue', name: 'のり切れない', desc: 'スティックのりを1回で10本 折る', ok: t => (t.glueMax || 0) >= 10 }
);

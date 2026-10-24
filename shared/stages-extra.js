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
const graffiti = {
  key: 'graffiti', name: '落書き', prompt: '描け！', hint: 'なぞって 壁に落書き', bg: '#f3e7d3',
  bgm: song(136, [ // のびのびお絵かき
    ['square', 0.045, '72 . 76 . 79 . 76 . 81 - 79 . 76 . 72 . 74 . 77 . 81 . 77 . 84 - 81 . 77 . 74 .'],
    ['triangle', 0.15, '48 . . . 55 . . . 50 . . . 57 . . . 53 . . . 57 . . . 55 . . . 43 . . .']
  ], ['k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.h.']),
  shop: [['メラミンスポンジ', 'メラミンスポンジ'], ['壁紙の補修シート', '壁紙 補修シート']],
  bill(t) {
    const m = t.graffiti || 0, w = t.wallpaper || 0;
    return { v: m.toFixed(1) + 'm', n: (w ? '壁紙の張り替え ' + w + '回・' : '') + '消しゴムでこする', sec: m * 20 + w * 1800, yen: w * 2000 };
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
const SHOE_SEC = { roof: 600, tree: 300, dog: 60 }; // 1個取ってくるのにかかる秒（屋根ははしご、木は棒、犬小屋は犬をなだめる）
const SHOE_DOG_YEN = 2000; // 犬小屋に入った靴は、かじられて買い直し
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
  { id: 'graffiti', name: '壁の芸術家', desc: '落書きを1回で10m描く', ok: t => (t.graffitiMax || 0) >= 10 },
  { id: 'soda', name: '人間噴水', desc: '炭酸を1回で1000mL噴き出させる', ok: t => (t.sodaMax || 0) >= 1000 },
  { id: 'pudding', name: 'つまみ食い名人', desc: 'プリンを1回で3個食べる', ok: t => (t.puddingMax || 0) >= 3 },
  { id: 'sticker', name: 'デコり職人', desc: 'シールを1回で20枚貼る', ok: t => (t.stickerMax || 0) >= 20 },
  { id: 'shoe', name: 'あーした天気になーれ', desc: '靴を1回で3個 屋根にのせる', ok: t => (t.shoeRoofMax || 0) >= 3 },
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
const CAL_REBUY = 30, CAL_YEN = 1000; // 1回でこの枚数以上破ったら、カレンダーの買い直し
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
const VAC_LEGO = 5, VAC_YEN = 3000; // 1回でレゴをこの数以上吸ったら、詰まって修理
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
  bill(t) { const n = t.vacuum || 0, r = t.vacuumFix || 0; return { v: n + '個', n: (r ? '掃除機の修理' + (r > 1 ? r + '回' : '') + '・' : '') + '紙パックを開けて探す', sec: n * 120, yen: r * VAC_YEN }; },
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
const FUTON_SORRY = 10, FUTON_REDO = 20, FUTON_YEN = 3000; // 1回でこの回数以上跳ねたら、下の階へ謝りに行く／布団の打ち直し
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
const NEWS_SPAN = 0.7; // 新聞の幅のこの割合を1回でなぞれたら、1本切れる
const NEWS_YEN = 150;  // 切った新聞（1回のステージで1部）の買い直し
const news = {
  key: 'news', name: '新聞', prompt: '切れ！', hint: 'ハサミで 新聞を横に切る', bg: '#dfe9f0',
  bgm: song(132, [
    ['bell', 0.06, '84 . . 79 . . 76 . 77 . . 81 . . 79 . 84 . . 79 . . 76 . 74 . . 77 . . 72 .'],
    ['triangle', 0.13, '48 . 55 . 52 . 55 . 53 . 57 . 55 . 59 . 48 . 55 . 52 . 55 . 50 . 55 . 43 . 47 .']
  ], ['k..hs..hk..hs.hhk..hs..hk.k.s..h']),
  shop: [['ほうきとちりとり', 'ほうき ちりとり セット']],
  bill(t) { const n = t.news || 0, p = t.newsPaper || 0; return { v: n + '本', n: (p ? 'パパの新聞を' + p + '部買い直す・' : '') + '紙くずをそうじ', sec: n * 5, yen: p * NEWS_YEN }; },
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
const bubble = {
  key: 'bubble', name: 'シャボン玉', prompt: 'ふけ！', hint: '押したまま 向きを変える', bg: '#e9f3ea',
  bgm: song(120, [
    ['bub', 0.1, '79 . 84 . 88 . 84 . 79 . 84 . 91 . . . 77 . 81 . 86 . 81 . 77 . 81 . 89 . . .'],
    ['ep', 0.1, '48 . . . 52 . . . 55 . . . 52 . . . 50 . . . 53 . . . 57 . . . 53 . . .']
  ], ['k...h.h.s...h...k...h.h.s...h.h.']),
  shop: [['シャボン玉液', 'シャボン玉 液']],
  bill(t) { const n = t.bubble || 0, b = t.bubbleBottle || 0; return { v: n + '個', n: '家具と床をふく' + (b ? '・シャボン液 ' + b + '本' : ''), sec: n * 2, yen: b * BUBBLE_YEN }; },
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
  { id: 'calendar', name: '未来人', desc: 'カレンダーを1回で20日めくる', ok: t => (t.calendarMax || 0) >= 20 },
  { id: 'vacuum', name: 'なんでも吸引', desc: '掃除機で1回で10個吸う', ok: t => (t.vacuumMax || 0) >= 10 },
  { id: 'futon', name: '天井タッチ', desc: '布団で跳ねて天井に手が届く', ok: t => (t.futonCeil || 0) >= 1 },
  { id: 'news', name: 'シュレッダー', desc: '新聞を1回で10本に切る', ok: t => (t.newsMax || 0) >= 10 },
  { id: 'bubble', name: 'シャボン職人', desc: 'シャボン玉を1回で30個 家具に当てる', ok: t => (t.bubbleMax || 0) >= 30 }
);

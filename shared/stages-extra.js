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
  init() { this.n = 0; this.hit = { roof: 0, tree: 0, dog: 0 }; this.shoes = []; this.landed = []; this.pops = []; this.ptr = {}; },
  started() { return this.n > 0 || this.shoes.length > 0 || this.landed.length > 0; },
  result() { return this.n + '個'; },
  commit(tot) {
    add(tot, 'shoeRoof', this.hit.roof); add(tot, 'shoeTree', this.hit.tree); add(tot, 'shoeDog', this.hit.dog);
    mx(tot, 'shoeRoofMax', this.hit.roof);
  },
  geo() {
    const s = SC();
    return { s, by: H * 0.82, ground: H * 0.58,
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
    for (let i = this.shoes.length - 1; i >= 0; i--) {
      const b = this.shoes[i], py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += dt * 12;
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
    for (const b of this.shoes) this.drawShoe(b.x, b.y, b.r, this.size(b.y), b.c);
    const last = this.shoes[this.shoes.length - 1];
    if (!last || last.y < g.by - 60 * s) this.drawShoe(W / 2, g.by, 0, 22 * s, '#ff9e3d'); // 次の靴
    for (const p of this.pops) { ctx.globalAlpha = Math.min(1, p.life * 2); bigText(p.say, clamp(p.x, W * 0.25, W * 0.75), p.y - 30 * s - (1 - p.life) * 30 * s, Math.round(24 * s), HOT, PAPER, W * 0.5); ctx.globalAlpha = 1; }
  },
  drawHint(t) { const g = this.geo(), p = (t * 1.3) % 1; finger(W / 2, g.by - p * g.by * 0.5, 0.9 * (1 - p * 0.6)); }
};

STAGE_LIST.push(graffiti, soda, pudding, sticker, shoe);
ZUKAN_EXTRA.push(
  { id: 'graffiti', name: '壁の芸術家', desc: '落書きを1回で10m描く', ok: t => (t.graffitiMax || 0) >= 10 },
  { id: 'soda', name: '人間噴水', desc: '炭酸を1回で1000mL噴き出させる', ok: t => (t.sodaMax || 0) >= 1000 },
  { id: 'pudding', name: 'つまみ食い名人', desc: 'プリンを1回で3個食べる', ok: t => (t.puddingMax || 0) >= 3 },
  { id: 'sticker', name: 'デコり職人', desc: 'シールを1回で20枚貼る', ok: t => (t.stickerMax || 0) >= 20 },
  { id: 'shoe', name: 'あーした天気になーれ', desc: '靴を1回で3個 屋根にのせる', ok: t => (t.shoeRoofMax || 0) >= 3 }
);

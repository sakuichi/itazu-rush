// いたずラッシュの共通部分（進行・図鑑・描画・録画・シェア・入力）。既存版（/index.html）と大盛り（/oomori/index.html）の両方で使う。
// 読み込み順: base.js → stages.js →（stages-extra.js）→ game.js。ファイルをまたいでトップレベルの const を共有するため、IIFE で囲まない。
'use strict';
/* ---------- サイトの設定（ページ側の window.ITAZU。ない項目は既存版の値） ---------- */
const CONF = Object.assign({
  title: 'いたずラッシュ',                        // 共有の文・結果カードに出す名前
  site: 'https://sakuichi.github.io/itazu-rush/', // 公開URL。挑戦状は site + 'c/段階.html'
  store: 'itazurush-',                            // 図鑑を保存するキーの頭（音・録画のオンオフは全サイト共通）
  stages: ['tissue', 'toilet', 'shoji', 'paste', 'shampoo', 'mud', 'toys', 'puddle', 'hose', 'elev'],
  order: 'rounds',     // 'rounds': 全種を1回ずつ周回する ／ 'random': 全種の中から total 本をランダムに出す
  total: 20,           // order が 'random' のときの本数
  roundLen: 10,        // order が 'random' のとき、テンポが上がる区切り（前半10本・後半10本）
  modeName: '周回モード', // 図鑑の文などで、決まった本数で終わるモードを呼ぶ名前
  tags: '#いたずラッシュ', // 投稿文のハッシュタグ（複数ならスペース区切り）
  intro: '子どものころやりたかったいたずらを、数秒ずつやり放題。最後に「大人の現実」を請求されます。\nインストール不要、ブラウザですぐ遊べる「いたずラッシュ」'
}, window.ITAZU || {});
const RANDOM = CONF.order === 'random';

/* ---------- 進行 ---------- */
const NORMAL = CONF.stages.map(k => STAGE_LIST.find(s => s.key === k)).filter(Boolean);
const BONUS = nopush;
const N = NORMAL.length;
const ROUNDS = 2;          // 周回モードの周回数（全ステージが揃ってから調整）
const TOTAL = RANDOM ? CONF.total : ROUNDS * N; // 決まった本数で終わるモードの本数（ボーナスを除く）
const RLEN = RANDOM ? CONF.roundLen : N;        // テンポが上がる区切り
const BONUS_RATE = 0.05;   // 無限モードで、1周目のあと各ステージの後に押すなボタンが割り込む確率
// 周回ごと。4周目以降は最後の値。周回モード全体の録画が X の無料ユーザーの上限（140秒）に収まるよう、約136秒にしている
const PLAY = [5, 4.5, 4], PROMPT = [0.8, 0.7, 0.65], FLASH = [0.8, 0.7, 0.65], RATE = [1, 1.4, 1.5]; // RATE: BGMのテンポ倍率。周回が進むとはっきり速くして焦らせる
const SITE = CONF.site;
const add = (t, k, v) => { t[k] = (t[k] || 0) + v; };
const mx = (t, k, v) => { t[k] = Math.max(t[k] || 0, v); }; // 1回のステージでの最高（図鑑の判定用）
let mode = 'title', gameMode = 'loop', st = null, tm = 0, paused = false, clock = 0, committed = true;
let count = 0, order = [], isBonus = false, lastBonus = false, bonusDone = false, played = new Set(), forced = [], prevNormal = null;
let tot = {}, res = null, rt = 0, barH = 0, doneText = '';
// 結果のボタン帯がキャンバスの下から何pxを占めるか（結果カードはその上に収める）
function measureBar() { barH = Math.max(0, cv.getBoundingClientRect().bottom - $('resbar').getBoundingClientRect().top); }
const hud = $('hud');
const panels = { title: $('title'), pause: $('pause'), result: $('result'), shop: $('shop'), zukan: $('zukan') };

const speed = () => Math.min(PLAY.length - 1, Math.floor(Math.max(0, count - 1) / RLEN));
// 成果を数えてよいのはプレイ中だけ（時間切れのあとの慣性や流れっぱなしの分は数えない）
function scoring() { return mode === 'play'; }
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function shuffle(prev) {
  const a = shuffleArr(NORMAL.slice());
  if (a.length > 1 && a[0] === prev) [a[0], a[1]] = [a[1], a[0]]; // 周の切れ目で同じステージが続かないように
  return a;
}
function normalNext() {
  let s;
  if (RANDOM) s = randomPick();
  else { if (count % N === 0) order = shuffle(order[N - 1]); s = order[count % N]; }
  if (forced.length) { const k = forced.shift(); s = NORMAL.find(x => x.key === k) || s; }
  count++; prevNormal = s;
  return s;
}
// ランダムに1本選ぶ。total 本ごとに組を作り（無限モードは total 本ごとに作り直す）、その順に出す
function randomPick() {
  if (count % CONF.total === 0) order = randomSet(prevNormal);
  return order[count % CONF.total];
}
// total 本の組。全種類を1回ずつ入れ、余った本数は別々の種類で埋める（種類が total より多ければ、かぶらずに total 種）。
// 並びはシャッフルし、直前と同じものが続かない並びになるまで引き直す
function randomSet(prev) {
  const n = CONF.total, set = [];
  while (set.length < n) set.push(...shuffle(null).slice(0, n - set.length));
  let a = set;
  for (let tries = 0; tries < 200; tries++) {
    a = shuffleArr(set.slice());
    if (a[0] !== prev && a.every((x, i) => i === 0 || x !== a[i - 1])) break;
  }
  return a;
}
function pickNext() {
  if (gameMode === 'loop') {
    if (count < TOTAL) return normalNext();
    if (BONUS && !bonusDone) { bonusDone = true; return BONUS; }
    return null;
  }
  if (BONUS && count >= RLEN && !lastBonus && (Math.random() < BONUS_RATE || forced[0] === 'bonus')) {
    if (forced[0] === 'bonus') forced.shift();
    lastBonus = true; return BONUS;
  }
  lastBonus = false;
  return normalNext();
}
function startGame(m) {
  initAudio();
  if (m) gameMode = m;
  tot = {}; played = new Set(); count = 0; order = []; prevNormal = null; lastBonus = false; bonusDone = false; paused = false; res = null;
  panels.title.hidden = true; panels.result.hidden = true; panels.pause.hidden = true; panels.shop.hidden = true; panels.zukan.hidden = true; hud.hidden = false;
  $('recHint').textContent = ''; $('saveVid').hidden = true;
  recCancel(); // 前回の録画がまだ止まっていなければ捨てる
  recStart();
  next();
}
function next() {
  const s = pickNext();
  if (!s) { finish(true); return; }
  st = s; isBonus = s === BONUS; st.init(); committed = false;
  mode = 'prompt'; tm = 0;
  if (isBonus) sfx.rare(); else sfx.prompt();
}
function commit() { if (!committed && st && (mode === 'play' || mode === 'flash')) st.commit(tot); committed = true; }
function fmtTime(sec) {
  sec = Math.round(sec);
  if (sec < 60) return sec + '秒';
  const m = Math.round(sec / 60);
  return m < 60 ? m + '分' : Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : '');
}
// 判定の段階（0〜5）。挑戦状の入口ページ c/段階.html もこの段階で分ける
const tierOf = a => a < 1 ? 0 : a < 40 ? 1 : a < 90 ? 2 : a < 180 ? 3 : a < 300 ? 4 : 5;
function verdict(a) {
  return ['まだバレてない', '正座10分', 'おやつ抜き', '家族会議', 'おこづかい3か月停止', '伝説のいたずらっ子'][tierOf(a)];
}
function buildResult() {
  const rows = [];
  let sec = 0, yen = 0, extra = 0;
  for (const s of BONUS ? NORMAL.concat(BONUS) : NORMAL) {
    if (!played.has(s.key)) continue;
    const b = s.bill(tot);
    rows.push({ key: s.key, k: s.name, v: b.v, n: b.n, yen: b.yen || 0, shop: s.shop });
    sec += b.sec || 0; yen += b.yen || 0; extra += b.angry || 0;
  }
  yen = Math.max(0, Math.round(yen)); // へそくりで引いても0円より下にはしない
  // 怒られ度（%）: 損害100円で1%、後始末2分で1%、押すなボタンは2回で1%。単価は各ステージの bill() にある
  const angry = Math.min(999, Math.round(yen / 100 + sec / 120 + extra));
  const tb = 0.3 + rows.length * 0.09 + 0.2;
  return { rows, sec, yen, angry, word: verdict(angry), tb, ts: tb + 0.85, shown: 0, stamped: false };
}
/* ---------- いたずら図鑑（実績。端末に保存する） ---------- */
// ok(tot, g) が true になったら登録。g = { natural: 最後まで遊んだ, loop: 周回モード, count: 遊んだ本数, played, res }
// secret: 達成するまで条件も伏せる
// 大盛り（ランダム）の「いたずらっ子」は通算で判定するので、遊んだ種類を端末に覚えておく（CONF.store + 'played'）
let playedAll = new Set();
if (RANDOM) try { playedAll = new Set(JSON.parse(localStorage.getItem(CONF.store + 'played') || '[]')); } catch (e) { playedAll = new Set(); }
function rememberPlayed() {
  if (!RANDOM) return;
  try { for (const k of JSON.parse(localStorage.getItem(CONF.store + 'played') || '[]')) playedAll.add(k); } catch (e) {} // 別のタブで遊んだ分も消さない
  for (const s of NORMAL) if (played.has(s.key)) playedAll.add(s.key);
  try { localStorage.setItem(CONF.store + 'played', JSON.stringify([...playedAll])); } catch (e) {}
}
const ZUKAN = [
  { id: 'tissue', name: 'ティッシュ全部出す係', desc: 'ティッシュを1回で35枚出す', ok: t => (t.tissueMax || 0) >= 35 },
  { id: 'roll', name: 'ロール使い切り', desc: 'トイレットペーパーを1回で25m伸ばす', ok: t => (t.tpMax || 0) >= 25 },
  { id: 'hapRoll', name: 'ころころ', desc: 'トイレットペーパーのロールが転がっていく', secret: 'トイレットペーパーで、まれに起きる何か', ok: t => !!t.hapRoll },
  { id: 'shoji2', name: '障子やぶりの達人', desc: '障子を1回で2面、張り替えにする', ok: t => (t.shojiFullMax || 0) >= 2 },
  { id: 'shoji1', name: 'ひと穴だけ', desc: '障子を1穴だけ破って終える', ok: t => !!t.shojiOne },
  { id: 'hapCat', name: 'ネコの手', desc: '障子やぶりにネコが参戦する', secret: '障子で、まれに起きる何か', ok: t => !!t.hapCat },
  { id: 'paste', name: 'しぼり切り', desc: '歯みがき粉を1回で1本しぼり切る', ok: t => (t.pasteMax || 0) >= TUBE_CM },
  { id: 'shampoo', name: 'あわあわ', desc: 'シャンプーを1回で45プッシュ', ok: t => (t.shampooMax || 0) >= 45 },
  { id: 'rug', name: 'クリーニング行き', desc: 'じゅうたんを泥んこにする', ok: t => (t.rug || 0) >= 1 },
  { id: 'hapDog', name: 'イヌもいっしょ', desc: '泥んこ足にイヌがついてくる', secret: '泥んこ足で、まれに起きる何か', ok: t => !!t.hapDog },
  { id: 'lost', name: '行方不明', desc: 'おもちゃを失くす', ok: t => (t.lost || 0) >= 1 },
  { id: 'boxes', name: 'ひっくり返し屋', desc: 'おもちゃ箱を1回で5箱ひっくり返す', ok: t => (t.boxMax || 0) >= 5 },
  { id: 'hapMoney', name: 'へそくり発見', desc: 'おもちゃ箱からへそくりが出てくる', secret: 'おもちゃ箱で、まれに起きる何か', ok: t => (t.money || 0) >= 1 },
  { id: 'clothes', name: '服がもうダメ', desc: 'タメ最大で水たまりに飛び込む', ok: t => (t.clothes || 0) >= 1 },
  { id: 'hapCar', name: '洗車代', desc: 'となりに停めてある車に泥をかける', secret: '水たまりで、まれに起きる何か', ok: t => !!t.hapCar },
  { id: 'hose', name: '全開', desc: 'ホースを全開にする', ok: t => !!t.hoseFull },
  { id: 'laundry', name: '洗濯やり直し', desc: '洗濯物を1回で全部びしょぬれにする', ok: t => (t.wetMax || 0) >= 6 },
  { id: 'elev', name: '各階停止', desc: 'エレベーターのボタンを全部押す', ok: t => (t.elevMax || 0) >= EC * ER },
  { id: 'broke', name: '故障', desc: 'エレベーターを故障させる', secret: 'エレベーターで、ごくまれに起きる何か', ok: t => (t.broke || 0) >= 1 },
  { id: 'nopush', name: '押しちゃった', desc: '押すなボタンを押す', ok: t => (t.nopush || 0) >= 1 },
  { id: 'nopushLegend', name: '伝説の連打', desc: '押すなボタンを1回で40回押す', ok: t => (t.nopushMax || 0) >= 40 },
  { id: 'round', name: 'いたずらっ子', desc: RANDOM ? '全' + N + '種のいたずらを、全部やる（何回かに分けてもよい）' : '全' + N + '種のいたずらを1周する（どちらのモードでも）', ok: (t, g) => RANDOM ? NORMAL.every(s => playedAll.has(s.key)) : g.count >= N },
  { id: 'clear', name: 'やり切った', desc: CONF.modeName + 'を最後まで遊ぶ', ok: (t, g) => g.loop && g.natural },
  { id: 'goodkid', name: 'いい子', desc: CONF.modeName + 'を怒られ度0%で終える', secret: CONF.modeName + 'を、ある判定で終える', ok: (t, g) => g.loop && g.natural && g.res.angry === 0 },
  { id: 'legend', name: '伝説のいたずらっ子', desc: '判定「伝説のいたずらっ子」をもらう', ok: (t, g) => tierOf(g.res.angry) === 5 },
  { id: 'yen', name: '損害1万円', desc: '1回の損害額が1万円を超える', ok: (t, g) => g.res.yen >= 10000 },
  { id: 'endless', name: 'やめられない', desc: '無限モードで30本続ける', ok: (t, g) => !g.loop && g.count >= 30 },
  { id: 'rare', name: 'レア出現', desc: '無限モードで押すなボタンに出会う', secret: '無限モードで、まれに出会える何か', ok: (t, g) => !g.loop && g.played.has('nopush') },
  { id: 'vs', name: '挑戦状に勝つ', desc: '挑戦状の怒られ度を超える', ok: (t, g) => g.loop && g.natural && challenge != null && g.res.angry > challenge },
  { id: 'movie', name: '記念撮影', desc: '録画した動画を保存する', ok: () => false } // 動画の保存ボタンで登録
];
ZUKAN.push(...ZUKAN_EXTRA); // 新しいステージの項目（大盛りなど）
let zukan = {};
try { zukan = JSON.parse(localStorage.getItem(CONF.store + 'zukan') || '{}') || {}; } catch (e) { zukan = {}; }
function unlock(ids) { // 新しく登録された項目の名前を返す
  const d = new Date(), day = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(), got = [];
  for (const id of ids) if (!zukan[id]) { zukan[id] = day; got.push(ZUKAN.find(z => z.id === id).name); }
  if (got.length) { try { localStorage.setItem(CONF.store + 'zukan', JSON.stringify(zukan)); } catch (e) {} renderZukan(); }
  return got;
}
function checkZukan(natural) {
  rememberPlayed();
  const g = { natural, loop: gameMode === 'loop', count, played, res };
  return unlock(ZUKAN.filter(z => { try { return z.ok(tot, g); } catch (e) { return false; } }).map(z => z.id));
}
function renderZukan() {
  const n = ZUKAN.filter(z => zukan[z.id]).length;
  $('zukanCount').textContent = n + '/' + ZUKAN.length;
  $('zukanSum').textContent = n + ' / ' + ZUKAN.length + ' 個 登録ずみ';
  const ul = $('zukanList'); ul.textContent = '';
  for (const z of ZUKAN) {
    const li = document.createElement('li'), b = document.createElement('b'), sp = document.createElement('span'), got = zukan[z.id];
    li.className = got ? 'got' : '';
    b.textContent = got ? z.name : '？？？';
    sp.textContent = got ? z.desc + '（' + got + '）' : (z.secret || z.desc);
    li.append(b, sp); ul.appendChild(li);
  }
}

function finish(natural) { // natural: 最後まで遊んで終わった（中断からやめたのではない）
  commit(); music.stop();
  mode = 'result'; paused = false; recPause(false);
  hud.hidden = true; panels.pause.hidden = true;
  res = buildResult(); rt = calm ? 9 : 0;
  res.newZ = checkZukan(natural === true);
  fillPick();
  panels.result.hidden = false; measureBar();
  $('recHint').textContent = rec ? '動画を書き出し中です…' : (recOn && canRec ? '録画を開始できませんでした。' + (recErr ? '（' + recErr + '）' : '') : '');
  fillShop();
  $('xpost').textContent = gameMode === 'loop' ? 'Xで挑戦状' : 'Xでポスト';
  sfx.final();
}
function goTitle() {
  music.stop(); recCancel();
  mode = 'title'; paused = false; st = null; committed = true; res = null;
  hud.hidden = true; panels.pause.hidden = true; panels.result.hidden = true; panels.shop.hidden = true; panels.zukan.hidden = true; panels.title.hidden = false;
}
function setPause(v) {
  if (mode !== 'prompt' && mode !== 'play' && mode !== 'flash') return;
  if (paused === v) return;
  paused = v; panels.pause.hidden = !v;
  if (v) { if (st) st.up(null); music.stop(); }
  else if (mode === 'play') music.start(st.bgm, RATE[speed()]);
  recPause(v);
}

function update(dt) {
  clock += dt;
  if (mode === 'result') { updateResult(dt); return; }
  if (paused || !st || mode === 'title') return;
  tm += dt;
  const r = speed();
  if (mode === 'prompt') {
    if (tm >= PROMPT[r] + (isBonus ? 0.5 : 0)) { mode = 'play'; tm = 0; played.add(st.key); music.start(st.bgm, RATE[r]); } // 遊んだ扱いはプレイが始まってから（お題の途中でやめたステージは結果に出さない）
  } else if (mode === 'play') {
    st.update(dt);
    if (tm >= PLAY[r]) {
      mode = 'flash'; tm = 0; st.up(null); music.stop(); sfx.flash();
      // 何もしなかったときは「いたずら成功！」ではなく、がまんしたことをほめる
      doneText = st.started() ? (st.done || 'いたずら成功！') : (Math.random() < 0.5 ? 'がまんした！' : 'いい子だった！');
    }
  } else if (mode === 'flash') {
    st.update(dt);
    if (tm >= FLASH[r]) { commit(); next(); }
  }
}
function updateResult(dt) {
  if (!res) return;
  rt += dt;
  const shown = Math.min(res.rows.length, Math.floor((rt - 0.3) / 0.09) + 1);
  if (shown > res.shown && !calm) { res.shown = shown; sfx.row(); }
  if (!res.stamped && rt >= res.ts) { res.stamped = true; sfx.stamp(); }
  if (res.newZ.length && !res.zShown && rt >= res.ts + 0.6) { res.zShown = true; sfx.rare(); }
  if (rec && rt >= res.ts + (res.newZ.length ? 2.0 : 1.4)) recStop(); // 判定のハンコ（と図鑑のシール）のあと少しで録画を止める
}

/* ---------- 描画（HUDと結果もキャンバスに描く。録画に写すため） ---------- */
function burst() {
  ctx.fillStyle = POP; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.45, R = Math.hypot(W, H), a0 = calm ? 0 : clock * 0.25, NB = 16;
  ctx.fillStyle = POP2;
  for (let i = 0; i < NB; i += 2) {
    const a = a0 + i / NB * Math.PI * 2, b = a + Math.PI * 2 / NB;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(b) * R, cy + Math.sin(b) * R); ctx.closePath(); ctx.fill();
  }
}
function hudLabel() {
  if (isBonus) return gameMode === 'loop' ? 'ボーナス' : 'レア！';
  return gameMode === 'loop' ? count + '/' + TOTAL : count + '本目';
}
function drawHud(frac) {
  ctx.save();
  ctx.font = `15px ${DISPLAY}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const label = hudLabel(), ph = 28, px = 16, py = 18, pw = ctx.measureText(label).width + 20;
  rr(px, py, pw, ph, ph / 2); ctx.fillStyle = INK; ctx.fill();
  ctx.fillStyle = PAPER; ctx.fillText(label, px + 10, py + ph / 2 + 1);
  const bx = px + pw + 10, bw = Math.max(24, W - 16 - 44 - 10 - bx), bh = 20, by = py + ph / 2 - bh / 2;
  rr(bx, by, bw, bh, bh / 2); ctx.fillStyle = INK; ctx.fill();
  if (frac > 0) { rr(bx + 3, by + 3, Math.max(bh - 6, (bw - 6) * frac), bh - 6, (bh - 6) / 2); ctx.fillStyle = HOT; ctx.fill(); }
  ctx.restore();
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (W < 2 || H < 2) return;
  if (mode === 'result') { drawResult(); return; }
  if (!st || mode === 'title') { burst(); return; }
  const r = speed();
  if (mode === 'prompt') {
    burst();
    const big = Math.min(W * 0.24, 120), k = calm ? 1 : Math.min(1, tm / 0.16), s = 1.35 - 0.35 * k;
    if (isBonus) {
      const e = calm ? 1 : Math.min(1, tm / 0.2);
      ctx.save(); ctx.translate(W / 2, H * 0.42 - big * 1.05); ctx.rotate(0.05 + (calm ? 0 : Math.sin(clock * 9) * 0.03)); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e);
      bigText(gameMode === 'loop' ? 'ボーナス！' : 'レア出現！', 0, 0, Math.min(W * 0.11, 52), HOT, INK, W * 0.8);
      ctx.restore();
    }
    ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(-0.06); ctx.scale(s, s);
    bigText(st.prompt, 0, 0, big, PAPER, INK, W * 0.86);
    ctx.restore();
    ctx.font = `900 ${Math.min(22, W * 0.055)}px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
    ctx.fillText(st.hint, W / 2, H * 0.42 + big * 0.95);
    drawHud(1);
    return;
  }
  st.draw();
  if (mode === 'play') {
    ctx.save(); ctx.textAlign = 'left';
    ctx.font = `${Math.min(44, W * 0.11)}px ${DISPLAY}`; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
    ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.strokeText(st.result(), 18, 62);
    ctx.fillStyle = PAPER; ctx.fillText(st.result(), 18, 62); ctx.restore();
    if (!st.started()) st.drawHint(tm);
    drawHud(clamp(1 - tm / PLAY[r], 0, 1));
  } else {
    ctx.fillStyle = 'rgba(35,27,46,.45)'; ctx.fillRect(0, 0, W, H);
    const k = calm ? 1 : Math.min(1, tm / 0.14), s = 1.3 - 0.3 * k;
    ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(0.04); ctx.scale(s, s);
    bigText(st.result(), 0, 0, Math.min(W * 0.26, 130), POP, INK, W * 0.86);
    ctx.restore();
    bigText(doneText, W / 2, H * 0.42 + Math.min(W * 0.26, 130) * 0.9, Math.min(30, W * 0.075), PAPER, INK, W * 0.8);
    drawHud(0);
  }
}
function fitText(str, x, y, maxW, font, align) {
  ctx.font = font; ctx.textAlign = align || 'left';
  const m = ctx.measureText(str).width;
  if (m > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / m, 1); ctx.fillText(str, 0, 0); ctx.restore(); }
  else ctx.fillText(str, x, y);
}
function drawResult() {
  burst();
  if (!res) return;
  const vs = vsText(), n = res.rows.length, fixed = 18 + 24 + 12 + 12 + 128 + 14 + 70 + 8 + (vs ? 28 : 0) + 34 + 18 + 14;
  const top = 14, avail = Math.max(200, H - barH - top - 20);
  // 縦に収まらず小さくなりすぎるときは、各行の補足を省いて行を詰める
  const compact = avail / (fixed + n * 38) < 0.85, RH = compact ? 27 : 38, need = fixed + n * RH;
  const s = Math.min(1.15, avail / need, (W - 32) / 330);
  const cw = Math.min(420, (W - 32) / s);
  ctx.save(); ctx.translate(W / 2 - cw * s / 2, top); ctx.scale(s, s);
  rr(7, 7, cw, need, 6); ctx.fillStyle = INK; ctx.fill();
  rr(0, 0, cw, need, 6); ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  const L = 18, R = cw - 18;
  let y = 18;
  ctx.textBaseline = 'middle';
  ctx.font = `900 12px ${BODY}`;
  const tag = '本日のいたずら', tw = ctx.measureText(tag).width + 18;
  rr(L, y, tw, 24, 3); ctx.fillStyle = INK; ctx.fill();
  ctx.fillStyle = POP; ctx.textAlign = 'left'; ctx.fillText(tag, L + 9, y + 12.5);
  ctx.fillStyle = INK; fitText(CONF.title, R, y + 13, R - L - tw - 12, `17px ${DISPLAY}`, 'right');
  y += 24 + 12;
  res.rows.forEach((row, i) => {
    const a = calm ? 1 : clamp((rt - 0.3 - i * 0.09) / 0.12, 0, 1);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * 24, 0);
      if (compact) {
        ctx.fillStyle = INK; fitText(row.k, L, y + 12, (R - L) * 0.55, `900 15px ${BODY}`);
        fitText(row.v, R, y + 12, (R - L) * 0.4, `20px ${DISPLAY}`, 'right');
      } else {
        ctx.fillStyle = INK; fitText(row.k, L, y + 12, (R - L) * 0.55, `900 15px ${BODY}`);
        ctx.fillStyle = '#6b6178'; fitText(row.n, L, y + 28, (R - L) * 0.62, `700 11px ${BODY}`);
        ctx.fillStyle = INK; fitText(row.v, R, y + 18, (R - L) * 0.4, `21px ${DISPLAY}`, 'right');
      }
      ctx.restore();
    }
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(35,27,46,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L, y + RH - 2); ctx.lineTo(R, y + RH - 2); ctx.stroke(); ctx.restore();
    y += RH;
  });
  y += 12;
  const kb = calm ? 1 : clamp((rt - res.tb) / 0.6, 0, 1), ke = 1 - Math.pow(1 - kb, 3);
  rr(L - 4, y, R - L + 8, 128, 4); ctx.fillStyle = INK; ctx.fill();
  const lines = [
    ['後始末にかかる時間', fmtTime(res.sec * ke), PAPER, 22],
    ['損害額', Math.round(res.yen * ke).toLocaleString('ja-JP') + '円', PAPER, 22],
    ['怒られ度', Math.round(res.angry * ke) + '%', HOT, 30]
  ];
  lines.forEach(([k, v, c, fs], i) => {
    const ly = y + 24 + i * 38;
    ctx.fillStyle = POP; fitText(k, L + 8, ly, (R - L) * 0.5, `700 13px ${BODY}`);
    ctx.fillStyle = c; fitText(v, R - 8, ly, (R - L) * 0.5, `${fs}px ${DISPLAY}`, 'right');
  });
  y += 128 + 14;
  if (rt >= res.ts) {
    const e = calm ? 1 : clamp((rt - res.ts) / 0.15, 0, 1), sc = 2.2 - 1.2 * e;
    ctx.save(); ctx.globalAlpha = e; ctx.translate(cw / 2, y + 35); ctx.rotate(-0.07); ctx.scale(sc, sc);
    ctx.font = `26px ${DISPLAY}`;
    const word = '判定：' + res.word, ww = Math.min(cw - 70, ctx.measureText(word).width + 36);
    rr(-ww / 2, -30, ww, 60, 8); ctx.lineWidth = 5; ctx.strokeStyle = HOT; ctx.stroke();
    ctx.fillStyle = HOT; fitText(word, 0, 2, ww - 30, `26px ${DISPLAY}`, 'center');
    ctx.restore();
  }
  y += 70 + 8;
  if (vs) { // 挑戦状の結果
    if (rt >= res.ts) { ctx.fillStyle = INK; fitText(vs, cw / 2, y + 10, cw - 40, `900 16px ${BODY}`, 'center'); }
    y += 28;
  }
  ctx.fillStyle = '#6b6178'; ctx.font = `700 11px ${BODY}`; ctx.textAlign = 'center';
  ctx.fillText('時間と金額はざっくりした目安です。', cw / 2, y + 8);
  ctx.fillText('実際にやると本当に怒られます。', cw / 2, y + 25);
  y += 34;
  ctx.font = `700 12px ${BODY}`; ctx.fillStyle = INK; ctx.fillText(SITE.replace('https://', '').replace(/\/$/, ''), cw / 2, y + 10);
  // 図鑑に新しく登録されたものは、カードの下のほうにシールで貼る
  if (res.newZ.length && rt >= res.ts + 0.6) {
    const e = calm ? 1 : clamp((rt - res.ts - 0.6) / 0.15, 0, 1), sw = cw - 36, sh = 58;
    ctx.save(); ctx.globalAlpha = e; ctx.translate(cw / 2, need - 46); ctx.rotate(0.035); ctx.scale(1.6 - 0.6 * e, 1.6 - 0.6 * e);
    rr(-sw / 2 + 5, -sh / 2 + 5, sw, sh, 8); ctx.fillStyle = INK; ctx.fill();
    rr(-sw / 2, -sh / 2, sw, sh, 8); ctx.fillStyle = POP; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.textBaseline = 'middle';
    fitText('図鑑に登録！', 0, -12, sw - 24, `18px ${DISPLAY}`, 'center');
    const names = res.newZ.length > 3 ? res.newZ.slice(0, 3).join('・') + ' ほか' + (res.newZ.length - 3) + '個' : res.newZ.join('・');
    fitText('「' + names + '」', 0, 13, sw - 24, `900 13px ${BODY}`, 'center');
    ctx.restore();
  }
  ctx.restore();
}
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  update(dt); draw();
  if (rec && recCv) recCtx.drawImage(cv, 0, 0, recCv.width, recCv.height); // 録画用の小さいキャンバスへ写す
  recTick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 録画（オンのときだけ。映像はキャンバス、音は録画用の出力） ---------- */
const canRec = !!(cv.captureStream && window.MediaRecorder);
let recOn = false, rec = null, recBlob = null, recTok = 0, recErr = '', recNote = ''; // recNote: 動画の案内に付ける補足（無限モードで最後の何秒か）
try { recOn = canRec && localStorage.getItem('itazurush-rec') !== '0'; } catch (e) { recOn = canRec; } // はじめはオン。切り替えたら覚えておく
// 録画用のストリームは一度だけ作って使い回す（毎回作り直すと、端末によっては2回目以降が録れない）
// 容量を抑えるため、画面そのものではなく横 REC_W px の録画用キャンバスに縮小コピーしたものを録る
const REC_W = 720;
// 録画のコマ数。URL に ?recfps=15 などを付けると試せる（容量の比較用。8〜30）
const REC_FPS = (() => { try { const v = parseInt(new URLSearchParams(location.search).get("recfps"), 10); return v >= 8 && v <= 30 ? v : 24; } catch (e) { return 24; } })();
let recVideo = null, recAV = null, recCv = null, recCtx = null;
// 録画はブラウザの仕組み上、古い部分だけを後から捨てられない。そこで無限モードでは REC_STEP 秒ごとに録画をずらして足し、
// REC_MAX 秒より古くなった録画は捨てる。終わったら、残っているうちでいちばん古い録画を使う（＝最後の70〜140秒。X の無料ユーザーの上限に収まる）
// 周回モードは全体で約136秒なので、1本だけで全部録る
const REC_MAX = 140, REC_STEP = 70;
function recStream() { // 録画用のキャンバスとストリームを（まだなければ）作る
  if (!recVideo) {
    recCv = document.createElement('canvas');
    recCv.width = REC_W; recCv.height = Math.round(REC_W * H / Math.max(1, W) / 2) * 2; // 偶数にする（動画の形式の都合）
    recCtx = recCv.getContext('2d');
    recCtx.drawImage(cv, 0, 0, recCv.width, recCv.height);
    recVideo = recCv.captureStream(REC_FPS);
  }
  if (!recAV && recDest) recAV = new MediaStream(recVideo.getVideoTracks().concat(recDest.stream.getAudioTracks()));
}
function recNew(sess) { // 録画を1本始める
  const opt = sess.mime ? { mimeType: sess.mime, videoBitsPerSecond: 1.8e6, audioBitsPerSecond: 128000 } : undefined;
  let r = null;
  for (const c of [recAV, recVideo]) { // 音つきで始められなければ、映像だけで録る
    if (!c || r) continue;
    try { r = new MediaRecorder(c, opt); r.start(1000); } catch (e) { recErr = String(e && e.message || e); r = null; }
  }
  if (!r) return null;
  const part = { r, chunks: [], t0: sess.t, mime: r.mimeType || sess.mime };
  r.ondataavailable = e => { if (e.data && e.data.size) part.chunks.push(e.data); };
  r.onerror = e => { recErr = String(e && e.error && e.error.message || '録画エラー'); };
  sess.parts.push(part);
  return part;
}
function recStart() {
  recBlob = null; recTok++; recErr = ''; rec = null; recNote = '';
  if (!recOn || !canRec) return;
  const types = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const sess = { tok: recTok, t: 0, last: 0, parts: [], mime: '', multi: gameMode !== 'loop', paused: false };
  try { sess.mime = types.find(t => MediaRecorder.isTypeSupported(t)) || ''; } catch (e) {}
  try { recStream(); } catch (e) { recErr = String(e && e.message || e); }
  if (recNew(sess)) rec = sess;
}
function recTick(dt) { // 毎フレーム。録った時間を数え、無限モードでは録画をずらして足し、古くなったものを捨てる
  const ss = rec; if (!ss || ss.paused) return;
  ss.t += dt;
  if (!ss.multi) return;
  if (ss.t - ss.last >= REC_STEP) { ss.last = ss.t; recNew(ss); }
  while (ss.parts.length > 1 && ss.t - ss.parts[0].t0 > REC_MAX) { const p = ss.parts.shift(); try { p.r.stop(); } catch (e) {} }
}
function recStop() {
  const ss = rec; rec = null; if (!ss) return;
  const keep = ss.parts[0]; // 残っているうちでいちばん古い録画（最大 REC_MAX 秒）
  for (const p of ss.parts.slice(1)) { try { p.r.stop(); } catch (e) {} }
  if (!keep) return;
  const len = Math.round(ss.t - keep.t0);
  let done = false;
  const fin = () => {
    if (done || ss.tok !== recTok) return; done = true;
    if (!keep.chunks.length) { $('recHint').textContent = 'この端末では録画データを作れませんでした。' + (recErr ? '（' + recErr + '）' : ''); return; }
    recBlob = new Blob(keep.chunks, { type: (keep.mime || 'video/webm').split(';')[0] });
    $('saveVid').hidden = false;
    recNote = ss.multi && ss.t > REC_MAX ? '（無限モードなので、最後の' + len + '秒）' : '';
    $('recHint').textContent = '動画の準備ができました' + recNote + '。';
  };
  keep.r.onstop = fin;
  if (keep.r.state !== 'inactive') { try { keep.r.stop(); } catch (e) { fin(); } } else fin();
  setTimeout(fin, 2000); // 停止の通知が来ない端末向けの保険
}
function recCancel() {
  recTok++; recBlob = null;
  const ss = rec; rec = null;
  if (ss) for (const p of ss.parts) { try { p.r.stop(); } catch (e) {} }
}
function recPause(v) {
  const ss = rec; if (!ss) return;
  ss.paused = v;
  for (const p of ss.parts) { try { if (v && p.r.state === 'recording') p.r.pause(); else if (!v && p.r.state === 'paused') p.r.resume(); } catch (e) {} }
}

/* ---------- シェア・買い直し ---------- */
const AMAZON_TAG = '202610jokesite-22';
// 挑戦状：周回モードの結果だけ。開いた人に「この怒られ度を超えろ」と出す（無限モードは長く続けるほど増えるので比べない）
let challenge = null;
try { const v = parseInt(new URLSearchParams(location.search).get('vs'), 10); if (v >= 0 && v <= 999) challenge = v; } catch (e) {}
function vsText() {
  if (challenge == null || gameMode !== 'loop' || !res) return '';
  return res.angry > challenge ? '挑戦状の ' + challenge + '% を超えた！' : res.angry === challenge ? '挑戦状の ' + challenge + '% と引き分け' : '挑戦状の ' + challenge + '% に届かず…';
}
// c/段階.html は判定ごとのカード画像を持つ入口ページ（開くと本体へ転送される）
const challengeUrl = () => SITE + 'c/' + tierOf(res.angry) + '.html?vs=' + res.angry;
function shareText() {
  const head = CONF.title + 'で怒られ度 ' + res.angry + '%【' + res.word + '】\n損害額 ' + res.yen.toLocaleString('ja-JP') + '円／後始末 ' + fmtTime(res.sec);
  if (gameMode !== 'loop') return head + '（無限モード）\n' + CONF.tags + '\n' + SITE;
  const vs = vsText();
  return head + (vs ? '\n' + vs : '') + '\nこの記録、超えられる？\n' + CONF.tags + '\n' + challengeUrl();
}
function saveBlob(blob, name, text) {
  let file = null;
  const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  try { file = new File([blob], name, { type: blob.type }); } catch (e) {}
  if (coarse && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text }).catch(() => {}); return; }
  const a = document.createElement('a'), u = URL.createObjectURL(blob);
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
// 結果画面の帯に1行だけ出す紹介。損害が出たいたずらの買い直しか、判定に合わせた「謝るとき用」をランダムに
const PICK_SHOJI = 1 / 3; // 紹介の行で障子が選ばれる重み（ほかのいたずらに対して）
const APOLOGY = [
  ['バレる前に、こっそり片付けるコロコロ', 'コロコロ カーペットクリーナー'],
  ['正座10分に備えて、正座椅子', '正座椅子'],
  ['おやつ抜きの日のための、こっそりおやつ', 'お菓子 個包装 詰め合わせ'],
  ['家族会議の前に、お詫びの菓子折り', '菓子折り'],
  ['おこづかい停止のあいだに、貯金箱', '貯金箱'],
  ['伝説の謝罪には、高級な菓子折り', '菓子折り 高級']
];
function fillPick() {
  // 損害が出たいたずらの中から選ぶ。金額が大きいほど出やすいが、差がつきすぎないよう平方根で重みづけ。障子は損害が大きくなりがちなので重みを1/3に
  const cands = res.rows.filter(r => r.yen > 0 && r.shop).map(r => ({ r, w: Math.sqrt(r.yen) * (r.key === 'shoji' ? PICK_SHOJI : 1) }));
  let pick = null, roll = Math.random() * cands.reduce((a, c) => a + c.w, 0);
  for (const c of cands) { roll -= c.w; if (roll <= 0) { pick = c.r; break; } }
  let label, q;
  if (pick && Math.random() < 0.5) { label = pick.k + 'の後始末に、' + pick.shop[0][0] + 'を買い直す'; q = pick.shop[0][1]; }
  else [label, q] = APOLOGY[tierOf(res.angry)];
  $('pick').href = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(q) + '&tag=' + AMAZON_TAG;
  $('pickText').textContent = label; $('pick').hidden = false;
}
function fillShop() {
  const ul = $('shopList'); ul.textContent = '';
  const items = [];
  for (const s of BONUS ? NORMAL.concat(BONUS) : NORMAL) if (played.has(s.key) && s.shop) items.push(...s.shop);
  items.forEach(([label, q]) => {
    const li = document.createElement('li'), a = document.createElement('a'), sm = document.createElement('small');
    a.href = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(q) + '&tag=' + AMAZON_TAG;
    a.target = '_blank'; a.rel = 'sponsored noopener'; a.textContent = label; sm.textContent = 'Amazonで探す →';
    a.appendChild(sm); li.appendChild(a); ul.appendChild(li);
  });
  $('shopBtn').hidden = !items.length;
}

/* ---------- 入力 ---------- */
function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const live = () => mode === 'play' && !paused && st;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  if (!live()) return; const p = pos(e); st.down(e.pointerId, p[0], p[1]);
});
cv.addEventListener('pointermove', e => { if (!live()) return; const p = pos(e); st.move(e.pointerId, p[0], p[1]); });
const end = e => { if (st) st.up(e.pointerId); };
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
cv.addEventListener('contextmenu', e => e.preventDefault());

$('startBtn').addEventListener('click', () => startGame('loop'));
$('endlessBtn').addEventListener('click', () => startGame('endless'));
$('againBtn').addEventListener('click', () => startGame());
$('pauseBtn').addEventListener('click', () => setPause(true));
$('resumeBtn').addEventListener('click', () => { initAudio(); setPause(false); });
$('quitBtn').addEventListener('click', () => finish(false));
$('homeBtn').addEventListener('click', goTitle);
$('home2Btn').addEventListener('click', goTitle);
$('shopBtn').addEventListener('click', () => { panels.shop.hidden = false; });
$('zukanBtn').addEventListener('click', () => { panels.zukan.hidden = false; });
$('zukanClose').addEventListener('click', () => { panels.zukan.hidden = true; });
$('shopClose').addEventListener('click', () => { panels.shop.hidden = true; });
// 文をクリップボードにコピーして、hint の場所に結果を出す（X 以外の SNS に共有するため）
function copyText(text, hint) {
  const ok = () => { $(hint).textContent = '投稿文をコピーしました。好きなSNSに貼り付けてください。'; };
  const fallback = () => { // クリップボードの機能が使えないブラウザ向け
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let done = false; try { done = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    if (done) ok(); else $(hint).textContent = 'コピーできませんでした。';
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
}
// タイトル画面から共有するときの文（まだ結果がないので、サイトの紹介）
const introText = () => CONF.intro + '\n' + CONF.tags + '\n' + SITE;
$('copyPost').addEventListener('click', () => { if (res) copyText(shareText(), 'recHint'); });
$('titleCopy').addEventListener('click', () => copyText(introText(), 'titleHint'));
$('titleX').addEventListener('click', () => {
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(introText()), '_blank', 'noopener');
});
$('xpost').addEventListener('click', () => {
  if (!res) return;
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText()), '_blank', 'noopener'); // URLは本文に入っている
});
$('saveVid').addEventListener('click', () => {
  if (!recBlob || !res) return;
  saveBlob(recBlob, 'itazu-rush-' + res.yen + 'yen.' + (recBlob.type.indexOf('mp4') >= 0 ? 'mp4' : 'webm'), shareText());
  $('recHint').textContent = '動画を書き出しました' + recNote + '。';
  if (unlock(['movie']).length) $('recHint').textContent = '動画を書き出しました' + recNote + '。図鑑に「記念撮影」を登録しました。';
});
function setSound(v) {
  soundOn = v; $('soundChk').checked = v; $('soundChk2').checked = v;
  if (spk) spk.gain.value = v ? 1 : 0;
  try { localStorage.setItem('itazurush-sound', v ? '1' : '0'); } catch (e) {}
}
$('soundChk').addEventListener('change', e => setSound(e.target.checked));
$('soundChk2').addEventListener('change', e => setSound(e.target.checked));
$('recChk').addEventListener('change', e => {
  recOn = e.target.checked; if (recOn) initAudio(); // 録画前に音の準備を済ませておく
  try { localStorage.setItem('itazurush-rec', recOn ? '1' : '0'); } catch (err) {}
});
setSound(soundOn);
if (canRec) { $('recOpt').hidden = false; $('recNote').hidden = false; $('recChk').checked = recOn; }
$('chips').innerHTML = NORMAL.map(s => '<li>' + s.name + '</li>').join('') + (BONUS ? '<li class="secret">？？？</li>' : '');
$('startSub').textContent = RANDOM ? '全' + N + '種から' + TOTAL + '本' : '全' + N + '種を' + ROUNDS + '周';
renderZukan();
if (challenge != null) {
  $('challenge').textContent = '挑戦状が届いています。「はじめる」で、怒られ度 ' + challenge + '%（判定：' + verdict(challenge) + '）を超えてください。';
  $('challenge').hidden = false;
}
window.addEventListener('resize', () => { if (mode === 'result') measureBar(); });
// 案内の文が2行になるなどして帯の高さが変わったら、結果カードの大きさも合わせ直す
if (window.ResizeObserver) new ResizeObserver(() => { if (mode === 'result') measureBar(); }).observe($('resbar'));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
if (document.fonts && document.fonts.load) {
  const txt = NORMAL.concat(BONUS || []).map(s => s.prompt + s.name + (s.done || '')).join('') +
    'いたずら成功！がまんしたいい子だったおかわりボーナスレア出現本目判定：後始末にかかる時間損害額怒られ度円秒分時間%/0123456789.' + 'まだバレてない正座10分おやつ抜き家族会議おこづかい3か月停止伝説のいたずらっ子';
  document.fonts.load(`40px ${DISPLAY}`, txt).catch(() => {});
}
// 自動テスト用（URLの末尾が #test のときだけ）
if (location.hash === '#test') {
  window.__itazu = { get mode() { return mode; }, get st() { return st; }, get count() { return count; }, get res() { return res; }, get tot() { return tot; },
    // 新しく始めたゲームで、最初の n 本に出るステージのキー（遊ばずに順番だけ取り出す。今の状態は戻す）
    sampleOrder(n) {
      const keep = { count, order, prevNormal, forced };
      count = 0; order = []; prevNormal = null; forced = [];
      const keys = []; for (let i = 0; i < n; i++) keys.push(normalNext().key);
      ({ count, order, prevNormal, forced } = keep);
      return keys;
    },
    get rec() { return rec; }, get AC() { return AC; }, get bus() { return bus; }, get recBlob() { return recBlob; }, NORMAL, BONUS, music, force(keys) { forced = keys.slice(); }, set forceHap(v) { forceHap = v; }, finish, setPause, tierOf, ZUKAN, get zukan() { return zukan; } };
}

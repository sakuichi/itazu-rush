// 「いたずラッシュ大盛り！」（oomori/index.html）のテスト用の共通部品。ブラウザの起動や既存ステージの操作は helpers.js のものを使う
const path = require('path');
const fs = require('fs');
const { waitMode, mode, ACTS, sleep } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const OOMORI_FILE = path.join(ROOT, 'oomori', 'index.html');
const OOMORI_PAGE = fileUrl(OOMORI_FILE);
const OOMORI_DIR = fileUrl(path.join(ROOT, 'oomori')) + '/';
const OLD_PAGE = fileUrl(path.join(ROOT, 'index.html'));
const SITE = 'https://sakuichi.github.io/itazu-rush/';
const OOMORI_SITE = SITE + 'oomori/';

// 既存10種＋新規5種（この順で #chips に並ぶ）
const OLD_KEYS = ['tissue', 'toilet', 'shoji', 'paste', 'shampoo', 'mud', 'toys', 'puddle', 'hose', 'elev'];
const NEW_KEYS = ['graffiti', 'soda', 'pudding', 'sticker', 'shoe'];
const KEYS = OLD_KEYS.concat(NEW_KEYS);
const NEW_NAMES = { graffiti: '落書き', soda: '炭酸', pudding: 'プリン', sticker: 'シール', shoe: '靴飛ばし' };

// ページを開く（既存版の helpers.open と同じ形）。errors にはページ内のエラーがたまる
async function openPage(browser, url, { query = '', width = 390, height = 844 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url + query + '#test', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__itazu, { timeout: 10000 });
  return { page, errors, W: width, H: height };
}
async function openOomori(browser, opts) {
  if (!fs.existsSync(OOMORI_FILE)) throw new Error('大盛りのページがありません（未実装）: ' + OOMORI_FILE);
  return openPage(browser, OOMORI_PAGE, opts);
}
const openOld = (browser, opts) => openPage(browser, OLD_PAGE, opts);

// 新規5種の操作（人の指の動きをマウスでまねる）
const NEW_ACTS = {
  // 画面の中ほどを押したまま、ジグザグに自由になぞる
  async graffiti(p, W, H) {
    const m = p.mouse; await m.move(W * 0.15, H * 0.3); await m.down();
    for (let i = 0; i < 6; i++) { await m.move(W * 0.85, H * (0.32 + i * 0.07), { steps: 8 }); await m.move(W * 0.15, H * (0.35 + i * 0.07), { steps: 8 }); }
    await m.up();
  },
  // 押したまま上下に激しく振ってから離し、タップでフタを開けて、噴き出すのを待つ
  async soda(p, W, H) {
    const m = p.mouse; await m.move(W / 2, H * 0.55); await m.down();
    for (let i = 0; i < 8; i++) { await m.move(W / 2, H * 0.4, { steps: 3 }); await m.move(W / 2, H * 0.7, { steps: 3 }); }
    await m.up(); await sleep(100);
    await m.click(W / 2, H * 0.55);
    await sleep(1000);
  },
  // 下から上へすばやくスワイプして1口ずつすくう（3口で1個）
  async pudding(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 6; i++) { await m.move(W / 2, H * 0.75); await m.down(); await m.move(W / 2, H * 0.45, { steps: 3 }); await m.up(); await sleep(250); }
  },
  // 下のシートから上の家具までドラッグして貼る
  async sticker(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 5; i++) { await m.move(W / 2, H * 0.85); await m.down(); await m.move(W * (0.25 + i * 0.12), H * (0.3 + (i % 3) * 0.1), { steps: 6 }); await m.up(); await sleep(80); }
  },
  // 下中央から真上へすばやくフリックして、正面の家の屋根へ靴を3回飛ばす
  async shoe(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.8); await m.down(); await m.move(W / 2, H * 0.55, { steps: 2 }); await m.up(); await sleep(600); }
  }
};
const OACTS = Object.assign({}, ACTS, NEW_ACTS);

// 大盛りの無限モードで1ステージだけ遊ぶ。プレイ中の結果の文字列と、時間切れ時・次の画面直前の文字列を返す（helpers.playOne と同じ形）
async function playOneOomori(browser, key, opts = {}) {
  const g = await openOomori(browser, opts);
  const { page } = g;
  await page.evaluate(k => window.__itazu.force([k]), key);
  await page.click('#endlessBtn');
  await waitMode(page, 'play');
  await sleep(150);
  await (opts.act || OACTS[key])(page, g.W, g.H);
  const during = await page.evaluate(() => window.__itazu.st.result());
  await waitMode(page, 'flash', 15000);
  // 結果フラッシュのあいだ、毎フレームの値を記録する（時間切れのあとに増えていないか見るため）
  const flash = await page.evaluate(() => new Promise(res => {
    const vals = [];
    const tick = () => { const T = window.__itazu; if (T.mode === 'flash') { vals.push(T.st.result()); requestAnimationFrame(tick); } else res(vals); };
    tick();
  }));
  return { ...g, during, atFlash: flash[0], endFlash: flash[flash.length - 1] };
}

// 終わるまで遊ぶ。新しいステージが始まるたびに操作する
async function playThrough(page, W, H) {
  const seen = new Set();
  for (;;) {
    const m = await mode(page);
    if (m === 'result') return;
    if (m === 'play') {
      const tag = await page.evaluate(() => window.__itazu.count + '-' + window.__itazu.st.key);
      if (!seen.has(tag)) { seen.add(tag); const key = tag.split('-')[1]; if (OACTS[key]) await OACTS[key](page, W, H); }
    }
    await sleep(100);
  }
}
// 録画できた動画の長さ（秒）と大きさ
const videoInfo = page => page.evaluate(async () => {
  const b = window.__itazu.recBlob; if (!b) return null;
  const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(b);
  await new Promise(r => { v.onloadedmetadata = r; });
  if (v.duration === Infinity) { v.currentTime = 1e9; await new Promise(r => { v.ontimeupdate = r; }); }
  return { size: b.size, duration: v.duration, width: v.videoWidth };
});
const waitVideo = page => page.waitForFunction(() => !!window.__itazu.recBlob, { timeout: 20000, polling: 100 });

module.exports = {
  ROOT, OOMORI_PAGE, OOMORI_DIR, OLD_PAGE, SITE, OOMORI_SITE, OLD_KEYS, NEW_KEYS, KEYS, NEW_NAMES,
  openOomori, openOld, NEW_ACTS, OACTS, playOneOomori, playThrough, videoInfo, waitVideo
};

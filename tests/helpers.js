// テスト用の共通部品。インストール済みの Edge（なければ Chrome）をヘッドレスで動かして index.html を操作する
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BROWSER = process.env.BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
].find(p => fs.existsSync(p));
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
// npm run test:full のときだけ、時間のかかるテスト（周回モードを最後まで、など）も動かす
const FULL = process.env.npm_lifecycle_event === 'test:full' || process.env.FULL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch() {
  if (!BROWSER) throw new Error('Edge か Chrome が見つかりません。環境変数 BROWSER_PATH で場所を指定してください。');
  return puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
}

// ゲームを開く。errors にはページ内のエラーがたまる
async function open(browser, { query = '', width = 390, height = 844 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(PAGE + query + '#test', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__itazu);
  return { page, errors, W: width, H: height };
}

const mode = page => page.evaluate(() => window.__itazu.mode);
async function waitMode(page, m, timeout = 15000) {
  await page.waitForFunction(x => window.__itazu.mode === x, { timeout, polling: 20 }, m);
}
// クリップボードと window.open を差し替えて、中身を取り出せるようにする
async function captureShare(page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } }, configurable: true });
    window.open = u => { window.__opened = u; return null; };
  });
}
// 中断から「ここでやめて結果を見る」
async function quit(page) {
  await page.click('#pauseBtn');
  await page.waitForSelector('#quitBtn', { visible: true });
  await page.click('#quitBtn');
  await waitMode(page, 'result');
}

// ステージごとの操作（人の指の動きをマウスでまねる）
const ACTS = {
  async tissue(p, W, H) { const m = p.mouse; await m.move(W / 2 - 80, H * 0.45); await m.down(); for (let i = 0; i < 8; i++) { await m.move(W / 2 + 80, H * 0.45, { steps: 3 }); await m.move(W / 2 - 80, H * 0.45, { steps: 3 }); } await m.up(); },
  async toilet(p, W, H) { const m = p.mouse; for (let i = 0; i < 4; i++) { await m.move(W / 2, H * 0.3); await m.down(); await m.move(W / 2, H * 0.8, { steps: 4 }); await m.up(); } },
  async shoji(p, W, H) { const m = p.mouse; await m.move(60, 200); await m.down(); for (let y = 200; y < 700; y += 40) await m.move(y % 80 ? W - 60 : 60, y, { steps: 4 }); await m.up(); },
  async paste(p, W, H) { const m = p.mouse; for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.2); await m.down(); for (let k = 0; k < 15; k++) { await m.move(W / 2, H * 0.2 + k * 10); await sleep(40); } await m.up(); } },
  async shampoo(p, W, H) { for (let i = 0; i < 15; i++) { await p.mouse.click(W * 0.4, H * 0.6); await sleep(40); } },
  async mud(p, W, H) { const m = p.mouse; await m.move(60, 300); await m.down(); for (let i = 0; i < 4; i++) { await m.move(W - 60, 330 + i * 60, { steps: 10 }); await m.move(60, 360 + i * 60, { steps: 10 }); } await m.up(); },
  async toys(p, W, H) { const m = p.mouse; for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.7); await m.down(); await m.move(W / 2, H * 0.45, { steps: 3 }); await m.up(); await sleep(500); } },
  async puddle(p, W, H) { const m = p.mouse; for (const hold of [300, 300]) { await m.move(W / 2, H / 2); await m.down(); await sleep(hold); await m.up(); await sleep(450); } },
  async hose(p, W, H) { const m = p.mouse, cx = W / 2, cy = H * 0.8, r = 70; await m.move(cx + r, cy); await m.down(); for (let a = 0; a < Math.PI * 2 * 3; a += 0.3) await m.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r); await m.up(); },
  async elev(p) { const g = await p.evaluate(() => window.__itazu.st.buttons()); for (const b of g.slice(0, 6)) { await p.mouse.click(b[0], b[1]); await sleep(30); } },
  async nopush(p, W, H) { for (let i = 0; i < 10; i++) { await p.mouse.click(W / 2, H * 0.5); await sleep(40); } }
};

// 無限モードで1ステージだけ遊ぶ。opts.hap でハプニングを必ず起こす。プレイ中の結果の文字列と、時間切れ時・次の画面直前の文字列を返す
async function playOne(browser, key, opts = {}) {
  const g = await open(browser, opts);
  const { page } = g;
  await page.evaluate((k, hap) => { window.__itazu.force([k]); if (hap) window.__itazu.forceHap = true; }, key, !!opts.hap);
  await page.click('#endlessBtn');
  await waitMode(page, 'play');
  await sleep(150);
  if (opts.before) await opts.before(page, g);
  await (opts.act || ACTS[key])(page, g.W, g.H);
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

const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

module.exports = { launch, open, waitMode, mode, quit, captureShare, playOne, ACTS, sleep, num, FULL };

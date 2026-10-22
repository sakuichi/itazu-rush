// 録画。短いものは毎回、長いもの（周回モードを最後まで・無限モードで140秒超え）は npm run test:full のときだけ
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, open, waitMode, mode, quit, ACTS, sleep, FULL } = require('./helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 録画できた動画の長さ（秒）と大きさ
const videoInfo = page => page.evaluate(async () => {
  const b = window.__itazu.recBlob; if (!b) return null;
  const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(b);
  await new Promise(r => { v.onloadedmetadata = r; });
  if (v.duration === Infinity) { v.currentTime = 1e9; await new Promise(r => { v.ontimeupdate = r; }); }
  return { size: b.size, duration: v.duration, width: v.videoWidth };
});
const waitVideo = page => page.waitForFunction(() => !!window.__itazu.recBlob, { timeout: 20000, polling: 100 });

// 終わるまで遊ぶ。新しいステージが始まるたびに操作する
async function playThrough(page, W, H, until) {
  const seen = new Set();
  for (;;) {
    const m = await mode(page);
    if (m === 'result' || (until && await until())) return;
    if (m === 'play') {
      const tag = await page.evaluate(() => window.__itazu.count + '-' + window.__itazu.st.key);
      if (!seen.has(tag)) { seen.add(tag); const key = tag.split('-')[1]; if (ACTS[key]) await ACTS[key](page, W, H); }
    }
    await sleep(100);
  }
}

test('短く遊んでやめても、動画ができて「動画を保存」が出る', async () => {
  const g = await open(browser);
  const { page } = g;
  await page.evaluate(() => window.__itazu.force(['tissue']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  await ACTS.tissue(page, g.W, g.H);
  await quit(page);
  await waitVideo(page);
  const v = await videoInfo(page);
  assert.ok(v.size > 0);
  assert.equal(v.width, 720);
  assert.equal(await page.$eval('#saveVid', e => e.hidden), false);
  assert.equal(await page.$eval('#recHint', e => e.textContent), '動画の準備ができました。');
});

test('周回モードを最後まで遊ぶと、録画は140秒以内に収まり、図鑑「やり切った」が登録される', { skip: !FULL && 'npm run test:full のときだけ（約3分）' }, async () => {
  const g = await open(browser);
  await g.page.click('#startBtn');
  await playThrough(g.page, g.W, g.H);
  await waitVideo(g.page);
  const v = await videoInfo(g.page);
  assert.ok(v.duration <= 140, `${v.duration.toFixed(1)}秒`);
  const res = await g.page.evaluate(() => window.__itazu.res);
  assert.ok(res.newZ.includes('やり切った'), JSON.stringify(res.newZ));
});

test('無限モードで140秒を超えて遊ぶと、最後の70〜140秒だけが残る', { skip: !FULL && 'npm run test:full のときだけ（約3分）' }, async () => {
  const g = await open(browser);
  await g.page.click('#endlessBtn');
  const t0 = Date.now();
  await playThrough(g.page, g.W, g.H, async () => Date.now() - t0 > 165000);
  await quit(g.page);
  await waitVideo(g.page);
  const v = await videoInfo(g.page);
  assert.ok(v.duration >= 65 && v.duration <= 141, `${v.duration.toFixed(1)}秒`);
  assert.match(await g.page.$eval('#recHint', e => e.textContent), /^動画の準備ができました（無限モードなので、最後の\d+秒）。$/);
});

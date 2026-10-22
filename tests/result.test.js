// 結果画面・挑戦状・共有・図鑑
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, open, waitMode, quit, captureShare, ACTS, sleep } = require('./helpers');

const SITE = 'https://sakuichi.github.io/itazu-rush/';
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 指定のモードで1ステージ遊んでから、中断して結果を見る
async function playAndQuit(key, gameMode, query = '') {
  const g = await open(browser, { query });
  const { page } = g;
  await captureShare(page);
  await page.evaluate(k => window.__itazu.force([k]), key);
  await page.click(gameMode === 'loop' ? '#startBtn' : '#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  await ACTS[key](page, g.W, g.H);
  await waitMode(page, 'prompt', 15000); // 次のステージのお題まで進めて、成果を確定させる
  await quit(page);
  await sleep(300);
  return g;
}

test('無限モードの結果：遊んだステージの行、紹介の行（PR・トラッキングID）、Xでポスト、コピーの文', async () => {
  const { page, errors } = await playAndQuit('tissue', 'endless');
  const res = await page.evaluate(() => window.__itazu.res);
  assert.deepEqual(res.rows.map(r => r.k), ['ティッシュ']);
  assert.equal(await page.$eval('#pick', e => e.hidden), false);
  assert.match(await page.$eval('#pick', e => e.href), /^https:\/\/www\.amazon\.co\.jp\/s\?k=.+&tag=202610jokesite-22$/);
  assert.equal(await page.$eval('#pick', e => e.rel), 'sponsored noopener');
  assert.equal(await page.$eval('#xpost', e => e.textContent), 'Xでポスト');
  await page.click('#copyPost');
  const copied = await page.evaluate(() => window.__copied);
  assert.match(copied, /^いたずラッシュで怒られ度 \d+%【.+】/);
  assert.ok(copied.includes('（無限モード）'));
  assert.ok(copied.endsWith(SITE), '無限モードは挑戦状なしのURL');
  assert.equal(await page.$eval('#recHint', e => e.textContent.startsWith('投稿文をコピーしました')), true);
  await page.click('#xpost');
  assert.equal(decodeURIComponent((await page.evaluate(() => window.__opened)).split('text=')[1]), copied, 'Xとコピーは同じ文');
  assert.deepEqual(errors, []);
});

test('挑戦状：?vs= で開くと案内が出て、周回モードの結果に勝ち負けと挑戦状のURLが入る', async () => {
  const { page } = await playAndQuit('tissue', 'loop', '?vs=5');
  // 案内（タイトル画面）
  const banner = await page.$eval('#challenge', e => e.textContent);
  assert.ok(banner.includes('怒られ度 5%'), banner);
  assert.equal(await page.$eval('#xpost', e => e.textContent), 'Xで挑戦状');
  const res = await page.evaluate(() => window.__itazu.res);
  await page.click('#copyPost');
  const copied = await page.evaluate(() => window.__copied);
  const tier = await page.evaluate(a => window.__itazu.tierOf(a), res.angry);
  assert.ok(copied.includes('この記録、超えられる？'));
  assert.ok(copied.endsWith(`${SITE}c/${tier}.html?vs=${res.angry}`), copied);
  const vs = res.angry > 5 ? '挑戦状の 5% を超えた！' : res.angry === 5 ? '挑戦状の 5% と引き分け' : '挑戦状の 5% に届かず…';
  assert.ok(copied.includes(vs), copied);
});

test('タイトル画面のXで共有・コピー：サイトの紹介文とURL（インストール不要）', async () => {
  const { page } = await open(browser);
  await captureShare(page);
  await page.click('#titleCopy');
  const copied = await page.evaluate(() => window.__copied);
  assert.ok(copied.includes('インストール不要'));
  assert.ok(copied.includes('#いたずラッシュ'));
  assert.ok(copied.endsWith(SITE));
  assert.ok((await page.$eval('#titleHint', e => e.textContent)).startsWith('投稿文をコピーしました'));
  await page.click('#titleX');
  assert.equal(decodeURIComponent((await page.evaluate(() => window.__opened)).split('text=')[1]), copied);
});

test('図鑑：全部のボタンを押すと「各階停止」が登録され、開き直しても残っている', async () => {
  const g = await open(browser);
  const { page } = g;
  await page.evaluate(() => window.__itazu.force(['elev']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  const bs = await page.evaluate(() => window.__itazu.st.buttons());
  for (const b of bs) await page.mouse.click(b[0], b[1]);
  await waitMode(page, 'prompt', 15000);
  await quit(page);
  const res = await page.evaluate(() => window.__itazu.res);
  assert.ok(res.newZ.includes('各階停止'), JSON.stringify(res.newZ));
  await page.reload(); await page.waitForFunction(() => !!window.__itazu);
  const z = await page.evaluate(() => window.__itazu.zukan);
  assert.ok(z.elev, '端末に保存されていない');
  assert.match(await page.$eval('#zukanCount', e => e.textContent), /^[1-9]\d*\/30$/);
});

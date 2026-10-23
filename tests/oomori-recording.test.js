// いたずラッシュ大盛り！の録画。周回モード（20本＋押すなボタン）を最後まで遊ぶので、npm run test:full のときだけ
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, FULL } = require('./helpers');
const { openOomori, playThrough, videoInfo, waitVideo } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('大盛りの周回モード（20本＋押すなボタン）を最後まで遊ぶと、録画は140秒以内に収まる', { skip: !FULL && 'npm run test:full のときだけ（約3分）' }, async () => {
  const g = await openOomori(browser);
  await g.page.click('#startBtn');
  await playThrough(g.page, g.W, g.H);
  const r = await g.page.evaluate(() => ({ count: window.__itazu.count, keys: window.__itazu.res.rows.map(x => x.key) }));
  assert.equal(r.count, 20, '20本で終わっていない');
  assert.ok(r.keys.includes('nopush'), `最後に押すなボタンが出ていない（${r.keys.join(',')}）`);
  await waitVideo(g.page);
  const v = await videoInfo(g.page);
  assert.ok(v.duration <= 140, `${v.duration.toFixed(1)}秒`);
});

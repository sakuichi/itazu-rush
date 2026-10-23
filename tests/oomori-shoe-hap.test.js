// いたずラッシュ大盛り！の靴飛ばしのハプニング：イヌが飛び出してきて、頭の上を通る靴をキャッチする
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, sleep } = require('./helpers');
const { openOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('靴飛ばしのハプニング：イヌが出てきて靴をキャッチし、犬小屋と同じく買い直しになり、図鑑に「ナイスキャッチ」が登録される', async () => {
  const g = await openOomori(browser);
  const { page, errors, W, H } = g;
  await page.evaluate(() => { window.__itazu.forceHap = true; window.__itazu.force(['shoe']); });
  await page.click('#endlessBtn');
  await waitMode(page, 'play');
  await page.waitForFunction(() => !!window.__itazu.st.dog, { timeout: 4000, polling: 20 }); // 1〜2.2秒で出てくる
  // イヌの少し先をねらって、イヌの頭の上を靴が通るようにはじく（3回まで）
  for (let i = 0; i < 3 && !(await page.evaluate(() => window.__itazu.st.dogCatch)); i++) {
    await page.waitForFunction(() => { const d = window.__itazu.st.dog; return d.hold <= 0 && d.x > innerWidth * 0.25 && d.x < innerWidth * 0.75; }, { polling: 20 });
    const { x, vx, by, dogY } = await page.evaluate(() => { const st = window.__itazu.st, gg = st.geo(); return { x: st.dog.x, vx: st.dog.vx, by: gg.by, dogY: gg.dogY }; });
    const slope = (x + vx * 0.12 - W / 2) / (by - dogY), dy = H * 0.25, m = page.mouse;
    await m.move(W / 2, H * 0.8); await m.down(); await m.move(W / 2 + dy * slope, H * 0.8 - dy, { steps: 2 }); await m.up();
    await sleep(400);
  }
  assert.ok(await page.evaluate(() => window.__itazu.st.dogCatch) >= 1, 'イヌが靴をキャッチしなかった');
  const during = await page.evaluate(() => window.__itazu.st.result());
  assert.match(during, /^[1-9]\d*個$/);
  await waitMode(page, 'prompt', 15000);
  await quit(page);
  const res = await page.evaluate(() => window.__itazu.res);
  const row = res.rows.find(r => r.key === 'shoe');
  assert.match(row.n, /犬小屋/);
  assert.ok(row.yen > 0, `損害額 ${row.yen}`);
  assert.ok(res.newZ.includes('ナイスキャッチ'), `図鑑: ${res.newZ.join(',')}`);
  assert.deepEqual(errors, []);
});

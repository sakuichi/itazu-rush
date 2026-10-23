// いたずラッシュ大盛り！の靴飛ばし：はじく向きで、屋根・犬小屋・木のどこに引っかかるかが決まる
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, sleep } = require('./helpers');
const { openOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 下中央から上へすばやくはじく。slope は横に動かす量 ÷ 上に動かす量（0 で真上、マイナスで左）
async function kick(page, W, H, slope) {
  const m = page.mouse, dy = H * 0.25;
  await m.move(W / 2, H * 0.8); await m.down(); await m.move(W / 2 + dy * slope, H * 0.8 - dy, { steps: 2 }); await m.up();
  await sleep(600);
}
async function playShoe(slopes) {
  const g = await openOomori(browser);
  const { page, errors } = g;
  await page.evaluate(() => window.__itazu.force(['shoe']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  for (const s of slopes) await kick(page, g.W, g.H, s);
  const during = await page.evaluate(() => window.__itazu.st.result());
  await waitMode(page, 'prompt', 15000); // 次のステージのお題まで進めて、成果を確定させる
  await quit(page);
  const res = await page.evaluate(() => window.__itazu.res);
  return { during, res, errors };
}

test('靴飛ばし：真上にはじくと屋根に乗り、1個と数える。屋根だけなら損害は0円で、後始末の時間がかかる', async () => {
  const r = await playShoe([0]);
  assert.equal(r.during, '1個');
  const row = r.res.rows[0];
  assert.equal(row.key, 'shoe');
  assert.match(row.n, /屋根/);
  assert.equal(row.yen, 0);
  assert.ok(r.res.sec > 0, `後始末の時間 ${r.res.sec}`); // 遊んだのは靴飛ばしだけなので、合計が靴飛ばしの分
  assert.deepEqual(r.errors, []);
});

test('靴飛ばし：左へはじくと犬小屋に入り、靴の買い直しで損害が出る', async () => {
  const r = await playShoe([-0.45]);
  assert.equal(r.during, '1個');
  const row = r.res.rows[0];
  assert.match(row.n, /犬小屋/);
  assert.ok(row.yen > 0, `損害額 ${row.yen}`);
  assert.deepEqual(r.errors, []);
});

test('靴飛ばし：右へはじくと木に引っかかる', async () => {
  const r = await playShoe([0.35]);
  assert.equal(r.during, '1個');
  assert.match(r.res.rows[0].n, /木/);
  assert.deepEqual(r.errors, []);
});

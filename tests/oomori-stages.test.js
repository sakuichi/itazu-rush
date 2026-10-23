// いたずラッシュ大盛り！の新規5種：操作に反応し、時間切れのあとに数字が増えないこと。結果の行と損害額
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, num, sleep } = require('./helpers');
const { NEW_KEYS, NEW_NAMES, NEW_ACTS, openOomori, playOneOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 表示の形（落書きは小数1けたの m、炭酸は整数の mL、ほかは整数の個・枚）
const UNIT = { graffiti: /^\d+\.\dm$/, soda: /^\d+mL$/, pudding: /^\d+個$/, sticker: /^\d+枚$/, shoe: /^\d+個$/ };

for (const key of NEW_KEYS) {
  test(`${key}（${NEW_NAMES[key]}）：操作すると数字が増え、時間切れのあとは増えない`, async () => {
    const r = await playOneOomori(browser, key);
    assert.match(r.during, UNIT[key]);
    assert.ok(num(r.during) > 0, `操作に反応しない（${r.during}）`);
    assert.equal(r.endFlash, r.atFlash, `時間切れのあとに増えた（${r.atFlash} → ${r.endFlash}）`);
    assert.deepEqual(r.errors, []);
  });
}

// 炭酸・プリンは1つでも損害が出る。落書き・シールは段階制、靴飛ばしは屋根なら0円（犬小屋で損害が出るのは oomori-shoe.test.js）
const MUST_COST = ['soda', 'pudding'];
for (const key of NEW_KEYS) {
  test(`${key}（${NEW_NAMES[key]}）：結果に行が出て、損害額が${MUST_COST.includes(key) ? '0円より大きい' : '数字で出る'}`, async () => {
    const g = await openOomori(browser);
    const { page, errors } = g;
    await page.evaluate(k => window.__itazu.force([k]), key);
    await page.click('#endlessBtn');
    await waitMode(page, 'play'); await sleep(150);
    await NEW_ACTS[key](page, g.W, g.H);
    await waitMode(page, 'prompt', 15000); // 次のステージのお題まで進めて、成果を確定させる
    await quit(page);
    const res = await page.evaluate(() => window.__itazu.res);
    assert.deepEqual(res.rows.map(r => r.key), [key]);
    const row = res.rows[0];
    assert.equal(row.k, NEW_NAMES[key]);
    assert.ok(Number.isFinite(row.yen) && row.yen >= 0, `損害額 ${row.yen}`);
    if (MUST_COST.includes(key)) assert.ok(row.yen > 0, `損害額 ${row.yen}`);
    assert.equal(res.yen, Math.round(row.yen));
    assert.deepEqual(errors, []);
  });
}

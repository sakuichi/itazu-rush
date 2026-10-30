// いたずラッシュ大盛り！の新規5種：操作に反応し、時間切れのあとに数字が増えないこと。結果の行と損害額
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, num, sleep } = require('./helpers');
const { NEW_KEYS, NEW_NAMES, NEW_ACTS, openOomori, playOneOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 表示の形（落書きは小数1けたの m、炭酸は整数の mL、枕は「羽根○枚」、毛糸玉は10m未満なら小数1けたの m、ほかは整数）
const UNIT = { graffiti: /^\d+\.\dm$/, soda: /^\d+mL$/, pudding: /^\d+個$/, sticker: /^\d+枚$/, shoe: /^\d+個$/, calendar: /^\d+日$/, vacuum: /^\d+個$/, futon: /^\d+回$/, news: /^\d+本$/, bubble: /^\d+個$/, piano: /^\d+音$/, pillow: /^羽根\d+枚$/, sofa: /^\d+cm$/, light: /^\d+回$/, yarn: /^(\d\.\d|\d{2,})m$/, closet: /^\d+枚$/, roll: /^\d+回$/, balloon: /^\d+個$/, clock: /^\d+時間$/, hanko: /^\d+個$/, gift: /^\d+箱$/, cake: /^\d+個$/, bath: /^\d+個$/, peel: /^\d+枚$/, laces: /^\d+個$/, umbrella: /^\d+本$/, keyboard: /^\d+個$/, tabletop: /^\d+個$/, cards: /^\d+枚$/, glue: /^\d+本$/, chair: /^\d+回$/, hashi: /^\d+膳$/, aircon: /^\d+℃$/, ice: /^\d+個$/, lids: /^\d+回$/ };

for (const key of NEW_KEYS) {
  test(`${key}（${NEW_NAMES[key]}）：操作すると数字が増え、時間切れのあとは増えない`, async () => {
    const r = await playOneOomori(browser, key);
    assert.match(r.during, UNIT[key]);
    assert.ok(num(r.during) > 0, `操作に反応しない（${r.during}）`);
    assert.equal(r.endFlash, r.atFlash, `時間切れのあとに増えた（${r.atFlash} → ${r.endFlash}）`);
    assert.deepEqual(r.errors, []);
  });
}

// 炭酸・プリン・新聞・シャボン玉は1つでも損害が出る。落書き・シール・カレンダー・掃除機・布団と第3弾・第4弾・第5弾・第6弾・第7弾の5種は段階制、靴飛ばしは屋根なら0円（犬小屋で損害が出るのは oomori-shoe.test.js、第3弾の境目は oomori-extra3.test.js、第4弾は oomori-extra4.test.js、第5弾は oomori-extra5.test.js、第6弾は oomori-extra6.test.js、第7弾は oomori-extra7.test.js）
const MUST_COST = ['soda', 'pudding', 'news', 'bubble'];
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

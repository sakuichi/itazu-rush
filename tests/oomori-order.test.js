// いたずラッシュ大盛り！：ランダム20本に、全種類が必ず1回は入ること（2026-10-23 の仕様変更）
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch } = require('./helpers');
const { KEYS, openOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('ランダム20本：1回のゲームの20本に、全20種が必ず1回は入る（50回取り出して確かめる）', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 50 }, () => window.__itazu.sampleOrder(20)));
  orders.forEach((o, i) => {
    const missing = KEYS.filter(k => !o.includes(k));
    assert.deepEqual(missing, [], `${i}回目に出ないステージがある（${o.join(',')}）`);
  });
});

test('無限モード：20本ごとに全種類が入り、20本の切れ目でも同じステージが続かない', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 20 }, () => window.__itazu.sampleOrder(60)));
  orders.forEach((o, i) => {
    for (let b = 0; b < 60; b += 20) {
      const block = o.slice(b, b + 20);
      assert.deepEqual(KEYS.filter(k => !block.includes(k)), [], `${i}回目の${b + 1}〜${b + 20}本目（${block.join(',')}）`);
      const cnt = {}; for (const k of block) cnt[k] = (cnt[k] || 0) + 1;
      for (const [k, n] of Object.entries(cnt)) assert.ok(n <= 2, `${i}回目の${b + 1}〜${b + 20}本目に ${k} が${n}回`);
    }
    for (let j = 1; j < o.length; j++) assert.notEqual(o[j], o[j - 1], `${i}回目の${j}本目と${j + 1}本目が同じ（${o.join(',')}）`);
  });
});

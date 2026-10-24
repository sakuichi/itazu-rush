// いたずラッシュ大盛り！：ランダム20本の選び方（2026-10-23 の仕様変更。種類が20を超えたら、かぶらない20種）
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch } = require('./helpers');
const { KEYS, openOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('ランダム20本：全25種なので、1回のゲームの20本は全部ちがう種類で、何回か取り出すと全25種が出る（50回取り出して確かめる）', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 50 }, () => window.__itazu.sampleOrder(20)));
  const seen = new Set();
  orders.forEach((o, i) => {
    assert.equal(o.length, 20, `${i}回目の本数`);
    assert.equal(new Set(o).size, 20, `${i}回目に同じ種類が2回出た（${o.join(',')}）`);
    for (const k of o) seen.add(k);
  });
  assert.deepEqual(KEYS.filter(k => !seen.has(k)), [], '50回のうちに一度も出ない種類がある');
});

test('無限モード：20本ごとに全部ちがう種類が入り、20本の切れ目でも同じステージが続かない', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 20 }, () => window.__itazu.sampleOrder(60)));
  orders.forEach((o, i) => {
    for (let b = 0; b < 60; b += 20) {
      const block = o.slice(b, b + 20);
      assert.equal(new Set(block).size, 20, `${i}回目の${b + 1}〜${b + 20}本目に同じ種類が2回出た（${block.join(',')}）`);
      for (const k of block) assert.ok(KEYS.includes(k), `知らないキー ${k}`);
    }
    for (let j = 1; j < o.length; j++) assert.notEqual(o[j], o[j - 1], `${i}回目の${j}本目と${j + 1}本目が同じ（${o.join(',')}）`);
  });
});

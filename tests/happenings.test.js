// ハプニング（forceHap で必ず起こして確かめる）。ステージが終わると tot に記録される
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, playOne, sleep } = require('./helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const tot = page => page.evaluate(() => window.__itazu.tot);

test('トイレットペーパー：ロールが転がって、一気に20m以上のびる', async () => {
  const r = await playOne(browser, 'toilet', { hap: true });
  const t = await tot(r.page);
  assert.equal(t.hapRoll, 1);
  assert.ok(t.tp / 400 >= 20, `${(t.tp / 400).toFixed(1)}m`);
});

test('障子：ネコが参戦して、自分で破った分より穴が多くなる', async () => {
  const r = await playOne(browser, 'shoji', { hap: true, act: async () => { await sleep(3500); } }); // 自分では破らない
  const t = await tot(r.page);
  assert.equal(t.hapCat, 1);
  assert.ok(t.holes >= 10, `${t.holes}穴`);
});

test('泥んこ足：イヌがついてきて、操作しなくても歩数が増える', async () => {
  const r = await playOne(browser, 'mud', { hap: true, act: async () => { await sleep(2500); } });
  const t = await tot(r.page);
  assert.equal(t.hapDog, 1);
  assert.ok(t.mud >= 20, `${t.mud}歩`);
});

test('おもちゃ箱：へそくりが出て、損害額から5,000円引かれる', async () => {
  const r = await playOne(browser, 'toys', { hap: true, act: async () => { await sleep(3500); } });
  const t = await tot(r.page);
  assert.equal(t.money, 1);
  const bill = await r.page.evaluate(() => window.__itazu.NORMAL.find(s => s.key === 'toys').bill({ toys: 0, lost: 0, money: 1 }));
  assert.equal(bill.yen, -5000);
});

test('水たまり：起きる回は、そのあとのジャンプでとなりの車に泥がかかり、洗車代がつく', async () => {
  const r = await playOne(browser, 'puddle', {
    hap: true,
    act: async (p, W, H) => { await sleep(2400); await p.mouse.move(W / 2, H / 2); await p.mouse.down(); await sleep(300); await p.mouse.up(); }
  });
  const t = await tot(r.page);
  assert.equal(t.hapCar, 1);
  assert.equal(t.carWash, 1);
});

test('エレベーター：故障する回は、全部押した瞬間に故障して、それ以上押せない', async () => {
  const r = await playOne(browser, 'elev', {
    hap: true,
    act: async p => {
      const bs = await p.evaluate(() => window.__itazu.st.buttons());
      for (const b of bs) await p.mouse.click(b[0], b[1]);
      await sleep(400);
      const n = await p.evaluate(() => window.__itazu.st.n);
      await p.mouse.click(bs[0][0], bs[0][1]);
      assert.equal(await p.evaluate(() => window.__itazu.st.n), n, '故障のあとに押せてしまう');
    }
  });
  const t = await tot(r.page);
  assert.equal(t.broke, 1);
  assert.equal(t.elev, 24);
});

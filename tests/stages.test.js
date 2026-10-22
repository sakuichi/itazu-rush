// 全ステージが操作に反応し、時間切れのあとに数字が増えないこと
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, open, playOne, num, sleep } = require('./helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const KEYS = ['tissue', 'toilet', 'shoji', 'paste', 'shampoo', 'mud', 'toys', 'puddle', 'hose', 'elev'];
for (const key of KEYS) {
  test(`${key}：操作すると数字が増え、時間切れのあとは増えない`, async () => {
    const r = await playOne(browser, key);
    assert.ok(num(r.during) > 0, `操作に反応しない（${r.during}）`);
    assert.equal(r.endFlash, r.atFlash, `時間切れのあとに増えた（${r.atFlash} → ${r.endFlash}）`);
    assert.deepEqual(r.errors, []);
  });
}

test('障子：押さずにマウスを動かしただけでは破れない', async () => {
  const { page } = await open(browser);
  await page.evaluate(() => window.__itazu.force(['shoji']));
  await page.click('#endlessBtn');
  await page.waitForFunction(() => window.__itazu.mode === 'play', { polling: 20 });
  for (let y = 200; y < 700; y += 40) await page.mouse.move(y % 80 ? 330 : 60, y, { steps: 4 });
  assert.equal(await page.evaluate(() => window.__itazu.st.result()), '0穴');
});

test('歯みがき粉：速くこすりすぎると毎回すべり、同じ回数ゆっくりなぞるよりずっと少ししか出ない', async () => {
  const STROKES = 4; // 比べるため、どちらも同じ回数こする
  const slow = await playOne(browser, 'paste', {
    act: async p => { for (let i = 0; i < STROKES; i++) { await p.mouse.move(195, 170); await p.mouse.down(); for (let k = 0; k < 15; k++) { await p.mouse.move(195, 170 + k * 10); await sleep(40); } await p.mouse.up(); await sleep(60); } }
  });
  let slips = 0;
  const fast = await playOne(browser, 'paste', {
    act: async p => {
      for (let i = 0; i < STROKES; i++) {
        await p.mouse.move(195, 170); await p.mouse.down(); await p.mouse.move(195, 420, { steps: 2 });
        if (await p.evaluate(() => window.__itazu.st.slip > 0)) slips++;
        await p.mouse.up(); await sleep(60);
      }
    }
  });
  const cm = s => s.endsWith('cm') ? num(s) : num(s) * 100;
  assert.equal(slips, STROKES, '速くこすったのに、すべる判定が出なかった回がある');
  assert.ok(cm(fast.atFlash) < cm(slow.atFlash) / 3, `速い ${fast.atFlash} / ゆっくり ${slow.atFlash}`);
});

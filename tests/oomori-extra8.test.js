// いたずラッシュ大盛り！第8弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、洗剤の口の当たり外れ、靴下の隠す長さ、クレヨンの折れ方と次の箱、ガムテープの貼れる長さ、ペンのキャップの抜ける長さ
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, sleep } = require('./helpers');
const { NEW_ACTS, openOomori } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 1つのステージだけを無限モードで始め、実際に操作してから、成果の数だけ書きかえて（境目の前後を作る）、結果を返す
async function playWith(b, key, set) {
  const g = await openOomori(b);
  const { page, W, H } = g;
  await page.evaluate(k => window.__itazu.force([k]), key);
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  await NEW_ACTS[key](page, W, H);
  await sleep(800); // 操作の余韻が終わってから書きかえる
  if (set) await page.evaluate(set);
  await waitMode(page, 'prompt', 15000); // 次のお題まで進めて成果を確定させる
  await quit(page);
  const res = await page.evaluate(() => window.__itazu.res);
  return { row: res.rows.find(r => r.key === key), res, errors: g.errors };
}

// 1つのステージだけを無限モードで始める（操作はしない）
async function start(key) {
  const g = await openOomori(browser);
  await g.page.evaluate(k => window.__itazu.force([k]), key);
  await g.page.click('#endlessBtn');
  await waitMode(g.page, 'play'); await sleep(150);
  return g;
}
const nOf = page => page.evaluate(() => window.__itazu.st.n);
const scOf = page => page.evaluate(() => SC());

// [キー, 境目のちょうど, 1つ手前, 損害の名前, 書きかえるときに足すこと]
// 洗剤は入った量（ml）から数を出すので、ml も同じ値に書きかえる
const EDGES = [
  ['detergent', 200, 199, '洗剤の買い直し', v => `window.__itazu.st.ml = ${v};`],
  ['socks', 5, 4, '靴下の買い直し', () => ''],
  ['crayon', 12, 11, 'クレヨンの買い直し', () => ''],
  ['tape', 5, 4.9, 'ガムテープとシールはがしの買い直し', () => ''],
  ['caps', 6, 5, 'かわいたペンの買い直し', () => '']
];
for (const [key, at, below, label, extra] of EDGES) {
  test(`${key}：1回で ${at} 以上なら「${label}」で損害1,000円、${below} なら損害は0円`, async () => {
    const hit = await playWith(browser, key, new Function(`${extra(at)} window.__itazu.st.n = ${at};`));
    assert.equal(hit.row.yen, 1000);
    assert.match(hit.row.n, new RegExp(label));
    assert.deepEqual(hit.errors, []);
    const miss = await playWith(browser, key, new Function(`${extra(below)} window.__itazu.st.n = ${below};`));
    assert.equal(miss.row.yen, 0);
    assert.doesNotMatch(miss.row.n, new RegExp(label));
    assert.deepEqual(miss.errors, []);
  });
}

test('図鑑：第8弾の5項目（泡の海・靴下ミステリー・虹のかけら・開かずのたんす・キャップ迷子）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['泡の海', '靴下ミステリー', '虹のかけら', '開かずのたんす', 'キャップ迷子'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['detergent', 550], ['socks', 10], ['crayon', 70], ['tape', 17], ['caps', 8]];
    await page.evaluate(ks => window.__itazu.force(ks), ORDER.map(o => o[0]));
    await page.click('#endlessBtn');
    for (const [key, v] of ORDER) { // 5種を続けて遊び、それぞれ条件ちょうどの数にする（洗剤は入った量 ml も）
      await page.waitForFunction(k => window.__itazu.mode === 'play' && window.__itazu.st.key === k, { polling: 20, timeout: 15000 }, key); await sleep(150);
      await NEW_ACTS[key](page, W, H);
      await page.evaluate(n => { const st = window.__itazu.st; if (st.key === 'detergent') st.ml = n; st.n = n; }, v);
      await waitMode(page, 'flash', 15000);
    }
    await waitMode(page, 'prompt', 15000);
    await quit(page);
    const res = await page.evaluate(() => window.__itazu.res);
    for (const n of NAMES) assert.ok(res.newZ.includes(n), `${n}（図鑑: ${res.newZ.join(',')}）`);
    assert.deepEqual(g.errors, []);
  } finally { await b.close(); }
});

test('洗剤：洗濯機の口から遠い所で注いでも数えず、床にこぼれる。口に合わせ続けて注ぐと数える', async () => {
  const { page, W, H, errors } = await start('detergent');
  const m = page.mouse, y = Math.round(H * 0.4);
  await m.move(Math.round(W * 0.04), y); await m.down(); await sleep(1000); // 左はしで押したまま約1秒
  assert.equal(await nOf(page), 0, '口から外れているのに数えた');
  assert.ok(await page.evaluate(() => window.__itazu.st.spill.length) >= 1, '床にこぼれていない');
  const t0 = Date.now();
  while (Date.now() - t0 < 1000) { // 押したまま、ゆれる口の真ん中に指を合わせ続ける（約1秒）
    const x = await page.evaluate(() => window.__itazu.st.geo().mx);
    await m.move(x, y, { steps: 2 }); await sleep(30);
  }
  const n = await nOf(page);
  await m.up();
  assert.ok(n > 0, `口に合わせて注いだのに数えていない（${n}）`);
  assert.deepEqual(errors, []);
});

test('靴下：上へ50pxだけ動かして離すと元にもどる（0足）。絵の真ん中から70px外側をつまんで上へ150px動かして離すと1足、かたほうが1つ残る', async () => {
  const { page, W, H, errors } = await start('socks');
  const s = await scOf(page), m = page.mouse;
  const mid = () => page.evaluate(sc => { const p = window.__itazu.st.sockXY(0); return { x: p.x - 14 * sc, y: p.y }; }, s); // 0枚目（左）の絵の真ん中
  let c = await mid();
  await m.move(c.x, c.y); await m.down(); await m.move(c.x, c.y - 50 * s, { steps: 4 }); await m.up(); await sleep(60);
  assert.equal(await nOf(page), 0, '50pxで隠れた');
  assert.deepEqual(await page.evaluate(() => { const a = window.__itazu.st.pair.at[0]; return { dx: a.dx, dy: a.dy }; }), { dx: 0, dy: 0 });
  c = await mid();
  const x = c.x - 70 * s; // 左の靴下なので、外側は左
  await m.move(x, c.y); await m.down(); await m.move(x, c.y - 150 * s, { steps: 5 }); await m.up(); await sleep(60);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.lone.length), 1);
  assert.deepEqual(errors, []);
});

test('クレヨン：1本タップで1本、同じ所をもう一度タップしても1本のまま。横になぞると12本全部折れて、少し待つと新しい箱', async () => {
  const { page, W, H, errors } = await start('crayon');
  const m = page.mouse;
  const g = await page.evaluate(() => { const g = window.__itazu.st.geo(); return { l: g.l, cw: g.cw, y: g.top + g.len * 0.3 }; });
  const x3 = g.l + 3.5 * g.cw;
  await m.click(x3, g.y); await sleep(50);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.box[3].broke), true);
  await m.click(x3, g.y); await sleep(50);
  assert.equal(await nOf(page), 1, '折れたクレヨンをもう一度数えた');
  await m.move(g.l - 10, g.y); await m.down(); await m.move(g.l + g.cw * 12 + 10, g.y, { steps: 12 }); await m.up(); await sleep(30);
  assert.equal(await nOf(page), 12);
  await sleep(1000);
  assert.deepEqual(await page.evaluate(() => window.__itazu.st.box.map(c => c.broke)), Array(12).fill(false), '新しい箱になっていない');
  assert.deepEqual(errors, []);
});

test('ガムテープ：はしから20pxで離しても貼れない。はしから右へ200pxで離すと1.0m貼れて、はしがそこへ移る', async () => {
  const { page, W, H, errors } = await start('tape');
  const s = await scOf(page), m = page.mouse;
  const a = await page.evaluate(() => { const st = window.__itazu.st; return { x: st.ax, y: st.ay }; });
  await m.move(a.x, a.y); await m.down(); await m.move(a.x + 20 * s, a.y, { steps: 3 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '20pxで貼れた');
  assert.equal(await page.evaluate(() => window.__itazu.st.strips.length), 0);
  const tx = a.x + 200 * s;
  await m.move(a.x, a.y); await m.down(); await m.move(tx, a.y, { steps: 6 }); await m.up(); await sleep(50);
  const r = await page.evaluate(() => { const st = window.__itazu.st; return { n: st.n, strips: st.strips.length, ax: st.ax }; });
  assert.ok(Math.abs(r.n - 1) <= 0.05, `長さが1.0mでない（${r.n}）`);
  assert.equal(r.strips, 1);
  assert.ok(Math.abs(r.ax - tx) <= 2, `はしが離した所に移っていない（${r.ax} / ${tx}）`);
  assert.deepEqual(errors, []);
});

test('ペンのキャップ：キャップの左100pxをつまんで右へ20pxで離すと抜けない（0本）。右へ60px引っぱると1本', async () => {
  const { page, W, H, errors } = await start('caps');
  const s = await scOf(page), m = page.mouse;
  const c = await page.evaluate(() => window.__itazu.st.capXY(0));
  const x = c.x - 100 * s;
  await m.move(x, c.y); await m.down(); await m.move(x + 20 * s, c.y, { steps: 3 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '20pxで抜けた');
  assert.deepEqual(await page.evaluate(() => { const p = window.__itazu.st.pens[0]; return { pull: p.pull, off: p.off }; }), { pull: 0, off: false });
  await m.move(x, c.y); await m.down(); await m.move(x + 60 * s, c.y, { steps: 6 }); await sleep(30);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.pens[0].off), true);
  await m.up();
  assert.deepEqual(errors, []);
});

// レビューで見つかったずれ：画面の長さ（小数1けた）と、損害の判定がそろっていること。4.96m は「4.9m」と出て損害なし（四捨五入の「5.0m」なのに損害なし、にならない）
test('ガムテープ：4.96m は「4.9m」と表示されて損害0円（表示と損害の判定がそろう）', async () => {
  const r = await playWith(browser, 'tape', () => { window.__itazu.st.n = 4.96; });
  assert.equal(r.row.v, '4.9m');
  assert.equal(r.row.yen, 0);
  assert.deepEqual(r.errors, []);
});

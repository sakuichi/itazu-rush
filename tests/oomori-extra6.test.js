// いたずラッシュ大盛り！第6弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、テーブルの物の押しやすさ・押し出し、トランプの引き具合、キーボードの Enter
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

// [キー, 境目のちょうど, 1つ手前, 損害の名前]
const EDGES = [
  ['umbrella', 6, 5, '傘の買い直し'],
  ['keyboard', 8, 7, 'キーボードの買い直し'],
  ['tabletop', 6, 5, 'リモコンの買い直し'],
  ['cards', 52, 51, 'トランプの買い直し'],
  ['glue', 4, 3, 'のりの買い直し']
];
for (const [key, at, below, label] of EDGES) {
  test(`${key}：1回で ${at} 以上なら「${label}」で損害1,000円、${below} なら損害は0円`, async () => {
    const hit = await playWith(browser, key, new Function(`window.__itazu.st.n = ${at};`));
    assert.equal(hit.row.yen, 1000);
    assert.match(hit.row.n, new RegExp(label));
    assert.deepEqual(hit.errors, []);
    const miss = await playWith(browser, key, new Function(`window.__itazu.st.n = ${below};`));
    assert.equal(miss.row.yen, 0);
    assert.doesNotMatch(miss.row.n, new RegExp(label));
  });
}

test('図鑑：第6弾の5項目（晴れの日の傘・打てない報告書・ネコの気持ち・ババ抜き中止・のり切れない）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['晴れの日の傘', '打てない報告書', 'ネコの気持ち', 'ババ抜き中止', 'のり切れない'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['umbrella', 17], ['keyboard', 17], ['tabletop', 10], ['cards', 250], ['glue', 10]];
    await page.evaluate(ks => window.__itazu.force(ks), ORDER.map(o => o[0]));
    await page.click('#endlessBtn');
    for (const [key, v] of ORDER) { // 5種を続けて遊び、それぞれ条件ちょうどの数にする
      await page.waitForFunction(k => window.__itazu.mode === 'play' && window.__itazu.st.key === k, { polling: 20, timeout: 15000 }, key); await sleep(150);
      await NEW_ACTS[key](page, W, H);
      await page.evaluate(n => { window.__itazu.st.n = n; }, v);
      await waitMode(page, 'flash', 15000);
    }
    await waitMode(page, 'prompt', 15000);
    await quit(page);
    const res = await page.evaluate(() => window.__itazu.res);
    for (const n of NAMES) assert.ok(res.newZ.includes(n), `${n}（図鑑: ${res.newZ.join(',')}）`);
    assert.deepEqual(g.errors, []);
  } finally { await b.close(); }
});

test('テーブル：物のふちから45px離れたところを押して横へ動かすと、その物が動く。60px離れていると動かない', async () => {
  const { page, W, errors } = await start('tabletop');
  // テーブルの物を真ん中の1個だけにして、次の物も置かせない（ほかの物の影響を消す）
  const o = await page.evaluate(W => { const st = window.__itazu.st, o = st.on[0]; st.on = [o]; o.x = W / 2; o.drop = 0; st.wait = 1e9; return { x: o.x, w: o.w, y: st.geo().ty - o.h / 2 }; }, W);
  const m = page.mouse, xOf = () => page.evaluate(() => window.__itazu.st.on[0].x);
  const push = async gap => { const x = o.x + o.w / 2 + gap; await m.move(x, o.y); await m.down(); await m.move(x - 30, o.y, { steps: 5 }); await m.up(); await sleep(100); };
  await push(60);
  assert.equal(await xOf(), W / 2, '60px離れていて、動いた');
  await push(45);
  assert.ok(Math.abs(await xOf() - (W / 2 - 30)) < 1, '45px離れていると、動かない');
  assert.equal(await nOf(page), 0);
  assert.deepEqual(errors, []);
});

test('テーブル：となり合う2つの物の左を右へ大きく押すと、右の物もいっしょに押されて、両方とも右のふちから落ちて2個と数える', async () => {
  const { page, W, errors } = await start('tabletop');
  // 物を2個だけにして、a を左、b を a のすぐ右（ほぼ接する）に置く。次の物は置かせない
  const a = await page.evaluate(W => { const st = window.__itazu.st, [a, b] = st.on; st.on = [a, b]; a.x = W / 2 - 60; b.x = a.x + (a.w + b.w) / 2 + 2; a.drop = b.drop = 0; st.wait = 1e9; return { x: a.x, y: st.geo().ty - a.h / 2, names: [a.name, b.name] }; }, W);
  const m = page.mouse;
  await m.move(a.x, a.y); await m.down();
  await m.move(W - 2, a.y, { steps: 12 });
  await m.up();
  assert.equal(await nOf(page), 2);
  const fell = await page.evaluate(() => { const st = window.__itazu.st; return st.fall.concat(st.floor).map(f => ({ name: f.name, right: f.vx > 0 })); });
  assert.deepEqual(fell.map(f => f.name).sort(), a.names.slice().sort());
  assert.ok(fell.every(f => f.right), '左のふちから落ちた');
  assert.deepEqual(errors, []);
});

test('トランプ：山を10pxだけ下へ引いて離しても飛ばない。100px引いて離すと26枚飛ぶ', async () => {
  const { page, W, H, errors } = await start('cards');
  const m = page.mouse, x = Math.round(W / 2), y = Math.round(H * 0.74); // 山のあたり（どこを押してもよい）
  const pull = async d => { await m.move(x, y); await m.down(); await m.move(x, y + d, { steps: 5 }); await m.up(); await sleep(100); };
  await pull(10);
  assert.equal(await nOf(page), 0, '10pxで飛んだ');
  await pull(100);
  assert.equal(await nOf(page), 26);
  assert.deepEqual(errors, []);
});

test('キーボード：Enter キー（2段ぶんのL字）をつまんで引っぱると外れて、1個と数える', async () => {
  const { page, errors } = await start('keyboard');
  const [x, y] = await page.evaluate(() => { const st = window.__itazu.st; return st.kpos(st.keys.find(k => k.ch === 'Enter'), st.geo()); });
  const m = page.mouse;
  await m.move(x, y); await m.down();
  await m.move(x, y - 60, { steps: 5 });
  await m.up();
  assert.equal(await nOf(page), 1);
  assert.deepEqual(await page.evaluate(() => window.__itazu.st.keys.filter(k => k.gone).map(k => k.ch)), ['Enter']);
  assert.deepEqual(errors, []);
});

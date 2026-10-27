// いたずラッシュ大盛り！第5弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、壁紙の8割・いちごのつまみやすさ・靴ひもの一筆なぞり
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
  ['gift', 5, 4, '菓子折りの買い直し'],
  ['cake', 6, 5, 'ケーキの買い直し'],
  ['bath', 6, 5, 'お湯の入れ替え'],
  ['peel', 5, 4, '業者さん'],
  ['laces', 10, 9, '靴ひもの買い直し']
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

test('図鑑：第5弾の5項目（お詫びのお詫び・いちご総取り・七色の湯・リフォーム職人・玄関の結界）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['お詫びのお詫び', 'いちご総取り', '七色の湯', 'リフォーム職人', '玄関の結界'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['gift', 10], ['cake', 10], ['bath', 16], ['peel', 12], ['laces', 32]];
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

test('壁紙：1枚の8割まではがせば1枚と数える。7割ではまだ数えない', async () => {
  const { page, H, W, errors } = await start('peel');
  const m = page.mouse, x = W / 6, y = H * 0.2; // いちばん左の列。指を300px動かすと1枚が下まではがれる
  await m.move(x, y); await m.down();
  await m.move(x, y + 300 * 0.7, { steps: 10 });
  assert.equal(await nOf(page), 0, '7割で数えた');
  await m.move(x, y + 300 * 0.85, { steps: 4 });
  await m.up();
  assert.equal(await nOf(page), 1, '8割5分で数えない');
  assert.deepEqual(errors, []);
});

test('ケーキ：いちごから60px離れたところを押してもつまめる。80px離れていると、つまめない', async () => {
  const { page, W, H, errors } = await start('cake');
  const m = page.mouse, bx = W / 2 + 120, by = H * 0.36 - 12; // いちばん右のいちご
  const pinch = async dx => { await m.move(bx + dx, by); await m.down(); await m.move(bx + dx, by - 90, { steps: 5 }); await m.up(); await sleep(100); };
  await pinch(80);
  assert.equal(await nOf(page), 0, '80px離れていて、つまめた');
  await pinch(60);
  assert.equal(await nOf(page), 1, '60px離れていると、つまめない');
  assert.deepEqual(errors, []);
});

test('靴ひも：指を離さずに3つの靴をなぞると、2か所結べる', async () => {
  const { page, W, H, errors } = await start('laces');
  const m = page.mouse, y = H * 0.3 + 0.22 * H * 0.54; // 上の列
  await m.move(W * 0.15, y); await m.down();
  await m.move(W * 0.37, y, { steps: 8 });
  await m.move(W * 0.63, y, { steps: 8 });
  await m.up();
  assert.equal(await nOf(page), 2);
  assert.deepEqual(errors, []);
});

test('靴ひも：大きい靴から となりの靴へなぞって、その靴の上で離すと、結ぶのは1か所だけ（離したときに、来た靴と結び直さない）', async () => {
  const { page, W, H, errors } = await start('laces');
  const m = page.mouse, y = H * 0.3 + 0.22 * H * 0.54; // 上の列。左の2つがいちばん大きい靴
  await m.move(W * 0.15, y); await m.down();
  await m.move(W * 0.37, y, { steps: 8 });
  await m.up();
  assert.equal(await nOf(page), 1);
  assert.deepEqual(errors, []);
});

test('靴ひも：靴と靴の間を押して離すだけ（なぞらない）では結べない', async () => {
  const { page, W, H, errors } = await start('laces');
  const y = H * 0.3 + 0.22 * H * 0.54;
  for (let i = 0; i < 5; i++) { await page.mouse.click(W * 0.74, y); await sleep(50); }
  assert.equal(await nOf(page), 0);
  assert.deepEqual(errors, []);
});

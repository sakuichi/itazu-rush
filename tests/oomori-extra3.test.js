// いたずラッシュ大盛り！第3弾：段階制の境目（損害1,000円）、毛糸玉のセーター、スイッチの操作、図鑑（新規5項目）
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
  if (key === 'pillow') await page.waitForFunction(() => { const s = window.__itazu.st; return s.vy === 0 && Math.abs(s.vx) < 5; }, { polling: 'raf', timeout: 4000 }); // 投げた枕がベッドに落ちて羽根が出るまで待つ
  if (set) await page.evaluate(set);
  await waitMode(page, 'prompt', 15000); // 次のお題まで進めて成果を確定させる
  await quit(page);
  const res = await page.evaluate(() => window.__itazu.res);
  return { row: res.rows.find(r => r.key === key), res, errors: g.errors };
}

// [キー, 境目のちょうど, 1つ手前, 損害の名前]
const EDGES = [
  ['piano', 65, 64, 'お隣へお詫び'],
  ['pillow', 280, 279, '枕の買い直し'],
  ['sofa', 40, 39.9, 'ソファの張り替え'],
  ['light', 35, 34, 'スイッチの交換']
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

test('毛糸玉：玉を使い切ってセーターまでほどけたら、毛糸の買い直し1,000円。玉が残っているうちは0円', async () => {
  const knit = await playWith(browser, 'yarn', () => { window.__itazu.st.b.left = 0.01; }); // ほとんど使い切った玉をはじく
  assert.ok(knit.row.yen === 1000, `損害額 ${knit.row.yen}（${knit.row.n}）`);
  assert.match(knit.row.n, /セーター/);
  const keep = await playWith(browser, 'yarn', () => { window.__itazu.st.b.left = 1e6; }); // いくら転がしても使い切らない玉
  assert.equal(keep.row.yen, 0);
  assert.doesNotMatch(keep.row.n, /セーター/);
  assert.deepEqual(knit.errors, []);
});

test('電気のスイッチ：押しただけでは切り替わらず、上下にはじくと切り替わって暗くなる', async () => {
  const g = await openOomori(browser);
  const { page, W, H } = g;
  await page.evaluate(() => window.__itazu.force(['light']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  const geo = await page.evaluate(() => window.__itazu.st.geo());
  for (const [x, y] of [[geo.cx, geo.cy - geo.R * 0.3], [geo.cx, geo.cy + geo.R * 0.3], [geo.sx, geo.sy]]) await page.mouse.click(x, y); // 吹き出しの上・下と、壁のスイッチを押す
  assert.deepEqual(await page.evaluate(() => ({ n: window.__itazu.st.n, on: window.__itazu.st.on })), { n: 0, on: true });
  await page.mouse.move(W / 2, H * 0.5); await page.mouse.down(); await page.mouse.move(W / 2, H * 0.6, { steps: 3 }); // 下へはじく
  assert.deepEqual(await page.evaluate(() => ({ n: window.__itazu.st.n, on: window.__itazu.st.on })), { n: 1, on: false });
  await page.mouse.move(W / 2, H * 0.5, { steps: 3 }); await page.mouse.up(); // 上へはじく
  assert.deepEqual(await page.evaluate(() => ({ n: window.__itazu.st.n, on: window.__itazu.st.on })), { n: 2, on: true });
  assert.deepEqual(g.errors, []);
});

test('図鑑：第3弾の5項目（真夜中のリサイタル・羽根まみれ・ほじり名人・チカチカ大王・ネコの相棒）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of ['真夜中のリサイタル', '羽根まみれ', 'ほじり名人', 'チカチカ大王', 'ネコの相棒']) assert.ok(names.includes(n), n);
    const ORDER = [['piano', 110], ['pillow', 400], ['sofa', 70], ['light', 50], ['yarn', 45]];
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
    for (const n of ['真夜中のリサイタル', '羽根まみれ', 'ほじり名人', 'チカチカ大王', 'ネコの相棒']) assert.ok(res.newZ.includes(n), `${n}（図鑑: ${res.newZ.join(',')}）`);
    assert.deepEqual(g.errors, []);
  } finally { await b.close(); }
});

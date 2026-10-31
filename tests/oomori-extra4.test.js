// いたずラッシュ大盛り！第4弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、タイトルの一覧の折りたたみ・新聞の5割・枕の振りまわし
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

// [キー, 境目のちょうど, 1つ手前, 損害の名前]
const EDGES = [
  ['closet', 24, 23, 'ふすまの修理'],
  ['roll', 8, 7, 'ロールスクリーンの買い直し'],
  ['balloon', 3, 2, '風船の買い直し'],
  ['clock', 12, 11.9, 'タクシー'],
  ['hanko', 24, 23, '書類の作り直し']
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

test('図鑑：第4弾の5項目（布団なだれ・ビヨーン名人・パーティー台なし・未来へ早送り・ハンコ部長）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['布団なだれ', 'ビヨーン名人', 'パーティー台なし', '未来へ早送り', 'ハンコ部長'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['closet', 40], ['roll', 15], ['balloon', 12], ['clock', 20], ['hanko', 40]];
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

test('タイトル画面：いたずらの一覧は折りたたまれていて、「はじめる」が最初の画面に入る。見出しを押すと一覧が開く', async () => {
  const { page, errors, H } = await openOomori(browser);
  const shown = () => page.$eval('#chips', e => e.getClientRects().length > 0);
  assert.equal(await shown(), false, '最初から一覧が見えている');
  assert.match(await page.$eval('#chipBox summary', e => e.textContent), /全55種/);
  const btn = await page.$eval('#startBtn', e => e.getBoundingClientRect().bottom);
  assert.ok(btn <= H, `「はじめる」の下の端 ${btn}px が画面（${H}px）の外`);
  await page.click('#chipBox summary');
  assert.equal(await shown(), true, '見出しを押しても一覧が開かない');
  assert.deepEqual(errors, []);
});

test('新聞：幅の5割なぞれば1本切れる。4割5分では切れない', async () => {
  const g = await openOomori(browser);
  const { page } = g;
  await page.evaluate(() => window.__itazu.force(['news']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  const geo = await page.evaluate(() => window.__itazu.st.geo());
  const cut = async (y, a, b) => { const m = page.mouse; await m.move(geo.x + geo.w * a, y); await m.down(); await m.move(geo.x + geo.w * b, y, { steps: 10 }); await m.up(); };
  await cut(geo.top + geo.h * 0.6, 0.2, 0.65);
  assert.equal(await page.evaluate(() => window.__itazu.st.n), 0, '4割5分で切れた');
  await cut(geo.top + geo.h * 0.5, 0.2, 0.75);
  assert.equal(await page.evaluate(() => window.__itazu.st.n), 1, '5割5分で切れない');
  assert.deepEqual(g.errors, []);
});

test('枕：壁・天井・ベッドに当てなくても、空中で振りまわすだけで羽根が出る', async () => {
  const g = await openOomori(browser);
  const { page, W, H } = g;
  await page.evaluate(() => window.__itazu.force(['pillow']));
  await page.click('#endlessBtn');
  await waitMode(page, 'play'); await sleep(150);
  // 画面の真ん中あたり（枕の大きさを入れても壁・天井・ベッドに届かない範囲）で左右に振る
  const m = page.mouse; await m.move(W * 0.5, H * 0.45); await m.down(); await sleep(150);
  for (let i = 0; i < 6; i++) { await m.move(W * 0.3, H * 0.4, { steps: 3 }); await sleep(30); await m.move(W * 0.7, H * 0.55, { steps: 3 }); await sleep(30); }
  const s = await page.evaluate(() => { const st = window.__itazu.st, gg = st.geo(); return { n: st.n, x: st.x, y: st.y, hw: gg.pw * 0.56, hh: gg.ph * 0.6, top: gg.top, floor: gg.floor }; });
  await m.up();
  assert.ok(s.x - s.hw > 0 && s.x + s.hw < W && s.y - s.hh > s.top && s.y + s.hh < s.floor, `枕が壁などに届いている（${JSON.stringify(s)}）`);
  assert.ok(s.n > 0, `羽根が出ない（${s.n}）`);
  assert.deepEqual(g.errors, []);
});

// いたずラッシュ大盛り！第7弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、鍋のふたの向きの切りかえ、エアコンのとなりの部屋、製氷皿の氷のはじき具合、割り箸の引き具合
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
// いすは書きかえたあとも回り続けて数が増えうるので、回る速さを0にして止める
const EDGES = [
  ['chair', 8, 7, 'いすの修理', 'window.__itazu.st.om = 0;'],
  ['hashi', 7, 6, 'お客さん用の割り箸の買い直し', ''],
  ['aircon', 12, 11, '電気代', ''],
  ['ice', 6, 5, 'ロックアイスを買いに行く', ''],
  ['lids', 8, 7, 'へこんだ鍋の買い直し', '']
];
for (const [key, at, below, label, extra] of EDGES) {
  test(`${key}：1回で ${at} 以上なら「${label}」で損害1,000円、${below} なら損害は0円`, async () => {
    const hit = await playWith(browser, key, new Function(`${extra} window.__itazu.st.n = ${at};`));
    assert.equal(hit.row.yen, 1000);
    assert.match(hit.row.n, new RegExp(label));
    assert.deepEqual(hit.errors, []);
    const miss = await playWith(browser, key, new Function(`${extra} window.__itazu.st.n = ${below};`));
    assert.equal(miss.row.yen, 0);
    assert.doesNotMatch(miss.row.n, new RegExp(label));
  });
}

test('図鑑：第7弾の5項目（社長の気分・お客さん何人？・真夏の冬・氷河期・ご近所の目覚まし）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['社長の気分', 'お客さん何人？', '真夏の冬', '氷河期', 'ご近所の目覚まし'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['chair', 21], ['hashi', 20], ['aircon', 30], ['ice', 11], ['lids', 40]];
    await page.evaluate(ks => window.__itazu.force(ks), ORDER.map(o => o[0]));
    await page.click('#endlessBtn');
    for (const [key, v] of ORDER) { // 5種を続けて遊び、それぞれ条件ちょうどの数にする（いすは回る速さも0にして止める）
      await page.waitForFunction(k => window.__itazu.mode === 'play' && window.__itazu.st.key === k, { polling: 20, timeout: 15000 }, key); await sleep(150);
      await NEW_ACTS[key](page, W, H);
      await page.evaluate(n => { const st = window.__itazu.st; if (st.key === 'chair') st.om = 0; st.n = n; }, v);
      await waitMode(page, 'flash', 15000);
    }
    await waitMode(page, 'prompt', 15000);
    await quit(page);
    const res = await page.evaluate(() => window.__itazu.res);
    for (const n of NAMES) assert.ok(res.newZ.includes(n), `${n}（図鑑: ${res.newZ.join(',')}）`);
    assert.deepEqual(g.errors, []);
  } finally { await b.close(); }
});

test('鍋のふた：右へ大きく動かし続けても1回。左へ40px戻しても1回のまま、左へ合計60pxを超えると2回', async () => {
  const { page, W, H, errors } = await start('lids');
  const s = await scOf(page), m = page.mouse, y = Math.round(H * 0.6), x0 = Math.round(W * 0.3), xr = x0 + Math.round(150 * s);
  await m.move(x0, y); await m.down();
  await m.move(xr, y, { steps: 10 }); await sleep(50); // 同じ向き（右）に 60px を大きく超えて動かし続ける
  assert.equal(await nOf(page), 1, '右へ動かし続けて、2回以上鳴った');
  await m.move(xr - Math.round(40 * s), y, { steps: 4 }); await sleep(50);
  assert.equal(await nOf(page), 1, '左へ40px戻しただけで鳴った');
  await m.move(xr - Math.round(70 * s), y, { steps: 3 }); await sleep(50);
  assert.equal(await nOf(page), 2);
  await m.up();
  assert.deepEqual(errors, []);
});

test('エアコン：12回タップで16℃・12℃ぶん。13回目でとなりの部屋へ移って28℃（数は12のまま）。移り終わってからのタップで27℃・13℃ぶん', async () => {
  const { page, W, H, errors } = await start('aircon');
  const st = () => page.evaluate(() => { const st = window.__itazu.st; return { temp: st.temp, room: st.room, n: st.n }; });
  for (let i = 0; i < 12; i++) { await page.mouse.click(W / 2, H * 0.78); await sleep(60); }
  assert.deepEqual(await st(), { temp: 16, room: 0, n: 12 });
  await page.mouse.click(W / 2, H * 0.78); await sleep(30);
  assert.deepEqual(await st(), { temp: 28, room: 1, n: 12 });
  await page.waitForFunction(() => window.__itazu.st.pan === 0, { polling: 20, timeout: 3000 });
  await page.mouse.click(W / 2, H * 0.78); await sleep(30);
  assert.deepEqual(await st(), { temp: 27, room: 1, n: 13 });
  assert.deepEqual(errors, []);
});

test('製氷皿の氷：落ちてきた氷を10pxだけ動かして離しても数えない。40px動かして離すと1個。同じ氷をもう一度はじいても1個のまま', async () => {
  const { page, W, H, errors } = await start('ice');
  const s = await scOf(page), m = page.mouse;
  // 氷が床に落ちきるのを待ち、1個だけを真ん中に置いて、ほかの氷は左下の隅へよける（ほかの氷の影響を消す）
  await page.waitForFunction(() => window.__itazu.st.cubes.length > 0 && window.__itazu.st.cubes.every(c => c.drop <= 0), { polling: 20, timeout: 3000 });
  const c = await page.evaluate((W, H) => {
    const st = window.__itazu.st, c = st.cubes[0];
    c.x = W * 0.55; c.y = H * 0.55;
    for (const o of st.cubes.slice(1)) { o.x = W * 0.08; o.y = H * 0.92; }
    return { x: c.x, y: c.y };
  }, W, H);
  await m.move(c.x, c.y); await m.down(); await m.move(c.x + 10 * s, c.y, { steps: 3 }); await m.up(); await sleep(60);
  assert.equal(await nOf(page), 0, '10pxで数えた');
  await m.move(c.x, c.y); await m.down(); await m.move(c.x + 40 * s, c.y, { steps: 3 }); await m.up();
  assert.equal(await nOf(page), 1);
  // すべっている同じ氷を、すぐにもう一度（こんどは下へ）はじく
  const p = await page.evaluate(() => { const c = window.__itazu.st.cubes[0]; return { x: c.x, y: c.y, done: c.done }; });
  assert.equal(p.done, true);
  await m.move(p.x, p.y); await m.down(); await m.move(p.x, p.y + 40 * s, { steps: 3 }); await m.up(); await sleep(60);
  assert.ok(await page.evaluate(() => window.__itazu.st.cubes[0].vy > 0), '2回目に同じ氷をはじけていない（下へすべっていない）');
  assert.equal(await nOf(page), 1, '同じ氷を2回数えた');
  assert.deepEqual(errors, []);
});

test('割り箸：押して下へ30pxだけ動かして離しても割れない。50pxを超えて動かすと1膳', async () => {
  const { page, W, H, errors } = await start('hashi');
  const s = await scOf(page), m = page.mouse, x = Math.round(W / 2), y = Math.round(H * 0.45);
  await m.move(x, y); await m.down(); await m.move(x, y + Math.round(30 * s), { steps: 4 }); await m.up(); await sleep(100);
  assert.equal(await nOf(page), 0, '30pxで割れた');
  await m.move(x, y); await m.down(); await m.move(x, y + Math.round(60 * s), { steps: 4 }); await m.up(); await sleep(100);
  assert.equal(await nOf(page), 1);
  assert.deepEqual(errors, []);
});

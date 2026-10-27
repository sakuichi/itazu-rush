// いたずラッシュ大盛り！第2弾：布団のタイミング、段階制の境目、図鑑（新規5項目・「いたずらっ子」の通算）
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, ACTS, sleep } = require('./helpers');
const { KEYS, openOomori, openOld } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 1つのステージだけを無限モードで始める
async function start(g, key) {
  await g.page.evaluate(k => window.__itazu.force([k]), key);
  await g.page.click('#endlessBtn');
  await waitMode(g.page, 'play'); await sleep(150);
}
// 次のお題まで進めて成果を確定させ、中断から結果へ
async function finishOne(page) {
  await waitMode(page, 'prompt', 15000);
  await quit(page);
  return page.evaluate(() => window.__itazu.res);
}

test('布団：着地の直前にタップし続けると、タップしないときより高く跳ぶ', async () => {
  const peakAfter = async timed => {
    const g = await openOomori(browser);
    await start(g, 'futon');
    const m = g.page.mouse;
    await m.click(g.W / 2, g.H * 0.6); // 跳び始める
    for (let i = 0; i < 3; i++) {
      await g.page.waitForFunction(() => window.__itazu.st.landIn() < 0.07, { polling: 'raf', timeout: 3000 });
      if (timed) await m.click(g.W / 2, g.H * 0.6);
      await g.page.waitForFunction(() => window.__itazu.st.v > 0, { polling: 'raf', timeout: 3000 }); // 着地して、また上り始めた
    }
    const r = await g.page.evaluate(() => ({ peak: window.__itazu.st.peak, n: window.__itazu.st.n }));
    assert.deepEqual(g.errors, []);
    return r;
  };
  const timed = await peakAfter(true), idle = await peakAfter(false);
  assert.ok(timed.n >= 3 && idle.n >= 3, `着地の回数 ${timed.n} / ${idle.n}`);
  assert.ok(timed.peak > idle.peak, `タイミングよく押したとき ${timed.peak}、押さないとき ${idle.peak}`);
});

test('カレンダー：1回で15枚以上破ると買い直し1,000円がかかり、25日以上で図鑑「未来人」が登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    await start(g, 'calendar');
    const m = page.mouse;
    for (let i = 0; i < 34; i++) { await m.move(W / 2, H * 0.4); await m.down(); await m.move(W / 2, H * 0.4 + 80, { steps: 2 }); await m.up(); }
    assert.ok(await page.evaluate(() => window.__itazu.st.n) >= 30, '30枚破れなかった（操作が遅い）');
    const res = await finishOne(page);
    const row = res.rows.find(r => r.key === 'calendar');
    assert.equal(row.yen, 1000);
    assert.match(row.n, /買い直し/);
    assert.ok(res.newZ.includes('未来人'), `図鑑: ${res.newZ.join(',')}`);
    assert.deepEqual(g.errors, []);
  } finally { await b.close(); }
});

test('カレンダー：1回で5枚なら、買い直しはかからない', async () => {
  const g = await openOomori(browser);
  const { page, W, H } = g;
  await start(g, 'calendar');
  const m = page.mouse;
  for (let i = 0; i < 5; i++) { await m.move(W / 2, H * 0.4); await m.down(); await m.move(W / 2, H * 0.4 + 80, { steps: 2 }); await m.up(); }
  const res = await finishOne(page);
  const row = res.rows.find(r => r.key === 'calendar');
  assert.equal(row.v, '5日');
  assert.equal(row.yen, 0);
  assert.doesNotMatch(row.n, /買い直し/);
});

test('図鑑：新規5種の項目（未来人・なんでも吸引・天井タッチ・シュレッダー・シャボン職人）がある', async () => {
  const { page } = await openOomori(browser);
  const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
  for (const n of ['未来人', 'なんでも吸引', '天井タッチ', 'シュレッダー', 'シャボン職人']) assert.ok(names.includes(n), n);
  assert.equal(names.length, 56);
});

// 「いたずらっ子」：遊んだ種類を itazurush-oomori-played に入れておき、ティッシュを1本遊んで結果に入る
async function roundWith(playedBefore) {
  const b = await launch();
  try {
    const g = await openOomori(b);
    await g.page.evaluate(v => { localStorage.removeItem('itazurush-oomori-zukan'); localStorage.setItem('itazurush-oomori-played', JSON.stringify(v)); }, playedBefore);
    await g.page.reload(); await g.page.waitForFunction(() => !!window.__itazu);
    await start(g, 'tissue');
    await ACTS.tissue(g.page, g.W, g.H);
    const res = await finishOne(g.page);
    const saved = await g.page.evaluate(() => JSON.parse(localStorage.getItem('itazurush-oomori-played') || '[]'));
    return { res, saved, errors: g.errors };
  } finally { await b.close(); }
}

test('図鑑「いたずらっ子」（大盛り）：ほかの34種を遊んだことがあれば、残りの1種を遊んだときに登録される', async () => {
  const r = await roundWith(KEYS.filter(k => k !== 'tissue'));
  assert.ok(r.res.newZ.includes('いたずらっ子'), `図鑑: ${r.res.newZ.join(',')}`);
  assert.deepEqual(r.saved.slice().sort(), KEYS.slice().sort());
  assert.deepEqual(r.errors, []);
});

test('図鑑「いたずらっ子」（大盛り）：まだ遊んでいない種類が残っていれば登録されず、遊んだ種類は覚えておく', async () => {
  const r = await roundWith(KEYS.filter(k => k !== 'tissue' && k !== 'toilet'));
  assert.ok(!r.res.newZ.includes('いたずらっ子'), `図鑑: ${r.res.newZ.join(',')}`);
  assert.deepEqual(r.saved.slice().sort(), KEYS.filter(k => k !== 'toilet').sort());
});

test('既存版の「いたずらっ子」は今のまま（全10種を1周）で、遊んだ種類は保存しない', async () => {
  const g = await openOld(browser);
  const desc = await g.page.evaluate(() => window.__itazu.ZUKAN.find(z => z.name === 'いたずらっ子').desc);
  assert.equal(desc, '全10種のいたずらを1周する（どちらのモードでも）');
  await start(g, 'tissue');
  await ACTS.tissue(g.page, g.W, g.H);
  await finishOne(g.page);
  assert.equal(await g.page.evaluate(() => localStorage.getItem('itazurush-played')), null);
});

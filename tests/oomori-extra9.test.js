// いたずラッシュ大盛り！第9弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、スリッパの裏返る長さ、ハンガーのつまみ直し、ホチキスの押しこみともどし、シャツのボタンの引っぱる長さ、洗濯物のシャツのめくる長さ
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
const EDGES = [
  ['slippers', 5, 4, 'お客さん用スリッパの買い直し', () => ''],
  ['hangers', 5, 4, '曲がったハンガーの買い直し', () => ''],
  ['stapler', 12, 11, 'ホチキスの芯の買い直し', () => ''],
  ['buttons', 4, 3, 'シャツがよれて クリーニング代', () => ''],
  ['inside', 5, 4, '首がのびて シャツの買い直し', () => '']
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

test('図鑑：第9弾の5項目（裏おもてなし・ハンガー列車・とめどない・ちぐはぐ紳士・裏表のない人）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['裏おもてなし', 'ハンガー列車', 'とめどない', 'ちぐはぐ紳士', '裏表のない人'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['slippers', 8], ['hangers', 10], ['stapler', 19], ['buttons', 7], ['inside', 9]];
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

test('スリッパ：横に15pxだけ動かして離しても裏返らない（0枚）。横に50pxはじくと裏返って1枚、裏返ったものをもう一度はじいても1枚のまま', async () => {
  const { page, W, H, errors } = await start('slippers');
  const s = await scOf(page), m = page.mouse;
  const q = await page.evaluate(() => window.__itazu.st.pos(0));
  await m.move(q.x, q.y); await m.down(); await m.move(q.x + 15 * s, q.y, { steps: 3 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '15pxで裏返った');
  assert.equal(await page.evaluate(() => window.__itazu.st.sl[0].flip), false);
  await m.move(q.x, q.y); await m.down(); await m.move(q.x + 50 * s, q.y, { steps: 5 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.sl[0].flip), true);
  await m.move(q.x, q.y); await m.down(); await m.move(q.x + 50 * s, q.y, { steps: 5 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1, '裏返ったスリッパをもう一度数えた');
  assert.deepEqual(errors, []);
});

test('ハンガー：線より右で押して、さらに右へ動かしても数えない（0本）。左へもどしてから右へで1本、もう一度 左→右 で2本、鎖も2本', async () => {
  const { page, W, H, errors } = await start('hangers');
  const m = page.mouse, y = Math.round(H * 0.4);
  const line = await page.evaluate(() => window.__itazu.st.geo().line);
  const L = line - 60, R = line + 60;
  await m.move(R, y); await m.down(); await m.move(R + 50, y, { steps: 4 }); await sleep(30);
  assert.equal(await nOf(page), 0, '線より右で押して始めたのに数えた');
  await m.move(L, y, { steps: 6 }); await sleep(30);
  await m.move(R, y, { steps: 6 }); await sleep(30);
  assert.equal(await nOf(page), 1);
  await m.move(L, y, { steps: 6 }); await sleep(30);
  await m.move(R, y, { steps: 6 }); await sleep(30);
  await m.up();
  assert.equal(await nOf(page), 2);
  assert.equal(await page.evaluate(() => window.__itazu.st.links), 2);
  assert.deepEqual(errors, []);
});

test('ホチキス：下へ20pxでは数えない（0本）。下へ60pxで1本、もどさずにさらに下へ動かしても1本のまま。上へもどしてから下へ60pxで2本、芯の残りは18本', async () => {
  const { page, W, H, errors } = await start('stapler');
  const s = await scOf(page), m = page.mouse, x = Math.round(W / 2), y = Math.round(H * 0.3);
  await m.move(x, y); await m.down(); await m.move(x, y + 20 * s, { steps: 3 }); await sleep(30);
  assert.equal(await nOf(page), 0, '20pxでとめた');
  await m.move(x, y + 60 * s, { steps: 4 }); await sleep(30);
  assert.equal(await nOf(page), 1);
  await m.move(x, y + 75 * s, { steps: 3 }); await sleep(30);
  assert.equal(await nOf(page), 1, 'もどさずに2回目を数えた');
  await m.move(x, y + 5 * s, { steps: 5 }); await sleep(30);
  await m.move(x, y + 60 * s, { steps: 5 }); await sleep(30);
  await m.up();
  assert.equal(await nOf(page), 2);
  assert.equal(await page.evaluate(() => window.__itazu.st.left), 18);
  assert.deepEqual(errors, []);
});

test('シャツのボタン：0個目を右へ30pxだけ引っぱって離すと、とまらない（0個）。右へ70px引っぱると1個、0個目は自分のではない穴（1〜5）にとまる', async () => {
  const { page, W, H, errors } = await start('buttons');
  const s = await scOf(page), m = page.mouse;
  const t = await page.evaluate(() => window.__itazu.st.btnXY(0));
  await m.move(t.x, t.y); await m.down(); await m.move(t.x + 30 * s, t.y, { steps: 3 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '30pxでとまった');
  assert.equal(await page.evaluate(() => window.__itazu.st.btn[0].hole), -1);
  await m.move(t.x, t.y); await m.down(); await m.move(t.x + 70 * s, t.y, { steps: 6 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1);
  const hole = await page.evaluate(() => window.__itazu.st.btn[0].hole);
  assert.ok(hole >= 1 && hole <= 5, `自分のではない穴にとまっていない（${hole}）`);
  assert.deepEqual(errors, []);
});

test('洗濯物のシャツ：すそを上へ40pxだけめくって離すと裏返らない（0枚）。上へ120pxめくると1枚', async () => {
  const { page, W, H, errors } = await start('inside');
  const s = await scOf(page), m = page.mouse;
  const g = await page.evaluate(() => { const g = window.__itazu.st.geo(); return { x: g.cx, y: g.cy + g.h * 0.3 }; });
  await m.move(g.x, g.y); await m.down(); await m.move(g.x, g.y - 40 * s, { steps: 3 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '40pxで裏返った');
  await m.move(g.x, g.y); await m.down(); await m.move(g.x, g.y - 120 * s, { steps: 6 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1);
  assert.deepEqual(errors, []);
});

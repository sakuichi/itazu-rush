// いたずラッシュ大盛り！第10弾：段階制の境目（損害1,000円）、図鑑（新規5項目）。あわせて、水鉄砲のねらい続ける長さ、扇風機の押している間だけの風と次の場所への移動、リモコンの同じボタン、スマホ連写の動かす長さと次のスマホ（結果の名前）、電源タップのなぞる高さと次の電源タップ
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
  ['squirt', 4, 3, 'クリーニング代', () => ''],
  ['fan', 20, 19, 'しわくちゃで 印刷し直し', () => ''],
  ['remote', 8, 7, 'もどせなくて 電気屋さんの出張費', () => ''],
  ['camera', 30, 29, 'クラウドの容量を買い足す', () => ''],
  ['outlet', 15, 14, '録画が止まって 有料配信で見直す', () => '']
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

test('図鑑：第10弾の5項目（びしょぬれリビング・紙吹雪・設定迷子・容量オーバー・節電王）が、条件に届くと登録される', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    const g = await openOomori(b);
    const { page, W, H } = g;
    const NAMES = ['びしょぬれリビング', '紙吹雪', '設定迷子', '容量オーバー', '節電王'];
    const names = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.name));
    for (const n of NAMES) assert.ok(names.includes(n), n);
    const ORDER = [['squirt', 8], ['fan', 35], ['remote', 12], ['camera', 58], ['outlet', 29]];
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

test('水鉄砲：ソファの真ん中を0.1秒だけ押して離すと、びしょびしょにならない（0か所）。0.8秒押し続けると1か所でソファがびしょびしょ。壁を1秒押し続けても1か所のまま', async () => {
  const { page, W, H, errors } = await start('squirt');
  const m = page.mouse;
  const r = await page.evaluate(() => window.__itazu.st.rect(2)), x = r.x + r.w / 2, y = r.y + r.h / 2;
  await m.move(x, y); await m.down(); await sleep(100); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 0, '0.1秒でびしょびしょになった');
  assert.equal(await page.evaluate(() => window.__itazu.st.sp[2].done), false);
  await m.move(x, y); await m.down(); await sleep(800); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.sp[2].done), true);
  await m.move(W * 0.5, H * 0.45); await m.down(); await sleep(1000); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1, '壁をぬらして数えた');
  assert.deepEqual(errors, []);
});

test('扇風機：真ん中の机を0.6秒押し続けると書類が飛ぶ（残りが6枚より少なく、飛んだ数＝成果）。離したあと0.5秒待っても増えない。3つの机の書類がなくなると次の場所へ移り、1.5秒以内に次の机3つ（各6枚）がそろう', async () => {
  const { page, W, H, errors } = await start('fan');
  const m = page.mouse;
  const q = await page.evaluate(() => { const st = window.__itazu.st; return st.pos(st.piles[1]); });
  await m.move(q.x, q.y); await m.down(); await sleep(600); await m.up(); await sleep(30);
  const left = await page.evaluate(() => window.__itazu.st.piles[1].left);
  assert.ok(left < 6, `書類が飛んでいない（残り${left}枚）`);
  const n = await nOf(page);
  assert.equal(n, 6 - left);
  await sleep(500);
  assert.equal(await nOf(page), n, '離したあとも風が出ている');
  await page.evaluate(() => { for (const q of window.__itazu.st.piles) q.left = 0; });
  await page.waitForFunction(() => window.__itazu.st.mv > 0, { polling: 20, timeout: 500 });
  await page.waitForFunction(() => { const st = window.__itazu.st; return st.mv === 0 && st.piles.length === 3 && st.piles.every(q => q.left === 6); }, { polling: 20, timeout: 1500 });
  assert.deepEqual(errors, []);
});

test('リモコン：ボタン0を押すと1個、同じボタン0をもう一度押しても1個のまま、ボタン1で2個。12個全部押すと、2秒以内に次のテレビになり変えた設定が0個にもどる', async () => {
  const { page, W, H, errors } = await start('remote');
  const m = page.mouse, btn = j => page.evaluate(j => window.__itazu.st.btn(j), j);
  const b0 = await btn(0), b1 = await btn(1);
  await m.click(b0.x, b0.y); await sleep(50);
  assert.equal(await nOf(page), 1);
  await m.click(b0.x, b0.y); await sleep(50);
  assert.equal(await nOf(page), 1, '同じボタンをもう一度数えた');
  await m.click(b1.x, b1.y); await sleep(50);
  assert.equal(await nOf(page), 2);
  assert.equal(await page.evaluate(() => window.__itazu.st.on.size), 2);
  for (let j = 2; j < 12; j++) { const b = await btn(j); await m.click(b.x, b.y); await sleep(40); }
  assert.equal(await nOf(page), 12);
  await page.waitForFunction(() => window.__itazu.st.on.size === 0, { polling: 20, timeout: 2000 });
  assert.deepEqual(errors, []);
});

test('スマホ連写：ファインダーで押しただけで1枚、10px動かしても1枚のまま、さらに200px動かすと3枚以上。30枚撮ると2秒以内に次のスマホ（ママのスマホ、写真は空）。結果の行の名前は「スマホ連写」のまま', async () => {
  const { page, W, H, errors } = await start('camera');
  const s = await scOf(page), m = page.mouse;
  const v = await page.evaluate(() => { const g = window.__itazu.st.geo(); return { x: g.vx + g.vw / 2, y: g.vy + g.vh / 2 }; });
  await m.move(v.x, v.y); await m.down(); await sleep(100);
  assert.equal(await nOf(page), 1, '押しただけで撮れていない');
  await m.move(v.x + 10 * s, v.y); await sleep(100);
  assert.equal(await nOf(page), 1, '10pxで2枚目を撮った');
  for (let k = 1; k <= 10; k++) { await m.move(v.x + 10 * s, v.y + 20 * k * s); await sleep(70); } // 下へ200pxを10回に分けて
  await m.up();
  const n = await nOf(page);
  assert.ok(n >= 3, `200px動かしても${n}枚`);
  assert.equal(await page.evaluate(() => window.__itazu.st.phone), 'パパのスマホ');
  await page.evaluate(() => { const st = window.__itazu.st; for (let i = 0; i < 30; i++) st.shoot(); });
  await page.waitForFunction(() => { const st = window.__itazu.st; return st.shots.length === 0 && st.phone === 'ママのスマホ'; }, { polling: 20, timeout: 2000 });
  await waitMode(page, 'prompt', 15000); // 時間切れまで進めて成果を確定させる
  await quit(page);
  const row = await page.evaluate(() => window.__itazu.res.rows.find(r => r.key === 'camera'));
  assert.equal(row.k, 'スマホ連写', '結果の名前が持ち主の名前で上書きされた');
  assert.deepEqual(errors, []);
});

test('電源タップ：スイッチ0を押すと1個、もう一度押しても1個のまま。列から上へ80px離れた所をなぞっても増えない。列の高さで左はしから右はしへなぞると6個（全部切れる）。2秒以内に次の電源タップ（全部ついている）になる', async () => {
  const { page, W, H, errors } = await start('outlet');
  const s = await scOf(page), m = page.mouse;
  const p0 = await page.evaluate(() => window.__itazu.st.sw(0));
  await m.click(p0.x, p0.y); await sleep(50);
  assert.equal(await nOf(page), 1);
  assert.equal(await page.evaluate(() => window.__itazu.st.on.filter(v => !v).length), 1);
  await m.click(p0.x, p0.y); await sleep(50);
  assert.equal(await nOf(page), 1, '切れたスイッチをもう一度数えた');
  const g = await page.evaluate(() => { const g = window.__itazu.st.geo(); return { l: g.l, r: g.r, sy: g.sy }; });
  await m.move(g.l, g.sy - 80 * s); await m.down(); await m.move(g.r, g.sy - 80 * s, { steps: 10 }); await m.up(); await sleep(50);
  assert.equal(await nOf(page), 1, '列から80px離れた所で切れた');
  await m.move(g.l, g.sy); await m.down(); await m.move(g.r, g.sy, { steps: 10 }); await m.up(); await sleep(30);
  assert.equal(await nOf(page), 6);
  assert.deepEqual(await page.evaluate(() => window.__itazu.st.on), [false, false, false, false, false, false]);
  await page.waitForFunction(() => { const on = window.__itazu.st.on; return on.length === 6 && on.every(v => v === true); }, { polling: 20, timeout: 2000 });
  assert.deepEqual(errors, []);
});

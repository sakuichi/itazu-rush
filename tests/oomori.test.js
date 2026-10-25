// いたずラッシュ大盛り！：タイトル画面、ランダム20本の出し方、図鑑の分け方、挑戦状
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { launch, waitMode, quit, captureShare, ACTS, sleep } = require('./helpers');
const { ROOT, OOMORI_DIR, OOMORI_SITE, KEYS, openOomori, openOld } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('大盛りのタイトル画面：タイトル、30種と？？？、全30種から20本、図鑑0/51が出て、エラーがない', async () => {
  const { page, errors } = await openOomori(browser);
  assert.equal(await page.title(), 'いたずラッシュ大盛り！');
  const chips = await page.$$eval('#chips li', ls => ls.map(l => l.textContent));
  assert.deepEqual(chips, ['ティッシュ', 'トイレットペーパー', '障子', '歯みがき粉', 'シャンプー', '泥んこ足', 'おもちゃ箱', '水たまり', 'ホース', 'エレベーター',
    '落書き', '炭酸', 'プリン', 'シール', '靴飛ばし', 'カレンダー', '掃除機', '布団', '新聞', 'シャボン玉',
    'ピアノ', '枕', 'ソファ', '電気のスイッチ', '毛糸玉',
    '押し入れ', 'ロールスクリーン', '風船', '時計', 'ハンコ', '？？？']);
  assert.equal(await page.$eval('#startSub', e => e.textContent), '全30種から20本');
  assert.equal(await page.$eval('#zukanCount', e => e.textContent), '0/51');
  assert.deepEqual(errors, []);
});

test('ランダム20本：直前と同じステージが続かず、同じステージは最大2回（50回取り出して確かめる）', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 50 }, () => window.__itazu.sampleOrder(20)));
  const seen = new Set();
  orders.forEach((o, i) => {
    assert.equal(o.length, 20, `${i}回目の本数`);
    for (const k of o) { assert.ok(KEYS.includes(k), `${i}回目に知らないキー ${k}`); seen.add(k); }
    for (let j = 1; j < o.length; j++) assert.notEqual(o[j], o[j - 1], `${i}回目の${j}本目と${j + 1}本目が同じ（${o.join(',')}）`);
    const cnt = {}; for (const k of o) cnt[k] = (cnt[k] || 0) + 1;
    for (const [k, n] of Object.entries(cnt)) assert.ok(n <= 2, `${i}回目に ${k} が${n}回（${o.join(',')}）`);
  });
  assert.deepEqual([...seen].sort(), KEYS.slice().sort(), '50回のうちに全30種が出ていない');
  assert.equal(await page.evaluate(() => window.__itazu.mode), 'title', '順番を取り出しただけでゲームが始まった');
});

test('ランダム20本：何回か取り出すと、順番は毎回違う', async () => {
  const { page } = await openOomori(browser);
  const orders = await page.evaluate(() => Array.from({ length: 5 }, () => window.__itazu.sampleOrder(20).join(',')));
  assert.equal(new Set(orders).size, 5, orders.join('\n'));
});

test('図鑑：大盛りと既存版で別々に保存され、互いの数に混ざらない', async () => {
  const b = await launch(); // 図鑑を空の状態から確かめるため、専用のブラウザで開く
  try {
    // 大盛りで「各階停止」を取る
    const g = await openOomori(b);
    const { page } = g;
    await page.evaluate(() => window.__itazu.force(['elev']));
    await page.click('#endlessBtn');
    await waitMode(page, 'play'); await sleep(150);
    const bs = await page.evaluate(() => window.__itazu.st.buttons());
    for (const p of bs) await page.mouse.click(p[0], p[1]);
    await waitMode(page, 'prompt', 15000);
    await quit(page);
    assert.ok((await page.evaluate(() => window.__itazu.res)).newZ.includes('各階停止'));
    await page.reload(); await page.waitForFunction(() => !!window.__itazu);
    const oCount = await page.$eval('#zukanCount', e => e.textContent);
    assert.match(oCount, /^[1-9]\d*\/51$/);
    const oZukan = await page.evaluate(() => window.__itazu.zukan);
    assert.ok(oZukan.elev, '大盛りの図鑑に保存されていない');
    const store = await page.evaluate(() => ({ oomori: localStorage.getItem('itazurush-oomori-zukan'), old: localStorage.getItem('itazurush-zukan') }));
    assert.ok(JSON.parse(store.oomori).elev, `itazurush-oomori-zukan: ${store.oomori}`);
    assert.equal(store.old, null, '大盛りで取った項目が既存版のキーに保存された');

    // 同じブラウザで既存版を開くと、大盛りの分は数えられていない。既存版で「各階停止」を取り直せる
    const o = await openOld(b);
    assert.equal(await o.page.$eval('#zukanCount', e => e.textContent), '0/30');
    assert.deepEqual(await o.page.evaluate(() => window.__itazu.zukan), {});
    await o.page.evaluate(() => window.__itazu.force(['elev']));
    await o.page.click('#endlessBtn');
    await waitMode(o.page, 'play'); await sleep(150);
    const bs2 = await o.page.evaluate(() => window.__itazu.st.buttons());
    for (const p of bs2) await o.page.mouse.click(p[0], p[1]);
    await waitMode(o.page, 'prompt', 15000);
    await quit(o.page);
    assert.ok((await o.page.evaluate(() => window.__itazu.res)).newZ.includes('各階停止'), '既存版で新しく登録されなかった（大盛りの分が混ざっている）');

    // 既存版で取った分は、大盛りの数に増えていない
    const g2 = await openOomori(b);
    assert.equal(await g2.page.$eval('#zukanCount', e => e.textContent), oCount);
    assert.deepEqual(await g2.page.evaluate(() => window.__itazu.zukan), oZukan);
  } finally {
    await b.close();
  }
});

test('挑戦状：大盛りの周回モードでコピーした文の最後が /oomori/c/段階.html?vs=怒られ度', async () => {
  const g = await openOomori(browser);
  const { page } = g;
  await captureShare(page);
  await page.evaluate(() => window.__itazu.force(['tissue']));
  await page.click('#startBtn');
  await waitMode(page, 'play'); await sleep(150);
  await ACTS.tissue(page, g.W, g.H);
  await waitMode(page, 'prompt', 15000);
  await quit(page);
  await sleep(300);
  const res = await page.evaluate(() => window.__itazu.res);
  const tier = await page.evaluate(a => window.__itazu.tierOf(a), res.angry);
  await page.click('#copyPost');
  const copied = await page.evaluate(() => window.__copied);
  assert.ok(copied.endsWith(`\n${OOMORI_SITE}c/${tier}.html?vs=${res.angry}`), copied);
});

test('挑戦状の入口ページ：oomori/c/0〜5.html が大盛りに転送し、段階ごとのカード画像を指す', async () => {
  const page = await browser.newPage();
  for (let i = 0; i <= 5; i++) {
    const file = path.join(ROOT, 'oomori', 'c', i + '.html');
    assert.ok(fs.existsSync(file), `${file} がない`);
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes("location.replace('../' + location.search)"), `${i}.html の転送`);
    const img = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    assert.equal(img && img[1], `${OOMORI_SITE}c/${i}.png`, `${i}.html の og:image`);
    // 開くと ../（大盛りのフォルダ）へ、?vs= を付けたまま移る
    await page.goto('file:///' + file.split(path.sep).join('/') + '?vs=' + (i * 50), { waitUntil: 'load' }).catch(() => {});
    await page.waitForFunction(() => !/\/c\/\d\.html$/.test(location.pathname), { timeout: 5000 });
    assert.equal(page.url(), `${OOMORI_DIR}?vs=${i * 50}`);
  }
});

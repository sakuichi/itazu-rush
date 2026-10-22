// 画面の初期状態と、データ（曲・判定の境目・図鑑）の確認
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, open } = require('./helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('タイトル画面：10種のいたずらと？？？、周回モードの説明、図鑑0/30が出て、エラーがない', async () => {
  const { page, errors } = await open(browser);
  const chips = await page.$$eval('#chips li', ls => ls.map(l => l.textContent));
  assert.deepEqual(chips, ['ティッシュ', 'トイレットペーパー', '障子', '歯みがき粉', 'シャンプー', '泥んこ足', 'おもちゃ箱', '水たまり', 'ホース', 'エレベーター', '？？？']);
  assert.equal(await page.$eval('#startSub', e => e.textContent), '全10種を2周');
  assert.equal(await page.$eval('#zukanCount', e => e.textContent), '0/30');
  assert.equal(await page.$eval('#soundChk', e => e.checked), true);
  assert.equal(await page.$eval('#recChk', e => e.checked), true, '録画ははじめからオン');
  assert.equal(await page.$eval('#challenge', e => e.hidden), true, '挑戦状なしで開いたら案内は出ない');
  assert.deepEqual(errors, []);
});

test('録画のオン・オフは覚えておく', async () => {
  const { page } = await open(browser);
  await page.click('#recChk');
  await page.reload(); await page.waitForFunction(() => !!window.__itazu);
  assert.equal(await page.$eval('#recChk', e => e.checked), false);
  await page.click('#recChk');
  await page.reload(); await page.waitForFunction(() => !!window.__itazu);
  assert.equal(await page.$eval('#recChk', e => e.checked), true);
});

test('判定の境目：1・40・90・180・300%で段階が上がる', async () => {
  const { page } = await open(browser);
  const tiers = await page.evaluate(() => [0, 1, 39, 40, 89, 90, 179, 180, 299, 300, 999].map(a => window.__itazu.tierOf(a)));
  assert.deepEqual(tiers, [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test('曲データ：どのステージも、メロディ・ベース・ドラムの長さがそろっている（32拍）', async () => {
  const { page } = await open(browser);
  const songs = await page.evaluate(() => window.__itazu.NORMAL.concat(window.__itazu.BONUS).map(s => ({
    key: s.key, len: s.bgm.len, tracks: s.bgm.tracks.map(t => t.seq.length), drums: s.bgm.drums.map(d => d.length)
  })));
  assert.equal(songs.length, 11);
  for (const s of songs) {
    assert.equal(s.len, 32, s.key);
    for (const n of s.tracks.concat(s.drums)) assert.equal(n, 32, s.key);
  }
});

test('図鑑：30項目で、IDが重ならない', async () => {
  const { page } = await open(browser);
  const ids = await page.evaluate(() => window.__itazu.ZUKAN.map(z => z.id));
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
});

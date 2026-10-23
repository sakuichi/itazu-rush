// ハッシュタグ：大盛りは #いたずラッシュ と #いたずラッシュ大盛り の2つ。既存版は #いたずラッシュ だけのまま（2026-10-23 追加）
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, waitMode, quit, captureShare, ACTS, sleep } = require('./helpers');
const { openOomori, openOld } = require('./oomori-helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// 1本だけ遊んで、結果画面のコピーで投稿文を取る
async function resultText(g, startBtn) {
  const { page } = g;
  await captureShare(page);
  await page.evaluate(() => window.__itazu.force(['tissue']));
  await page.click(startBtn);
  await waitMode(page, 'play'); await sleep(150);
  await ACTS.tissue(page, g.W, g.H);
  await waitMode(page, 'prompt', 15000);
  await quit(page);
  await sleep(300);
  await page.click('#copyPost');
  return page.evaluate(() => window.__copied);
}
async function titleText(g) {
  await captureShare(g.page);
  await g.page.click('#titleCopy');
  return g.page.evaluate(() => window.__copied);
}

test('大盛り：タイトル画面・周回モード・無限モードの投稿文に、#いたずラッシュ と #いたずラッシュ大盛り が両方入る', async () => {
  const texts = {
    title: await titleText(await openOomori(browser)),
    loop: await resultText(await openOomori(browser), '#startBtn'),
    endless: await resultText(await openOomori(browser), '#endlessBtn')
  };
  for (const [k, t] of Object.entries(texts)) {
    assert.match(t, /#いたずラッシュ(\s|$)/, `${k}: ${t}`);
    assert.ok(t.includes('#いたずラッシュ大盛り'), `${k}: ${t}`);
  }
});

test('既存版：投稿文のハッシュタグは #いたずラッシュ だけで、大盛りのタグは入らない', async () => {
  const texts = {
    title: await titleText(await openOld(browser)),
    loop: await resultText(await openOld(browser), '#startBtn'),
    endless: await resultText(await openOld(browser), '#endlessBtn')
  };
  for (const [k, t] of Object.entries(texts)) {
    assert.ok(t.includes('#いたずラッシュ'), `${k}: ${t}`);
    assert.ok(!t.includes('大盛り'), `${k}: ${t}`);
  }
});

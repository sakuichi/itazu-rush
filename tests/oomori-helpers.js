// 「いたずラッシュ大盛り！」（oomori/index.html）のテスト用の共通部品。ブラウザの起動や既存ステージの操作は helpers.js のものを使う
const path = require('path');
const fs = require('fs');
const { waitMode, mode, ACTS, sleep } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const OOMORI_FILE = path.join(ROOT, 'oomori', 'index.html');
const OOMORI_PAGE = fileUrl(OOMORI_FILE);
const OOMORI_DIR = fileUrl(path.join(ROOT, 'oomori')) + '/';
const OLD_PAGE = fileUrl(path.join(ROOT, 'index.html'));
const SITE = 'https://sakuichi.github.io/itazu-rush/';
const OOMORI_SITE = SITE + 'oomori/';

// 既存10種＋新規35種（第1弾5種・第2弾5種・第3弾5種・第4弾5種・第5弾5種・第6弾5種・第7弾5種。この順で #chips に並ぶ）
const OLD_KEYS = ['tissue', 'toilet', 'shoji', 'paste', 'shampoo', 'mud', 'toys', 'puddle', 'hose', 'elev'];
const NEW_KEYS = ['graffiti', 'soda', 'pudding', 'sticker', 'shoe', 'calendar', 'vacuum', 'futon', 'news', 'bubble', 'piano', 'pillow', 'sofa', 'light', 'yarn', 'closet', 'roll', 'balloon', 'clock', 'hanko', 'gift', 'cake', 'bath', 'peel', 'laces', 'umbrella', 'keyboard', 'tabletop', 'cards', 'glue', 'chair', 'hashi', 'aircon', 'ice', 'lids'];
const KEYS = OLD_KEYS.concat(NEW_KEYS);
const NEW_NAMES = { graffiti: '落書き', soda: '炭酸', pudding: 'プリン', sticker: 'シール', shoe: '靴飛ばし', calendar: 'カレンダー', vacuum: '掃除機', futon: '布団', news: '新聞', bubble: 'シャボン玉', piano: 'ピアノ', pillow: '枕', sofa: 'ソファ', light: '電気のスイッチ', yarn: '毛糸玉', closet: '押し入れ', roll: 'ロールスクリーン', balloon: '風船', clock: '時計', hanko: 'ハンコ', gift: '菓子折り', cake: 'ケーキのいちご', bath: '入浴剤', peel: '壁紙', laces: '靴ひも', umbrella: '傘', keyboard: 'キーボード', tabletop: 'テーブルの物', cards: 'トランプ', glue: 'スティックのり', chair: 'パパのいす', hashi: '割り箸', aircon: 'エアコン', ice: '製氷皿の氷', lids: '鍋のふた' };

// ページを開く（既存版の helpers.open と同じ形）。errors にはページ内のエラーがたまる
async function openPage(browser, url, { query = '', width = 390, height = 844 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url + query + '#test', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__itazu, { timeout: 10000 });
  return { page, errors, W: width, H: height };
}
async function openOomori(browser, opts) {
  if (!fs.existsSync(OOMORI_FILE)) throw new Error('大盛りのページがありません（未実装）: ' + OOMORI_FILE);
  return openPage(browser, OOMORI_PAGE, opts);
}
const openOld = (browser, opts) => openPage(browser, OLD_PAGE, opts);

// 新規の操作（人の指の動きをマウスでまねる）
const NEW_ACTS = {
  // 画面の中ほどを押したまま、ジグザグに自由になぞる
  async graffiti(p, W, H) {
    const m = p.mouse; await m.move(W * 0.15, H * 0.3); await m.down();
    for (let i = 0; i < 6; i++) { await m.move(W * 0.85, H * (0.32 + i * 0.07), { steps: 8 }); await m.move(W * 0.15, H * (0.35 + i * 0.07), { steps: 8 }); }
    await m.up();
  },
  // 押したまま上下に激しく振ってから離し、タップでフタを開けて、噴き出すのを待つ
  async soda(p, W, H) {
    const m = p.mouse; await m.move(W / 2, H * 0.55); await m.down();
    for (let i = 0; i < 8; i++) { await m.move(W / 2, H * 0.4, { steps: 3 }); await m.move(W / 2, H * 0.7, { steps: 3 }); }
    await m.up(); await sleep(100);
    await m.click(W / 2, H * 0.55);
    await sleep(1000);
  },
  // 下から上へすばやくスワイプして1口ずつすくう（3口で1個）
  async pudding(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 6; i++) { await m.move(W / 2, H * 0.75); await m.down(); await m.move(W / 2, H * 0.45, { steps: 3 }); await m.up(); await sleep(250); }
  },
  // 下のシートから上の家具までドラッグして貼る
  async sticker(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 5; i++) { await m.move(W / 2, H * 0.85); await m.down(); await m.move(W * (0.25 + i * 0.12), H * (0.3 + (i % 3) * 0.1), { steps: 6 }); await m.up(); await sleep(80); }
  },
  // 下中央から真上へすばやくフリックして、正面の家の屋根へ靴を3回飛ばす
  async shoe(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.8); await m.down(); await m.move(W / 2, H * 0.55, { steps: 2 }); await m.up(); await sleep(600); }
  },
  // カレンダーのページを押して、下へ引っぱる（1回で1枚）を6回
  async calendar(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 6; i++) { await m.move(W / 2, H * 0.4); await m.down(); await m.move(W / 2 + (i % 3 - 1) * 20, H * 0.4 + 120, { steps: 5 }); await m.up(); await sleep(60); }
  },
  // 押したまま、画面を左右に何往復かなぞって、床の物を吸う
  async vacuum(p, W, H) {
    const m = p.mouse; await m.move(W * 0.1, H * 0.22); await m.down();
    for (let i = 0; i < 4; i++) { await m.move(W * 0.9, H * (0.22 + i * 0.13), { steps: 12 }); await m.move(W * 0.1, H * (0.28 + i * 0.13), { steps: 12 }); }
    await m.up();
  },
  // 1回タップして跳び始め、着地の直前を狙って4回タップする
  async futon(p, W, H) {
    const m = p.mouse; await m.click(W / 2, H * 0.6);
    for (let i = 0; i < 4; i++) {
      const ok = await p.waitForFunction(() => { const st = window.__itazu.st; return st.key !== 'futon' || st.landIn() < 0.07; }, { polling: 'raf', timeout: 3000 }).then(() => p.evaluate(() => window.__itazu.st.key === 'futon')).catch(() => false);
      if (!ok) return; // 時間切れで次のステージに変わった
      await m.click(W / 2, H * 0.6); await sleep(120);
    }
  },
  // 新聞を下のほうから横に4回なぞる（少しずつ上へずらす）
  async news(p, W, H) {
    const m = p.mouse;
    for (const y of [0.7, 0.62, 0.55, 0.48]) { await m.move(W * 0.1, H * y); await m.down(); await m.move(W * 0.9, H * y, { steps: 15 }); await m.up(); }
  },
  // 押したまま、左上の食器棚から右のテレビへ向きを変えながら吹く
  async bubble(p, W, H) {
    const m = p.mouse; await m.move(W * 0.2, H * 0.45); await m.down();
    await m.move(W * 0.8, H * 0.4, { steps: 30 }); await sleep(800); await m.up(); await sleep(600);
  },
  // 鍵盤（画面の下のほう）を左右に3回なぞる
  async piano(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W * 0.06, H * 0.8); await m.down(); await m.move(W * 0.94, H * 0.8, { steps: 14 }); await m.up(); }
  },
  // 枕をつかんで、左右の壁に何回かぶつける
  async pillow(p, W, H) {
    const m = p.mouse; await m.move(W * 0.3, H * 0.75); await m.down();
    for (let i = 0; i < 3; i++) { await m.move(W + 40, H * 0.5, { steps: 3 }); await m.move(-40, H * 0.45, { steps: 5 }); }
    await m.up();
  },
  // 背もたれの破れ目のあたりを、左右に何往復もほじる
  async sofa(p, W, H) {
    const m = p.mouse; await m.move(W * 0.4, H * 0.38); await m.down();
    for (let i = 0; i < 12; i++) await m.move(i % 2 ? W * 0.4 : W * 0.6, H * 0.38, { steps: 3 });
    await m.up();
  },
  // 押したまま上下に何回もはじく
  async light(p, W, H) {
    const m = p.mouse; await m.move(W * 0.5, H * 0.5); await m.down();
    for (let i = 0; i < 8; i++) await m.move(W * 0.5, i % 2 ? H * 0.5 : H * 0.58, { steps: 2 });
    await m.up();
  },
  // 毛糸玉を、向きを変えて3回はじく
  async yarn(p, W, H) {
    const m = p.mouse;
    for (const [dx, dy] of [[60, -200], [-200, -60], [150, 120]]) { await m.move(W * 0.5, H * 0.6); await m.down(); await m.move(W * 0.5 + dx, H * 0.6 + dy, { steps: 3 }); await m.up(); await sleep(200); }
  },
  // いちばん下の布団（棚の上）を押して、左右へ交互に3回引き抜く
  async closet(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W * 0.4, H * 0.48); await m.down(); await m.move(W * (i % 2 ? 0.05 : 0.8), H * 0.48, { steps: 4 }); await m.up(); await sleep(550); }
  },
  // スクリーンを下へ大きく引っぱって離す（巻き上がってバチン）を3回
  async roll(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.3); await m.down(); await m.move(W / 2, H * 0.62, { steps: 4 }); await m.up(); await sleep(450); }
  },
  // 押したまま上下に20往復して、空気入れを押す
  async balloon(p, W, H) {
    const m = p.mouse; await m.move(W * 0.78, H * 0.55); await m.down();
    for (let i = 0; i < 20; i++) { await m.move(W * 0.78, H * 0.75, { steps: 2 }); await m.move(W * 0.78, H * 0.55, { steps: 2 }); }
    await m.up();
  },
  // 時計の真ん中のまわりを、時計回りに5周なぞる
  async clock(p, W, H) {
    const m = p.mouse, cx = W / 2, cy = H * 0.5, r = 110; await m.move(cx + r, cy); await m.down();
    for (let i = 1; i <= 80; i++) { const a = i / 16 * Math.PI * 2; await m.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    await m.up();
  },
  // 書類のあちこちを28回タップしてハンコを押す
  async hanko(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 28; i++) await m.click(W * (0.2 + (i % 5) * 0.15), H * (0.25 + Math.floor(i / 5) * 0.08));
  },
  // 菓子折りを押して、上へ大きく引っぱる×6
  async gift(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 6; i++) { await m.move(W / 2, H * 0.5); await m.down(); await m.move(W / 2, H * 0.3, { steps: 4 }); await m.up(); await sleep(400); }
  },
  // ケーキのいちご（まわりに6個）を順につまんで、上へ引っぱる。6個食べたら次のケーキが来るのを待つ
  async cake(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 9; i++) {
      const a = (i % 6) / 6 * Math.PI * 2, x = W / 2 + Math.cos(a) * 120, y = H * 0.36 + Math.sin(a) * 58 - 12;
      await m.move(x, y); await m.down(); await m.move(x, y - 90, { steps: 4 }); await m.up(); await sleep(60);
      if (i === 5) await sleep(800);
    }
  },
  // かごの前から、上へ投げる×7
  async bath(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 7; i++) { const x = W * (0.3 + (i % 3) * 0.2); await m.move(x, H * 0.86); await m.down(); await m.move(x, H * 0.7, { steps: 3 }); await m.up(); await sleep(120); }
  },
  // 壁紙（1面3枚）を1列ずつ下へなぞる。1面はがしたら、となりの壁に移るのを待ってもう1面
  async peel(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 6; i++) {
      const x = W * ((i % 3) + 0.5) / 3; await m.move(x, H * 0.15); await m.down(); await m.move(x, H * 0.75, { steps: 6 }); await m.up(); await sleep(80);
      if (i === 2) await sleep(800);
    }
  },
  // 玄関の靴（上の列4つ・下の列4つ）を、一筆で次々なぞる
  async laces(p, W, H) {
    const m = p.mouse, y1 = H * 0.3 + 0.22 * H * 0.54, y2 = H * 0.3 + 0.56 * H * 0.54, xs = [0.15, 0.37, 0.63, 0.85].map(k => W * k);
    await m.move(xs[0], y1); await m.down();
    for (const x of xs.slice(1)) await m.move(x, y1, { steps: 6 });
    await m.move(xs[3], y2, { steps: 6 });
    for (const x of xs.slice(0, 3).reverse()) await m.move(x, y2, { steps: 6 });
    await m.move(xs[1], y1, { steps: 6 });
    await m.up();
  },
  // どこでも上へはじく×7（傘立ての傘が飛び出して開く）
  async umbrella(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 7; i++) { const x = W * (0.3 + (i % 3) * 0.2); await m.move(x, H * 0.7); await m.down(); await m.move(x, H * 0.6, { steps: 3 }); await m.up(); await sleep(120); }
  },
  // キーボード（JIS配列）の上から2段目 Q〜P を順につまんで、上へ引っぱる
  async keyboard(p, W, H) {
    const m = p.mouse, u = Math.min(W * 0.95 / 15.5, 40), x0 = (W - u * 15.5) / 2, y = H * 0.52 + u * 1.75;
    for (let i = 0; i < 10; i++) { const x = x0 + u * (0.25 + 1.5 + i + 0.5); await m.move(x, y); await m.down(); await m.move(x, y - 50, { steps: 4 }); await m.up(); await sleep(40); }
  },
  // テーブル（4区画）の物を、近いほうのふちへ押す。次の物が置かれるのを待って、もう1回り
  async tabletop(p, W, H) {
    const m = p.mouse, lx = W * 0.08, rx = W * 0.92, step = (rx - lx) / 4, y = H * 0.5 - 8;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < 4; i++) { const x = lx + step * (i + 0.5), dir = i < 2 ? -1 : 1; await m.move(x, y); await m.down(); await m.move(x + dir * 220, y, { steps: 8 }); await m.up(); await sleep(60); }
      await sleep(1200);
    }
  },
  // トランプの山を押して、下へ引いて離す×3
  async cards(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 3; i++) { await m.move(W / 2, H * 0.6); await m.down(); await m.move(W / 2, H * 0.6 + 100, { steps: 4 }); await m.up(); await sleep(200); }
  },
  // 左右にこすって、のりをくり出す
  async glue(p, W, H) {
    const m = p.mouse;
    await m.move(W * 0.3, H * 0.7); await m.down();
    for (let i = 0; i < 16; i++) await m.move(i % 2 ? W * 0.3 : W * 0.7, H * 0.7, { steps: 4 });
    await m.up();
  },
  // 左右に大きくこすって、いすを回す。回りきるのを待つ
  async chair(p, W, H) {
    const m = p.mouse;
    await m.move(W * 0.2, H * 0.5); await m.down();
    for (let i = 0; i < 6; i++) await m.move(i % 2 ? W * 0.2 : W * 0.8, H * 0.5, { steps: 5 });
    await m.up(); await sleep(2500);
  },
  // 下へ引っぱって割る×10
  async hashi(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 10; i++) { await m.move(W / 2, H * 0.45); await m.down(); await m.move(W / 2, H * 0.45 + 70, { steps: 3 }); await m.up(); await sleep(260); }
  },
  // どこでも連打×16（▼。28℃から16℃まで下げきると、となりの部屋へ）
  async aircon(p, W, H) {
    for (let i = 0; i < 16; i++) { await p.mouse.click(W / 2, H * 0.78); await sleep(60); }
  },
  // 床に落ちてきた氷を、近いものから順にはじく×10
  async ice(p, W, H) {
    const m = p.mouse;
    for (let i = 0; i < 10; i++) {
      const c = await p.evaluate(() => { const c = window.__itazu.st.cubes.find(c => !c.done && c.drop <= 0); return c ? [c.x, c.y] : null; });
      if (!c) { await sleep(300); continue; }
      await m.move(c[0], c[1]); await m.down(); await m.move(c[0] + 60, c[1] + 30, { steps: 2 }); await m.up(); await sleep(60);
    }
  },
  // 横に往復×8（向きを変えるたびに1回鳴る）
  async lids(p, W, H) {
    const m = p.mouse;
    await m.move(W * 0.3, H * 0.6); await m.down();
    for (let i = 0; i < 8; i++) await m.move(i % 2 ? W * 0.3 : W * 0.7, H * 0.6, { steps: 4 });
    await m.up();
  }
};
const OACTS = Object.assign({}, ACTS, NEW_ACTS);

// 大盛りの無限モードで1ステージだけ遊ぶ。プレイ中の結果の文字列と、時間切れ時・次の画面直前の文字列を返す（helpers.playOne と同じ形）
async function playOneOomori(browser, key, opts = {}) {
  const g = await openOomori(browser, opts);
  const { page } = g;
  await page.evaluate(k => window.__itazu.force([k]), key);
  await page.click('#endlessBtn');
  await waitMode(page, 'play');
  await sleep(150);
  await (opts.act || OACTS[key])(page, g.W, g.H);
  const during = await page.evaluate(() => window.__itazu.st.result());
  await waitMode(page, 'flash', 15000);
  // 結果フラッシュのあいだ、毎フレームの値を記録する（時間切れのあとに増えていないか見るため）
  const flash = await page.evaluate(() => new Promise(res => {
    const vals = [];
    const tick = () => { const T = window.__itazu; if (T.mode === 'flash') { vals.push(T.st.result()); requestAnimationFrame(tick); } else res(vals); };
    tick();
  }));
  return { ...g, during, atFlash: flash[0], endFlash: flash[flash.length - 1] };
}

// 終わるまで遊ぶ。新しいステージが始まるたびに操作する
async function playThrough(page, W, H) {
  const seen = new Set();
  for (;;) {
    const m = await mode(page);
    if (m === 'result') return;
    if (m === 'play') {
      const tag = await page.evaluate(() => window.__itazu.count + '-' + window.__itazu.st.key);
      if (!seen.has(tag)) { seen.add(tag); const key = tag.split('-')[1]; if (OACTS[key]) await OACTS[key](page, W, H); }
    }
    await sleep(100);
  }
}
// 録画できた動画の長さ（秒）と大きさ
const videoInfo = page => page.evaluate(async () => {
  const b = window.__itazu.recBlob; if (!b) return null;
  const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(b);
  await new Promise(r => { v.onloadedmetadata = r; });
  if (v.duration === Infinity) { v.currentTime = 1e9; await new Promise(r => { v.ontimeupdate = r; }); }
  return { size: b.size, duration: v.duration, width: v.videoWidth };
});
const waitVideo = page => page.waitForFunction(() => !!window.__itazu.recBlob, { timeout: 20000, polling: 100 });

module.exports = {
  ROOT, OOMORI_PAGE, OOMORI_DIR, OLD_PAGE, SITE, OOMORI_SITE, OLD_KEYS, NEW_KEYS, KEYS, NEW_NAMES,
  openOomori, openOld, NEW_ACTS, OACTS, playOneOomori, playThrough, videoInfo, waitVideo
};

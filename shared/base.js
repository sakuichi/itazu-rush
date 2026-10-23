// いたずラッシュの共通部分（画面・音・BGM）。既存版（/index.html）と大盛り（/oomori/index.html）の両方で使う。
// 読み込み順: base.js → stages.js →（stages-extra.js）→ game.js。ファイルをまたいでトップレベルの const を共有するため、IIFE で囲まない。
'use strict';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const INK = '#231b2e', PAPER = '#fffdf5', POP = '#ffd23f', POP2 = '#ffb81f', HOT = '#ff5a4e';
const DISPLAY = '"Dela Gothic One","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';
const BODY = '"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0, DPR = 1;
function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.max(1, Math.round(W * DPR));
  cv.height = Math.max(1, Math.round(H * DPR));
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
resize();

const rnd = (a, b) => a + Math.random() * (b - a);
const sr = s => { const x = Math.sin(s * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function bigText(str, x, y, size, fill, stroke, maxW) {
  ctx.save();
  ctx.font = `${size}px ${DISPLAY}`;
  if (maxW) {
    const m = ctx.measureText(str).width;
    if (m > maxW) { size = size * maxW / m; ctx.font = `${size}px ${DISPLAY}`; }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (stroke) { ctx.lineWidth = size * 0.2; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill; ctx.fillText(str, x, y);
  ctx.restore();
}
function finger(x, y, a) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fillStyle = PAPER; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}

/* ---------- 音 ---------- */
/* 経路: 効果音・BGM → bus →（スピーカー用ゲイン → スピーカー）と（録画用の出力）。
   音を出さない設定はスピーカー用ゲインを0にするだけで、音そのものは作り続ける（録画には入る） */
let AC = null, noiseBuf = null, bus = null, spk = null, bgmBus = null, recDest = null, soundOn = true;
try { soundOn = localStorage.getItem('itazurush-sound') !== '0'; } catch (e) {}
function initAudio() {
  if (AC) { if (AC.state !== 'running') AC.resume(); return; } // iOSは共有シートなどの後に "interrupted" になる
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.5), AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    bus = AC.createGain(); bus.gain.value = 1.2;
    // 音を大きくした分、重なったときに割れないようにリミッターをはさむ
    const lim = AC.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
    bus.connect(lim);
    spk = AC.createGain(); spk.gain.value = soundOn ? 1 : 0;
    lim.connect(spk); spk.connect(AC.destination);
    bgmBus = AC.createGain(); bgmBus.gain.value = 0.55; bgmBus.connect(bus);
    try {
      recDest = AC.createMediaStreamDestination(); lim.connect(recDest);
      // 録画用の音声を途切れさせないための、聞こえない音（スピーカーには流さない）。無音区間で音声データが抜けると動画の音がズレる
      const ka = AC.createOscillator(), kg = AC.createGain();
      ka.frequency.value = 20; kg.gain.value = 0.0005; ka.connect(kg); kg.connect(recDest); ka.start();
    } catch (e) { recDest = null; }
  } catch (e) { AC = null; }
}
function noise(dur, freq, q, vol, type, delay) {
  if (!AC) return;
  const t = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
}
function tone(f0, f1, dur, vol, type, delay) {
  if (!AC) return;
  const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  tissue() { noise(0.13, rnd(2600, 3800), 0.7, 0.28); },
  tick() { noise(0.035, rnd(1500, 2100), 3, 0.16); },
  shoji() { noise(0.1, rnd(380, 620), 0.8, 0.5, 'lowpass'); tone(150, 60, 0.09, 0.2, 'sine'); },
  slide() { noise(0.25, 900, 0.6, 0.25); tone(90, 70, 0.2, 0.15, 'triangle'); },
  refill() { tone(660, 990, 0.12, 0.1); },
  prompt() { tone(660, 660, 0.08, 0.1); tone(880, 880, 0.12, 0.1, 'square', 0.09); },
  flash() { tone(523, 523, 0.09, 0.1); tone(784, 784, 0.16, 0.1, 'square', 0.09); },
  final() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 0.1, 'square', i * 0.11)); },
  rare() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, f, 0.1, 0.08, 'square', i * 0.06)); noise(0.4, 6000, 1, 0.08, 'highpass', 0.3); },
  row() { tone(1200, 1200, 0.04, 0.05, 'square'); },
  stamp() { tone(170, 55, 0.22, 0.4, 'sine'); noise(0.14, 500, 0.7, 0.45, 'lowpass'); }
};

/* ---------- BGM（その場で合成する、ステージごとの2小節ループ） ---------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// 音符列: 16分音符1つにつき1語。数字=MIDIノート番号、'-'=前の音をのばす、'.'=休み
function seq(str) {
  const tk = str.trim().split(/\s+/), out = new Array(tk.length).fill(null);
  let last = -1;
  tk.forEach((s, i) => {
    if (s === '-') { if (last >= 0) out[last][1]++; }
    else if (s === '.') last = -1;
    else { out[i] = [+s, 1]; last = i; }
  });
  return out;
}
function song(bpm, tracks, drums, pad) {
  const t = tracks.map(([v, vol, str]) => ({ v, vol, seq: seq(str) }));
  return { bpm, tracks: t, drums, pad, len: t[0].seq.length };
}
function voice(kind, m, t, dur, vol, out) {
  const f = mtof(m);
  const osc = (type, freq, mul, d, a) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * mul, t + (a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.03);
    return o;
  };
  switch (kind) {
    case 'pluck': osc('triangle', f, 1, Math.max(0.28, dur)); osc('sine', f * 2, 0.45, 0.12); break; // 琴っぽい
    case 'bell': osc('sine', f, 1, 0.7, 0.003); osc('sine', f * 2.76, 0.35, 0.3, 0.003); break;
    case 'ep': osc('sine', f, 1, Math.max(0.45, dur * 1.1), 0.012); osc('triangle', f * 2, 0.16, 0.25, 0.012); break;
    case 'bub': { const o = osc('sine', f, 1, Math.min(0.16, dur)); o.frequency.setValueAtTime(f * 0.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); break; }
    case 'wob': { const o = osc('sine', f, 1, dur * 0.95); o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); osc('triangle', f, 0.4, dur * 0.9); break; }
    default: osc(kind, f, 1, dur * 0.92);
  }
}
function drum(c, t, out) {
  const n = (dur, freq, q, vol, type) => {
    const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; fl.type = type || 'bandpass'; fl.frequency.value = freq; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  };
  const k = (f0, f1, dur, vol) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  };
  switch (c) {
    case 'k': k(150, 45, 0.12, 0.5); break;                              // キック
    case 's': n(0.12, 1800, 0.8, 0.22); k(220, 160, 0.06, 0.12); break; // スネア
    case 'h': n(0.035, 8000, 1, 0.08, 'highpass'); break;               // ハイハット
    case 'o': n(0.16, 7000, 1, 0.07, 'highpass'); break;                // オープンハイハット
    case 'c': n(0.08, 1400, 1.2, 0.25); break;                          // クラップ
    case 't': k(180, 70, 0.22, 0.5); n(0.08, 500, 1, 0.12, 'lowpass'); break; // 太鼓
    case 'r': n(0.03, 2500, 4, 0.25); break;                            // リムショット
    case 'j': n(0.05, 9500, 2, 0.06, 'highpass'); n(0.04, 7000, 3, 0.04); break; // 鈴
  }
}
const music = {
  song: null, out: null, step: 0, next: 0, dur: 0.1, timer: 0,
  start(sg, rate) {
    this.stop();
    if (!AC || !sg) return;
    this.song = sg; this.dur = 60 / (sg.bpm * rate) / 4; this.step = 0; this.next = AC.currentTime + 0.05;
    this.out = AC.createGain(); this.out.gain.value = 1; this.out.connect(bgmBus);
    this.timer = setInterval(() => this.pump(), 25); this.pump();
  },
  stop() {
    clearInterval(this.timer); this.timer = 0; this.song = null;
    if (this.out && AC) {
      const o = this.out; o.gain.setTargetAtTime(0, AC.currentTime, 0.03);
      setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 500);
    }
    this.out = null;
  },
  pump() {
    const s = this.song; if (!s || !AC) return;
    if (this.next < AC.currentTime - 0.2) this.next = AC.currentTime + 0.02; // タブの裏などで遅れたら追いつかせない
    while (this.next < AC.currentTime + 0.12) {
      const i = this.step % s.len, t = this.next, d = this.dur;
      for (const tr of s.tracks) { const ev = tr.seq[i]; if (ev) voice(tr.v, ev[0], t, ev[1] * d, tr.vol, this.out); }
      if (s.pad && i % s.pad.every === 0) {
        for (const m of s.pad.chords[(i / s.pad.every) % s.pad.chords.length]) voice(s.pad.v, m, t, s.pad.every * d, s.pad.vol, this.out);
      }
      for (const dl of s.drums) { const c = dl[i % dl.length]; if (c !== '.') drum(c, t, this.out); }
      this.step++; this.next += d;
    }
  }
};


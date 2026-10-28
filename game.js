/* 중국어 탐험대 · STAGE 02 이름표 마을 (3차시) — 게임 프로그램 (game.js)
   문제·점수·대사는 game-data.js, 온라인 연결은 firebase-config.js에서 고치세요. 이 파일은 고치지 않아도 됩니다. */
(() => {
'use strict';
const D = window.GAME_DATA;
const $ = s => document.querySelector(s);
const Net = window.PandaNet || { enabled:false, push(){}, studentStart(){ return Promise.resolve(null); }, watchBoard(cb){ cb(null); return () => {}; }, onStatus(fn){ fn('off'); }, status(){ return 'off'; }, flush(){} };
const STORE_KEY = D.saveKey || 'panda-lesson3', PREF_KEY = 'panda-stage1-prefs';
const VH = 540, GROUND = 450;
const SOUNDS = D.audio.sounds;
Object.keys(SOUNDS).forEach(id => { if (!SOUNDS[id].file) SOUNDS[id].file = `audio/${id}.mp3`; });
const ZONES = D.zones.map(z => ({ id: z.id, name: z.name, theme: z.theme }));
const MISSIONS = D.zones.flatMap((z, zi) => z.missions.map(m => ({ ...m, zone: zi })));
const BOSS = { id: 'boss', place: D.boss.name, zone: ZONES.length - 1, type: 'boss' };
const ALL = [...MISSIONS, BOSS];
const QUESTION_COUNT = MISSIONS.length + D.boss.rounds.length;
const TONE_DESC = { 1:'높고 평평하게', 2:'중간에서 높게', 3:'낮아졌다 올라오게', 4:'높은 곳에서 아래로' };
const MA = ['ma1','ma2','ma3','ma4'];

/* ================= 스테이지 만들기 =================
   구역마다: 종 + (구덩이 / 계단 발판 / 움직이는 발판 / ? 상자 / 숲속 친구) 패턴
   마지막 구역 끝: 오르막 언덕(중간에 대나무 괴물) + 꼭대기 문 */
const LV = { bells:[], gates:[], platforms:[], movers:[], blocks:[], goldens:[], stars:[], friends:[], signs:[], pits:[], zoneStart:[], zoneEnd:[], bonus:null, width:0, hill:null, boss:null };
function inPit(x){ for (const p of LV.pits) if (x > p[0] && x < p[1]) return true; return false; }
function hillY(x){
  const h = LV.hill; if (!h || x <= h.x0) return GROUND;
  if (x >= h.x1) return GROUND - h.rise;
  const t = (x - h.x0) / (h.x1 - h.x0); return GROUND - h.rise * t * t * (3 - 2*t);
}
function groundAt(x){ return inPit(x) ? null : hillY(x); }
(function build(){
  const SP = 640;
  let x = 0, k = 0;
  const pattern = (bx, zi) => {
    const kind = k++ % 4;
    if (kind === 0){            // ? 상자 + 구덩이 하나 + 바쁜 버섯
      LV.blocks.push({ x: bx + 140, y: 300 }, { x: bx + 182, y: 300 });
      LV.pits.push([bx + 300, bx + 420]);
      LV.stars.push([bx + 330, 350], [bx + 360, 330], [bx + 390, 350]);
      LV.friends.push({ kind: 'walker', from: bx + 450, to: bx + 585, zone: zi });
    } else if (kind === 1){     // 세 단 계단 + 꼭대기 황금 대나무 + 깡충 버섯
      LV.platforms.push({ x: bx + 130, y: 372, w: 110 }, { x: bx + 245, y: 300, w: 110 }, { x: bx + 360, y: 228, w: 120 });
      LV.goldens.push({ x: bx + 420, y: 150 });
      LV.stars.push([bx + 185, 335], [bx + 300, 262], [bx + 380, 190]);
      LV.friends.push({ kind: 'hopper', from: bx + 120, to: bx + 560, zone: zi });
    } else if (kind === 2){     // 넓은 구덩이 + 움직이는 발판 + 하늘에서 떨어지는 버섯
      LV.pits.push([bx + 200, bx + 440]);
      LV.movers.push({ x0: bx + 190, x1: bx + 345, y: 382, w: 110, period: 3.4 });
      LV.stars.push([bx + 250, 330], [bx + 320, 300], [bx + 390, 330]);
      LV.friends.push({ kind: 'dropper', from: bx + 465, to: bx + 585, zone: zi });
    } else {                    // 구덩이 두 개 + 가운데 섬 위 ? 상자
      LV.pits.push([bx + 170, bx + 280], [bx + 380, bx + 490]);
      LV.blocks.push({ x: bx + 310, y: 292 });
      LV.stars.push([bx + 225, 340], [bx + 435, 340], [bx + 540, 405]);
      LV.friends.push({ kind: 'walker', from: bx + 500, to: bx + 590, zone: zi, fast: true });
    }
  };
  ZONES.forEach((z, zi) => {
    LV.zoneStart.push(x);
    const ms = MISSIONS.filter(m => m.zone === zi);
    LV.signs.push({ x: x + (zi ? 150 : 230), name: z.name, zone: zi });
    if (zi === 0){ LV.platforms.push({ x: 300, y: 362, w: 150 }); LV.stars.push([340, 322], [400, 322]); LV.blocks.push({ x: 470, y: 300 }); }
    const first = x + (zi ? 470 : 640);
    const lastZone = zi === ZONES.length - 1;
    ms.forEach((m, i) => {
      const bx = first + i * SP;
      LV.bells.push({ id: m.id, x: bx, zone: zi });
      if (i < ms.length - 1 || !lastZone) pattern(bx, zi);
    });
    const last = first + (ms.length - 1) * SP;
    if (!lastZone){ x = last + SP - 60; LV.zoneEnd.push(x); }
    else {
      LV.stars.push([last + 170, 405], [last + 220, 405]);
      const x0 = last + 330, x1 = x0 + 760, rise = 140;
      LV.hill = { x0, x1, rise };
      LV.signs.push({ x: x0 - 70, name: '오르막 언덕 ↗', zone: zi });
      LV.boss = { x: x0 + 430 };
      [x0 + 120, x0 + 200, x0 + 280].forEach(sx => LV.stars.push([sx, hillY(sx) - 50]));
      const gx = x1 + 150;
      LV.gates.push({ x: gx, zone: zi, name: D.gateName || '꼭대기 문', final: true });
      LV.width = gx + 480; LV.zoneEnd.push(LV.width);
    }
  });
  LV.pits.sort((a, b) => a[0] - b[0]);
})();
const zoneAt = wx => { for (let i = LV.zoneEnd.length - 1; i >= 0; i--) if (wx >= LV.zoneStart[i]) return i; return 0; };

/* ================= 저장 (이 기기 + 온라인) ================= */
/* ================= 저장 (이 기기) ================= */
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch(e){ return null; } },
  save(s){ try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); return true; } catch(e){ return false; } }
};
let prefs = { bgm:45, sfx:70, voice:100, mute:false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch(e){}
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch(e){} };
const emptyRec = () => ({ first:null, firstCorrect:null, tries:0, wrongs:[], points:0, done:false, doneAt:null, target:null });
function newState(name){
  const results = {}; ALL.forEach(m => results[m.id] = emptyRec());
  return { name, tag:String(Math.floor(1000 + Math.random()*9000)), startedAt:Date.now(), learn:0, starPts:0, bumps:0,
           starsTaken:[], stomped:[], blocksUsed:[], goldens:[], falls:0, results, items:[], zonesOpen:[], finished:false, finishedAt:null, x:90 };
}
let S = null;
function summary(){
  const res = {};
  ALL.forEach(m => { const r = S.results[m.id]; res[m.id] = { first: r.first, firstCorrect: r.firstCorrect, tries: r.tries, wrongs: (r.wrongs || []).slice(0, 12), points: r.points, done: r.done,
    ...(m.id === 'boss' ? { rounds: (r.rounds || []).map(x => x ? { first: x.first, firstCorrect: x.firstCorrect, tries: x.tries } : null) } : {}) }; });
  const firstCorrect = MISSIONS.filter(m => S.results[m.id].firstCorrect === true).length + (S.results.boss.rounds || []).filter(x => x && x.firstCorrect).length;
  return { name: S.name, tag: S.tag, lesson: D.lessonId || 'lesson', learn: S.learn, star: S.starPts, total: S.learn + S.starPts,
    bells: MISSIONS.filter(m => S.results[m.id].done).length, bellsTotal: MISSIONS.length, bossDone: !!S.results.boss.done,
    finished: !!S.finished, finishedAt: S.finishedAt || null, startedAt: S.startedAt, firstCorrect, questions: QUESTION_COUNT,
    falls: S.falls || 0, bumps: S.bumps || 0, blocks: (S.blocksUsed || []).length, goldens: (S.goldens || []).length, stomps: (S.stomped || []).length, results: res };
}
const persist = (now) => { if (!S) return; store.save(S); Net.push(summary(), now === true); };
const bellsDone = () => MISSIONS.every(m => S.results[m.id].done);
const zoneDone = () => bellsDone() && S.results.boss.done;
/* ================= 소리 ================= */
const Snd = (() => {
  let ctx = null, master, bgmGain, sfxGain, duck = 1, bgmOn = false, nextNote = 0, step = 0;
  const bad = {}; let lastSource = '';
  function ensure(){
    if (ctx){ if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    apply();
  }
  function apply(){
    if (!ctx) return; const t = ctx.currentTime;
    master.gain.setTargetAtTime(prefs.mute ? 0 : 1, t, .05);
    bgmGain.gain.setTargetAtTime(prefs.bgm/100 * .2 * duck, t, .15);
    sfxGain.gain.setTargetAtTime(prefs.sfx/100 * .6, t, .05);
  }
  const setDuck = d => { duck = d; apply(); };
  function tone(f, start, dur, type='sine', vol=.3, dest=sfxGain, atk=.01){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + atk);
    g.gain.exponentialRampToValueAtTime(.0008, start + dur);
    o.connect(g); g.connect(dest); o.start(start); o.stop(start + dur + .05); return o;
  }
  const hz = n => 440 * Math.pow(2, (n - 69)/12);
  // 배경음악: 오음계 반복 곡 (코드로 직접 생성, 저작권 문제 없음)
  const MEL = [76,79,81,79, 76,74,72,74, 76,79,84,81, 79,76,74,-1, 72,74,76,79, 81,79,76,74, 72,76,74,72, 69,72,74,-1];
  const BASS = [48,55,45,52, 48,55,43,50];
  function schedule(){
    if (!ctx || !bgmOn) return;
    const spb = 60/112/2;
    while (nextNote < ctx.currentTime + .25){
      const n = MEL[step % MEL.length];
      if (n > 0) tone(hz(n), nextNote, spb*1.6, 'triangle', .16, bgmGain, .02);
      if (step % 4 === 0) tone(hz(BASS[(step/4) % BASS.length]), nextNote, spb*3.6, 'sine', .22, bgmGain, .03);
      if (step % 2 === 1) tone(hz(96), nextNote, .05, 'square', .01, bgmGain, .002);
      nextNote += spb; step++;
    }
  }
  function startBgm(){ ensure(); if (!ctx || bgmOn) return; bgmOn = true; nextNote = ctx.currentTime + .1; setInterval(schedule, 90); }
  const fx = fn => () => { ensure(); if (ctx) fn(ctx.currentTime); };
  const sfx = {
    correct: fx(t => { [72,76,79,84].forEach((n,i) => tone(hz(n), t+i*.07, .35, 'triangle', .25)); tone(hz(96), t+.3, .5, 'sine', .12); }),
    wrong:   fx(t => { tone(hz(64), t, .18, 'sine', .18); tone(hz(60), t+.12, .25, 'sine', .15); }),
    bell:    fx(t => { [[523,.3],[1046,.14],[1568,.08],[2093,.05]].forEach(([f,v]) => tone(f, t, 2.2, 'sine', v, sfxGain, .003)); }),
    star:    fx(t => { tone(hz(88), t, .08, 'square', .045); tone(hz(93), t+.06, .14, 'square', .045); }),
    jump:    fx(t => { const o = tone(300, t, .16, 'sine', .1); o.frequency.exponentialRampToValueAtTime(620, t+.14); }),
    bump:    fx(t => { const o = tone(220, t, .25, 'triangle', .14); o.frequency.exponentialRampToValueAtTime(110, t+.22); }),
    stomp:   fx(t => { tone(hz(67), t, .1, 'square', .06); tone(hz(74), t+.08, .12, 'square', .06); }),
    place:   fx(t => { tone(hz(79), t, .12, 'triangle', .18); }),
    door:    fx(t => { tone(hz(48), t, 1.2, 'sawtooth', .05); [60,64,67,72,76].forEach((n,i) => tone(hz(n), t+.25+i*.12, .8, 'triangle', .16)); }),
    bonus:   fx(t => { [79,83,86,91,95].forEach((n,i) => tone(hz(n), t+i*.06, .3, 'sine', .18)); }),
    fanfare: fx(t => { [[72,0],[76,.15],[79,.3],[84,.45],[79,.7],[84,.85]].forEach(([n,d]) => tone(hz(n), t+d, .5, 'triangle', .22)); }),
    blip:    fx(t => tone(hz(88), t, .06, 'sine', .08))
  };
  // 중국어 음성: ① 녹음 파일 → ② 온라인 음성 → ③ 기기 내장 음성
  // 휴대폰은 화면을 누르기 전에는 소리를 막아요. 첫 터치 때 재생기 하나를 '깨워 두고' 계속 다시 씁니다.
  const SILENT = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  const voiceEl = new Audio(); voiceEl.preload = 'auto';
  try { voiceEl.preservesPitch = true; voiceEl.webkitPreservesPitch = true; } catch(e){}
  let unlocked = false;
  function unlock(){
    ensure();
    if (ctx){ try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch(e){} }
    if (unlocked) return; unlocked = true;
    try {
      voiceEl.muted = true; voiceEl.src = SILENT;
      const p = voiceEl.play();
      if (p && p.then) p.then(() => { voiceEl.pause(); voiceEl.muted = false; }).catch(() => { voiceEl.muted = false; unlocked = false; });
    } catch(e){ unlocked = false; }
    try { if (window.speechSynthesis){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } } catch(e){}
  }
  ['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture:true, passive:true }));
  const errKind = err => !err ? 'load' : err.name === 'NotAllowedError' ? 'blocked' : err.name === 'AbortError' ? 'abort' : 'load';
  function playUrl(url, rate){
    return new Promise((res, rej) => {
      const a = voiceEl; let started = false, done = false;
      const fail = kind => { const e = new Error(kind); e.kind = kind; return e; };
      const fin = (fn, v) => { if (done) return; done = true; clearTimeout(to); a.onerror = a.onended = a.onplaying = null; fn(v); };
      const to = setTimeout(() => { if (!started){ try { a.pause(); } catch(e){} fin(rej, fail('timeout')); } }, 6000);
      try { a.pause(); } catch(e){}
      a.muted = false; a.volume = prefs.mute ? 0 : prefs.voice/100;
      a.onerror = () => fin(rej, fail('load'));
      a.onended = () => fin(res);
      a.onplaying = () => { started = true; clearTimeout(to); a.playbackRate = rate; };
      a.src = url; a.defaultPlaybackRate = rate; a.playbackRate = rate;
      const p = a.play(); if (p && p.catch) p.catch(err => fin(rej, fail(errKind(err))));
    });
  }
  function synth(text, rate){
    return new Promise((res, rej) => {
      const ss = window.speechSynthesis; if (!ss) return rej(new Error('nosynth'));
      const vs = ss.getVoices();
      const v = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || vs.find(v => /cmn/i.test(v.lang));
      if (!v && vs.length) return rej(new Error('novoice'));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; if (v) u.voice = v; u.rate = rate < 1 ? .55 : .85; u.volume = prefs.mute ? 0 : prefs.voice/100;
      u.onend = () => res(); u.onerror = e => rej(e);
      ss.cancel(); ss.speak(u); setTimeout(res, 4500);
    });
  }
  let busy = Promise.resolve();
  async function say(id, slow=false){
    const s = SOUNDS[id]; if (!s) return;
    ensure(); setDuck(.12);
    const rate = slow ? (D.audio.slowRate || .7) : 1;
    const blockedErr = () => { lastSource = 'blocked'; const e = new Error('blocked'); e.kind = 'blocked'; return e; };
    try {
      if (D.audio.useLocalFiles && !bad[id]){
        try { await playUrl(s.file, rate); lastSource = 'file'; return; }
        catch(e){ if (e.kind === 'blocked') throw blockedErr(); if (e.kind === 'load') bad[id] = true; }
      }
      if (D.audio.useOnlineVoice && D.audio.onlineVoiceUrl && !bad.online){
        try { await playUrl(D.audio.onlineVoiceUrl + encodeURIComponent(s.text), rate); lastSource = 'online'; return; }
        catch(e){ if (e.kind === 'blocked') throw blockedErr(); if (e.kind === 'load') bad.online = true; }
      }
      await synth(s.text, rate); lastSource = 'device';
    } catch(e){ if (e.kind !== 'blocked') lastSource = 'fail'; throw e; }
    finally { setTimeout(() => setDuck(1), 250); }
  }
  const sayQ = (id, slow) => (busy = busy.catch(() => {}).then(() => say(id, slow)));
  async function saySeq(ids, slow, gap=420){ for (const id of ids){ await sayQ(id, slow); await new Promise(r => setTimeout(r, gap)); } }
  const retry = () => Object.keys(bad).forEach(k => delete bad[k]);
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  return { ensure, unlock, apply, startBgm, sfx, say:sayQ, saySeq, retry, source:() => lastSource };
})();
const SOURCE_TEXT = {
  file:    ['녹음 파일로 재생 중', true],
  online:  ['임시 음성(온라인 자동 음성, 성조 검수 전)', false],
  device:  ['임시 음성(기기 내장 음성, 성조 검수 전)', false],
  blocked: ['휴대폰이 자동 재생을 막았어요. ▶ 듣기를 눌러 주세요.', false],
  fail:    ['소리를 재생하지 못했어요. 무음 모드와 음량을 확인하고 ↻ 다시를 눌러 주세요.', false]
};
function sourceBadge(){ const v = SOURCE_TEXT[Snd.source()]; if (!v) return '';
  return `<span class="badge-temp ${v[1] ? 'badge-ok' : ''}">${v[1] ? '✔' : '⚠'} ${v[0]}</span>`; }

/* ================= 작은 그림 (성조선, 종, 판다 얼굴) ================= */
function contourSVG(tone, cls='contour', color='#25845f'){
  const X = x => 10 + x*80, Y = l => 52 - (l-1)*10;
  const d = { 1:`M${X(0)} ${Y(5)} L${X(1)} ${Y(5)}`, 2:`M${X(0)} ${Y(3)} L${X(1)} ${Y(5)}`,
              3:`M${X(0)} ${Y(2)} Q${X(.35)} ${Y(.2)} ${X(.5)} ${Y(1.1)} T${X(1)} ${Y(4)}`, 4:`M${X(0)} ${Y(5)} L${X(1)} ${Y(1)}` }[tone];
  const grid = [1,2,3,4,5].map(l => `<line x1="6" x2="94" y1="${Y(l)}" y2="${Y(l)}" stroke="#dbe6d6" stroke-width="1"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 100 60" aria-hidden="true">${grid}<path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
/* 학습용 국기 그림 (기기마다 국기 이모지가 다르게 보여서 직접 그려요) */
function flagSVG(code, cls='flag'){
  const box = inner => `<svg class="${cls}" viewBox="0 0 60 40" role="img" aria-label="${{KR:'한국',CN:'중국',US:'미국',JP:'일본'}[code] || ''} 국기"><rect width="60" height="40" rx="3" fill="#fff" stroke="#c9d3c5"/>${inner}</svg>`;
  if (code === 'JP') return box('<circle cx="30" cy="20" r="9.5" fill="#bc002d"/>');
  if (code === 'CN') return box('<rect width="60" height="40" rx="3" fill="#de2910"/><polygon fill="#ffde00" points="10,5 11.8,10.5 17.5,10.5 12.9,13.9 14.6,19.4 10,16 5.4,19.4 7.1,13.9 2.5,10.5 8.2,10.5"/>'
    + [[20,4],[24,8],[24,14],[20,18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffde00"/>`).join(''));
  if (code === 'US'){ let st = ''; for (let i = 0; i < 13; i += 2) st += `<rect y="${i*40/13}" width="60" height="${40/13}" fill="#b22234"/>`;
    let dots = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) dots += `<circle cx="${3 + c*4.6}" cy="${3 + r*4.6}" r=".9" fill="#fff"/>`;
    return box(st + `<rect width="25" height="21.5" fill="#3c3b6e"/>${dots}`); }
  if (code === 'KR'){
    const bars = (x, y, a, pat) => `<g transform="translate(${x} ${y}) rotate(${a})">${pat.map((b, i) => b ? `<rect x="-5" y="${-4 + i*3}" width="10" height="2" fill="#000"/>` : `<rect x="-5" y="${-4 + i*3}" width="4.3" height="2" fill="#000"/><rect x=".7" y="${-4 + i*3}" width="4.3" height="2" fill="#000"/>`).join('')}</g>`;
    return box(`<g transform="rotate(33.7 30 20)"><circle cx="30" cy="20" r="9" fill="#0047a0"/><path d="M21 20a9 9 0 0 1 18 0a4.5 4.5 0 0 1-9 0a4.5 4.5 0 0 0-9 0z" fill="#cd2e3a"/></g>`
      + bars(11, 8, -56.3, [1,1,1]) + bars(49, 32, -56.3, [0,0,0]) + bars(49, 8, 56.3, [1,0,1]) + bars(11, 32, 56.3, [0,1,0]));
  }
  return '';
}
const bellSVG = done => { const c = done ? '#e3ad1f' : 'rgba(255,255,255,.28)';
  return `<svg viewBox="0 0 24 24"><path d="M12 3a1.5 1.5 0 0 1 1.5 1.5v.4A6 6 0 0 1 18 11v4l2 2.5H4L6 15v-4a6 6 0 0 1 4.5-6.1v-.4A1.5 1.5 0 0 1 12 3z" fill="${c}"/><circle cx="12" cy="20" r="2" fill="${c}"/></svg>`; };
const pandaFaceSVG = () => `<svg viewBox="0 0 84 80" aria-hidden="true"><circle cx="18" cy="16" r="10" fill="#1f2a25"/><circle cx="66" cy="16" r="10" fill="#1f2a25"/>
  <ellipse cx="42" cy="42" rx="31" ry="29" fill="#fff" stroke="#1f2a25" stroke-width="2"/>
  <ellipse cx="29" cy="38" rx="8" ry="10" transform="rotate(-25 29 38)" fill="#1f2a25"/><ellipse cx="55" cy="38" rx="8" ry="10" transform="rotate(25 55 38)" fill="#1f2a25"/>
  <circle cx="30" cy="37" r="3" fill="#fff"/><circle cx="54" cy="37" r="3" fill="#fff"/><ellipse cx="42" cy="47" rx="4" ry="3" fill="#1f2a25"/>
  <ellipse cx="42" cy="54" rx="3.5" ry="2.5" fill="#1f2a25"/><path d="M20 66q22 10 44 0" stroke="#25845f" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const plainPinyin = p => p.normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ================= 캔버스와 배경 ================= */
const canvas = $('#game'), ctx = canvas.getContext('2d');
let VW = 960, scale = 1, dpr = 1, cam = 0, camReady = false;
const THEMES = {
  forest:  { sky:['#86cfe8','#e4f5dc'], sun:'rgba(255,246,206,.95)', far:['#b9dbbf','#a3cfab'], mid:'bamboo', grass:'#69ad55', grassDark:'#56974a', soil:'#8b6b45', soilDark:'#7a5c3a', path:'#e2dac4', cap:'#d9503f' },
  village: { sky:['#f5c58b','#fff2db'], sun:'rgba(255,236,190,.95)', far:['#e6cda6','#d8b88c'], mid:'houses', grass:'#86b85b', grassDark:'#71a24c', soil:'#9a7650', soilDark:'#866341', path:'#ecdcb8', cap:'#e8862f' },
  bridge:  { sky:['#efa07f','#ffe3c6'], sun:'rgba(255,226,170,.95)', far:['#cba9bf','#b38fa9'], mid:'river',  grass:'#7ab25a', grassDark:'#66994a', soil:'#7d5f44', soilDark:'#6b5039', path:'#e0d4bd', cap:'#8a5fbf' }
};
const TW = 1200, layers = {};
const rnd = k => { const s = Math.sin(k*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
function E(g,x,y,rx,ry,rot=0){ g.beginPath(); g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2); g.fill(); }
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function starShape(g,x,y,r,spin=1){ g.save(); g.translate(x,y); g.scale(spin,1); g.beginPath();
  for (let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, rad = i%2 ? r*.45 : r; g.lineTo(Math.cos(a)*rad, Math.sin(a)*rad); }
  g.closePath(); g.fill(); g.restore(); }
function makeLayer(themeName, kind){
  const th = THEMES[themeName], k = scale*dpr;
  const c = document.createElement('canvas'); c.width = Math.ceil(TW*k); c.height = Math.ceil(VH*k);
  const g = c.getContext('2d'); g.scale(k, k);
  const wrap = (fn) => { for (const o of [-TW, 0, TW]){ g.save(); g.translate(o, 0); fn(); g.restore(); } };
  if (kind === 'far'){
    // 두 겹 언덕 (부드러운 곡선)
    [[th.far[0], 300, 70, 300], [th.far[1], 350, 50, 200]].forEach(([col, base, amp, wl], li) => {
      const grd = g.createLinearGradient(0, base - amp, 0, VH); grd.addColorStop(0, col); grd.addColorStop(1, shade(col, -12));
      g.fillStyle = grd;
      wrap(() => { g.beginPath(); g.moveTo(0, VH);
        for (let x = 0; x <= TW; x += 10){ const y = base - amp*(.55 + .45*Math.sin(x/TW*Math.PI*2*(li+2) + li)) - 18*Math.sin(x/TW*Math.PI*2*(li*3+5)); g.lineTo(x, y); }
        g.lineTo(TW, VH); g.closePath(); g.fill(); });
    });
    if (themeName === 'bridge'){ // 먼 탑
      g.fillStyle = shade(th.far[1], -18);
      wrap(() => { [260, 820].forEach(px => { g.fillRect(px, 230, 26, 80); for (let t=0;t<4;t++){ rr(g, px-14+t*3, 230 - t*22, 54 - t*6, 8, 4); g.fill(); g.fillRect(px+4+t*2, 214 - t*22, 18 - t*4, 18); } }); });
    }
  } else {
    if (th.mid === 'bamboo'){
      for (let i = 0; i < 30; i++){
        const x = i*40 + rnd(i)*20, h = 170 + rnd(i+50)*120, w = 8 + rnd(i+9)*4;
        const col = i % 3 ? '#8cbf8a' : '#7fb47e';
        wrap(() => {
          const grd = g.createLinearGradient(x, 0, x+w, 0); grd.addColorStop(0, shade(col, 10)); grd.addColorStop(1, shade(col, -10));
          g.fillStyle = grd; rr(g, x, GROUND - h, w, h + 10, w/2); g.fill();
          g.fillStyle = shade(col, -18); for (let y = GROUND - h + 26; y < GROUND; y += 36) g.fillRect(x - 1, y, w + 2, 2.5);
          g.fillStyle = shade(col, -6);
          for (let l=0;l<3;l++){ const ly = GROUND - h + 14 + l*30, s = l % 2 ? 1 : -1; leaf(g, x + w/2, ly, 22 + rnd(i+l)*8, s*(.5 + rnd(i*l)*.4)); }
        });
      }
    } else if (th.mid === 'houses'){
      for (let i = 0; i < 6; i++){
        const x = i*200 + 20 + rnd(i)*30, w = 120 + rnd(i+3)*40, h = 90 + rnd(i+7)*40, y = GROUND - h;
        wrap(() => {
          g.fillStyle = '#f3e4c9'; rr(g, x, y, w, h + 10, 6); g.fill();
          g.fillStyle = '#e2cfab'; g.fillRect(x, y + h - 14, w, 24);
          g.fillStyle = '#9b4a3a'; g.beginPath(); g.moveTo(x - 18, y + 6); g.quadraticCurveTo(x + w/2, y - 34, x + w + 18, y + 6); g.lineTo(x + w + 8, y - 6); g.quadraticCurveTo(x + w/2, y - 46, x - 8, y - 6); g.closePath(); g.fill();
          g.fillStyle = '#6d3a2e'; g.fillRect(x + w/2 - 14, y + h - 46, 28, 46);
          g.fillStyle = '#c8e0e6'; rr(g, x + 14, y + 24, 26, 22, 4); g.fill(); rr(g, x + w - 40, y + 24, 26, 22, 4); g.fill();
          g.fillStyle = '#e04a3a'; E(g, x + 10, y + 14, 8, 10); E(g, x + w - 10, y + 14, 8, 10);
          g.fillStyle = '#f4c64f'; g.fillRect(x + 4, y + 13, 12, 2); g.fillRect(x + w - 16, y + 13, 12, 2);
        });
      }
      g.strokeStyle = 'rgba(120,70,50,.5)'; g.lineWidth = 1.5;
      wrap(() => { g.beginPath(); for (let x = 0; x <= TW; x += 8) g.lineTo(x, 200 + 18*Math.sin(x/TW*Math.PI*6)); g.stroke();
        for (let x = 40; x < TW; x += 100){ const y = 200 + 18*Math.sin(x/TW*Math.PI*6); g.fillStyle = '#e04a3a'; E(g, x, y + 14, 8, 10); g.fillStyle = '#f4c64f'; g.fillRect(x - 1, y + 22, 2, 8); } });
    } else {
      // 강과 아치 다리, 버드나무
      wrap(() => {
        const grd = g.createLinearGradient(0, 360, 0, GROUND); grd.addColorStop(0, '#9fcfe0'); grd.addColorStop(1, '#6fb0cc');
        g.fillStyle = grd; g.fillRect(0, 372, TW, GROUND - 372 + 10);
        g.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 20; x < TW; x += 90) rr(g, x, 395 + (x % 3)*12, 40, 3, 2), g.fill();
        [180, 760].forEach(bx => {
          g.strokeStyle = '#b4644e'; g.lineWidth = 10; g.beginPath(); g.moveTo(bx, 380); g.quadraticCurveTo(bx + 120, 280, bx + 240, 380); g.stroke();
          g.strokeStyle = '#8d4a39'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + 10, 352); g.quadraticCurveTo(bx + 120, 268, bx + 230, 352); g.stroke();
          for (let p = 0; p <= 8; p++){ const t = p/8, px = bx + 10 + t*220, py = 352 - Math.sin(t*Math.PI)*58; g.fillStyle = '#8d4a39'; g.fillRect(px - 1.5, py - 14, 3, 14); }
        });
        [520, 1080].forEach(tx => {
          g.fillStyle = '#7b5a3e'; g.fillRect(tx, 260, 12, 120);
          g.strokeStyle = '#8fbf6a'; g.lineWidth = 3;
          for (let s = 0; s < 14; s++){ const ox = (s - 7)*9; g.beginPath(); g.moveTo(tx + 6, 250); g.quadraticCurveTo(tx + 6 + ox*1.4, 260, tx + 6 + ox*1.6, 330 + (s%3)*12); g.stroke(); }
          g.fillStyle = '#9ccc76'; E(g, tx + 6, 250, 50, 24);
        });
      });
    }
  }
  return c;
}
function leaf(g, x, y, len, ang){ g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len*.5, -len*.28, len, 0); g.quadraticCurveTo(len*.5, len*.18, 0, 0); g.fill(); g.restore(); }
function shade(hex, amt){ const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, c + amt));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }
function resize(){
  const st = $('#stage').getBoundingClientRect();
  if (!st.width || !st.height) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  VW = Math.max(560, Math.min(1100, VH * st.width / st.height));
  scale = Math.min(st.width / VW, st.height / VH);
  canvas.style.width = Math.round(VW*scale) + 'px'; canvas.style.height = Math.round(VH*scale) + 'px';
  canvas.width = Math.round(VW*scale*dpr); canvas.height = Math.round(VH*scale*dpr);
  Object.keys(THEMES).forEach(t => { layers[t] = { far: makeLayer(t, 'far'), mid: makeLayer(t, 'mid') }; });
}
function drawTheme(g, name, t, alpha){
  const th = THEMES[name]; if (!layers[name]) return;
  g.globalAlpha = alpha;
  const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, th.sky[0]); sky.addColorStop(.7, th.sky[1]); sky.addColorStop(1, th.sky[1]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  const sunG = g.createRadialGradient(VW - 130, 96, 4, VW - 130, 96, 90); sunG.addColorStop(0, th.sun); sunG.addColorStop(.35, th.sun); sunG.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sunG; g.fillRect(VW - 240, 0, 220, 200);
  g.fillStyle = 'rgba(255,255,255,.88)';
  for (let i=0;i<7;i++){ const span = VW + 360, x = (((i*290 + 80) - cam*.06 + t*.006) % span + span) % span - 180, y = 62 + (i%3)*38;
    E(g,x,y,50,17); E(g,x+28,y-11,32,16); E(g,x-30,y+1,28,12); }
  const k = scale*dpr;
  const tile = (img, par) => { const off = ((cam*par) % TW + TW) % TW; for (let x = -off; x < VW; x += TW) g.drawImage(img, x, 0, TW, VH); };
  tile(layers[name].far, .15); tile(layers[name].mid, .45);
  g.globalAlpha = 1;
}
/* ================= 판다 ================= */
const P = { x:90, y:GROUND-56, w:40, h:56, vx:0, vy:0, kx:0, onGround:true, onMover:-1, dead:false, face:1, phase:0, joy:0, invuln:0, coyote:0, jumpBuf:0, sq:1 };
function drawPanda(g, cx, by, o){
  const { face=1, moving=false, inAir=false, joy=0, blink=false, sq=1, phase=0 } = o;
  g.save(); g.translate(cx, by);
  g.fillStyle = 'rgba(20,40,30,.2)'; if (!inAir) E(g, 0, 2, 22*(2 - sq), 5);
  if (blink) g.globalAlpha = .45;
  const jumpY = joy > 0 ? -Math.abs(Math.sin(joy*9))*14 : 0;
  g.translate(0, jumpY); g.scale(face * (1 + (1 - sq)*.6), sq);
  const sw = moving && !inAir ? Math.sin(phase) : 0;
  const ink = '#1f2a25';
  // 다리
  g.fillStyle = ink;
  if (inAir){ rr(g,-15,-18,13,13,6); g.fill(); rr(g,4,-20,13,13,6); g.fill(); }
  else { rr(g,-15 + sw*4,-15,13,15,6); g.fill(); rr(g,3 - sw*4,-15,13,15,6); g.fill(); }
  // 몸
  const body = g.createRadialGradient(-5,-34,4,0,-28,22); body.addColorStop(0,'#ffffff'); body.addColorStop(1,'#e3ebe6');
  g.fillStyle = body; g.strokeStyle = ink; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(0,-28,18.5,17.5,0,0,Math.PI*2); g.fill(); g.stroke();
  g.fillStyle = ink; g.save(); g.translate(6,-30); g.rotate(inAir ? -1.15 : sw*.35); rr(g,-5,-4,10,20,5); g.fill(); g.restore();
  g.fillStyle = '#25845f'; rr(g,-15,-46,31,7.5,3.5); g.fill();
  g.fillStyle = '#1d6b4c'; g.beginPath(); g.moveTo(-10,-41); g.lineTo(-20,-30 - sw*2); g.lineTo(-13,-39); g.fill();
  // 머리
  g.fillStyle = ink; E(g,-8,-72,7.5,7.5); E(g,11,-73,7.5,7.5);
  const head = g.createRadialGradient(-2,-64,4,3,-58,21); head.addColorStop(0,'#ffffff'); head.addColorStop(1,'#e6ede9');
  g.fillStyle = head; g.beginPath(); g.ellipse(3,-58,18.5,16.5,0,0,Math.PI*2); g.fill(); g.stroke();
  g.fillStyle = ink; E(g,11.5,-60,5.2,6.8,.4); E(g,-3,-60,4.2,5.8,-.3);
  g.fillStyle = '#fff'; E(g,12.5,-61.5,1.9,1.9); E(g,-2.4,-61.5,1.5,1.5);
  g.fillStyle = 'rgba(240,140,140,.55)'; E(g,16,-52,3.6,2.2);
  g.fillStyle = ink; E(g,20,-53,3,2.2);
  g.strokeStyle = ink; g.lineWidth = 1.6; g.beginPath();
  if (joy > 0) g.arc(15,-49,3.6,.15,Math.PI-.15); else { g.moveTo(17,-48.5); g.quadraticCurveTo(19,-47,21,-48.5); }
  g.stroke();
  // 잎사귀 모자
  const lf = g.createLinearGradient(0,-90,20,-72); lf.addColorStop(0,'#9fd376'); lf.addColorStop(1,'#5f9e45');
  g.fillStyle = lf; g.beginPath(); g.moveTo(-2,-73); g.quadraticCurveTo(10,-93,25,-82); g.quadraticCurveTo(10,-75,-2,-73); g.fill();
  g.strokeStyle = 'rgba(40,90,40,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0,-74); g.quadraticCurveTo(12,-82,22,-82); g.stroke();
  g.restore();
}

/* ================= 그림: 발판·별·종 ================= */
function drawPlatform(g, p, th){
  const x = p.x - cam; if (x > VW + 50 || x + p.w < -50) return;
  g.fillStyle = 'rgba(20,40,30,.12)'; E(g, x + p.w/2, GROUND + 6, p.w*.42, 5);
  g.strokeStyle = '#6b4b2e'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + 16, p.y + 14); g.lineTo(x + 22, GROUND + 2); g.moveTo(x + p.w - 16, p.y + 14); g.lineTo(x + p.w - 22, GROUND + 2); g.stroke();
  for (let k = 0; k < 2; k++){
    const grd = g.createLinearGradient(0, p.y + k*9, 0, p.y + k*9 + 11); grd.addColorStop(0, k ? '#8cc062' : '#a9d67c'); grd.addColorStop(1, k ? '#6f9f48' : '#7fb355');
    g.fillStyle = grd; rr(g, x, p.y + k*9, p.w, 11, 5.5); g.fill();
  }
  g.fillStyle = 'rgba(40,90,40,.45)'; for (let xx = x + 24; xx < x + p.w - 8; xx += 34) g.fillRect(xx, p.y + 1, 2.5, 18);
  g.fillStyle = '#c99b5b'; rr(g, x + 7, p.y + 3, 7, 13, 3); g.fill(); rr(g, x + p.w - 14, p.y + 3, 7, 13, 3); g.fill();
}
function drawStar(g, x, y, t){
  const sx = x - cam; if (sx < -30 || sx > VW + 30) return;
  const yy = y + Math.sin(t/300 + x)*3, spin = Math.max(.25, Math.abs(Math.cos(t/520 + x/90)));
  const glow = g.createRadialGradient(sx, yy, 2, sx, yy, 24); glow.addColorStop(0, 'rgba(255,230,120,.55)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
  g.fillStyle = glow; g.fillRect(sx - 24, yy - 24, 48, 48);
  const grd = g.createLinearGradient(sx, yy - 13, sx, yy + 13); grd.addColorStop(0, '#ffe57a'); grd.addColorStop(1, '#f2b324');
  g.fillStyle = grd; starShape(g, sx, yy, 13, spin);
  g.fillStyle = 'rgba(255,255,255,.7)'; starShape(g, sx - 2*spin, yy - 3, 4, spin);
}
function drawBell(g, b, done, t, near){
  const x = b.x - cam; if (x < -120 || x > VW + 120) return;
  const y = GROUND;
  if (!done){ const p = (Math.sin(t/320) + 1)/2; const gl = g.createRadialGradient(x, y - 78, 10, x, y - 78, 92 + p*10);
    gl.addColorStop(0, 'rgba(255,240,170,.75)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gl; g.fillRect(x - 110, y - 190, 220, 190); }
  g.fillStyle = 'rgba(20,40,30,.18)'; E(g, x, y + 4, 54, 6);
  const post = g.createLinearGradient(x - 44, 0, x - 34, 0); post.addColorStop(0, '#9d4433'); post.addColorStop(1, '#7a3226');
  g.fillStyle = post; rr(g, x - 45, y - 128, 10, 130, 4); g.fill(); rr(g, x + 35, y - 128, 10, 130, 4); g.fill();
  const roof = g.createLinearGradient(0, y - 160, 0, y - 122); roof.addColorStop(0, '#c9473c'); roof.addColorStop(1, '#962f27');
  g.fillStyle = roof; g.beginPath(); g.moveTo(x - 64, y - 122); g.quadraticCurveTo(x, y - 150, x + 64, y - 122); g.lineTo(x + 54, y - 136); g.quadraticCurveTo(x, y - 162, x - 54, y - 136); g.closePath(); g.fill();
  g.fillStyle = '#f4c64f'; E(g, x - 62, y - 123, 4, 4); E(g, x + 62, y - 123, 4, 4);
  g.fillStyle = '#6b4b2e'; rr(g, x - 40, y - 123, 80, 7, 3); g.fill();
  const sw = near ? Math.sin(t/110)*.2 : Math.sin(t/700)*.05;
  g.save(); g.translate(x, y - 116); g.rotate(sw);
  const bg = g.createLinearGradient(-26, 0, 26, 0);
  if (done){ bg.addColorStop(0, '#c9910f'); bg.addColorStop(.45, '#ffd85a'); bg.addColorStop(1, '#b8860b'); }
  else { bg.addColorStop(0, '#7f7458'); bg.addColorStop(.45, '#b3a684'); bg.addColorStop(1, '#6f6449'); }
  g.fillStyle = done ? '#a8790a' : '#625840'; g.fillRect(-3, 0, 6, 10);
  g.fillStyle = bg; g.beginPath(); g.moveTo(-17, 12); g.quadraticCurveTo(-20, 48, -28, 62); g.lineTo(28, 62); g.quadraticCurveTo(20, 48, 17, 12); g.quadraticCurveTo(0, 3, -17, 12); g.fill();
  g.fillStyle = done ? '#a8790a' : '#625840'; rr(g, -29, 58, 58, 6, 3); g.fill(); E(g, 0, 69, 5, 5);
  g.restore();
  if (!done){
    const by = y - 186 + Math.sin(t/260)*4;
    g.fillStyle = 'rgba(20,40,30,.15)'; rr(g, x - 22, by - 17, 44, 34, 13); g.fill();
    g.fillStyle = '#fff'; rr(g, x - 22, by - 20, 44, 34, 13); g.fill();
    g.beginPath(); g.moveTo(x - 6, by + 13); g.lineTo(x, by + 21); g.lineTo(x + 6, by + 13); g.fill();
    g.fillStyle = '#25845f'; g.font = '700 22px "Do Hyeon", sans-serif'; g.textAlign = 'center'; g.fillText('?', x, by + 5);
  } else { g.fillStyle = '#fff6c9'; starShape(g, x + 32, y - 150 + Math.sin(t/220)*3, 9); }
  const m = MISSIONS.find(m => m.id === b.id);
  g.font = '15px "Gowun Dodum", sans-serif'; const tw = Math.max(96, g.measureText(m.place).width + 26);
  g.fillStyle = 'rgba(22,57,44,.78)'; rr(g, x - tw/2, y + 36, tw, 24, 12); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(m.place, x, y + 53);
}
function drawSign(g, s){
  const x = s.x - cam; if (x < -120 || x > VW + 120) return;
  g.fillStyle = '#6b4b2e'; rr(g, x - 4, GROUND - 92, 8, 94, 3); g.fill();
  g.font = '700 18px "Do Hyeon", sans-serif'; const w = g.measureText(s.name).width + 34;
  const wood = g.createLinearGradient(0, GROUND - 118, 0, GROUND - 84); wood.addColorStop(0, '#c99b5b'); wood.addColorStop(1, '#a87a42');
  g.fillStyle = wood; rr(g, x - w/2, GROUND - 120, w, 36, 9); g.fill();
  g.fillStyle = '#3d2a16'; g.textAlign = 'center'; g.fillText(s.name, x, GROUND - 96);
}
function drawGate(g, gt, t){
  const gx = gt.x - cam; if (gx < -200 || gx > VW + 80) return;
  const y = groundAt(gt.x + 40), open = S.zonesOpen.includes(gt.zone);
  const W = gt.final ? 120 : 92, H = gt.final ? 220 : 188;
  if (open){ const gl = g.createRadialGradient(gx + W/2, y - H/2, 10, gx + W/2, y - H/2, W + 40); gl.addColorStop(0, `rgba(255,236,150,${.55 + Math.sin(t/250)*.15})`); gl.addColorStop(1, 'rgba(255,236,150,0)'); g.fillStyle = gl; g.fillRect(gx - 60, y - H - 60, W + 120, H + 60); }
  const pg = g.createLinearGradient(gx - 10, 0, gx + 6, 0); pg.addColorStop(0, '#c4443a'); pg.addColorStop(1, '#9a3129');
  g.fillStyle = pg; rr(g, gx - 10, y - H, 16, H + 2, 4); g.fill(); rr(g, gx + W - 6, y - H, 16, H + 2, 4); g.fill();
  const rf = g.createLinearGradient(0, y - H - 36, 0, y - H + 4); rf.addColorStop(0, '#8f2f27'); rf.addColorStop(1, '#6d231d');
  g.fillStyle = rf; g.beginPath(); g.moveTo(gx - 36, y - H + 4); g.quadraticCurveTo(gx + W/2, y - H - 26, gx + W + 36, y - H + 4); g.lineTo(gx + W + 22, y - H - 12); g.quadraticCurveTo(gx + W/2, y - H - 42, gx - 22, y - H - 12); g.closePath(); g.fill();
  g.fillStyle = '#f4c64f'; rr(g, gx + 10, y - H + 8, W - 20, 26, 6); g.fill();
  g.fillStyle = '#7d2a24'; g.font = '700 16px "Do Hyeon", sans-serif'; g.textAlign = 'center'; g.fillText(gt.name, gx + W/2, y - H + 27);
  const dx = gx + 6, dw = W - 12, dt = y - H + 40, dh = H - 40;
  if (!open){
    const dg = g.createLinearGradient(dx, 0, dx + dw, 0); dg.addColorStop(0, '#5a3d24'); dg.addColorStop(.5, '#7a5634'); dg.addColorStop(1, '#5a3d24');
    g.fillStyle = dg; g.fillRect(dx, dt, dw, dh);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(dx + dw/2 - 1, dt, 2, dh);
    g.fillStyle = '#e3ad1f'; E(g, dx + dw/2, dt + dh*.45, 10, 10); g.fillRect(dx + dw/2 - 3, dt + dh*.45, 6, 16);
    g.fillStyle = '#fff'; rr(g, dx + 6, dt + 12, dw - 12, 26, 8); g.fill();
    g.fillStyle = '#16392c'; g.font = '14px "Gowun Dodum", sans-serif'; g.fillText('잠겨 있어요', dx + dw/2, dt + 30);
  } else {
    const lg = g.createLinearGradient(0, dt, 0, dt + dh); lg.addColorStop(0, '#fff7cf'); lg.addColorStop(1, '#ffe38a');
    g.fillStyle = lg; g.fillRect(dx, dt, dw, dh);
  }
  if (gt.final){ // 그 뒤의 2단계 문
    const sx = gx + W + 170;
    g.fillStyle = '#9aa39b'; rr(g, sx, y - 150, 100, 152, 14); g.fill();
    g.fillStyle = '#7b847c'; rr(g, sx + 16, y - 128, 68, 130, 30); g.fill();
    g.fillStyle = '#fffdf3'; rr(g, sx - 10, y - 190, 120, 30, 8); g.fill();
    g.fillStyle = '#16392c'; g.font = '700 15px "Do Hyeon", sans-serif'; g.fillText('STAGE 02 🔒', sx + 50, y - 169);
  }
}
function drawBossShape(g, x, y, o){
  const { t = 0, mood = 'grin', hearts = 3, scale: sc = 1, alpha = 1 } = o;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.globalAlpha = alpha;
  const bob = Math.sin(t/260) * 3, laugh = mood === 'laugh' ? Math.sin(t/60) * 2 : 0;
  g.fillStyle = 'rgba(20,40,30,.22)'; E(g, 0, 2, 52, 8);
  // 발
  g.fillStyle = '#3e6b2f'; rr(g, -34, -14, 26, 16, 8); g.fill(); rr(g, 8, -14, 26, 16, 8); g.fill();
  g.translate(laugh, bob);
  // 팔 (대나무 잎)
  const wave = Math.sin(t/220) * .25;
  g.fillStyle = '#5f9e45';
  g.save(); g.translate(-40, -92); g.rotate(-.9 + wave); rr(g, -6, -46, 12, 48, 6); g.fill(); g.fillStyle = '#86c35e'; leaf(g, 0, -44, 26, -1.9); leaf(g, 0, -44, 24, -1.2); g.restore();
  g.fillStyle = '#5f9e45';
  g.save(); g.translate(40, -92); g.rotate(.9 - wave); rr(g, -6, -46, 12, 48, 6); g.fill(); g.fillStyle = '#86c35e'; leaf(g, 0, -44, 26, -1.2); leaf(g, 0, -44, 24, -1.9); g.restore();
  // 몸통: 대나무 마디 3개
  const segs = [[-60, 58], [-112, 54], [-160, 48]];
  segs.forEach(([sy, h], i) => {
    const w = 84 - i*6, grd = g.createLinearGradient(-w/2, 0, w/2, 0);
    grd.addColorStop(0, '#4f8f3c'); grd.addColorStop(.35, '#8fd06a'); grd.addColorStop(1, '#3f7a30');
    g.fillStyle = grd; rr(g, -w/2, sy, w, h, 18); g.fill();
    g.fillStyle = '#2f5f24'; rr(g, -w/2 - 3, sy + h - 6, w + 6, 8, 4); g.fill();
  });
  // 잎 머리
  g.fillStyle = '#6fb34c'; [[-24,-162,-1.9],[-8,-168,-1.6],[10,-168,-1.3],[24,-162,-1.1],[0,-170,-1.57]].forEach(([lx, ly, a]) => leaf(g, lx, ly, 40, a));
  g.fillStyle = '#93d36a'; leaf(g, -2, -168, 30, -1.75); leaf(g, 6, -168, 28, -1.35);
  // 얼굴 (가운데 마디)
  const fy = -88;
  g.fillStyle = '#fff'; E(g, -18, fy, 12, 13); E(g, 18, fy, 12, 13);
  g.fillStyle = '#1f2a25'; const look = mood === 'happy' ? 0 : 2; E(g, -16 + look, fy + 2, 6, 7); E(g, 20 + look, fy + 2, 6, 7);
  g.fillStyle = '#fff'; E(g, -14 + look, fy - 1, 2, 2); E(g, 22 + look, fy - 1, 2, 2);
  g.strokeStyle = '#1f3a1a'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath();
  if (mood === 'happy'){ g.moveTo(-30, fy - 22); g.quadraticCurveTo(-18, fy - 28, -6, fy - 22); g.moveTo(6, fy - 22); g.quadraticCurveTo(18, fy - 28, 30, fy - 22); }
  else { g.moveTo(-30, fy - 26); g.lineTo(-6, fy - 17); g.moveTo(30, fy - 26); g.lineTo(6, fy - 17); }
  g.stroke();
  g.fillStyle = 'rgba(240,140,140,.5)'; E(g, -30, fy + 16, 7, 4); E(g, 30, fy + 16, 7, 4);
  // 입
  g.fillStyle = '#4a1f1a'; g.beginPath();
  if (mood === 'happy'){ g.arc(0, fy + 16, 12, .1, Math.PI - .1); g.fill(); }
  else { g.moveTo(-20, fy + 14); g.quadraticCurveTo(0, fy + 40 + (mood === 'laugh' ? 6 : 0), 20, fy + 14); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-12, fy + 14, 7, 6); g.fillRect(5, fy + 14, 7, 6); }
  g.restore();
  // 하트 대신 잎사귀 3장 (남은 문제)
  if (hearts > 0 && sc === 1){
    for (let i = 0; i < 3; i++){ const hx = x - 26 + i*26, hy = y - 214 + bob;
      g.fillStyle = i < hearts ? '#3fa34d' : 'rgba(255,255,255,.55)'; g.save(); g.translate(hx, hy); g.rotate(-.6); g.beginPath(); g.ellipse(0, 0, 11, 6, 0, 0, Math.PI*2); g.fill(); g.restore(); }
  }
}
function drawBoss(g, t){
  const bx = LV.boss.x - cam; if (bx < -160 || bx > VW + 160) return;
  const done = S.results.boss.done, y = groundAt(LV.boss.x);
  if (!done){
    const near = Math.abs(P.x + P.w/2 - LV.boss.x) < 260;
    drawBossShape(g, bx + 30, y, { t, mood: near ? 'laugh' : 'grin', hearts: 3 - (S.bossRound || 0) });
    if (near && !quizOpen){
      const txt = '하하하! 여기는 못 지나간다!'; g.font = '700 16px "Gowun Dodum", sans-serif'; const w = g.measureText(txt).width + 28;
      const by = y - 250 + Math.sin(t/240)*3;
      g.fillStyle = '#fff'; rr(g, bx + 30 - w/2, by - 22, w, 34, 14); g.fill(); g.beginPath(); g.moveTo(bx + 22, by + 12); g.lineTo(bx + 30, by + 22); g.lineTo(bx + 38, by + 12); g.fill();
      g.fillStyle = '#1f3a1a'; g.textAlign = 'center'; g.fillText(txt, bx + 30, by);
    }
  } else {
    // 길을 비켜 주고 언덕 옆에서 손을 흔들어요
    const sx = bx + 110, sy = groundAt(LV.boss.x + 80);
    drawBossShape(g, sx, sy + 6, { t, mood: 'happy', hearts: 0, scale: .62 });
  }
}
function drawProgress(g, t){
  const x0 = 24, x1 = VW - 24, y = 22, k = (x1 - x0) / LV.width;
  g.fillStyle = 'rgba(255,255,255,.8)'; rr(g, x0 - 10, y - 13, x1 - x0 + 20, 26, 13); g.fill();
  ZONES.forEach((z, zi) => { const a = x0 + LV.zoneStart[zi]*k, b = x0 + LV.zoneEnd[zi]*k;
    g.fillStyle = zi % 2 ? '#d6e3cf' : '#c6d9be'; rr(g, a + 1, y - 3, b - a - 2, 6, 3); g.fill(); });
  g.fillStyle = '#7fb355'; rr(g, x0, y - 3, Math.max(6, (P.x + P.w/2)*k), 6, 3); g.fill();
  const blink = (Math.sin(t/(guide.on ? 120 : 260)) + 1)/2;
  LV.bells.forEach(b => { const d = S.results[b.id].done; g.fillStyle = d ? '#e3ad1f' : `rgba(201,86,75,${.5 + blink*.5})`; const r = d ? 5 : 5 + blink*2; E(g, x0 + b.x*k, y, r, r); });
  { const bxp = x0 + LV.boss.x*k, d = S.results.boss.done; g.fillStyle = d ? '#e3ad1f' : '#2f7d45'; g.save(); g.translate(bxp, y); g.rotate(Math.PI/4); g.fillRect(-6, -6, 12, 12); g.restore(); }
  LV.gates.forEach(gt => { g.fillStyle = S.zonesOpen.includes(gt.zone) ? '#e3ad1f' : '#b23a32'; rr(g, x0 + gt.x*k - 4, y - 8, 8, 16, 2); g.fill(); });
  g.fillStyle = '#16392c'; E(g, x0 + (P.x + P.w/2)*k, y, 7.5, 7.5); g.fillStyle = '#fff'; E(g, x0 + (P.x + P.w/2)*k, y, 3, 3);
}
function drawGuide(g, t){
  if (!guide.on) return;
  const tg = guideTarget(); if (tg == null) return;
  const dir = Math.sign(tg - (P.x + P.w/2)) || 1;
  const px = P.x + P.w/2 - cam + dir*(50 + Math.sin(t/150)*6), py = P.y - 24;
  g.save(); g.translate(px, py); g.scale(dir, 1);
  g.fillStyle = '#ffc93a'; g.strokeStyle = '#16392c'; g.lineWidth = 3; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(22,0); g.lineTo(-4,-18); g.lineTo(-4,-8); g.lineTo(-20,-8); g.lineTo(-20,8); g.lineTo(-4,8); g.lineTo(-4,18); g.closePath(); g.fill(); g.stroke();
  g.restore();
  const msg = guideMsg();
  g.font = '700 18px "Gowun Dodum", sans-serif'; const w = g.measureText(msg).width + 34;
  g.fillStyle = 'rgba(20,40,30,.15)'; rr(g, VW/2 - w/2, 50, w, 38, 19); g.fill();
  g.fillStyle = '#fbfdf8'; rr(g, VW/2 - w/2, 47, w, 38, 19); g.fill();
  g.fillStyle = '#16392c'; g.textAlign = 'center'; g.fillText(msg, VW/2, 72);
}
/* ================= 세계 그리기 ================= */
const SPEEDS = [0, 25, 40, 70, 120, 160];
const friends = LV.friends.map((f, i) => ({ ...f, x: f.kind === 'dropper' ? f.to - 30 : (f.from + f.to)/2, y: GROUND, dir: i % 2 ? 1 : -1, w:42, h:40, stun:0, seed:i,
  spd: f.fast ? 120 : 45, spdT: 0, vy: 0, hopT: 1 + (i % 3) * .5, state: f.kind === 'dropper' ? 'hidden' : 'walk', warnT: 0 }));
let particles = [];
LV.movers.forEach(m => { m.cx = m.x0; m.dx = 0; });
function drawGround(g, th){
  const L = cam - 20, R = cam + VW + 20;
  // 땅 조각(구덩이 사이)
  const solids = []; let s0 = 0;
  LV.pits.forEach(p => { solids.push([s0, p[0]]); s0 = p[1]; }); solids.push([s0, LV.width + 40]);
  // 구덩이: 깊은 그림자
  LV.pits.forEach(p => { const a = p[0] - cam, b = p[1] - cam; if (b < -10 || a > VW + 10) return;
    const pg = g.createLinearGradient(0, GROUND, 0, VH); pg.addColorStop(0, '#2c3b30'); pg.addColorStop(1, '#141c17');
    g.fillStyle = pg; g.fillRect(a, GROUND + 6, b - a, VH - GROUND);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let yy = GROUND + 30; yy < VH; yy += 26) g.fillRect(a + 8, yy, b - a - 16, 2); });
  solids.forEach(([a, b]) => {
    if (b < L || a > R) return;
    const xa = Math.max(a, L), xb = Math.min(b, R), xs = [];
    for (let wx = xa; wx < xb; wx += 8) xs.push(wx); xs.push(xb);
    const band = (o0, o1, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(xs[0] - cam, hillY(xs[0]) + o0);
      xs.forEach(wx => g.lineTo(wx - cam, hillY(wx) + o0));
      for (let i = xs.length - 1; i >= 0; i--) g.lineTo(xs[i] - cam, o1 === 'bottom' ? VH : hillY(xs[i]) + o1); g.closePath(); g.fill(); };
    const grd = g.createLinearGradient(0, GROUND - 140, 0, VH); grd.addColorStop(0, th.soil); grd.addColorStop(1, th.soilDark);
    band(20, 'bottom', grd); band(0, 26, th.grass); band(20, 26, th.grassDark);
    // 절벽 가장자리
    if (a > 0 && a >= L){ g.fillStyle = th.grassDark; rr(g, a - cam - 4, hillY(a) - 2, 12, VH - hillY(a), 6); g.fill(); }
    if (b < LV.width && b <= R){ g.fillStyle = th.grassDark; rr(g, b - cam - 8, hillY(b) - 2, 12, VH - hillY(b), 6); g.fill(); }
    g.fillStyle = th.grass;
    for (let wx = Math.ceil(xa/22)*22; wx < xb - 10; wx += 22) E(g, wx - cam + 11, hillY(wx + 11) + 24, 12, 6);
    g.fillStyle = th.path;
    for (let wx = Math.ceil(xa/74)*74; wx + 60 < xb; wx += 74){
      const cx = wx + 35, ang = Math.atan2(hillY(cx + 10) - hillY(cx - 10), 20);
      g.save(); g.translate(cx - cam, hillY(cx) + 12); g.rotate(ang); rr(g, -27, -5.5, 54, 11, 5.5); g.fill(); g.restore();
    }
  });
  const h = LV.hill;
  if (h){ g.strokeStyle = '#8a6a43'; g.lineWidth = 4; g.lineCap = 'round';
    for (let wx = h.x0 + 40; wx < h.x1 + 120; wx += 46){ const x = wx - cam; if (x < -20 || x > VW + 20) continue; const y = hillY(wx) + 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 26); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); let first = true;
    for (let wx = h.x0 + 40; wx < h.x1 + 120; wx += 6){ const x = wx - cam; if (x < -30 || x > VW + 30){ first = true; continue; } const y = hillY(wx) - 18; if (first){ g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
    g.stroke(); }
}
function moverX(m, t){ return m.x0 + (m.x1 - m.x0) * (.5 - .5 * Math.cos((t/1000) * Math.PI * 2 / m.period)); }
function drawMover(g, m){
  const x = m.cx - cam; if (x > VW + 40 || x + m.w < -40) return;
  g.strokeStyle = 'rgba(80,60,40,.45)'; g.lineWidth = 2; g.setLineDash([5, 6]);
  g.beginPath(); g.moveTo(m.x0 - cam + m.w/2, m.y - 40); g.lineTo(m.x1 - cam + m.w/2, m.y - 40); g.stroke(); g.setLineDash([]);
  g.strokeStyle = '#6b4b2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, m.y); g.lineTo(x + 14, m.y - 40); g.moveTo(x + m.w - 14, m.y); g.lineTo(x + m.w - 14, m.y - 40); g.stroke();
  const grd = g.createLinearGradient(0, m.y, 0, m.y + 16); grd.addColorStop(0, '#d9b071'); grd.addColorStop(1, '#a8793f');
  g.fillStyle = grd; rr(g, x, m.y, m.w, 16, 7); g.fill();
  g.fillStyle = 'rgba(80,50,20,.35)'; for (let xx = x + 18; xx < x + m.w - 6; xx += 22) g.fillRect(xx, m.y + 2, 2, 12);
}
function drawBlock(g, b, i, t){
  const x = b.x - cam; if (x < -50 || x > VW + 50) return;
  const used = S.blocksUsed.includes(i), bump = b.bumpT ? Math.max(0, 1 - (t - b.bumpT)/180) : 0, y = b.y - bump*10;
  const grd = g.createLinearGradient(0, y, 0, y + 40);
  if (used){ grd.addColorStop(0, '#b59b77'); grd.addColorStop(1, '#8c7556'); } else { grd.addColorStop(0, '#ffd85a'); grd.addColorStop(1, '#e09a14'); }
  g.fillStyle = grd; rr(g, x, y, 40, 40, 7); g.fill();
  g.strokeStyle = used ? '#6f5b42' : '#a8650a'; g.lineWidth = 2.5; rr(g, x + 1, y + 1, 38, 38, 7); g.stroke();
  g.fillStyle = used ? 'rgba(255,255,255,.25)' : '#fff8d6'; g.font = '700 24px "Do Hyeon", sans-serif'; g.textAlign = 'center';
  g.fillText(used ? '·' : '?', x + 20, y + 29 + (used ? 0 : Math.sin(t/240) * 1.5));
}
function drawGolden(g, gd, i, t){
  if (S.goldens.includes(i)) return;
  const x = gd.x - cam, y = gd.y + Math.sin(t/300) * 4; if (x < -40 || x > VW + 40) return;
  const gl = g.createRadialGradient(x, y, 4, x, y, 40); gl.addColorStop(0, 'rgba(255,220,90,.7)'); gl.addColorStop(1, 'rgba(255,220,90,0)');
  g.fillStyle = gl; g.fillRect(x - 40, y - 40, 80, 80);
  const gb = g.createLinearGradient(x - 6, 0, x + 6, 0); gb.addColorStop(0, '#c9910f'); gb.addColorStop(.5, '#ffe58a'); gb.addColorStop(1, '#b8860b');
  g.fillStyle = gb; rr(g, x - 6, y - 26, 12, 52, 6); g.fill();
  g.fillStyle = '#a8790a'; g.fillRect(x - 7, y - 6, 14, 3); g.fillRect(x - 7, y + 10, 14, 3);
  g.fillStyle = '#ffd85a'; leaf(g, x + 4, y - 22, 20, -.6); leaf(g, x - 4, y - 18, 18, -2.5);
  g.fillStyle = '#fff'; g.font = '700 13px "Do Hyeon", sans-serif'; g.textAlign = 'center'; g.fillText('+' + D.points.golden, x, y - 34);
}
function drawFriend(g, f, t){
  const x = f.x - cam; if (x < -60 || x > VW + 60) return;
  const cap = { walker: '#d9503f', hopper: '#8a5fbf', dropper: '#2f8fbf' }[f.kind] || '#d9503f';
  if (f.state === 'hidden') return;
  if (f.state === 'warn'){ // 떨어질 곳에 그림자가 깜박여요
    const a = (Math.sin(t/60) + 1)/2; g.fillStyle = `rgba(20,40,30,${.15 + a*.3})`; E(g, x, GROUND + 3, 26, 6);
    g.fillStyle = '#c9564b'; g.font = '700 26px "Do Hyeon", sans-serif'; g.textAlign = 'center'; g.fillText('!', x, GROUND - 60 - a*6); return;
  }
  const y = f.y;
  g.fillStyle = 'rgba(20,40,30,.2)'; E(g, x, GROUND + 3, 21 * Math.max(.5, 1 - (GROUND - y)/300), 4.5);
  if (f.stun > 0){
    g.fillStyle = '#f5ead6'; rr(g, x - 16, y - 14, 32, 14, 7); g.fill();
    g.fillStyle = cap; E(g, x, y - 14, 25, 10);
    g.fillStyle = 'rgba(255,255,255,.9)'; E(g, x - 8, y - 17, 4, 3); E(g, x + 9, y - 15, 3, 2);
    g.fillStyle = '#ffd34d'; for (let i=0;i<3;i++){ const a = t/200 + i*2.1; starShape(g, x + Math.cos(a)*18, y - 34 + Math.sin(a)*5, 5); }
    return;
  }
  const fast = Math.abs(f.spd) > 90, hop = f.state === 'walk' && f.kind !== 'hopper' ? Math.abs(Math.sin(t/(fast ? 80 : 170) + f.seed))*3 : 0;
  const sq = f.vy ? (f.vy < 0 ? 1.08 : .95) : 1 - hop*.02;
  g.save(); g.translate(x, y); g.scale(1 + (1 - sq), sq);
  if (fast){ g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; for (let k = 0; k < 3; k++){ g.beginPath(); g.moveTo(-f.dir*(22 + k*6), -12 - k*8); g.lineTo(-f.dir*(38 + k*6), -12 - k*8); g.stroke(); } }
  g.fillStyle = '#2a332e'; E(g, -9, -3, 6.5, 4); E(g, 9, -3, 6.5, 4);
  const st = g.createLinearGradient(0, -26 - hop, 0, -4); st.addColorStop(0, '#fff8ea'); st.addColorStop(1, '#ead9bd');
  g.fillStyle = st; rr(g, -15, -27 - hop, 30, 23, 10); g.fill();
  const cg = g.createRadialGradient(-6, -36 - hop, 3, 0, -28 - hop, 26); cg.addColorStop(0, shade(cap, 30)); cg.addColorStop(1, cap);
  g.fillStyle = cg; g.beginPath(); g.ellipse(0, -26 - hop, 25, 18, 0, Math.PI, 0); g.fill();
  g.fillStyle = 'rgba(255,255,255,.92)'; E(g, -11, -34 - hop, 4.6, 3.6); E(g, 6, -39 - hop, 4, 3); E(g, 16, -29 - hop, 3, 2.5);
  g.fillStyle = '#2a332e'; const ex = f.dir * 2; E(g, -5 + ex, -17 - hop, 2.3, 3.1); E(g, 5 + ex, -17 - hop, 2.3, 3.1);
  if (fast){ g.strokeStyle = '#2a332e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -23 - hop); g.lineTo(-2, -21 - hop); g.moveTo(9, -23 - hop); g.lineTo(2, -21 - hop); g.stroke(); }
  g.fillStyle = 'rgba(240,140,140,.6)'; E(g, -10, -12 - hop, 3, 2); E(g, 10, -12 - hop, 3, 2);
  g.restore();
}
function draw(t, dt){
  const target = Math.max(0, Math.min(LV.width - VW, P.x + P.w/2 - VW*.38));
  cam = camReady ? cam + (target - cam) * (1 - Math.exp(-dt*8)) : target; camReady = true;
  const g = ctx; g.setTransform(scale*dpr, 0, 0, scale*dpr, 0, 0); g.textAlign = 'center';
  const cx = cam + VW/2, zi = zoneAt(cx);
  drawTheme(g, ZONES[zi].theme, t, 1);
  if (zi < ZONES.length - 1){ const edge = LV.zoneEnd[zi], a = Math.max(0, Math.min(1, (cx - (edge - 320)) / 640)); if (a > 0) drawTheme(g, ZONES[zi + 1].theme, t, a); }
  if (zi > 0){ const edge = LV.zoneStart[zi], a = Math.max(0, Math.min(1, ((edge + 320) - cx) / 640)); if (a > 0) drawTheme(g, ZONES[zi - 1].theme, t, a * .999); }
  drawGround(g, THEMES[ZONES[zi].theme]);
  LV.signs.forEach(s => drawSign(g, s));
  LV.platforms.forEach(p => drawPlatform(g, p));
  LV.movers.forEach(m => drawMover(g, m));
  LV.gates.forEach(gt => drawGate(g, gt, t));
  const near = touching();
  LV.bells.forEach(b => drawBell(g, b, S.results[b.id].done, t, near === b.id));
  drawBoss(g, t);
  LV.blocks.forEach((b, i) => drawBlock(g, b, i, t));
  LV.goldens.forEach((gd, i) => drawGolden(g, gd, i, t));
  LV.stars.forEach((s, i) => { if (!S.starsTaken.includes(i)) drawStar(g, s[0], s[1], t); });
  friends.forEach(f => drawFriend(g, f, t));
  if (!P.dead) drawPanda(g, P.x + P.w/2 - cam, P.y + P.h, { face:P.face, moving:Math.abs(P.vx) > 1, inAir:!P.onGround, joy:P.joy, blink:P.invuln > 0 && Math.floor(P.invuln*10) % 2 === 0, sq:P.sq, phase:P.phase });
  particles = particles.filter(p => t - p.t0 < p.life);
  particles.forEach(p => { const k = (t - p.t0)/p.life; g.globalAlpha = 1 - k*k;
    if (p.text){ g.fillStyle = p.c; g.font = '700 22px "Do Hyeon", sans-serif'; g.fillText(p.text, p.x - cam, p.y - k*42); }
    else { g.fillStyle = p.c; starShape(g, p.x - cam + p.vx*k, p.y + p.vy*k + 60*k*k, 7*(1 - k*.5)); } });
  g.globalAlpha = 1;
  drawGuide(g, t); drawProgress(g, t);
}

/* ================= 화면 번쩍 (성취하면 빠르게 어두워졌다 밝아져요) ================= */
function flash(kind='win'){
  const el = $('#flash'); if (!el) return;
  el.className = ''; void el.offsetWidth; el.className = kind;
}

/* ================= 움직임과 충돌 ================= */
const keys = { left:false, right:false, jump:false };
let gateWarned = -1, bossArmed = true, simT = 0;
const closedGate = () => LV.gates.find(gt => !S.zonesOpen.includes(gt.zone));
function addStarPts(n, x, y, label){
  S.starPts = Math.max(0, S.starPts + n);
  particles.push({ x, y, t0:performance.now(), life:800, c: n >= 0 ? '#b98510' : '#c9564b', text: label || ((n >= 0 ? '+' : '') + n) });
  renderHud(); persist();
}
function sparkle(x, y, n=8, c='#ffe57a'){ for (let k = 0; k < n; k++) particles.push({ x, y, vx:(Math.random() - .5)*90, vy:-Math.random()*70, t0:performance.now(), life:600, c }); }
function respawnX(){
  const mode = D.fallRespawn || 'zone', px = P.x;
  if (mode === 'start') return 90;
  if (mode === 'bell'){ const passed = LV.bells.filter(b => b.x < px); return passed.length ? passed[passed.length - 1].x - 70 : 90; }
  const zi = zoneAt(px); return zi === 0 ? 90 : LV.zoneStart[zi] + 60;
}
function fall(){
  if (P.dead) return;
  P.dead = true; S.falls = (S.falls || 0) + 1; Snd.sfx.bump(); flash('dark');
  const pen = D.points.fall || 0;
  setTimeout(() => {
    P.x = respawnX(); P.y = (groundAt(P.x + P.w/2) || GROUND) - P.h; P.vx = P.vy = P.kx = 0; P.onGround = true; P.invuln = 1.2; P.dead = false;
    camReady = false; bossArmed = true;
    if (pen) addStarPts(-pen, P.x + 20, P.y - 20);
    toast(D.fallRespawn === 'start' ? '앗, 구덩이에 빠졌어요! 처음부터 다시 출발!' : D.fallRespawn === 'bell' ? '앗, 구덩이에 빠졌어요! 지나온 종에서 다시 출발!' : '앗, 구덩이에 빠졌어요! 이 구역 처음부터 다시 출발!', 2600);
    persist();
  }, 520);
}
function physics(dt){
  simT += dt * 1000;
  const want = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const targetV = want * (D.runSpeed || 250);
  P.vx += (targetV - P.vx) * (1 - Math.exp(-dt * (want ? 14 : 18)));
  if (want) P.face = want;
  if (keys.jump){ P.jumpBuf = .14; keys.jump = false; }
  P.jumpBuf -= dt; P.coyote -= dt;
  if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0)){ P.vy = -(D.jumpPower || 660); P.onGround = false; P.onMover = -1; P.coyote = 0; P.jumpBuf = 0; P.sq = 1.12; Snd.sfx.jump(); }
  P.kx *= Math.pow(.02, dt);
  // 움직이는 발판
  LV.movers.forEach((m, i) => { const nx = moverX(m, simT); m.dx = m.cx == null ? 0 : nx - m.cx; m.cx = nx; if (P.onMover === i && P.onGround) P.x += m.dx; });
  const prevBottom = P.y + P.h, prevTop = P.y;
  let nx = Math.max(0, Math.min(LV.width - P.w - 10, P.x + (P.vx + P.kx) * dt));
  const cg = closedGate();
  if (cg && nx + P.w > cg.x + 4){
    nx = cg.x + 4 - P.w; P.vx = 0;
    if (gateWarned !== cg.zone){ gateWarned = cg.zone; toast(`${cg.name}: 대나무 괴물의 문제를 풀어야 열려요.`); }
  } else if (cg && nx + P.w < cg.x - 80) gateWarned = -1;
  if (!S.results.boss.done){
    const wall = LV.boss.x - 40;
    if (nx + P.w > wall){ nx = wall - P.w; P.vx = 0; if (bossArmed){ bossArmed = false; openBoss(); } }
    else if (nx + P.w < wall - 140) bossArmed = true;
  }
  // 구덩이 안에서는 벽을 뚫고 지나갈 수 없어요
  if (P.y + P.h > GROUND + 10){ const pc = LV.pits.find(q => P.x + P.w/2 > q[0] - 24 && P.x + P.w/2 < q[1] + 24); if (pc) nx = Math.max(pc[0] - 4, Math.min(pc[1] - P.w + 4, nx)); }
  P.x = nx;
  P.vy += 1550 * dt; if (P.vy > 950) P.vy = 950;
  P.y += P.vy * dt;
  const wasGround = P.onGround; P.onGround = false;
  const footX = P.x + P.w/2;
  // 땅: 발밑이 구덩이가 아니면 착지 (가장자리는 몸 너비 안쪽까지 허용)
  let gy = null;
  for (const fx of [P.x + 8, footX, P.x + P.w - 8]){ const y = groundAt(fx); if (y != null && (gy == null || y < gy)) gy = y; }
  if (gy != null && prevBottom <= gy + 14){
    if (P.y + P.h >= gy){ P.y = gy - P.h; if (!wasGround && P.vy > 300) P.sq = .82; P.vy = 0; P.onGround = true; P.onMover = -1; }
    else if (wasGround && P.vy >= 0 && gy - (P.y + P.h) < 12 && P.onMover < 0){ P.y = gy - P.h; P.vy = 0; P.onGround = true; }
  }
  if (P.vy >= 0){
    const land = (x, y, w, i) => { if (prevBottom <= y + 6 && P.y + P.h >= y && P.x + P.w > x + 6 && P.x < x + w - 6){ if (!wasGround) P.sq = .86; P.y = y - P.h; P.vy = 0; P.onGround = true; P.onMover = i; } };
    LV.platforms.forEach(pl => land(pl.x, pl.y, pl.w, -1));
    LV.blocks.forEach(b => land(b.x, b.y, 40, -1));
    LV.movers.forEach((m, i) => land(m.cx, m.y, m.w, i));
  }
  // ? 상자: 아래에서 머리로 치면 별 점수
  if (P.vy < 0) LV.blocks.forEach((b, i) => {
    const bot = b.y + 40;
    if (prevTop >= bot - 2 && P.y < bot && P.x + P.w > b.x + 6 && P.x < b.x + 34){
      P.y = bot; P.vy = 80; b.bumpT = performance.now();
      if (!S.blocksUsed.includes(i)){ S.blocksUsed.push(i); Snd.sfx.bonus(); sparkle(b.x + 20, b.y - 6, 10); addStarPts(D.points.block || 20, b.x + 20, b.y - 16); }
      else Snd.sfx.blip();
    }
  });
  P.sq += (1 - P.sq) * (1 - Math.exp(-dt*12));
  if (wasGround && !P.onGround && P.vy >= 0) P.coyote = .1;
  if (Math.abs(P.vx) > 20 && P.onGround) P.phase += dt * 15;
  if (P.invuln > 0) P.invuln -= dt;
  if (P.joy > 0) P.joy = Math.max(0, P.joy - dt);
  if (P.y > VH + 40) { fall(); return; }
  // 별·황금 대나무
  LV.stars.forEach((s, i) => {
    if (S.starsTaken.includes(i)) return;
    if (Math.abs(P.x + P.w/2 - s[0]) < 28 && Math.abs(P.y + P.h/2 - s[1]) < 40){ S.starsTaken.push(i); Snd.sfx.star(); sparkle(s[0], s[1], 6); addStarPts(D.points.star, s[0], s[1] - 10); }
  });
  LV.goldens.forEach((gd, i) => {
    if (S.goldens.includes(i)) return;
    if (Math.abs(P.x + P.w/2 - gd.x) < 30 && Math.abs(P.y + P.h/2 - gd.y) < 40){ S.goldens.push(i); Snd.sfx.bonus(); flash('win'); sparkle(gd.x, gd.y, 16, '#ffd85a'); addStarPts(D.points.golden || 50, gd.x, gd.y - 20, `황금 대나무 +${D.points.golden || 50}`); }
  });
  // 숲속 친구들: 빨랐다 느렸다, 깡충, 하늘에서 뚝
  friends.forEach(f => {
    if (f.stun > 0){ f.stun -= dt; return; }
    if (f.state === 'hidden'){ if (P.x + P.w > f.from - 260 && P.x < f.to){ f.state = 'warn'; f.warnT = .7; f.x = Math.max(f.from + 20, Math.min(f.to - 20, P.x + P.w/2 + 140)); } return; }
    if (f.state === 'warn'){ f.warnT -= dt; if (f.warnT <= 0){ f.state = 'fall'; f.y = -40; f.vy = 0; } return; }
    if (f.state === 'fall'){ f.vy += 1400 * dt; f.y += f.vy * dt; if (f.y >= GROUND){ f.y = GROUND; f.vy = 0; f.state = 'walk'; sparkle(f.x, GROUND, 6, '#e9e2cf'); Snd.sfx.stomp(); } }
    else {
      f.spdT -= dt;
      if (f.spdT <= 0){ f.spd = f.fast ? pick([90, 140, 170, 0]) : pick(SPEEDS); f.spdT = .6 + Math.random() * 1.8; if (Math.random() < .3) f.dir *= -1; }
      f.x += f.dir * f.spd * dt;
      if (f.x < f.from){ f.x = f.from; f.dir = 1; } if (f.x > f.to){ f.x = f.to; f.dir = -1; }
      if (f.kind === 'hopper'){
        f.hopT -= dt;
        if (f.hopT <= 0 && f.y >= GROUND){ f.vy = -(380 + Math.random()*180); f.hopT = 1 + Math.random() * 1.6; }
        if (f.vy || f.y < GROUND){ f.vy += 1300 * dt; f.y += f.vy * dt; if (f.y >= GROUND){ f.y = GROUND; f.vy = 0; } }
      }
    }
    const fl = f.x - f.w/2, ft = f.y - f.h;
    if (P.x + P.w - 6 > fl && P.x + 6 < fl + f.w && P.y + P.h > ft + 4 && P.y < f.y){
      if (P.vy > 0 && prevBottom <= ft + 14){
        f.stun = 3; f.vy = 0; if (f.state === 'fall'){ f.state = 'walk'; f.y = GROUND; }
        P.vy = -440; P.sq = 1.1; Snd.sfx.stomp();
        S.stomped = S.stomped || [];
        const pts = D.points.stomp || 0;
        if (pts > 0 && !S.stomped.includes(f.seed)){ S.stomped.push(f.seed); setTimeout(() => Snd.sfx.star(), 90); sparkle(f.x, ft, 8); addStarPts(pts, f.x, ft - 10); }
        else particles.push({ x:f.x, y:ft - 10, t0:performance.now(), life:800, c:'#25845f', text:'어지러워~' });
      } else if (P.invuln <= 0){
        P.invuln = 2; P.kx = (P.x + P.w/2 < f.x ? -1 : 1) * 380; P.vy = -260;
        S.bumps += 1; const before = S.starPts; Snd.sfx.bump();
        addStarPts(-(D.points.bump || 10), P.x + P.w/2, P.y - 10);
        toast(before > 0 ? '앗, 통통 버섯과 부딪혔어요! 위에서 밟아 보세요.' : '앗, 통통 버섯과 부딪혔어요! 위에서 밟아 보세요.');
      }
    }
  });
}

/* ================= 종·문 ================= */
function touching(){
  const cx = P.x + P.w/2;
  for (const b of LV.bells) if (Math.abs(cx - b.x) < 36 && P.y + P.h > GROUND - 150 && P.y < GROUND) return b.id;
  return null;
}
const armed = {};
function checkTriggers(){
  const id = touching();
  ALL.forEach(m => { if (m.id !== id) armed[m.id] = true; });
  if (id && armed[id] !== false && !S.results[id].done){ armed[id] = false; openQuiz(ALL.find(m => m.id === id)); }
  const fg = LV.gates[LV.gates.length - 1];
  if (S.zonesOpen.includes(fg.zone) && !S.finished && !quizOpen && P.x + P.w/2 > fg.x + 60) finishGame();
}
const guide = { last:performance.now(), on:false };
function guideTarget(){
  const cx = P.x + P.w/2, left = LV.bells.filter(b => !S.results[b.id].done);
  if (left.length) return left.reduce((a, b) => Math.abs(b.x - cx) < Math.abs(a.x - cx) ? b : a).x;
  if (!S.results.boss.done) return LV.boss.x;
  const og = LV.gates.find(gt => S.zonesOpen.includes(gt.zone)); return og ? og.x + 50 : null;
}
function guideMsg(){
  if (LV.bells.some(b => !S.results[b.id].done)) return '화살표 쪽에 아직 울리지 않은 종이 있어요!';
  if (!S.results.boss.done) return '언덕을 올라 대나무 괴물을 만나요!';
  return '꼭대기 문으로 들어가요!';
}
function updateGuide(now){
  const tg = guideTarget();
  if (quizOpen || S.finished || tg == null || Math.abs(tg - (P.x + P.w/2)) < 150){ guide.last = now; guide.on = false; return; }
  if (now - guide.last > (D.guideAfterSeconds || 15) * 1000) guide.on = true;
}
let toastTimer;
function toast(txt, ms=2400){ const el = $('#toast'); el.textContent = txt; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms); }
function checkZones(){
  const zi = ZONES.length - 1;
  if (!S.zonesOpen.includes(zi) && zoneDone()){
    S.zonesOpen.push(zi); persist();
    setTimeout(() => { Snd.sfx.door(); flash('win'); toast('꼭대기 문이 열렸어요! 문으로 들어가요!', 3200); guide.on = true; }, 600);
  } else if (bellsDone() && !S.results.boss.done && !S.bellsToast){
    S.bellsToast = true; persist();
    setTimeout(() => { toast(`종 ${MISSIONS.length}개를 모두 울렸어요! 이제 언덕을 올라 대나무 괴물을 만나요!`, 3400); guide.on = true; }, 500);
  }
}

/* ================= 퀴즈 ================= */
let quizOpen = false, Q = null;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random()*a.length)];
const toneOf = id => SOUNDS[id] && SOUNDS[id].tone;
function picCard(id, big){ const s = SOUNDS[id]; return `<div class="wordpic ${big ? 'big' : ''}">${s.flag ? flagSVG(s.flag) : ''}<span class="emo">${s.pic || ''}</span><span class="zh">${esc(s.text)}</span></div>`; }
function bodySVG(set, words, decoy){
  const ink = '#1f2a25';
  if (set === 'face'){
    const spots = { erduo: [[58, 48], [222, 48]], yanjing: [[104, 112], [176, 112]], bizi: [[140, 148]], zui: [[140, 184]] };
    let h = `<svg class="bodysvg face" viewBox="0 0 280 240" role="img" aria-label="판다 얼굴">
      <circle cx="58" cy="48" r="34" fill="${ink}"/><circle cx="222" cy="48" r="34" fill="${ink}"/>
      <ellipse cx="140" cy="132" rx="112" ry="100" fill="#fff" stroke="${ink}" stroke-width="4"/>
      <ellipse cx="104" cy="112" rx="26" ry="32" transform="rotate(-20 104 112)" fill="${ink}"/><ellipse cx="176" cy="112" rx="26" ry="32" transform="rotate(20 176 112)" fill="${ink}"/>
      <circle cx="108" cy="108" r="9" fill="#fff"/><circle cx="172" cy="108" r="9" fill="#fff"/>
      <ellipse cx="140" cy="148" rx="14" ry="10" fill="${ink}"/>
      <path d="M124 180 Q140 196 156 180" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="74" cy="160" rx="14" ry="8" fill="rgba(240,140,140,.5)"/><ellipse cx="206" cy="160" rx="14" ry="8" fill="rgba(240,140,140,.5)"/>`;
    words.forEach(w => (spots[w] || []).forEach(([x, y]) => { h += `<circle class="spot" data-spot="${w}" cx="${x}" cy="${y}" r="26"/>`; }));
    return h + '</svg>';
  }
  const spots = { tou: [[140, 62]], jianbang: [[92, 150], [188, 150]], xigai: [[112, 262], [168, 262]], jiao: [[106, 318], [174, 318]] };
  const d = decoy && spots[decoy] ? spots[decoy][0] : null;
  let h = `<svg class="bodysvg" viewBox="0 0 280 350" role="img" aria-label="판다 몸">
    <circle cx="96" cy="26" r="20" fill="${ink}"/><circle cx="184" cy="26" r="20" fill="${ink}"/>
    <ellipse cx="140" cy="68" rx="62" ry="54" fill="#fff" stroke="${ink}" stroke-width="4"/>
    <ellipse cx="116" cy="64" rx="13" ry="17" transform="rotate(-20 116 64)" fill="${ink}"/><ellipse cx="164" cy="64" rx="13" ry="17" transform="rotate(20 164 64)" fill="${ink}"/>
    <circle cx="118" cy="62" r="4" fill="#fff"/><circle cx="162" cy="62" r="4" fill="#fff"/><ellipse cx="140" cy="86" rx="7" ry="5" fill="${ink}"/>
    <rect x="96" y="120" width="88" height="14" rx="7" fill="#25845f"/>
    <path d="M86 140 Q140 124 194 140 L184 236 Q140 250 96 236 Z" fill="#fff" stroke="${ink}" stroke-width="4"/>
    <rect x="62" y="140" width="30" height="80" rx="15" fill="${ink}" transform="rotate(12 77 140)"/>
    <rect x="188" y="140" width="30" height="80" rx="15" fill="${ink}" transform="rotate(-12 203 140)"/>
    <rect x="96" y="232" width="32" height="76" rx="14" fill="${ink}"/><rect x="152" y="232" width="32" height="76" rx="14" fill="${ink}"/>
    <ellipse cx="106" cy="318" rx="26" ry="14" fill="${ink}"/><ellipse cx="174" cy="318" rx="26" ry="14" fill="${ink}"/>`;
  words.forEach(w => (spots[w] || []).forEach(([x, y]) => { h += `<circle class="spot" data-spot="${w}" cx="${x}" cy="${y}" r="24"/>`; }));
  if (d) h += `<text class="decoy" x="${d[0] + 30}" y="${d[1] + 12}" font-size="34">👈</text>`;
  return h + '</svg>';
}
function openQuiz(m){
  const rec = S.results[m.id];
  Q = { m, rec, locked:false, sel:null, build:[], code:[], placed:{} };
  switch (m.type){
    case 'toneButtons': case 'contourCards': Q.answer = String(toneOf(m.sound)); Q.main = m.sound; break;
    case 'pandaChoir': case 'fragments':
      Q.answer = m.sound; Q.opts = shuffle([m.sound, ...shuffle(MA.filter(t => t !== m.sound)).slice(0, (m.choices || 3) - 1)]); break;
    case 'numberCode':
      if (rec.target == null){ rec.target = Math.floor(Math.random()*m.sets.length); persist(); }
      Q.seq = m.sets[rec.target]; Q.answer = Q.seq.map(toneOf).join('-'); break;
    case 'hearPick': Q.answer = m.answer || m.sound; Q.main = m.sound; Q.opts = shuffle(m.options); break;
    case 'toneSort': Q.opts = shuffle(m.items); break;
    case 'bodyPoint':
      if (!rec.target){ rec.target = pick(m.words); persist(); }
      Q.answer = rec.target; Q.main = rec.target; Q.decoy = m.set === 'body' ? pick(m.words.filter(w => w !== rec.target)) : null; break;
    case 'matchScenes': Q.opts = shuffle(m.pairs.map(p => p.sound)); Q.scenes = shuffle(m.pairs); break;
    case 'choiceText': Q.opts = shuffle(m.options.map((o, i) => ({ ...o, i }))); Q.answer = String(m.options.findIndex(o => o.correct)); Q.main = m.sound; break;
    case 'hanziBuild': Q.answer = m.answer.join(''); Q.opts = shuffle(m.pieces); break;
    case 'wordOrder': Q.answer = m.tiles.join('|'); Q.opts = shuffle([...m.tiles, ...(m.extra || [])]); Q.main = m.sound; Q.build = []; break;
    case 'sequence':
      if (rec.target == null){ rec.target = Math.floor(Math.random()*m.sets.length); persist(); }
      Q.seq = m.sets[rec.target].sounds; Q.answer = Q.seq.map(toneOf).join('-'); break;
  }
  quizOpen = true; keys.left = keys.right = keys.jump = false; P.vx = 0;
  document.querySelectorAll('#pad button').forEach(b => b.classList.remove('on'));
  renderQuiz(); $('#quiz').hidden = false;
  Snd.ensure(); Snd.startBgm();
  setTimeout(() => { if (quizOpen && Q && Q.m === m && (Q.main || Q.seq)) playMain(false); }, 380);
}
function playMain(slow){
  const p = Q.seq ? Snd.saySeq(Q.seq, slow, 520) : Snd.say(Q.main, slow);
  return p.then(updateSrc).catch(showPlayError);
}
function updateSrc(){ const el = $('#srcnote'); if (el) el.innerHTML = sourceBadge(); const qp = $('#qplay'); if (qp && Snd.source() !== 'blocked') qp.classList.remove('pulse'); }
function showPlayError(){ const el = $('#srcnote'); if (el) el.innerHTML = sourceBadge(); const qp = $('#qplay'); if (qp) qp.classList.add('pulse'); }
function renderQuiz(){
  const { m } = Q, box = $('#qbox');
  const n = MISSIONS.indexOf(MISSIONS.find(x => x.id === m.id));
  let h = `<div class="stars" id="stars"></div>
    <div class="qhead"><span class="place">${esc(m.place)}</span><span class="count">${m.review ? `<b class="revbadge">${esc(m.review)} 복습</b> ` : ''}${n >= 0 ? `${esc(ZONES[m.zone].name)} · 종 ${n + 1} / ${MISSIONS.length}` : '보너스'}</span>
    <button class="qclose" id="qclose" type="button" aria-label="닫기">✕</button></div>
    <div class="qtext">${esc(m.question)}</div>`;
  const listen = `<div class="listen"><button class="btn play" type="button" id="qplay">▶ 듣기</button>
    <button class="btn" type="button" id="qslow">🐢 천천히</button><button class="btn" type="button" id="qretry">↻ 다시</button></div>
    <div class="srcnote" id="srcnote">${sourceBadge()}</div>`;
  const src = `<div class="srcnote" id="srcnote">${sourceBadge()}</div>`;
  const s = Q.main ? SOUNDS[Q.main] : null;
  switch (m.type){
    case 'toneButtons':
      if (s && s.pic) h += `<div class="target">${picCard(Q.main, true)}<span class="py plain">${esc(plainPinyin(s.pinyin))}</span></div>`;
      h += listen + `<div class="choices c4">${[1,2,3,4].map(k => `<button class="opt" type="button" data-v="${k}">${contourSVG(k)}<span class="lbl">${k}성</span><span class="sub">${TONE_DESC[k]}</span></button>`).join('')}</div>`; break;
    case 'contourCards':
      if (s && s.pic) h += `<div class="target">${picCard(Q.main, true)}<span class="py plain">${esc(plainPinyin(s.pinyin))}</span></div>`;
      h += listen + `<div class="choices c4">${shuffle([1,2,3,4]).map(k => `<button class="opt" type="button" data-v="${k}" aria-label="높낮이 그림">${contourSVG(k)}</button>`).join('')}</div>`; break;
    case 'pandaChoir':
      h += `<div class="target"><span class="py">${esc(SOUNDS[Q.answer].pinyin)}</span>${contourSVG(toneOf(Q.answer))}</div>
        <div class="srcnote" id="srcnote">${sourceBadge() || '판다를 눌러 한 마리씩 소리를 들어 보세요.'}</div>
        <div class="choices c3">${Q.opts.map((id, i) => `<div class="panda-card" id="pc${i}">${pandaFaceSVG()}
          <button class="btn" type="button" data-listen="${id}" data-i="${i}">▶ 들어 보기</button>
          <button class="btn primary" type="button" data-pick="${id}" data-i="${i}" disabled>이 판다!</button></div>`).join('')}</div>`; break;
    case 'fragments':
      h += `<div class="tablet"><span class="py">${esc(SOUNDS[Q.answer].pinyin)}</span><div class="slot" id="slot">여기에 끼워요</div></div>
        <div class="srcnote" id="srcnote">${sourceBadge() || '대나무 조각을 눌러 소리를 듣고 하나를 골라요.'}</div>
        <div class="choices c3">${Q.opts.map((id, i) => `<button class="tube" type="button" data-tube="${id}"><span class="ring"></span>조각 ${'가나다라'[i]}<span class="ring"></span></button>`).join('')}</div>
        <button class="btn primary" type="button" id="insertBtn" disabled>조각 끼우기</button>`; break;
    case 'numberCode':
      h += listen + `<div class="codeSlots" id="codeSlots">${Q.seq.map((_, i) => `<span class="slotN" data-i="${i}">?</span>`).join('')}</div>
        <div class="keypad">${[1,2,3,4].map(k => `<button class="key" type="button" data-key="${k}"><b>${k}</b>${contourSVG(k, 'mini')}</button>`).join('')}</div>
        <div class="row center"><button class="btn ghost" type="button" id="codeClear">지우기</button></div>`; break;
    case 'hearPick':
      h += listen + `<div class="choices c4">${Q.opts.map(id => `<button class="opt word" type="button" data-v="${id}">${picCard(id)}<span class="py">${esc(SOUNDS[id].pinyin)}</span></button>`).join('')}</div>`; break;
    case 'toneSort':
      h += src + `<div class="sortItems" id="sortItems">${Q.opts.map(id => `<button class="sortcard" type="button" data-item="${id}">${picCard(id)}<span class="py plain">${esc(plainPinyin(SOUNDS[id].pinyin))}</span></button>`).join('')}</div>
        <div class="baskets">${[1,2,3,4].map(k => `<button class="basket" type="button" data-basket="${k}">${contourSVG(k, 'mini')}<b>${k}성</b><span class="inbox" id="in${k}"></span></button>`).join('')}</div>
        <p class="note center">① 단어를 눌러 소리를 들어요 → ② 알맞은 바구니를 눌러요</p>`; break;
    case 'choiceText':
      if (m.scene) h += `<div class="scene">${m.flag ? flagSVG(m.flag, 'flag big') + ' ' : ''}${esc(m.scene)}</div>`;
      h += (Q.main ? listen : src) + `<div class="choices ${Q.opts.length === 3 ? 'c3' : 'c2'} textopts">${Q.opts.map(o => `<div class="topt" data-wrap="${o.i}">
          <button class="opt" type="button" data-v="${o.i}"><span class="lbl ${/[一-鿿]/.test(o.text) ? 'zhl' : ''}">${esc(o.text)}</span>${o.sub ? `<span class="sub py">${esc(o.sub)}</span>` : ''}</button>
          ${o.sound ? `<button class="mini-listen" type="button" data-say="${o.sound}" aria-label="${esc(o.text)} 듣기">▶ 듣기</button>` : ''}</div>`).join('')}</div>`; break;
    case 'hanziBuild':
      h += src + `<div class="buildRow"><span class="bslot" id="b0">?</span><span class="plusS">+</span><span class="bslot" id="b1">?</span><span class="plusS">=</span><span class="bres" id="bres">?</span></div>
        <div class="pieces">${Q.opts.map(p => `<button class="piece" type="button" data-piece="${esc(p)}">${esc(p)}</button>`).join('')}</div>`; break;
    case 'wordOrder':
      h += listen + `<div class="sentence" id="sentence">${m.tiles.map((_, i) => `<span class="wslot" data-i="${i}">　</span>`).join('')}<span class="wend">${esc(m.ending || '')}</span></div>
        <div class="tiles">${Q.opts.map((t, i) => `<button class="tile" type="button" data-tile="${esc(t)}" data-ti="${i}"><span class="zhl">${esc(t)}</span></button>`).join('')}</div>
        <div class="row center"><button class="btn ghost" type="button" id="wordClear">다시 놓기</button></div>`; break;
    case 'bodyPoint':
      h += listen + `<div class="bodywrap">${bodySVG(m.set, m.words, Q.decoy)}</div>
        ${Q.decoy ? '<p class="note center">👆 판다 손이 가리키는 곳에 속지 마세요! 소리를 따라가요.</p>' : ''}
        <div class="bodylabel" id="bodyLabel"></div>`; break;
    case 'matchScenes':
      h += src + `<div class="phrases">${Q.opts.map(id => `<button class="phrase" type="button" data-phrase="${id}"><span class="zhl">${esc(SOUNDS[id].text)}</span><span class="py">${esc(SOUNDS[id].pinyin)}</span><span class="spk">▶</span></button>`).join('')}</div>
        <div class="scenecards">${Q.scenes.map(p => `<button class="scenecard" type="button" data-scene="${p.sound}"><span class="emo">${p.flag ? flagSVG(p.flag, 'flag big') : esc(p.scene)}</span><span class="lab">${esc(p.label)}</span><span class="put" id="put-${p.sound}"></span></button>`).join('')}</div>
        <p class="note center">① 인사말을 눌러 들어요 → ② 어울리는 그림을 눌러요</p>`; break;
    case 'sequence':
      h += listen + `<div class="choices c2">${shuffle(m.options).map(o => `<button class="opt" type="button" data-v="${o.join('-')}"><span class="lbl">${o.join(' - ')}</span><span class="seq">${o.map(k => contourSVG(+k, 'mini')).join('')}</span></button>`).join('')}</div>`; break;
  }
  h += `<div class="feedback" id="feedback" aria-live="polite"></div><div id="hintArea"></div>`;
  box.innerHTML = h;
  $('#qclose').onclick = closeQuiz;
  const qp = $('#qplay');
  if (qp){ qp.onclick = () => playMain(false); $('#qslow').onclick = () => playMain(true); $('#qretry').onclick = () => { Snd.retry(); playMain(false); }; }
  box.querySelectorAll('.opt[data-v], .lock[data-v]').forEach(b => b.onclick = () => {
    const ok = String(b.dataset.v) === String(Q.answer);
    const val = m.type === 'choiceText' ? m.options[+b.dataset.v].text : b.dataset.v;
    submit(val, ok, b);
  });
  box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => Snd.say(b.dataset.say).then(updateSrc).catch(showPlayError));
  if (m.type === 'pandaChoir'){
    box.querySelectorAll('[data-listen]').forEach(b => b.onclick = () => {
      const i = b.dataset.i, card = $('#pc' + i);
      card.classList.remove('talk'); void card.offsetWidth; card.classList.add('talk');
      Snd.say(b.dataset.listen).then(updateSrc).catch(showPlayError);
      if (!card.classList.contains('wrong')) box.querySelector(`[data-pick][data-i="${i}"]`).disabled = false;
    });
    box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => submit(b.dataset.pick, b.dataset.pick === Q.answer, $('#pc' + b.dataset.i)));
  }
  if (m.type === 'fragments'){
    box.querySelectorAll('[data-tube]').forEach(b => b.onclick = () => {
      if (b.classList.contains('wrong') || Q.locked) return;
      Snd.say(b.dataset.tube).then(updateSrc).catch(showPlayError);
      box.querySelectorAll('.tube').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel', 'heard'); Q.sel = b; $('#insertBtn').disabled = false;
    });
    $('#insertBtn').onclick = () => { if (Q.sel) submit(Q.sel.dataset.tube, Q.sel.dataset.tube === Q.answer, Q.sel); };
  }
  if (m.type === 'numberCode'){
    const paint = () => box.querySelectorAll('.slotN').forEach((s, i) => { s.textContent = Q.code[i] || '?'; s.classList.toggle('on', !!Q.code[i]); });
    box.querySelectorAll('[data-key]').forEach(b => b.onclick = () => {
      if (Q.locked || Q.code.length >= Q.seq.length) return;
      Q.code.push(b.dataset.key); Snd.sfx.blip(); paint();
      if (Q.code.length === Q.seq.length){ const v = Q.code.join('-'); const ok = v === Q.answer;
        submit(v, ok, $('#codeSlots'), { keepEl:true }); if (!ok) setTimeout(() => { Q && (Q.code = []); paint(); }, 700); }
    });
    $('#codeClear').onclick = () => { if (!Q.locked){ Q.code = []; paint(); } };
  }
  if (m.type === 'toneSort'){
    box.querySelectorAll('[data-item]').forEach(b => b.onclick = () => {
      if (Q.locked || b.classList.contains('done')) return;
      Snd.say(b.dataset.item).then(updateSrc).catch(showPlayError);
      box.querySelectorAll('.sortcard').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); Q.sel = b;
    });
    box.querySelectorAll('[data-basket]').forEach(bk => bk.onclick = () => {
      if (Q.locked) return;
      if (!Q.sel){ toast('먼저 단어를 눌러 소리를 들어요.'); return; }
      const id = Q.sel.dataset.item, k = +bk.dataset.basket, ok = toneOf(id) === k;
      if (ok){
        Snd.sfx.place(); Q.sel.classList.remove('sel'); Q.sel.classList.add('done');
        $('#in' + k).innerHTML += `<span>${SOUNDS[id].pic || ''}${esc(SOUNDS[id].text)}</span>`; Q.placed[id] = k; Q.sel = null;
        if (Object.keys(Q.placed).length === m.items.length) submit('all', true, bk, { sortDone:true });
      } else { submit(`${id}→${k}`, false, bk, { keepEl:true }); bk.classList.add('shake'); setTimeout(() => bk.classList.remove('shake'), 500); }
    });
  }
  if (m.type === 'wordOrder'){
    const paint = () => { box.querySelectorAll('.wslot').forEach((sl, i) => { sl.textContent = Q.build[i] ? Q.build[i].t : '　'; sl.classList.toggle('on', !!Q.build[i]); });
      box.querySelectorAll('.tile').forEach(b => b.disabled = Q.build.some(x => x.i === b.dataset.ti)); };
    box.querySelectorAll('.tile').forEach(b => b.onclick = () => {
      if (Q.locked || Q.build.length >= m.tiles.length) return;
      Q.build.push({ t: b.dataset.tile, i: b.dataset.ti }); Snd.sfx.place(); paint();
      if (Q.build.length === m.tiles.length){
        const v = Q.build.map(x => x.t).join('|'), ok = v === Q.answer;
        submit(Q.build.map(x => x.t).join(' '), ok, $('#sentence'), { keepEl:true });
        if (ok){ $('#sentence').classList.add('done'); }
        else { $('#sentence').classList.add('shake'); setTimeout(() => { if (!Q) return; $('#sentence').classList.remove('shake'); Q.build = []; paint(); }, 800); }
      }
    });
    $('#wordClear').onclick = () => { if (!Q.locked){ Q.build = []; paint(); } };
  }
  if (m.type === 'bodyPoint'){
    box.querySelectorAll('[data-spot]').forEach(sp => sp.addEventListener('click', () => {
      if (Q.locked) return;
      const w = sp.dataset.spot, ok = w === Q.answer, info = SOUNDS[w];
      $('#bodyLabel').innerHTML = `<span class="zhl">${esc(info.text)}</span> <span class="py">${esc(info.pinyin)}</span> · ${esc(info.meaning)}`;
      $('#bodyLabel').className = 'bodylabel ' + (ok ? 'ok' : 'no');
      box.querySelectorAll(`[data-spot="${w}"]`).forEach(x => x.classList.add(ok ? 'right' : 'wrong'));
      submit(w, ok, sp, { keepEl:true });
    }));
  }
  if (m.type === 'matchScenes'){
    box.querySelectorAll('[data-phrase]').forEach(b => b.onclick = () => {
      if (Q.locked || b.classList.contains('done')) return;
      Snd.say(b.dataset.phrase).then(updateSrc).catch(showPlayError);
      box.querySelectorAll('.phrase').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); Q.sel = b;
    });
    box.querySelectorAll('[data-scene]').forEach(sc => sc.onclick = () => {
      if (Q.locked || sc.classList.contains('done')) return;
      if (!Q.sel){ toast('먼저 인사말을 눌러 들어요.'); return; }
      const id = Q.sel.dataset.phrase, ok = id === sc.dataset.scene;
      if (ok){
        Snd.sfx.place(); Q.sel.classList.remove('sel'); Q.sel.classList.add('done'); sc.classList.add('done');
        $('#put-' + id).innerHTML = `<span class="zhl">${esc(SOUNDS[id].text)}</span>`; Q.placed[id] = true; Q.sel = null;
        if (Object.keys(Q.placed).length === m.pairs.length) submit('all', true, sc, { sortDone:true });
      } else { submit(`${SOUNDS[id].text}→${sc.dataset.scene}`, false, sc, { keepEl:true }); sc.classList.add('shake'); setTimeout(() => sc.classList.remove('shake'), 500); }
    });
  }
  if (m.type === 'hanziBuild'){
    box.querySelectorAll('[data-piece]').forEach(b => b.onclick = () => {
      if (Q.locked || Q.build.length >= 2) return;
      Q.build.push(b.dataset.piece); Snd.sfx.place();
      $('#b' + (Q.build.length - 1)).textContent = b.dataset.piece; $('#b' + (Q.build.length - 1)).classList.add('on');
      if (Q.build.length === 2){ const v = Q.build.join(''), ok = v === Q.answer;
        if (ok){ $('#bres').textContent = m.result; $('#bres').classList.add('on'); setTimeout(() => Snd.say(m.resultSound).catch(() => {}), 200); }
        submit(v, ok, $('.buildRow'), { keepEl:true });
        if (!ok) setTimeout(() => { if (!Q) return; Q.build = []; ['#b0', '#b1'].forEach(s => { $(s).textContent = '?'; $(s).classList.remove('on'); }); }, 800); }
    });
  }
}
function submit(v, correct, el, opt={}){
  if (!Q || Q.locked || !el) return;
  if (!opt.keepEl && !opt.sortDone && el.classList.contains('wrong')) return;
  Snd.ensure();
  const { m, rec } = Q;
  const sortType = m.type === 'toneSort' || m.type === 'matchScenes';
  if (!rec.done){
    if (!sortType) rec.tries += 1;
    if (rec.first === null && (!sortType || !correct || opt.sortDone)){ rec.first = String(v); rec.firstCorrect = correct; }
    if (!correct) rec.wrongs.push(String(v));
    if (sortType && opt.sortDone) rec.tries = rec.wrongs.length + 1;
    persist();
  }
  if (correct){
    Q.locked = true; if (!opt.keepEl) el.classList.add('right');
    const isBonus = m.id === 'bonus', clean = rec.wrongs.length === 0;
    const pts = clean ? (isBonus ? D.points.bonusFirstTry : D.points.firstTry) : (isBonus ? D.points.bonusRetry : D.points.retry);
    if (!rec.done){
      rec.points = pts; rec.done = true; rec.doneAt = Date.now(); S.learn += pts;
      if (m.reward && !S.items.includes(m.reward)) S.items.push(m.reward);
      persist();
    }
    if (m.type === 'fragments'){ const sl = $('#slot'); sl.classList.add('filled'); sl.textContent = '딱 맞아요!'; }
    Snd.sfx.correct(); setTimeout(isBonus ? Snd.sfx.bonus : Snd.sfx.bell, 300);
    const fb = $('#feedback'); fb.className = 'feedback good'; fb.textContent = `정답! 학습 점수 +${pts}`;
    burst(pts);
    setTimeout(() => {
      closeQuiz(true); P.joy = 1.2; flash('win'); persist(true);
      for (let i = 0; i < 16; i++) particles.push({ x:P.x + P.w/2, y:P.y + 10, vx:(Math.random() - .5)*130, vy:-(Math.random()*90 + 20), t0:performance.now(), life:950, c: i % 2 ? '#e3ad1f' : '#fff6c9' });
      if (m.reward) toast(`${m.reward} 획득!`); renderHud(); checkZones();
    }, m.type === 'hanziBuild' ? 2100 : 1500);
  } else {
    if (!opt.keepEl) el.classList.add('wrong');
    if (m.type === 'pandaChoir'){ const pb = el.querySelector('[data-pick]'); if (pb) pb.disabled = true; }
    if (m.type === 'fragments'){ Q.sel = null; $('#insertBtn').disabled = true; }
    if (m.type === 'numberCode'){ el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); }
    Snd.sfx.wrong();
    const fb = $('#feedback'); fb.className = 'feedback bad'; fb.textContent = '아깝다! 힌트를 보고 다시 해 봐요.';
    let hint = `<div class="hint"><span>💡</span><div><b>힌트</b> ${esc(m.hint)}`;
    if (['numberCode','sequence','toneSort','hearPick'].includes(m.type) || (m.type === 'toneButtons' && SOUNDS[m.sound].pic)) hint += `<div class="contour-ref">${[1,2,3,4].map(k => `<div>${contourSVG(k)}${k}성</div>`).join('')}</div>`;
    $('#hintArea').innerHTML = hint + '</div></div>';
  }
}
function burst(pts){
  const st = $('#stars'); if (!st) return;
  for (let i = 0; i < 18; i++){ const s = document.createElement('i'), a = Math.random()*Math.PI*2, r = 90 + Math.random()*120;
    s.style.left = '50%'; s.style.top = '45%'; s.style.setProperty('--dx', Math.cos(a)*r + 'px'); s.style.setProperty('--dy', Math.sin(a)*r + 'px'); st.appendChild(s); }
  if (pts > 0){ const p = document.createElement('div'); p.className = 'plus'; p.textContent = '+' + pts; st.appendChild(p); }
}
function closeQuiz(solved){
  if (Q && !Q.rec.done && solved !== true) toast('종 앞으로 다시 오면 문제를 이어서 풀 수 있어요.');
  $('#quiz').hidden = true; quizOpen = false; Q = null; guide.last = performance.now();
}
$('#quiz').addEventListener('click', e => { if (e.target.id === 'quiz' && Q && !Q.finale && !Q.boss) closeQuiz(); });

/* ================= 언덕의 대나무 괴물 ================= */
function bossSVG(mood){
  const c = document.createElement('canvas'); c.width = 400; c.height = 460;
  const g = c.getContext('2d'); g.scale(2, 2);
  drawBossShape(g, 100, 222, { t: 0, mood, hearts: 0 });
  return `<img class="bossimg" alt="${esc(D.boss.name)}" src="${c.toDataURL()}">`;
}
function bossTalk(mood, text, extra=''){
  return `<div class="bosstalk"><div class="bosspic">${bossSVG(mood)}</div><div class="bubble"><b>${esc(D.boss.name)}</b><p>${esc(text)}</p></div></div>${extra}`;
}
function openBoss(){
  quizOpen = true; keys.left = keys.right = keys.jump = false; P.vx = 0;
  document.querySelectorAll('#pad button').forEach(b => b.classList.remove('on'));
  const rec = S.results.boss;
  Q = { boss:true, m: BOSS, rec, locked:false };
  $('#quiz').hidden = false; Snd.ensure(); Snd.startBgm();
  const box = $('#qbox');
  if (!bellsDone()){
    box.innerHTML = bossTalk('grin', D.boss.notReady, `<button class="btn primary" type="button" id="bossBack">종 찾으러 가기</button>`);
    Snd.sfx.bump();
    $('#bossBack').onclick = () => { closeBossWindow(); P.kx = -420; guide.on = true; };
    return;
  }
  laugh();
  box.innerHTML = bossTalk('laugh', D.boss.intro, `<div class="bossrule">대화가 상황에 <b>어울리면 O</b>, <b>어울리지 않으면 X</b>를 골라요. 문제는 모두 ${D.boss.rounds.length}개!</div>
    <button class="btn primary" type="button" id="bossGo">도전!</button>`);
  $('#bossGo').onclick = () => bossRound();
}
function laugh(){ Snd.ensure(); [0, 140, 280].forEach((d, i) => setTimeout(() => Snd.sfx.stomp(), d)); }
function closeBossWindow(){ $('#quiz').hidden = true; quizOpen = false; Q = null; guide.last = performance.now(); bossArmed = false; }
function bossRound(){
  const rec = S.results.boss; rec.rounds = rec.rounds || [];
  const i = S.bossRound || 0, r = D.boss.rounds[i], n = D.boss.rounds.length;
  if (!rec.rounds[i]) rec.rounds[i] = { first:null, firstCorrect:null, tries:0 };
  const A = SOUNDS[r.a], B = SOUNDS[r.b];
  Q.round = i; Q.locked = false;
  const hearts = Array.from({ length: n }, (_, k) => `<span class="leaf ${k < n - i ? 'on' : ''}">🍃</span>`).join('');
  $('#qbox').innerHTML = `<div class="stars" id="stars"></div>
    <div class="qhead"><span class="place">${esc(D.boss.name)}의 문제 ${i + 1} / ${n}</span><span class="leaves">${hearts}</span></div>
    <div class="scene">${r.flag ? flagSVG(r.flag, 'flag big') + ' ' : ''}${esc(r.scene)}</div>
    <div class="qtext">${esc(r.situation)}<br>이 대화가 상황에 어울리나요?</div>
    <div class="dialog">
      <div class="say left"><span class="who">🐼</span><span class="zhl">${esc(A.text)}</span><span class="py">${esc(A.pinyin)}</span></div>
      <div class="say right"><span class="zhl">${esc(B.text)}</span><span class="py">${esc(B.pinyin)}</span><span class="who">🐰</span></div>
    </div>
    <div class="listen"><button class="btn play" type="button" id="qplay">▶ 대화 듣기</button><button class="btn" type="button" id="qslow">🐢 천천히</button></div>
    <div class="srcnote" id="srcnote">${sourceBadge()}</div>
    <div class="ox"><button class="oxbtn o" type="button" data-ox="O">O<small>어울려요</small></button><button class="oxbtn x" type="button" data-ox="X">X<small>어울리지 않아요</small></button></div>
    <div class="feedback" id="feedback" aria-live="polite"></div><div id="hintArea"></div>`;
  const play = slow => Snd.saySeq([r.a, r.b], slow, 650).then(updateSrc).catch(showPlayError);
  $('#qplay').onclick = () => play(false); $('#qslow').onclick = () => play(true);
  setTimeout(() => { if (Q && Q.boss && Q.round === i) play(false); }, 400);
  document.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => bossAnswer(b.dataset.ox, b));
}
function bossAnswer(v, el){
  if (!Q || Q.locked) return;
  const rec = S.results.boss, i = Q.round, r = D.boss.rounds[i], rr0 = rec.rounds[i], ok = v === r.answer;
  rr0.tries += 1; rec.tries += 1;
  if (rr0.first === null){ rr0.first = v; rr0.firstCorrect = ok; }
  if (!ok) rec.wrongs.push(`${i + 1}:${v}`);
  persist();
  if (!ok){
    el.classList.add('wrong'); Snd.sfx.wrong(); setTimeout(laugh, 250);
    const fb = $('#feedback'); fb.className = 'feedback bad'; fb.textContent = D.boss.wrongLine;
    $('#hintArea').innerHTML = `<div class="hint"><span>💡</span><div><b>힌트</b> ${esc(r.hint)}</div></div>`;
    return;
  }
  Q.locked = true; el.classList.add('right'); Snd.sfx.correct();
  S.bossRound = i + 1; persist();
  const fb = $('#feedback'); fb.className = 'feedback good';
  fb.textContent = r.answer === 'X' ? '정답! 어울리지 않아요.' : '정답! 잘 어울려요.';
  let fix = '';
  if (r.fix){ const F = SOUNDS[r.fix]; fix = `<div class="fix">이렇게 말하면 어울려요: <span class="zhl">${esc(F.text)}</span> <span class="py">${esc(F.pinyin)}</span> <button class="mini-listen" type="button" id="fixPlay">▶ 듣기</button></div>`; }
  const last = i + 1 >= D.boss.rounds.length;
  $('#hintArea').innerHTML = fix + `<button class="btn primary" type="button" id="bossNext">${last ? '대나무 괴물에게 가기' : '다음 문제'}</button>`;
  if (r.fix){ $('#fixPlay').onclick = () => Snd.say(r.fix).then(updateSrc).catch(showPlayError); setTimeout(() => Snd.say(r.fix).catch(() => {}), 500); }
  burst(0);
  $('#bossNext').onclick = () => last ? bossWin() : bossRound();
}
function bossWin(){
  const rec = S.results.boss;
  rec.first = (rec.rounds || []).map(x => x && x.first).join(',');
  rec.firstCorrect = (rec.rounds || []).every(x => x && x.firstCorrect);
  const pts = rec.wrongs.length === 0 ? D.points.bossFirstTry : D.points.bossRetry;
  if (!rec.done){ rec.done = true; rec.doneAt = Date.now(); rec.points = pts; S.learn += pts; persist(true); }
  Snd.sfx.fanfare();
  $('#qbox').innerHTML = `<div class="stars" id="stars"></div>` + bossTalk('happy', D.boss.outro, `<div class="feedback good">학습 점수 +${rec.points}</div>
    <button class="btn primary" type="button" id="bossBye">꼭대기로 올라가기</button>`);
  burst(rec.points);
  $('#bossBye').onclick = () => { closeBossWindow(); P.joy = 1.2; flash('win'); renderHud(); checkZones(); persist(true); };
}

/* 마지막 문: 수업 시작 인사 주고받기 (점수 없음) */
function openFinale(){
  quizOpen = true; keys.left = keys.right = false; P.vx = 0;
  Q = { finale:true, m:{ id:'finale' }, rec:{} };
  $('#qbox').innerHTML = `<div class="stars" id="stars"></div>
    <div class="qhead"><span class="place">마지막 인사</span><span class="count">점수 없음</span></div>
    <div class="scene big">👩‍🏫 💬 <span class="zhl">同学们好!</span></div>
    <div class="qtext">선생님이 인사해요. 다음 시간 수업도 이렇게 시작해요! 대답 버튼을 눌러 인사해 볼까요?</div>
    <div class="listen"><button class="btn play" type="button" id="qplay">▶ 선생님 인사 듣기</button></div>
    <div class="srcnote" id="srcnote">${sourceBadge()}</div>
    <button class="btn primary reply" type="button" id="replyBtn"><span class="zhl">老师好!</span><small>lǎoshī hǎo · 선생님, 안녕하세요</small></button>
    <div class="feedback" id="feedback"></div>`;
  $('#quiz').hidden = false;
  const playT = () => Snd.say('tongxuemenhao').then(updateSrc).catch(showPlayError);
  $('#qplay').onclick = playT; setTimeout(playT, 400);
  $('#replyBtn').onclick = () => {
    $('#replyBtn').disabled = true;
    Snd.say('laoshihao').then(updateSrc).catch(() => {});
    const fb = $('#feedback'); fb.className = 'feedback good'; fb.textContent = '멋진 인사예요! 🎉'; burst(0);
    setTimeout(() => { $('#quiz').hidden = true; quizOpen = false; Q = null; finishGame(); }, 2200);
  };
}

/* ================= 점수판 ================= */
function renderHud(){
  $('#learnScore').textContent = S.learn; $('#starScore').textContent = S.starPts;
  const zi = Math.min(zoneAt(P.x), ZONES.length - 1), ms = MISSIONS.filter(m => m.zone === zi);
  $('#zoneName').textContent = ZONES[zi].name;
  $('#bells').innerHTML = ms.map(m => bellSVG(S.results[m.id].done)).join('') + `<span class="bossmini ${S.results.boss.done ? 'on' : ''}" title="대나무 괴물">🎋</span>`;
  $('#total').textContent = `${MISSIONS.filter(m => S.results[m.id].done).length + Math.min(S.bossRound || 0, D.boss.rounds.length)}/${QUESTION_COUNT}`;
  $('#who').textContent = `${S.name} #${S.tag}`;
}
const NET_TEXT = { online: ['on', '선생님께 연결됨'], connecting: ['wait', '연결 중…'], offline: ['wait', '인터넷이 끊겼어요. 다시 연결되면 자동으로 보내요'], error: ['bad', '연결 오류 (결과는 이 기기에 저장돼요)'], off: ['off', '이 기기에만 저장 중'] };
Net.onStatus(st => { const el = $('#netDot'); if (!el) return; const v = NET_TEXT[st] || NET_TEXT.off; el.className = 'netdot ' + v[0]; el.title = v[1]; el.setAttribute('aria-label', v[1]); });

/* ================= 반 순위표 ================= */
const SHOW_RANK = window.SHOW_RANKING !== false;
function rankRows(list){
  if (!list) return `<p class="note center">${Net.enabled ? '순위를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' : '선생님이 온라인 저장을 켜면 반 친구들의 순위가 보여요.'}</p>
    ${S ? `<ol class="ranklist"><li class="me"><span class="rk">-</span><span class="nm">${esc(S.name)} #${esc(S.tag)} (나)</span><span class="sc">${S.learn + S.starPts}</span></li></ol>` : ''}`;
  if (!list.length) return '<p class="note center">아직 아무도 없어요. 첫 번째 탐험가가 되어 보세요!</p>';
  let rank = 0, prev = null;
  const uid = Net.uid();
  return `<ol class="ranklist">${list.map((r, i) => { if (r.total !== prev){ rank = i + 1; prev = r.total; }
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    return `<li class="${r.id === uid ? 'me' : ''}"><span class="rk">${medal}</span><span class="nm">${esc(r.name || '?')} #${esc(r.tag || '')}${r.id === uid ? ' (나)' : ''}${r.finished ? ' 🚪' : ''}</span><span class="pr">🔔${r.bells || 0}</span><span class="sc">${r.total || 0}</span></li>`; }).join('')}</ol>`;
}
let rankUnsub = null, endRankUnsub = null;
function openRanking(){
  keys.left = keys.right = false; $('#rankPanel').hidden = false;
  $('#rankList').innerHTML = '<p class="note center">불러오는 중…</p>';
  if (rankUnsub) rankUnsub();
  rankUnsub = Net.watchBoard(list => { $('#rankList').innerHTML = rankRows(list); });
}
function closeRanking(){ $('#rankPanel').hidden = true; if (rankUnsub){ rankUnsub(); rankUnsub = null; } }
let hudZone = -1;

/* ================= 조작 ================= */
const KEYS = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump' };
const canControl = () => !$('#play').hidden && !quizOpen && $('#soundPanel').hidden && $('#helpPanel').hidden && $('#rankPanel').hidden && !S.finished && !P.dead;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ if (quizOpen && Q && !Q.finale && !Q.boss) closeQuiz(); $('#soundPanel').hidden = true; $('#helpPanel').hidden = true; closeRanking(); return; }
  const k = KEYS[e.code]; if (!k || !S || !canControl()) return;
  e.preventDefault(); Snd.ensure(); Snd.startBgm();
  if (k === 'jump'){ if (!e.repeat) keys.jump = true; } else keys[k] = true;
});
document.addEventListener('keyup', e => { const k = KEYS[e.code]; if (k && k !== 'jump') keys[k] = false; });
window.addEventListener('blur', () => { keys.left = keys.right = keys.jump = false; });
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.key;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); if (!S || !canControl()) return; Snd.ensure(); Snd.startBgm();
    b.classList.add('on'); if (k === 'jump') keys.jump = true; else keys[k] = true;
    try { b.setPointerCapture(e.pointerId); } catch(_){}
  });
  const off = () => { b.classList.remove('on'); if (k !== 'jump') keys[k] = false; };
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
let touchSeen = window.matchMedia('(pointer: coarse)').matches;
window.addEventListener('touchstart', () => { touchSeen = true; if (!$('#play').hidden) $('#pad').hidden = false; }, { passive:true });

/* ================= 화면 흐름 ================= */
function show(id){ ['#startScreen','#storyScreen','#play','#endScreen'].forEach(s => $(s).hidden = s !== id); }
const cleanName = v => v.replace(/[<>"'&]/g, '').trim().slice(0, 12);
function initStart(){
  $('#stageLabel').textContent = `중국어 탐험대 · ${D.stageLabel}`;
  $('#gameTitle').innerHTML = `${esc(D.title)}<small>${esc(D.subtitle)}</small>`;
  $('#zoneList').innerHTML = [...ZONES.map((z, i) => `${i + 1}. ${z.name}`), '🎋 대나무 괴물', `문제 ${QUESTION_COUNT}개`].map(t => `<span>${esc(t)}</span>`).join('');
  if (!SHOW_RANK) $('#rankBtn').hidden = true;
  const saved = store.load();
  if (saved && saved.name && saved.results){
    $('#resumeBox').hidden = false; $('#newBox').hidden = true;
    $('#resumeBtn').textContent = `이어서 하기 (${saved.name} #${saved.tag})`;
  }
  $('#resumeBtn').onclick = () => { Snd.ensure(); Snd.startBgm(); S = saved; ALL.forEach(m => { if (!S.results[m.id]) S.results[m.id] = emptyRec(); });
    S.zonesOpen = S.zonesOpen || []; S.blocksUsed = S.blocksUsed || []; S.goldens = S.goldens || []; S.stomped = S.stomped || [];
    Net.studentStart(D.lessonId).then(() => persist(true));
    if (S.finished) finishGame(); else enterPlay(); };
  $('#newBtn').onclick = () => { $('#resumeBox').hidden = true; $('#newBox').hidden = false; $('#nameInput').focus(); };
  $('#testBtn').onclick = () => {
    Snd.ensure(); $('#testResult').textContent = '재생 중…';
    Snd.say('xiexie').then(() => $('#testResult').innerHTML = '들리나요? ' + sourceBadge()).catch(() => $('#testResult').innerHTML = sourceBadge());
  };
  $('#startBtn').onclick = startNew;
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') startNew(); });
}
function startNew(){
  const name = cleanName($('#nameInput').value);
  if (!name){ $('#nameInput').focus(); $('#nameInput').placeholder = '이름을 먼저 써 주세요!'; return; }
  Snd.ensure(); Snd.startBgm();
  S = newState(name); persist();
  Net.studentStart(D.lessonId).then(() => persist(true));
  storyStep = 0; show('#storyScreen'); renderStory();
}
let storyStep = 0;
function renderStory(){
  $('#storyText').textContent = D.story[storyStep];
  $('#storyDots').innerHTML = D.story.map((_, i) => `<b class="${i === storyStep ? 'on' : ''}"></b>`).join('');
  $('#nextBtn').textContent = storyStep === D.story.length - 1 ? '모험 출발!' : '다음';
  const g = $('#storyCanvas').getContext('2d');
  g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 220, 150);
  const th = THEMES.forest;
  const sky = g.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
  g.save(); rr(g, 0, 0, 220, 150, 18); g.clip();
  g.fillStyle = sky; g.fillRect(0, 0, 220, 150);
  g.fillStyle = th.far[0]; g.beginPath(); g.moveTo(0, 150); for (let x = 0; x <= 220; x += 10) g.lineTo(x, 92 - 16*Math.sin(x/40)); g.lineTo(220, 150); g.fill();
  for (let i = 0; i < 5; i++){ g.fillStyle = '#8cbf8a'; rr(g, 14 + i*46, 28, 7, 96, 3.5); g.fill(); g.fillStyle = '#7fb47e'; leaf(g, 17 + i*46, 40, 18, -.6); }
  g.fillStyle = th.grass; g.fillRect(0, 118, 220, 32);
  if (storyStep === -1){ g.fillStyle = '#b23a32'; rr(g, 150, 52, 8, 68, 3); g.fill(); rr(g, 192, 52, 8, 68, 3); g.fill(); g.fillStyle = '#6b4b2e'; g.fillRect(158, 62, 34, 56); g.fillStyle = '#e3ad1f'; E(g, 175, 90, 5, 5);
    g.fillStyle = '#16392c'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('?', 122, 50); g.fillText('?', 206, 40); }
  if (storyStep === 1){ [['#cd2e3a', 1], ['#de2910', 2], ['#3c3b6e', 3], ['#bc002d', 4]].forEach(([c, n], k) => { const x = 120 + k*24;
      g.fillStyle = '#6b4b2e'; rr(g, x, 70, 20, 48, 6); g.fill(); g.fillStyle = c; rr(g, x + 3, 74, 14, 10, 3); g.fill();
      g.fillStyle = '#fff'; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.fillText(n, x + 10, 104); }); }
  if (storyStep === 2){ drawBossShape(g, 176, 122, { t: 0, mood: 'laugh', hearts: 0, scale: .5 }); }
  drawPanda(g, 80, 122, { joy: storyStep === 2 ? .5 : 0 });
  g.restore();
}
$('#nextBtn').onclick = () => { Snd.sfx.blip(); if (storyStep < D.story.length - 1){ storyStep++; renderStory(); } else enterPlay(); };
$('#skipBtn').onclick = enterPlay;
function enterPlay(){
  show('#play');
  $('#pad').hidden = !touchSeen;
  P.x = Math.max(0, Math.min(LV.width - 200, S.x || 90)); P.y = GROUND - P.h; P.vx = P.vy = P.kx = 0; P.onGround = true;
  const cg = closedGate(); if (cg && P.x + P.w > cg.x) P.x = cg.x - 90;
  if (!S.results.boss.done && P.x + P.w > LV.boss.x - 60) P.x = LV.boss.x - 220;
  if (groundAt(P.x + P.w/2) == null) P.x = respawnX();
  P.y = (groundAt(P.x + P.w/2) ?? GROUND) - P.h; P.dead = false; P.onMover = -1; bossArmed = true;
  guide.last = performance.now(); guide.on = false; camReady = false;
  ALL.forEach(m => armed[m.id] = true);
  resize(); renderHud(); requestAnimationFrame(resize);
  const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 700;
  toast(portrait ? '휴대폰을 가로로 돌리면 더 크게 보여요! 📱' : '오른쪽으로 달려 빛나는 소리의 종을 찾아요! 🔔', 2800);
}
function finishGame(){
  if (!S.finished){ S.finished = true; S.finishedAt = Date.now(); }
  persist(true);
  keys.left = keys.right = keys.jump = false;
  Snd.sfx.fanfare(); show('#endScreen');
  const first = MISSIONS.filter(m => S.results[m.id].firstCorrect === true).length;
  $('#endLearn').textContent = S.learn; $('#endStar').textContent = S.starPts; $('#endTotal').textContent = S.learn + S.starPts;
  $('#endName').textContent = `${S.name} #${S.tag}`;
  const br = (S.results.boss.rounds || []).filter(x => x && x.firstCorrect).length;
  $('#endFirst').textContent = `처음에 맞힌 문제 ${first + br} / ${MISSIONS.length + D.boss.rounds.length}`;
  $('#endZones').innerHTML = `<div><small>소리의 종</small><b>${first}/${MISSIONS.length}</b></div><div><small>${esc(D.boss.name)}</small><b>${br}/${D.boss.rounds.length}</b></div>`;
  $('#endBonus').textContent = `? 상자 ${(S.blocksUsed || []).length} · 황금 대나무 ${(S.goldens || []).length} · 버섯 ${(S.stomped || []).length}`;
  $('#nextName').textContent = D.nextStage; $('#nextLine').textContent = D.nextStageLine;
  const st = Net.status();
  $('#saveStatus').innerHTML = !Net.enabled ? '💾 결과가 이 기기에 저장되었어요.' : st === 'online' ? '✅ 결과를 선생님께 보냈어요.' : '⏳ 결과를 선생님께 보내는 중이에요. 인터넷이 연결되면 자동으로 보내요.';
  Net.onStatus(s2 => { if ($('#endScreen').hidden || !Net.enabled) return; $('#saveStatus').innerHTML = s2 === 'online' ? '✅ 결과를 선생님께 보냈어요.' : '⏳ 결과를 선생님께 보내는 중이에요. 인터넷이 연결되면 자동으로 보내요.'; });
  $('#endRank').hidden = !SHOW_RANK;
  if (SHOW_RANK){ if (endRankUnsub) endRankUnsub(); setTimeout(() => { endRankUnsub = Net.watchBoard(list => {
    $('#endRankList').innerHTML = rankRows(list ? list.slice(0, 10) : list);
    const uid = Net.uid(), mine = list && list.findIndex(r => r.id === uid);
    $('#myRank').textContent = list && mine >= 0 ? `나는 ${list.length}명 중 ${list.filter(r => r.total > list[mine].total).length + 1}등!` : ''; }); }, 600); }
  setTimeout(() => Snd.say('zaijian').catch(() => {}), 1300);
}
$('#nihaoBtn').onclick = () => Snd.say('zaijian').catch(() => {});
$('#replayBtn').onclick = () => { if (endRankUnsub){ endRankUnsub(); endRankUnsub = null; } show('#play'); camReady = false; resize(); renderHud(); toast('남은 별을 모으며 자유롭게 달려 보세요!'); };

/* 설정·도움말 */
function syncSliders(){
  ['bgm','sfx','voice'].forEach(k => { const id = 'vol' + k[0].toUpperCase() + k.slice(1); $('#' + id).value = prefs[k]; $('#' + id + 'V').textContent = prefs[k]; });
  $('#muteAll').checked = prefs.mute;
  const src = SOURCE_TEXT[Snd.source()];
  $('#voiceSourceNote').textContent = '중국어 소리: ' + (src ? src[0] : '아직 재생 전');
  $('#renameInput').value = S ? S.name : ''; $('#renameMsg').textContent = '';
}
['bgm','sfx','voice'].forEach(k => { const id = 'vol' + k[0].toUpperCase() + k.slice(1);
  $('#' + id).addEventListener('input', e => { prefs[k] = +e.target.value; $('#' + id + 'V').textContent = prefs[k]; Snd.apply(); savePrefs(); }); });
$('#muteAll').addEventListener('change', e => { prefs.mute = e.target.checked; Snd.apply(); savePrefs(); });
$('#soundBtn').onclick = () => { keys.left = keys.right = false; syncSliders(); $('#soundPanel').hidden = false; };
$('#soundClose').onclick = () => $('#soundPanel').hidden = true;
$('#renameBtn').onclick = () => { const n = cleanName($('#renameInput').value); if (!n){ $('#renameMsg').textContent = '이름을 써 주세요.'; return; } S.name = n; persist(); renderHud(); $('#renameMsg').textContent = '저장했어요.'; };
$('#helpBtn').onclick = () => { keys.left = keys.right = false; $('#helpContours').innerHTML = [1,2,3,4].map(n => `<div>${contourSVG(n)}${n}성 ${TONE_DESC[n]}</div>`).join(''); $('#helpPanel').hidden = false; };
$('#helpClose').onclick = () => $('#helpPanel').hidden = true;
$('#rankBtn').onclick = openRanking;
$('#rankClose').onclick = closeRanking;
window.addEventListener('resize', () => { if (!$('#play').hidden) resize(); });

/* ================= 메인 루프 =================
   학생이 게임을 시작한 뒤(S가 준비된 뒤)에만 그립니다. */
let lastT = performance.now(), posSave = 0;
function loop(now){
  const dt = Math.min(.033, (now - lastT)/1000); lastT = now;
  try {
    if (S && !$('#play').hidden){
      if (canControl()){ physics(dt); checkTriggers(); } else { P.vx = 0; }
      updateGuide(now);
      draw(now, dt);
      const zi = zoneAt(P.x); if (zi !== hudZone){ hudZone = zi; renderHud(); }
      if (now - posSave > 3000 && P.onGround && !P.dead && groundAt(P.x + P.w/2) != null){ posSave = now; S.x = P.x; store.save(S); }
    }
  } catch(err){ console.error(err); }
  requestAnimationFrame(loop);
}
window.__PANDA_LEVEL = LV; window.__PANDA_GROUND = groundAt; window.__PANDA_FRIENDS = friends; window.__PANDA_P = P; // 테스트용 (읽기 전용)
initStart();
requestAnimationFrame(loop);
})();

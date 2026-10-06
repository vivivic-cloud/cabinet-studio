#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**마이다 옵션에 측판과의 유격을 결정하는 측판유격 옵션을 추가해 주세요 -
   측판 유격은 측판보다 안쪽으로만 들어갈 수 있으며 0.5mm 단위로 집어넣을 수 있습니다.
   이때 서랍재의 생성논리에 따라 서랍재의 변경이 되도록 해야 합니다. 마이다의 이동에 맞춰 서랍이 이동하며
   이 서랍의 이동에 따라 서랍재의 사이징에 영향이 가야 합니다**」

     ① 마이다 판에 「측판유격」 줄이 있다 — 칸 53×23 · 줄 25(§0) · step 0.5 · 최소 0
     ② **유격 0 이면 예전 그대로다** — 마이다·서랍·서랍재 셋이 한 톨도 안 움직인다
     ③ 안으로만 들어간다 — 0.5 · 2 · 5 · 20 에서 마이다 폭이 `2 × 유격` 만큼 준다
     ④ **마이다가 가면 서랍이 꼭 그만큼 따라간다** — 서랍 왼끝 − 마이다 왼끝이 **어느 유격에서나 같다**
        (서랍이 유격을 **또 한 번** 먹으면 이 차가 벌어진다 — 그걸 못 박는다. 기본값에서 29 다)
     ⑤ 서랍재 셋이 다 따라간다 — 서랍재W 길이 · 서랍바닥 폭 · 부속서
     ⑥ **서랍재D 길이(깊이)는 안 움직인다** — 좌우로만 가는 값이다
     ⑦ 터무니없이 큰 값에서 붙잡힌다 — 마이다가 뒤집히지 않고 **오류 0**
     ⑧ 치기만 하면 안 먹고 「저장」 을 눌러야 먹는다(§4.9893)
     ⑨ **수납장 문짝은 한 톨도 안 바뀐다** — 판에 그 줄이 없고 자리도 그대로다

   돌리는 법:  node tests/마이다측판유격.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

const 스리 = process.env.TH || path.join(뿌리, 'tests', 'three.min.js');
if (!fs.existsSync(스리)){
  console.log('건너뜀 — three.min.js 사본이 없다 (TH=<경로> 로 알려 줄 수 있다)'); process.exit(0); }

const 손질 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'rule:()=>규칙,st:()=>state,행:()=>부속행들(buildModel(state)),' +
    'draw:()=>buildDrawing(state,buildModel(state))};' + 못);
};

const 띄우기 = (html) => new Promise(res => {
  const 서버 = http.createServer((q, a) => {
    if (q.url.indexOf('three.min.js') >= 0){
      a.writeHead(200, {'Content-Type':'application/javascript'}); return a.end(fs.readFileSync(스리)); }
    a.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); a.end(html);
  });
  서버.listen(0, '127.0.0.1', () => res({ 서버, 주소: 'http://127.0.0.1:' + 서버.address().port + '/' }));
});

let 깬것 = 0;
const 맞나 = (이름, 잰것, 바라는것) => {
  const ok = JSON.stringify(잰것) === JSON.stringify(바라는것);
  if (!ok) 깬것++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + 이름 + ' — 잰 값 ' + JSON.stringify(잰것) + (ok ? '' : ' · 바란 값 ' + JSON.stringify(바라는것)));
};
const 잠 = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:375, height:874 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(600);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(320); return true; };
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(600); };
  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(400); };
  const 펴기 = async () => { if (!await p.$('.opt[data-opt="문짝"]:not([hidden])'))
    await 손가락('.pname[data-opt="문짝"]'); await 잠(300); };
  // ⚠ 고치기 전 판에는 칸이 **아예 없다** — 널에 견디게 둔다(그러지 않으면 시험이 터져 깨진 수를 못 센다)
  const 빈칸 = { 이름:null, 칸:[0,0], 줄높이:0, step:null, min:null, 넘침:0 };
  const 칸읽기 = async () => (await p.evaluate(() => {
    const i = document.querySelector('#r_마이다측판유격'); if (!i) return null;
    const r = i.getBoundingClientRect(), 줄 = i.closest('.optnum');
    return { 이름:줄.querySelector('label').textContent, 칸:[Math.round(r.width), Math.round(r.height)],
             줄높이:Math.round(줄.getBoundingClientRect().height), step:i.step, min:i.min,
             넘침:document.documentElement.scrollWidth }; })) || 빈칸;

  // 재는 자 — 마이다 · 서랍재 셋. 서랍 제 몸은 부속이 아니므로(§4.9855) **서랍재로** 잰다.
  const 재기 = () => p.evaluate(() => {
    const ps = window.__probe.model().parts, 하나 = n => ps.filter(x => x.name === n);
    const m = 하나('마이다')[0], W = 하나('서랍재W')[0], D = 하나('서랍재D')[0], B = 하나('서랍바닥')[0];
    const Ds = 하나('서랍재D').map(x => x.x).sort((a,b) => a-b);
    return { 마이다: m ? [m.x, +(m.x + m.w).toFixed(3), m.w] : null,
             서랍왼: Ds.length ? Ds[0] : null,
             서랍폭: (Ds.length >= 2 && D) ? +(Ds[Ds.length-1] + D.w - Ds[0]).toFixed(3) : null,
             서랍재W길이: W ? W.w : null, 서랍재D깊이: D ? D.d : null,
             서랍바닥: B ? [B.x, B.w] : null,
             장수: [하나('마이다').length, 하나('서랍재W').length, 하나('서랍재D').length, 하나('서랍바닥').length] };
  });

  console.log('① 마이다 판의 「측판유격」 줄');
  await 품목('서랍장');
  await 두기({ W:800, D:400, H:1800, doors:4, backMode:'cover', doorMode:'out' });
  await 펴기();
  const 기 = await 칸읽기();
  맞나('이름 · 칸 · 줄 높이', [기.이름, 기.칸, 기.줄높이], ['측판유격', [53,23], 25]);
  맞나('0.5 걸음 · 안으로만(최소 0) · 가로 넘침', [기.step, 기.min, 기.넘침], ['0.5', '0', 375]);

  console.log('② 유격 0 이면 예전 그대로다');
  const 영 = await 재기();
  맞나('마이다 · 서랍 왼끝 · 서랍 폭', [영.마이다, 영.서랍왼, 영.서랍폭], [[2, 798, 796], 31, 738]);
  맞나('서랍재W 길이 · 서랍바닥 · 장수', [영.서랍재W길이, 영.서랍바닥, 영.장수], [714, [37.5, 725], [4,8,8,4]]);

  console.log('③ 안으로만 들어간다  ④ 서랍이 마이다를 따라간다(레일 13 을 두 번 안 먹는다)');
  const 넣기 = async v => { await p.evaluate(x => { window.__probe.rule().마이다측판유격 = x; window.__probe.set({}); }, v);
    await 잠(350); return 재기(); };
  for (const [v, 폭, 왼, 서랍폭, W, 바닥] of [[0.5, 795, 31.5, 737, 713, 724], [2, 792, 33, 734, 710, 721],
                                              [5, 786, 36, 728, 704, 715], [20, 756, 51, 698, 674, 685]]) {
    const r = await 넣기(v);
    맞나(`유격 ${v} — 마이다 폭 · 서랍 왼끝 · 서랍 폭`, [r.마이다[2], r.서랍왼, r.서랍폭], [폭, 왼, 서랍폭]);
    // 서랍이 유격을 두 번 먹으면 이 차가 29 보다 커진다 — 마이다와 서랍이 **같은 거리**를 가야 맞다
    맞나(`유격 ${v} — 서랍 왼끝 − 마이다 왼끝 (유격 0 과 같아야 한다)`, +(r.서랍왼 - r.마이다[0]).toFixed(3), 29);
    맞나(`유격 ${v} — 마이다·서랍이 간 거리가 같나`,
      [+(r.마이다[0] - 영.마이다[0]).toFixed(3), +(r.서랍왼 - 영.서랍왼).toFixed(3)], [v, v]);
    맞나(`유격 ${v} — 서랍재W 길이 · 서랍바닥 폭`, [r.서랍재W길이, r.서랍바닥[1]], [W, 바닥]);
  }

  console.log('⑤ 부속서가 따라간다  ⑥ 서랍재D 깊이는 안 움직인다');
  맞나('부속서 (유격 20)', await p.evaluate(() => window.__probe.행()
    .filter(r => /마이다|서랍재|서랍바닥/.test(r.name)).map(r => `${r.name}|${r.qty}|${r.L}|${r.W}`)),
    ['마이다|4|425.25|756', '서랍재W|8|674|383.25', '서랍재D|8|350|383.25', '서랍바닥|4|685|337']);
  맞나('서랍재D 깊이 — 유격 0 · 20', [영.서랍재D깊이, (await 재기()).서랍재D깊이], [350, 350]);

  console.log('⑦ 터무니없이 큰 값에서 붙잡힌다');
  const 큰 = await 넣기(500);
  맞나('유격 500 — 마이다 폭이 0 밑으로 안 간다 · 서랍이 0장', [큰.마이다[2] > 0, 큰.장수], [true, [4,0,0,0]]);

  console.log('⑧ 치기만 하면 안 먹고 「저장」 을 눌러야 먹는다');
  await 넣기(0);
  await 펴기();
  const 치기 = async v => { const i = await p.$('#r_마이다측판유격'); if (!i) return;
    await i.scrollIntoViewIfNeeded(); await 잠(120); const r = await i.boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(200);
    await i.fill(String(v)); await 잠(250); };
  await 치기(2.5);
  맞나('치기만 — 규칙 · 마이다 폭', [await p.evaluate(() => window.__probe.rule().마이다측판유격),
    (await 재기()).마이다[2]], [0, 796]);
  await 손가락('[data-optsave="문짝"]'); await 잠(450);
  const 저 = await 재기();
  맞나('저장 뒤 — 규칙 · 마이다 폭 · 서랍 왼끝',
    [await p.evaluate(() => window.__probe.rule().마이다측판유격), 저.마이다[2], 저.서랍왼], [2.5, 791, 33.5]);

  console.log('⑨ 수납장 문짝은 한 톨도 안 바뀐다');
  await 품목('수납장');
  await 두기({ doors:2 });
  if (!await p.$('.opt[data-opt="문짝"]:not([hidden])')) await 손가락('.pname[data-opt="문짝"]');
  await 잠(300);
  맞나('수납장 문짝 판의 유격 줄 이름', await p.evaluate(() => [...document
    .querySelectorAll('.opt[data-opt="문짝"] .optnum label')].map(x => x.textContent)),
    ['도어 위 유격', '도어 아래 유격']);
  맞나('수납장 문짝 자리 (유격은 서랍장 것이라 안 먹는다)', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '문짝').map(x => `${x.x}|${x.w}`)),
    ['2|396', '402|396']);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 10-05 사장님 말씀: 「**서랍장의 분해시 서랍재는 분해하지 않고 서랍의 조립된 모습을 보여줘.**」

     ① 분해도를 올려도 **서랍재 셋은 한 톨도 안 움직인다**(서랍재W · 서랍재D · 서랍바닥)
     ② 몸통은 **예전 그대로 흩어진다**(측판 · 상판 · 마이다) — 분해도를 뺏지 않았다
     ③ **서랍재끼리의 거리가 분해 0 과 분해 60 에서 글자까지 같다** — 한 덩어리이고 **제자리**다
     ④ 밀 쪽(`userData.dir`)이 서랍재 셋만 `0,0,0` 이다
     ⑤ **부속서에는 셋이 따로 나온다** — 「서랍」 이라는 부속은 어디에도 안 선다(§4.9855)
     ⑥ 수납장은 서랍재가 0장이고 몸통 분해가 그대로다
     ⑦ 2D 에는 분해도가 **없다** — `buildDrawing` 은 `state.explode` 를 한 글자도 안 읽는다

   돌리는 법:  node tests/서랍분해.js
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

const 원글 = () => fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
const 손질 = () => {
  let s = 원글();
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'st:()=>state,grp:()=>group,행:()=>부속행들(buildModel(state))};' + 못);
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
const 서랍재 = ['서랍재W','서랍재D','서랍바닥'];

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:375, height:900 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(600);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  const 품목고르기 = async 품 => { await 손가락('#itemSel');
    await p.selectOption('#itemSel', 품); await 잠(600); };

  // 분해도를 v 로 두고 조각 자리를 잰다 — 조각 이름은 `userData.key` 의 앞머리다
  const 재기 = v => p.evaluate(v => {
    const sl = document.querySelector('#explode');
    if (sl){ sl.value = String(v); sl.dispatchEvent(new Event('input', { bubbles:true })); }
    const r = n => Math.round(n * 100) / 100, 자리 = {}, dir = {};
    const 이름 = c => String((c.userData || {}).key || '').split('|')[0];
    window.__probe.grp().children.forEach(c => { const n = 이름(c); if (!n) return;
      (자리[n] = 자리[n] || []).push([r(c.position.x), r(c.position.y), r(c.position.z)]);
      if (c.userData.dir) dir[n] = c.userData.dir.join(','); });
    return { 자리, dir };
  }, v);
  const 움직임 = (a, c, n) => (a.자리[n] || []).map((q, i) =>
    Math.round(Math.hypot(c.자리[n][i][0]-q[0], c.자리[n][i][1]-q[1], c.자리[n][i][2]-q[2]) * 100) / 100);
  const 서로거리 = o => { const 점 = [];
    서랍재.forEach(n => (o.자리[n] || []).forEach(q => 점.push(q)));
    const 쟀 = []; for (let i = 0; i < 점.length; i++) for (let j = i+1; j < 점.length; j++)
      쟀.push(Math.round(Math.hypot(점[i][0]-점[j][0], 점[i][1]-점[j][1], 점[i][2]-점[j][2]) * 100) / 100);
    return 쟀; };

  console.log('── 서랍장 (800×400×1800 · 마이다 4)');
  await 품목고르기('서랍장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:4, shelves:0, shelvesM:0,
    Tsb:12, backMode:'cover', doorMode:'out' }));
  await 잠(500);
  const 접힘 = await 재기(0); await 잠(250);
  const 폄 = await 재기(60); await 잠(250);

  // ① 서랍재는 한 톨도 안 움직인다
  맞나('서랍재W 가 분해 60 에서 움직인 거리', 움직임(접힘, 폄, '서랍재W'), [0,0,0,0,0,0,0,0]);
  맞나('서랍재D 가 분해 60 에서 움직인 거리', 움직임(접힘, 폄, '서랍재D'), [0,0,0,0,0,0,0,0]);
  맞나('서랍바닥이 분해 60 에서 움직인 거리', 움직임(접힘, 폄, '서랍바닥'), [0,0,0,0]);
  // ② 몸통은 예전 그대로 흩어진다
  맞나('몸통은 흩어진다 (측판·상판·마이다 다 0 보다 크다)',
    ['측판','상판','마이다'].map(n => 움직임(접힘, 폄, n).every(v => v > 100)), [true, true, true]);
  // ③ 서랍재끼리 거리가 글자까지 같다
  맞나('서랍재끼리 거리가 분해 0 과 60 에서 같나', 서로거리(폄), 서로거리(접힘));
  맞나('그 거리가 몇 개인가', 서로거리(접힘).length, 190);
  // ④ 밀 쪽
  맞나('밀 쪽이 0,0,0 인 부속', Object.keys(폄.dir).filter(n => 폄.dir[n] === '0,0,0').sort(),
    ['서랍바닥','서랍재D','서랍재W']);
  // ⑤ 부속서
  const 표 = await p.evaluate(() => { const m = window.__probe.model();
    return { 줄: window.__probe.행().map(r => r.name).filter(n => /서랍/.test(n)),
             서랍이름: m.parts.filter(x => x.name === '서랍').length }; });
  맞나('부속서에 서랍재 셋이 따로 나온다', 표.줄.sort(), ['서랍바닥','서랍재D','서랍재W']);
  맞나('「서랍」 이라는 부속은 안 선다', 표.서랍이름, 0);

  // ⑥ 수납장
  console.log('── 수납장');
  await 품목고르기('수납장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:2, shelves:3, shelvesM:0,
    backMode:'cover', doorMode:'out' }));
  await 잠(500);
  const 접2 = await 재기(0); await 잠(250);
  const 폄2 = await 재기(60); await 잠(250);
  맞나('수납장에는 서랍재가 없다', 서랍재.map(n => (폄2.자리[n] || []).length), [0,0,0]);
  맞나('수납장 몸통은 흩어진다',
    ['측판','상판','문짝'].map(n => 움직임(접2, 폄2, n).every(v => v > 100)), [true, true, true]);

  // ⑦ 2D 에는 분해도가 없다
  맞나('buildDrawing 이 state.explode 를 읽나',
    /function buildDrawing[\s\S]*?\n\}/.exec(원글())[0].includes('explode'), false);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

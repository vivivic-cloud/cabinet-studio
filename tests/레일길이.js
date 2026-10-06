#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**서랍설정에 레일설정 옵션을 추가해 주세요 - 레일설정은 레일의 길이를 선택할 수 잇습니다.
   레일의 길이는 250/300/350/400/450/500/550 이 있으며 측판의 실제 사용깊이 보다 긴 레일은 선택할 수 없습니다.**」

     ① 서랍설정 판에 「레일길이」 줄이 있다 — 칸 82×25 · 줄 25(§0) · **수납장에는 서랍설정 메뉴가 없다**
     ② 목록은 **`선반깊이`(= 측판의 실제 사용깊이) 보다 짧거나 같은 것만**이다 (네 갈래)
     ③ **긴 레일은 목록에 아예 없다** — 고를 길이 없다
     ④ 고르고 「저장」 을 누르면 `규칙.레일길이` 에 담긴다
     ⑤ 깊이를 줄이면 **들어가는 가장 긴 것**을 보이고 **담긴 숫자는 그대로**다 — 되돌리면 되살아난다
     ⑥ 250 보다 얕으면 고를 것이 하나도 없다 — **터지지 않는다**(`—` 하나)
     ⑦ **레일 길이는 도면·부속서를 한 톨도 안 바꾼다** — 길이 말고는 아무것도 안 움직인다

   돌리는 법:  node tests/레일길이.js
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
  const 펴기 = async () => { if (!await p.$('.opt[data-opt="서랍설정"]:not([hidden]) #r_레일길이'))
    await 손가락('.pname[data-opt="서랍설정"]'); await 잠(300); };
  // ⚠ 고치기 전 판에는 칸이 **아예 없다** — 널에 견디게 둔다(그러지 않으면 시험이 터져 깨진 수를 못 센다)
  const 빈값 = { 보기:[], 고른값:null, 칸:[0,0], 줄높이:0, 이름:null, 규칙:undefined, 선반깊이:null, 넘침:0 };
  const 읽기 = async () => (await p.evaluate(() => { const s = document.querySelector('#r_레일길이');
    if (!s) return null;
    const r = s.getBoundingClientRect(), 줄 = s.closest('.optnum');
    return { 보기:[...s.options].map(o => o.value), 고른값:s.value,
             칸:[Math.round(r.width), Math.round(r.height)], 줄높이:Math.round(줄.getBoundingClientRect().height),
             이름:줄.querySelector('label').textContent,
             규칙:window.__probe.rule().레일길이, 선반깊이:window.__probe.model().선반깊이,
             넘침:document.documentElement.scrollWidth }; })) || 빈값;

  console.log('① 서랍설정 판의 「레일길이」 줄');
  await 품목('서랍장');
  await 두기({ W:800, D:400, H:1800, doors:4, backMode:'cover', doorMode:'out' });
  await 펴기();
  const 기 = await 읽기();
  맞나('이름 · 칸 · 줄 높이', [기.이름, 기.칸, 기.줄높이], ['레일길이', [82,25], 25]);
  맞나('가로 넘침', 기.넘침, 375);

  console.log('② 목록은 「실제 사용깊이」 보다 짧거나 같은 것만이다  ③ 긴 것은 아예 없다');
  맞나('덮기·외부 D400 (선반깊이 400)', [기.선반깊이, 기.보기], [400, ['250','300','350','400']]);
  await 두기({ backMode:'insert' });                     // 우라홈 9 만큼 짧아진다
  const 끼 = await 읽기();
  맞나('끼우기 (선반깊이 391)', [끼.선반깊이, 끼.보기], [391, ['250','300','350']]);
  await 두기({ backMode:'cover', doorMode:'in' });        // 마이다 두께만큼 더 물린다
  const 인 = await 읽기();
  맞나('내부 (선반깊이 382)', [인.선반깊이, 인.보기], [382, ['250','300','350']]);
  await 두기({ doorMode:'out', D:600 });
  const 깊 = await 읽기();
  맞나('D600 (선반깊이 600) — 일곱이 다 보인다', [깊.선반깊이, 깊.보기],
    [600, ['250','300','350','400','450','500','550']]);

  console.log('④ 고르고 「저장」  ⑤ 깊이를 줄이면 들어가는 가장 긴 것 · 담긴 숫자는 그대로');
  const 고르기 = async v => { if (await p.$('#r_레일길이')) await p.selectOption('#r_레일길이', v); await 잠(200); };
  await 고르기('550');
  await 손가락('[data-optsave="서랍설정"]'); await 잠(450);
  await 펴기();
  맞나('550 을 골라 저장하면 규칙에 담긴다', (await 읽기()).규칙, 550);
  await 두기({ D:400 });
  const 줄임 = await 읽기();
  맞나('D400 으로 줄이면 — 보이는 값 · 담긴 값', [줄임.보기, 줄임.고른값, 줄임.규칙],
    [['250','300','350','400'], '400', 550]);
  await 두기({ D:600 });
  맞나('D600 으로 되돌리면 고른 값이 살아난다', (await 읽기()).고른값, '550');

  console.log('⑥ 250 보다 얕으면 고를 것이 없다 — 터지지 않는다');
  await 두기({ D:200 });
  const 얕 = await 읽기();
  맞나('D200 — 목록 · 담긴 값', [얕.보기, 얕.규칙, 얕.선반깊이], [['0'], 550, 200]);

  console.log('⑦ 레일 길이는 도면·부속서를 한 톨도 안 바꾼다');
  await 두기({ D:600 });
  const 같나 = () => p.evaluate(() => ({
    부속: window.__probe.model().parts.map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('|'),
    부속서: window.__probe.행().map(r => `${r.name}|${r.qty}|${r.L}|${r.W}|${r.T}`).join('|'),
    조각: window.__probe.draw().P.length }));
  const 전 = await 같나();
  await 고르기('250');
  await 손가락('[data-optsave="서랍설정"]'); await 잠(450);
  await 펴기();
  맞나('250 으로 바꿔도 부속·부속서·도면 조각이 같다', await 같나(), 전);
  맞나('그래도 담긴 값은 250 이다', (await 읽기()).규칙, 250);

  console.log('① 수납장에는 서랍설정 메뉴가 없다');
  await 품목('수납장');
  맞나('수납장 — 서랍설정 메뉴', await p.evaluate(() =>
    getComputedStyle(document.querySelector('#drawerSetBox')).display), 'none');

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

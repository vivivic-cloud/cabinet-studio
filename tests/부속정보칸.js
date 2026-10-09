#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**3d도면 상태에서 부속 선택시 해당 부속의 2D도면에서 표현된 정보가 3D 도면 우측 여백에
   나타나도록 해주세요 - 팝업이 아닙니다.**」

     ① 칸이 3D 칸 안에 있고 **처음엔 접혀 있다**(적을 것이 없는 칸을 띄우지 않는다 · §0)
     ② **진짜로 톡 쳐** 부속을 고르면 뜨고, 적힌 줄이 **2D 부속 쪽과 글자까지 같다**
     ③ 1280 — 캔버스를 **한 픽셀도 안 뺏는다** · `.hud`·분해 띠와 **안 겹친다** · 칸 안에 든다
     ④ 폰 375 — **캔버스 위**에 서고 **첫 화면 안**이다 · 안 고르면 짜임이 한 톨도 안 바뀐다
     ⑤ 다른 부속을 고르면 글이 갈리고, 치수를 바꾸면 **접힌다**(고른 것이 풀리므로)
     ⑥ DXF·부속서가 **한 글자도 안 바뀐다** · 오류 0

   돌리는 법:  node tests/부속정보칸.js
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
  // ⚠ 고치기 전 판에는 `부속정보줄` 이 없다 — 널에 견디게 감싼다(§4.986-모바일 과 같은 자리).
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'sel:()=>selPid,고르기:(n)=>select(n),키:()=>pidKey,행:()=>부속행들(모델||buildModel(state)),' +
    '정보줄:(r,m)=>(typeof 부속정보줄==="function"?부속정보줄(r,m):null),' +
    'dxf:()=>buildDXF(drawing),쪽:()=>부속쪽들(모델||buildModel(state))};' + 못);
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

const 칸재기 = p => p.evaluate(() => {
  const e = document.querySelector('#partInfo');
  const cv0 = document.querySelector('.view3d canvas').getBoundingClientRect();
  // ⚠ 고치기 전 판에는 칸이 아예 없다 — 널에 견디게 한다(§4.986-모바일 과 같은 자리).
  if (!e) return { 없음:true, 접힘:null, 제목:null, 줄:[], 네모:[0,0], 칸안:false, hud겹:false, 분해겹:false,
    캔위:false, 첫화면안:false, 캔:[Math.round(cv0.width), Math.round(cv0.height)],
    문서: document.documentElement.scrollHeight, 넘침: document.documentElement.scrollWidth };
  const r = e.getBoundingClientRect(), v = document.querySelector('.view3d').getBoundingClientRect();
  const cv = document.querySelector('.view3d canvas').getBoundingClientRect();
  const hd = document.querySelector('.hud').getBoundingClientRect();
  const ex = document.querySelector('.explode').getBoundingClientRect();
  const 겹 = (a, c) => a.left < c.right-1 && a.right > c.left+1 && a.top < c.bottom-1 && a.bottom > c.top+1;
  return { 접힘: e.hidden,
    제목: (e.querySelector('.pititle') || {}).textContent || null,
    줄: [...e.querySelectorAll('.pirow')].map(x => x.textContent),
    네모: [Math.round(r.width), Math.round(r.height)],
    칸안: !e.hidden && r.left >= v.left-0.5 && r.right <= v.right+0.5 && r.top >= v.top-0.5 && r.bottom <= v.bottom+0.5,
    hud겹: !e.hidden && 겹(r, hd), 분해겹: !e.hidden && 겹(r, ex),
    캔위: !e.hidden && r.bottom <= cv.top + 0.5,
    첫화면안: !e.hidden && r.top >= 0 && r.bottom <= innerHeight,
    캔: [Math.round(cv.width), Math.round(cv.height)],
    문서: document.documentElement.scrollHeight, 넘침: document.documentElement.scrollWidth };
});

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();

  // ───────── 1280 ─────────
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(700);
  await p.evaluate(() => window.__probe.set({ backMode:'insert' })); await 잠(400);

  console.log('① 칸이 3D 칸 안에 있고 처음엔 접혀 있다');
  { const z = await 칸재기(p);
    맞나('칸이 있다 · 접혀 있다 · 글 0', [!z.없음, z.접힘, z.줄.length], [true, true, 0]); }

  console.log('② 톡 쳐서 고르면 뜬다 · 2D 부속 쪽과 글자까지 같다');
  { // ⚠ `.hud` 밑을 쳐라 — 위쪽은 도구줄·시점줄이 받는다(§4.11).
    const cv = await p.$('.view3d canvas'); const r = await cv.boundingBox();
    await p.mouse.click(r.x + r.width*0.5, r.y + r.height*0.62); await 잠(400);
    const z = await 칸재기(p);
    const 쪽값 = await p.evaluate(() => {
      const m = window.__probe.model(), key = window.__probe.키()[window.__probe.sel()];
      const r = window.__probe.행().find(x => `${x.name}|${x.L}|${x.W}|${x.T}` === key);
      const 줄 = window.__probe.정보줄(r, m);
      return 줄 ? { 이름:r.name, 줄: 줄.map(([a, b]) => a + String(b)) } : null;
    });
    맞나('고르면 펴진다', z && z.접힘, false);
    맞나('제목이 그 부속 이름', [z && z.제목, 쪽값 && 쪽값.이름], [쪽값 && 쪽값.이름, 쪽값 && 쪽값.이름]);
    맞나('줄이 2D 부속 쪽과 글자까지 같다', z && z.줄, 쪽값 && 쪽값.줄); }

  console.log('③ 1280 — 캔버스를 안 뺏는다 · hud·분해 띠와 안 겹친다');
  { const 안 = await p.evaluate(() => { window.__probe.고르기(null); return 0; }); await 잠(300);
    const 접 = await 칸재기(p);
    await p.evaluate(() => window.__probe.고르기(0)); await 잠(300);
    const 폄 = await 칸재기(p);
    맞나('캔버스가 그대로', [접.캔, 폄.캔], [[995,831], [995,831]]);
    맞나('문서 높이·넘침 그대로', [접.문서, 폄.문서, 폄.넘침], [900, 900, 1280]);
    맞나('칸 안 · hud 안 겹침 · 분해 띠 안 겹침', [폄.칸안, 폄.hud겹, 폄.분해겹], [true, false, false]);
    맞나('첫 화면 안', 폄.첫화면안, true); }

  console.log('⑤ 다른 부속을 고르면 갈린다 · 치수를 바꾸면 접힌다');
  { const a = await 칸재기(p);
    await p.evaluate(() => window.__probe.고르기(2)); await 잠(300);
    const c = await 칸재기(p);
    맞나('다른 부속 — 제목이 갈린다', [a.제목 !== c.제목, c.접힘], [true, false]);
    await p.evaluate(() => window.__probe.set({ H:1900 })); await 잠(400);
    맞나('치수를 바꾸면 접힌다', (await 칸재기(p)).접힘, true);
    await p.evaluate(() => window.__probe.set({ H:1800 })); await 잠(400); }

  console.log('⑥ DXF·부속서가 한 글자도 안 바뀐다');
  { const 전 = await p.evaluate(() => [window.__probe.dxf().length,
      window.__probe.쪽().map(z => z.이름들.join('·')).join(' / ')]);
    await p.evaluate(() => window.__probe.고르기(0)); await 잠(300);
    const 후 = await p.evaluate(() => [window.__probe.dxf().length,
      window.__probe.쪽().map(z => z.이름들.join('·')).join(' / ')]);
    맞나('고르기 전·후 DXF 바이트 · 쪽 이름', 후, 전);
    // 10-09 부터 글자수 ≠ 바이트다 — 바이트는 `tests/디엑스에프한글.js` 가 못 박는다(§4.9840)
    맞나('DXF 끼우기 2.7T 글자수', 후[0], 108112); }
  await ctx.close();

  // ───────── 폰 375 ─────────
  console.log('④ 폰 375 — 캔버스 위 · 첫 화면 안 · 안 고르면 짜임 불변');
  { const ctx2 = await b.newContext({ viewport:{ width:375, height:874 }, hasTouch:true, isMobile:true });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', e => 터짐.push(String(e)));
    const cdp = await ctx2.newCDPSession(p2);
    await p2.goto(주소, { waitUntil:'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout:20000 });
    await 잠(700);
    await p2.evaluate(() => window.__probe.set({ backMode:'insert' })); await 잠(400);
    const 접 = await 칸재기(p2);
    맞나('안 고르면 접혀 있고 캔버스·문서가 그대로', [접.접힘, 접.캔, 접.문서, 접.넘침],
      [true, [375,524], 1451, 375]);
    // 진짜 손가락 — `.hud` 밑을 친다
    const cv = await p2.$('.view3d canvas'); await cv.scrollIntoViewIfNeeded(); await 잠(150);
    const r = await cv.boundingBox();
    const x = r.x + r.width*0.5, y = r.y + r.height*0.62;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(500);
    const 폄 = await 칸재기(p2);
    맞나('진짜 손가락으로 고르면 펴진다', 폄.접힘, false);
    맞나('캔버스 위에 선다 · 첫 화면 안 · 칸 안', [폄.캔위, 폄.첫화면안, 폄.칸안], [true, true, true]);
    맞나('가로 넘침 · 캔버스 폭', [폄.넘침, 폄.캔[0]], [375, 375]);
    await ctx2.close(); }

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

#!/usr/bin/env node
/* 10-02 관리자 지시 (사장님 09-30 말씀 「이동선반 … 고정선반과 구분될 수 있도록」 의 3D 쪽):

     ① 이동선반 면만 **비친다**(transparent true · opacity 0.45) · 고정선반은 안 비친다
     ② **모서리선은 두 쪽 다 또렷하다**(transparent false · opacity 1 · 색 그대로)
     ③ **이동선반 0단이면 비치는 조각이 0** — 고치기 전과 한 톨도 같다
     ④ **고른 이동선반은 꽉 찬 빨강**(비침이 빨강을 안 먹는다) · 안 고른 이동선반은 그대로 비친다
     ⑤ 2D 도면(`.옅음`)·부품표는 한 줄도 안 바뀐다

   돌리는 법:  node tests/이동선반3D.js
   three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},grp:()=>group,cam:()=>camera,sel:()=>selPid,T:()=>THREE,model:()=>buildModel(state)};' + 못);
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
  for (const 폭 of [375, 1280]) {
    console.log(`■ ${폭}px`);
    const ctx = await b.newContext({ viewport:{ width:폭, height:폭 === 375 ? 780 : 900 },
      hasTouch: 폭 === 375, isMobile: 폭 === 375 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(900);

    // 조각의 재질을 부속 이름으로 모아 읽는다
    const 재질 = () => p.evaluate(() => {
      const grp = window.__probe.grp(), 모델 = window.__probe.model(), 표 = {};
      grp.children.forEach(c => { const nm = 모델.parts[c.userData.pid].name;
        (표[nm] = 표[nm] || []).push([c.material.transparent, +c.material.opacity.toFixed(2),
                                      c.children[0].material.transparent, c.children[0].material.opacity]); });
      return 표; });

    await p.evaluate(() => window.__probe.set({ shelves:2, shelvesM:2, doors:0 })); await 잠(600);

    console.log('① 이동선반 면만 비친다 · 고정선반은 안 비친다');
    const m1 = await 재질();
    맞나('이동선반 면 (비침/투명도)', m1['이동선반'].map(x => x.slice(0,2)), [[true,0.45],[true,0.45]]);
    맞나('고정선반 면 (비침/투명도)', m1['고정선반'].map(x => x.slice(0,2)), [[false,1],[false,1]]);
    맞나('몸통 네 장도 안 비친다',
      ['상판','하판','측판','뒷판'].map(n => m1[n].every(x => x[0] === false && x[1] === 1)), [true,true,true,true]);

    console.log('② 모서리선은 두 쪽 다 또렷하다');
    맞나('이동선반 모서리선 (비침/투명도)', m1['이동선반'].map(x => x.slice(2)), [[false,1],[false,1]]);
    맞나('고정선반 모서리선 (비침/투명도)', m1['고정선반'].map(x => x.slice(2)), [[false,1],[false,1]]);
    맞나('모서리선 색 (두 쪽 다)', await p.evaluate(() => {
      const grp = window.__probe.grp(), 모델 = window.__probe.model();
      const 색 = n => '#' + grp.children.find(c => 모델.parts[c.userData.pid].name === n).children[0].material.color.getHexString();
      return [색('이동선반'), 색('고정선반')]; }), ['#4e3a24', '#4e3a24']);

    console.log('③ 이동선반 0단이면 비치는 조각이 0');
    await p.evaluate(() => window.__probe.set({ shelves:3, shelvesM:0, doors:2 })); await 잠(600);
    맞나('이동선반 장수 · 비치는 조각 수', await p.evaluate(() => {
      const grp = window.__probe.grp(), 모델 = window.__probe.model();
      return [모델.parts.filter(x => x.name === '이동선반').length,
              grp.children.filter(c => c.material.transparent).length]; }), [0, 0]);

    console.log('④ 고른 이동선반은 꽉 찬 빨강 · 안 고른 이동선반은 그대로 비친다');
    await p.evaluate(() => window.__probe.set({ shelves:2, shelvesM:2, doors:0 })); await 잠(600);
    const cv = await p.$('#c3d'); await cv.scrollIntoViewIfNeeded(); await 잠(300);
    const 자리 = await p.evaluate(() => {
      const grp = window.__probe.grp(), 모델 = window.__probe.model(), cam = window.__probe.cam(),
            T = window.__probe.T(), c = document.querySelector('#c3d');
      const ms = grp.children.filter(x => 모델.parts[x.userData.pid].name === '이동선반');
      const m = ms[ms.length - 1], v = new T.Vector3(); m.getWorldPosition(v); v.project(cam);
      const r = c.getBoundingClientRect();
      return { x: r.x + (v.x + 1) / 2 * r.width, y: r.y + (1 - (v.y + 1) / 2) * r.height }; });
    if (폭 === 375){
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:자리.x, y:자리.y }] });
      await 잠(80);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    } else await p.mouse.click(자리.x, 자리.y);
    await 잠(600);
    맞나('톡 쳐서 이동선반이 골라졌나', await p.evaluate(() => {
      const s = window.__probe.sel(); return s === null ? null : window.__probe.model().parts[s].name; }), '이동선반');
    맞나('고른 것 — 면 비침 · 면 색 · 모서리선 색', await p.evaluate(() => {
      const grp = window.__probe.grp(), s = window.__probe.sel();
      const m = grp.children.find(c => c.userData.pid === s);
      return [m.material.transparent, m.material.opacity, '#' + m.material.color.getHexString(),
              '#' + m.children[0].material.color.getHexString()]; }), [false, 1, '#f2654e', '#ff3b30']);
    맞나('안 고른 이동선반은 그대로 비친다', await p.evaluate(() => {
      const grp = window.__probe.grp(), 모델 = window.__probe.model(), s = window.__probe.sel();
      const m = grp.children.find(c => 모델.parts[c.userData.pid].name === '이동선반' && c.userData.pid !== s);
      return [m.material.transparent, +m.material.opacity.toFixed(2)]; }), [true, 0.45]);

    console.log('⑤ 2D 도면·부품표는 한 줄도 안 바뀐다');
    맞나('도면의 옅음 조각 수 · 부품표 줄 수', await p.evaluate(() => {
      document.querySelector('.modeseg [data-mode="2d"]').click();
      return new Promise(r => setTimeout(() => r([document.querySelectorAll('#svgwrap .옅음').length,
        document.querySelectorAll('#bomBody tr').length]), 700)); }), [168, 7]);

    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

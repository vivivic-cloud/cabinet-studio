#!/usr/bin/env node
/* 10-03 사장님 말씀
     「**3d도면에서 특정구간 다른부분에 비해 확대화면이 제한되는경우가 있어 이를 해결해줘**」

     까닭은 `zoomBy` 의 안쪽 한계였다 — `Math.max(300, …)`. 장 전체를 볼 때는 넉넉하지만
     홈(6mm)·유격(2~3) 같은 작은 자리를 보려 하면 거기서 막힌다. 300 에서 홈은 화면 세로의 **3%** 였다.

     ① `near`/`far` 가 **5 / 30000** 이고 두 카메라가 같다 · `far/near` 비 **6000** 그대로
     ② 안쪽 한계가 **15** 다 — 휠로 끝까지 당기면 `tR 15` · 보이는 세로 **8.6mm** · 홈 6mm 이 세로의 **70%**
     ③ **바깥 한계는 그대로 11,760** · 전체(Shift+Z) 는 r 3920 · 기준 0,0,0
     ④ **진짜 손가락 두 개**로 벌리면 15 까지 · 좁히면 11,760 까지
     ⑤ 안쪽 한계가 `near` 보다 크다 — 그래야 코앞에서 판이 안 잘린다
     ⑥ 오류 0

   돌리는 법:  node tests/삼디줌.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).

   ⚠ 휠은 **마우스를 캔버스 위로 옮긴 뒤**라야 먹는다(한 번 그래서 `tR` 이 안 움직였다).
   ⚠ 두 손가락은 **손짓마다 캔버스 자리를 다시 재라**(§4.71 · §7.5). 폰에서는 캔버스가 화면 밖에 있다. */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

const 스리 = process.env.TH || path.join(뿌리, 'tests', 'three.min.js');
if (!fs.existsSync(스리)){
  console.log('건너뜀 — three.min.js 사본이 없다 (TH=<경로> 로 알려 줄 수 있다)'); process.exit(0); }

const 손질글 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),'
    + 'st:()=>state,rule:()=>규칙,cam:()=>camera,aim:()=>cam,grp:()=>group,rend:()=>renderer,T:()=>THREE};' + 못);
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
  const { 서버, 주소 } = await 띄우기(손질글());
  const b = await chromium.launch();

  /* ───────── ①②③⑤ 넓은 화면 · 휠 ───────── */
  {
    const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);

    console.log('① near/far 와 두 카메라  ⑤ 안쪽 한계가 near 보다 크다');
    맞나('화면 카메라 near·far', await p.evaluate(() =>
      [window.__probe.cam().near, window.__probe.cam().far]), [5, 30000]);
    맞나('far/near 비', await p.evaluate(() =>
      window.__probe.cam().far / window.__probe.cam().near), 6000);

    await p.evaluate(() => window.__probe.set({ backMode:'insert', doors:0 })); await 잠(700);
    const R = () => p.evaluate(() => +window.__probe.aim().tR.toFixed(2));
    const e = await p.$('#c3d'); const r = await e.boundingBox();
    const cx = r.x + r.width/2, cy = r.y + r.height/2;

    console.log('② 휠로 끝까지 당긴다 — 안쪽 한계 15');
    await p.mouse.move(cx, cy);                       // 캔버스 위로 옮긴 뒤라야 휠이 먹는다
    for (let i = 0; i < 150; i++) await p.mouse.wheel(0, -300);
    await 잠(1800);
    const 안 = await R();
    맞나('안쪽 한계', 안, 15);
    맞나('안쪽 한계 > near', 안 > await p.evaluate(() => window.__probe.cam().near), true);
    맞나('보이는 세로(mm) · 홈 6mm 이 세로의 %', await p.evaluate(() => {
      const c = window.__probe.cam(), a = window.__probe.aim();
      const h = 2 * Math.tan(c.fov * Math.PI / 360) * a.tR;
      return [+h.toFixed(1), Math.round(6 / h * 100)]; }), [8.6, 70]);

    console.log('③ 바깥 한계와 전체는 그대로다');
    await p.mouse.move(cx, cy);
    for (let i = 0; i < 220; i++) await p.mouse.wheel(0, 300);
    await 잠(1800);
    맞나('바깥 한계', await R(), 11760);
    await p.keyboard.press('Shift+Z'); await 잠(1600);
    맞나('전체 — r · 기준', await p.evaluate(() => { const a = window.__probe.aim();
      return [+a.tR.toFixed(0), [a.tTgt.x, a.tTgt.y, a.tTgt.z].map(v => +v.toFixed(1)).join(',')]; }),
      [3920, '0,0,0']);
    맞나('오류 (1280)', 터짐, []);
    await ctx.close();
  }

  /* ───────── ④ 폰 · 진짜 손가락 두 개 ───────── */
  {
    const ctx = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    const e = await p.$('#c3d');
    await e.scrollIntoViewIfNeeded(); await 잠(400);
    const R = () => p.evaluate(() => +window.__probe.aim().tR.toFixed(2));
    /* 손짓마다 캔버스 자리를 다시 잰다 — 3D 를 만지면 설정 칸이 접혀 캔버스가 올라간다(§4.7).
       ⚠ 10-04 부터 캔버스가 쪽 **가운데**다(§4.98617) — 아래쪽이 화면 밖으로 나간다.
          `boundingBox()` 는 굴려 주지 않으므로 **먼저 굴려 넣고** 짚을 자리를 화면 안으로 가둔다.
          안 그러면 손가락이 화면 밖에 떨어져 **한 번만 먹는다**(잰 값: 14번 벌려도 R 1470 에서 멈춘다). */
    const 핀치 = async (시작, 끝) => {
      await e.scrollIntoViewIfNeeded(); await 잠(150);
      const r = await e.boundingBox(), vh = p.viewportSize().height;
      const x0 = r.x + r.width / 2;                                // `.hud` 밑을 짚는다 (§4.11)
      const y0 = Math.max(r.y + 10, Math.min(r.y + r.height * 0.72, r.y + r.height - 10, vh - 20));
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[
        { x:x0 - 시작/2, y:y0, id:1 }, { x:x0 + 시작/2, y:y0, id:2 }] });
      await 잠(80);
      for (let i = 1; i <= 8; i++){ const d = 시작 + (끝 - 시작) * i / 8;
        await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[
          { x:x0 - d/2, y:y0, id:1 }, { x:x0 + d/2, y:y0, id:2 }] });
        await 잠(70); }
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      await 잠(400); };

    console.log('④ 진짜 손가락 두 개');
    맞나('처음 r', await R(), 3920);
    for (let i = 0; i < 14; i++) await 핀치(60, 160);
    맞나('벌리면 안쪽 한계까지', await R(), 15);
    for (let i = 0; i < 20; i++) await 핀치(160, 60);
    맞나('좁히면 바깥 한계까지', await R(), 11760);
    맞나('오류 (375)', 터짐, []);
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

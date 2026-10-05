#!/usr/bin/env node
/* 10-05 관리자: 「서랍장을 분해(100%)한 뒤 도구줄의 「전체」 를 눌러도 **그림이 화면 밖으로 나간다.**
   … `extR()` 이 `state.explode` 를 한 글자도 안 본다. **고칠 것은 `extR()` 하나뿐이다.**
   `state.explode === 0` 이면 **지금 값과 한 톨도 같아야 한다** — 그게 이 고침의 안전장치다.」

     ① **분해 0 이면 `extR()` 이 고치기 전 식 그대로다** — `max(W,H,D)×1.9 + 500` (다섯 크기)
     ② **바깥 줌 한계(`extR()×3`)도 분해 0 에서 그대로다** — 11,760
     ③ 서랍장 마이다 4칸 — 네 보기 × 분해 0·50·100 에서 「전체」 를 **진짜 손가락**으로 누르면 **판 안에 다 든다**
     ④ 수납장도 같다
     ⑤ 분해를 키우면 「전체」 거리가 커지고, 0 으로 되돌리면 **제자리로 돌아온다**
     ⑥ **분해 고르개를 움직이는 것만으로는 카메라가 안 움직인다** — 보시던 자리를 안 잃는다

   ⚠ 판 안에 드는지는 조각마다 `Box3` 여덟 꼭지점을 `project(camera)` 로 **화면 픽셀**로 바꿔 센다.
   ⚠ 넓고 낮은 장(2400×800×900 따위)은 **분해 0 에서도** 판을 넘는다 — 폰 세로 칸이 좁아서 나는
      옛 한계이고 이 고침과 무관하다. 그래서 이 시험은 **세로로 긴 장**으로 잰다.

   돌리는 법:  node tests/분해전체.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},st:()=>state,' +
    'grp:()=>group,cam:()=>camera,aim:()=>cam,T:()=>THREE};' + 못);
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
const 보기들 = ['iso','front','side','top'];

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
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(600); };
  const R = () => p.evaluate(() => Math.round(window.__probe.aim().tR));
  const 가만 = async () => { await p.waitForFunction(() => { const c = window.__probe.aim();
      return Math.abs(c.r - c.tR) < 0.5 && Math.abs(c.theta - c.tTheta) < 1e-3
          && Math.abs(c.phi - c.tPhi) < 1e-3 && c.tgt.distanceTo(c.tTgt) < 0.5;
    }, null, { timeout: 20000 }); await 잠(80); };
  const 분해 = v => p.evaluate(v => { const el = document.querySelector('#explode');
    el.value = String(v); el.dispatchEvent(new Event('input', { bubbles:true })); }, v);
  const 보기 = async v => { await 손가락(`.views button[data-view="${v}"]`); await 가만(); };
  const 전체 = async () => { await 손가락('.tools button[data-tool="extents"]'); await 가만(); };

  // 조각 전부의 겉면을 화면 좌표로 투영해 판을 넘는 픽셀을 센다
  const 밖 = () => p.evaluate(() => {
    const THREE = window.__probe.T(), cam = window.__probe.cam(), g = window.__probe.grp();
    const r = document.querySelector('#c3d').getBoundingClientRect(), W = r.width, H = r.height;
    if (!g.children.length) return -1;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    g.children.forEach(c => { const bb = new THREE.Box3().setFromObject(c);
      for (const X of [bb.min.x, bb.max.x]) for (const Y of [bb.min.y, bb.max.y]) for (const Z of [bb.min.z, bb.max.z]) {
        const v = new THREE.Vector3(X, Y, Z).project(cam);
        const px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } });
    return Math.round((Math.max(0, -x0) + Math.max(0, x1 - W) + Math.max(0, -y0) + Math.max(0, y1 - H)) * 10) / 10;
  });

  // ① 분해 0 이면 고치기 전 식 그대로다
  console.log('① 분해 0 — 「전체」 거리가 고치기 전 식 그대로다');
  const 크기들 = [[800,400,1800],[600,500,900],[1200,400,2400],[2400,800,2400],[600,800,600]];
  const 잰값 = [], 바란값 = [];
  await 분해(0);
  for (const [W,D,H] of 크기들){
    await p.evaluate(o => window.__probe.set(o), { W, D, H });
    await 잠(250); await 전체();
    잰값.push(await R()); 바란값.push(Math.round(Math.max(W,H,D) * 1.9 + 500));
  }
  맞나('다섯 크기의 「전체」 거리', 잰값, 바란값);

  // ② 바깥 줌 한계도 그대로다
  console.log('② 바깥 줌 한계 — 분해 0 에서 그대로다');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800 }));
  await 잠(250); await 전체();
  맞나('분해 0 「전체」 거리', await R(), 3920);
  const cv = await (await p.$('#c3d')).boundingBox();
  await p.mouse.move(cv.x + cv.width/2, cv.y + cv.height/2);
  for (let i = 0; i < 220; i++) await p.mouse.wheel(0, 300);
  await 가만();
  맞나('바깥 한계 (= extR()×3)', await R(), 11760);
  await 전체();

  // ③ 서랍장 마이다 4칸
  console.log('③ 서랍장 마이다 4칸 — 네 보기 × 분해 0·50·100');
  await 품목('서랍장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:4, shelves:3, shelvesM:0,
    backMode:'cover', doorMode:'out' }));
  await 잠(450);
  for (const ex of [0, 50, 100]){
    await 분해(ex); await 잠(150);
    const 쟀 = [];
    for (const v of 보기들){ await 보기(v); await 전체(); 쟀.push(await 밖()); }
    맞나(`서랍장 분해 ${ex}% — 네 보기에서 판을 넘은 픽셀`, 쟀, [0,0,0,0]);
  }

  // ④ 수납장
  console.log('④ 수납장 — 네 보기 × 분해 0·50·100');
  await 품목('수납장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:2, shelves:3, shelvesM:0,
    backMode:'cover', doorMode:'out' }));
  await 잠(450);
  for (const ex of [0, 50, 100]){
    await 분해(ex); await 잠(150);
    const 쟀 = [];
    for (const v of 보기들){ await 보기(v); await 전체(); 쟀.push(await 밖()); }
    맞나(`수납장 분해 ${ex}% — 네 보기에서 판을 넘은 픽셀`, 쟀, [0,0,0,0]);
  }

  // ⑤ 분해를 키우면 거리가 커지고 0 으로 돌리면 제자리
  console.log('⑤ 분해를 키우면 거리가 커진다 · 0 으로 돌리면 제자리');
  await 보기('iso');
  await 분해(0); await 전체(); const r0 = await R();
  await 분해(50); await 전체(); const r50 = await R();
  await 분해(100); await 전체(); const r100 = await R();
  await 분해(0); await 전체(); const r0b = await R();
  // 이 세 값은 **이 시험의 판**(375×540 · 가로몫 0.694)에서 잰 것이다 — 1280 넓은 칸이면 3920·5548·7176 이다
  맞나('분해 0 · 50 · 100 거리', [r0, r50, r100], [3920, 6264, 8608]);
  맞나('0 으로 돌리면 제자리', r0b, r0);

  // ⑥ 고르개만 움직여서는 카메라가 안 움직인다
  console.log('⑥ 분해 고르개만 움직여서는 카메라가 안 움직인다');
  const 전 = await R();
  await 분해(100); await 잠(400);
  맞나('고르개를 100 으로 — 「전체」 를 안 누르면 그대로', await R(), 전);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

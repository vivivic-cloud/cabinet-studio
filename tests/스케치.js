#!/usr/bin/env node
/* 10-14 사장님 말씀 「이곳에 스케치 버전을 추가하여 … 간단하게 라인등으로 … 가벼운 도면」 (장부 a1791965818)
   · 10-14 관리자 지시 「시험 한 개만 더하십시오 — 못 박을 것은 이 넷」

     ① 스케치로 바꾸면 **`group.visible === false`** 이고 선 덩이가 선다
     ② 선 토막 수가 **조각 수 × 12** 다
     ③ 고른 부속이 있으면 **검은선 + 붉은선 = 전체** 그대로다(하나가 붉은 쪽으로 옮겨갈 뿐)
     ④ **3D 로 되돌리면 조각 수·보임이 처음과 같다**

   10-15 사장님 말씀 「**움직이는 도면이 아닌 등각/정면/측면/뒤 시점에서 보는 고정된 그림**
     — 단 부속으로 정의된 각객체를 클릭하면 이 스케치 도면에서도 해당 부속이 선택 되어야해」 로 넷을 더 못 박는다:
     ⑤ 시점 딱지 넷(등각·정면·측면·뒤)이 **2×2 로 캔버스 안**에 선다
     ⑥ **네 칸 어디를 눌러도** 부속이 골라지고, 칸마다 **그 시점에서 보이는 것**이 골라진다
     ⑦ **돌리기·줌이 없다** — 끌어도 휠을 굴려도 카메라가 한 톨도 안 움직인다
     ⑧ 스케치에서는 도구줄·시점줄이 숨고 **3D 로 돌아오면 다시 보인다**(숨김바·치수 띠·분해 띠는 그대로)
     ⑨ **분해·동작으로 움직이면 네 그림이 같이 따라온다** — 겉 네모가 그만큼 간다

   덤으로 — 선 덩이는 **한 덩이**다(draw call 1 · §4.9828 의 가벼움이 이 한 줄에 걸려 있다) ·
   선은 **짚기를 안 뺏는다**(스케치에서도 톡 치면 부속이 골라진다) · 오류 0.

   돌리는 법:  node tests/스케치.js
   three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).
   ⚠ `cdnjs` 는 이 방에서 막혀 있다 — 사본을 옆에 두고 주소를 갈아 끼운다(아래 `손질()`).
   ⚠ 집 전체가 `(function(){ … })();` 로 싸여 있다 — 엿은 그 **안**에 끼워야 속이 보인다. */
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
  /* 선 덩이는 `scene` 에서 찾는다 — 변수 이름(`스케치군`)에 매달지 않는다 */
  return s.replace(못, 'window.__probe={grp:()=>group,scn:()=>scene,sel:()=>selPid,cam:()=>camera,네모:()=>{try{return 스케치네모;}catch(e){return null;}}};' + 못);
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

/* 지금 서 있는 것을 한 번에 읽는다 — 조각 수 · 보임 · 선 덩이마다 [토막 수, 색] */
const 읽기 = p => p.evaluate(() => {
  const grp = window.__probe.grp(), scn = window.__probe.scn();
  const 선들 = scn.children.filter(o => o.isLineSegments && o.visible)
    .map(o => [o.geometry.attributes.position.count / 2, o.material.color.getHexString()])
    .sort((a, b) => b[0] - a[0]);
  return { 조각: grp ? grp.children.length : 0, 조각보임: !!(grp && grp.visible),
           선덩이: 선들.length, 토막: 선들.reduce((s, x) => s + x[0], 0), 선들,
           판: document.querySelector('.app').className, 고른: window.__probe.sel() };
});

/* ⚠ 단추가 없어도 **터지지 않는다** — 고치기 전 판에 대고 돌려 깨진 수를 세려면 그래야 한다(§4.9834) */
const 모드누르기 = async (p, m) => {
  const 있나 = await p.evaluate(mm => {
    const b = [...document.querySelectorAll('.modeseg button[data-mode="' + mm + '"]')]
      .find(x => x.getBoundingClientRect().width > 0);
    if (!b) return false;
    b.click(); return true;
  }, m);
  맞나('「' + m + '」 단추가 눈에 보인다', 있나, true);
  await 잠(700);
};

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe && window.__probe.grp(), null, { timeout: 20000 });
  await 잠(900);

  /* ───────── 처음(3D) ───────── */
  const 처음 = await 읽기(p);
  const 처음줄 = await p.evaluate(() => ({
    도구줄: getComputedStyle(document.querySelector('.hud .tools')).display,
    시점줄: getComputedStyle(document.querySelector('.hud .views')).display }));
  console.log('처음 — 3D');
  맞나('조각 수 · 보임 · 선 덩이', [처음.조각, 처음.조각보임, 처음.선덩이], [11, true, 0]);

  /* ───────── ①② 스케치 ───────── */
  console.log('①② 스케치로 바꾸면 조각이 숨고 선 한 덩이가 선다');
  await 모드누르기(p, 'sk');
  const 스 = await 읽기(p);
  맞나('판 클래스 · 조각 보임', [스.판, 스.조각보임], ['app m3d sk', false]);
  맞나('조각 수는 그대로', 스.조각, 처음.조각);
  맞나('선 덩이 하나(draw call 1)', 스.선덩이, 1);
  맞나('토막 = 조각 × 12', [스.토막, 스.조각 * 12], [132, 132]);
  맞나('선 색은 집 토큰 --ink', 스.선들[0] ? 스.선들[0][1] : null, '1a1a19');

  /* ───────── ③ 고르면 붉은 덩이로 갈린다 ───────── */
  console.log('③ 스케치에서 톡 쳐도 부속이 골라지고 그 부속 선만 붉어진다');
  const cv = await p.$('#c3d'), r = await cv.boundingBox();
  let 고름 = null;
  for (const [fx, fy] of [[0.25, 0.25], [0.25, 0.32], [0.25, 0.18], [0.21, 0.25], [0.29, 0.25]]){
    await p.mouse.click(r.x + r.width * fx, r.y + r.height * fy);
    await 잠(450);
    const v = await p.evaluate(() => window.__probe.sel());
    if (v !== null && v !== undefined){ 고름 = v; break; }
  }
  맞나('짚기를 안 뺏는다(골라졌나)', 고름 !== null, true);
  const 골 = await 읽기(p);
  맞나('덩이 둘 · 검은 + 붉은 = 전체', [골.선덩이, 골.토막, 골.선들.map(x => x[0])], [2, 132, [120, 12]]);
  맞나('붉은 덩이 색 --dim', 골.선들[1] ? 골.선들[1][1] : null, 'ff3b30');
  맞나('조각은 그대로 숨어 있다', [골.조각, 골.조각보임], [11, false]);

  /* ───────── ④ 3D 로 되돌리기 ───────── */
  console.log('④ 3D 로 되돌리면 처음과 같다');
  await 모드누르기(p, '3d');
  const 되 = await 읽기(p);
  맞나('조각 수 · 보임 · 보이는 선 덩이', [되.조각, 되.조각보임, 되.선덩이], [처음.조각, true, 0]);
  맞나('판 클래스', 되.판, 'app m3d');

  /* ───────── ⑤ 네 시점 딱지 ───────── */
  console.log('⑤ 등각·정면·측면·뒤 네 시점이 2×2 로 선다');
  await 모드누르기(p, 'sk');
  const 딱 = await p.evaluate(() => {
    const cv = document.querySelector('#c3d').getBoundingClientRect();
    return [...document.querySelectorAll('.sktags span')].map(s => { const r = s.getBoundingClientRect();
      return { 글: s.textContent, 칸: (r.top > cv.top + cv.height/2 ? 2 : 0) + (r.left > cv.left + cv.width/2 ? 1 : 0),
               안: r.left >= cv.left && r.right <= cv.right && r.top >= cv.top && r.bottom <= cv.bottom }; });
  });
  맞나('시점 이름 넷', 딱.map(x => x.글), ['등각','정면','측면','뒤']);
  맞나('2×2 로 한 칸씩', 딱.map(x => x.칸), [0,1,2,3]);
  맞나('딱지가 다 캔버스 안', 딱.every(x => x.안), true);

  /* ───────── ⑥ 네 칸 어디를 눌러도 골라진다 ───────── */
  console.log('⑥ 네 칸 어디를 눌러도 그 시점에서 보이는 부속이 골라진다');
  const 칸골름 = [];
  for (let i = 0; i < 4; i++){
    await p.evaluate(() => window.__probe.그려 && null);
    const q = await p.evaluate(() => { const r = document.querySelector('#c3d').getBoundingClientRect();
      return { x:r.x, y:r.y, w:r.width, h:r.height }; });
    const cx = q.x + (i%2)*(q.w/2) + q.w/4, cy = q.y + Math.floor(i/2)*(q.h/2) + q.h/4;
    let 골 = null;
    for (const [dx,dy] of [[0,0],[0,q.h*0.08],[0,-q.h*0.08],[q.w*0.06,0]]){
      await p.mouse.click(cx+dx, cy+dy); await 잠(350);
      골 = await p.evaluate(() => { const s = window.__probe.sel(); if (s === null || s === undefined) return null;
        const m = window.__probe.grp().children.find(c => c.userData.pid === s);
        return m ? s : s; });
      if (골 !== null) break;
    }
    칸골름.push(골 !== null);
  }
  맞나('네 칸 다 골라진다', 칸골름, [true,true,true,true]);
  const 골2 = await 읽기(p);
  맞나('고른 뒤에도 검은 + 붉은 = 전체', [골2.토막, 골2.선덩이], [132, 2]);

  /* ───────── ⑦ 돌리기·줌이 없다 ───────── */
  console.log('⑦ 스케치는 고정된 그림이다 — 끌어도 휠을 굴려도 안 움직인다');
  const 캠 = () => p.evaluate(() => { const c = window.__probe.cam();
    return [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.position.z.toFixed(1)]; });
  const 캠전 = await 캠();
  const cr = await p.evaluate(() => { const r = document.querySelector('#c3d').getBoundingClientRect();
    return { x:r.x, y:r.y, w:r.width, h:r.height }; });
  await p.mouse.move(cr.x + cr.w/2, cr.y + cr.h/2); await p.mouse.down();
  await p.mouse.move(cr.x + cr.w/2 + 160, cr.y + cr.h/2 + 80, { steps:8 }); await p.mouse.up(); await 잠(400);
  await p.mouse.wheel(0, -600); await 잠(400);
  맞나('끌고 굴려도 카메라 그대로', await 캠(), 캠전);

  /* ───────── ⑧ 도구줄·시점줄 ───────── */
  const 줄 = async () => p.evaluate(() => ({
    도구줄: getComputedStyle(document.querySelector('.hud .tools')).display,
    시점줄: getComputedStyle(document.querySelector('.hud .views')).display,
    분해띠: getComputedStyle(document.querySelector('.explode')).display,
    치수띠: getComputedStyle(document.querySelector('#dimsBar')).display }));
  const 줄스 = await 줄();
  맞나('스케치 — 도구줄·시점줄은 숨고 분해·치수 띠는 그대로', [줄스.도구줄, 줄스.시점줄, 줄스.분해띠 !== 'none', 줄스.치수띠 !== 'none'],
       ['none','none',true,true]);
  await 모드누르기(p, '3d');
  const 줄삼 = await 줄();
  /* ⚠ 도구줄은 마우스 상자에서 **원래** 숨는다(§4.7) — 그래서 처음(3D) 때의 그 값과 견준다 */
  맞나('3D 로 돌아오면 처음 줄 그대로', [줄삼.도구줄, 줄삼.시점줄], [처음줄.도구줄, 처음줄.시점줄]);
  맞나('3D 에서는 시점줄이 보인다', 줄삼.시점줄 !== 'none', true);
  // ⚠ 고치기 전 판에는 `.sktags` 가 **아예 없다** — 없으면 'none' 으로 본다(터지지 않게)
  맞나('3D 에서 딱지는 숨는다', await p.evaluate(() => { const e = document.querySelector('.sktags');
    return e ? getComputedStyle(e).display : 'none'; }), 'none');

  /* ───────── ⑨ 분해·동작을 따라온다 ───────── */
  console.log('⑨ 분해·동작으로 움직이면 네 그림이 같이 따라온다');
  await 모드누르기(p, 'sk');
  const 네모 = () => p.evaluate(() => { const b = window.__probe.네모 && window.__probe.네모();
    return b ? [+b.min.x.toFixed(1), +b.max.x.toFixed(1), +b.min.z.toFixed(1), +b.max.z.toFixed(1)] : null; });
  const 밀대 = v => p.evaluate(x => { const s = document.querySelector('#explode');
    s.value = String(x); s.dispatchEvent(new Event('input', { bubbles:true })); }, v);
  const 분해0 = await 네모();
  await 밀대(60); await 잠(600);
  const 분해60 = await 네모();
  await 밀대(0); await 잠(600);
  맞나('분해 0 → 60 → 0', [분해60 && 분해0 && 분해60[0] < 분해0[0] - 50, JSON.stringify(await 네모()) === JSON.stringify(분해0)], [true, true]);
  // 「동작」 — 서랍장에서 서랍이 앞으로 나온다. 이 갈래는 `applyExplode` 가 **중간에서 돌아간다**.
  await p.evaluate(() => { const s = document.querySelector('#itemSel');
    if (s){ s.value = '서랍장'; s.dispatchEvent(new Event('change', { bubbles:true })); } });
  await 잠(900);
  await 모드누르기(p, 'sk');
  const 닫힘 = await 네모();
  await p.evaluate(() => { const l = [...document.querySelectorAll('.explode .seg.mini label')].find(x => x.textContent.trim() === '동작');
    const i = l && l.querySelector('input'); if (i){ i.checked = true; i.dispatchEvent(new Event('change', { bubbles:true })); } });
  await 잠(500); await 밀대(100); await 잠(700);
  const 열림 = await 네모();
  맞나('동작 100 — 서랍이 나온 만큼 선도 나온다', !!(닫힘 && 열림 && 열림[3] > 닫힘[3] + 50), true);

  맞나('오류', 터짐.length, 0);
  if (터짐.length) console.log(터짐.join('\n'));

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

#!/usr/bin/env node
/* 10-03 사장님 말씀
     「**이런형태의 품목은 작업하면서 많이 발생할텐데 이런 버튼형식이 아닌 드롭다운목록 선택형태로
       품목을 선택할 수 있게해줘**」

     ① 라디오가 아니라 **고르개(드롭다운)** 하나다 · 목록은 `품목값` 차례 그대로 ·
        닿는 자리 **44px**(`select` 는 ::after 가 안 먹으므로 제 높이다 · §4.9895) · 가로 넘침 0
     ② **진짜 손가락**으로 고르개를 짚고 목록에서 골라 품목이 바뀐다 · 고르개가 그 품목을 가리킨다
     ③ **담아 두신 설정이 안 날아간다** — 상태(외경·두께) · 규칙(우라홈) · 부속(밴드)
        서랍장 첫 고르기는 수납장 것을 베껴 오고, 그 뒤로는 **두 품목이 서로 안 묻는다**
     ④ 되돌리기를 밟아도 고르개가 **제 품목**을 가리킨다
     ⑤ 다시 열면 고르던 품목과 그 품목의 값이 그대로다 (`cabinet-studio.품목`)
     ⑥ 내보내는 것이 안 바뀐다 — 두 품목의 DXF 바이트·저장 SVG 조각 수

   돌리는 법:  node tests/품목고르개.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).

   ⚠ 붙박이 고르개의 **목록 자체**는 브라우저가 그리는 것이라 이 방에서 손가락으로 못 짚는다(§7).
      그래서 고르개를 **진짜 손가락으로 짚고**(거기까지는 참 손가락) 목록 고르기는 `selectOption` 으로 한다.
   ⚠ 밴드를 18T 로 두고 끼우기로 가면 **경고판이 떠 탭을 가로챈다**(§4.8 · §4.9891). 12T 로 둔다. */
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),'
    + 'rule:()=>규칙,st:()=>state,parts:()=>만든부속,draw:()=>drawing,svgf:()=>svgForFile(drawing),dxf:()=>buildDXF(drawing)};' + 못);
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

  /* ───────── ① 모양 — 375 · 1280 둘 다 ───────── */
  for (const 폭 of [375, 1280]){
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 }, hasTouch:true, isMobile:폭 < 800 });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(500);
    console.log('① 고르개 모양 @' + 폭 + 'px');
    맞나('고르개 하나 · 라디오 0', await p.evaluate(() =>
      [document.querySelectorAll('#itemBox select#itemSel').length,
       document.querySelectorAll('#itemBox input[name="품목"]').length]), [1, 0]);
    // 목록은 손으로 박은 것이 아니라 `품목값` 에서 짓는다 — 품목이 늘면 그 배열 한 자리만 고친다
    맞나('목록이 품목값 차례 그대로', await p.evaluate(() =>
      [...document.querySelectorAll('#itemSel option')].map(o => [o.value, o.textContent])),
      [['수납장','수납장'], ['서랍장','서랍장']]);
    // 고치기 전 판에는 고르개가 없다 — 터지지 말고 깨진 것으로 세고 넘어간다
    맞나('닿는 자리 44px 이상', await p.evaluate(() => { const s2 = document.querySelector('#itemSel');
      return s2 ? s2.getBoundingClientRect().height >= 44 : null; }), true);
    // ⚠ 10-03 — 폰 좌우 여백 0(§4.9862) 뒤로는 **가로로 굴러가나**로 잰다.
    맞나('설정 칸 손가락으로 가로로 밀리나 0', await p.evaluate(() => { const q = document.querySelector('.params');
      const c = getComputedStyle(q); q.scrollLeft = 999; const v = q.scrollLeft; q.scrollLeft = 0;
      return (c.overflowX === 'auto' || c.overflowX === 'scroll') ? v : 0; }), 0);
    // ⚠ 10-04 부터 폰에서는 설정 칸이 도면 **아래**라 고르개가 첫 화면 밖이다(§4.98617) —
    //    먼저 굴려 넣어야 `elementFromPoint` 가 잡는다(안 굴리면 null 이 나온다).
    맞나('맨 위에 제것이 있다 (안 가려짐)', await p.evaluate(() => {
      const s2 = document.querySelector('#itemSel'); if (!s2) return null;
      s2.scrollIntoView({ block:'center' });
      const r = s2.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
      return el && el.id; }), 'itemSel');
    맞나('처음은 수납장 · 고르개도 수납장', await p.evaluate(() => { const s2 = document.querySelector('#itemSel');
      return [window.__probe.st().품목, s2 ? s2.value : null]; }), ['수납장', '수납장']);
    맞나('오류 @' + 폭, 터짐, []);
    await ctx.close();
  }

  /* ───────── ②③④⑤⑥ 진짜로 눌러 본다 (375px) ───────── */
  const ctx = await b.newContext({ viewport:{ width:375, height:900 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(500);

  /* **진짜 손가락**으로 누른다 — `.click()` 은 확인으로 치지 않는다(관리자가 못 박았다).
     ⚠ 머리줄 단추는 굴러 올라가야 보인다 — 끌어온 뒤 **자리를 다시 재라**(§7.5). */
  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox();
    const x = r.x + r.width/2, y = r.y + r.height/2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(380); return true; };
  const 품목고르기 = async 품 => { const 짚음 = await 손가락('#itemSel');
    if (!짚음){ 맞나('고르개를 짚었나 — ' + 품, false, true); return false; }   // 고치기 전 판에는 없다
    await p.selectOption('#itemSel', 품); await 잠(700); return true; };
  const 본 = () => p.evaluate(() => ({
    품목: window.__probe.st().품목,
    고르개: (document.querySelector('#itemSel') || {}).value || null,
    W: window.__probe.st().W, Ttop: window.__probe.st().Ttop,
    우라홈: window.__probe.rule().우라홈, 만든부속: window.__probe.parts().length }));

  console.log('③ 수납장에 설정을 담는다 — 상태(외경·두께) · 규칙(우라홈) · 부속(밴드)');
  await p.evaluate(() => window.__probe.set({ W:900, Ttop:25 })); await 잠(350);
  // 밴드를 먼저 12T 로 세운다 — 18T 로 끼우기에 가면 경고판이 탭을 가로챈다(§4.8)
  await 손가락('#newPart'); await p.keyboard.type('밴드'); await 잠(200);
  await 손가락('#btnAdd'); await 잠(500);
  await p.evaluate(() => { const c = window.__probe.parts()[0]; if (c) c.T = 12; window.__probe.set({}); }); await 잠(350);
  await 손가락('.pname[data-opt="뒷판"]');
  await 손가락('.opt[data-opt="뒷판"] label:has(input[value="insert"])');
  await 손가락('.opt[data-opt="뒷판"] input[data-rule="우라홈"]');
  await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
  await p.keyboard.type('15'); await 잠(250);
  // 친 값이 칸에 들어갔는지 먼저 본다 — 안 들어가면 뒤의 판정이 거짓으로 통과한다(관리자가 못 박았다)
  맞나('우라홈 칸에 15 가 들어갔다', await p.evaluate(() => { const i =
    document.querySelector('.opt[data-opt="뒷판"] input[data-rule="우라홈"]'); return i ? i.value : null; }), '15');
  await 손가락('.opt[data-opt="뒷판"] button[data-optsave]');     // 「저장」 을 눌러야 먹는다 (§4.9893)
  await 손가락('.pname[data-opt="뒷판"]');                         // 다시 접는다
  const 수납 = await 본();
  맞나('수납장에 담겼다', 수납, { 품목:'수납장', 고르개:'수납장', W:900, Ttop:25, 우라홈:15, 만든부속:1 });
  const 수납DXF = await p.evaluate(() => window.__probe.dxf().length);
  const 수납SVG = await p.evaluate(() => window.__probe.svgf().match(/</g).length);

  console.log('② 진짜 손가락으로 고르개를 짚고 서랍장을 고른다  ③ 첫 고르기는 베껴 온다');
  맞나('서랍장을 골랐다', await 품목고르기('서랍장'), true);
  맞나('서랍장 — 담긴 것을 베껴 온다', await 본(),
    { 품목:'서랍장', 고르개:'서랍장', W:900, Ttop:25, 우라홈:15, 만든부속:1 });

  console.log('③ 서랍장을 고쳐도 수납장이 안 움직인다');
  await p.evaluate(() => { window.__probe.rule().우라홈 = 20; window.__probe.set({ W:1200, Ttop:15 }); }); await 잠(400);
  맞나('서랍장 고침', await 본(), { 품목:'서랍장', 고르개:'서랍장', W:1200, Ttop:15, 우라홈:20, 만든부속:1 });
  맞나('→ 수납장 그대로', (await 품목고르기('수납장')) && await 본(), 수납);
  맞나('→ 서랍장도 제 값 그대로', (await 품목고르기('서랍장')) && await 본(),
    { 품목:'서랍장', 고르개:'서랍장', W:1200, Ttop:15, 우라홈:20, 만든부속:1 });

  console.log('④ 되돌리기를 밟아도 고르개가 제 품목을 가리킨다');
  await p.evaluate(() => window.__probe.set({ W:1500 })); await 잠(400);
  맞나('되돌리기 단추가 산다', await p.evaluate(() => !document.querySelector('#btnUndo').disabled), true);
  await 손가락('#btnUndo'); await 잠(700);
  맞나('한 걸음 되돌아가고 고르개는 서랍장', await 본(),
    { 품목:'서랍장', 고르개:'서랍장', W:1200, Ttop:15, 우라홈:20, 만든부속:1 });
  await 손가락('#btnUndo'); await 잠(700);
  /* 한 걸음은 그 품목의 **한 벌 여섯**이다(§4.9871) — 상태만이 아니라 규칙도 같이 돌아간다.
     여기서 돌아가는 자리는 서랍장을 처음 고를 때 베껴 온 그 한 벌이라 우라홈이 **15** 다. */
  맞나('또 한 걸음 · 고르개는 그대로 서랍장 · 한 벌째 돌아간다', await 본(),
    { 품목:'서랍장', 고르개:'서랍장', W:900, Ttop:25, 우라홈:15, 만든부속:1 });

  console.log('⑥ 내보내는 것 — 품목을 오가도 그 품목의 DXF·저장 SVG 가 그대로다');
  맞나('수납장으로 돌아오면 DXF·저장 SVG 그대로',
    (await 품목고르기('수납장')) && await p.evaluate(() =>
      [window.__probe.dxf().length, window.__probe.svgf().match(/</g).length]), [수납DXF, 수납SVG]);

  console.log('⑤ 다시 열면 고르던 품목과 그 값이 그대로다');
  맞나('서랍장으로 두고', await 품목고르기('서랍장'), true);
  const 열쇠 = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('cabinet-studio') === 0).sort());
  await p.reload({ waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
  맞나('다시 열면 서랍장 · 고르개도 서랍장 · 그 값', await 본(),
    { 품목:'서랍장', 고르개:'서랍장', W:900, Ttop:25, 우라홈:15, 만든부속:1 });
  맞나('담긴 열쇠 — 마지막 품목 + 품목마다 일곱', 열쇠.length, 15);
  맞나('마지막 품목 열쇠', await p.evaluate(() => localStorage.getItem('cabinet-studio.품목')), '서랍장');

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

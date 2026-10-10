#!/usr/bin/env node
/* 10-03 사장님 말씀: 「**이런 도면조절 옵션들 모바일에서는 도면 밖으로 빼야지 이게뭐냐 화면 다가리고**」
   10-04 사장님 말씀: 「**모바일 환경에서 이런 조정부를 도면 위쪽에 위치하게 해줘**」 (아래 → **위**)

     ① 폰 3D — 도면을 **덮고 있는 것이 0개** · 덮은 넓이 0 · 캔버스 375×540 그대로
                그리고 띠가 다 **캔버스 위**에 선다
     ② 폰 3D — 쓸 자리가 148,972 → **202,500px²** 로 는다 · 칸 811 (띠가 덧붙는 높이다)
     ③ 띠의 단추가 다 44px 이상이고 **진짜 손가락으로 다 눌린다** (모드·도구·시점·숨김바·치수칸·분해도)
     ④ 폰 2D — 띠가 **도면 위**(머리줄 밑) · A4 가 안 준다 · 가린 도면 글자 0
     ⑤ 폰에서는 **조용히 사라지지 않는다** (도면을 안 가리므로)
     ⑥ **열자마자 도면이 첫 화면에 얼마나 드나** — 띠가 위로 가면 도면이 밀린다.
        10-04 에 **입력칸 묶음을 도면 아래로** 내려 되찾았다(§4.98617).
        잰 값을 못 박는다(375×900): 열자마자 캔버스 y **440 · 첫 화면 460px**,
        3D 를 톡 쳐 설정 칸이 접혀도 **그대로**(설정 칸이 도면 아래라 더 안 올라간다).
        그리고 **치수 띠가 첫 화면 안에 통째로** 있고 **설정 칸이 도면보다 아래**다.
        이 숫자가 움직이면 자리가 또 바뀐 것이다.
     ⑦ **1280 은 한 톨도 안 바뀐다** — 띠가 떠 있고 `.hud` 도 떠 있다
     ⑧ 가로 넘침 375 · 오류 0

   돌리는 법:  node tests/도면밖.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),aim:()=>({r:cam.tR,phi:cam.tPhi}),sel:()=>selPid};' + 못);
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

/* 떠 있는 것 = 캔버스(또는 쪽)와 겹치는 조절 칸. 폰에서는 하나도 없어야 한다. */
const 덮은것 = `(() => {
  const 보임 = el => el && el.getBoundingClientRect().width > 0;
  const 쪽 = document.querySelector('#pageBox>.page.보는쪽') || document.querySelector('#pageBox>.page');
  const 그림 = 보임(쪽) ? 쪽 : document.querySelector('#c3d');     // 3D 모드에서는 쪽이 0×0 이다
  if (!그림) return null;
  const g = 그림.getBoundingClientRect();
  const 것들 = [...document.querySelectorAll('#dimsBar, .view3d .hud>div, .view3d .explode, #pageBox>.page .big')]
    .filter(el => el.getBoundingClientRect().width > 0);
  let 넓이 = 0; const 이름 = [];
  것들.forEach(el => { const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(g.right, r.right) - Math.max(g.left, r.left));
    const y = Math.max(0, Math.min(g.bottom, r.bottom) - Math.max(g.top, r.top));
    if (x > 0.5 && y > 0.5){ 넓이 += x*y; 이름.push(el.id || el.className); } });
  return { 그림: Math.round(g.width) + '×' + Math.round(g.height), 덮은넓이: Math.round(넓이),
           덮은것: 이름, 쓸자리: Math.round(g.width*g.height - 넓이) };
})()`;

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  for (const 폭 of [375, 1280]) {
    const 폰 = 폭 === 375;
    console.log(`■ ${폭}px`);
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 },
      hasTouch:폰, isMobile:폰, deviceScaleFactor:폰 ? 2 : 1 });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    const cdp = await ctx.newCDPSession(p);
    const 톡 = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x, y}] });
      await 잠(60);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(280); };
    const 누르기 = async sel => {           // 폰은 진짜 손가락 · 넓은 화면은 마우스
      await p.evaluate(s => { const el = document.querySelector(s); if (el) el.scrollIntoView({block:'center'}); }, sel);
      await 잠(220);
      const r = await p.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
        const b2 = el.getBoundingClientRect(); return b2.width ? { x:b2.left + b2.width/2, y:b2.top + b2.height/2 } : null; }, sel);
      if (!r) return false;
      if (폰) await 톡(r.x, r.y); else { await p.mouse.click(r.x, r.y); await 잠(280); }
      return true; };
    const 모드 = async n => { await p.evaluate(x => {
        const b2 = [...document.querySelectorAll('.modeseg button[data-mode]')]
          .filter(y => y.offsetParent !== null).find(y => y.dataset.mode === x);
        if (b2) b2.click(); }, n); await 잠(1000); };

    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(1000);

    console.log('① 3D — 도면 위에 떠 있는 것  ② 쓸 자리');
    const 삼 = await p.evaluate(덮은것);
    // 10-10 — 모드 단추가 머리줄로 갔다(§4.9831). 3D 를 덮던 것이 하나 줄어 40,086 → **34,054**.
    맞나('3D 덮은 것 · 덮은 넓이', [삼.덮은것, 삼.덮은넓이], 폰 ? [[], 0] : [['dimsBar','views','explode'], 34054]);
    // 10-10 — 1280 캔버스가 머리줄 65 만큼 줄어 995×831 → **995×766**(폰은 60vh 라 그대로).
    맞나('3D 캔버스 · 쓸 자리', [삼.그림, 삼.쓸자리], 폰 ? ['375×540', 202500] : ['995×766', 728116]);
    맞나('3D 칸 높이', await p.evaluate(() => Math.round(document.querySelector('.view3d').getBoundingClientRect().height)),
         폰 ? 814 : 831);   // 10-10 — 머리줄 65 가 붙고 `.hud` 의 모드 줄 62 가 빠져 +3 (§4.9831)
    /* 10-04 — 폰에서는 띠가 다 **캔버스 위**다. 넓은 화면은 떠 있으므로 이 자는 안 댄다.
       ⚠ 10-10 부터 3D 칸이 **머리줄 + 본문(`.v3body`)** 두 켜다(§4.9831) — 띠는 본문 안에 있다.
          `.view3d > *` 로 쓸면 본문 자체가 잡혀 늘 거짓이 된다. 머리줄은 캔버스 위라 따로 볼 것이 없다. */
    if (폰) 맞나('띠가 다 캔버스 위인가', await p.evaluate(() => {
      const c = document.querySelector('#c3d').getBoundingClientRect();
      return [...document.querySelectorAll('.v3body > *')].filter(el => el.id !== 'c3d')
        .every(el => { const r = el.getBoundingClientRect(); return r.height === 0 || r.bottom <= c.top + 0.5; }); }), true);

    console.log('③ 띠의 단추가 44px 이상이고 다 눌린다');
    맞나('44 미만인 단추', await p.evaluate(() => [...document.querySelectorAll('.view3d .hud button')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
      .map(el => el.textContent.trim())), []);
    await 누르기('.view3d .views button[data-view="top"]');
    맞나('시점 「위」', await p.evaluate(() => window.__probe.aim().phi.toFixed(2)), '0.02');
    await 누르기('.view3d .views button[data-view="iso"]');
    맞나('시점 「등각」', await p.evaluate(() => window.__probe.aim().phi.toFixed(2)), '1.15');
    await 누르기('.view3d .tools button[data-tool="extents"]');
    맞나('도구 「전체」', await p.evaluate(() => Math.round(window.__probe.aim().r)), 3920);
    if (폰){
      await 누르기('.view3d .tools button[data-tool="pan"]');
      맞나('도구 「이동」', await p.evaluate(() => document.querySelector('.view3d .tools button[data-tool="pan"]').getAttribute('aria-pressed')), 'true');
      await 누르기('.view3d .tools button[data-tool="orbit"]');
    }
    // 숨김바 — 부속을 숨기면 띠에 뜬다
    await p.evaluate(() => { const el = document.querySelector('#c3d'); el.scrollIntoView({block:'center'}); });
    맞나('치수 칸 세 개', await p.evaluate(() => [...document.querySelectorAll('#dimsBar input')].length), 3);
    await 누르기('#dimsBar #W');
    맞나('치수 칸에 초점', await p.evaluate(() => document.activeElement && document.activeElement.id), 'W');
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type('1000'); await 잠(500);
    맞나('치수 칸이 먹는다 (내부폭)', await p.evaluate(() => window.__probe.model().innerW), 964);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type('800'); await 잠(500);
    await p.evaluate(() => { const s = document.querySelector('#explode'); s.value = 40;
      s.dispatchEvent(new Event('input', {bubbles:true})); });
    await 잠(300);
    맞나('분해도', await p.evaluate(() => document.querySelector('#explode').value), '40');
    await p.evaluate(() => { const s = document.querySelector('#explode'); s.value = 0;
      s.dispatchEvent(new Event('input', {bubbles:true})); });

    console.log('④ 2D — 띠가 도면 위 · A4 가 안 준다 · 가린 글 0');
    await 모드('2d');
    const 이 = await p.evaluate(덮은것);
    맞나('2D A4 · 덮은 것', [이.그림, 이.덮은것], 폰 ? ['375×530', ['big']] : ['453×641', ['big','dimsBar']]);
    맞나('2D 띠가 도면 위인가', await p.evaluate(() => {
      const t = document.querySelector('#dimsBar').getBoundingClientRect();
      const g = (document.querySelector('#pageBox>.page.보는쪽') || document.querySelector('#pageBox>.page')).getBoundingClientRect();
      return t.bottom <= g.top + 0.5; }), 폰);
    // 2D 머리줄(제 칸 이름)은 띠보다 위에 그대로 남는다
    if (폰) 맞나('2D 머리줄이 띠보다 위', await p.evaluate(() => {
      const h = document.querySelector('.draw .panelhead').getBoundingClientRect();
      const t = document.querySelector('#dimsBar').getBoundingClientRect();
      return h.bottom <= t.top + 0.5; }), true);
    맞나('2D 가린 도면 글자', await p.evaluate(() => {
      const t = document.querySelector('#dimsBar').getBoundingClientRect();
      const svg = document.querySelector('#pageBox .page svg'); if (!svg) return -1;
      let n = 0; svg.querySelectorAll('text').forEach(x => { const r = x.getBoundingClientRect();
        if (r.width > 0 && r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom) n++; });
      return n; }), 0);
    await 모드('3d');
    맞나('3D 로 돌아와도 캔버스가 산다', await p.evaluate(() => {
      const c = document.querySelector('#c3d'), r = c.getBoundingClientRect();
      return [c.width > 0 && c.height > 0, Math.round(r.width)]; }), [true, 폰 ? 375 : 995]);

    console.log('⑤ 폰에서는 조용히 사라지지 않는다');
    await 잠(5200);
    맞나('5.2초 뒤 흐림', await p.evaluate(() => [...document.querySelectorAll('.view3d .tools,.view3d .views,.view3d .explode')]
      .map(el => el.style.opacity || '1')), 폰 ? ['1','1','1'] : ['0','0','0']);

    console.log('⑥ 열자마자 도면이 첫 화면에 얼마나 드나');
    const 첫화면 = () => p.evaluate(() => { window.scrollTo(0, 0);
      const r = document.querySelector('#c3d').getBoundingClientRect();
      return [Math.round(r.top + window.scrollY),
              Math.round(Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)))]; });
    await p.evaluate(() => window.scrollTo(0, 0)); await 잠(300);
    // 10-10 — 3D 머리줄 65 가 붙어 캔버스가 3px 내려간다(모드 줄이 `.hud` 에서 빠져 62 를 돌려준다 · §4.9831)
    맞나('열자마자 캔버스 y · 첫 화면', await 첫화면(), 폰 ? [443, 457] : [134, 766]);
    if (폰){   // 치수 띠는 첫 화면 안에 통째로 · 설정 칸은 도면 **아래**
      맞나('치수 띠가 첫 화면 안인가', await p.evaluate(() => { window.scrollTo(0, 0);
        const t = document.querySelector('#dimsBar').getBoundingClientRect();
        return t.top >= -0.5 && t.bottom <= innerHeight + 0.5; }), true);
      맞나('설정 칸이 도면보다 아래인가', await p.evaluate(() => {
        const q = document.querySelector('.params').getBoundingClientRect();
        const c = document.querySelector('#c3d').getBoundingClientRect();
        return q.top >= c.bottom - 0.5; }), true);
    }
    if (폰){   // 3D 를 톡 치면 설정 칸이 접힌다(§4.7) — 사장님이 실제로 쓰시는 자리다
      await p.evaluate(() => document.querySelector('#c3d').scrollIntoView({block:'center'}));
      await 잠(300);
      const r = await p.evaluate(() => { const b2 = document.querySelector('#c3d').getBoundingClientRect();
        return { x:b2.left + b2.width/2, y:b2.top + b2.height/2 }; });
      await 톡(r.x, r.y); await 잠(900);
      /* ⚠ 10-06 — 그 톡이 부속도 고르므로 3D 우측칸(§4.9847)이 캔버스 위에 선다.
         10-08 에 엣지 기본세팅이 켜지며(§4.9842) 그 칸에 「엣지」 줄이 한 줄 늘어 **38 → 60px** 이 되었다.
         그래서 캔버스 y 440 → **500** · 첫 화면 460 → **400** 이다. 안 고른 때는 전과 한 톨도 같다(위 ⑥). */
      맞나('접고 고른 뒤 캔버스 y · 첫 화면', await 첫화면(), [503, 397]);
    }

    console.log('⑦ 가로 넘침 · 오류');
    맞나('가로 넘침', await p.evaluate(() => document.documentElement.scrollWidth), 폭);
    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

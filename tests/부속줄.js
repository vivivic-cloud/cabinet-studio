#!/usr/bin/env node
/* 10-03 사장님 말씀 (품목 · 보드선택 두께 줄을 짚으시고)
     「**이제 입력칸의 높이가 줄었으니 부속간의 간격도 줄여줘 — 삭제버튼은 여전히 크니
       지금의 절반정도로 줄여줘**」

     ① 부속 한 줄이 **입력칸과 같은 23px** 이고 한 자리(줄+틈)가 **27** 이다 (전 36 · 40)
     ② 「× 」 보이는 것이 **20×20**(넓이 절반) · 닿는 자리 **40×27**
     ③ 닿는 자리가 **위아래 줄끼리 안 겹치고 두께 칸을 안 먹는다**
     ④ **진짜 손가락**으로 줄마다 × 의 **맨 위 +1 · 가운데 · 맨 아래 −1** 을 밟아 노린 줄이 지워진다
     ⑤ 23px 부속명 단추도 **맨 위·가운데·맨 아래**에서 다 펴진다
     ⑥ 안 내려간 것 — 「추가」 44 · 체크 줄 44 · 알약 닿는 44 · 모드 44 · 입력칸 23 · 그 줄 25
     ⑦ 두께 값이 안 잘리고 가로 넘침 0

   돌리는 법:  node tests/부속줄.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).

   ⚠ 줄을 지우면 그 줄이 사라져 **아래 줄이 올라온다**(§4.9891) — 탭마다 자리를 다시 재고
      한 줄씩 지우고 되돌린다. 한 번에 다 재 두고 밟으면 **엉뚱한 줄이 지워진 것으로 보인다**(그렇게 한 번 헛짚었다 · §7.5). */
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
    + 'rule:()=>규칙,st:()=>state,손질:()=>손질,parts:()=>만든부속};' + 못);
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

  for (const 폭 of [375, 1280]){
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 }, hasTouch:true, isMobile:폭 < 800 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(600);
    console.log('── ' + 폭 + 'px');

    const 톡 = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(400); };
    const 높 = 자 => p.evaluate(s2 => { const e = document.querySelector(s2);
      return e ? Math.round(e.getBoundingClientRect().height) : null; }, 자);
    const 지움 = () => p.evaluate(() => (window.__probe.손질().지움 || []).slice());
    const 되돌 = async () => { await p.evaluate(() => { window.__probe.손질().지움 = []; window.__probe.set({}); }); await 잠(400); };

    console.log('① 줄 23 · 한 자리 27  ② × 20×20 · 닿는 40×27  ③ 안 겹치고 두께 칸을 안 먹는다  ⑦ 안 잘린다');
    맞나('부속 줄 높이 · 한 자리', await p.evaluate(() => {
      const 줄 = [...document.querySelectorAll('#boardBox .field[data-home]')].filter(r => r.style.display !== 'none');
      const a = 줄[0].getBoundingClientRect(), b2 = 줄[1].getBoundingClientRect();
      return [Math.round(a.height), Math.round(b2.top - a.top)]; }), [23, 27]);
    맞나('× 보이는 것 · 닿는 자리', await p.evaluate(() => {
      const x = document.querySelector('#boardBox .field[data-home] .x');
      const r = x.getBoundingClientRect(), a = getComputedStyle(x, '::after');
      return [Math.round(r.width) + '×' + Math.round(r.height), a.width + '×' + a.height]; }),
      ['20×20', '40px×27px']);
    맞나('닿는 자리 겹침 · 두께 칸 먹음', await p.evaluate(() => {
      const 줄 = [...document.querySelectorAll('#boardBox .field[data-home]')].filter(r => r.style.display !== 'none');
      const 네 = [], 먹 = [];
      줄.forEach(r => { const x = r.querySelector('.x'), k = r.querySelector('.two [data-key]');
        if (!x) return; const a = getComputedStyle(x, '::after'), b2 = x.getBoundingClientRect();
        const w = parseFloat(a.width), h = parseFloat(a.height);
        const cx = b2.left + b2.width/2, cy = b2.top + b2.height/2;
        네.push({ l:cx - w/2, t:cy - h/2, rr:cx + w/2, bb:cy + h/2 });
        if (k && k.getBoundingClientRect().right - (cx - w/2) > 0.5) 먹.push(r.dataset.part); });
      let 겹 = 0;
      for (let i = 0; i < 네.length; i++) for (let j = i + 1; j < 네.length; j++){
        const a = 네[i], c = 네[j];
        if (Math.min(a.rr, c.rr) - Math.max(a.l, c.l) > 0.5 && Math.min(a.bb, c.bb) - Math.max(a.t, c.t) > 0.5) 겹++; }
      return [겹, 먹]; }), [0, []]);
    /* ⚠ 10-03 — 폰에서 좌우 여백이 0 이 되어(§4.9862) × 의 닿는 자리(`::after` 40px)가 오른끝에서
       10px 비어져 나간다. `.params` 를 `overflow-x:hidden` 으로 두어 **가로로 안 굴러간다** —
       그래서 자를 `scrollWidth − clientWidth` 에서 **「가로로 굴러가나」** 로 바꿨다. 보는 것은 같다. */
    맞나('두께 값 잘림 · 손가락으로 설정 칸이 가로로 밀리나', await p.evaluate(() => {
      const 잘 = [...document.querySelectorAll('#boardBox .two [data-key]')].map(k => k.scrollWidth - k.clientWidth);
      const q = document.querySelector('.params');
      const c = getComputedStyle(q); q.scrollLeft = 999; const v = q.scrollLeft; q.scrollLeft = 0;
      const 굴 = (c.overflowX === 'auto' || c.overflowX === 'scroll') ? v : 0;
      return [잘.filter(x => x > 0).length, 굴]; }), [0, 0]);

    console.log('④ 진짜 손가락 — 줄마다 × 의 맨 위 +1 · 가운데 · 맨 아래 −1');
    const 부속들 = await p.evaluate(() => [...document.querySelectorAll('#boardBox .field[data-home]')]
      .filter(r => r.style.display !== 'none').map(r => r.dataset.part));
    맞나('보이는 줄 여덟', 부속들.length, 8);
    for (const 어디 of ['위', '가운데', '아래']){
      const 결과 = {};
      for (const 부속 of 부속들){
        await 되돌();
        /* 탭마다 자리를 다시 잰다 — 지운 줄이 사라지면 아래 줄이 올라온다.
           ⚠ 10-04 부터 폰에서는 설정 칸이 도면 **아래**라 줄이 첫 화면 밖이다(§4.98617) —
              **먼저 굴려 넣어야** 손가락이 그 줄에 떨어진다(안 굴리면 아무 줄도 안 지워진다). */
        const z = await p.evaluate(v => {
          const r = [...document.querySelectorAll('#boardBox .field[data-home]')]
            .filter(q => q.style.display !== 'none').find(q => q.dataset.part === v.부속);
          if (!r) return null;
          r.scrollIntoView({ block:'center' });
          const x = r.querySelector('.x'), a = getComputedStyle(x, '::after'), b2 = x.getBoundingClientRect();
          const h = parseFloat(a.height), cx = b2.left + b2.width/2, cy = b2.top + b2.height/2;
          return { x:cx, y: v.어디 === '위' ? cy - h/2 + 1 : v.어디 === '아래' ? cy + h/2 - 1 : cy }; }, { 부속, 어디 });
        if (!z){ 결과[부속] = '줄이 없다'; continue; }
        await 톡(z.x, z.y);
        const 이름들 = [...new Set((await 지움()).map(k => k.split('@')[0]))];
        결과[부속] = 이름들.join('·');
      }
      /* 이동선반은 0단이라 도면에 없다 — × 가 흐리고 지워지지 않는다(§4.89). 그게 맞다.
         문짝 줄의 부속 이름은 「문짝」 이다(화면 이름표는 「도어」). */
      맞나('닿는 자리 ' + 어디 + ' — 노린 줄이 지워진다', 결과,
        { 상판:'상판', 측판:'측판', 고정선반:'고정선반', 이동선반:'', 문짝:'문짝',
          하판:'하판', 전면밴드:'전면밴드', 뒷판:'뒷판' });
    }
    await 되돌();

    console.log('⑤ 23px 부속명 단추가 맨 위·가운데·맨 아래에서 다 펴진다');
    for (const [꼬리, 몫] of [['맨 위', 0], ['가운데', 0.5], ['맨 아래', 1]]){
      const z = await p.evaluate(v => { const e = document.querySelector('.pname[data-opt="측판"]');
        e.scrollIntoView({ block:'center' });
        const r = e.getBoundingClientRect();
        return { x:r.left + r.width/2,
          y: v.m === 0 ? r.top + 1 : v.m === 1 ? r.bottom - 1 : r.top + r.height/2 }; }, { m:몫 });
      await 잠(150); await 톡(z.x, z.y);
      맞나('부속명 ' + 꼬리, await p.evaluate(() =>
        document.querySelector('.pname[data-opt="측판"]').getAttribute('aria-expanded')), 'true');
      await 톡(z.x, z.y);     // 다시 접는다
    }

    console.log('⑥ 안 내려간 것 · 입력칸은 23 그대로');
    맞나('「추가」 단추', await 높('.addrow button'), 44);
    맞나('모드 단추', await 높('.modeseg button'), 44);
    await p.evaluate(() => { const e = document.querySelector('.pname[data-opt="측판"]');
      if (e.getAttribute('aria-expanded') !== 'true') e.click(); }); await 잠(400);
    맞나('체크 줄 44 · 유격 칸 23 · 그 줄 25', await p.evaluate(() => {
      const c = document.querySelector('.opt[data-opt="측판"] .optrow');
      const n = document.querySelector('.opt[data-opt="측판"] .optnum');
      const i = n ? n.querySelector('input') : null;
      return [c ? Math.round(c.getBoundingClientRect().height) : null,
              i ? Math.round(i.getBoundingClientRect().height) : null,
              n ? Math.round(n.getBoundingClientRect().height) : null]; }), [44, 23, 25]);
    // 알약은 상판 판(「상판 결합」)에 있다 — 측판 판에는 없다
    await p.evaluate(() => { const e = document.querySelector('.pname[data-opt="상판"]');
      if (e.getAttribute('aria-expanded') !== 'true') e.click(); }); await 잠(400);
    맞나('세그먼트 알약 — 보이는 것 · 닿는 자리', await p.evaluate(() => {
      const l = document.querySelector('.opt[data-opt="상판"] .seg.mini label');
      return l ? [Math.round(l.getBoundingClientRect().height), getComputedStyle(l, '::after').height] : null; }),
      [31, '44px']);
    맞나('두께 고르개 23', await 높('#boardBox .two [data-key]'), 23);
    맞나('오류 @' + 폭, 터짐, []);
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

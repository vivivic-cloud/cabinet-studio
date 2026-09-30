#!/usr/bin/env node
/* 보호대·밴드 시험 — 09-30 사장님 말씀 네 가지를 못 박아 둔다.
     ① 보호대 18T 끼우기 — 뒤끝에 맞춰 서고(넘침 0) 두께가 안 깎인다
     ② 보호대 55T 끼우기 — 두께가 그대로고 뒷판·전면밴드·하판과 안 겹친다
     ③ 보호대 18T 덮기   — 예전 자리 그대로 (y 379.3 · 뒤끝 397.3)
     ④ 밴드 25T 끼우기   — 예전과 똑같이 16mm 넘침 (15mm 자동조정은 밴드만이다)

   돌리는 법:  node tests/보호대.js
   이 방은 CDN 이 막혀 있다(§7). 그래서 three 를 받지 않고 **허수아비**를 세우고,
   `init3D()` 를 부르지 않은 채 `buildModel` 만 꺼내 쓴다 — 모델 셈은 three 를 한 줄도 안 쓴다.
   Playwright 가 없으면 건너뛴다(끝값 0) — 없다고 빨개지지는 않게 한다. */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

// ── index.html 을 시험용으로 손질한다: three 를 안 받고, buildModel 손잡이를 심는다
const 손질 = () => {
  let s = fs.readFileSync(path.join(뿌리, 'index.html'), 'utf8');
  /* three 를 안 받는 대신 **허수아비**를 세운다. 맨 윗줄에서 이미 `THREE` 를 쓰므로
     그냥 지우면 스크립트가 통째로 터져 `buildModel` 도 안 생긴다(한 번 그렇게 막혔다).
     무엇을 읽어도·불러도·`new` 해도 저를 돌려주는 Proxy 다 — 셈에 쓰이면 0 이 된다.
     `buildModel` 은 three 를 한 줄도 안 쓰므로 모델 값은 참값 그대로다. */
  const 허수아비 = '<script>window.THREE=(function(){const h={get:(t,k)=>k===Symbol.toPrimitive?(()=>0):P,'
    + 'apply:()=>P,construct:()=>P,set:()=>true};const P=new Proxy(function(){},h);return P;})();<\/script>';
  let 첫 = true;
  s = s.replace(/\s*<script[^>]*cdnjs[^>]*><\/script>/gi, () => { const r = 첫 ? 허수아비 : ''; 첫 = false; return r; });
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  /* `init3D()` 는 **부르지 않는다.** 허수아비 three 로 부르면 그림 고리가 멎어 화면이 아예 안 뜬다
     (한 번 그렇게 30초 기다렸다). 시험은 `buildModel` 만 쓰므로 그 자리를 손잡이로 갈아 끼운다. */
  s = s.replace(못, 'window.__t={build:(o)=>buildModel(Object.assign({},state,o)),규칙,부속:만든부속};');
  return s;
};

const 띄우기 = (html) => new Promise(res => {
  const 서버 = http.createServer((q, a) => { a.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); a.end(html); });
  서버.listen(0, '127.0.0.1', () => res({ 서버, 주소: 'http://127.0.0.1:' + 서버.address().port + '/' }));
});

const 겹침 = (a, b) => {
  const o = (a0,a1,b0,b1) => Math.min(a1,b1) - Math.max(a0,b0);
  const x = o(a.x,a.x+a.w,b.x,b.x+b.w), y = o(a.y,a.y+a.d,b.y,b.y+b.d), z = o(a.z,a.z+a.h,b.z,b.z+b.h);
  return (x > 0.001 && y > 0.001 && z > 0.001) ? [+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)] : null;
};

let 깬것 = 0;
const 맞나 = (이름, 잰것, 바라는것) => {
  const ok = JSON.stringify(잰것) === JSON.stringify(바라는것);
  if (!ok) 깬것++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + 이름 + ' — 잰 값 ' + JSON.stringify(잰것) + (ok ? '' : ' · 바란 값 ' + JSON.stringify(바라는것)));
};

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const 한판 = async (부속, 상태) => {
    const ctx = await b.newContext();
    await ctx.addInitScript(x => localStorage.setItem('cabinet-studio.부속', x), JSON.stringify(부속));
    const p = await ctx.newPage();
    // `load` 를 기다리지 않는다 — 바깥 파일(손잡이·글꼴)이 이 방에서는 안 와 멎는다(§7)
    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__t, null, { timeout: 15000 });
    const m = await p.evaluate(o => { const m = window.__t.build(o);
      return { parts: m.parts.map(q => ({name:q.name,x:q.x,y:q.y,z:q.z,w:q.w,d:q.d,h:q.h,cut:q.cut})),
               넘침들: m.넘침들, CD: m.CD }; }, 상태);
    await ctx.close();
    return m;
  };
  const 것 = (m, n) => m.parts.find(q => q.name === n);

  console.log('① 보호대 18T · 끼우기 — 뒤끝에 맞춰 서고 넘침 0');
  { const m = await 한판([{이름:'보호대',T:18}], {backMode:'insert'});
    const g = 것(m, '보호대');
    맞나('보호대 y · 뒤끝', [g.y, +(g.y + g.d).toFixed(2)], [382, 400]);
    맞나('보호대 넘침', m.넘침들.보호대 || 0, 0);
    맞나('보호대 재단', [g.cut.L, g.cut.W, g.cut.T], [764, 80, 18]);
    맞나('보호대 뒤끝 = 측판 뒤끝(CD)', +(g.y + g.d).toFixed(2), m.CD); }

  console.log('② 보호대 55T · 끼우기 — 두께 그대로 · 넘침 0 · 안 겹친다');
  { const m = await 한판([{이름:'보호대',T:55}], {backMode:'insert'});
    const g = 것(m, '보호대');
    맞나('보호대 두께 · 뒤끝', [g.cut.T, +(g.y + g.d).toFixed(2)], [55, 400]);
    맞나('보호대 넘침', m.넘침들.보호대 || 0, 0);
    const 부딪힘 = ['뒷판','전면밴드','하판','측판','문짝','고정선반']
      .flatMap(n => m.parts.filter(q => q.name === n))
      .filter(q => 겹침(g, q)).map(q => q.name);
    맞나('보호대와 겹치는 부속', 부딪힘, []); }

  console.log('③ 보호대 18T · 덮기 — 예전 자리 그대로');
  { const m = await 한판([{이름:'보호대',T:18}], {backMode:'cover'});
    const g = 것(m, '보호대');
    맞나('보호대 y · 뒤끝', [g.y, +(g.y + g.d).toFixed(2)], [379.3, 397.3]);
    맞나('보호대 넘침', m.넘침들.보호대 || 0, 0); }

  console.log('④ 밴드 25T · 끼우기 — 예전과 똑같이 16mm 넘침 (자동조정은 밴드만이다)');
  { const m = await 한판([{이름:'밴드',T:25}], {backMode:'insert'});
    const d = 것(m, '밴드');
    맞나('밴드 y · 뒤끝', [d.y, +(d.y + d.d).toFixed(2)], [391, 416]);
    맞나('밴드 넘침', m.넘침들.밴드 || 0, 16);
    맞나('밴드 재단', [d.cut.L, d.cut.W, d.cut.T], [764, 98, 25]); }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

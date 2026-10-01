#!/usr/bin/env node
/* 10-01 사장님 말씀
     「하판의 측판아래 시 설정된 외경에 영향이 없는 측판의 아래에 위치해야 합니다. 이때 전면밴드·보호대 등
      구조에 영향을 주는 부속들은 사라지게 해주세요. 하판의 측판아래 옵션시 기본 세팅 사이즈 및 관련부속과의
      관계는 **상판과 동일하게** 세팅되는 것을 기본값으로 해주세요」

     ① 하판 「측판 아래」 는 상판 「측판 위」 의 **거울**이다 (하판 z 0 · 측판이 그 위에 선다)
     ② 전면밴드·보호대가 **사라진다** (전면밴드 값을 뭘로 두든)
     ③ 실제 외경이 안 변한다 — 네 갈래 다 입력 그대로
     ④ 「측판 사이」 와 「상판 위」 는 한 자도 안 바뀐다
     ⑤ 담긴 전면밴드 값은 **안 지운다** — 도로 「측판 사이」 로 두면 그대로 살아난다

   돌리는 법:  node tests/측판아래.js
   three 를 안 받고 허수아비를 세운다(`tests/보호대.js` 와 같은 길 · §4.87).
   Playwright 가 없으면 건너뛴다(끝값 0). */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

const 손질 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  const 허수아비 = '<script>window.THREE=(function(){const h={get:(t,k)=>k===Symbol.toPrimitive?(()=>0):P,'
    + 'apply:()=>P,construct:()=>P,set:()=>true};const P=new Proxy(function(){},h);return P;})();<\/script>';
  let 첫 = true;
  s = s.replace(/\s*<script[^>]*cdnjs[^>]*><\/script>/gi, () => { const r = 첫 ? 허수아비 : ''; 첫 = false; return r; });
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__t={build:(o)=>buildModel(Object.assign({},state,o)),st:()=>state};');
};

const 띄우기 = (html) => new Promise(res => {
  const 서버 = http.createServer((q, a) => { a.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); a.end(html); });
  서버.listen(0, '127.0.0.1', () => res({ 서버, 주소: 'http://127.0.0.1:' + 서버.address().port + '/' }));
});

let 깬것 = 0;
const 맞나 = (이름, 잰것, 바라는것) => {
  const ok = JSON.stringify(잰것) === JSON.stringify(바라는것);
  if (!ok) 깬것++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + 이름 + ' — 잰 값 ' + JSON.stringify(잰것) + (ok ? '' : ' · 바란 값 ' + JSON.stringify(바라는것)));
};

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => localStorage.setItem('cabinet-studio.부속',
    JSON.stringify([{ 이름:'보호대', T:18 }])));
  const p = await ctx.newPage();
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__t, null, { timeout: 15000 });

  const 재 = o => p.evaluate(v => {
    const m = window.__t.build(Object.assign({ backMode:'cover', doorMode:'in', W:800, D:400, H:1800, plinth:80 }, v));
    const 것 = n => m.parts.find(q => q.name === n), 셈 = n => m.parts.filter(q => q.name === n).length;
    const 측 = 것('측판'), 상 = 것('상판'), 하 = 것('하판');
    return { 측판:[측.z, 측.h, 측.cut.L], 상판:[상.x, 상.z, 상.w, 상.cut.L], 하판:[하.x, 하.z, 하.w, 하.cut.L],
             전면밴드: 셈('전면밴드'), 보호대: 셈('보호대'), 안높이: m.innerH,
             외경:[m.외경.W, m.외경.D, m.외경.H, m.외경.같나],
             바닥: m.parts.filter(q => Math.abs(q.z) < 0.001).map(q => q.name) };
  }, o);

  console.log('① 하판 「측판 아래」 는 상판 「측판 위」 의 거울이다');
  { const 위 = await 재({ topStyle:'overlay', botStyle:'inset' });
    const 아래 = await 재({ topStyle:'inset', botStyle:'under' });
    맞나('상판 위 — 측판 z·높이 · 상판 x·z·폭', [위.측판, 위.상판], [[0, 1782, 1782], [0, 1782, 800, 800]]);
    맞나('하판 아래 — 측판 z·높이 · 하판 x·z·폭', [아래.측판, 아래.하판], [[18, 1782, 1782], [0, 0, 800, 800]]);
    맞나('거울인가 — 측판 높이가 같다', [위.측판[1], 아래.측판[1]], [1782, 1782]);
    맞나('바닥에 닿는 것', 아래.바닥, ['하판']); }

  console.log('② 전면밴드·보호대가 사라진다 (전면밴드 값을 뭘로 두든)');
  for (const 밴 of [0, 80, 120]) {
    const r = await 재({ topStyle:'inset', botStyle:'under', plinth:밴 });
    맞나(`전면밴드 ${밴} — 전면밴드 · 보호대 장수`, [r.전면밴드, r.보호대], [0, 0]);
  }
  { const r = await 재({ topStyle:'inset', botStyle:'inset', plinth:80 });
    맞나('「측판 사이」 에서는 그대로 선다', [r.전면밴드, r.보호대], [1, 1]); }

  console.log('③ 실제 외경이 안 변한다 — 네 갈래 다 입력 그대로');
  for (const [위, 아래] of [['inset','inset'],['overlay','inset'],['inset','under'],['overlay','under']]) {
    const r = await 재({ topStyle:위, botStyle:아래 });
    맞나(`${위} · ${아래}`, r.외경, [800, 402.7, 1800, false]);   // 덮기 뒷판 2.7 이 뒤로 붙어 D 만 깊다
  }

  console.log('④ 「측판 사이」·「상판 위」 는 한 자도 안 바뀐다');
  { const a = await 재({ topStyle:'inset', botStyle:'inset' });
    맞나('측판 사이 · 하판 사이', [a.측판, a.상판, a.하판, a.안높이], [[0, 1800, 1800], [18, 1782, 764, 764], [18, 80, 764, 764], 1684]);
    const c = await 재({ topStyle:'overlay', botStyle:'inset' });
    맞나('상판 위 · 하판 사이', [c.하판, c.전면밴드, c.보호대, c.안높이], [[18, 80, 764, 764], 1, 1, 1684]); }

  console.log('⑤ 담긴 전면밴드 값은 안 지운다 — 도로 「측판 사이」 로 두면 살아난다');
  { const a = await p.evaluate(() => { window.__t.st().botStyle = 'under'; window.__t.st().plinth = 120;
      const m = window.__t.build({});
      return [m.parts.filter(q => q.name === '전면밴드').length, window.__t.st().plinth]; });
    맞나('측판 아래 — 0장 · 담긴 값 120', a, [0, 120]);
    const c = await p.evaluate(() => { window.__t.st().botStyle = 'inset';
      const m = window.__t.build({});
      const 밴 = m.parts.find(q => q.name === '전면밴드');
      return [m.parts.filter(q => q.name === '전면밴드').length, 밴 ? 밴.h : null, window.__t.st().plinth]; });
    맞나('도로 측판 사이 — 1장 · 높이 120', c, [1, 120, 120]); }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 「측판 내밈」 은 제품 최대 외경을 안 키운다 — 10-01 사장님 말씀
     「측판내밈은 제품의 최대외경에 변화가 없어야해 그러니까 말은 측판냄밈이지만
       사실을 상팔이(상판이) 들어가는 조정이 되어야 하는거지」
     ① 측밈 0 이면 예전 그대로 — 측판·상판·하판이 다 y 0 · 깊이 CD
     ② 측밈 N 이면 **실제 외경이 한 톨도 안 변한다** (측판은 겉면 자리 그대로, 상판이 뒤로 들어간다)
     ③ 측판 앞면과 상판 앞면의 차가 N 이다 — 둘 사이 관계는 그대로다
     ④ 재단 치수 — 측판 W = CD · 상판 W = CD − N
     ⑤ **하판은 안 건드렸다** — 사장님이 「상판」 이라 하셨다

   돌리는 법:  node tests/측판내밈.js
   `tests/외경.js` 와 같은 허수아비 판이다(§4.87). Playwright 가 없으면 건너뛴다(끝값 0 · §7). */
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
  s = s.replace(못, 'window.__t={build:(o,밈)=>{규칙.측판내밈=밈;return buildModel(Object.assign({},state,o));},'
    + 'draw:(o,밈)=>{규칙.측판내밈=밈;const s=Object.assign({},state,o);return buildDrawing(s,buildModel(s));}};');
  return s;
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
  const p = await (await b.newContext()).newPage();
  // `load` 를 기다리지 않는다 — 바깥 파일이 이 방에서는 안 온다(§7)
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__t, null, { timeout: 15000 });

  const 재 = (o, 밈) => p.evaluate(v => { const m = window.__t.build(v.o, v.밈);
    const 측 = m.parts.filter(q => q.name === '측판'), 상 = m.parts.find(q => q.name === '상판'),
          하 = m.parts.find(q => q.name === '하판');
    return { CD: m.CD, 측밈: m.측밈,
             측판: 측.map(q => [q.y, q.d, q.cut.W]), 상판: [상.y, 상.d, 상.cut.W], 하판: [하.y, 하.d, 하.cut.W],
             앞면차: +(상.y - 측[0].y).toFixed(3),
             외경: [m.외경.W, m.외경.D, m.외경.H, m.외경.같나] }; }, { o, 밈 });
  const 인덮 = { topStyle:'inset', botStyle:'inset', backMode:'cover', doorMode:'in' };
  const 인끼 = Object.assign({}, 인덮, { backMode:'insert' });

  console.log('① 측밈 0 — 예전 그대로');
  { const r = await 재(인덮, 0);
    맞나('측판 두 장 · 상판 · 하판', [r.측판, r.상판, r.하판], [[[0,400,400],[0,400,400]], [0,400,400], [0,400,400]]);
    맞나('앞면차 · 실제외경', [r.앞면차, r.외경], [0, [800, 402.7, 1800, false]]); }

  console.log('② 측밈 2.5 — 실제 외경이 한 톨도 안 변한다 (덮기·인도어)');
  { const 영 = await 재(인덮, 0), r = await 재(인덮, 2.5);
    맞나('실제외경 (측밈 0 과 같다)', r.외경, 영.외경);
    맞나('측판 — 겉면 자리 그대로', r.측판, [[0,400,400],[0,400,400]]);
    맞나('상판 — 2.5 뒤로 들어간다', r.상판, [2.5, 397.5, 397.5]);
    맞나('앞면차', r.앞면차, 2.5);
    맞나('하판 — 안 건드렸다', r.하판, 영.하판); }

  console.log('③ 측밈 10 — 크게 넣어도 외경이 그대로다');
  { const 영 = await 재(인덮, 0), r = await 재(인덮, 10);
    맞나('실제외경', r.외경, 영.외경);
    맞나('측판 · 상판 · 앞면차', [r.측판[0], r.상판, r.앞면차], [[0,400,400], [10, 390, 390], 10]);
    맞나('하판', r.하판, 영.하판); }

  console.log('④ 끼우기·인도어 — 입력과 같고 「실제외경」 줄이 접힌다');
  { for (const 밈 of [0, 2.5, 10]){
      const r = await 재(인끼, 밈);
      맞나('측밈 ' + 밈 + ' · 외경 = 입력', r.외경, [800, 400, 1800, true]);
      const 글 = await p.evaluate(v => window.__t.draw(v.o, v.밈).P.filter(q => q.t === 'text').map(q => q.str),
        { o: 인끼, 밈 });
      맞나('측밈 ' + 밈 + ' · 도면 표제란에 「실제외경」 없음', 글.includes('실제외경'), false);
    } }

  console.log('⑤ 상판이 측판 위면 측밈은 0 이다 (09-30 그대로)');
  { const r = await 재({ topStyle:'overlay', botStyle:'inset', backMode:'cover', doorMode:'in' }, 2.5);
    맞나('측밈 · 측판 · 상판 y', [r.측밈, r.측판[0], r.상판[0]], [0, [0,400,400], 0]); }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 「0」 치수 시험 — 값이 0 인 치수는 도면에 하나도 없어야 한다 (09-30 관리자가 정했다).
   0mm 는 공장에 아무것도 알려 주지 않고 도면이 잘못 나온 것처럼 보인다. **덮기·끼우기 둘 다**다.
     ① 여섯 상태에서 값이 0 인 치수 글자가 하나도 없다
     ② 숫자만 지우고 선을 남기지 않았다 — 길이 0 인 치수선(점으로 눌린 선)도 없다
     ③ 0 이 아닌 치수는 그대로다 — 상태마다 치수 글자 수를 못 박는다

   돌리는 법:  node tests/영치수.js
   `tests/외경.js` 와 같은 허수아비 판이다(§4.87 · §1.5). Playwright 가 없으면 건너뛴다(끝값 0). */
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
  s = s.replace(못, 'window.__t={draw:(o)=>{const s=Object.assign({},state,o);return buildDrawing(s,buildModel(s));}};');
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

// 여섯 상태 — `dxfsame2.js` 가 쓰는 것과 같은 여섯이다
const 기본 = { W:800, H:1800, Ttop:18, Tside:18, Tshelf:18, Tdoor:18, Tbot:18, Tplinth:18, TB:2.7,
               shelves:3, doors:2, doorMode:'out', plinth:80, topStyle:'inset', backMode:'cover' };
const 상태들 = [
  ['① 기본 (덮기·아웃)', {}, 13],
  ['② 인도어',          { doorMode:'in' }, 13],
  ['③ 전면밴드0',        { plinth:0 }, 12],
  ['④ 여러 값 바꿈',     { W:1200, H:2000, Ttop:25, Tside:15, Tshelf:12, Tdoor:24, Tbot:23,
                          Tplinth:28, TB:5, shelves:5, doors:1 }, 15],
  ['⑤ 측판 위',         { topStyle:'overlay' }, 13],
  ['⑥ 끼우기',          { backMode:'insert' }, 16],
];

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  // `load` 를 기다리지 않는다 — 바깥 파일(손잡이·글꼴)이 이 방에서는 안 와 멎는다(§7)
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__t, null, { timeout: 15000 });

  for (const [이름, o, 글수] of 상태들){
    console.log(이름);
    const r = await p.evaluate(o => {
      const P = window.__t.draw(o).P;
      const 글 = P.filter(q => q.t === 'text' && q.layer === 'DIM' && /^[\d.]+$/.test(q.str));
      // 길이 0 인 치수선 — 숫자만 지우고 선을 남기면 여기 걸린다
      const 눌린선 = P.filter(q => q.t === 'line' && q.layer === 'DIM'
        && Math.abs(q.x2 - q.x1) < 1e-9 && Math.abs(q.y2 - q.y1) < 1e-9);
      return { 글수: 글.length, 영: 글.filter(q => parseFloat(q.str) === 0).map(q => [q.str, Math.round(q.x), Math.round(q.y)]),
               눌린선: 눌린선.length };
    }, Object.assign({}, 기본, o));
    맞나('값이 0 인 치수', r.영, []);
    맞나('길이 0 인 치수선 (남은 선)', r.눌린선, 0);
    맞나('치수 글자 수 (0 아닌 것은 그대로)', r.글수, 글수);
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

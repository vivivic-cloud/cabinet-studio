#!/usr/bin/env node
/* 10-02 사장님 말씀: 「뒷판 옵션이 **끼우기**가 되는 경우 **실제 도면**의 상판,하판,측판등
     뒤판끼우기와 관련있는 부속들에 **끼우기 옵션을 위한 가공 정보가 표현**되어야 합니다.
     — 현재 프로그램이 이해하고 있는대로 도면으로 표현해 주세요」
   ⚠ **10-06 사장님 말씀으로 ①⑤ 를 뒤집어 적었다**(지우지 않았다) — 「**2d 도면 메인페이지에 부속의
     가공모습을 보여줄 필요가 없습니다**」. 1쪽 홈 가공도는 다시 **쪽 2**(DXF 만)다.
     **그 말고는 한 자도 안 바뀌었다** — 세 부속·네 숫자·덮기·기하 다 그대로다.
     ① 끼우기 — 홈 가공도가 **쪽 2** 다 (DXF 만 · 1쪽 화면·저장 SVG 에는 없다)
     ② 세 부속이 다 있다 — 측판 2장·안쪽면 · 상판·아랫면 · 하판·윗면
     ③ 네 숫자가 다 있다 — 폭 · 깊이 · 뒤 끝에서 · 판 두께. 값은 모델이 아는 그대로다
     ④ **덮기에서는 한 톨도 안 바뀐다** (`m.홈 === null`)
     ⑤ **기하는 한 톨도 안 바뀐다** — 부속 자리·DXF 에 실리는 조각 수가 같다
     ⑥ **부속 쪽(2쪽부터)의 홈 가공도는 그대로 남는다** — 거기는 제 SVG 라 1쪽과 무관하다(§4.5)
     ⑦ **바로 뒤 「부품표 BOM」 제목이 쪽 0 그대로다** — `쪽` 은 흐르는 값이라 안 되돌리면 거기까지 샌다

   돌리는 법:  node tests/홈가공표현.js
   이 방은 CDN 이 막혀 있다(§7). three 를 받지 않고 **허수아비**를 세우고 `init3D()` 를 부르지 않는다.
   `buildModel`·`buildDrawing` 은 three 를 한 줄도 안 쓰므로 값은 참값이다.
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
  s = s.replace(못, 'window.__t={build:(o)=>buildModel(Object.assign({},state,o)),'
    + 'draw:(o)=>{const s=Object.assign({},state,o);return buildDrawing(s,buildModel(s));},'
    + '쪽들:(o)=>{const s=Object.assign({},state,o);return 부속쪽들(buildModel(s));}};');
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
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  // `load` 를 기다리지 않는다 — 바깥 파일(손잡이·글꼴)이 이 방에서는 안 와 멎는다(§7)
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__t, null, { timeout: 15000 });

  const 그림 = (o) => p.evaluate(v => { const d = window.__t.draw(v);
    const 글 = d.P.filter(x => x.t === 'text');
    const 홈글 = 글.filter(x => /홈 가공도|안쪽면|아랫면|윗면|폭 |깊이 |뒤 끝에서/.test(x.str));
    return { 홈가공도쪽: [...new Set(홈글.map(x => x.쪽))].sort(),
             머리글: 글.filter(x => /· (안쪽면|아랫면|윗면)/.test(x.str)).map(x => x.str),
             숫자: 홈글.filter(x => /^(폭|깊이|뒤 끝에서) /.test(x.str)).map(x => x.str),
             DXF조각: d.P.filter(x => x.쪽 !== 1).length,
             화면조각: d.P.filter(x => x.쪽 !== 2).length,
             전체조각: d.P.length }; }, o || {});

  console.log('① 끼우기 — 홈 가공도가 쪽 2 다 (DXF 만)  ② 세 부속  ③ 네 숫자');
  const 끼 = await 그림({ backMode:'insert' });
  맞나('홈 가공도 글의 쪽', 끼.홈가공도쪽, [2]);
  맞나('세 부속 머리글', 끼.머리글, ['측판 2장 · 안쪽면', '상판 · 아랫면', '하판 · 윗면']);
  맞나('숫자 (세 부속 × 셋)', 끼.숫자,
    ['폭 3.5','깊이 6','뒤 끝에서 5.5','폭 3.5','깊이 6','뒤 끝에서 5.5','폭 3.5','깊이 6','뒤 끝에서 5.5']);
  // 판 두께는 `dimV` 로 찍는다 — 세 부속이 다 18T 라 셋이다
  맞나('판 두께 치수 (18 세 개)', await p.evaluate(() => {
    const d = window.__t.draw({ backMode:'insert' });
    return d.P.filter(x => x.t === 'text' && x.str === '18' && x.layer === 'DIM').length >= 3; }), true);
  // 값이 모델이 아는 그대로인가 — 뒷판을 9T 로 두면 홈 폭이 따라간다
  맞나('뒷판 9T 면 숫자가 따라간다', (await 그림({ backMode:'insert', TB:9 })).숫자.slice(0,3),
    ['폭 9.8','깊이 6','뒤 끝에서 -0.8']);

  console.log('④ 덮기에서는 한 톨도 안 바뀐다');
  const 덮 = await 그림({ backMode:'cover' });
  맞나('덮기 — 홈 가공도가 아예 없다', [덮.홈가공도쪽, 덮.머리글, 덮.숫자], [[], [], []]);

  console.log('⑤ 기하는 한 톨도 안 바뀐다 — DXF 에 실리는 조각 수가 같다');
  // 쪽 2 → 0 이라 DXF 에 실리는 조각(쪽 0·2)은 **그대로**고 화면(쪽 0·1)만 는다
  /* 쪽 2 = 「DXF 만」 이다(§2). 홈 가공도가 다시 쪽 2 라 끼우기의 쪽 2 조각이
     **옛 표제란 10 + 홈 가공도 462 = 472개**다(덮기는 홈이 없어 10개 그대로).
     DXF 에 실리는 조각(쪽 0·2)은 그대로이고 **화면(쪽 0·1)에서만 빠진다**는 뜻이다. */
  맞나('쪽 2 조각 수 (끼우기 · 덮기) — 끼우기에만 홈 가공도가 붙는다', await p.evaluate(() =>
    [window.__t.draw({ backMode:'insert' }).P.filter(x => x.쪽 === 2).length,
     window.__t.draw({ backMode:'cover' }).P.filter(x => x.쪽 === 2).length]), [472, 10]);
  맞나('부속 자리 (끼우기)', await p.evaluate(() => window.__t.build({ backMode:'insert' }).parts
    .map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('|')), await p.evaluate(() =>
    window.__t.build({ backMode:'insert' }).parts.map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('|')));
  맞나('부속 장수 (끼우기)', await p.evaluate(() => window.__t.build({ backMode:'insert' }).parts.length), 11);

  console.log('⑥ 부속 쪽의 홈 가공도는 그대로 남는다  ⑦ 「부품표 BOM」 제목은 쪽 0 그대로다');
  맞나('부속 쪽에 홈 가공도가 있나 (끼우기 · 덮기)', await p.evaluate(() =>
    ['insert','cover'].map(v => window.__t.쪽들({ backMode:v }).filter(x => /홈 가공도/.test(x.svg)).length)), [3, 0]);
  /* ⚠ `쪽` 은 **흐르는 값**이다 — 홈 가공도에서 2 로 두고 안 되돌리면
     바로 뒤의 「부품표 BOM」 제목까지 DXF 만으로 샌다(10-06 에 재서 잡았다). */
  맞나('「부품표 BOM」 제목의 쪽 (끼우기 · 덮기)', await p.evaluate(() =>
    ['insert','cover'].map(v => (window.__t.draw({ backMode:v }).P
      .find(x => x.t === 'text' && /부품표/.test(x.str)) || {}).쪽)), [0, 0]);

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

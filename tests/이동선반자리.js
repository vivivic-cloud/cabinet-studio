#!/usr/bin/env node
/* 10-02 사장님 말씀: 「이동선반의 기본 생성 위치는 설정된 고정 선반의 **적절한 사이 사이** 로 해주세요」
     ① 여섯 갈래의 **서는 차례** — 이동선반이 한쪽으로 몰리지 않는다
     ② 이동 0단·고정 0단이면 **고치기 전과 한 톨도 같다**
     ③ **칸 높이가 고르다** — 고정·이동 두께가 달라도 그렇다
     ④ `고정센터`·`고정선반자리` 에는 **고정선반만** 담긴다 (밴드 「중」 이 이것에 기댄다)
     ⑤ 칸 나눔(`pitch`)은 한 톨도 안 바뀐다

   돌리는 법:  node tests/이동선반자리.js
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
    + 'draw:(o)=>{const s=Object.assign({},state,o);return buildDrawing(s,buildModel(s));}};');
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

  const 잼 = (f, mv, 두께) => p.evaluate(v => {
    const m = window.__t.build({ shelves:v.f, shelvesM:v.mv, Tshelf:v.t1, Tshelf2:v.t2 });
    const sh = m.parts.filter(x => x.name === '고정선반' || x.name === '이동선반').sort((a,b) => a.z - b.z);
    const 칸 = []; let 아래 = m.bz + m.parts.find(x => x.name === '하판').h;
    sh.forEach(x => { 칸.push(+(x.z - 아래).toFixed(2)); 아래 = x.z + x.h; });
    칸.push(+(m.상판밑 - 아래).toFixed(2));
    return { 차례: sh.map(x => x.name === '이동선반' ? '이' : '고').join(''),
             칸높이: [...new Set(칸)], pitch: +m.pitch.toFixed(2),
             선반z: sh.map(x => +x.z.toFixed(1)),
             고정수: m.parts.filter(x => x.name === '고정선반').length };
  }, { f, mv, t1:(두께 || [18,18])[0], t2:(두께 || [18,18])[1] });

  console.log('① 여섯 갈래의 서는 차례 — 이동선반이 몰리지 않는다');
  맞나('고정2·이동2', (await 잼(2,2)).차례, '고이고이');
  맞나('고정3·이동1', (await 잼(3,1)).차례, '고고이고');
  맞나('고정1·이동3', (await 잼(1,3)).차례, '이고이이');
  맞나('고정3·이동3', (await 잼(3,3)).차례, '고이고이고이');
  맞나('고정4·이동2', (await 잼(4,2)).차례, '고이고고이고');
  맞나('고정8·이동8', (await 잼(8,8)).차례, '고이고이고이고이고이고이고이고이');
  // 「몰려 서지 않는다」 를 자로 못 박는다 — 같은 갈래가 잇따라 셋을 넘지 않는다(M·N 이 치우친 갈래만 빼고)
  맞나('같은 갈래가 잇따라 셋을 안 넘는다 (2·2 / 3·3 / 8·8)',
    [await 잼(2,2), await 잼(3,3), await 잼(8,8)].map(r => Math.max(...r.차례.split(/(.)\1*/).filter(Boolean).map(x => x.length))),
    [1, 1, 1]);

  console.log('② 이동 0단·고정 0단이면 고치기 전과 한 톨도 같다');
  맞나('고정2·이동0', (await 잼(2,0)).차례, '고고');
  맞나('고정3·이동0 (기본값)', (await 잼(3,0)).차례, '고고고');
  맞나('고정0·이동2', (await 잼(0,2)).차례, '이이');
  맞나('고정0·이동8', (await 잼(0,8)).차례, '이이이이이이이이');

  console.log('③ 칸 높이가 고르다 — 두께가 달라도 그렇다');
  for (const [f, mv, 바람] of [[2,2,322.4],[3,1,322.4],[3,3,225.14],[8,8,82.12]])
    맞나(`고정${f}·이동${mv} · 두께 같음`, (await 잼(f,mv)).칸높이, [바람]);
  for (const [f, mv, 바람] of [[2,2,319.6],[3,1,321],[3,3,222.14]])
    맞나(`고정${f}·이동${mv} · 고정18 이동25`, (await 잼(f,mv,[18,25])).칸높이, [바람]);

  console.log('④ 고정센터·고정선반자리에는 고정선반만 담긴다');
  맞나('고정 장수 (2·2 / 3·1 / 1·3 / 3·3)',
    [(await 잼(2,2)).고정수, (await 잼(3,1)).고정수, (await 잼(1,3)).고정수, (await 잼(3,3)).고정수], [2, 3, 1, 3]);
  맞나('고정센터 = 고정선반 센터 (2·2)', await p.evaluate(() => {
    const m = window.__t.build({ shelves:2, shelvesM:2 });
    const 고 = m.parts.filter(x => x.name === '고정선반').map(x => +(x.z + x.h/2).toFixed(2));
    return JSON.stringify(고); }), JSON.stringify([(await 잼(2,2)).선반z[0] + 9, (await 잼(2,2)).선반z[2] + 9]));

  console.log('⑤ 칸 나눔(pitch)은 한 톨도 안 바뀐다');
  맞나('pitch (2·2 / 3·1 / 1·3 / 2·0 / 0·2 / 3·3)',
    [(await 잼(2,2)).pitch, (await 잼(3,1)).pitch, (await 잼(1,3)).pitch,
     (await 잼(2,0)).pitch, (await 잼(0,2)).pitch, (await 잼(3,3)).pitch],
    [322.4, 322.4, 322.4, 549.33, 549.33, 225.14]);

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

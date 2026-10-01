#!/usr/bin/env node
/* 10-01 사장님 말씀
     「뒷판들어감의 명칭은 우라홈 으로 변경하며 이는 뒷판의 끼임을 위해 측판및 상판등에 가공되는 홈의
      시작점부터 부속의 마감까지의 거리입니다. 즉 **뒷판의 두께, 가공 홈의 넓이들과 관계없이** 해당 부속의
      마감에서 시작하여 홈 가공의 **안쪽 마감선**까지의 길이를 말합니다. 이로서 고정선반·이동선반의 사이즈는
      뒷판 끼임 위치와 관계없이 이 홈 가공의 시작선부터 전면 마감부까지의 거리로 계산됩니다」

     ① 홈 안쪽선 = D − 우라홈 · 선반 깊이 = CD − 우라홈
     ② **뒷판 두께를 바꿔도** 홈 안쪽선·선반 깊이가 **안 변한다** (이것이 말씀의 핵심이다)
     ③ 홈 유격을 바꿔도 안 변한다 (홈 폭과 무관)
     ④ 우라홈을 바꾸면 그만큼 따라온다
     ⑤ 덮기는 예전 그대로 — 홈이 없고 선반이 몸통 깊이에서 멈춘다
     ⑥ 옛 열쇠 `홈뒤살` 은 **숫자 그대로** 우라홈이 된다

   돌리는 법:  node tests/우라홈.js
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
  return s.replace(못, 'window.__t={build:(o)=>buildModel(Object.assign({},state,o)),규칙:()=>규칙};');
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
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__t, null, { timeout: 15000 });

  /* 옛 열쇠(`홈뒤살`)밖에 없는 판에서는 우라홈이 안 먹어야 **고치기 전에 떨어진다**.
     그래서 값을 넣을 때 우라홈 하나만 쓴다 — 없으면 기본값 그대로라 숫자가 안 맞는다. */
  const 재 = (우라홈, 더 = {}) => p.evaluate(v => {
    const R = window.__t.규칙(); R.우라홈 = v.우라홈;
    if (v.홈유격 !== undefined) R.홈유격 = v.홈유격;
    const m = window.__t.build(v.상태);
    const 고 = m.parts.filter(q => q.name === '고정선반'), 이 = m.parts.filter(q => q.name === '이동선반');
    return { 홈앞: m.홈 ? m.홈.앞 : null, 홈폭: m.홈 ? +m.홈.폭.toFixed(2) : null,
             홈뒤: m.홈 ? +m.홈.뒤.toFixed(2) : null, 홈뒤살: (m.홈 && m.홈.뒤살 !== undefined) ? +m.홈.뒤살.toFixed(2) : null,   // 고치기 전 판에는 없다
             고정선반깊이: 고.map(q => +q.d.toFixed(2)), 이동선반깊이: 이.map(q => +q.d.toFixed(2)), CD: m.CD };
  }, { 우라홈, 홈유격: 더.홈유격, 상태: Object.assign({ backMode:'insert', doorMode:'in', TB:2.7, shelvesM:1 }, 더.상태 || {}) });

  /* 선반은 **홈 안쪽선에서 멈추고** 앞에서 도어 두께만큼 물린다(인도어 18T).
     그래서 선반 깊이 = (CD − 우라홈) − 18 이다. 여기서 보는 것은 그 18 이 아니라
     **홈 안쪽선이 뒷판 두께·홈 폭을 안 탄다**는 것이다. */
  const 문물림 = 18;

  console.log('① 홈 안쪽선 = D − 우라홈 · 선반은 거기서 멈춘다 (D 400 · 우라홈 9)');
  { const r = await 재(9);
    맞나('홈 앞(안쪽선) · 폭 · 뒤', [r.홈앞, r.홈폭, r.홈뒤], [391, 3.5, 394.5]);
    맞나('고정선반 깊이 = (CD − 우라홈) − 도어물림', r.고정선반깊이, [373, 373, 373]);
    맞나('이동선반 깊이 = 고정 − 이동앞뒤(10)', r.이동선반깊이, [363]); }

  console.log('② ⭐ 뒷판 두께를 바꿔도 홈 안쪽선·선반 깊이가 안 변한다');
  for (const TB of [2.7, 9, 18, 25]) {
    const r = await 재(9, { 상태:{ TB } });
    맞나(`뒷판 ${TB}T — 홈 앞 · 고정선반 깊이`, [r.홈앞, r.고정선반깊이[0]], [391, 391 - 문물림]);
  }

  console.log('③ 홈 유격(= 홈 폭)을 바꿔도 안 변한다');
  for (const 유격 of [0, 0.8, 3]) {
    const r = await 재(9, { 홈유격: 유격 });
    맞나(`홈유격 ${유격} — 홈 앞 · 고정선반 깊이 · 홈 폭`, [r.홈앞, r.고정선반깊이[0], r.홈폭], [391, 391 - 문물림, +(2.7 + 유격).toFixed(2)]);
  }
  await p.evaluate(() => { window.__t.규칙().홈유격 = 0.8; });

  console.log('④ 우라홈을 바꾸면 그만큼 따라온다');
  for (const [우, 앞] of [[0, 400], [5, 395], [12.5, 387.5], [20, 380]]) {
    const r = await 재(우);
    맞나(`우라홈 ${우} — 홈 앞 · 고정선반 깊이`, [r.홈앞, r.고정선반깊이[0]], [앞, 앞 - 문물림]);
  }

  console.log('⑤ 덮기는 예전 그대로 — 홈이 없고 선반이 몸통 깊이에서 멈춘다');
  { const r = await 재(9, { 상태:{ backMode:'cover' } });
    맞나('홈 · CD · 고정선반 깊이', [r.홈앞, r.CD, r.고정선반깊이[0]], [null, 400, 400 - 문물림]);
    const b2 = await 재(20, { 상태:{ backMode:'cover' } });
    맞나('우라홈 20 으로 바꿔도 덮기는 그대로', [b2.홈앞, b2.고정선반깊이[0]], [null, 400 - 문물림]); }

  console.log('⑥ 옛 열쇠 `홈뒤살` 은 숫자 그대로 우라홈이 된다');
  { const ctx2 = await b.newContext();
    await ctx2.addInitScript(() => localStorage.setItem('cabinet-studio.규칙',
      JSON.stringify({ 이름:'옛 설정', 홈뒤살:12, 아웃좌우:3 })));
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => window.__t, null, { timeout: 15000 });
    맞나('우라홈 · 옛 열쇠 · 다른 값',
      await p2.evaluate(() => { const R = window.__t.규칙(); return [R.우라홈, R.홈뒤살 === undefined, R.아웃좌우]; }),
      [12, true, 3]);
    맞나('옛 값 12 가 홈 안쪽선에 그대로 먹는다',
      await p2.evaluate(() => { const m = window.__t.build({ backMode:'insert', doorMode:'in' });
        return [m.홈.앞, +m.parts.find(q => q.name === '고정선반').d.toFixed(2)]; }), [388, 370]);
    await ctx2.close(); }

  // 오류는 여기서 세지 마라 — `init3D()` 자리를 손잡이로 갈아 끼운 판이라
  // 전·후 똑같이 `children` 에서 한 번 터진다(§1.5). 오류는 브라우저로 따로 잰다.
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 덮기 몸통 깊이·실제 외경 시험 — 09-30 사장님 말씀을 못 박아 둔다.
     「덮기 뒷판의 두께는 외경사이즈 입력과 무관하게 해주세요.
       부속이 소수점으로 떨어지면 안됩니다. 단 실제외경을 따로 표기해 주세요.」
     ① 덮기 — 몸통 깊이가 입력한 D 그대로고 부속 깊이에 소수가 없다
     ② 끼우기 — 한 자도 안 움직였다 (여기는 예전부터 D 였다)
     ③ 실제 외경 — 부속을 감싸는 네모로 재서 맞는가 (덮기 뒷판·아웃도어·측판 내밈이 다 들어간다)
     ④ 입력과 같으면 도면 표제란의 「실제외경」 줄이 접히는가

   돌리는 법:  node tests/외경.js
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
  let s = fs.readFileSync(path.join(뿌리, 'index.html'), 'utf8');
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

  const 모델 = o => p.evaluate(o => { const m = window.__t.build(o);
    return { CD: m.CD, 외경: m.외경 || {},        // 고치기 전 판에는 `외경` 이 없다 — 터지지 말고 빨개지게 둔다
             부속: m.parts.map(q => ({ name:q.name, y:q.y, d:q.d, L:q.cut.L, W:q.cut.W, T:q.cut.T })) }; }, o);
  const 표제 = o => p.evaluate(o => { const d = window.__t.draw(o);
    const 글 = d.P.filter(q => q.t === 'text').map(q => q.str);
    const i = 글.indexOf('실제외경');
    return { 있나: i >= 0, 값: i >= 0 ? 글[i+1] : null, 치수: 글[글.indexOf('치수') + 1] || null }; }, o);
  const 깊이 = (m, n) => m.부속.filter(q => q.name === n).map(q => q.W);
  const 소수 = ns => ns.filter(n => Math.abs(n - Math.round(n)) > 1e-9);

  console.log('① 덮기 — 몸통 깊이 = 입력한 D · 부속 깊이에 소수가 없다');
  { const m = await 모델({ backMode:'cover' });
    맞나('몸통 깊이(CD)', m.CD, 400);
    맞나('측판 깊이', 깊이(m, '측판'), [400, 400]);
    맞나('상판·하판 깊이', [...깊이(m, '상판'), ...깊이(m, '하판')], [400, 400]);
    맞나('고정선반 깊이', 깊이(m, '고정선반'), [400, 400, 400]);
    // 깊이(결 폭)에 소수가 남은 부속이 하나도 없어야 한다. 아웃도어라 문짝도 정수(396)다.
    맞나('깊이가 소수인 부속', m.부속.filter(q => 소수([q.W]).length).map(q => [q.name, q.W]), []);
    맞나('길이가 소수인 부속', m.부속.filter(q => 소수([q.L]).length).map(q => [q.name, q.L]), []); }

  console.log('② 끼우기 — 한 자도 안 움직였다 (여기는 예전부터 D 였다)');
  { const m = await 모델({ backMode:'insert' });
    맞나('몸통 깊이(CD)', m.CD, 400);
    맞나('측판 깊이', 깊이(m, '측판'), [400, 400]);
    // 끼우기 선반은 뒷판 앞면(홈뒤 − 뒷판두께)에서 멈춘다 — 여기 .3 은 예전 그대로다. 건드리지 않았다.
    맞나('고정선반 깊이 (예전 그대로)', 깊이(m, '고정선반'), [388.3, 388.3, 388.3]);
    const 뒤 = m.부속.find(q => q.name === '뒷판');
    맞나('뒷판 재단 (예전 그대로)', [뒤.L, 뒤.W, 뒤.T], [1695, 775, 2.7]);
    맞나('뒷판 y (예전 그대로)', 뒤.y, 388.3); }

  console.log('③ 실제 외경 — 부속을 감싸는 네모');
  { const a = await 모델({ backMode:'cover', doorMode:'out' });     // 뒷판 2.7 뒤로 + 도어 20 앞으로
    맞나('덮기·아웃 (기본값)', [a.외경.W, a.외경.D, a.외경.H, a.외경.같나], [800, 422.7, 1800, false]);
    const c = await 모델({ backMode:'cover', doorMode:'in' });      // 도어가 안에 있으니 뒷판만 뒤로
    맞나('덮기·인', [c.외경.D, c.외경.같나], [402.7, false]);
    const d = await 모델({ backMode:'cover', doorMode:'out', TB:18 });
    맞나('덮기·아웃 뒷판 18T', [d.외경.D, d.외경.같나], [438, false]);
    const e = await 모델({ backMode:'insert', doorMode:'out' });    // 도어만 앞으로
    맞나('끼우기·아웃', [e.외경.D, e.외경.같나], [420, false]);
    const f = await 모델({ backMode:'insert', doorMode:'in' });     // 아무것도 안 튀어나온다
    맞나('끼우기·인 — 입력과 같다', [f.외경.W, f.외경.D, f.외경.H, f.외경.같나], [800, 400, 1800, true]); }

  console.log('④ 도면 표제란 — 같으면 접고 다르면 적는다');
  { const a = await 표제({ backMode:'cover', doorMode:'out' });
    맞나('덮기·아웃 — 적힌다', [a.있나, a.값, a.치수], [true, 'W800 × D422.7 × H1800', 'W800 × D400 × H1800']);
    const f = await 표제({ backMode:'insert', doorMode:'in' });
    맞나('끼우기·인 — 접힌다', [f.있나, f.값], [false, null]); }

  /* 오류는 세지 않는다 — `init3D()` 를 안 부르는 허수아비 판에서는 고치기 전·후 똑같이
     `children` 을 읽다가 한 번 터진다(그림 고리가 없어서다). 오류 0 은 브라우저로 따로 쟀다. */
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

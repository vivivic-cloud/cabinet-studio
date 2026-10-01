#!/usr/bin/env node
/* 10-01 사장님 말씀: 「**이런 상세정보는 이곳에 나타날 필요없음**」 (왼쪽 설정 칸의 「406.3 mm」 를 짚으시고)

     ① 상세정보(`.stats`)가 왼쪽 설정 칸에 **없다**
     ② 부품표 판 **안**에 있다 — 판이 닫혀 있을 때는 안 보인다
     ③ **진짜 손가락**으로 「부품표」 를 눌러 열면 보이고 값이 다 차 있다
     ④ 판 안에 들어가고 가로 넘침 0 · 단추 줄을 안 덮는다
     ⑤ 지운 것이 아니다 — 다섯 줄이 그대로다 (실제 외경은 입력과 같으면 접힌다 · §1.5)

   돌리는 법:  node tests/상세정보.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();}};' + 못);
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
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  for (const 폭 of [375, 1280]) {
    console.log(`■ ${폭}px`);
    const ctx = await b.newContext({ viewport:{ width:폭, height:폭 === 375 ? 780 : 900 },
      hasTouch: 폭 === 375, isMobile: 폭 === 375 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(700);
    // 진짜 손가락 — 폰에서는 CDP 터치, 넓은 화면에서는 진짜 마우스다(`.click()` 이 아니다)
    const 톡 = async 자 => { const e = await p.$(자); if (!e) return false;
      await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (폭 === 375){ await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); }
      else await p.mouse.click(x, y);
      await 잠(600); return true; };

    console.log('① 왼쪽 설정 칸에 없다  ② 부품표 판 안에 있다 (닫혀 있으면 안 보인다)');
    맞나('설정 칸 안에 있나', await p.evaluate(() => !!document.querySelector('.params .stats')), false);
    맞나('부품표 판 안에 있나', await p.evaluate(() => !!document.querySelector('#bomDlg .stats')), true);
    맞나('판이 닫혀 있을 때 보이나', await p.evaluate(() => { const s = document.querySelector('.stats');
      return s.getBoundingClientRect().height > 0; }), false);

    console.log('③ 진짜 손가락으로 「부품표」 를 눌러 연다');
    맞나('「부품표」 단추를 눌렀나', await 톡('#btnBomOpen'), true);
    맞나('판이 열렸나 · 상세정보가 보이나',
      await p.evaluate(() => [document.querySelector('#bomDlg').open === true,
                             document.querySelector('.stats').getBoundingClientRect().height > 0]), [true, true]);

    console.log('④ 판 안에 들어가고 넘침 0 · 단추 줄을 안 덮는다');
    맞나('판 안 · 가로 넘침 · 단추 줄과의 틈', await p.evaluate(() => {
      const s = document.querySelector('.stats'), d = document.querySelector('.bdlg'), r = document.querySelector('.bdlg .row');
      const q = s.getBoundingClientRect(), dd = d.getBoundingClientRect(), rr = r.getBoundingClientRect();
      return [q.left >= dd.left - 0.5 && q.right <= dd.right + 0.5, s.scrollWidth - s.clientWidth,
              +(rr.top - q.bottom).toFixed(0)]; }), [true, 0, 12]);

    console.log('⑤ 지운 것이 아니다 — 다섯 줄이 그대로 차 있다');
    맞나('줄 이름', await p.evaluate(() => [...document.querySelectorAll('.stats .stat span')].map(x => x.textContent)),
      ['선반 간격 (내부 유효)', '내부 폭 × 깊이', '실제 외경', '18T 소요 면적', '2.7T 소요 면적']);
    맞나('값이 다 차 있나 (– 가 하나도 없다)',
      await p.evaluate(() => [...document.querySelectorAll('.stats .stat b')].filter(x => x.textContent === '–').length), 0);
    맞나('기본값의 값 셋', await p.evaluate(() => ['stPitch','stInner','stOuter'].map(i => document.getElementById(i).textContent)),
      ['407.5 mm', '764 × 400', '800 × 422.7 × 1800']);
    // 끼우기·인도어면 실제 외경이 입력과 같아 그 줄만 접힌다(§1.5) — 지운 것이 아니다
    await p.evaluate(() => window.__probe.set({ backMode:'insert', doorMode:'in' })); await 잠(500);
    맞나('실제 외경 줄이 접히나 (입력과 같을 때)',
      await p.evaluate(() => document.querySelector('#stOuterRow').style.display), 'none');
    await p.evaluate(() => window.__probe.set({ backMode:'cover', doorMode:'out' })); await 잠(400);

    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

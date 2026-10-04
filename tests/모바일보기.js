#!/usr/bin/env node
/* 10-04 사장님 말씀: 「**프로그램 상단 헤더에 모바일 보기를 만들어 모바일 환경에서 화면이 어떻게
   처리 되는지 확인해야겠어**」

     ① 머리띠에 단추가 있고 **44px 이상**이며 맨 위에 제것이다 · 있던 넷은 한 톨도 안 바뀐다
     ② 누르면 판이 열리고 **틀이 375px 폭**이다 · 뒤 칸(3D)은 한 픽셀도 안 줄어든다
     ③ **틀 안에서 폰 갈래가 진짜로 걸린다** — 창 폭 375 · 좌우 여백 0 · 치수 띠가 도면 위
     ④ 틀 안에는 그 단추가 없다(되돌이 막이)
     ⑤ **다시 눌러 제자리** · 닫기 단추 · Esc · 닫으면 틀이 `about:blank`
     ⑥ **폰(375px)에서는 단추가 안 보인다** · 머리 높이·가로 넘침 그대로 · 오류 0

   돌리는 법:  node tests/모바일보기.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state)};' + 못);
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
const 네모 = `(s => { const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height); })`;

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();

  console.log('■ 1280px — 머리띠 단추와 모바일 보기');
  {
    const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
    await 잠(1000);

    console.log('① 단추');
    맞나('머리띠 단추들', await p.evaluate(() => [...document.querySelectorAll('.toolbar button')]
      .map(x => { const r = x.getBoundingClientRect();
        return x.textContent + ' ' + Math.round(r.width) + '×' + Math.round(r.height); })),
      ['부품표 75×44', '되돌리기 90×44', 'SVG 도면 저장 131×44', 'DXF 내보내기 130×44', '모바일 보기 110×44']);
    // ⚠ 고치기 전 판에는 이 단추가 **아예 없다** — 터지지 말고 깨진 수로 세어야 한다
    맞나('맨 위에 제것인가', await p.evaluate(() => { const el0 = document.querySelector('#btnPhone');
      if (!el0) return '단추 없음';
      const r = el0.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return el && el.id; }), 'btnPhone');
    맞나('닿는 높이 44 이상', await p.evaluate(() => { const el = document.querySelector('#btnPhone');
      return !!el && el.getBoundingClientRect().height >= 44; }), true);

    const 칸 = () => p.evaluate(s => { const el = document.querySelector(s);
      const r = el.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height); }, '.view3d');
    const 전 = await 칸();
    const 열렸나 = () => p.evaluate(() => { const d = document.querySelector('#phoneDlg'); return !!d && d.open; });
    const 누르기 = async sel => { const el = await p.$(sel); if (el) await el.click(); };

    console.log('② 누르면 열린다 · 틀이 375 · 뒤 칸은 그대로');
    await 누르기('#btnPhone'); await 잠(2600);
    맞나('판이 열렸나', await 열렸나(), true);
    맞나('틀 폭', await p.evaluate(() => { const el = document.querySelector('#phoneFrame');
      return el ? Math.round(el.getBoundingClientRect().width) : null; }), 375);
    맞나('뒤 3D 칸이 안 줄었다', await 칸(), 전);
    맞나('가로 넘침', await p.evaluate(() => document.documentElement.scrollWidth), 1280);

    console.log('③ 틀 안에서 폰 갈래가 진짜로 걸린다  ④ 틀 안에는 그 단추가 없다');
    const fr = p.frames().find(f => f !== p.mainFrame());
    맞나('틀을 찾았나', !!fr, true);
    if (fr){
      await fr.waitForFunction(() => document.querySelector('#c3d'), null, { timeout:20000 });
      await 잠(1500);
      맞나('틀 안', await fr.evaluate(() => {
        const 여백 = el => { const c = getComputedStyle(el); return c.paddingLeft + '/' + c.paddingRight; };
        const d = document.querySelector('#dimsBar').getBoundingClientRect();
        const c = document.querySelector('#c3d').getBoundingClientRect();
        const b2 = document.querySelector('#btnPhone').getBoundingClientRect();
        return { 창폭: innerWidth,
                 폰갈래: matchMedia('screen and (max-width:1100px)').matches,
                 header: 여백(document.querySelector('header')),
                 params: 여백(document.querySelector('.params')),
                 띠가도면위: d.bottom <= c.top + 0.5,
                 제단추: Math.round(b2.width) + '×' + Math.round(b2.height),
                 넘침: document.documentElement.scrollWidth }; }),
        { 창폭:375, 폰갈래:true, header:'0px/0px', params:'0px/0px',
          띠가도면위:true, 제단추:'0×0', 넘침:375 });
    }

    console.log('⑤ 다시 눌러 제자리 · 닫기 · Esc');
    await 누르기('#btnPhone'); await 잠(700);
    맞나('다시 눌러 닫힌다', await 열렸나(), false);
    맞나('틀이 비워진다', await p.evaluate(() => { const el = document.querySelector('#phoneFrame');
      return el ? el.src : null; }), 'about:blank');
    맞나('닫은 뒤 3D 칸', await 칸(), 전);
    await 누르기('#btnPhone'); await 잠(1200);
    await 누르기('#phoneX'); await 잠(600);
    맞나('「닫기」 로 닫힌다', await 열렸나(), false);
    await 누르기('#btnPhone'); await 잠(1200);
    await p.keyboard.press('Escape'); await 잠(600);
    맞나('Esc 로 닫힌다', await 열렸나(), false);

    맞나('오류', 터짐, []);
    await ctx.close();
  }

  console.log('■ 375px — 폰에서는 안 보인다');
  {
    const ctx = await b.newContext({ viewport:{ width:375, height:780 },
      hasTouch:true, isMobile:true, deviceScaleFactor:2 });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
    await 잠(1000);
    맞나('⑥ 단추가 안 보인다', await p.evaluate(() => { const el = document.querySelector('#btnPhone');
      if (!el) return '단추 없음';
      const r = el.getBoundingClientRect();
      return { display:getComputedStyle(el).display, 크기:Math.round(r.width) + '×' + Math.round(r.height) }; }),
      { display:'none', 크기:'0×0' });
    맞나('판도 안 보인다', await p.evaluate(() => { const d = document.querySelector('#phoneDlg');
      return d ? getComputedStyle(d).display : '판 없음'; }), 'none');
    맞나('머리 높이 · 가로 넘침', await p.evaluate(() =>
      [Math.round(document.querySelector('header').getBoundingClientRect().height),
       document.documentElement.scrollWidth]), [176, 375]);
    맞나('오류', 터짐, []);
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

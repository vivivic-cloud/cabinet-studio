#!/usr/bin/env node
/* 10-03 사장님 말씀: 「**모바일에서 보고있는데 화면이 좌우여유 유격이 있어서 화면 조정이 힘들다
   화면유격이 없게 해줘**」

     ① 폰(375)에서 `header`·`.params`·`#svgwrap` 의 **좌우 여백이 0** 이고 왼·오 끝에 딱 붙는다
     ② 쓸 수 있는 가로폭이 늘어난다 — 설정 칸 335 → **375** · A4 한 쪽 355 → **375**
     ③ **가로 넘침 0** — `documentElement.scrollWidth` 가 375 그대로
     ④ **진짜 손가락으로 설정 칸을 옆으로 쓸어도 안 밀린다**(× 닿는 자리가 10px 비어져 나가므로)
     ⑤ 머리 띠 단추 넷의 크기가 **그대로**다 — 닿는 자리를 여백 때문에 깎지 않았다
     ⑥ **넓은 화면(1280)은 한 톨도 안 바뀐다** — 거긴 세 칸이라 여백이 있어야 읽힌다
     ⑦ 위아래 여백은 안 건드렸다 · 오류 0

   돌리는 법:  node tests/폰여백.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),st:()=>state};' + 못);
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

// 한 칸의 왼·오·폭·좌우 여백
const 칸재기 = sel => {
  const e = document.querySelector(sel); if (!e) return null;
  const r = e.getBoundingClientRect(), c = getComputedStyle(e);
  return { 왼: Math.round(r.left), 오: Math.round(innerWidth - r.right),
           폭: Math.round(r.width), 좌우여백: [c.paddingLeft, c.paddingRight].join(' ') };
};

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();

  for (const 폭 of [375, 1280]){
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 }, hasTouch:폭 < 800, isMobile:폭 < 800 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(800);

    const 재 = sel => p.evaluate(칸재기, sel);
    const 모드 = async m => { await p.evaluate(x =>
      document.querySelector(`.modeseg button[data-mode="${x}"]`).click(), m); await 잠(900); };
    const 넘침 = () => p.evaluate(() => document.documentElement.scrollWidth);
    const 단추 = () => p.evaluate(() => [...document.querySelectorAll('.toolbar button')]
      .map(x => { const r = x.getBoundingClientRect();
        return x.textContent + ' ' + Math.round(r.width) + '×' + Math.round(r.height); }));
    const A4 = () => p.evaluate(() => { const e = document.querySelector('#pageBox>.page');
      if (!e) return null; const r = e.getBoundingClientRect();
      return Math.round(r.width) + '×' + Math.round(r.height); });

    if (폭 === 375){
      console.log('① 375 — 좌우 여백 0 · 끝에 딱 붙는다 (3D 모드)');
      맞나('header',  await 재('header'),  { 왼:0, 오:0, 폭:375, 좌우여백:'0px 0px' });
      맞나('.params', await 재('.params'), { 왼:0, 오:0, 폭:375, 좌우여백:'0px 0px' });
      맞나('.view3d (원래 0 이었다)', await 재('.view3d'), { 왼:0, 오:0, 폭:375, 좌우여백:'0px 0px' });

      console.log('② 쓸 수 있는 가로폭이 늘었다');
      맞나('보드선택 칸 폭', await p.evaluate(() =>
        Math.round(document.querySelector('#boardBox').getBoundingClientRect().width)), 375);

      console.log('③ 가로 넘침 0');
      맞나('documentElement.scrollWidth', await 넘침(), 375);

      console.log('④ 진짜 손가락으로 옆으로 쓸어도 설정 칸이 안 밀린다');
      const q = await p.$('.params'); await q.scrollIntoViewIfNeeded(); await 잠(200);
      const r = await q.boundingBox();
      const y = r.y + Math.min(60, r.height / 2);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:330, y }] });
      for (const x of [300, 260, 220, 180]){
        await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x, y }] });
        await 잠(40); }
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      await 잠(350);
      맞나('손가락으로 쓴 뒤 scrollLeft', await p.evaluate(() =>
        Math.round(document.querySelector('.params').scrollLeft)), 0);
      맞나('사용자가 가로로 밀 수 있나', await p.evaluate(() => {
        const c = getComputedStyle(document.querySelector('.params'));
        return c.overflowX === 'auto' || c.overflowX === 'scroll'; }), false);

      console.log('⑤ 머리 띠 단추 넷은 그대로다 (여백 때문에 안 깎았다) · 「모바일 보기」 는 폰에서 안 보인다');
      /* ⚠ 「DXF 내보내기」 가 36 인 것은 **예전부터 그렇다** — `.toolbar` 가 줄바꿈 flex 라
         첫 줄은 「되돌리기」(44)가 늘려 주고 둘째 줄은 혼자라 제 키(36)다. 이번 일과 무관하다. */
      /* 10-04 — 머리띠에 「모바일 보기」 가 붙었다(§4.986-모바일). **폰에서는 `display:none` 이라 0×0** 이고
         있던 넷은 크기도 차례도 한 톨도 안 바뀐다 — 그것이 이 줄의 자물쇠다. */
      맞나('단추 넷 + 폰에서 숨은 「모바일 보기」', await 단추(),
        ['부품표 75×44', '되돌리기 90×44', 'SVG 도면 저장 131×44', 'DXF 내보내기 130×36', '모바일 보기 0×0']);

      console.log('⑥ 2D 모드도 같다');
      await 모드('2d');
      맞나('#svgwrap', await 재('#svgwrap'), { 왼:0, 오:0, 폭:375, 좌우여백:'0px 0px' });
      맞나('A4 한 쪽', await A4(), '375×530');
      맞나('2D 가로 넘침', await 넘침(), 375);
      /* 쪽 안의 차례(`.toc`)는 **안 건드렸다** — 도면 테두리에 맞춘 4.8% 들여쓰기라
         0 으로 두면 글자가 화면 끝에 딱 붙는다. 관리자에게 숫자로 올렸다(§4.9862). */
      맞나('차례는 4.8% 그대로', await p.evaluate(() =>
        getComputedStyle(document.querySelector('.svgwrap .toc')).paddingLeft !== '0px'), true);
      await 모드('3d');
    } else {
      console.log('⑦ 넓은 화면(1280)은 한 톨도 안 바뀐다');
      맞나('header 여백 20px', (await 재('header')).좌우여백, '20px 20px');
      맞나('.params 여백 20px', (await 재('.params')).좌우여백, '20px 20px');
      맞나('보드선택 칸 폭 244', await p.evaluate(() =>
        Math.round(document.querySelector('#boardBox').getBoundingClientRect().width)), 244);
      맞나('사용자가 가로로 밀 수 있나 (넓은 화면은 auto 그대로)', await p.evaluate(() =>
        getComputedStyle(document.querySelector('.params')).overflowX), 'auto');
      await 모드('2d');
      맞나('#svgwrap 여백 10px', (await 재('#svgwrap')).좌우여백, '10px 10px');
      맞나('A4 한 쪽', await A4(), '453×641');
      맞나('1280 가로 넘침', await 넘침(), 1280);
      await 모드('3d');
    }

    console.log('⑧ 위아래 여백은 안 건드렸다 · 오류 0 (' + 폭 + 'px)');
    맞나('header 위아래', await p.evaluate(() => { const c = getComputedStyle(document.querySelector('header'));
      return [c.paddingTop, c.paddingBottom]; }), ['12px', '12px']);
    맞나('.params 위', await p.evaluate(() =>
      getComputedStyle(document.querySelector('.params')).paddingTop), '18px');
    맞나('오류', 터짐, []);
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

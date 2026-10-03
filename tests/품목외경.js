#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**수납장과 서랍장은 다른개념의 제품이므로 동일 외경입력치를 적용받지 않습니다.
   품목변환시 각각의 입력에 맞는 제품도면이 나타나야 합니다.**」

     ① 처음 서랍장을 고르면 보시던 수납장 값을 그대로 이어받는다 (「일단 동일하게」)
     ② 서랍장에서 외경을 고치면 **수납장은 한 톨도 안 움직인다**
     ③ 수납장 ↔ 서랍장을 오가도 각각 제 값이다 — **칸에 보이는 숫자도 따라간다**
     ④ **도면·3D 가 각각의 입력에 맞게 나온다** (몸통 폭·높이·부속 치수)
     ⑤ 외경만이 아니다 — 두께·단수·결합 방식·뒷판 방식·도어도 품목마다 따로다
     ⑥ **새로 열면 마지막 품목과 그 품목의 외경이 그대로다** — `state` 가 곳간의 여섯째가 되었다
     ⑦ **옛 설정(`.상태` 가 없는 것)으로 열면 기본값이다** · 담긴 `.상태` 가 깨져도 안 터진다

   돌리는 법:  node tests/품목외경.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'rule:()=>규칙,st:()=>state,draw:()=>drawing};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(500);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  /* 10-03 사장님 말씀 — 품목은 **드롭다운**이다. 진짜 손가락으로 고르개를 짚고 목록에서 고른다
     (붙박이 목록은 브라우저가 그리는 것이라 이 방에서 그 목록 자체를 손가락으로 못 짚는다 · §7). */
  const 품목고르기 = async 품 => { const r = await 손가락('#itemSel');
    await p.selectOption('#itemSel', 품); await 잠(500); return r; };
  // 칸도 손가락으로 톡 쳐 초점을 잡고 친다 — 진짜로 쓰는 길이다
  const 쳐넣기 = async (자, v) => {
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type(String(v)); await 잠(400);
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v)); };

  const 외경 = () => p.evaluate(() => [window.__probe.st().W, window.__probe.st().D, window.__probe.st().H]);
  const 칸값 = () => p.evaluate(() => ['W','D','H'].map(k => document.querySelector('#' + k).value));
  const 몸통 = () => p.evaluate(() => { const m = window.__probe.model();
    const t = m.parts.find(x => x.name === '상판'); return [m.innerW, +m.innerH.toFixed(2), t ? t.w : null]; });
  const 삼디 = () => p.evaluate(() => window.__probe.model().parts.length);

  console.log('① 처음 서랍장을 고르면 보시던 수납장 값을 이어받는다');
  맞나('수납장 기본', await 외경(), [800, 400, 1800]);
  await 쳐넣기('#W', 900); await 쳐넣기('#H', 1900);
  맞나('수납장을 900 × 400 × 1900 으로', await 외경(), [900, 400, 1900]);
  const 수납몸통 = await 몸통();
  맞나('서랍장을 눌렀나', await 품목고르기('서랍장'), true);
  맞나('서랍장이 그대로 이어받는다', await 외경(), [900, 400, 1900]);
  맞나('칸에 보이는 숫자도 같다', await 칸값(), ['900', '400', '1900']);
  맞나('도면도 같다', await 몸통(), 수납몸통);

  console.log('② 서랍장에서 고치면 수납장은 한 톨도 안 움직인다');
  await 쳐넣기('#W', 1200); await 쳐넣기('#D', 500); await 쳐넣기('#H', 2100);
  맞나('서랍장 1200 × 500 × 2100', await 외경(), [1200, 500, 2100]);
  const 서랍몸통 = await 몸통();
  맞나('도면이 따라왔다', 서랍몸통[0] !== 수납몸통[0], true);
  await 품목고르기('수납장');
  맞나('수납장은 900 × 400 × 1900 그대로', await 외경(), [900, 400, 1900]);
  맞나('칸에 보이는 숫자도 그대로', await 칸값(), ['900', '400', '1900']);
  맞나('도면도 그대로', await 몸통(), 수납몸통);

  console.log('③ 오가도 각각 제 값이다');
  await 품목고르기('서랍장');
  맞나('서랍장 1200 × 500 × 2100', [await 외경(), await 칸값()], [[1200,500,2100], ['1200','500','2100']]);
  맞나('도면도 제 값', await 몸통(), 서랍몸통);
  await 품목고르기('수납장');
  await 쳐넣기('#W', 700);
  맞나('수납장을 700 으로 고쳐도 서랍장은 1200 그대로', [await 외경(),
    await 품목고르기('서랍장') && await 외경()], [[700,400,1900], [1200,500,2100]]);
  await 품목고르기('수납장');
  맞나('수납장 700 그대로', await 외경(), [700, 400, 1900]);

  console.log('⑤ 두께·단수·결합 방식·뒷판·도어도 품목마다 따로다');
  await p.evaluate(() => window.__probe.set({ Ttop: 25, shelves: 5, topStyle: 'overlay',
    backMode: 'insert', doors: 1, doorMode: 'in' })); await 잠(400);
  const 수납값 = await p.evaluate(() => { const s = window.__probe.st();
    return [s.Ttop, s.shelves, s.topStyle, s.backMode, s.doors, s.doorMode]; });
  맞나('수납장에 넣은 값', 수납값, [25, 5, 'overlay', 'insert', 1, 'in']);
  await 품목고르기('서랍장');
  맞나('서랍장은 제 값 그대로 (아까 그 한 벌)', await p.evaluate(() => { const s = window.__probe.st();
    return [s.Ttop, s.shelves, s.topStyle, s.backMode, s.doors, s.doorMode]; }), [18, 3, 'inset', 'cover', 2, 'out']);
  await p.evaluate(() => window.__probe.set({ Ttop: 15, shelves: 2, doors: 6 })); await 잠(400);
  await 품목고르기('수납장');
  맞나('수납장은 아까 넣은 값 그대로', await p.evaluate(() => { const s = window.__probe.st();
    return [s.Ttop, s.shelves, s.topStyle, s.backMode, s.doors, s.doorMode]; }), 수납값);
  맞나('두께 고르개에 보이는 값도 25', await p.evaluate(() => document.querySelector('#Ttop').value), '25');
  await 품목고르기('서랍장');
  맞나('서랍장도 제 값 그대로', await p.evaluate(() => { const s = window.__probe.st();
    return [s.Ttop, s.shelves, s.doors]; }), [15, 2, 6]);
  맞나('마이다 6분할이 선다', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '마이다').length), 6);

  console.log('④ 3D 도 따라온다 · ⑥ 새로 열면 마지막 품목과 그 외경이 그대로다');
  맞나('부속이 다시 선다 (0 이 아니다)', (await 삼디()) > 0, true);
  // 관리자가 적어 준 그 값으로 한 번 더 — 수납장 800×400×1800 · 서랍장 600×500×900
  await p.evaluate(() => window.__probe.set({ Ttop:18, shelves:3, doors:2 })); await 잠(300);
  await 쳐넣기('#W', 600); await 쳐넣기('#D', 500); await 쳐넣기('#H', 900);
  await 품목고르기('수납장');
  await 쳐넣기('#W', 800); await 쳐넣기('#D', 400); await 쳐넣기('#H', 1800);
  맞나('수납장 800×400×1800', await 외경(), [800, 400, 1800]);
  await 품목고르기('서랍장');
  맞나('서랍장 600×500×900', await 외경(), [600, 500, 900]);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 }); await 잠(600);
  맞나('새로 열면 마지막 품목(서랍장)과 그 외경이 그대로',
    [await p.evaluate(() => window.__probe.st().품목), await 외경(), await 칸값()],
    ['서랍장', [600, 500, 900], ['600', '500', '900']]);
  await 품목고르기('수납장');
  맞나('수납장도 제 값 그대로', await 외경(), [800, 400, 1800]);
  // 설정 여섯 + 되돌리기 역사(§4.9871) + 마지막 품목
  맞나('담긴 열쇠 — 품목마다 일곱 + 마지막 품목', await p.evaluate(() => {
    const k = []; for (let i = 0; i < localStorage.length; i++){ const n = localStorage.key(i);
      if (n.indexOf('cabinet-studio') === 0) k.push(n); }
    return k.sort(); }), ['cabinet-studio.품목'].concat(['수납장','서랍장'].reduce((a2, 품) =>
      a2.concat(['결','규칙','부속','상태','손질','역사','지난부속'].map(k => `cabinet-studio.${품}.${k}`)), [])).sort());

  console.log('⑦ 옛 설정 · 깨진 글에서도 안 터진다');
  await p.evaluate(() => {
    localStorage.clear();
    // 옛 설정 — `.상태` 가 아예 없다
    localStorage.setItem('cabinet-studio.규칙', JSON.stringify({ 이름:'옛 설정', 아웃좌우:3 }));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 }); await 잠(600);
  맞나('옛 설정 — 외경은 공장 기본값 · 규칙은 살아난다',
    [await 외경(), await p.evaluate(() => [window.__probe.rule().이름, window.__probe.rule().아웃좌우])],
    [[800, 400, 1800], ['옛 설정', 3]]);
  await p.evaluate(() => {
    localStorage.setItem('cabinet-studio.수납장.상태', JSON.stringify({
      W:'여덟백', D:-500, H:null, Ttop:'x', shelves:4, topStyle:5, backMode:'insert', 없는열쇠:9 }));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 }); await 잠(600);
  맞나('깨진 글 — 꼴이 맞는 것만 먹고 나머지는 기본값', await p.evaluate(() => { const s2 = window.__probe.st();
    return [s2.W, s2.D, s2.H, s2.Ttop, s2.shelves, s2.topStyle, s2.backMode]; }),
    [800, 400, 1800, 18, 4, 'inset', 'insert']);
  await p.evaluate(() => localStorage.setItem('cabinet-studio.수납장.상태', '{깨진 글'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 }); await 잠(600);
  맞나('글이 통째로 깨져도 안 터진다', [await 외경(), (await 삼디()) > 0], [[800,400,1800], true]);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

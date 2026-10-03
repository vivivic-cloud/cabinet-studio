#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**서랍장 품목의 고정선반의 명칭은 가로대 입니다 — 이 가로대의 사이즈는
   0.5mm단위로 임의 입력할 수 있습니다.**」
   §4.9895 에 적힌 대로 사장님이 「사이즈 입력칸」 이라 부르시는 것은 **줄의 두께 고르개**다.

     ① 수납장은 한 톨도 안 바뀐다 — 줄 이름표 「고정 선반」 · 고르개(select) · 부품표·도면 이름 「고정선반」
     ② **진짜 손가락**으로 서랍장을 고르면 줄 이름표·부품표·도면·3D 이름이 다 **「가로대」** 다
     ③ 고르개가 **숫자 칸(step 0.5 · 23px)** 으로 갈린다
     ④ **0.5 단위 임의 값이 그대로 먹는다** — 7.5 를 치면 재단 두께가 7.5 다
     ⑤ 수납장으로 도로 가면 고르개로 돌아오고 **목록에 없는 값도 그대로 보인다**(거짓말 안 한다)
     ⑥ 단수 슬라이더·깊이 칸·× 가 그대로 먹는다 · 결은 **본이름으로 담겨** 부품표에 그대로 나온다
     ⑧ **수납장 고정선반에는 「선반유격」 칸이 그대로 있다** — 「수납장은 안 건드렸다」 의 자물쇠다
     ⑦ 이동선반은 서랍장에 없는 그대로다 (§4.9875)

   돌리는 법:  node tests/가로대.js
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
    'rule:()=>규칙,st:()=>state,draw:()=>drawing,결:()=>결설정};' + 못);
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
    if (!await p.locator(자).count()){ 맞나('칸이 있나 — ' + 자, false, true); return false; }
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type(String(v)); await 잠(400);
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v));
    return true; };

  const 이름표 = () => p.evaluate(() => document.querySelector('.field[data-part="고정선반"] .pname').textContent);
  const 칸꼴 = () => p.evaluate(() => { const el = document.querySelector('.field[data-part="고정선반"] .two [data-key]');
    if (!el) return null; const r = el.getBoundingClientRect();
    return { 태그: el.tagName, 열쇠: el.dataset.key, step: el.step || null, 높이: Math.round(r.height), 값: el.value }; });
  const 부속이름들 = () => p.evaluate(() => [...new Set(window.__probe.model().parts.map(x => x.name))]);
  const 표 = () => p.evaluate(() => [...document.querySelectorAll('#bomBody tr')]
    .map(tr => [...tr.children].slice(0, 2).concat([tr.children[5]]).map(td => td.textContent).join(' ')));
  const 도면이름 = () => p.evaluate(() => window.__probe.draw().P
    .filter(x => x.t === 'text' && /(고정선반|가로대)/.test(x.str)).map(x => x.str));

  console.log('① 수납장은 예전 그대로');
  맞나('줄 이름표', await 이름표(), '고정 선반');
  맞나('두께 고르개 (select · 23px)', await 칸꼴(), { 태그:'SELECT', 열쇠:'Tshelf', step:null, 높이:23, 값:'18' });
  맞나('부속 이름에 고정선반', (await 부속이름들()).includes('고정선반'), true);
  맞나('도면 이름표 다섯', await 도면이름(), ['고정선반', '상판 18T · 측판 18T · 고정선반 18T · 이동선반 18T',
    '뒷판 2.7T · 고정선반 3단 · 이동선반 0단 · 문짝 2', '고정선반 18T · 이동선반 18T', '고정선반 3단 · 이동선반 0단']);
  맞나('부품표 줄 (부품 · 수량 · 결)', (await 표()).find(x => /고정선반/.test(x)), '고정선반 3 ');
  /* ⚠ 10-03 — 「수납장은 안 건드렸다」 의 자물쇠다. 서랍장에서 「선반유격」 을 걷어낼 때(§4.9863)
     수납장 것까지 같이 사라지면 여기서 빨개진다. 이 줄을 지우지 마라. */
  await 손가락('.pname[data-opt="고정선반"]'); await 잠(300);
  맞나('수납장 고정선반에는 「선반유격」 칸이 그대로 있다', await p.evaluate(() =>
    [!!document.querySelector('.opt[data-opt="고정선반"] input[data-rule="고정선반들임"]'),
     !!document.querySelector('.opt[data-opt="고정선반"] input[data-rule="가로대깊이"]')]), [true, false]);
  await 손가락('.pname[data-opt="고정선반"]'); await 잠(300);

  console.log('② 서랍장 — 명칭이 가로대다');
  맞나('서랍장을 눌렀나', await 품목고르기('서랍장'), true);
  맞나('줄 이름표', await 이름표(), '가로대');
  맞나('부속 이름 (고정선반 없고 가로대 있다)', [(await 부속이름들()).includes('고정선반'),
    (await 부속이름들()).includes('가로대')], [false, true]);
  맞나('도면 이름표 다섯이 다 가로대로', await 도면이름(), ['가로대', '상판 18T · 측판 18T · 가로대 18T · 이동선반 18T',
    '뒷판 2.7T · 가로대 3단 · 이동선반 0단 · 마이다 2', '가로대 18T · 이동선반 18T', '가로대 3단 · 이동선반 0단']);
  맞나('부품표 줄', (await 표()).find(x => /가로대/.test(x)), '가로대 3 ');

  console.log('③ 사이즈 칸 — 0.5 단위 숫자 칸');
  맞나('숫자 칸 (23px · step 0.5)', await 칸꼴(), { 태그:'INPUT', 열쇠:'Tshelf', step:'0.5', 높이:23, 값:'18' });
  맞나('가로 넘침 0', await p.evaluate(() => { const el = document.querySelector('.field[data-part="고정선반"] .two [data-key]');
    return el.scrollWidth - el.clientWidth; }), 0);

  console.log('④ 임의 값이 그대로 먹는다');
  await 쳐넣기('.field[data-part="고정선반"] .two [data-key]', '7.5');
  맞나('state.Tshelf · 재단 두께 · 부품표', [await p.evaluate(() => window.__probe.st().Tshelf),
    await p.evaluate(() => (window.__probe.model().parts.find(x => x.name === '가로대') || {cut:{}}).cut.T),
    (await 표()).find(x => /가로대/.test(x))], [7.5, 7.5, '가로대 3 ']);
  await 쳐넣기('.field[data-part="고정선반"] .two [data-key]', '0.5');
  맞나('0.5 도 먹는다', await p.evaluate(() => window.__probe.st().Tshelf), 0.5);
  await 쳐넣기('.field[data-part="고정선반"] .two [data-key]', '7.5');

  console.log('⑤ 수납장으로 도로 — 고르개로 돌아오고 거짓말하지 않는다');
  맞나('수납장을 눌렀나', await 품목고르기('수납장'), true);
  맞나('줄 이름표 · 고르개', [await 이름표(), (await 칸꼴()).태그], ['고정 선반', 'SELECT']);
  /* ⚠ 10-02 사장님 말씀(§4.9872)으로 `Tshelf` 도 품목마다 갈렸다 —
     수납장은 **제 값 18** 을 쥐고 있고 서랍장의 7.5 는 서랍장에 남는다. */
  맞나('수납장은 제 값 18 이다', (await 칸꼴()).값, '18');
  맞나('부속 이름이 도로 고정선반', (await 부속이름들()).includes('고정선반'), true);
  await 품목고르기('서랍장');
  맞나('서랍장에는 7.5 가 그대로 남아 있다', [(await 칸꼴()).값,
    await p.evaluate(() => window.__probe.st().Tshelf)], ['7.5', 7.5]);
  await 품목고르기('수납장');
  맞나('수납장 고르개는 18 그대로', (await 칸꼴()).값, '18');

  console.log('⑥ 단수·유격·×·결이 그대로 먹는다 (서랍장에서)');
  await 품목고르기('서랍장');
  await 손가락('.pname[data-opt="고정선반"]'); await 잠(300);
  맞나('단수 끌개가 있다', await p.evaluate(() => !!document.querySelector('#shelves')), true);
  await p.evaluate(() => { const r = document.querySelector('#shelves'); r.value = 5;
    r.dispatchEvent(new Event('input', {bubbles:true})); }); await 잠(400);
  맞나('단수 5 → 가로대 5장', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '가로대').length), 5);
  /* 10-03 사장님 말씀 — 서랍장 가로대 판은 「선반유격」 이 아니라 **「깊이」** 칸이다(§4.9863).
     이 시험이 보는 것(단수·결·× 가 그대로 먹는다)은 한 자도 안 바뀌었다 — 칸 이름만 옮겨 적는다. */
  맞나('「깊이」 칸이 있고 「선반유격」 은 없다', await p.evaluate(() =>
    [!!document.querySelector('.opt[data-opt="고정선반"] input[data-rule="가로대깊이"]'),
     !!document.querySelector('.opt[data-opt="고정선반"] input[data-rule="고정선반들임"]')]), [true, false]);
  // 결은 **본이름**(고정선반)으로 담되 부품표에는 가로대 줄에 나온다
  await p.evaluate(() => { document.querySelector('.opt[data-opt="고정선반"] input[data-grainon]').click(); }); await 잠(350);
  await p.evaluate(() => { document.querySelector('.opt[data-opt="고정선반"] input[data-grain][value="세로"]').click(); }); await 잠(400);
  맞나('결은 본이름으로 담긴다', await p.evaluate(() => window.__probe.결()['고정선반']), '세로');
  맞나('부품표 가로대 줄에 결이 나온다', (await 표()).find(x => /가로대/.test(x)), '가로대 5 세로');
  await p.evaluate(() => { document.querySelector('.opt[data-opt="고정선반"] input[data-grainon]').click(); }); await 잠(350);
  await 손가락('.x[data-kill="고정선반"]'); await 잠(400);
  맞나('× 로 지우면 가로대가 빠진다', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '가로대').length), 0);
  맞나('지운 열쇠도 가로대다', await p.evaluate(() => JSON.parse(localStorage.getItem('cabinet-studio.서랍장.손질')).지움), ['가로대@짝:0','가로대@짝:1','가로대@짝:2','가로대@짝:3','가로대@짝:4']);
  맞나('줄이 목록에서 사라진다', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.field[data-part="고정선반"]')).display), 'none');

  console.log('⑦ 이동선반은 서랍장에 없는 그대로다');
  맞나('이동선반 줄도 안 보인다', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.field[data-part="이동선반"]')).display), 'none');

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

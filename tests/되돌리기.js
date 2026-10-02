#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**과거의 설정으로 한단계씩 되돌아 갈 수 있는 버튼**을 만들어 주세요」
   관리자가 10-02 에 규격을 정했다 — 그대로 못 박는다.

     ① 단추가 「저장」 곁에 있다 (44px) · 역사가 비면 흐리고 안 눌린다
     ② **우라홈 9 → 15 저장 → 20 저장 → 되돌리기 두 번 → 9** (한 걸음 = 담기() 한 번)
     ③ **부속을 지운 뒤 되돌리면 되살아난다** (손질도 한 벌에 들었다)
     ④ **외경을 바꾼 뒤 되돌리면 외경도 돌아온다** (상태도 한 벌에 들었다)
     ⑤ 품목을 오가도 **각 품목의 역사가 안 섞인다**
     ⑥ **스물한 번째를 담으면 첫 걸음이 버려지고 터지지 않는다** (스무 걸음)
     ⑦ **되돌리기 자체는 역사에 안 쌓인다** · 되돌린 뒤 화면이 그 설정으로 다시 그려진다
     ⑧ 375px 가로 넘침 0

   돌리는 법:  node tests/되돌리기.js
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
    'rule:()=>규칙,st:()=>state,손질:()=>손질,parts:()=>만든부속};' + 못);
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
  await 잠(600);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  const 쳐넣기 = async (자, v) => {
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type(String(v)); await 잠(400);
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v)); };
  const 되돌리기 = async () => { await 손가락('#btnUndo'); await 잠(450); };

  const 단추 = () => p.evaluate(() => { const b2 = document.getElementById('btnUndo');
    if (!b2) return { 있다:false, 흐림:null, 높이:0, 곁:null }; const r = b2.getBoundingClientRect();
    const 다음 = b2.nextElementSibling;
    return { 있다:true, 흐림:b2.disabled, 높이:Math.round(r.height),
             곁: 다음 ? 다음.textContent : null }; });
  const 역사수 = 품 => p.evaluate(v => { try {
    return JSON.parse(localStorage.getItem('cabinet-studio.' + v + '.역사') || '[]').length; }
    catch (e) { return -1; } }, 품);
  const 우라홈 = () => p.evaluate(() => window.__probe.rule().우라홈);
  const 외경 = () => p.evaluate(() => [window.__probe.st().W, window.__probe.st().D, window.__probe.st().H]);
  const 품목 = () => p.evaluate(() => window.__probe.st().품목);
  // 뒷판 판을 펴고 「끼우기」 로 둔 뒤 우라홈 칸에 치고 「저장」 을 누른다 (§4.9891 B · §4.9893)
  const 우라홈저장 = async v => {
    if (await p.evaluate(() => document.querySelector('.pname[data-opt="뒷판"]').getAttribute('aria-expanded') !== 'true'))
      await 손가락('.pname[data-opt="뒷판"]');
    await 쳐넣기('.opt[data-opt="뒷판"] input[data-rule="우라홈"]', v);
    await 손가락('.opt[data-opt="뒷판"] [data-optsave]'); await 잠(400); };

  console.log('① 단추가 「저장」 곁에 있다');
  맞나('단추 (44px · 「SVG 도면 저장」 바로 앞 · 처음엔 흐림)', await 단추(),
    { 있다:true, 흐림:true, 높이:44, 곁:'SVG 도면 저장' });
  맞나('머리 안에 있다', await p.evaluate(() =>
    !!document.querySelector('.toolbar #btnUndo')), true);
  맞나('375 가로 넘침 0', await p.evaluate(() => { const t = document.querySelector('.toolbar');
    return t.scrollWidth - t.clientWidth; }), 0);
  맞나('역사가 비어 있다', await 역사수('수납장'), 0);

  console.log('② 우라홈 9 → 15 저장 → 20 저장 → 되돌리기 두 번 → 9');
  await p.evaluate(() => window.__probe.set({ backMode: 'insert' })); await 잠(400);
  const 역사0 = await 역사수('수납장');
  await 우라홈저장(15);
  맞나('15 가 먹었다', await 우라홈(), 15);
  await 우라홈저장(20);
  맞나('20 이 먹었다 · 단추가 살아났다', [await 우라홈(), (await 단추()).흐림], [20, false]);
  await 되돌리기();
  맞나('한 걸음 — 15', await 우라홈(), 15);
  await 되돌리기();
  맞나('또 한 걸음 — 9', await 우라홈(), 9);
  맞나('역사가 되돌린 만큼 줄었다', (await 역사수('수납장')) <= 역사0, true);

  console.log('③ 부속을 지운 뒤 되돌리면 되살아난다');
  await p.evaluate(() => window.__probe.set({ backMode: 'cover' })); await 잠(400);
  await 손가락('.x[data-kill="상판"]'); await 잠(450);
  맞나('상판이 빠졌다', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '상판').length), 0);
  await 되돌리기();
  맞나('되돌리면 상판이 돌아온다', await p.evaluate(() =>
    [window.__probe.model().parts.filter(x => x.name === '상판').length,
     window.__probe.손질().지움.length]), [1, 0]);

  console.log('④ 외경을 바꾼 뒤 되돌리면 외경도 돌아온다');
  const 전외경 = await 외경();
  await 쳐넣기('#W', 1500); await 잠(300);
  맞나('지금 1500', (await 외경())[0], 1500);
  for (let i = 0; i < 8; i++){ if ((await 외경())[0] === 전외경[0]) break; await 되돌리기(); }
  맞나('되돌리면 외경이 돌아온다', await 외경(), 전외경);
  맞나('띠 칸 숫자도 따라온다', await p.evaluate(() => document.querySelector('#W').value), String(전외경[0]));

  console.log('⑤ 품목마다 역사가 안 섞인다');
  await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
  await 쳐넣기('#W', 900); await 잠(300);
  const 수납역사 = await 역사수('수납장');
  맞나('수납장에 걸음이 쌓였다', 수납역사 > 0, true);
  await 손가락('#itemBox label:has(input[value="서랍장"])'); await 잠(600);
  맞나('서랍장 역사는 비어 있고 단추도 흐리다', [await 역사수('서랍장'), (await 단추()).흐림], [0, true]);
  await 쳐넣기('#W', 1100); await 잠(300);
  /* ⚠ 관리자 규격이 **「한 걸음 = 담기() 한 번」** 이라 **때로 묶지 않는다.**
     다만 **값이 그대로면 안 쌓는다**(한 벌 글을 견준다) — 「1100」 을 치면 `1·11·110` 이 다
     칸 최소 **300** 으로 눌려 한 벌이 같으므로 **두 걸음**만 쌓인다(900 → 300 → 1100).
     치는 동안의 중간값이 다 다르면 그만큼 걸음이 는다. 이 수를 여기 못 박는다. */
  맞나('「1100」 을 치면 두 걸음이 쌓인다 (같은 값은 안 쌓는다)', await 역사수('서랍장'), 2);
  맞나('수납장 역사는 그대로', await 역사수('수납장'), 수납역사);
  await 되돌리기();
  맞나('한 걸음 — 300 (「110」 이 최소 300 으로 눌린 그 걸음)', [await 품목(), (await 외경())[0]], ['서랍장', 300]);
  let 누름 = 1;
  for (let i = 0; i < 8; i++){ if ((await 외경())[0] === 900) break; await 되돌리기(); 누름++; }
  맞나('두 번 눌러 서랍장이 900 으로 돌아온다', [누름, await 품목(), (await 외경())[0]], [2, '서랍장', 900]);
  await 손가락('#itemBox label:has(input[value="수납장"])'); await 잠(600);
  맞나('수납장은 제 값 900 그대로', (await 외경())[0], 900);

  console.log('⑥ 스무 걸음 — 스물한 번째에도 안 터진다');
  await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
  for (let i = 0; i < 25; i++) await p.evaluate(v => window.__probe.set({ W: 800 + v }), i + 1);
  await 잠(500);
  맞나('역사가 스무 걸음에서 멈춘다', await 역사수('수납장'), 20);
  맞나('지금 값은 825 · 오류 없음', (await 외경())[0], 825);
  await 되돌리기();
  맞나('한 걸음 — 824', (await 외경())[0], 824);

  console.log('⑦ 되돌리기 자체는 역사에 안 쌓인다 · 끝까지 가면 흐려진다');
  const 남은 = await 역사수('수납장');
  await 되돌리기();
  맞나('한 번 누르면 역사가 하나 준다 (안 쌓인다)', await 역사수('수납장'), 남은 - 1);
  for (let i = 0; i < 40; i++){ if ((await 단추()).흐림) break; await 손가락('#btnUndo'); await 잠(130); }
  맞나('끝까지 가면 흐려진다', [(await 단추()).흐림, await 역사수('수납장')], [true, 0]);
  맞나('화면이 그 설정으로 다시 그려졌다', await p.evaluate(() =>
    [window.__probe.model().parts.length, document.querySelectorAll('#bomBody tr').length,
     document.querySelector('#W').value]), [11, 7, '805']);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

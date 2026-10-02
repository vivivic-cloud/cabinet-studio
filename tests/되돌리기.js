#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**과거의 설정으로 한단계씩 되돌아 갈 수 있는 버튼**을 만들어 주세요」
   (짚으신 자리: 품목 · 보드선택 두께 줄)

     ① 설정 칸 맨 위에 「되돌리기」 단추가 있다 (44px) · 처음에는 흐리고 안 눌린다
     ② **진짜 손가락**으로 외경을 고치면 단추가 살아나고, 누르면 **한 단계씩** 되돌아간다
     ③ 두께 고르개·단수 끌개·상세옵션 저장도 한 단계씩 되돌아간다
     ④ **품목 바꾸기도 한 단계다** — 되돌리면 품목과 그 품목의 외경이 같이 돌아온다
     ⑤ 3D 손질(지움)도 되돌아간다
     ⑥ **빠르게 치는 것은 한 단계로 묶인다** (1200 을 치면 1·12·120 으로 네 번 안 돌아간다)
     ⑦ 끝까지 되돌리면 단추가 다시 흐려지고, 되돌린 뒤에도 도면·부품표가 따라온다

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
    await p.keyboard.type(String(v)); await 잠(450);
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v)); };
  // 「되돌리기」 는 한 단계마다 0.6초 묶음 밖에서 눌러야 한 단계가 보장된다
  const 한번 = async () => { await 잠(700); await 손가락('#btnUndo'); await 잠(400); };
  const 끊기 = () => 잠(700);                       // 다음 고침을 다른 단계로 가른다

  // 고치기 전 판에는 단추가 없다 — 거기서 터지지 않고 깨진 것으로 세어야 한다
  const 단추 = () => p.evaluate(() => { const b2 = document.getElementById('btnUndo');
    if (!b2) return { 있다:false, 흐림:null, 높이:0 }; const r = b2.getBoundingClientRect();
    return { 있다:true, 흐림:b2.disabled, 높이:Math.round(r.height) }; });
  const 외경 = () => p.evaluate(() => [window.__probe.st().W, window.__probe.st().D, window.__probe.st().H]);
  const 칸값 = () => p.evaluate(() => ['W','D','H'].map(k => document.querySelector('#' + k).value));
  const 품목 = () => p.evaluate(() => window.__probe.st().품목);
  const 켠품목 = () => p.evaluate(() => (document.querySelector('#itemBox input[name="품목"]:checked') || {}).value);

  console.log('① 단추가 설정 칸 맨 위에 있다');
  맞나('단추 (44px · 처음엔 흐림)', await 단추(), { 있다:true, 흐림:true, 높이:44 });
  맞나('설정 칸 첫 무리다', await p.evaluate(() =>
    document.querySelector('.params .group').id), 'undoBox');

  console.log('② 외경을 고치고 한 단계씩 되돌린다');
  await 끊기(); await 쳐넣기('#W', 900);
  await 끊기(); await 쳐넣기('#H', 2000);
  맞나('지금 900 × 400 × 2000 · 단추가 살아났다', [await 외경(), (await 단추()).흐림], [[900,400,2000], false]);
  await 한번();
  맞나('한 단계 — 높이만 1800 으로', await 외경(), [900, 400, 1800]);
  맞나('칸에 보이는 숫자도 따라온다', await 칸값(), ['900', '400', '1800']);
  await 한번();
  맞나('또 한 단계 — 폭도 800 으로', await 외경(), [800, 400, 1800]);

  console.log('③ 두께 고르개·단수 끌개도 한 단계씩');
  await 끊기();
  await p.evaluate(() => { const s2 = document.querySelector('#Ttop'); s2.value = '25';
    s2.dispatchEvent(new Event('input', {bubbles:true})); }); await 잠(400);
  await 끊기();
  await 손가락('.pname[data-opt="고정선반"]');
  await p.evaluate(() => { const r = document.querySelector('#shelves'); r.value = 6;
    r.dispatchEvent(new Event('input', {bubbles:true})); }); await 잠(400);
  맞나('지금 Ttop 25 · 선반 6단', await p.evaluate(() =>
    [window.__probe.st().Ttop, window.__probe.st().shelves]), [25, 6]);
  await 한번();
  맞나('한 단계 — 선반만 3단으로', await p.evaluate(() =>
    [window.__probe.st().Ttop, window.__probe.st().shelves]), [25, 3]);
  await 한번();
  맞나('또 한 단계 — 두께도 18 로', await p.evaluate(() =>
    [window.__probe.st().Ttop, window.__probe.st().shelves]), [18, 3]);
  맞나('고르개에 보이는 값도 18', await p.evaluate(() => document.querySelector('#Ttop').value), '18');

  console.log('④ 품목 바꾸기도 한 단계다');
  await 끊기(); await 쳐넣기('#W', 1100);
  await 끊기(); await 손가락('#itemBox label:has(input[value="서랍장"])'); await 잠(500);
  await 끊기(); await 쳐넣기('#W', 600);
  맞나('서랍장 600', [await 품목(), await 외경()], ['서랍장', [600,400,1800]]);
  await 한번();
  맞나('한 단계 — 서랍장 1100 (품목은 그대로)', [await 품목(), (await 외경())[0]], ['서랍장', 1100]);
  await 한번();
  맞나('또 한 단계 — 수납장으로 돌아온다', [await 품목(), await 켠품목(), (await 외경())[0]],
    ['수납장', '수납장', 1100]);
  await 한번();
  맞나('또 한 단계 — 폭도 800 으로', (await 외경())[0], 800);

  console.log('⑤ 3D 손질(지움)도 되돌아간다');
  await 끊기();
  await p.evaluate(() => { window.__probe.손질().지움.push('상판@짝:0'); window.__probe.set({}); }); await 잠(400);
  맞나('상판이 빠졌다', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '상판').length), 0);
  await 한번();
  맞나('되돌리면 상판이 돌아온다', await p.evaluate(() =>
    [window.__probe.model().parts.filter(x => x.name === '상판').length,
     window.__probe.손질().지움.length]), [1, 0]);

  console.log('⑥ 빠르게 치는 것은 한 단계로 묶인다');
  await 끊기();
  const 쌓인수 = async () => p.evaluate(() => 0);   // 쌓기는 안 드러낸다 — 눌러서 재는 것이 맞다
  await 쳐넣기('#W', 1200);                           // 1 · 12 · 120 · 1200 네 번 바뀐다
  맞나('지금 1200', (await 외경())[0], 1200);
  await 한번();
  맞나('한 번 눌러 800 으로 — 1·12·120 을 거치지 않는다', (await 외경())[0], 800);

  console.log('⑦ 끝까지 되돌리면 단추가 흐려진다');
  for (let i = 0; i < 40; i++){
    if ((await 단추()).흐림) break;
    await 손가락('#btnUndo'); await 잠(120);
  }
  맞나('단추가 흐려졌다', (await 단추()).흐림, true);
  맞나('처음 설정으로 돌아왔다', [await 품목(), await 외경(), await p.evaluate(() =>
    [window.__probe.st().Ttop, window.__probe.st().shelves])], ['수납장', [800,400,1800], [18,3]]);
  맞나('도면·부품표가 따라왔다', await p.evaluate(() =>
    [window.__probe.model().parts.length, document.querySelectorAll('#bomBody tr').length]), [11, 7]);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

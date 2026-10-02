#!/usr/bin/env node
/* 10-02 사장님 말씀 — 「품목에 서랍장을 추가해 … 품목의 선택으로 해당 품목에 맞는 새로운 관계의 제품이
     나타나게 … 서랍장의 기본세팅은 일단 현재 수납장과 동일하게」 (㉯ 곳간 가르기 · §4.9876)

     ① **옛 한 벌이 하나도 안 날아간다** — 앞머리만 쓰던 다섯 열쇠가 수납장 칸으로 그대로 옮겨진다
     ② 곳간이 품목마다 갈라진다 — `cabinet-studio.<품목>.…`
     ③ **품목을 오가도 서로 안 묻는다** — 수납장에서 고친 유격이 서랍장에 없다
     ④ **새로 열면 마지막에 보던 품목이 그대로다**
     ⑤ 서랍장의 첫 세팅은 **기본값** — 수납장과 똑같은 부속·똑같은 도면이 나온다
     ⑥ 고르개 44px · 375px 에서 안 넘친다

   돌리는 법:  node tests/품목곳간.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),rule:()=>규칙,st:()=>state,parts:()=>만든부속,draw:()=>drawing,svgf:()=>svgForFile(drawing),dxf:()=>buildDXF(drawing)};' + 못);
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

  const 펴기 = async 이름 => { const b2 = p.locator(`.pname[data-opt="${이름}"]`);
    if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${이름}"]`); };
  const 접혔나 = 이름 => p.evaluate(n => document.querySelector(`.pname[data-opt="${n}"]`).getAttribute('aria-expanded') === 'false', 이름);
  const 규 = k => p.evaluate(x => window.__probe.rule()[x], k);
  /* 고치기 전 판에는 저장·닫기 단추가 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다.
     (그 판에서는 이 시험이 깨진 것으로 빨개져야 맞다.) */
  /* **진짜 손가락**으로 누른다 — `.click()` 은 확인으로 치지 않는다(관리자가 못 박았다). */
  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  // 고치기 전 판에는 저장·닫기 단추가 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다
  const 누르기 = async 자 => { if (!await p.locator(자).count()){ 맞나('단추가 있나 — ' + 자, false, true); return false; }
    return 손가락(자); };
  // 칸도 손가락으로 톡 쳐 초점을 잡고 친다 — 진짜로 쓰는 길이다
  const 쳐넣기 = async (자, v) => {
    if (!await p.locator(자).count()){ 맞나('칸이 있나 — ' + 자, false, true); return false; }
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type(String(v)); await 잠(300);
    // 진짜로 들어갔는지 본다 — 안 들어가면 뒤의 판정이 거짓으로 통과한다(한 번 그랬다)
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v));
    return true; };
  const 칸값 = (이름, r) => p.evaluate(v => { const i = document.querySelector(`.opt[data-opt="${v.이름}"] input[data-rule="${v.r}"]`);
    return i ? i.value : null; }, { 이름, r });

  const 곳간들 = () => p.evaluate(() => { const o = {};
    for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i);
      if (k.indexOf('cabinet-studio') === 0) o[k] = localStorage.getItem(k); }
    return o; });
  const 모양 = () => p.evaluate(() => window.__probe.model().parts
    .map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}|${x.cut.L}|${x.cut.W}|${x.cut.T}`).join('\n'));
  const 품목고르기 = async v => 손가락(`#itemBox label:has(input[value="${v}"])`);

  console.log('⑥ 고르개 44px · 안 넘침  ② 처음은 수납장');
  맞나('닿는 자리 44px · 가로 넘침', await p.evaluate(() => {
    const it = document.querySelector('#itemBox'), l = it.querySelector('.seg label');
    const a = getComputedStyle(l, '::after');
    return [parseFloat(a.height) >= 44, it.scrollWidth - it.clientWidth]; }), [true, 0]);
  맞나('처음은 수납장', await p.evaluate(() => window.__probe.st().품목), '수납장');
  const 수납모양 = await 모양();

  console.log('③ 품목을 오가도 서로 안 묻는다');
  // 수납장에서 유격을 고치고 부속을 하나 세운다
  await p.evaluate(() => { window.__probe.rule().우라홈 = 15; window.__probe.set({}); }); await 잠(300);
  await 손가락('#newPart'); await p.keyboard.type('밴드'); await 잠(200);
  await 손가락('#btnAdd'); await 잠(500);
  맞나('수납장 — 우라홈 15 · 만든 부속 1', await p.evaluate(() =>
    [window.__probe.rule().우라홈, window.__probe.model().parts.filter(x => x.name === '밴드').length]), [15, 1]);

  const 수납지금 = await 모양();
  맞나('서랍장을 골랐나', await 품목고르기('서랍장'), true); await 잠(500);
  // 처음 고르는 품목이면 **수납장 것을 베껴** 시작한다 (10-02 관리자)
  맞나('서랍장 — 수납장 것을 베껴 왔다 (우라홈 15 · 만든 부속 1)', await p.evaluate(() =>
    [window.__probe.rule().우라홈, window.__probe.model().parts.filter(x => x.name === '밴드').length]), [15, 1]);
  // ⚠ 이름 하나만 다르다 — 서랍장의 고정선반은 「가로대」 다(10-02 사장님 말씀 · §4.9874)
  맞나('⑤ 서랍장의 부속·치수가 그때 수납장과 같다 (이름만 가로대)',
    (await 모양()).split('가로대').join('고정선반') === 수납지금, true);

  // 서랍장에서 다른 값을 고친다
  await p.evaluate(() => { window.__probe.rule().우라홈 = 20; window.__probe.set({}); }); await 잠(300);
  맞나('수납장으로 돌아왔나', await 품목고르기('수납장'), true); await 잠(500);
  맞나('수납장 값이 그대로 산다', await p.evaluate(() =>
    [window.__probe.rule().우라홈, window.__probe.model().parts.filter(x => x.name === '밴드').length]), [15, 1]);
  맞나('서랍장을 다시 골라도 그 값이 산다', await (async () => {
    await 품목고르기('서랍장'); await 잠(500);
    return p.evaluate(() => [window.__probe.rule().우라홈, window.__probe.model().parts.filter(x => x.name === '밴드').length]);
  })(), [20, 1]);
  // 베끼는 것은 **처음 한 번**뿐이다 — 그 뒤 수납장을 고쳐도 서랍장에 안 묻는다
  await 품목고르기('수납장'); await 잠(500);
  await p.evaluate(() => { window.__probe.rule().우라홈 = 30; window.__probe.set({}); }); await 잠(300);
  await 품목고르기('서랍장'); await 잠(500);
  맞나('수납장을 30 으로 고쳐도 서랍장은 20 그대로', await p.evaluate(() => window.__probe.rule().우라홈), 20);
  await 품목고르기('수납장'); await 잠(500);
  맞나('수납장은 30 그대로', await p.evaluate(() => window.__probe.rule().우라홈), 30);

  console.log('③-2 두 품목이 같은 객체를 함께 쥐지 않는다');
  // 서랍장에서 밴드 두께를 고쳐도 수납장 밴드는 안 따라 바뀐다 (얕은 복사 사고 막이)
  await p.evaluate(() => { const c = window.__probe.parts().find(x => x.이름 === '밴드');
    if (c) c.T = 18; window.__probe.set({}); }); await 잠(300);
  await 품목고르기('서랍장'); await 잠(500);
  await p.evaluate(() => { const c = window.__probe.parts().find(x => x.이름 === '밴드');
    if (c) c.T = 55; window.__probe.set({}); }); await 잠(300);
  await 품목고르기('수납장'); await 잠(500);
  맞나('수납장 밴드 두께 (서랍장에서 55 로 고쳤다)', await p.evaluate(() => {
    const c = window.__probe.parts().find(x => x.이름 === '밴드'); return c ? c.T : null; }), 18);
  await 품목고르기('서랍장'); await 잠(500);
  맞나('서랍장 밴드 두께', await p.evaluate(() => {
    const c = window.__probe.parts().find(x => x.이름 === '밴드'); return c ? c.T : null; }), 55);
  맞나('손질·결도 따로 쥐나 (같은 객체면 둘이 같아진다)', await p.evaluate(() => {
    const a2 = localStorage.getItem('cabinet-studio.수납장.부속');
    const b2 = localStorage.getItem('cabinet-studio.서랍장.부속');
    return a2 !== b2; }), true);

  console.log('② 곳간이 품목마다 갈라진다');
  맞나('담긴 열쇠들', Object.keys(await 곳간들()).sort(),
    ['cabinet-studio.품목'].concat(
      ['수납장','서랍장'].reduce((a2, 품) =>
        a2.concat(['결','규칙','부속','손질','지난부속'].map(k => `cabinet-studio.${품}.${k}`)), [])).sort());

  console.log('④ 새로 열면 마지막에 보던 품목이 그대로다');
  await p.reload({ waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
  맞나('다시 열었을 때 품목 · 단추', await p.evaluate(() => [window.__probe.st().품목,
    document.querySelector('#itemBox input[value="서랍장"]').checked]), ['서랍장', true]);
  맞나('그 품목의 값도 그대로', await p.evaluate(() => window.__probe.rule().우라홈), 20);

  await ctx.close();

  console.log('① 옛 한 벌이 하나도 안 날아간다');
  { const ctx2 = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
    await ctx2.addInitScript(() => {
      localStorage.setItem('cabinet-studio.규칙', JSON.stringify({ 이름:'옛 설정', 우라홈:12, 아웃좌우:3 }));
      localStorage.setItem('cabinet-studio.부속', JSON.stringify([{ 이름:'밴드', T:25, 단:['상','하'] }]));
      localStorage.setItem('cabinet-studio.손질', JSON.stringify({ 숨김:['상판@짝:0'], 지움:[], 복제:{} }));
      localStorage.setItem('cabinet-studio.지난부속', JSON.stringify([{ 이름:'덧판', T:25 }]));
      localStorage.setItem('cabinet-studio.결', JSON.stringify({ 측판:'세로' }));
    });
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil:'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(800);
    맞나('옛 열쇠 다섯이 수납장 칸으로 옮겨졌나', await p2.evaluate(() => {
      const 다섯 = ['규칙','부속','손질','지난부속','결'];
      return [다섯.every(k => localStorage.getItem('cabinet-studio.수납장.' + k) !== null),
              다섯.every(k => localStorage.getItem('cabinet-studio.' + k) === null)]; }), [true, true]);
    맞나('값이 글자까지 같나', await p2.evaluate(() => [
      localStorage.getItem('cabinet-studio.수납장.규칙'),
      localStorage.getItem('cabinet-studio.수납장.부속'),
      localStorage.getItem('cabinet-studio.수납장.지난부속'),
      localStorage.getItem('cabinet-studio.수납장.결')]), [
      JSON.stringify({ 이름:'옛 설정', 우라홈:12, 아웃좌우:3 }),
      JSON.stringify([{ 이름:'밴드', T:25, 단:['상','하'] }]),
      JSON.stringify([{ 이름:'덧판', T:25 }]),
      JSON.stringify({ 측판:'세로' })]);
    맞나('그 값이 그대로 돌아간다', await p2.evaluate(() => { const r = window.__probe.rule();
      const m = window.__probe.model();
      return [r.이름, r.우라홈, r.아웃좌우, m.parts.filter(x => x.name === '밴드').length,
              m.parts.filter(x => x.name === '상판').length]; }), ['옛 설정', 12, 3, 2, 1]);
    맞나('품목은 수납장이다', await p2.evaluate(() => window.__probe.st().품목), '수납장');
    await ctx2.close(); }

  console.log('⑦ 아무것도 담긴 것 없이 처음 여는 분 — 규칙기본에서 시작한다');
  { const ctx4 = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
    const p4 = await ctx4.newPage();
    const cdp4 = await ctx4.newCDPSession(p4);
    await p4.goto(주소, { waitUntil:'domcontentloaded' });
    await p4.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    const 기본 = await p4.evaluate(() => { const r = window.__probe.rule();
      return [r.우라홈, r.인위, r.보호대유격, window.__probe.parts().length]; });
    맞나('빈 브라우저 — 수납장 기본값', 기본, [9, 3, 0, 0]);
    // 서랍장을 처음 골라도 베낄 것이 없으니 같은 기본값이다
    const e4 = await p4.$('#itemBox label:has(input[value="서랍장"])');
    await e4.scrollIntoViewIfNeeded(); const r4 = await e4.boundingBox();
    await cdp4.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r4.x + r4.width/2, y:r4.y + r4.height/2 }] });
    await cdp4.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(600);
    맞나('빈 브라우저 — 서랍장도 같은 기본값', await p4.evaluate(() => { const r = window.__probe.rule();
      return [r.우라홈, r.인위, r.보호대유격, window.__probe.parts().length]; }), [9, 3, 0, 0]);
    await ctx4.close(); }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

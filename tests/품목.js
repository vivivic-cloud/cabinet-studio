#!/usr/bin/env node
/* 10-02 사장님 말씀
     「현재까지 세팅하고있는 모든 관계는 … 수납장에 해당하는 부분 입니다. 품목에 **서랍장을 추가**해 주고 …
      즉 **품목의 선택으로 해당 품목에 맞는 새로운 관계의 제품이 나타나게** 해야 합니다.
      **서랍장의 기본세팅은 일단 현재 수납장과 동일하게** 하여 나타나게 해주세요」

     ① 설정 칸 맨 위에 「품목」 무리가 있고 단추 둘 — 수납장 · 서랍장 (닿는 자리 44px)
     ② 처음 열면 수납장이다
     ③ **진짜 손가락**으로 서랍장을 고르면 도면 표제란 품명과 부품표 머리가 서랍장이 된다
     ④ **서랍장의 부속·치수·부품표가 수납장과 한 톨도 같다** (「일단 동일하게」)
     ⑤ 수납장으로 되돌리면 그대로다
     ⑥ 관계제어판의 「이름」 을 적으면 예전처럼 그것이 이긴다

   돌리는 법:  node tests/품목.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),rule:()=>규칙,st:()=>state,draw:()=>drawing,svgf:()=>svgForFile(drawing),dxf:()=>buildDXF(drawing)};' + 못);
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

  const 품명 = () => p.evaluate(() => window.__probe.draw().P
    .filter(x => x.t === 'text' && /수납장|서랍장|옛 이름/.test(x.str))
    .map(x => x.str));
  const 모양 = () => p.evaluate(() => { const m = window.__probe.model();
    return m.parts.map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}|${x.cut.L}|${x.cut.W}|${x.cut.T}`).join('\n'); });
  const 표 = () => p.evaluate(() => [...document.querySelectorAll('#bomBody tr')].map(tr => tr.textContent).join('|'));

  console.log('① 설정 칸 맨 위에 「품목」 무리  ② 처음은 수납장');
  맞나('무리 차례 (설정 칸 맨 위)', await p.evaluate(() =>
    [...document.querySelectorAll('.params .group')].map(g => g.querySelector('h2').textContent)), ['품목', '보드선택']);
  맞나('단추 둘', await p.evaluate(() =>
    [...document.querySelectorAll('#itemBox input[name="품목"]')].map(i => i.value)), ['수납장', '서랍장']);
  맞나('닿는 자리 44px', await p.evaluate(() => {
    const l = document.querySelector('#itemBox .seg label'); if (!l) return null;
    const r = l.getBoundingClientRect(), a = getComputedStyle(l, '::after');
    const h = a.height === 'auto' ? r.height : parseFloat(a.height);
    return Math.max(r.height, h) >= 44; }), true);
  맞나('처음은 수납장', await p.evaluate(() => window.__probe.st().품목), '수납장');
  const 수납모양 = await 모양(), 수납표 = await 표();
  맞나('도면 품명 (수납장)', await 품명(), ['수납장  W800 × D400 × H1800', '수납장']);

  console.log('③ 진짜 손가락으로 서랍장을 고른다  ④ 부속·치수·부품표가 한 톨도 같다');
  맞나('서랍장을 눌렀나', await 손가락('#itemBox label:has(input[value="서랍장"])'), true);
  await 잠(500);
  맞나('state.품목', await p.evaluate(() => window.__probe.st().품목), '서랍장');
  맞나('도면 품명 (서랍장)', await 품명(), ['서랍장  W800 × D400 × H1800', '서랍장']);
  /* ⚠ 「일단 동일하게」 는 10-02 사장님 말씀 **셋**으로 그만큼씩 갈렸다 —
     이동선반 없음(§4.9875) · 고정선반 → 가로대(§4.9874) · 도어 → 마이다 위아래 분할(§4.9873).
     그래서 **몸통(상판·측판·하판·전면밴드·뒷판)이 글자까지 같은지**로 견주고, 갈린 셋은 따로 못 박는다. */
  const 몸통 = 글 => 글.split('\n').filter(x => /^(상판|측판|하판|전면밴드|뒷판)\|/.test(x)).join('\n');
  맞나('몸통은 수납장과 글자까지 같다', 몸통(await 모양()) === 몸통(수납모양), true);
  맞나('가로대 자리·치수가 수납장 고정선반과 같다',
    (await 모양()).split('\n').filter(x => /^가로대\|/.test(x)).join('\n').split('가로대').join('고정선반')
    === 수납모양.split('\n').filter(x => /^고정선반\|/.test(x)).join('\n'), true);
  맞나('갈린 셋 — 이동선반 0 · 가로대 있다 · 마이다 있다', await p.evaluate(() => {
    const n = window.__probe.model().parts.map(x => x.name);
    return [n.filter(x => x === '이동선반').length, n.includes('가로대'), n.includes('마이다')]; }), [0, true, true]);
  맞나('부품표도 몸통 줄은 같다',
    (await 표()).split('|').filter(x => /^(상판|측판|하판|전면밴드|뒷판)/.test(x)).join('|')
    === 수납표.split('|').filter(x => /^(상판|측판|하판|전면밴드|뒷판)/.test(x)).join('|'), true);

  console.log('⑤ 수납장으로 되돌리면 그대로다');
  맞나('수납장을 눌렀나', await 손가락('#itemBox label:has(input[value="수납장"])'), true);
  await 잠(500);
  맞나('도로 수납장', await p.evaluate(() => window.__probe.st().품목), '수납장');
  맞나('도면 품명', await 품명(), ['수납장  W800 × D400 × H1800', '수납장']);
  맞나('부속·부품표 그대로', [await 모양() === 수납모양, await 표() === 수납표], [true, true]);

  console.log('⑥ 관계제어판의 「이름」 이 이긴다 (예전 그대로)');
  await p.evaluate(() => { window.__probe.rule().이름 = '옛 이름'; window.__probe.set({}); }); await 잠(400);
  맞나('이름을 적으면 그것이 화면 표제란에 든다', await 품명(), ['수납장  W800 × D400 × H1800', '옛 이름']);
  await p.evaluate(() => { window.__probe.rule().이름 = ''; window.__probe.set({}); }); await 잠(300);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

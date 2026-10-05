#!/usr/bin/env node
/* 10-03 사장님 말씀 (「부속추가」 를 짚으시고)
     「**문짝과 고정선반은 서랍장 품목에서 추가될 수 있는 부속이 아니니 삭제해줘**」

   ⚠ **까닭은 「목록이 본이름을 보인다」 가 아니었다.** 서랍장에서 마이다를 지우면 목록에 **「마이다」** 로 제대로 뜬다.
      진짜 까닭은 **베껴 오기**다 — 서랍장 칸은 수납장 한 벌을 한 번 베껴 시작하므로(§4.9876)
      수납장에서 지워 두신 `문짝@짝:0`·`고정선반@짝:0` 이 서랍장 `손질.지움` 에 그대로 들어온다.
      서랍장에서 그 이름은 아무것도 안 가리키는데 **목록에는 「문짝」·「고정선반」 으로 떴다.**

     ① 수납장은 예전 그대로 — 문짝·고정선반을 지우면 목록에 「문짝」·「고정선반」
     ② 서랍장에서 제 것을 지우면 목록에 **「마이다」·「가로대」** (본이름이 아니다)
     ③ **베껴 온 옛 열쇠로 뜨던 「문짝」·「고정선반」 이 서랍장 목록에서 사라진다**
     ④ **담긴 열쇠는 한 글자도 안 건드린다** — `손질.지움` 그대로
     ⑤ 지웠다가 「추가」 로 되살리면 넷 다 제대로 돌아오고 **DXF 가 지우기 전과 같다**
     ⑥ 다시 열어도 그대로 · 375 · 1280 · 오류 0

   돌리는 법:  node tests/서랍장목록.js
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

const 손질글 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),'
    + 'st:()=>state,rule:()=>규칙,parts:()=>만든부속,손질:()=>손질,draw:()=>drawing,dxf:()=>buildDXF(drawing)};' + 못);
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
  const { 서버, 주소 } = await 띄우기(손질글());
  const b = await chromium.launch();

  for (const 폭 of [375, 1280]){
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 }, hasTouch:true, isMobile:폭 < 800 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    console.log('── ' + 폭 + 'px');

    const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
      await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x + r.width/2, y:r.y + r.height/2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(380); return true; };
    const 품목고르기 = async 품 => { await 손가락('#itemSel');
      await p.selectOption('#itemSel', 품); await 잠(800); };
    const 목록 = async () => { await 손가락('#newPart');
      const v = await p.evaluate(() => [...document.querySelectorAll('#partNames *')]
        .map(x => x.textContent.trim()).filter(Boolean));
      await p.keyboard.press('Escape'); await 잠(200); return [...new Set(v)]; };
    const 더하기 = async 이름 => { await 손가락('#newPart');
      await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
      await p.keyboard.type(이름); await 잠(220); await 손가락('#btnAdd'); await 잠(600); };
    const 지움 = () => p.evaluate(() => (window.__probe.손질().지움 || []).slice());
    const 이름들 = () => p.evaluate(() => [...new Set(window.__probe.model().parts.map(x => x.name))].sort());
    const DXF = () => p.evaluate(() => window.__probe.dxf().length);

    console.log('① 수납장은 예전 그대로  ⑤ 되살리면 DXF 가 돌아온다');
    const 수납DXF = await DXF();
    await 손가락('.field[data-part="문짝"] .x');
    await 손가락('.field[data-part="고정선반"] .x');
    맞나('수납장 — 지운 열쇠', await 지움(),
      ['문짝@짝:0','문짝@짝:1','고정선반@짝:0','고정선반@짝:1','고정선반@짝:2']);
    맞나('수납장 — 목록', await 목록(), ['문짝', '고정선반']);
    await 더하기('문짝'); await 더하기('고정선반');
    맞나('수납장 — 되살리면 제자리', [await 지움(), await DXF()], [[], 수납DXF]);

    console.log('③④ 서랍장 — 베껴 온 옛 이름은 목록에서 빠지고 담긴 열쇠는 그대로다');
    await 손가락('.field[data-part="문짝"] .x');
    await 손가락('.field[data-part="고정선반"] .x');
    const 벤열쇠 = await 지움();
    await 품목고르기('서랍장');                     // 처음 고르기 — 수납장 한 벌을 베껴 온다
    맞나('서랍장 — 베껴 온 열쇠 그대로', await 지움(), 벤열쇠);
    // 10-05 — 서랍장에는 서랍재 셋이 기본으로 선다(§4.9855). 이 시험이 보는 규칙은 한 자도 안 바뀌었다.
    맞나('서랍장 — 마이다·가로대는 서 있다', await 이름들(),
      ['가로대','뒷판','마이다','상판','서랍바닥','서랍재D','서랍재W','전면밴드','측판','하판']);
    맞나('서랍장 — 목록에 문짝·고정선반이 없다', await 목록(), []);

    console.log('② 서랍장에서 제 것을 지우면 제 이름으로 뜬다  ⑤ 되살리기');
    await p.evaluate(() => { window.__probe.손질().지움 = []; window.__probe.set({}); }); await 잠(500);
    const 서랍DXF = await DXF();
    await 손가락('.field[data-part="문짝"] .x');
    await 손가락('.field[data-part="고정선반"] .x');
    맞나('서랍장 — 지운 열쇠는 제 이름이다', await 지움(),
      ['마이다@짝:0','마이다@짝:1','가로대@짝:0','가로대@짝:1','가로대@짝:2']);
    맞나('서랍장 — 목록', await 목록(), ['마이다', '가로대']);
    await 더하기('마이다'); await 더하기('가로대');
    맞나('서랍장 — 되살리면 제자리', [await 지움(), await DXF()], [[], 서랍DXF]);

    console.log('⑥ 다시 열어도 그대로');
    await p.evaluate(() => { window.__probe.손질().지움 = ['문짝@짝:0','고정선반@짝:0']; window.__probe.set({}); });
    await 잠(500);
    await p.reload({ waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(800);
    맞나('다시 열면 — 품목 · 담긴 열쇠 · 목록', [
      await p.evaluate(() => window.__probe.st().품목), await 지움(), await 목록()],
      ['서랍장', ['문짝@짝:0','고정선반@짝:0'], []]);
    맞나('오류 @' + 폭, 터짐, []);
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

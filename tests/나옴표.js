#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**동작시 서랍측면에 측판 끝으로 부터 몇mm 나오는지 표기해줘 제일 하단서랍 1칸에**」

     ① 「동작」 에서 딱지가 하나 뜬다 — **제일 하단 서랍 한 칸에만**(딱지는 통틀어 하나)
     ② 적히는 값 = **측판 앞끝 ~ 서랍재D 앞면** (외부면 레일길이 그대로 · 내부면 도어 두께만큼 짧다)
     ③ 레일길이를 바꾸면 따라간다 (250 · 400)
     ④ 미닫이를 밀면 따라 는다 (10% · 25% · 100%)
     ⑤ 「분해」·수납장·레일 0 인 얕은 장에서는 **안 뜬다**
     ⑥ 딱지가 **캔버스 안**이고 카메라를 돌리면 **따라간다**
     ⑦ **3D 를 짚는 손가락을 안 가로챈다**(`pointer-events:none`) · 띠·캔버스·문서 높이가 그대로
     ⑧ 서랍재D 를 다 숨기면 접힌다 · **부속서는 한 글자도 안 바뀐다**

   돌리는 법:  node tests/나옴표.js
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
    'rule:()=>규칙,st:()=>state,손질:()=>손질,행:()=>부속행들(buildModel(state)),grp:()=>group,sel:()=>selPid};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 }, hasTouch:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(700);

  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(400); };
  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(320); return true; };
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(600); };
  const 모드 = async v => { await 손가락(`.explode .seg label:has(input[value="${v}"])`); await 잠(250); };
  const 밀기 = async v => { await p.evaluate(x => { const el = document.querySelector('#explode');
    if (!el) return; el.value = x; el.dispatchEvent(new Event('input', { bubbles:true })); }, v); await 잠(420); };
  // ⚠ 고치기 전 판에는 딱지가 **아예 없다** — 널에 견디게 둔다(그러지 않으면 시험이 터져 깨진 수를 못 센다)
  const 딱지 = () => p.evaluate(() => { const e = document.getElementById('outTag'); if (!e) return null;
    const r = e.getBoundingClientRect(), c = document.getElementById('c3d').getBoundingClientRect();
    return { 수:1, 접힘:!!e.hidden, 글:e.hidden ? '' : e.textContent,
      캔버스안: e.hidden ? null : (r.left >= c.left-1 && r.right <= c.right+1 && r.top >= c.top-1 && r.bottom <= c.bottom+1),
      x:+r.left.toFixed(1), y:+r.top.toFixed(1) }; });
  const 글 = async () => { const d = await 딱지(); return d ? (d.접힘 ? '(접힘)' : d.글) : '(없음)'; };

  console.log('① 「동작」 에서 딱지가 하나 · 제일 하단 서랍 한 칸에만');
  await 품목('서랍장');
  await 두기({ doors:4, doorMode:'out', backMode:'cover', W:800, D:400, H:1800 });
  맞나('딱지 노드 수', await p.evaluate(() => document.querySelectorAll('.outtag').length), 1);
  맞나('「분해」 에서는 접힘', await 글(), '(접힘)');
  await 모드('동작'); await 밀기(25);
  const d1 = await 딱지();
  맞나('「동작」 25% 에서 뜬다 · 캔버스 안', d1 ? [d1.접힘, d1.캔버스안] : null, [false, true]);

  console.log('② 값 = 측판 앞끝 ~ 서랍재D 앞면');
  맞나('외부 (레일 400)', await 글(), '400mm');
  await 두기({ doorMode:'in' }); await 밀기(25);
  // 내부는 선반깊이가 382 라 레일이 350 으로 맞춰지고, 도어 두께 18 만큼 짧다
  맞나('내부 (레일 350 − 도어 18)', await 글(), '332mm');
  await 두기({ doorMode:'out' });

  console.log('③ 레일길이를 바꾸면 따라간다');
  await p.evaluate(() => { window.__probe.rule().레일길이 = 250; window.__probe.set({}); }); await 밀기(25);
  맞나('레일 250', await 글(), '250mm');
  await p.evaluate(() => { window.__probe.rule().레일길이 = 0; window.__probe.set({}); }); await 밀기(25);
  맞나('레일 자동(400)', await 글(), '400mm');

  console.log('④ 미닫이를 밀면 따라 는다');
  const 차례 = [];
  for (const v of [0, 10, 25, 100]){ await 밀기(v); 차례.push(await 글()); }
  맞나('0 · 10 · 25 · 100', 차례, ['(접힘)', '160mm', '400mm', '400mm']);

  console.log('⑤ 「분해」·수납장·얕은 장에서는 안 뜬다');
  await 모드('분해'); await 밀기(60); 맞나('분해 60', await 글(), '(접힘)');
  await 모드('동작'); await 밀기(100);
  await 두기({ D:200 }); 맞나('D200 (레일 0)', await 글(), '(접힘)');
  await 두기({ D:400 });
  await 품목('수납장'); await 두기({ doors:2 }); await 밀기(100);
  맞나('수납장', await 글(), '(접힘)');
  await 품목('서랍장'); await 두기({ doors:4 }); await 모드('동작'); await 밀기(25);

  console.log('⑥ 카메라를 돌리면 따라간다');
  const 전자리 = await 딱지();
  const c = await p.locator('#c3d').boundingBox();
  await p.mouse.move(c.x + c.width/2, c.y + c.height/2);
  await p.mouse.down({ button:'middle' });
  await p.mouse.move(c.x + c.width/2 + 180, c.y + c.height/2 + 40, { steps:12 });
  await p.mouse.up({ button:'middle' }); await 잠(900);
  const 후자리 = await 딱지();
  맞나('돌리면 자리가 바뀌고 캔버스 안이다',
    (전자리 && 후자리) ? [전자리.글 === 후자리.글, (전자리.x !== 후자리.x || 전자리.y !== 후자리.y), 후자리.캔버스안] : null,
    [true, true, true]);
  await p.evaluate(() => { const f = [...document.querySelectorAll('.hud .views button')].find(x => /등각/.test(x.textContent)); if (f) f.click(); });
  await 잠(900);

  console.log('⑦ 손가락을 안 가로챈다 · 짜임이 그대로');
  const 가운데 = await p.evaluate(() => { const e = document.getElementById('outTag'); if (!e || e.hidden) return null;
    const r = e.getBoundingClientRect(); const x = r.left + r.width/2, y = r.top + r.height/2;
    const t = document.elementFromPoint(x, y); return [x, y, t ? (t.id || t.tagName) : null]; });
  맞나('딱지 가운데에서 맨 위에 있는 것', 가운데 ? 가운데[2] : null, 'c3d');
  if (가운데){ await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:가운데[0], y:가운데[1] }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(450); }
  맞나('톡 치면 뒤의 부속이 골라진다', await p.evaluate(() => window.__probe.sel() !== null), true);
  맞나('띠 높이 · 캔버스 · 문서 높이', await p.evaluate(() => [
      +document.querySelector('.explode').getBoundingClientRect().height.toFixed(1),
      +document.getElementById('c3d').getBoundingClientRect().width.toFixed(0) + '×' + +document.getElementById('c3d').getBoundingClientRect().height.toFixed(0),
      document.documentElement.scrollHeight, document.documentElement.scrollWidth ]),
    // 10-10 — 3D 칸에 2D 와 같은 머리줄 65 가 붙어 1280 캔버스가 995×831 → **995×766**(§4.9831).
    [38, '995×766', 900, 1280]);

  console.log('⑧ 서랍재D 를 다 숨기면 접힌다 · 부속서 불변');
  const 행전 = await p.evaluate(() => JSON.stringify(window.__probe.행()));
  await p.evaluate(() => { const m = window.__probe.model();
    const 다 = m.parts.filter(x => x.name === '서랍재D');
    다.forEach((q, i) => { if (q.서랍번호 === 0) window.__probe.손질().숨김.push(`서랍재D@짝:${i}`); });
    window.__probe.set({}); });
  await 밀기(25); 맞나('맨 아래 서랍재D 둘을 숨기면', await 글(), '(접힘)');
  맞나('부속서는 그대로', await p.evaluate(() => JSON.stringify(window.__probe.행())) === 행전, true);

  맞나('오류 0', 터짐.length, 0);
  if (터짐.length) console.log(터짐.slice(0, 3).join('\n'));

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

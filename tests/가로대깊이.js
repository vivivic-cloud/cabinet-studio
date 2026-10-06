#!/usr/bin/env node
/* 10-03 사장님 말씀: 「**서랍장의 가로대는 깊이를 입력하는 방식**이고 **선반유격은 필요없는 옵션**이야
   가로대의 깊이 입력시 **입력한 깊이의 가로대가 되어 마이다의 안쪽에 붙는다**」

     ① 수납장은 한 톨도 안 바뀐다 — 고정·이동 두 판에 「선반유격」 그대로
     ② 서랍장 가로대 판은 「깊이」 칸 하나다 — 「선반유격」 이 없다(칸 23px · 줄 25px · step 0.5 · max 800)
     ③ **가로대깊이 0 = 자동** — 네 갈래에서 고치기 전 자리 그대로
     ④ 깊이를 넣으면 **앞면이 마이다 안쪽면**이고 뒤끝 = 앞 + 깊이
        (내부는 틈 **0** · 외부는 **2** = 경첩유격 · §4.93 — 도어가 몸통을 비켜 서는 그 값이다)
     ⑤ 깊이가 **재단 치수·부품표·3D·DXF** 에 다 따라간다
     ⑥ 「선반유격」 은 서랍장 셈에서 **0 으로 본다** — 담긴 값은 안 지운다(수납장에서 그대로 산다)
     ⑦ **진짜 손가락**으로 치고 「저장」 을 눌러야 먹는다(§4.9893)

   돌리는 법:  node tests/가로대깊이.js
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
    'rule:()=>규칙,st:()=>state,grp:()=>group,dxf:()=>buildDXF(buildDrawing(state,buildModel(state)))};' + 못);
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
const f = n => n == null ? null : Math.round(n * 1000) / 1000;

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:375, height:900 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(600);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  // 품목은 드롭다운이다 (§4.9867) — 고르개는 손가락으로 짚고 목록은 selectOption 이다(§7).
  const 품목고르기 = async 품 => { await 손가락('#itemSel');
    await p.selectOption('#itemSel', 품); await 잠(600); };
  const 펴기 = async 부속 => { const 폈나 = await p.evaluate(n => {
      const b = document.querySelector(`.pname[data-opt="${n}"]`); return b && b.getAttribute('aria-expanded') === 'true'; }, 부속);
    if (!폈나) await 손가락(`.pname[data-opt="${부속}"]`); await 잠(350); };

  // 그 판에 선 유격 칸들 — 이름·열쇠·크기
  const 판칸 = 부속 => p.evaluate(n => {
    const o = document.querySelector(`.field[data-part="${n}"] .opt`); if (!o) return null;
    // ⚠ 10-06 엣지설정(§4.9846)이 네 줄을 더했다 — 그 줄에는 `input` 이 없다. **유격 줄만** 본다.
    return [...o.querySelectorAll('.optnum')].filter(d => d.querySelector('input[data-rule],select[data-rule]'))
      .map(d => { const i = d.querySelector('input,select');
      const a = i.getBoundingClientRect(), c = d.getBoundingClientRect();
      return { 이름:d.querySelector('label').textContent, 열쇠:i.dataset.rule, max:i.max, step:i.step,
               칸높이:Math.round(a.height), 줄높이:Math.round(c.height) }; }); }, 부속);
  const 잼 = () => p.evaluate(() => { const m = window.__probe.model();
    const g = m.parts.filter(x => x.name === '가로대'), d = m.parts.filter(x => x.name === '마이다');
    const r = n => n == null ? null : Math.round(n * 1000) / 1000;
    const 안 = d[0] ? r(d[0].y + d[0].d) : null;
    return { 수:g.length, 앞:g[0] ? r(g[0].y) : null, 깊이:g[0] ? r(g[0].d) : null,
             뒤끝:g[0] ? r(g[0].y + g[0].d) : null, 재단W:g[0] ? r(g[0].cut.W) : null,
             마이다안쪽:안, 틈:(g[0] && d[0]) ? r(g[0].y - 안) : null }; });
  const 깊이넣기 = async v => { await p.evaluate(x => { window.__probe.rule().가로대깊이 = x;
    window.__probe.set({}); }, v); await 잠(350); };
  const 설정 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(350); };

  console.log('① 수납장은 한 톨도 안 바뀐다');
  await 펴기('고정선반');
  맞나('고정 선반 판 — 「선반유격」 그대로', await 판칸('고정선반'),
    [{ 이름:'선반유격', 열쇠:'고정선반들임', max:'50', step:'0.5', 칸높이:23, 줄높이:25 }]);
  await 펴기('고정선반');
  await 펴기('이동선반');
  맞나('이동 선반 판 — 「선반유격」 그대로', await 판칸('이동선반'),
    [{ 이름:'선반유격', 열쇠:'이동선반들임', max:'50', step:'0.5', 칸높이:23, 줄높이:25 }]);
  await 펴기('이동선반');
  맞나('수납장 고정선반 자리 (유격 0)', await p.evaluate(() => { const g =
    window.__probe.model().parts.filter(x => x.name === '고정선반');
    return [g.length, g[0].y, g[0].d]; }), [3, 0, 400]);

  console.log('② 서랍장 가로대 판은 「깊이」 칸 하나다');
  await 품목고르기('서랍장');
  await 펴기('고정선반');
  맞나('칸 하나 — 「깊이」 (23px · 줄 25px · 0.5 · 800)', await 판칸('고정선반'),
    [{ 이름:'깊이', 열쇠:'가로대깊이', max:'800', step:'0.5', 칸높이:23, 줄높이:25 }]);
  맞나('「선반유격」 칸은 없다', await p.evaluate(() =>
    !!document.querySelector('.field[data-part="고정선반"] input[data-rule$="선반들임"]')), false);
  맞나('가로 넘침 0', await p.evaluate(() => { const o =
    document.querySelector('.field[data-part="고정선반"] .opt'); return o.scrollWidth - o.clientWidth; }), 0);
  await 펴기('고정선반');

  console.log('③ 가로대깊이 0 = 자동 (고치기 전 자리 그대로)');
  for (const [이름, 설, 바람] of [
      ['외부·덮기',  { doorMode:'out', backMode:'cover'  }, { 수:3, 앞:0,  깊이:400, 뒤끝:400, 재단W:400, 마이다안쪽:-2, 틈:2 }],
      ['내부·덮기',  { doorMode:'in',  backMode:'cover'  }, { 수:3, 앞:18, 깊이:382, 뒤끝:400, 재단W:382, 마이다안쪽:18, 틈:0 }],
      ['외부·끼우기', { doorMode:'out', backMode:'insert' }, { 수:3, 앞:0,  깊이:391, 뒤끝:391, 재단W:391, 마이다안쪽:-2, 틈:2 }],
      ['내부·끼우기', { doorMode:'in',  backMode:'insert' }, { 수:3, 앞:18, 깊이:373, 뒤끝:391, 재단W:373, 마이다안쪽:18, 틈:0 }]]){
    await 설정(설); await 깊이넣기(0);
    맞나('자동 — ' + 이름, await 잼(), 바람);
  }

  console.log('④ 깊이를 넣으면 앞면이 마이다 안쪽면이고 뒤끝 = 앞 + 깊이');
  await 설정({ doorMode:'in', backMode:'cover' });
  for (const v of [50, 100, 250]){ await 깊이넣기(v);
    맞나('내부 · 깊이 ' + v, await 잼(),
      { 수:3, 앞:18, 깊이:v, 뒤끝:18 + v, 재단W:v, 마이다안쪽:18, 틈:0 }); }
  await 설정({ doorMode:'out' });
  for (const v of [50, 100, 250]){ await 깊이넣기(v);
    맞나('외부 · 깊이 ' + v + ' (틈 2 = 경첩유격)', await 잼(),
      { 수:3, 앞:0, 깊이:v, 뒤끝:v, 재단W:v, 마이다안쪽:-2, 틈:2 }); }

  console.log('⑤ 재단 치수·부품표·3D·DXF 가 다 따라간다');
  await 설정({ doorMode:'out', backMode:'cover' });
  await 깊이넣기(0);
  const 자동DXF = await p.evaluate(() => window.__probe.dxf().length);
  const 자동표 = await p.evaluate(() => [...document.querySelectorAll('#bomBody tr')]
    .map(tr => [...tr.children].slice(0,5).map(td => td.textContent).join('|')).filter(x => /가로대/.test(x)));
  await 깊이넣기(100);
  맞나('부품표 (자동 → 100)', [자동표, await p.evaluate(() => [...document.querySelectorAll('#bomBody tr')]
    .map(tr => [...tr.children].slice(0,5).map(td => td.textContent).join('|')).filter(x => /가로대/.test(x)))],
    [['가로대|3|764|400|18'], ['가로대|3|764|100|18']]);
  맞나('3D 열쇠·깊이', await p.evaluate(() => { const g = window.__probe.grp().children
      .filter(o => /^가로대\|/.test((o.userData || {}).key || ''));
    if (!g.length) return null; const m = g[0]; m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox, r = n => Math.round(n * 1000) / 1000;
    return { 열쇠:m.userData.key, 깊이:r(bb.max.z - bb.min.z), 앞:r(bb.max.z + m.userData.base[2]) }; }),
    { 열쇠:'가로대|764|100|18', 깊이:100, 앞:200 });
  맞나('DXF 가 따라간다 (자동과 다르다)', (await p.evaluate(() => window.__probe.dxf().length)) !== 자동DXF, true);

  console.log('⑥ 「선반유격」 은 서랍장 셈에서 0 으로 본다 — 담긴 값은 안 지운다');
  await 깊이넣기(0);
  await p.evaluate(() => { window.__probe.rule().고정선반들임 = 2.5; window.__probe.set({}); }); await 잠(350);
  맞나('서랍장 — 2.5 를 안 먹는다', await 잼(),
    { 수:3, 앞:0, 깊이:400, 뒤끝:400, 재단W:400, 마이다안쪽:-2, 틈:2 });
  맞나('담긴 값은 2.5 그대로', await p.evaluate(() => window.__probe.rule().고정선반들임), 2.5);
  await 품목고르기('수납장');
  await p.evaluate(() => { window.__probe.rule().고정선반들임 = 2.5; window.__probe.set({}); }); await 잠(350);
  맞나('수납장 — 2.5 를 그대로 먹는다', await p.evaluate(() => { const g =
    window.__probe.model().parts.filter(x => x.name === '고정선반');
    return [g.length, g[0].y, g[0].d]; }), [3, 2.5, 397.5]);
  await p.evaluate(() => { window.__probe.rule().고정선반들임 = 0; window.__probe.set({}); }); await 잠(350);

  console.log('⑦ 진짜 손가락 — 치고 「저장」 을 눌러야 먹는다');
  await 품목고르기('서랍장');
  await 펴기('고정선반');
  if (!await p.locator('#r_가로대깊이').count()){
    맞나('「깊이」 칸이 있나', false, true);
  } else {
  await 손가락('#r_가로대깊이');
  await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
  await p.keyboard.type('120'); await 잠(400);
  맞나('친 값이 칸에 들어갔나', await p.evaluate(() => document.querySelector('#r_가로대깊이').value), '120');
  맞나('저장 전에는 안 먹는다', await p.evaluate(() => window.__probe.rule().가로대깊이), 0);
  await 손가락('.field[data-part="고정선반"] .optbtns button.primary');
  맞나('저장하면 먹는다', [await p.evaluate(() => window.__probe.rule().가로대깊이),
    (await 잼()).깊이], [120, 120]);
  }

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

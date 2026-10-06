#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**분해조절에 분해/동작 두가지를 두어 동작선택후 볼륨 조절시 제품이 동작하는 화면이
   나오도록 해주세요 - 서랍장에서의 동작은 서랍(마이다+서랍)이 제일 아래칸 부터 하나씩 나중에는 모든 서랍이
   열려있는 모습으로 가는 동작 입니다. -이때 서랍설정 옵션의 레일길이와 연동되어 서랍의 시작점 부터
   설정된 레일길이 만큼만 동작하는것이 핵심 입니다.**」

     ① 고르개가 미닫이 옆에 있다 — 기본 「분해」 · **보이는 알약이 44px** · 닿는 자리 가로·세로 둘 다 44 이상
        · 둘이 서로의 알약을 안 먹는다 · **진짜 손가락으로 찍어 센 폭도 둘 다 44 이상** · 폰 375 에서 보이고 넘침 0
     ② **열린 거리 = 그 모델의 레일길이**(말씀의 핵심 · 1순위) — 250 · 400 · 550 에서 딱 그 값
     ③ **제일 아래 칸부터 하나씩** 열리고 끝에서 **다 열려 있다**
     ④ 마이다와 서랍이 **붙어서** 같이 나온다 (상대 자리 불변) · 앞(+Z)으로만 간다
     ⑤ **몸통은 한 톨도 안 움직인다**
     ⑥ 「분해」 로 돌리면 예전과 **글자까지 같다** · 미닫이 0 이면 닫혀 있다
     ⑦ **부속서·부품표·DXF 가 한 글자도 안 바뀐다** — 보는 것일 뿐이다
     ⑧ 수납장에서 「동작」 은 **양쪽 도어가 110도 열리는 모습**이다(10-06 사장님 말씀 · §4.9850-도어)
        — 그 전에는 「아무것도 안 움직인다」 였다. **되돌린 것이 아니라 말씀만큼 뒤집어 적은 것이다.**
        몸통은 그대로 안 움직이고, 두 짝이 **좌우 대칭**으로 간다

   돌리는 법:  node tests/서랍동작.js
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
    'rule:()=>규칙,st:()=>state,행:()=>부속행들(buildModel(state)),grp:()=>group,' +
    'dxf:()=>buildDXF(drawing)};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:375, height:874 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(700);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(320); return true; };
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(600); };
  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(400); };
  // 고르개는 **진짜 손가락**으로 누른다 — `.seg label` 이 라디오를 덮고 있다
  const 모드 = async v => { const ok = await 손가락(`.explode .seg label:has(input[value="${v}"])`);
    await 잠(250); return ok; };
  const 밀기 = async v => { await p.evaluate(x => { const el = document.querySelector('#explode');
    if (!el) return; el.value = x; el.dispatchEvent(new Event('input', { bubbles:true })); }, v); await 잠(300); };
  // ⚠ 고치기 전 판에는 고르개가 **아예 없다** — 널에 견디게 둔다(그러지 않으면 시험이 터져 깨진 수를 못 센다)
  const 움직임 = () => p.evaluate(() => { const g = window.__probe.grp(); if (!g) return null;
    const o = {};
    g.children.forEach(c => { const u = c.userData;
      const k = (u.서랍번호 === undefined) ? '몸통' : '서랍' + u.서랍번호;
      (o[k] = o[k] || []).push([+(c.position.x - u.base[0]).toFixed(2),
                                +(c.position.y - u.base[1]).toFixed(2),
                                +(c.position.z - u.base[2]).toFixed(2)].join(',')); });
    const r = {}; Object.keys(o).sort().forEach(k => r[k] = [...new Set(o[k])]);
    return r; });
  // 10-06 — 수납장 도어는 **돈다**. 각도와 「몸통만」 을 따로 잰다(§4.9850-도어).
  const 각도 = () => p.evaluate(() => { const g = window.__probe.grp(); if (!g) return null;
    return g.children.filter(c => c.userData.경첩)
      .sort((a, b) => a.userData.경첩[0] - b.userData.경첩[0])
      .map(c => Math.round(c.rotation.y * 180 / Math.PI)); });
  const 몸통만 = () => p.evaluate(() => { const g = window.__probe.grp(); if (!g) return null;
    return [...new Set(g.children.filter(c => !c.userData.경첩).map(c => {
      const u = c.userData;
      return [+(c.position.x - u.base[0]).toFixed(2), +(c.position.y - u.base[1]).toFixed(2),
              +(c.position.z - u.base[2]).toFixed(2)].join(','); }))]; });
  const 모델값 = () => p.evaluate(() => { const m = window.__probe.model();
    return { 레일:m.레일길이, 칸:m.서랍칸수 }; });

  console.log('① 고르개 — 미닫이 옆 · 기본 「분해」 · 닿는 자리 **가로도** 44px · 폰에서 보인다');
  /* ⚠ `::after` 의 `height` 만 보면 안 된다 — 그것은 **세로**다. `left:0;right:0` 이면 **가로는 글자네모 그대로**(27.55)라
        10-06 에 관리자가 「가로가 17px 모자란다」 고 돌려보냈다(§4.9850-닿는자리).
     ⚠ `elementFromPoint` 네모도 모자랐다 — 그것으로 45×45 였는데 **진짜 손가락으로 찍으니 「동작」 이 41px** 이었다
        (경계에서 크로미움이 손가락을 당긴다 · 10-06 관리자). 그래서 아래 ①-나 에서 **띠 한 줄을 정수 한 점씩 진짜로 찍어**
        골라진 쪽을 센다. 그것이 사장님 손가락이 겪는 그 수다. */
  맞나('고르개 자리·크기·닿는 자리·기본값', await p.evaluate(() => {
    const seg = document.querySelector('.explode .seg'); if (!seg) return null;
    const labs = [...seg.querySelectorAll('label')];
    const 보임 = el => { let n = el; while (n){ if (getComputedStyle(n).display === 'none') return false; n = n.parentElement; } return true; };
    const y = Math.round(labs[0].getBoundingClientRect().top + labs[0].getBoundingClientRect().height / 2);
    const 제것 = (el, x, yy) => { const h = document.elementFromPoint(x, yy); return !!h && el.contains(h); };
    const 찍기 = el => {                                   // 조상은 안 센다 — 제것(또는 그 속)일 때만
      const q = el.getBoundingClientRect();
      const cx = Math.round(q.left + q.width / 2), cy = Math.round(q.top + q.height / 2);
      const 가 = (dx, dy) => { let n = 0; while (n < 300){ const x = cx + dx*(n+1), yy = cy + dy*(n+1);
        if (x < 0 || yy < 0 || x >= innerWidth || yy >= innerHeight) break; if (!제것(el, x, yy)) break; n++; } return n; };
      return [가(-1,0) + 가(1,0) + 1, 가(0,-1) + 가(0,1) + 1]; };
    const 알약밖 = el => { const q = el.getBoundingClientRect(); const 밖 = [];   // 제 알약 안인데 남이 가져간 점
      for (let x = Math.ceil(q.left); x <= Math.floor(q.right); x++) if (!제것(el, x, y)) 밖.push(x); return 밖; };
    const sl = document.querySelector('#explode'), sq = sl.getBoundingClientRect();
    return { 글: labs.map(l => l.textContent.trim()),
      보임: labs.map(l => Math.round(l.getBoundingClientRect().width)),
      닿음: labs.map(l => getComputedStyle(l, '::after').height),
      닿는: labs.map(찍기), 제알약밖: labs.map(알약밖),
      밀대: [Math.round(sq.left*100)/100, Math.round(sq.width*100)/100],
      켜진것: (seg.querySelector('input:checked') || {}).value,
      미닫이옆: !!document.querySelector('.explode #explode'),
      보이나: 보임(seg), 넘침: document.documentElement.scrollWidth }; }),
    { 글:['분해','동작'], 보임:[44,44], 닿음:['44px','44px'], 닿는:[[64,45],[46,45]], 제알약밖:[[],[]],
      밀대:[123, 233], 켜진것:'분해', 미닫이옆:true, 보이나:true, 넘침:375 });

  /* ①-나 **진짜 손가락**으로 띠 한 줄을 정수 한 점씩 찍어 누가 골라지는지 센다(10-06 관리자 조건 1).
        한 점당 모드를 반대로 두고 찍어 바뀌는지 보고, 안 바뀌면 다시 반대로 두고 한 번 더 찍는다.
        밀대는 50 으로 두고 찍어 값이 달라지면 밀대가 가져간 것이다. */
  const 탭폭 = await (async () => {
    const y = await p.evaluate(() => { const r = document.querySelector('.explode').getBoundingClientRect();
      return Math.round(r.top + r.height / 2); });
    const 세팅 = async (m, v) => { await p.evaluate(([m, v]) => {
      const i = [...document.querySelectorAll('.explode .seg.mini label input')].find(x => x.value === m);
      i.checked = true; i.dispatchEvent(new Event('change', { bubbles:true }));
      const s = document.querySelector('#explode'); s.value = String(v);
      s.dispatchEvent(new Event('input', { bubbles:true })); }, [m, v]); await 잠(20); };
    const 읽기 = () => p.evaluate(() => [window.__probe.st().분해모드, Number(document.querySelector('#explode').value)]);
    const 셈 = { 분해:0, 동작:0, 밀대:0, 없음:0 };
    for (let x = 0; x <= 130; x++){
      await 세팅('동작', 50); await p.touchscreen.tap(x, y); await 잠(45);
      let [m, v] = await 읽기();
      if (m === '분해'){ 셈.분해++; continue; }
      if (v !== 50){ 셈.밀대++; continue; }
      await 세팅('분해', 50); await p.touchscreen.tap(x, y); await 잠(45);
      const r = await 읽기();
      if (r[0] === '동작') 셈.동작++; else if (r[1] !== 50) 셈.밀대++; else 셈.없음++;
    }
    await 세팅('분해', 0);
    return 셈; })();
  맞나('진짜 손가락으로 센 폭 — 분해 ' + 탭폭.분해 + ' · 동작 ' + 탭폭.동작 + ' · 밀대 ' + 탭폭.밀대 + ' · 아무것도 ' + 탭폭.없음,
    [탭폭.분해 >= 44, 탭폭.동작 >= 44, 탭폭.없음], [true, true, 0]);

  await 품목('서랍장');
  await 두기({ W:800, D:400, H:1800, doors:4, backMode:'cover', doorMode:'out' });

  console.log('② 열린 거리 = 레일길이 (말씀의 핵심)  ③ 아래 칸부터 하나씩');
  맞나('「동작」 을 손가락으로 고른다', await 모드('동작'), true);
  await 밀기(0);
  맞나('미닫이 0 — 다 닫혀 있다', await 움직임(),
    { 몸통:['0,0,0'], 서랍0:['0,0,0'], 서랍1:['0,0,0'], 서랍2:['0,0,0'], 서랍3:['0,0,0'] });
  맞나('기본 레일 · 칸 수', await 모델값(), { 레일:400, 칸:4 });
  await 밀기(25);
  맞나('동작 25 — 맨 아래만 400 나온다', await 움직임(),
    { 몸통:['0,0,0'], 서랍0:['0,0,400'], 서랍1:['0,0,0'], 서랍2:['0,0,0'], 서랍3:['0,0,0'] });
  await 밀기(50);
  맞나('동작 50 — 아래 둘', await 움직임(),
    { 몸통:['0,0,0'], 서랍0:['0,0,400'], 서랍1:['0,0,400'], 서랍2:['0,0,0'], 서랍3:['0,0,0'] });
  await 밀기(100);
  맞나('동작 100 — 넷 다 열려 있다', await 움직임(),
    { 몸통:['0,0,0'], 서랍0:['0,0,400'], 서랍1:['0,0,400'], 서랍2:['0,0,400'], 서랍3:['0,0,400'] });

  // 레일을 바꾸면 열린 거리가 딱 그 값이다
  const 레일두기 = async v => { await p.evaluate(x => { window.__probe.rule().레일길이 = x; window.__probe.set({}); }, v); await 잠(400); };
  await 레일두기(250); await 밀기(100);
  맞나('레일 250 → 250 만큼만', [(await 모델값()).레일, (await 움직임()).서랍0], [250, ['0,0,250']]);
  await 레일두기(300); await 밀기(100);
  맞나('레일 300 → 300 만큼만', [(await 모델값()).레일, (await 움직임()).서랍3], [300, ['0,0,300']]);
  // 550 은 D400(사용깊이 400)에 안 들어간다 — 깊은 장에서 재야 참값이 나온다
  await 두기({ D:600 }); await 레일두기(550); await 밀기(100);
  맞나('D600 · 레일 550 → 550 만큼만', [(await 모델값()).레일, (await 움직임()).서랍0], [550, ['0,0,550']]);
  await 두기({ D:400 }); await 레일두기(0);

  console.log('④ 마이다와 서랍이 붙어서 같이 나온다  ⑤ 몸통은 안 움직인다');
  await 밀기(100);
  맞나('칸마다 조각이 한 값으로만 움직인다(= 덩어리)', await p.evaluate(() => {
    const g = window.__probe.grp(); const o = {};
    g.children.forEach(c => { const u = c.userData; if (u.서랍번호 === undefined) return;
      (o[u.서랍번호] = o[u.서랍번호] || []).push(c.position.z - u.base[2]); });
    return Object.keys(o).map(k => [...new Set(o[k].map(v => +v.toFixed(3)))].length); }), [1,1,1,1]);
  맞나('앞(+Z)으로만 간다 — x·y 는 0', await p.evaluate(() => {
    const g = window.__probe.grp();
    return g.children.filter(c => c.userData.서랍번호 !== undefined)
      .every(c => Math.abs(c.position.x - c.userData.base[0]) < 1e-9
                && Math.abs(c.position.y - c.userData.base[1]) < 1e-9); }), true);
  맞나('몸통 조각은 하나도 안 움직였다', (await 움직임()).몸통, ['0,0,0']);

  console.log('⑥ 「분해」 로 돌리면 예전 그대로  ⑦ 부속서·부품표·DXF 불변');
  const 내보낸것 = () => p.evaluate(() => ({
    부속서: window.__probe.행().map(r => `${r.name}|${r.qty}|${r.L}|${r.W}|${r.T}`).join('/'),
    부품표: document.querySelector('#bomBody').textContent,
    dxf: window.__probe.dxf().length }));
  const 동작중 = await 내보낸것();
  맞나('「분해」 를 손가락으로 고른다', await 모드('분해'), true);
  await 밀기(0);
  맞나('분해 0 — 다 제자리', await 움직임(),
    { 몸통:['0,0,0'], 서랍0:['0,0,0'], 서랍1:['0,0,0'], 서랍2:['0,0,0'], 서랍3:['0,0,0'] });
  await 밀기(60);
  맞나('분해 60 — 서랍 덩어리는 왼쪽(−X)으로 한 값', await p.evaluate(() => {
    const g = window.__probe.grp(); const v = new Set();
    g.children.forEach(c => { if (c.userData.서랍번호 === undefined) return;
      v.add([+(c.position.x - c.userData.base[0]).toFixed(2),
             +(c.position.y - c.userData.base[1]).toFixed(2),
             +(c.position.z - c.userData.base[2]).toFixed(2)].join(',')); });
    return [...v]; }), ['-1334.4,0,0']);
  await 밀기(0);
  맞나('부속서·부품표·DXF 가 동작 중과 한 글자도 같다', await 내보낸것(), 동작중);

  console.log('⑧ 수납장에서 「동작」 — 양쪽 도어가 110도 열린다 (10-06 사장님 말씀)');
  await 품목('수납장');
  await 두기({ W:800, D:400, H:1800, doors:2 });
  await 모드('동작'); await 밀기(0);
  맞나('수납장 · 동작 0 — 닫혀 있다', await 각도(), [0, 0]);
  await 밀기(100);
  맞나('수납장 · 동작 100 — 두 짝이 ∓110도', await 각도(), [-110, 110]);
  맞나('몸통은 한 톨도 안 움직인다', await 몸통만(), ['0,0,0']);
  await 밀기(50); 맞나('동작 50 — 절반', await 각도(), [-55, 55]);
  await 모드('분해'); await 밀기(60);
  맞나('「분해」 로 돌리면 도어가 곧게 선다', await 각도(), [0, 0]);
  await 밀기(0);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

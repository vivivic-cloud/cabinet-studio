#!/usr/bin/env node
/* 10-05 사장님 말씀(나중 것이 이긴다): 「**서랍장 품목 분해시 서랍과 마이다는 체결이 되어 있는 상태로
   도면의 좌측으로 현재 간격 유지하면서 빠져나오도록**해줘 … 몸통의 분해 모습이 보이고 서랍과 마이다는
   **구조변경없이 현 배가모양 고대로** 몸통에서만 빠져나오는 모양새」

     ① **마이다+서랍이 한 덩어리다** — 넷(마이다·서랍재W·서랍재D·서랍바닥)이 **똑같은 거리**를 간다
     ② 그 덩어리는 **왼쪽(−X)으로**만 간다 — 위아래·앞뒤는 0
     ③ **마이다끼리의 틈**이 분해 전·후로 한 톨도 안 바뀐다
     ④ **서랍과 제 마이다의 상대 자리**가 분해 전·후로 한 톨도 안 바뀐다
     ⑤ 몸통은 **예전 그대로 흩어진다**(측판 · 상판 · 하판 · 뒷판)
     ⑥ 덩어리가 **왼 측판보다 더 나가** 몸통을 빠져나온다 · **몸통 부속과 겹친 길이 0**(50·60·100%)
     ⑦ 마이다 **두 칸·세 칸·네 칸**이 다 같은 모양이다
     ⑧ **부속서에는 셋이 따로 나온다** — 「서랍」 이라는 부속은 어디에도 안 선다(§4.9855)
     ⑨ 수납장은 서랍재가 0장이고 몸통 분해가 그대로다 · 문짝은 예전대로 앞으로 나간다
     ⑩ 2D 에는 분해도가 **없다** — `buildDrawing` 은 `state.explode` 를 한 글자도 안 읽는다

   돌리는 법:  node tests/서랍분해.js
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

const 원글 = () => fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
const 손질 = () => {
  let s = 원글();
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'st:()=>state,grp:()=>group,T:()=>THREE,행:()=>부속행들(buildModel(state))};' + 못);
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
const 서랍재 = ['서랍재W','서랍재D','서랍바닥'];

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
  const 품목고르기 = async 품 => { await 손가락('#itemSel');
    await p.selectOption('#itemSel', 품); await 잠(600); };

  // 분해도를 v 로 두고 조각 자리를 잰다 — 조각 이름은 `userData.key` 의 앞머리다
  const 재기 = v => p.evaluate(v => {
    const sl = document.querySelector('#explode');
    if (sl){ sl.value = String(v); sl.dispatchEvent(new Event('input', { bubbles:true })); }
    const r = n => Math.round(n * 100) / 100, 자리 = {}, dir = {};
    const 이름 = c => String((c.userData || {}).key || '').split('|')[0];
    window.__probe.grp().children.forEach(c => { const n = 이름(c); if (!n) return;
      (자리[n] = 자리[n] || []).push([r(c.position.x), r(c.position.y), r(c.position.z)]);
      if (c.userData.dir) dir[n] = c.userData.dir.join(','); });
    return { 자리, dir };
  }, v);
  const 움직임 = (a, c, n) => (a.자리[n] || []).map((q, i) =>
    Math.round(Math.hypot(c.자리[n][i][0]-q[0], c.자리[n][i][1]-q[1], c.자리[n][i][2]-q[2]) * 100) / 100);
  const 서로거리 = o => { const 점 = [];
    서랍재.forEach(n => (o.자리[n] || []).forEach(q => 점.push(q)));
    const 쟀 = []; for (let i = 0; i < 점.length; i++) for (let j = i+1; j < 점.length; j++)
      쟀.push(Math.round(Math.hypot(점[i][0]-점[j][0], 점[i][1]-점[j][1], 점[i][2]-점[j][2]) * 100) / 100);
    return 쟀; };

  console.log('── 서랍장 — 마이다 2·3·4 칸');
  await 품목고르기('서랍장');
  const r2 = x => Math.round(x * 100) / 100;
  for (const 분할 of [2, 3, 4]){
    await p.evaluate(n => window.__probe.set({ W:800, D:400, H:1800, doors:n, shelves:0, shelvesM:0,
      Tsb:12, backMode:'cover', doorMode:'out' }), 분할);
    await 잠(450);
    const 접힘 = await 재기(0); await 잠(250);
    const 폄 = await 재기(60); await 잠(250);
    const 이동 = n => (접힘.자리[n] || []).map((q, i) =>
      [r2(폄.자리[n][i][0]-q[0]), r2(폄.자리[n][i][1]-q[1]), r2(폄.자리[n][i][2]-q[2])]);
    const 덩이 = ['마이다', ...서랍재].flatMap(n => 이동(n));
    const 한값 = JSON.stringify(덩이[0]);

    // ① 넷이 다 똑같은 거리를 간다 ② 왼쪽으로만
    맞나(`마이다 ${분할}칸 — 덩어리가 다 같은 거리를 가나`, 덩이.every(v => JSON.stringify(v) === 한값), true);
    /* 10-06 사장님 말씀으로 거리가 늘었다 — 「분해된 측판과 겹치지 않도록 서랍부를 더 멀리」(§4.9854-멀리).
       514.08(= 1.7×302.4) → **1334.4**(= 4.4127×302.4). 왼쪽으로만 가는 것은 그대로다. */
    맞나(`마이다 ${분할}칸 — 그 거리 (왼쪽으로만)`, JSON.parse(한값), [-1334.4, 0, 0]);
    맞나(`마이다 ${분할}칸 — 덩어리 조각 수`, 덩이.length, 분할 * 6);

    // ③ 마이다끼리의 틈
    const 마틈 = o => { const m = (o.자리['마이다']||[]).slice().sort((u,v)=>u[1]-v[1]);
      return m.slice(1).map((q,i) => r2(q[1] - m[i][1])); };
    맞나(`마이다 ${분할}칸 — 마이다끼리 틈이 분해 전·후 같나`, 마틈(폄), 마틈(접힘));

    // ④ 서랍과 제 마이다의 상대 자리
    const 상대 = o => (o.자리['마이다']||[]).slice().sort((u,v)=>u[1]-v[1]).map(m => {
      const bs = (o.자리['서랍바닥']||[]).slice().sort((u,v)=>Math.abs(u[1]-m[1])-Math.abs(v[1]-m[1]))[0];
      return bs ? [r2(bs[0]-m[0]), r2(bs[1]-m[1]), r2(bs[2]-m[2])] : null; });
    맞나(`마이다 ${분할}칸 — 서랍↔마이다 상대 자리가 분해 전·후 같나`, 상대(폄), 상대(접힘));

    // ⑤ 몸통은 그대로 흩어진다
    맞나(`마이다 ${분할}칸 — 몸통이 흩어진다 (측판·상판·하판·뒷판)`,
      ['측판','상판','하판','뒷판'].map(n => 이동(n)[0]),
      [[-302.4,0,0], [0,302.4,0], [0,-302.4,0], [0,0,-302.4]]);

    // ⑥ 왼 측판보다 더 나가 몸통을 빠져나온다
    맞나(`마이다 ${분할}칸 — 덩어리가 왼 측판보다 더 나가나`,
      Math.abs(JSON.parse(한값)[0]) > Math.abs(이동('측판')[0][0]), true);

    /* ⑥-나 **왼 측판과 한 톨도 안 겹친다** (10-06 사장님 말씀 · §4.9854-멀리).
       전에는 덩어리가 몸통만큼 넓어 어떤 분해 값에서도 측판이 그 **속**에 박혀 있었다(겹침 18 = 측판 두께). */
    맞나(`마이다 ${분할}칸 — 분해 50·60·100 에서 몸통 부속과 겹친 길이`,
      await p.evaluate(async () => {
        const 잠 = ms => new Promise(r => setTimeout(r, ms));
        const T = window.__probe.T(), 밖 = [];
        for (const v of [50, 60, 100]){
          const s = document.querySelector('#explode'); s.value = String(v);
          s.dispatchEvent(new Event('input', { bubbles:true })); await 잠(80);
          const g = window.__probe.grp(), 것 = [];
          g.children.forEach(c => { const u = c.userData; if (!u || !u.key) return;
            const bb = new T.Box3().setFromObject(c);
            것.push({ 번호:u.서랍번호, x:[bb.min.x, bb.max.x] }); });
          const 서랍 = 것.filter(x => x.번호 !== undefined);
          const 덩 = [Math.min(...서랍.map(x => x.x[0])), Math.max(...서랍.map(x => x.x[1]))];
          let 큰 = 0;
          것.filter(x => x.번호 === undefined).forEach(x =>
            { 큰 = Math.max(큰, Math.min(덩[1], x.x[1]) - Math.max(덩[0], x.x[0])); });
          밖.push(Math.max(0, Math.round(큰 * 10) / 10));
        }
        const s = document.querySelector('#explode'); s.value = '60';
        s.dispatchEvent(new Event('input', { bubbles:true })); await 잠(80);
        return 밖; }), [0, 0, 0]);
  }

  // ⑧ 부속서
  const 표 = await p.evaluate(() => { const m = window.__probe.model();
    return { 줄: window.__probe.행().map(r => r.name).filter(n => /서랍/.test(n)),
             서랍이름: m.parts.filter(x => x.name === '서랍').length }; });
  맞나('부속서에 서랍재 셋이 따로 나온다', 표.줄.sort(), ['서랍바닥','서랍재D','서랍재W']);
  맞나('「서랍」 이라는 부속은 안 선다', 표.서랍이름, 0);

  // ⑥ 수납장
  console.log('── 수납장');
  await 품목고르기('수납장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:2, shelves:3, shelvesM:0,
    backMode:'cover', doorMode:'out' }));
  await 잠(500);
  const 접2 = await 재기(0); await 잠(250);
  const 폄2 = await 재기(60); await 잠(250);
  맞나('수납장에는 서랍재가 없다', 서랍재.map(n => (폄2.자리[n] || []).length), [0,0,0]);
  맞나('수납장 몸통은 흩어진다',
    ['측판','상판','문짝'].map(n => 움직임(접2, 폄2, n).every(v => v > 100)), [true, true, true]);
  맞나('수납장 문짝은 예전대로 앞으로 나간다 (왼쪽이 아니다)',
    (접2.dir['문짝'] || null), '0,0,1.7');

  // ⑦ 2D 에는 분해도가 없다
  맞나('buildDrawing 이 state.explode 를 읽나',
    /function buildDrawing[\s\S]*?\n\}/.exec(원글())[0].includes('explode'), false);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

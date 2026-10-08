#!/usr/bin/env node
/* 10-08 사장님 말씀: 「**도면에 엣지작업 표현 안해주나요?**」
   — 10-07 에 여쭌 세 읽기(§4.9843) 가운데 ㉯ 라는 답이다: **판은 이전설정 그대로, 도면 표현은 살린다.**

     ① **기본(W-0 · D-0)이면 도면에 아무것도 안 나온다** — 굵은 변 0 · 「엣지」 줄 0 · DXF 기준값  (1순위)
     ② W-2 는 **판의 상·하**, D-2 는 **판의 좌·우** 에 굵은 변을 긋는다 (§4.9846 의 엇갈림 그대로)
     ③ **면수 1 은 드러난 쪽**이다 — 측판 D-1 → **우**(바닥이 가려졌다) · 고정선반 W-1 → **상**(앞)
     ④ 정보 칸에 「엣지 상·하 · 1」 이 뜨고 **3D 우측칸에도 같은 줄**이 뜬다
     ⑤ 여덟 갈래 × 모든 부속 W-2·D-2 에서 **A4 밖 0**
     ⑥ **판은 이전설정 그대로다** — 고르개 넷 · 면 알약 0 · 담는 꼴이 `{W,D,필름,RT}`

   돌리는 법:  node tests/엣지도면.js
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
  // ⚠ 고치기 전 판에는 엣지설정이 아예 없다 — 널에 견디게 감싼다(§4.986-모바일 과 같은 자리).
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'sel:()=>selPid,고르기:(n)=>select(n),dxf:()=>buildDXF(drawing),쪽:()=>부속쪽들(모델||buildModel(state)),' +
    '엣지:()=>(typeof 엣지설정!=="undefined"?엣지설정:null),' +
    '재단:(n,l,w)=>(typeof 재단사이즈==="function"?재단사이즈(n,l,w):null)};' + 못);
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
  // 담긴 값을 바로 넣는다 — 판에서 고르는 길은 `tests/엣지설정.js` 가 이미 못 박았다
  const 넣 = async o => { await p.evaluate(x => { const e = window.__probe.엣지(); if (!e) return;
      Object.keys(e).forEach(k => delete e[k]); Object.assign(e, x); window.__probe.set({}); }, o); await 잠(450); };
  const 상태 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(450); };
  // 부속 쪽에서 굵은 변과 정보 줄을 읽는다
  const 읽기 = () => p.evaluate(() => {
    const out = {};
    [...document.querySelectorAll('#pageBox > .page')].slice(1).forEach(pg => {
      const svg = pg.querySelector('svg'); if (!svg) return;
      const ts = [...pg.querySelectorAll('text')];
      let 현 = null;
      ts.forEach((t, i) => { if (t.classList.contains('t1')) 현 = t.textContent;
        if (t.textContent === '엣지' && 현) (out[현] = out[현] || {}).줄 = ts[i+1].textContent; });
      // 굵은 변은 그 부속의 겉면 네모와 견줘 어느 변인지 가린다
      [...pg.querySelectorAll('line.엣지')].forEach(ln => {
        const x1 = +ln.getAttribute('x1'), y1 = +ln.getAttribute('y1'), x2 = +ln.getAttribute('x2'), y2 = +ln.getAttribute('y2');
        let 임 = null, 작 = 1e9;
        ts.filter(t => t.classList.contains('t1')).forEach(t => { const d = Math.abs(t.getBBox().y - y1); if (d < 작){ 작 = d; 임 = t.textContent; } });
        const o = out[임] = out[임] || {};
        (o.변 = o.변 || []).push(Math.abs(y1-y2) < 0.01 ? 'ㅡ' : '|');
      });
    });
    return out;
  });
  const 변수 = () => p.evaluate(() => document.querySelectorAll('#pageBox > .page line.엣지').length);
  const 줄수 = () => p.evaluate(() => [...document.querySelectorAll('#pageBox > .page text')].filter(t => t.textContent === '엣지').length);

  console.log('① 기본(W-0 · D-0)이면 도면에 아무것도 안 나온다');
  { 맞나('담긴 것이 없다', await p.evaluate(() => window.__probe.엣지()), {});
    맞나('굵은 변 0', await 변수(), 0);
    맞나('「엣지」 줄 0', await 줄수(), 0);
    await 상태({ backMode:'insert' });
    맞나('DXF 끼우기 2.7T 기준값', await p.evaluate(() => window.__probe.dxf().length), 109007);
    맞나('굵은 변 0 (끼우기)', await 변수(), 0); }

  console.log('② W-2 는 판의 상·하 · D-2 는 판의 좌·우');
  { await 넣({ 측판:{ W:2, D:0, 필름:1, RT:0.5 } });
    let r = await 읽기();
    맞나('측판 W-2 → 가로 두 줄', (r['측판'] || {}).변, ['ㅡ','ㅡ']);
    맞나('측판 정보 줄', (r['측판'] || {}).줄, '상·하 · 1');
    await 넣({ 측판:{ W:0, D:2, 필름:1, RT:0.5 } });
    r = await 읽기();
    맞나('측판 D-2 → 세로 두 줄', (r['측판'] || {}).변, ['|','|']);
    맞나('측판 정보 줄', (r['측판'] || {}).줄, '좌·우 · 1');
    await 넣({ 측판:{ W:2, D:2, 필름:1, RT:0.5 } });
    r = await 읽기();
    맞나('측판 W-2·D-2 → 네 줄', ((r['측판'] || {}).변 || []).length, 4);
    맞나('측판 정보 줄', (r['측판'] || {}).줄, '상·하·좌·우 · 1'); }

  console.log('③ 면수 1 은 드러난 쪽이다');
  { await 넣({ 측판:{ W:1, D:1, 필름:1, RT:0.5 }, 고정선반:{ W:1, D:1, 필름:1, RT:0.5 } });
    let r = await 읽기();
    맞나('측판 — 바닥이 가려져 위를 고른다', (r['측판'] || {}).줄, '상·우 · 1');
    맞나('고정선반 — 앞을 고른다', (r['고정선반'] || {}).줄, '상·좌 · 1');
    맞나('측판 굵은 변 둘', ((r['측판'] || {}).변 || []).length, 2);
    await 상태({ doorMode:'in' });
    r = await 읽기();
    맞나('인도어에서도 측판은 상·우', (r['측판'] || {}).줄, '상·우 · 1');
    await 상태({ doorMode:'out' }); }

  console.log('④ 정보 칸 줄이 3D 우측칸에도 같이 뜬다');
  { await 넣({ 고정선반:{ W:1, D:0, 필름:1, RT:0.5 } });
    맞나('2D 부속 쪽', ((await 읽기())['고정선반'] || {}).줄, '상 · 1');
    // 3D 우측칸은 같은 `부속정보줄()` 한 자리를 쓴다(§4.9847) — 고르면 같은 글이 나와야 한다
    const 삼디 = await p.evaluate(() => {
      const m = window.__probe.model();
      const i = m.parts.findIndex(q => q.name === '고정선반');
      if (i < 0) return null; window.__probe.고르기(i);
      const el = document.querySelector('#partInfo'); if (!el || el.hidden) return null;
      const 줄 = [...el.querySelectorAll('.pirow')].map(d => [d.querySelector('span').textContent, d.querySelector('b').textContent]);
      const e = 줄.find(x => x[0] === '엣지'); return e ? e[1] : null; });
    맞나('3D 우측칸', 삼디, '상 · 1'); }

  console.log('⑤ 여덟 갈래 × 모든 부속 W-2·D-2 에서 A4 밖 0');
  { const 켬 = {}; ['측판','상판','하판','고정선반','이동선반','문짝','뒷판','전면밴드','보호대','밴드','마이다','가로대']
      .forEach(n => 켬[n] = { W:2, D:2, 필름:2, RT:0.5 });
    await 넣(켬);
    const 갈래 = [['기본',{backMode:'cover',topStyle:'inset',doorMode:'out',W:800,D:400,H:1800,shelvesM:0,TB:2.7}],
      ['끼우기·측판위',{backMode:'insert',topStyle:'overlay'}], ['끼우기·이동2',{backMode:'insert',shelvesM:2}],
      ['뒷판25T',{backMode:'insert',TB:25}], ['작은장',{W:300,D:200,H:300}], ['큰장',{W:2400,D:800,H:2400}],
      ['인도어',{doorMode:'in'}], ['서랍장',{품목:'서랍장',doors:4}]];
    const 밖들 = [];
    for (const [nm, st] of 갈래){
      await 상태(st);
      밖들.push(await p.evaluate(() => { let 밖 = 0;
        [...document.querySelectorAll('#pageBox > .page')].slice(1).forEach(pg => {
          const svg = pg.querySelector('svg'); if (!svg) return;
          svg.querySelectorAll('line,rect,text').forEach(el => { let bb; try { bb = el.getBBox(); } catch(e){ return; }
            if (bb.width === 0 && bb.height === 0 && el.tagName !== 'text') return;
            if (bb.x < -0.5 || bb.y < -0.5 || bb.x + bb.width > 210.5 || bb.y + bb.height > 297.5) 밖++; }); });
        return 밖; }));
    }
    맞나('여덟 갈래 A4 밖', 밖들, [0,0,0,0,0,0,0,0]);
    맞나('굵은 변이 그려지고 있다', (await 변수()) > 0, true); }

  console.log('⑥ 판은 이전설정 그대로다');
  { await 상태({ 품목:'수납장', backMode:'cover', topStyle:'inset', doorMode:'out', W:800, D:400, H:1800, shelvesM:0, TB:2.7 });
    await 넣({});
    await 손가락('.pname[data-opt="측판"]');
    const r = await p.evaluate(() => { const el = document.querySelector('.opt[data-opt="측판"]');
      return { 고르개: el.querySelectorAll('select[data-edge]').length,
               알약: el.querySelectorAll('[data-edgef]').length,
               이름: [...el.querySelectorAll('select[data-edge]')].map(q => q.dataset.edge) }; });
    맞나('고르개 넷', r.고르개, 4);
    맞나('면 알약 0', r.알약, 0);
    맞나('고르개 이름', r.이름, ['측판|W','측판|D','측판|필름','측판|RT']);
    맞나('가로 넘침', await p.evaluate(() => document.documentElement.scrollWidth), 375); }

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

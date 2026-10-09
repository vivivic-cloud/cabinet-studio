#!/usr/bin/env node
/* 10-08 사장님 말씀 둘: 「**도면에 엣지작업 표현 안해주나요?**」 ·
   「엣지설정은 이전설정으로 되돌려 라는 말은 … **접촉에 따른 자동 설정은 건들면 안되는거지**」 ·
   「**도면이라함은 2D 3D 모두 포함이야 모두 표현되게 해줘**」

     ① **기본세팅은 3D 접촉이 낸다** — 사장님 보기 넷(문짝 2,2 · 상판 2,2 · 측판 2,0 · 고정선반 1,0)  (1순위)
     ② W-2 는 **판의 상·하**, D-2 는 **판의 좌·우** 에 굵은 변을 긋는다 (§4.9846 의 엇갈림 그대로)
     ③ **면수 1 은 드러난 쪽**이다 — 측판 D-1 → **우**(바닥이 가려졌다) · 고정선반 W-1 → **상**(앞)
     ④ 정보 칸에 「엣지 상·하 · 1」 이 뜨고 **3D 우측칸에도 같은 줄**이 뜬다
     ⑤ 여덟 갈래 × 모든 부속 W-2·D-2 에서 **A4 밖 0**
     ⑥ **판은 이전설정 그대로다** — 고르개 넷 · 면 알약 0 · 담는 꼴이 `{W,D,필름,RT}`
     ⑦ **3D 에도 엣지가 보인다** — 엣지가 붙는 좁은 면을 덮고, 짚기를 안 뺏는다
     ⑧ **그 면 색은 그 부속 색 그대로이고 반투명이다** (10-09 사장님 말씀 · 부속마다 다른 색)
     ⑨ **필름과 자재 사이에 경계선이 있다** (10-09 사장님 말씀 · 각도에 따라 안 보이던 것)

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
    '엣지값:(n)=>(typeof 엣지==="function"?엣지(n):null),변:(n)=>(typeof 엣지변==="function"?엣지변(n):[]),' +
    '본:(n)=>(typeof 본이름==="function"?본이름(n):n),행:()=>부속행들(모델||buildModel(state)),grp:()=>group,' +
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
        // ⚠ 이름표는 그림 **위**에 있다 — 그냥 가까운 것을 집으면 아랫 칸의 변이 윗 이름에 붙는다
        let 임 = null, 작 = 1e9;
        // ⚠ `getBBox().y` 는 이 글꼴에서 0 으로 나온다 — `y` 속성을 읽어야 한다(한 번 헛짚었다)
        ts.filter(t => t.classList.contains('t1')).forEach(t => { const ty = +t.getAttribute('y');
          if (ty > y1 + 0.5) return; const d = y1 - ty; if (d < 작){ 작 = d; 임 = t.textContent; } });
        const o = out[임] = out[임] || {};
        (o.변 = o.변 || []).push(Math.abs(y1-y2) < 0.01 ? 'ㅡ' : '|');
      });
    });
    return out;
  });
  const 변수 = () => p.evaluate(() => document.querySelectorAll('#pageBox > .page line.엣지').length);
  const 줄수 = () => p.evaluate(() => [...document.querySelectorAll('#pageBox > .page text')].filter(t => t.textContent === '엣지').length);

  console.log('① 기본세팅은 3D 접촉이 낸다 — 사장님 보기 넷');
  { 맞나('담긴 것이 없다', await p.evaluate(() => window.__probe.엣지()), {});
    await 상태({ backMode:'insert', topStyle:'overlay', shelvesM:2 });
    const 보기 = await p.evaluate(() => { const P = window.__probe, o = {};
      ['문짝','상판','측판','고정선반','이동선반','전면밴드','뒷판'].forEach(n => {
        const e = P.엣지값(n); o[n] = e ? [e.W, e.D] : null; }); return o; });
    맞나('문짝 2,2', 보기['문짝'], [2,2]);
    맞나('상판 2,2', 보기['상판'], [2,2]);
    맞나('측판 2,0', 보기['측판'], [2,0]);
    맞나('고정선반 1,0', 보기['고정선반'], [1,0]);
    맞나('이동선반 1,0', 보기['이동선반'], [1,0]);
    맞나('전면밴드 0,0', 보기['전면밴드'], [0,0]);
    맞나('뒷판(홈에 묻힘) 0,0', 보기['뒷판'], [0,0]);
    맞나('뒷판 2.7T 은 RT없음', await p.evaluate(() => window.__probe.엣지값('뒷판').RT), 0);
    // ⚠ 기본세팅이 켜져도 **DXF 는 한 바이트도 안 움직인다** — 엣지는 부속 쪽·3D 것이다
    await 상태({ topStyle:'inset', shelvesM:0 });
    // 10-09 부터 한글이 CP949 바이트라 **글자수 ≠ 바이트**다 — 바이트 네 기준값은 `tests/디엑스에프한글.js` 가 못 박는다
    맞나('DXF 끼우기 2.7T 글자수', await p.evaluate(() => window.__probe.dxf().length), 108112);
    await 상태({ backMode:'cover' });
    맞나('DXF 덮기 2.7T 글자수', await p.evaluate(() => window.__probe.dxf().length), 70745);
    맞나('굵은 변이 그려진다', (await 변수()) > 0, true);
    맞나('「엣지」 줄이 뜬다', (await 줄수()) > 0, true); }

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

  console.log('⑦ 3D 에도 엣지가 보인다 (10-08 사장님 말씀 「도면이라함은 2D 3D 모두 포함」)');
  { await 상태({ 품목:'수납장', backMode:'insert', topStyle:'overlay', doorMode:'out', W:800, D:400, H:1800, shelvesM:2, TB:2.7, doors:0 });
    const r = await p.evaluate(() => {
      const P = window.__probe, g = P.grp(); if (!g) return null;
      const 살 = {}, 꼴 = {};
      g.children.forEach(m => { const n = m.userData.key.split('|')[0];
        const sk = m.children.filter(c => c.isMesh);
        살[n] = (살[n] || 0) + sk.length;
        if (sk.length && !꼴[n]) 꼴[n] = { 색: sk[0].material.color.getHexString(),
          몸: m.material.color.getHexString(),
          비침: `${sk[0].material.transparent}/${sk[0].material.opacity}`,
          짚기끔: sk[0].raycast.toString().length < 30 }; });
      return { 살, 꼴 }; });
    맞나('측판 — 상·하 × 두 장', (r.살 || {})['측판'], 4);
    맞나('상판 — 네 면', (r.살 || {})['상판'], 4);
    맞나('고정선반 — 앞 한 면 × 세 장', (r.살 || {})['고정선반'], 3);
    맞나('이동선반 — 앞 한 면 × 두 장', (r.살 || {})['이동선반'], 2);
    맞나('뒷판 — 홈에 묻혀 0', (r.살 || {})['뒷판'], 0);
    맞나('전면밴드 — 0', (r.살 || {})['전면밴드'], 0);
    맞나('짚기를 안 뺏는다', ((r.꼴 || {})['측판'] || {}).짚기끔, true);
    // ⑧ 10-09 사장님 말씀 — 「3d의 엣지 작업표현 색상을 **도면의 부속의 색상과 같은 색상의 반투명**으로」
    맞나('살 색 = 그 부속 색 (다섯 부속 다)',
      Object.keys(r.꼴 || {}).map(n => `${n} ${r.꼴[n].색}/${r.꼴[n].몸}`).filter(x => {
        const [, a, bb] = x.match(/ (\w+)\/(\w+)$/); return a !== bb; }), []);
    맞나('측판 살 색', ((r.꼴 || {})['측판'] || {}).색, 'd9b98a');
    맞나('반투명', ((r.꼴 || {})['측판'] || {}).비침, 'true/0.45');
    맞나('이동선반도 같은 값 (§4.9883)', ((r.꼴 || {})['이동선반'] || {}).비침, 'true/0.45');
    // 고르면 그 부속의 엣지 살도 같이 붉어진다 — 반만 붉으면 고른 것으로 안 보인다(§4.11)
    // ⚠ 고치기 전 판에는 살이 아예 없다 — 널에 견디게 감싼다(§4.986-모바일 과 같은 자리)
    const 고 = await p.evaluate(() => { const P = window.__probe, g = P.grp();
      const m = g && g.children.find(c => c.userData.key.startsWith('측판') && c.children.filter(x => x.isMesh).length);
      if (!m) return { 몸:null, 살:null, 남의살:null, 남의몸:null };
      P.고르기(m.userData.pid);
      const 남 = g.children.find(c => c.userData.pid !== m.userData.pid && c.children.filter(x => x.isMesh).length);
      return { 몸: m.material.color.getHexString(),
               살: m.children.filter(x => x.isMesh).map(x => x.material.color.getHexString())[0],
               남의살: 남 ? 남.children.filter(x => x.isMesh)[0].material.color.getHexString() : null,
               남의몸: 남 ? 남.material.color.getHexString() : null }; });
    맞나('고른 몸이 붉다', 고.몸, 'f2654e');
    맞나('고른 살도 붉다', 고.살 !== 'd9b98a', true);
    맞나('남의 살은 제 부속 색 그대로', 고.남의살, 고.남의몸);
    // 뒷판 얇은 두께는 3D 에도 살이 없다
    const 뒷 = [];
    for (const t of [2.7, 9, 12, 18, 25]){ await 상태({ TB:t });
      뒷.push(await p.evaluate(() => { const g = window.__probe.grp();
        return g.children.filter(c => c.userData.key.startsWith('뒷판'))
          .reduce((a, c) => a + c.children.filter(x => x.isMesh).length, 0); })); }
    맞나('뒷판 2.7·9·12·18·25T 다 0 (홈에 묻힘)', 뒷, [0,0,0,0,0]);
    // 부속마다 색이 갈린다 — 문짝은 제 색(E4CBA2)이라 몸통(D9B98A)과 다르다
    await 상태({ TB:2.7, doors:2 });
    const 문 = await p.evaluate(() => { const g = window.__probe.grp(), o = {};
      g.children.forEach(m => { const n = m.userData.key.split('|')[0], sk = m.children.filter(c => c.isMesh);
        if (sk.length && !o[n]) o[n] = `${sk[0].material.color.getHexString()}/${m.material.color.getHexString()}`; });
      return o; });
    맞나('문짝 살 색 = 문짝 색', 문['문짝'], 'e4cba2/e4cba2');
    맞나('측판 살 색 = 측판 색', 문['측판'], 'd9b98a/d9b98a'); }

  console.log('⑨ 필름과 자재 사이 경계선 (10-09 사장님 말씀)');
  { await 상태({ 품목:'수납장', backMode:'insert', topStyle:'overlay', doorMode:'out', W:800, D:400, H:1800, shelvesM:2, TB:2.7, doors:0 });
    const r = await p.evaluate(() => { const g = window.__probe.grp(); if (!g) return null;
      let 살 = 0, 선 = 0, 색 = new Set(), 삼각 = 0;
      const 셈 = q => q.index ? q.index.count/3 : q.attributes.position.count/3;
      g.children.forEach(m => { 삼각 += 셈(m.geometry);
        m.children.forEach(c => { if (!c.isMesh) return; 살++; 삼각 += 셈(c.geometry);
          c.children.forEach(x => { if (x.isLineSegments){ 선++; 색.add(x.material.color.getHexString()); } }); }); });
      return { 살, 선, 색:[...색], 삼각 }; });
    맞나('엣지 살마다 경계선 하나', [(r||{}).살, (r||{}).선], [15, 15]);
    맞나('선 색은 집 모서리선 그대로', (r||{}).색, ['4e3a24']);
    맞나('삼각은 안 는다 (선은 삼각이 아니다)', (r||{}).삼각, 376);
    // 고르면 그 부속의 경계선도 같이 붉어진다 — 한 부속 안의 선이 둘로 갈리면 안 된다(§4.11)
    const 고 = await p.evaluate(() => { const P = window.__probe, g = P.grp();
      const m = g && g.children.find(c => c.userData.key.startsWith('측판') && c.children.filter(x => x.isMesh).length);
      if (!m) return { 선:null, 남:null };
      P.고르기(m.userData.pid);
      const 남 = g.children.find(c => c.userData.pid !== m.userData.pid && c.children.filter(x => x.isMesh).length);
      const 뽑 = q => q.children.filter(x => x.isMesh)[0].children.filter(x => x.isLineSegments)
        .map(x => x.material.color.getHexString())[0] || null;
      return { 선: 뽑(m), 남: 남 ? 뽑(남) : null }; });
    맞나('고른 부속의 경계선은 붉다', 고.선, 'ff3b30');
    맞나('남의 경계선은 그대로', 고.남, '4e3a24'); }

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

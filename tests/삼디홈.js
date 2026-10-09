#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**3d에는 안보여**」 — 뒷판 끼우기의 홈 가공이 2D·부품표·DXF 에는 다 들어갔는데
   3D 만 민짜 상자였다. **선을 긋는 것이 아니라 진짜로 판다**(`THREE.Shape` + `ExtrudeGeometry`).

     ① 덮기는 예전과 글자 하나까지 같다 (조각 수 · 꼭지점 수 · 겉 치수)
     ② 끼우기면 **측판 둘 · 상판 · 하판 넷**에만 홈이 파인다 (나머지는 그대로)
     ③ **겉 치수가 한 톨도 안 변한다** — 홈은 안으로 파는 것이다
     ④ **왼·오른 측판이 둘 다 몸통 안쪽**으로 파인다 · 상판은 아랫면 · 하판은 윗면
     ⑤ 홈 자리가 **2D 와 같다** — 뒤 끝에서 5.5 · 폭 3.5 · 깊이 6
     ⑥ 뒷판 9T 면 홈이 따라 넓어진다(폭 9.8) — ~~판 뒤로 **뚫려 나간다**~~
        **10-09 에 뒤집어 적었다**(지우지 않았다) — 그 뒤 끝은 **엣지가 지나가는 면**이라 이제 필름이 덮는다(⑧)
     ⑦ 고르면 빛나고 · 이동선반은 그대로 비치고 · 모서리선이 그대로고 · 펼치기가 돈다
     ⑧ **엣지가 지나가는 면에서는 홈이 필름에 덮여 안 드러난다** · 없는 면은 그대로 드러난다 (10-09 사장님 말씀)

   돌리는 법:  node tests/삼디홈.js
   **진짜로 띄우는 시험이라 three.min.js 사본이 있어야 한다**(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
    'st:()=>state,rule:()=>규칙,grp:()=>group,변:(n)=>엣지변(n),엣지값:(n)=>엣지(n),' +
    '엣지넣기:(o)=>{엣지설정=o;update();}};' + 못);
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
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(900);

  // 조각마다 — 이름 · 꼭지점 수 · 겉 치수(세계 좌표의 네모)
  const 꼴 = (뒤, TB = 2.7, 더 = {}) => p.evaluate(v => {
    window.__probe.set(Object.assign({ backMode:v.뒤, TB:v.TB, doors:0, shelves:1, shelvesM:0 }, v.더));
    const g = window.__probe.grp(), m = window.__probe.model(), out = [];
    g.children.forEach(c => {
      const bb = new THREE.Box3().setFromObject(c), q = m.parts[c.userData.pid];
      out.push([c.userData.key.split('|')[0] + (q.name === '측판' ? (q.dir[0] < 0 ? '(왼)' : '(오른)') : ''),
        c.geometry.attributes.position.count,
        [+(bb.max.x-bb.min.x).toFixed(2), +(bb.max.y-bb.min.y).toFixed(2), +(bb.max.z-bb.min.z).toFixed(2)].join('×')]);
    });
    return out.sort();
  }, { 뒤, TB, 더 });

  console.log('① 덮기는 예전 그대로 — 민짜 상자(꼭지점 24)');
  { const r = await 꼴('cover');
    맞나('조각 수', r.length, 7);
    맞나('꼭지점이 다 24', [...new Set(r.map(x => x[1]))], [24]);
    맞나('겉 치수', r.map(x => x[0] + ' ' + x[2]).sort(),
      ['고정선반 764×18×400', '뒷판 796×1716×2.7', '상판 764×18×400', '전면밴드 764×80×18',
       '측판(오른) 18×1800×400', '측판(왼) 18×1800×400', '하판 764×18×400'].sort()); }

  console.log('②③ 끼우기 — 넷에만 홈이 파이고 겉 치수는 한 톨도 안 변한다');
  { const r = await 꼴('insert');
    const 꼭 = {}; r.forEach(([n, v, s]) => 꼭[n] = [v, s]);
    /* 10-09 — 측판의 D면(위·아래) 가운데 **위만 엣지**라(아래는 바닥) 그 끝에 덮개가 하나 붙는다(+36).
       상판·하판은 D면이 측판에 맞닿아 엣지가 없으므로 84 그대로다. 전에는 넷 다 84 였다. */
    맞나('홈 파는 넷 — 꼭지점이 늘었다', ['측판(왼)','측판(오른)','상판','하판'].map(n => 꼭[n][0]), [120, 120, 84, 84]);
    맞나('나머지는 24 그대로', ['고정선반','전면밴드','뒷판'].map(n => 꼭[n][0]), [24, 24, 24]);
    맞나('겉 치수 — 측판·상판·하판', ['측판(왼)','측판(오른)','상판','하판'].map(n => 꼭[n][1]),
      ['18×1800×400', '18×1800×400', '764×18×400', '764×18×400']); }

  console.log('④⑤ 어느 면에 · 어디에 파였나 (꼭지점을 모델 좌표로 되돌려 잰다)');
  { const r = await p.evaluate(() => {
      const g = window.__probe.grp(), m = window.__probe.model(), out = {};
      g.children.forEach(c => { const 이름 = c.userData.key.split('|')[0];
        if (!['측판','상판','하판'].includes(이름)) return;
        const q = m.parts[c.userData.pid], pos = c.geometry.attributes.position;
        const X = new Set(), Y = new Set(), Z = new Set();
        for (let i = 0; i < pos.count; i++){
          X.add(+pos.getX(i).toFixed(3)); Y.add(+pos.getY(i).toFixed(3)); Z.add(+pos.getZ(i).toFixed(3)); }
        const k = 이름 + (이름 === '측판' ? (q.dir[0] < 0 ? '(왼)' : '(오른)') : '');
        out[k] = { X:[...X].sort((a,b)=>a-b), Y:[...Y].sort((a,b)=>a-b),
                   모델y:[...Z].map(t => +((q.y + q.d/2) - t).toFixed(2)).sort((a,b)=>a-b) };
      });
      return out; });
    // 왼 측판은 +X(= 몸통 안쪽) 면에, 오른 측판은 −X(= 몸통 안쪽) 면에 깊이 6 만큼
    맞나('측판(왼) — 안쪽면(+9)에서 6 만큼', r['측판(왼)'].X, [-9, 3, 9]);
    맞나('측판(오른) — 안쪽면(−9)에서 6 만큼', r['측판(오른)'].X, [-9, -3, 9]);
    맞나('상판 — 아랫면(−9)에서 6 만큼', r['상판'].Y, [-9, -3, 9]);
    맞나('하판 — 윗면(+9)에서 6 만큼', r['하판'].Y, [-9, 3, 9]);
    맞나('홈 자리 — 넷 다 같다 (앞 391 · 뒤 394.5)',
      ['측판(왼)','측판(오른)','상판','하판'].map(n => r[n].모델y.join(',')),
      ['0,391,394.5,400', '0,391,394.5,400', '0,391,394.5,400', '0,391,394.5,400']);
    맞나('2D 와 같은 값인가 — 뒤 끝에서 · 폭 · 깊이', await p.evaluate(() => { const m = window.__probe.model();
      return [+m.홈.뒤살.toFixed(2), m.홈.폭, m.홈.깊이, m.홈.앞, m.홈.뒤]; }), [5.5, 3.5, 6, 391, 394.5]); }

  console.log('⑥ 뒷판 9T — 홈이 따라 넓어진다 (뒤 끝은 엣지가 지나가므로 1mm 앞에서 멈춘다 · 10-09)');
  { await 꼴('insert', 9);
    맞나('홈 폭 9.8 · 뒤 400.8 (판 뒤끝 400 을 넘는다)', await p.evaluate(() => { const m = window.__probe.model();
      return [+m.홈.폭.toFixed(2), +m.홈.뒤.toFixed(2)]; }), [9.8, 400.8]);
    /* 10-09 에 뒤집어 적었다 — 전에는 `[0, 391, 400]`(판 뒤끝까지 뚫렸다)이었다.
       뒤 끝은 상판의 W면 '하' 라 **엣지가 지나간다** → 홈이 필름 두께(1) 만큼 물러나 **399** 에서 멈춘다. */
    맞나('홈 뒤끝이 필름 앞에서 멈춘다 (391 ~ 399 · 판 뒤끝은 400)', await p.evaluate(() => {
      const g = window.__probe.grp(), m = window.__probe.model();
      const c = g.children.find(x => x.userData.key.split('|')[0] === '상판');
      const q = m.parts[c.userData.pid], pos = c.geometry.attributes.position, Z = new Set();
      for (let i = 0; i < pos.count; i++) Z.add(+((q.y + q.d/2) - pos.getZ(i)).toFixed(2));
      return [...Z].sort((a,b)=>a-b); }), [0, 391, 399, 400]);
    맞나('겉 치수는 그대로', await p.evaluate(() => {
      const g = window.__probe.grp();
      const c = g.children.find(x => x.userData.key.split('|')[0] === '상판');
      const bb = new THREE.Box3().setFromObject(c);
      return [+(bb.max.x-bb.min.x).toFixed(2), +(bb.max.y-bb.min.y).toFixed(2), +(bb.max.z-bb.min.z).toFixed(2)]; }),
      [764, 18, 400]); }

  console.log('⑦ 이미 있던 것이 그대로 돈다');
  { await p.evaluate(() => window.__probe.set({ backMode:'insert', TB:2.7, shelves:2, shelvesM:2, doors:0 }));
    await 잠(400);
    맞나('이동선반만 비친다 (0.45)', await p.evaluate(() => { const g = window.__probe.grp();
      return g.children.filter(c => c.material.transparent)
        .map(c => [c.userData.key.split('|')[0], c.material.opacity]); }),
      [['이동선반', 0.45], ['이동선반', 0.45]]);
    맞나('모서리선 — 색·불투명 그대로', await p.evaluate(() => { const g = window.__probe.grp();
      return [[...new Set(g.children.map(c => '#' + c.children[0].material.color.getHexString()))],
              [...new Set(g.children.map(c => c.children[0].material.transparent))]]; }),
      [['#4e3a24'], [false]]);
    // **진짜 손가락**으로 3D 를 톡 쳐서 고른다 — `.hud` 밑(세로 0.78)을 쳐야 도구줄이 안 받는다(§4.11)
    { const cdp = await ctx.newCDPSession(p);
      const cv = await p.$('.view3d canvas'); await cv.scrollIntoViewIfNeeded(); await 잠(300);
      const r = await cv.boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart',
        touchPoints:[{ x:r.x + r.width*0.5, y:r.y + r.height*0.78 }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(600);
      맞나('고르면 꽉 찬 빨강 · 붉은 모서리선', await p.evaluate(() => { const g = window.__probe.grp();
        const s = g.children.filter(c => c.material.color.getHexString() === 'f2654e');
        return s.map(c => [c.userData.key.split('|')[0], c.material.transparent,
          '#' + c.children[0].material.color.getHexString()]); }),
        [['하판', false, '#ff3b30']]); }
    맞나('펼치기가 돈다', await p.evaluate(() => { const g = window.__probe.grp();
      const 전 = g.children.map(c => c.position.x.toFixed(1)).join(',');
      window.__probe.set({ explode:1 });
      const 후 = g.children.map(c => c.position.x.toFixed(1)).join(',');
      window.__probe.set({ explode:0 }); return 전 !== 후; }), true); }

  /* ⑧ 10-09 사장님 말씀 — 「엣지작업이 없다면 홈이 보여야 하지만 **엣지작업이 이 자리를 지나간다면
     이홈은 엣지필름으로 가려 졌음**을 표현해 주어야 합니다」. 홈 단면이 드러나는 면이 엣지면이면 덮인다. */
  console.log('⑧ 엣지가 지나가는 면에서는 홈이 필름에 덮인다 (10-09 사장님 말씀)');
  { // 그 면에 홈 단면이 드러났나 — 그 면 위의 꼭지점 가운데 **판 두께 안쪽**에 있는 것을 센다
    const 홈입 = (이름, 왼) => p.evaluate(v => {
      const g = window.__probe.grp(), m = window.__probe.model(), 면 = {};
      const c = g.children.find(x => { const q = m.parts[x.userData.pid];
        return q.name === v.이름 && (v.왼 === undefined || (q.dir[0] < 0) === v.왼); });
      if (!c) return null;
      const pos = c.geometry.attributes.position; c.geometry.computeBoundingBox();
      const bb = c.geometry.boundingBox, ax = ['x','y','z'];
      const sz = [bb.max.x-bb.min.x, bb.max.y-bb.min.y, bb.max.z-bb.min.z];
      const 두 = sz.indexOf(Math.min.apply(null, sz));
      [0,1,2].forEach(i => { if (i === 두) return;
        [0,1].forEach(끝 => { const pl = 끝 ? bb.max[ax[i]] : bb.min[ax[i]]; let n = 0;
          for (let k = 0; k < pos.count; k++){ if (Math.abs(pos.array[k*3+i] - pl) > 1e-3) continue;
            if (Math.abs(Math.abs(pos.array[k*3+두]) - sz[두]/2) > 1e-3) n++; }
          면[ax[i] + (끝 ? '+' : '-')] = n; }); });
      return { 면, 크기: sz.map(x => +x.toFixed(2)) };
    }, { 이름, 왼 });
    // ㉮ 상판 「측판 사이」 — 한 부속(측판)에서 **위는 엣지 · 아래는 바닥**이라 한쪽만 덮인다
    await 꼴('insert', 2.7, { topStyle:'inset' });
    맞나('측판 엣지변 — 위(우)만 D면', await p.evaluate(() => window.__probe.변('측판')), ['상','하','우']);
    { const r = await 홈입('측판', true);
      맞나('측판 위(엣지) 홈 안 드러남 · 아래(엣지 없음) 드러남', [r.면['y+'], r.면['y-'] > 0], [0, true]);
      맞나('측판 겉 치수 그대로', r.크기, [18, 1800, 400]); }
    // ㉯ 상판 「측판 위」 — 상판 D면 둘 다 엣지(2,2) · 하판 D면은 측판에 맞닿아 엣지 없음(2,0)
    await 꼴('insert', 2.7, { topStyle:'overlay' });
    맞나('상판 D 2 · 하판 D 0', [await p.evaluate(() => window.__probe.엣지값('상판').D),
                                await p.evaluate(() => window.__probe.엣지값('하판').D)], [2, 0]);
    { const a = await 홈입('상판'), b = await 홈입('하판');
      맞나('상판 양끝(엣지) 홈 안 드러남', [a.면['x-'], a.면['x+']], [0, 0]);
      맞나('하판 양끝(엣지 없음) 그대로 드러남', [b.면['x-'] > 0, b.면['x+'] > 0], [true, true]);
      맞나('겉 치수 그대로 — 상판·하판', [a.크기, b.크기], [[800, 18, 400], [764, 18, 400]]); }
    // ㉰ 고르개로 사장님이 D 0 으로 두시면 **그 값이 이긴다** — 홈이 도로 드러난다
    await p.evaluate(() => window.__probe.엣지넣기({ 상판:{ W:2, D:0, 필름:1, RT:0.5 } })); await 잠(400);
    { const a = await 홈입('상판');
      맞나('고르개 D 0 → 홈이 도로 드러난다', [a.면['x-'] > 0, a.면['x+'] > 0], [true, true]);
      맞나('겉 치수 그대로', a.크기, [800, 18, 400]); }
    await p.evaluate(() => window.__probe.엣지넣기({})); await 잠(300); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

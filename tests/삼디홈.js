#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**3d에는 안보여**」 — 뒷판 끼우기의 홈 가공이 2D·부품표·DXF 에는 다 들어갔는데
   3D 만 민짜 상자였다. **선을 긋는 것이 아니라 진짜로 판다**(`THREE.Shape` + `ExtrudeGeometry`).

     ① 덮기는 예전과 글자 하나까지 같다 (조각 수 · 꼭지점 수 · 겉 치수)
     ② 끼우기면 **측판 둘 · 상판 · 하판 넷**에만 홈이 파인다 (나머지는 그대로)
     ③ **겉 치수가 한 톨도 안 변한다** — 홈은 안으로 파는 것이다
     ④ **왼·오른 측판이 둘 다 몸통 안쪽**으로 파인다 · 상판은 아랫면 · 하판은 윗면
     ⑤ 홈 자리가 **2D 와 같다** — 뒤 끝에서 5.5 · 폭 3.5 · 깊이 6
     ⑥ 뒷판 9T 면 홈이 따라 넓어진다(폭 9.8) — 판 뒤로 **뚫려 나간다**
     ⑦ 고르면 빛나고 · 이동선반은 그대로 비치고 · 모서리선이 그대로고 · 펼치기가 돈다

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
    'st:()=>state,rule:()=>규칙,grp:()=>group};' + 못);
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
    맞나('홈 파는 넷 — 꼭지점이 늘었다', ['측판(왼)','측판(오른)','상판','하판'].map(n => 꼭[n][0]), [84, 84, 84, 84]);
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

  console.log('⑥ 뒷판 9T — 홈이 따라 넓어지고 판 뒤로 뚫려 나간다');
  { await 꼴('insert', 9);
    맞나('홈 폭 9.8 · 뒤 400.8 (판 뒤끝 400 을 넘는다)', await p.evaluate(() => { const m = window.__probe.model();
      return [+m.홈.폭.toFixed(2), +m.홈.뒤.toFixed(2)]; }), [9.8, 400.8]);
    맞나('홈 자리가 판 뒤끝에서 잘린다 (391 ~ 400)', await p.evaluate(() => {
      const g = window.__probe.grp(), m = window.__probe.model();
      const c = g.children.find(x => x.userData.key.split('|')[0] === '상판');
      const q = m.parts[c.userData.pid], pos = c.geometry.attributes.position, Z = new Set();
      for (let i = 0; i < pos.count; i++) Z.add(+((q.y + q.d/2) - pos.getZ(i)).toFixed(2));
      return [...Z].sort((a,b)=>a-b); }), [0, 391, 400]);
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

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

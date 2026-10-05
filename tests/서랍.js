#!/usr/bin/env node
/* 10-05 사장님 말씀: 「**서랍장 상태에서 발생되는 기본 부속에 서랍이 있어야 합니다.** 서랍은 각 마이다의
   하부 끝에서 **21mm 올라간 지점** 부터 위치하며 좌우 양 끝은 **측판으로부터 13mm씩** … 서랍의 기본높이는
   마이다의 총높이에서 **하부 21 상부 21 제외**한 사이즈 … 기본 소재의 두께는 **12mm** … **서랍재W**(넓이) ·
   **서랍재D**(폭) … 좌우에 서랍재D 가 양쪽에 위치하면 그 사이로 **서랍재W 2개가 전면 후면**에 … 바닥판은
   **뒷판과 같은 원리**로 끼우기/덮기 … **서랍재의 바닥으로 부터 20mm** 지점에서 홈가공이 시작 …
   **- 50mm의값** … **부속명 서랍 자체는 … 부속서에는 나타나지 않지만** … 서랍재는 나타나야 하며 이는
   **마이다 바로 아래부분에** … **서랍설정** 이라는 메뉴를 **부속추가 아래**에」

     ① 사장님 예시 그대로 — 마이다 762/180 · 측판 480 · 우라홈 20
        외부(측판 안 침범) **736 × 410 × 138** · 내부(측판 안으로) **736 × 392 × 138**
     ② 부속서 — 서랍재W · 서랍재D · 서랍바닥의 수량·치수·가공 위치, **마이다 바로 아래** 차례
     ③ **「서랍」 이름은 어디에도 안 선다** (부속에도 부속서에도)
     ④ 「서랍설정」 메뉴가 **「부속추가」 아래**에 있고 **44px** 이며 수납장에는 아예 없다
     ⑤ 상/하 유격 · 좌우 13 · 깊이 −50 을 바꾸면 **서랍 치수와 부속서가 같이** 따라간다(진짜 손가락 저장)
     ⑥ 바닥판 **두께 여덟 · 끼우기/덮기 · 홈 시작점**이 다 먹는다
     ⑦ **3D·2D 에 그려진다**
     ⑧ **수납장은 한 톨도 안 바뀐다** — 줄도 부속도 없고 DXF 네 기준값 그대로

   돌리는 법:  node tests/서랍.js
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
    'rule:()=>규칙,st:()=>state,grp:()=>group,행:()=>부속행들(buildModel(state)),' +
    'draw:()=>buildDrawing(state,buildModel(state)),dxf:()=>buildDXF(buildDrawing(state,buildModel(state)))};' + 못);
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
    await p.selectOption('#itemSel', 품); await 잠(700); };
  const 펴기 = async 이름 => { const 폈나 = await p.evaluate(n => {
      const b = document.querySelector(`.pname[data-opt="${n}"]`); return b && b.getAttribute('aria-expanded') === 'true'; }, 이름);
    if (!폈나) await 손가락(`.pname[data-opt="${이름}"]`); await 잠(350); };
  const 설정 = async (o, r) => { await p.evaluate(([o,r]) => { if (r) Object.assign(window.__probe.rule(), r);
    window.__probe.set(o); }, [o, r || null]); await 잠(350); };
  const 재기 = () => p.evaluate(() => { const m = window.__probe.model();
    const r = n => n == null ? null : Math.round(n * 1000) / 1000;
    const 자 = n => { const g = m.parts.filter(x => x.name === n);
      return g.length ? { 수:g.length, x:r(g[0].x), y:r(g[0].y), z:r(g[0].z),
        w:r(g[0].w), d:r(g[0].d), h:r(g[0].h) } : null; };
    const D = m.parts.filter(x => x.name === '서랍재D'), W = m.parts.filter(x => x.name === '서랍재W');
    const 마 = m.parts.filter(x => x.name === '마이다');
    return { 마이다키: 마[0] ? r(마[0].h) : null, 안폭: r(m.innerW),
      서랍폭: (D.length >= 2) ? r((D[1].x + D[1].w) - D[0].x) : null,
      서랍깊: D[0] ? r(D[0].d) : null, 서랍키: D[0] ? r(D[0].h) : null,
      서랍밑: D[0] ? r(D[0].z) : null, 서랍왼: D[0] ? r(D[0].x) : null,
      Dw: 자('서랍재D'), Ww: 자('서랍재W'), B: 자('서랍바닥'),
      WL: W[0] ? r(W[0].cut.L) : null }; });

  // 사장님 예시 — 마이다 높이 180 · 안폭 762 · 측판 깊이 480 · 우라홈 20
  const 예시외부 = { W:798, D:480, H:1555, backMode:'insert', doors:8, doorMode:'out', shelves:0, shelvesM:0,
                     Tsw:12, Tsd:12, Tsb:12, 서랍바닥꼴:'insert' };
  const 예시내부 = { ...예시외부, H:1590, doorMode:'in' };
  const 기본규칙 = { 우라홈:20, 서랍위유격:21, 서랍아래유격:21, 서랍레일:13, 서랍깊이줄임:50, 서랍홈시작:20 };

  console.log('① 사장님 예시 — 마이다 762/180 · 측판 480 · 우라홈 20');
  await 품목고르기('서랍장');
  await 설정(예시외부, 기본규칙);
  let v = await 재기();
  맞나('외부 — [마이다키, 안폭, 서랍 폭×깊이×높이]',
    [v.마이다키, v.안폭, v.서랍폭, v.서랍깊, v.서랍키], [180, 762, 736, 410, 138]);
  맞나('외부 — 서랍 왼끝(측판 안쪽면 + 13) · 밑끝(마이다 하부 + 21)', [v.서랍왼, v.서랍밑], [31, 106]);
  await 설정(예시내부, 기본규칙);
  v = await 재기();
  맞나('내부 — [마이다키, 안폭, 서랍 폭×깊이×높이]',
    [v.마이다키, v.안폭, v.서랍폭, v.서랍깊, v.서랍키], [180, 762, 736, 392, 138]);
  맞나('조립 — 서랍재D 좌우 · 서랍재W 는 그 사이(폭 − 2×두께)',
    [v.Dw && v.Dw.수, v.Ww && v.Ww.수, v.WL, (v.Ww && v.Dw) ? v.Ww.x - v.Dw.x : null], [16, 16, 712, 12]);

  console.log('② 부속서 — 수량 · 크기 · 가공 위치 · 마이다 바로 아래');
  await 설정(예시외부, 기본규칙);
  const 행 = await p.evaluate(() => window.__probe.행().map(r => ({ 이름:r.name, 수:r.qty,
    가로:r.L, 세로:r.W, 두께:r.T, 비고:r.비고 || '',
    홈: r.서랍홈 ? [r.서랍홈.깊이, r.서랍홈.폭, r.서랍홈.시작] : null })));
  맞나('차례 — 마이다 다음이 서랍재W · 서랍재D · 서랍바닥',
    행.map(r => r.이름).slice(행.findIndex(r => r.이름 === '마이다'), 행.findIndex(r => r.이름 === '마이다') + 4),
    ['마이다','서랍재W','서랍재D','서랍바닥']);
  맞나('서랍재W', 행.filter(r => r.이름 === '서랍재W'),
    [{ 이름:'서랍재W', 수:16, 가로:712, 세로:138, 두께:12, 비고:'홈 6×12.8', 홈:[6, 12.8, 20] }]);
  맞나('서랍재D', 행.filter(r => r.이름 === '서랍재D'),
    [{ 이름:'서랍재D', 수:16, 가로:410, 세로:138, 두께:12, 비고:'홈 6×12.8', 홈:[6, 12.8, 20] }]);
  맞나('서랍바닥 — 안쪽 칸 + 뒷판키움 11', 행.filter(r => r.이름 === '서랍바닥'),
    [{ 이름:'서랍바닥', 수:8, 가로:723, 세로:397, 두께:12, 비고:'', 홈:null }]);
  맞나('부속 쪽에 서랍재 이름과 「바닥에서 20」 이 찍힌다', await p.evaluate(() => {
    const g = window.__probe.행().filter(r => r.서랍홈);
    return g.length > 0 && g.every(r => r.서랍홈.시작 === 20); }), true);

  console.log('③ 「서랍」 이름은 어디에도 안 선다');
  맞나('부속 이름에 「서랍」 이 없다', await p.evaluate(() =>
    [...new Set(window.__probe.model().parts.map(x => x.name))].filter(n => n === '서랍')), []);
  맞나('부속서에 「서랍」 이 없다', 행.filter(r => r.이름 === '서랍'), []);

  console.log('④ 「서랍설정」 메뉴 — 부속추가 아래 · 44px · 수납장엔 없다');
  맞나('자리와 크기', await p.evaluate(() => {
    const ds = document.querySelector('#drawerSetBox'); if (!ds) return '서랍설정 메뉴가 없다';
    const btn = ds.querySelector('.pname'), r = btn.getBoundingClientRect();
    const add = document.querySelector('#newPart').closest('.field');
    const rules = document.querySelector('#btnRules').closest('.field');
    return { 보임: getComputedStyle(ds).display !== 'none', 높이: Math.round(r.height),
      부속추가아래: (add.compareDocumentPosition(ds) & 4) === 4,
      관계제어판위: (ds.compareDocumentPosition(rules) & 4) === 4 }; }),
    { 보임:true, 높이:44, 부속추가아래:true, 관계제어판위:true });
  await 펴기('서랍설정');
  맞나('판 — 네 칸(23px · 줄 25px · 0.5) · 결 방향 없음 · 저장/닫기', await p.evaluate(() => {
    const el = document.querySelector('.opt[data-opt="서랍설정"]'); if (!el || el.hidden) return null;
    return { 칸: [...el.querySelectorAll('.optnum')].map(d => { const i = d.querySelector('input');
        return [d.querySelector('label').textContent, i.dataset.rule, i.step,
          Math.round(i.getBoundingClientRect().height), Math.round(d.getBoundingClientRect().height)]; }),
      결: el.querySelectorAll('[data-grainon]').length,
      단추: [...el.querySelectorAll('.optbtns button')].map(x => x.textContent),
      넘침: el.scrollWidth - el.clientWidth }; }),
    { 칸: [['상부유격','서랍위유격','0.5',23,25], ['하부유격','서랍아래유격','0.5',23,25],
           ['레일유격','서랍레일','0.5',23,25], ['깊이유격','서랍깊이줄임','0.5',23,25]],
      결:0, 단추:['저장','닫기'], 넘침:0 });

  console.log('⑤ 값을 바꾸면 서랍과 부속서가 따라간다 (진짜 손가락으로 치고 저장)');
  const 치기 = async (열쇠, 값) => {
    await 손가락(`.opt[data-opt="서랍설정"] input[data-rule="${열쇠}"]`);
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(값)); await 잠(150); };
  await 치기('서랍위유격', 30); await 치기('서랍아래유격', 10);
  await 치기('서랍레일', 5);   await 치기('서랍깊이줄임', 100);
  맞나('치기만 해서는 안 먹는다', await p.evaluate(() => { const r = window.__probe.rule();
    return [r.서랍위유격, r.서랍아래유격, r.서랍레일, r.서랍깊이줄임]; }), [21, 21, 13, 50]);
  await 손가락('.opt[data-opt="서랍설정"] [data-optsave]'); await 잠(500);
  v = await 재기();
  맞나('저장 뒤 — [왼끝, 밑끝, 폭, 깊이, 높이]',
    [v.서랍왼, v.서랍밑, v.서랍폭, v.서랍깊, v.서랍키], [23, 95, 752, 360, 140]);
  맞나('부속서도 따라간다', await p.evaluate(() => window.__probe.행()
    .filter(r => r.name.startsWith('서랍')).map(r => [r.name, r.qty, r.L, r.W, r.T])),
    [['서랍재W',16,728,140,12], ['서랍재D',16,360,140,12], ['서랍바닥',8,739,347,12]]);
  await 설정({}, 기본규칙);

  console.log('⑥ 바닥판 — 두께 여덟 · 끼우기/덮기 · 홈 시작점');
  const 바닥 = async (t, 꼴, 시작) => { await 설정({ ...예시외부, Tsb:t, 서랍바닥꼴:꼴 },
      { ...기본규칙, 서랍홈시작: 시작 });
    const q = await 재기(); return q.B ? [q.B.z, q.B.w, q.B.d, q.B.h] : null; };
  for (const [t, 바람] of [[2.7,122.5],[3,122.2],[5,120.2],[6,119.2],[9,116.2],[12,113.2],[15,110.2],[18,107.2]])
    맞나('끼우기 Tsb ' + t + ' — 바닥 z (= 서랍밑 + 20 − 홈폭)', (await 바닥(t, 'insert', 20) || [null])[0], 바람);
  맞나('홈 시작 30 — 바닥이 10 올라간다', (await 바닥(12, 'insert', 30) || [null])[0], 123.2);
  맞나('덮기 — 서랍재 밑에 붙고 바깥에서 2씩 들어간다', await 바닥(12, 'cover', 20), [94, 732, 406, 12]);
  await 설정({ ...예시외부, Tsb:12, 서랍바닥꼴:'insert' }, 기본규칙);

  console.log('⑦ 3D·2D 에 그려진다');
  맞나('2D — 서랍 세 부속이 도면에 선다', await p.evaluate(() => {
    const m = window.__probe.model(), d = window.__probe.draw();
    const 짚 = new Set(d.hits.map(h => h.pid));
    const 선것 = n => m.parts.filter(x => x.name === n).some(x => 짚.has(x.pid));
    return [선것('서랍재W'), 선것('서랍재D'), 선것('서랍바닥')]; }), [true, true, true]);
  맞나('3D — 조각 수가 부속 수와 같다', await p.evaluate(() => {
    const m = window.__probe.model(), g = window.__probe.grp();
    const 메시 = g.children.filter(o => o.isMesh).length;
    return [메시, m.parts.filter(x => !x.숨김).length]; }).then(a => a[0] === a[1]), true);

  console.log('⑧ 수납장은 한 톨도 안 바뀐다');
  await 품목고르기('수납장');
  맞나('서랍 줄 셋과 「서랍설정」 이 아예 안 보인다', await p.evaluate(() =>
    ['서랍재W','서랍재D','서랍바닥'].map(n => { const el = document.querySelector(`.field[data-part="${n}"]`);
      return el ? getComputedStyle(el).display !== 'none' : false; })
    .concat([!!document.querySelector('#drawerSetBox') &&
      getComputedStyle(document.querySelector('#drawerSetBox')).display !== 'none'])),
    [false, false, false, false]);
  맞나('수납장에는 서랍 부속이 안 선다', await p.evaluate(() => {
    window.__probe.set({ W:800, D:400, H:1800, backMode:'cover', doors:2, doorMode:'out',
      shelves:3, shelvesM:0, Tsw:12, Tsd:12, Tsb:12 });
    return window.__probe.model().parts.filter(x => x.name.startsWith('서랍')).length; }), 0);
  await 잠(300);
  맞나('DXF 네 기준값', await p.evaluate(() => { const 재 = () => {
      const t = window.__probe.dxf(); return new TextEncoder().encode(t).length; };
    const o = [];
    window.__probe.set({ W:800, D:400, H:1800, Ttop:18, Tside:18, Tshelf:18, Tshelf2:18, Tdoor:18,
      Tbot:18, Tplinth:18, TB:2.7, shelves:3, shelvesM:0, plinth:80, topStyle:'inset', botStyle:'inset',
      밴드꼴:'하판아래', backMode:'cover', doors:2, doorMode:'out' });
    o.push(재()); window.__probe.set({ backMode:'insert' }); o.push(재());
    window.__probe.set({ backMode:'cover', TB:9 }); o.push(재());
    window.__probe.set({ backMode:'insert' }); o.push(재());
    window.__probe.set({ backMode:'cover', TB:2.7 });
    return o; }), [71286, 109007, 70496, 109073]);
  맞나('오류 0', 터짐.length, 0);

  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

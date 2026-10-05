#!/usr/bin/env node
/* 10-05 사장님 말씀: 「**가로대의 기본 위치는 마이다와 마이다 사이에 가로대의 정 중앙 선이 오는 위치**로해줘」

     ① 가로대 **중앙선**이 마이다 틈 한가운데와 **글자까지 같다**
     ② **두께를 바꿔도 중앙선이 그 자리다**(12 · 18 · 25 · 55T) — 윗면·아랫면이 아니라 가운데를 잡는다
     ③ 마이다가 둘 미만이면 **틈이 없어 예전 자리 그대로**다
     ④ 수가 다르면 **적은 쪽을 고르게 흩어** 짝짓는다 — 차례가 안 뒤집히고 한 틈에 둘이 안 들어간다
     ⑤ 옆 선반을 타 넘게 되는 자리는 **안 옮긴다**(좁은 칸 · 두꺼운 선반) — 예전 자리 그대로
     ⑥ 쓸기 — **차례깨짐 0 · 한틈에둘 0 · 가로대끼리 겹침 0**
     ⑦ **수납장은 한 톨도 안 바뀐다**(문짝은 좌우로 나뉘어 세로 틈이 없다)
     ⑧ 손으로 고치는 길이 그대로다 — 단수 끌개 · 깊이 칸(**진짜 손가락** + 저장) · 짝 열쇠
     ⑨ 가로대를 **3D 에서 끄는 길은 이 집에 없다** — `끌밴드` 는 밴드만 잡는다(§4.88)

   돌리는 법:  node tests/가로대틈.js
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
    'rule:()=>규칙,st:()=>state};' + 못);
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
    await p.selectOption('#itemSel', 품); await 잠(600); };
  const 펴기 = async 부속 => { const 폈나 = await p.evaluate(n => {
      const b = document.querySelector(`.pname[data-opt="${n}"]`); return b && b.getAttribute('aria-expanded') === 'true'; }, 부속);
    if (!폈나) await 손가락(`.pname[data-opt="${부속}"]`); await 잠(400); };

  // 그 설정에서 마이다 틈과 가로대 중앙선을 잰다
  const 잼 = st => p.evaluate(st => {
    window.__probe.set(st);
    const m = window.__probe.model(), r = n => Math.round(n * 1000) / 1000;
    const 마 = m.parts.filter(x => x.name === '마이다').sort((a, b) => a.z - b.z);
    const 가 = m.parts.filter(x => x.name === '가로대').sort((a, b) => a.z - b.z);
    const 틈 = []; for (let k = 0; k < 마.length - 1; k++) 틈.push(r((마[k].z +마[k].h + 마[k+1].z) / 2));
    return { 틈, 중앙: 가.map(x => r(x.z + x.h / 2)), 두께: 가[0] ? r(가[0].h) : null };
  }, st);
  const 기본 = { W:800, D:400, H:1800, shelvesM:0, Tsb:12, backMode:'cover', doorMode:'out', Tshelf:18 };

  console.log('── 서랍장 · 중앙선이 틈 한가운데인가');
  await 품목고르기('서랍장');
  for (const [이름, st, 맞는가] of [
      ['마이다 4 · 가로대 3', { ...기본, doors:4, shelves:3 }, true],
      ['마이다 5 · 가로대 4', { ...기본, doors:5, shelves:4 }, true],
      ['마이다 3 · 가로대 2', { ...기본, doors:3, shelves:2 }, true],
      ['마이다 4 · 가로대 3 · 내부', { ...기본, doors:4, shelves:3, doorMode:'in' }, true]]){
    const v = await 잼(st);
    맞나(이름 + ' — 중앙선 = 틈', v.중앙, v.틈);
  }
  // ② 두께를 바꿔도 중앙선이 그대로
  const 두께들 = [];
  for (const T of [12, 18, 25, 55]) 두께들.push((await 잼({ ...기본, doors:4, shelves:3, Tshelf:T })).중앙);
  맞나('두께 12·18·25·55T 에서 중앙선이 같나', 두께들.slice(1).map(v => JSON.stringify(v) === JSON.stringify(두께들[0])), [true, true, true]);
  맞나('그 중앙선', 두께들[0], [512.25, 941.5, 1370.75]);
  // ③ 마이다가 둘 미만이면 예전 자리
  for (const n of [0, 1]){
    const v = await 잼({ ...기본, doors:n, shelves:3 });
    맞나('마이다 ' + n + ' — 틈이 없어 예전 자리', [v.틈, v.중앙], [[], [514.5, 940, 1365.5]]);
  }
  // ④ 수가 다를 때 — 고르게 흩어지고 차례가 안 뒤집힌다
  {
    const v = await 잼({ ...기본, doors:2, shelves:3 });
    맞나('마이다 2 · 가로대 3 — 가운데 하나만 틈으로', v.중앙, [514.5, 941.5, 1365.5]);
    const w = await 잼({ ...기본, doors:4, shelves:5 });
    맞나('마이다 4 · 가로대 5 — 셋이 틈 · 둘은 예전 자리', w.중앙, [512.25, 656.333, 941.5, 1223.667, 1370.75]);
    맞나('그 셋이 틈과 같나', w.중앙.filter(c => w.틈.some(g => Math.abs(g - c) < 1e-6)), w.틈);
  }
  // ⑤ 옆을 타 넘게 되는 자리는 안 옮긴다 — 좁은 칸 · 두꺼운 선반
  {
    const v = await 잼({ ...기본, W:600, H:900, doors:2, shelves:8, Tshelf:55 });
    const 오름 = v.중앙.every((c, i) => i === 0 || c > v.중앙[i-1]);
    맞나('H900 · 마이다 2 · 가로대 8 · 55T — 차례가 안 뒤집힌다', 오름, true);
  }
  // ⑥ 쓸기
  {
    const r = await p.evaluate(() => {
      const P = window.__probe, 겹 = (a, b, k, K) => Math.min(a[K], b[K]) - Math.max(a[k], b[k]);
      let 차례깨짐 = 0, 한틈에둘 = 0, 가가겹침 = 0;
      for (const H of [900, 1800, 2400]) for (const doors of [0, 2, 3, 4, 5, 8])
       for (const shelves of [0, 1, 2, 3, 5, 8]) for (const Tshelf of [12, 18, 55])
        for (const doorMode of ['out', 'in']){
          P.set({ W:800, D:400, H, doors, shelves, Tshelf, doorMode, shelvesM:0, Tsb:12, backMode:'cover' });
          const m = P.model();
          const 가 = m.parts.filter(x => x.name === '가로대');
          const 마 = m.parts.filter(x => x.name === '마이다').sort((a, b) => a.z - b.z);
          const 틈 = []; for (let k = 0; k < 마.length - 1; k++) 틈.push((마[k].z + 마[k].h + 마[k+1].z) / 2);
          for (let i = 1; i < 가.length; i++) if (가[i].z < 가[i-1].z + 가[i-1].h - 1e-9) 차례깨짐++;
          const 쓴 = 가.map(x => x.z + x.h / 2).filter(c => 틈.some(g => Math.abs(g - c) < 1e-6));
          if (new Set(쓴.map(v => v.toFixed(6))).size !== 쓴.length) 한틈에둘++;
          for (let i = 0; i < 가.length; i++) for (let j = i+1; j < 가.length; j++){
            const a = 가[i], c = 가[j];
            const ax = { x:a.x, X:a.x+a.w, y:a.y, Y:a.y+a.d, z:a.z, Z:a.z+a.h };
            const cx = { x:c.x, X:c.x+c.w, y:c.y, Y:c.y+c.d, z:c.z, Z:c.z+c.h };
            if (겹(ax,cx,'x','X') > 1 && 겹(ax,cx,'y','Y') > 1 && 겹(ax,cx,'z','Z') > 1) 가가겹침++;
          }
        }
      return [차례깨짐, 한틈에둘, 가가겹침];
    });
    맞나('쓸기 — 차례깨짐 · 한틈에둘 · 가로대끼리 겹침', r, [0, 0, 0]);
  }

  // ⑦ 수납장은 한 톨도 안 바뀐다
  console.log('── 수납장');
  await 품목고르기('수납장');
  const 수 = await p.evaluate(() => { window.__probe.set({ W:800, D:400, H:1800, doors:2, shelves:3,
      shelvesM:0, Tshelf:18, backMode:'cover', doorMode:'out' });
    const m = window.__probe.model(), r = n => Math.round(n * 1000) / 1000;
    return m.parts.filter(x => x.name === '고정선반').sort((a,b)=>a.z-b.z).map(x => r(x.z)); });
  맞나('수납장 고정선반 z', 수, [505.5, 931, 1356.5]);

  // ⑧ 손으로 고치는 길
  console.log('── 손으로 고치는 길');
  await 품목고르기('서랍장');
  await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800, doors:4, shelves:3, shelvesM:0,
    Tshelf:18, backMode:'cover', doorMode:'out' }));
  await 잠(400);
  await 펴기('고정선반');
  await p.evaluate(() => { const s = document.querySelector('#shelves'); s.value = '5';
    s.dispatchEvent(new Event('input', { bubbles:true })); });
  await 잠(500);
  맞나('단수 끌개가 먹나', (await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '가로대').length)), 5);
  await p.evaluate(() => { const s = document.querySelector('#shelves'); s.value = '3';
    s.dispatchEvent(new Event('input', { bubbles:true })); });
  await 잠(500);
  const 칸 = await p.$('.field[data-part="고정선반"] .opt input[type=number]');
  await 칸.scrollIntoViewIfNeeded(); const rr = await 칸.boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:rr.x+rr.width/2, y:rr.y+rr.height/2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await 잠(300);
  await p.keyboard.press('Control+a'); await p.keyboard.type('150'); await 잠(200);
  맞나('친 값이 칸에 들어갔나', await p.evaluate(() => document.querySelector('#r_가로대깊이').value), '150');
  맞나('저장 전에는 안 먹는다', await p.evaluate(() => window.__probe.rule().가로대깊이), 0);
  await 손가락('.field[data-part="고정선반"] .optbtns button.primary');
  맞나('저장하면 깊이가 먹고 중앙선은 그대로',
    [await p.evaluate(() => window.__probe.rule().가로대깊이),
     await p.evaluate(() => { const m = window.__probe.model(), r = n => Math.round(n*1000)/1000;
       return m.parts.filter(x => x.name === '가로대').sort((a,b)=>a.z-b.z).map(x => r(x.z + x.h/2)); })],
    [150, [512.25, 941.5, 1370.75]]);
  맞나('짝 열쇠', await p.evaluate(() => { const m = window.__probe.model();
    return m.parts.filter(x => x.name === '가로대').sort((a,b)=>a.z-b.z).map(x => x.단열쇠); }),
    ['가로대@짝:0', '가로대@짝:1', '가로대@짝:2']);

  // ⑨ 3D 에서 끄는 길은 밴드만이다
  맞나('끌밴드가 밴드만 잡나', /끌밴드[\s\S]{0,900}?p\.name !== '밴드'/.test(원글()), true);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

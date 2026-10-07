#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**모든 품목에 엣지설정 옵션을 추가해 주세요. … W, D 에대해 각각 0/1/2 … 엣지필름 두께
   0.45/1/1.5/2 … RT 가공 … 0.5/1/1.5/2 … 이 두가지 설정으로 재단 사이즈라는 중요한 정보가 발생합니다. …
   도면상 W 800 … 엣지필름 두께가 1mm 이고 W-2, D-2 이고 RT가공이 0.5라면 … 799가 되어야 한다. …
   0.45 는 편의상 … 0.5로 계산**」

     ① **사장님이 드신 보기** — W 800 · 필름 1 · W-2 · D-2 · RT 0.5 → 재단 W **799**  (1순위)
     ② 면 0·1·2 × 필름 넷 × RT 넷 = **48갈래**가 식과 맞는다 · **0.45 는 0.5 로 센다**
     ③ **기본(W-0 · D-0)이면 재단 줄이 안 뜬다** — 오늘 도면과 한 톨도 안 달라진다
     ④ 두 품목 **모든 부속 판**에 칸 넷(겉 25 · **안 23** · 줄 25) · 「서랍설정」 에는 없다 · 가로 넘침 0
     ⑤ **「저장」 을 눌러야 먹는다** · 「닫기」 는 버린다
     ⑥ 2D 부속 쪽에 「재단 사이즈」 가 뜨고 **3D 우측칸에도 같이** 뜬다 · A4 밖 0
     ⑦ 품목마다 갈라진다 · 새로 열면 그대로 · **깨진 글에도 안 터진다**
     ⑧ RT 목록에 **「RT없음」(0)** — 10-07 사장님 말씀. 고르면 재단이 필름 두께만큼만 작아진다

   돌리는 법:  node tests/엣지설정.js
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
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(700); };
  const 엣지보기 = () => p.evaluate(() => window.__probe.엣지());
  const 재단 = (n, L, W) => p.evaluate(([a,b,c]) => window.__probe.재단(a,b,c), [n,L,W]);

  console.log('① 사장님이 드신 보기 — 800 · 필름 1 · W-2 · D-2 · RT 0.5 → 799');
  { const r = await p.evaluate(() => {
      const e = window.__probe.엣지(); if (!e) return null;
      e['시험'] = { W:2, D:2, 필름:1, RT:0.5 };
      const v = window.__probe.재단('시험', 800, 400);
      delete e['시험']; return v; });
    맞나('재단 W(800 기준)', r && r.L, 799);
    맞나('재단 D(400 기준)', r && r.W, 399); }

  console.log('② 48갈래가 식과 맞는다 · 0.45 는 0.5 로 센다');
  { const z = await p.evaluate(() => {
      const e = window.__probe.엣지(); if (!e) return null;
      const 표 = [];
      for (const D of [0,1,2]) for (const f of [0.45,1,1.5,2]) for (const rt of [0.5,1,1.5,2]){
        e['시험'] = { W:0, D, 필름:f, RT:rt };
        const r = window.__probe.재단('시험', 800, 400);
        표.push([D, f, rt, r ? r.L : 800]);
      }
      delete e['시험']; return 표; });
    const 식 = (D, f, rt) => +(800 - D*((f === 0.45 ? 0.5 : f) - rt)).toFixed(3);
    맞나('갈래 수', z && z.length, 48);
    맞나('다 식과 맞나', z && z.every(([D,f,rt,L]) => L === 식(D,f,rt)), true);
    맞나('0.45·RT0.5·면2 는 그대로 800', z && z.find(x => x[0]===2 && x[1]===0.45 && x[2]===0.5)[3], 800);
    맞나('면 1 은 한쪽만 준다', z && z.find(x => x[0]===1 && x[1]===1 && x[2]===0.5)[3], 799.5);
    맞나('RT 가 필름보다 크면 재단이 커진다', z && z.find(x => x[0]===2 && x[1]===1 && x[2]===2)[3], 802); }

  console.log('③ 기본(W-0 · D-0)이면 재단 줄이 안 뜬다');
  { 맞나('담긴 것이 없다', await 엣지보기(), {});
    맞나('재단사이즈가 null', await 재단('측판', 1800, 400), null);
    await p.evaluate(() => window.__probe.set({ backMode:'insert' })); await 잠(400);
    const z = await p.evaluate(() => window.__probe.쪽().map(x => x.svg).join(''));
    맞나('2D 에 「재단 사이즈」 글이 없다', /재단 사이즈/.test(z), false);
    맞나('DXF 끼우기 2.7T 기준값', await p.evaluate(() => window.__probe.dxf().length), 109007); }

  console.log('④ 두 품목 모든 부속 판에 칸 넷 · 「서랍설정」 에는 없다');
  for (const 품 of ['수납장','서랍장']){
    await 품목(품);
    const 이름들 = await p.evaluate(() =>
      [...document.querySelectorAll('.pname[data-opt]')].filter(x => x.offsetParent).map(x => x.dataset.opt));
    const 표 = [];
    for (const n of 이름들){
      await 손가락(`.pname[data-opt="${n}"]`);
      표.push([n, await p.evaluate(x => {
        const el = document.querySelector(`.opt[data-opt="${x}"]`);
        const se = [...el.querySelectorAll('select[data-edge]')];
        const 칸 = se.map(q => Math.round(q.getBoundingClientRect().height));
        // ⚠ **값이 앉는 자리는 테두리 안쪽**이다 — 집 규칙의 23 은 그것이다(10-06 관리자 · §4.9846-높이).
        //    겉 25 는 유격 칸의 겉 네모(`.num`)와 같은 값이라 한 칸에서 턱이 안 생긴다.
        const 안 = se.map(q => q.clientHeight);
        const 줄 = [...el.querySelectorAll('.optnum')].filter(q => q.querySelector('select[data-edge]'))
          .map(q => Math.round(q.getBoundingClientRect().height));
        const 유 = el.querySelector('.optnum .num');
        return [se.length, [...new Set(칸)], [...new Set(줄)], [...new Set(안)],
          유 ? Math.round(유.getBoundingClientRect().height) : null];
      }, n)]);
      await 손가락(`.pname[data-opt="${n}"]`);
    }
    맞나(`${품} — 판마다 칸 넷 · 겉 25(안 23) · 줄 25`, 표.map(([n, v]) =>
      [n, n === '서랍설정' ? v[0] : (v[0] === 4 && v[1].join() === '25' && v[2].join() === '25'
        && v[3].join() === '23')]),
      표.map(([n]) => [n, n === '서랍설정' ? 0 : true]));
    // 유격 칸이 있는 판에서는 **겉 네모가 고르개와 같은 높이**여야 한다 — 그래야 한 칸에 턱이 없다
    맞나(`${품} — 유격 겉 네모와 같은 높이`, 표.filter(([n, v]) => v[4] !== null && n !== '서랍설정')
      .map(([n, v]) => [n, v[1].join() === String(v[4])]),
      표.filter(([n, v]) => v[4] !== null && n !== '서랍설정').map(([n]) => [n, true]));
    맞나(`${품} — 가로 넘침`, await p.evaluate(() => document.documentElement.scrollWidth), 375);
  }
  await 품목('수납장');

  console.log('⑤ 「저장」 을 눌러야 먹는다 · 「닫기」 는 버린다');
  { // ⚠ 고치기 전 판에는 그 칸이 아예 없다 — 널에 견디게 한다(§4.986-모바일 과 같은 자리).
    const 고르기 = async (칸, 값) => {
      const 자 = `.opt[data-opt="측판"] select[data-edge$="|${칸}"]`;
      if (!(await p.$(자))) return false;
      await p.selectOption(자, String(값)); await 잠(200); return true; };
    await 손가락('.pname[data-opt="측판"]');
    await 고르기('W', 2); await 고르기('D', 2);
    맞나('치기만 하면 안 먹는다', await 엣지보기(), {});
    await 손가락('.opt[data-opt="측판"] [data-optclose]');          // 닫기 — 버린다
    await 손가락('.pname[data-opt="측판"]');
    맞나('닫으면 버려진다', await 엣지보기(), {});
    await 고르기('W', 2); await 고르기('D', 2);
    await 손가락('.opt[data-opt="측판"] [data-optsave]');            // 저장
    맞나('저장하면 먹는다', await 엣지보기(), { 측판:{ W:2, D:2 } });
    맞나('재단이 따라온다', await 재단('측판', 1800, 400), { L:1799, W:399 }); }

  console.log('⑥ 2D 부속 쪽 · 3D 우측칸 · A4 밖 0');
  { const z = await p.evaluate(() => {
      const 쪽 = window.__probe.쪽();
      let 밖 = 0;
      쪽.forEach(q => [...q.svg.matchAll(/<(line|rect|text)[^>]*>/g)].forEach(t => {
        const gx = [...t[0].matchAll(/(?:^|\s)(x|x1|x2)="([-\d.]+)"/g)].map(v => +v[2]);
        const gy = [...t[0].matchAll(/(?:^|\s)(y|y1|y2)="([-\d.]+)"/g)].map(v => +v[2]);
        const w = /width="([-\d.]+)"/.exec(t[0]), h = /height="([-\d.]+)"/.exec(t[0]);
        const xs = gx.concat(w ? [gx[0] + +w[1]] : []), ys = gy.concat(h ? [gy[0] + +h[1]] : []);
        if (xs.some(v => v < -0.01 || v > 210.01) || ys.some(v => v < -0.01 || v > 297.01)) 밖++;
      }));
      const 글 = 쪽.map(q => [...q.svg.matchAll(/>([^<>]+)<\/text>/g)].map(x => x[1])).flat();
      const i = 글.indexOf('재단 사이즈');
      return { 밖, 재단: i < 0 ? null : 글[i+1] };
    });
    맞나('2D 부속 쪽의 재단 사이즈', z.재단, '1799 × 399');
    맞나('A4 밖 0', z.밖, 0);
    await p.evaluate(() => window.__probe.고르기(0)); await 잠(400);
    맞나('3D 우측칸에도 같이 뜬다', await p.evaluate(() =>
      [...document.querySelectorAll('#partInfo .pirow')].map(x => x.textContent).slice(-1)[0]),
      '재단 사이즈1799 × 399'); }

  console.log('⑦ 품목마다 갈라진다 · 새로 열면 그대로 · 깨진 글에도 안 터진다');
  { // ⚠ ④ 에서 이미 서랍장을 한 번 골라 그 칸이 생겼다 — 베끼기는 **한 번만** 돈다(§4.9876).
    //    첫 전환을 다시 재려면 그 품목 칸을 비우고 새로 열어야 한다.
    await p.evaluate(() => Object.keys(localStorage)
      .filter(k => k.indexOf('cabinet-studio.서랍장.') === 0).forEach(k => localStorage.removeItem(k)));
    await p.reload({ waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    await 품목('서랍장');
    맞나('서랍장 첫 전환 — 수납장 것을 베껴 온다', await 엣지보기(), { 측판:{ W:2, D:2 } });
    await 손가락('.pname[data-opt="측판"]');
    for (const [칸, v] of [['W','1'],['D','0']]){
      const 자 = `.opt[data-opt="측판"] select[data-edge$="|${칸}"]`;
      if (await p.$(자)) await p.selectOption(자, v); await 잠(200); }
    await 손가락('.opt[data-opt="측판"] [data-optsave]');
    맞나('서랍장을 고친다', await 엣지보기(), { 측판:{ W:1, D:0 } });
    await 품목('수납장');
    맞나('수납장은 그대로', await 엣지보기(), { 측판:{ W:2, D:2 } });
    await p.reload({ waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    맞나('새로 열어도 그대로', await 엣지보기(), { 측판:{ W:2, D:2 } });
    // 깨진 글
    await p.evaluate(() => { localStorage.setItem('cabinet-studio.수납장.엣지',
      '{"측판":{"W":"둘","D":9,"필름":null,"RT":0.5},"없는것":5,"상판":"글"}'); });
    await p.reload({ waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    맞나('꼴이 맞는 것만 받는다', await 엣지보기(), { 측판:{ RT:0.5 } });
    맞나('그래도 재단은 null(면 0)', await 재단('측판', 1800, 400), null); }

  console.log('⑧ RT 목록에 「RT없음」(0) — 10-07 사장님 말씀');
  { await p.evaluate(() => { localStorage.removeItem('cabinet-studio.수납장.엣지'); });
    await p.reload({ waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    await 손가락('.pname[data-opt="측판"]');
    const r = await p.evaluate(() => {
      const s = document.querySelector('.opt[data-opt="측판"] select[data-edge$="|RT"]');
      if (!s) return null;                                   // 고치기 전 판에는 그 칸이 아예 없다
      const b = s.getBoundingClientRect(), 줄 = s.closest('.optnum').getBoundingClientRect();
      return { 목록:[...s.options].map(o => [o.value, o.textContent]), 기본:s.value,
        칸:[Math.round(b.width), Math.round(b.height)], 안:s.clientHeight, 줄:Math.round(줄.height) };
    });
    맞나('목록 다섯 · 첫째가 RT없음(0)', r && r.목록,
      [['0','RT없음'],['0.5','0.5'],['1','1'],['1.5','1.5'],['2','2']]);
    맞나('기본값은 0.5 그대로', r && r.기본, '0.5');
    맞나('칸 82×25 · 안 23 · 줄 25', r && [r.칸[0], r.칸[1], r.안, r.줄], [82, 25, 23, 25]);
    // ⚠ 고치기 전 판에는 「RT없음」 이 아예 없다 — 없는 값을 고르면 시간초과로 **터진다**. 먼저 있는지 본다.
    const 고르기 = async (칸, 값) => { const 자 = `.opt[data-opt="측판"] select[data-edge$="|${칸}"]`;
      if (!(await p.$(자))) return false;
      const 있나 = await p.evaluate(([q, v]) =>
        [...document.querySelector(q).options].some(o => o.value === v), [자, String(값)]);
      if (!있나) return false;
      await p.selectOption(자, String(값)); await 잠(200); return true; };
    await 고르기('W', 2); await 고르기('D', 2); await 고르기('RT', 0);
    await 손가락('.opt[data-opt="측판"] [data-optsave]');
    맞나('RT없음을 저장하면 0 이 담긴다', await 엣지보기(), { 측판:{ W:2, D:2, RT:0 } });
    // 깎아 내는 것이 없으므로 한 면당 필름 두께(1)만큼만 작게 재단한다
    맞나('재단 1800×400 → 1798×398', await 재단('측판', 1800, 400), { L:1798, W:398 });
    맞나('가로 넘침', await p.evaluate(() => document.documentElement.scrollWidth), 375); }

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

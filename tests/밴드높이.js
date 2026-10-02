#!/usr/bin/env node
/* 10-02 사장님 말씀 두 건
     「밴드의 높이 사이즈를 0.5단위로 변경할 수 있는 옵션부를 추가해 주세요.
      현재 설절된 사이즈가 기본 세팅값입니다.」
     「보호대 위치를 현재의 측판끝에서 0.5mm단위로 안쪽으로 이동시킬 수 있는 옵션 부를 만들어 주세요」

     ① 밴드 판에 「밴드 높이」 칸이 있다 (34px · 0.5 걸음 · 최소 0.5) · 담긴 것 없으면 지금 셈한 값이 보인다
     ② 담긴 것이 없으면 **고치기 전과 한 톨도 같다**
     ③ 150 으로 — **아랫면은 하판 윗면 그대로**, 윗면만 올라간다 · 부품표 W 150
     ④ **비우고 저장하면 다시 따라간다** (되돌아갈 길)
     ⑤ 아주 큰 값에서도 안 터진다 · 끼우기 상·중·하 셋 다
     ⑥ 보호대유격 — 칸 최대 200 · 앞에서 붙잡힌다 · 실제 외경이 안 변한다

   돌리는 법:  node tests/밴드높이.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),build:(o)=>buildModel(Object.assign({},state,o)),rule:()=>규칙,st:()=>state,parts:()=>만든부속};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(500);

  const 펴기 = async 이름 => { const b2 = p.locator(`.pname[data-opt="${이름}"]`);
    if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${이름}"]`); };
  const 접혔나 = 이름 => p.evaluate(n => document.querySelector(`.pname[data-opt="${n}"]`).getAttribute('aria-expanded') === 'false', 이름);
  const 규 = k => p.evaluate(x => window.__probe.rule()[x], k);
  /* 고치기 전 판에는 저장·닫기 단추가 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다.
     (그 판에서는 이 시험이 깨진 것으로 빨개져야 맞다.) */
  /* **진짜 손가락**으로 누른다 — `.click()` 은 확인으로 치지 않는다(관리자가 못 박았다). */
  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  // 고치기 전 판에는 저장·닫기 단추가 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다
  const 누르기 = async 자 => { if (!await p.locator(자).count()){ 맞나('단추가 있나 — ' + 자, false, true); return false; }
    return 손가락(자); };
  // 칸도 손가락으로 톡 쳐 초점을 잡고 친다 — 진짜로 쓰는 길이다
  const 쳐넣기 = async (자, v) => {
    if (!await p.locator(자).count()){ 맞나('칸이 있나 — ' + 자, false, true); return false; }
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type(String(v)); await 잠(300);
    // 진짜로 들어갔는지 본다 — 안 들어가면 뒤의 판정이 거짓으로 통과한다(한 번 그랬다)
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== String(v)) 맞나('친 값이 칸에 들어갔나 — ' + 자, 든값, String(v));
    return true; };
  // 칸을 비운다 — 「담긴 것을 지우고 다시 따라가게」 하는 길이다
  const 비우기 = async 자 => { if (!await p.locator(자).count()){ 맞나('칸이 있나 — ' + 자, false, true); return false; }
    await 손가락(자);
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.press('Backspace'); await 잠(300);
    const 든값 = await p.evaluate(x => { const i = document.querySelector(x); return i ? i.value : null; }, 자);
    if (든값 !== '') 맞나('칸이 비었나 — ' + 자, 든값, '');
    return true; };
  const 칸값 = (이름, r) => p.evaluate(v => { const i = document.querySelector(`.opt[data-opt="${v.이름}"] input[data-rule="${v.r}"]`);
    return i ? i.value : null; }, { 이름, r });

  const 밴 = (뒤) => p.evaluate(v => { const m = window.__probe.build({ backMode:v });
    const bs = m.parts.filter(x => x.name === '밴드').sort((a,b) => a.z - b.z);
    return { 장수:bs.length, 아랫끝:bs.map(x => +x.z.toFixed(1)), 높이:[...new Set(bs.map(x => +x.h.toFixed(1)))],
             부품표W:[...new Set(bs.map(x => x.cut.W))], 밴드바닥:+m.밴드바닥.toFixed(1), 밴드천장:+m.밴드천장.toFixed(1),
             외경:[+m.외경.W.toFixed(1), +m.외경.D.toFixed(1), +m.외경.H.toFixed(1)] }; }, 뒤 || 'cover');
  const 담긴높이 = () => p.evaluate(() => { const c = window.__probe.parts().find(x => x.이름 === '밴드');
    return c ? (c.높이 === undefined ? null : c.높이) : null; });

  // 밴드와 보호대를 진짜 손가락으로 세운다
  for (const 이름 of ['밴드', '보호대']){
    await 손가락('#newPart'); await p.keyboard.type(이름); await 잠(200);
    await 손가락('#btnAdd'); await 잠(500); }
  맞나('둘 다 섰나', await p.evaluate(() => { const m = window.__probe.model();
    return [m.parts.filter(x => x.name === '밴드').length, m.parts.filter(x => x.name === '보호대').length]; }), [1, 1]);

  console.log('① 칸이 있다 · 담긴 것 없으면 지금 셈한 값이 보인다  ② 고치기 전과 한 톨도 같다');
  await 펴기('밴드');
  맞나('칸 (이름 · 값 · 걸음 · 최소)', await p.evaluate(() => {
    const i = document.querySelector('.opt[data-opt="밴드"] input[data-cpart="밴드"]'); if (!i) return null;
    const r = i.getBoundingClientRect();
    return [i.closest('.optnum').querySelector('label').textContent, i.value, i.step, i.min,
            +r.width.toFixed(1) + '×' + r.height.toFixed(0)]; }), ['밴드 높이', '98', '0.5', '0.5', '52.6×34']);
  맞나('담긴 것 없음', await 담긴높이(), null);
  // 「추가」 로 세운 밴드는 「하」 하나다(§4.8 — 옛 기본값)
  맞나('기본 자리 (덮기 · 하)', await 밴(), { 장수:1, 아랫끝:[98], 높이:[98], 부품표W:[98],
    밴드바닥:98, 밴드천장:1684, 외경:[800,422.7,1800] });

  console.log('③ 150 으로 — 아랫면은 하판 윗면 그대로, 윗면만 올라간다');
  await 쳐넣기('.opt[data-opt="밴드"] input[data-cpart="밴드"]', 150);
  맞나('저장 전에는 안 먹는다', (await 밴()).높이, [98]);
  await 누르기('.opt[data-opt="밴드"] [data-optsave]');
  맞나('담긴 값', await 담긴높이(), 150);
  맞나('150 · 덮기 — 아랫끝 98 그대로', await 밴(), { 장수:1, 아랫끝:[98], 높이:[150], 부품표W:[150],
    밴드바닥:98, 밴드천장:1632, 외경:[800,422.7,1800] });

  console.log('⑤ 끼우기 상·중·하 셋 · 아주 큰 값에서도 안 터진다');
  await p.evaluate(() => { const c = window.__probe.parts().find(x => x.이름 === '밴드');
    c.단 = ['상','중','하']; window.__probe.set({}); }); await 잠(400);
  맞나('150 · 끼우기 (상·중·하)', await 밴('insert'), { 장수:5, 아랫끝:[98,439.5,865,1290.5,1632], 높이:[150],
    부품표W:[150], 밴드바닥:98, 밴드천장:1632, 외경:[800,432.5,1800] });
  await 펴기('밴드');
  // 칸 최대가 `H` 라 5000 을 쳐도 1800 으로 붙잡힌다 — 그래도 천장이 바닥 밑으로 안 내려간다
  await 쳐넣기('.opt[data-opt="밴드"] input[data-cpart="밴드"]', 5000);
  await 누르기('.opt[data-opt="밴드"] [data-optsave]');
  맞나('5000 → 1800 으로 붙잡힘 · 천장이 바닥에서 멈춘다 · 안 터진다', await 밴(), { 장수:2, 아랫끝:[98,98],
    높이:[1800], 부품표W:[1800], 밴드바닥:98, 밴드천장:98, 외경:[800,422.7,1898] });
  맞나('오류 (여기까지)', 터짐, []);

  console.log('④ 비우고 저장하면 다시 따라간다');
  await 펴기('밴드');
  await 비우기('.opt[data-opt="밴드"] input[data-cpart="밴드"]');
  await 누르기('.opt[data-opt="밴드"] [data-optsave]');
  맞나('담긴 것이 없어졌나', await 담긴높이(), null);
  맞나('다시 셈한 값을 따라간다', (await 밴()).높이, [98]);
  // 전면밴드를 고치면 따라온다 — 되돌아갈 길이 살아 있다는 뜻이다
  await p.evaluate(() => window.__probe.set({ plinth:120 })); await 잠(400);
  맞나('전면밴드 120 → 밴드 높이가 따라온다', (await 밴()).높이, [138]);
  await p.evaluate(() => window.__probe.set({ plinth:80 })); await 잠(400);

  console.log('⑥ 보호대유격 — 칸 최대 200 · 앞에서 붙잡힌다 · 외경 안 변함');
  await 펴기('보호대');
  맞나('칸 최대', await p.evaluate(() => {
    const i = document.querySelector('.opt[data-opt="보호대"] input[data-rule="보호대유격"]');
    return i ? [i.max, i.step, i.min] : null; }), ['200', '0.5', '0']);
  const 보 = () => p.evaluate(() => { const m = window.__probe.model();
    const b2 = m.parts.find(x => x.name === '보호대');
    return { y:+b2.y.toFixed(1), 뒤끝:+(b2.y + b2.d).toFixed(1), 재단:[b2.cut.L, b2.cut.W, b2.cut.T],
             외경:[+m.외경.W.toFixed(1), +m.외경.D.toFixed(1), +m.외경.H.toFixed(1)] }; });
  맞나('유격 0', await 보(), { y:382, 뒤끝:400, 재단:[764,80,18], 외경:[800,422.7,1800] });
  await 쳐넣기('.opt[data-opt="보호대"] input[data-rule="보호대유격"]', 10);
  await 누르기('.opt[data-opt="보호대"] [data-optsave]');
  맞나('유격 10 — y 가 10 줄고 재단·외경은 그대로', await 보(),
    { y:372, 뒤끝:390, 재단:[764,80,18], 외경:[800,422.7,1800] });
  await 펴기('보호대');
  await 쳐넣기('.opt[data-opt="보호대"] input[data-rule="보호대유격"]', 200);
  await 누르기('.opt[data-opt="보호대"] [data-optsave]');
  맞나('유격 200 — 앞에서 붙잡힌다 · 안 깨진다', await 보(),
    { y:182, 뒤끝:200, 재단:[764,80,18], 외경:[800,422.7,1800] });
  맞나('담긴 숫자는 넣으신 그대로', await p.evaluate(() => window.__probe.rule().보호대유격), 200);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

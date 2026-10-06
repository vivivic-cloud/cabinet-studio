#!/usr/bin/env node
/* 10-02 사장님 말씀
     「보호대 위치를 현재의 측판끝에서 0.5mm단위로 안쪽으로 이동시킬 수 있는 옵션 부를 만들어 주세요」

     ① 보호대 상세옵션에 「보호대유격」 칸이 있다 (23px · 0.5 걸음) · 기본 0
     ② 기본 0 이면 고치기 전과 **한 톨도 같다** — 뒤끝이 측판 끝(CD)에 딱 맞는다
     ③ 저장하면 **안으로만** 물린다 — y 가 그만큼 줄고 뒤끝도 같이 줄어든다
     ④ 두께·폭·키·재단 치수는 **안 바뀐다** · 넘침은 그대로 0
     ⑤ 덮기·끼우기 둘 다 같다 · 다른 부속은 안 움직인다
     ⑥ 보호대가 없으면 칸도 없다

   돌리는 법:  node tests/보호대유격.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),rule:()=>규칙,st:()=>state};' + 못);
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
  const 칸값 = (이름, r) => p.evaluate(v => { const i = document.querySelector(`.opt[data-opt="${v.이름}"] input[data-rule="${v.r}"]`);
    return i ? i.value : null; }, { 이름, r });

  const 보 = () => p.evaluate(() => { const m = window.__probe.model();
    const b2 = m.parts.find(x => x.name === '보호대');
    return b2 ? { y:+b2.y.toFixed(2), 뒤끝:+(b2.y + b2.d).toFixed(2), 두께:+b2.d.toFixed(2),
                  폭:+b2.w.toFixed(1), 키:+b2.h.toFixed(1), 재단:[b2.cut.L, b2.cut.W, b2.cut.T],
                  넘침:+(m.넘침들 ? (m.넘침들['보호대'] || 0) : 0).toFixed(2) } : null; });
  const 몸통 = () => p.evaluate(() => window.__probe.model().parts
    .filter(x => x.name !== '보호대')
    .map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('\n'));

  console.log('⑥ 보호대가 없으면 칸도 없다');
  await 펴기('문짝');                                   // 아무 판이나 한 번 펴 본다
  맞나('보호대 줄이 아직 없다', await p.evaluate(() =>
    document.querySelectorAll('.field[data-part] .pname[data-opt="보호대"], #customList .pname[data-opt="보호대"]').length), 0);

  // 「부속추가」 로 보호대를 세운다 — 진짜 손가락으로
  await 손가락('#newPart');
  await p.keyboard.type('보호대'); await 잠(200);
  await 손가락('#btnAdd'); await 잠(500);
  맞나('보호대가 섰나', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '보호대').length), 1);

  console.log('① 칸이 있다 (23px · 0.5 걸음 · 기본 0)  ② 기본 0 이면 뒤끝이 측판 끝에 딱 맞는다');
  await 펴기('보호대');
  맞나('칸 (이름 · 열쇠 · 값)', await p.evaluate(() =>
    // ⚠ 10-06 엣지설정(§4.9846)이 네 줄을 더했다 — 그 줄에는 `input` 이 없다. **유격 줄만** 본다.
    [...document.querySelectorAll('.opt[data-opt="보호대"] .optnum')]
      .filter(e => e.querySelector('input[data-rule]')).map(e =>
      [e.querySelector('label').textContent, e.querySelector('input').dataset.rule, e.querySelector('input').value])),
    [['보호대유격', '보호대유격', '0']]);
  맞나('입력칸 크기 · 걸음', await p.evaluate(() => {
    const i = document.querySelector('.opt[data-opt="보호대"] .optnum input'); if (!i) return null;
    const r = i.getBoundingClientRect();
    return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step, i.min]; }), ['52.6×23', '0.5', '0']);
  const 처음 = await 보();
  맞나('기본 자리 (덮기 · 뒷판 2.7T)', 처음,
    { y:382, 뒤끝:400, 두께:18, 폭:764, 키:80, 재단:[764, 80, 18], 넘침:0 });
  const 몸통처음 = await 몸통();

  console.log('③④ 저장하면 안으로만 물린다 · 두께·폭·키·재단은 안 바뀐다');
  await 쳐넣기('.opt[data-opt="보호대"] input[data-rule="보호대유격"]', 2.5);
  맞나('저장 전에는 안 먹는다', await 보(), 처음);
  await 누르기('.opt[data-opt="보호대"] [data-optsave]');
  맞나('보호대유격 2.5', await 보(),
    { y:379.5, 뒤끝:397.5, 두께:18, 폭:764, 키:80, 재단:[764, 80, 18], 넘침:0 });
  await 펴기('보호대');
  await 쳐넣기('.opt[data-opt="보호대"] input[data-rule="보호대유격"]', 50);
  await 누르기('.opt[data-opt="보호대"] [data-optsave]');
  맞나('보호대유격 50 (최대)', await 보(),
    { y:332, 뒤끝:350, 두께:18, 폭:764, 키:80, 재단:[764, 80, 18], 넘침:0 });
  맞나('다른 부속은 한 톨도 안 움직인다', await 몸통() === 몸통처음, true);

  console.log('⑤ 끼우기에서도 같다');
  await p.evaluate(() => window.__probe.set({ backMode:'insert' })); await 잠(400);
  맞나('끼우기 · 유격 50', await 보(),
    { y:332, 뒤끝:350, 두께:18, 폭:764, 키:80, 재단:[764, 80, 18], 넘침:0 });
  await p.evaluate(() => { window.__probe.rule().보호대유격 = 0; window.__probe.set({}); }); await 잠(400);
  맞나('끼우기 · 유격 0 — 뒤끝이 측판 끝', await 보(),
    { y:382, 뒤끝:400, 두께:18, 폭:764, 키:80, 재단:[764, 80, 18], 넘침:0 });
  await p.evaluate(() => window.__probe.set({ backMode:'cover' })); await 잠(400);

  console.log('② 기본 0 이면 고치기 전과 한 톨도 같다');
  맞나('도로 0 이면 처음 자리', await 보(), 처음);
  맞나('옛 설정에 열쇠가 없어도 0 으로 채워진다', await p.evaluate(() =>
    window.__probe.rule().보호대유격), 0);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

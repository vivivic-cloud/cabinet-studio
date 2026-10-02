#!/usr/bin/env node
/* 10-02 사장님 말씀
     「도어옵션에 도어의 **상 하부 유격높이**를 조정하는 옵션을 만들어 주세요.
      옵션부의 기본 세팅값은 현재 **인도어/아웃도어에 따른 기본값**이 세팅되어 있어야 합니다」

     ① 도어 상세옵션에 「상부유격」·「하부유격」 두 칸이 있다 (34px · 0.5 걸음)
     ② 기본값이 모드에 따라 세팅되어 있다 — 아웃도어 2·5 · 인도어 3·3
     ③ 아웃도어 아래는 전면밴드가 없으면 `아웃아래없음`(2) 로 바뀐다
     ④ 저장하면 도면에 먹는다 — 문짝 z 가 그만큼 움직이고 재단 높이가 따라온다
     ⑤ **좌우는 안 따라 움직인다** — 인도어에서 위·아래를 갈라 `인나머지` 는 좌우만 잰다
     ⑥ 기본값에서는 고치기 전과 **한 톨도 같다**
     ⑦ 관계제어판에 **같은 줄이 없다** (두 군데 두지 않는다 · §0)

   돌리는 법:  node tests/도어유격.js
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

  const 문짝 = () => p.evaluate(() => { const m = window.__probe.model();
    const d = m.parts.filter(x => x.name === '문짝');
    return d.length ? { z:+d[0].z.toFixed(1), 높이:+d[0].h.toFixed(1), x:d.map(x => +x.x.toFixed(1)),
                        폭:+d[0].w.toFixed(1) } : null; });
  const 칸들 = () => p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="문짝"] .optnum')]
    .map(e => [e.querySelector('label').textContent, e.querySelector('input').dataset.rule,
               e.querySelector('input').value]));

  console.log('① 도어 상세옵션에 「상부유격」·「하부유격」 두 칸이 있다  ② 아웃도어 기본값 2 · 5');
  await 펴기('문짝');
  맞나('칸 (이름 · 열쇠 · 값)', await 칸들(),
    [['상부유격','아웃위','2'], ['하부유격','아웃아래걸레','5']]);
  맞나('입력칸 크기 · 걸음', await p.evaluate(() => {
    const i = document.querySelector('.opt[data-opt="문짝"] .optnum input'); if (!i) return null;
    const r = i.getBoundingClientRect();
    return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step, i.min]; }), ['52.6×34', '0.5', '0']);

  console.log('③ 전면밴드가 없으면 아래 칸이 `아웃아래없음`(2) 으로 바뀐다');
  await p.evaluate(() => window.__probe.set({ plinth:0 })); await 잠(400);
  맞나('전면밴드 0 일 때', await 칸들(), [['상부유격','아웃위','2'], ['하부유격','아웃아래없음','2']]);
  await p.evaluate(() => window.__probe.set({ plinth:80 })); await 잠(400);

  console.log('② 인도어 기본값 3 · 3');
  await p.evaluate(() => window.__probe.set({ doorMode:'in' })); await 잠(400);
  맞나('인도어일 때', await 칸들(), [['상부유격','인위','3'], ['하부유격','인아래','3']]);

  console.log('④⑤ 저장하면 먹는다 · 좌우는 안 따라 움직인다 (인도어)');
  const 인전 = await 문짝();
  맞나('인도어 기본 자리', 인전, { z:101, 높이:1678, x:[20, 401.5], 폭:377.5 });
  await 쳐넣기('.opt[data-opt="문짝"] input[data-rule="인위"]', 10);
  맞나('저장 전에는 안 먹는다', await 문짝(), 인전);
  await 누르기('.opt[data-opt="문짝"] [data-optsave]');
  맞나('상부유격 10 — 위만 내려온다 (z 그대로 · 높이 −7)', await 문짝(),
    { z:101, 높이:1671, x:[20, 401.5], 폭:377.5 });
  await 펴기('문짝');
  await 쳐넣기('.opt[data-opt="문짝"] input[data-rule="인아래"]', 8);
  await 누르기('.opt[data-opt="문짝"] [data-optsave]');
  맞나('하부유격 8 — 아래가 올라온다 (z +5 · 높이 −5)', await 문짝(),
    { z:106, 높이:1666, x:[20, 401.5], 폭:377.5 });
  맞나('좌우(인나머지)는 그대로다', await 규('인나머지'), 3);
  await p.evaluate(() => { const r = window.__probe.rule(); r.인위 = 3; r.인아래 = 3; window.__probe.set({}); });
  await 잠(400);
  맞나('도로 3·3 이면 제자리', await 문짝(), 인전);

  console.log('④ 아웃도어도 같다');
  await p.evaluate(() => window.__probe.set({ doorMode:'out' })); await 잠(400);
  const 아웃전 = await 문짝();
  맞나('아웃도어 기본 자리', 아웃전, { z:85, 높이:1713, x:[2, 402], 폭:396 });
  await 펴기('문짝');
  await 쳐넣기('.opt[data-opt="문짝"] input[data-rule="아웃위"]', 12);
  await 누르기('.opt[data-opt="문짝"] [data-optsave]');
  맞나('아웃 상부유격 12 (z 그대로 · 높이 −10)', await 문짝(), { z:85, 높이:1703, x:[2, 402], 폭:396 });
  await p.evaluate(() => { const r = window.__probe.rule(); r.아웃위 = 2; window.__probe.set({}); }); await 잠(400);

  console.log('⑥ 기본값에서는 고치기 전과 한 톨도 같다');
  맞나('문짝 자리 · 재단', await 문짝(), { z:85, 높이:1713, x:[2, 402], 폭:396 });
  맞나('부품표 문짝 줄', await p.evaluate(() => {
    const m = window.__probe.model(); const d = m.parts.find(x => x.name === '문짝');
    return [d.cut.L, d.cut.W, d.cut.T]; }), [1713, 396, 18]);

  console.log('⑦ 관계제어판에 같은 줄이 없다');
  await 누르기('#btnRules'); await 잠(400);
  맞나('관계제어판이 열렸나 · 줄 수 · 슬라이더 수', await p.evaluate(() =>
    [document.querySelector('#rulesDlg').open === true,
     document.querySelectorAll('#rTable .krow').length,
     document.querySelectorAll('#rTable [data-rule]').length]), [true, 33, 11]);
  맞나('아웃위·아웃아래걸레·아웃아래없음 줄', await p.evaluate(() =>
    ['아웃위','아웃아래걸레','아웃아래없음'].map(k => document.querySelectorAll(`#rTable [data-rule="${k}"]`).length)), [0,0,0]);
  맞나('인위·인아래 줄도 없다', await p.evaluate(() =>
    ['인위','인아래'].map(k => document.querySelectorAll(`#rTable [data-rule="${k}"]`).length)), [0,0]);
  맞나('좌우·경첩·도어사이 줄은 그대로 있다', await p.evaluate(() =>
    ['아웃좌우','인경첩','인나머지','도어사이','아웃경첩'].map(k => document.querySelectorAll(`#rTable [data-rule="${k}"]`).length)), [1,1,1,1,1]);

  await 누르기('#rX'); await 잠(300);
  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

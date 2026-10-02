#!/usr/bin/env node
/* 10-02 사장님 말씀
     「도어옵션에 도어의 **상 하부 유격높이**를 조정하는 옵션을 만들어 주세요.
      옵션부의 기본 세팅값은 현재 **인도어/아웃도어에 따른 기본값**이 세팅되어 있어야 합니다」

     ① 도어 상세옵션에 「도어 위 유격」·「도어 아래 유격」 두 칸이 있다 (23px · 0.5 걸음)
     ② 기본값이 모드에 따라 세팅되어 있다 — 아웃도어 2·5 · 인도어 3·3
     ③ **네 갈래**(인·아웃 × 전면밴드 있음·없음)에서 열어 보면 늘 지금 쓰이는 값이 들어 있다
     ④ 저장하면 도면에 먹는다 — 문짝 z 가 그만큼 움직이고 재단 높이가 따라온다
     ⑤ **좌우는 안 따라 움직인다** — 인도어에서 위·아래를 갈라 `인나머지` 는 좌우만 잰다
     ⑥ 기본값에서는 고치기 전과 **한 톨도 같다**
     ⑦ 관계제어판에 **같은 줄이 없다** (두 군데 두지 않는다 · §0) · `인나머지` 줄은 남는다
     ⑧ 도어 **재단 치수**가 유격을 따라온다 · **제품 최대 외경은 안 변한다**
     ⑨ 옛 설정의 `인나머지` 를 `인위`·`인아래` 가 **이어받는다**

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

  console.log('① 도어 상세옵션에 「도어 위 유격」·「도어 아래 유격」 두 칸이 있다  ② 아웃도어 기본값 2 · 5');
  await 펴기('문짝');
  맞나('칸 (이름 · 열쇠 · 값)', await 칸들(),
    [['도어 위 유격','아웃위','2'], ['도어 아래 유격','아웃아래걸레','5']]);
  맞나('입력칸 크기 · 걸음', await p.evaluate(() => {
    const i = document.querySelector('.opt[data-opt="문짝"] .optnum input'); if (!i) return null;
    const r = i.getBoundingClientRect();
    return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step, i.min]; }), ['52.6×23', '0.5', '0']);

  console.log('③ 네 갈래 — 열어 보면 늘 지금 쓰이는 값이 들어 있다');
  for (const [모드, 밴드, 바람] of [
      ['out', 80, [['도어 위 유격','아웃위','2'], ['도어 아래 유격','아웃아래걸레','5']]],
      ['out', 0,  [['도어 위 유격','아웃위','2'], ['도어 아래 유격','아웃아래없음','2']]],
      ['in',  80, [['도어 위 유격','인위','3'],   ['도어 아래 유격','인아래','3']]],
      ['in',  0,  [['도어 위 유격','인위','3'],   ['도어 아래 유격','인아래','3']]]]){
    await p.evaluate(v => window.__probe.set({ doorMode:v.m, plinth:v.b }), { m:모드, b:밴드 }); await 잠(400);
    맞나(`${모드 === 'in' ? '인도어' : '아웃도어'} · 전면밴드 ${밴드}`, await 칸들(), 바람);
    // 칸에 든 값이 **지금 셈에 쓰이는 그 값**인지 규칙에서 되비춰 본다
    맞나('  칸 값 = 지금 쓰는 규칙 값', await p.evaluate(() => {
      const r = window.__probe.rule();
      return [...document.querySelectorAll('.opt[data-opt="문짝"] .optnum input')]
        .map(i => +i.value === r[i.dataset.rule]); }), [true, true]);
  }
  await p.evaluate(() => window.__probe.set({ doorMode:'in', plinth:80 })); await 잠(400);

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

  맞나('`인나머지` 줄은 남는다 (좌우만 맡는다)', await p.evaluate(() => {
    const i = document.querySelector('#rTable [data-rule="인나머지"]');
    return i ? i.closest('.krow').querySelector('b').textContent : null; }), '문짝 ↔ 측판 (인도어)');
  await 누르기('#rX'); await 잠(300);

  console.log('⑧ 재단 치수가 따라온다 · 제품 최대 외경은 안 변한다');
  const 외경 = () => p.evaluate(() => { const o = window.__probe.model().외경;
    return [+o.W.toFixed(1), +o.D.toFixed(1), +o.H.toFixed(1)]; });
  const 재단 = () => p.evaluate(() => { const d = window.__probe.model().parts.find(x => x.name === '문짝');
    return [d.cut.L, d.cut.W, d.cut.T]; });
  for (const 모드 of ['out','in']){
    await p.evaluate(m => window.__probe.set({ doorMode:m, plinth:80 }), 모드); await 잠(400);
    const 전외 = await 외경(), 전재 = await 재단();
    await p.evaluate(m => { const r = window.__probe.rule();
      if (m === 'in'){ r.인위 = 9; r.인아래 = 7; } else { r.아웃위 = 9; r.아웃아래걸레 = 12; }
      window.__probe.set({}); }, 모드); await 잠(400);
    const 후재 = await 재단();
    맞나(`${모드 === 'in' ? '인도어' : '아웃도어'} 재단 L 이 유격을 따라온다`,
      [전재[0] - 후재[0], 후재[1] === 전재[1], 후재[2] === 전재[2]],
      [모드 === 'in' ? (9 - 3) + (7 - 3) : (9 - 2) + (12 - 5), true, true]);
    맞나(`${모드 === 'in' ? '인도어' : '아웃도어'} 실제 외경은 안 변한다`, await 외경(), 전외);
    await p.evaluate(m => { const r = window.__probe.rule();
      if (m === 'in'){ r.인위 = 3; r.인아래 = 3; } else { r.아웃위 = 2; r.아웃아래걸레 = 5; }
      window.__probe.set({}); }, 모드); await 잠(400);
  }

  console.log('⑨ 옛 설정의 `인나머지` 를 위·아래가 이어받는다');
  { const ctx2 = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
    await ctx2.addInitScript(() => localStorage.setItem('cabinet-studio.규칙',
      JSON.stringify({ 이름:'옛 설정', 인나머지:5, 아웃좌우:3 })));
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil:'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(600);
    맞나('옛 `인나머지` 5 → 인위·인아래 5 · 인나머지 그대로 5 · 아웃좌우 3', await p2.evaluate(() => {
      const r = window.__probe.rule(); return [r.인위, r.인아래, r.인나머지, r.아웃좌우]; }), [5, 5, 5, 3]);
    맞나('담긴 값이 있으면 그것이 이긴다', await (async () => {
      const ctx3 = await b.newContext({ viewport:{ width:375, height:780 } });
      await ctx3.addInitScript(() => localStorage.setItem('cabinet-studio.규칙',
        JSON.stringify({ 이름:'옛 설정', 인나머지:5, 인위:8 })));
      const p3 = await ctx3.newPage(); await p3.goto(주소, { waitUntil:'domcontentloaded' });
      await p3.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(500);
      const v = await p3.evaluate(() => { const r = window.__probe.rule(); return [r.인위, r.인아래]; });
      await ctx3.close(); return v; })(), [8, 5]);
    await ctx2.close(); }

  /* ⑩ 10-02 사장님 말씀: 「**서랍장 - 마이다 - 도어위유격 명칭을 상부유격, 도어아래유격 명칭을 하부유격**」.
        **화면 이름만이다** — 담는 열쇠도 값도 셈도 그대로다. 수납장 도어는 옛 이름 그대로다. */
  console.log('⑩ 서랍장 마이다는 「상부유격」·「하부유격」 · 수납장 도어는 그대로');
  { const 접기 = async 이름 => { const b2 = p.locator(`.pname[data-opt="${이름}"]`);
      if (await b2.getAttribute('aria-expanded') === 'true') await 손가락(`.pname[data-opt="${이름}"]`); };
    await p.evaluate(() => window.__probe.set({ doorMode:'out', plinth:80 })); await 잠(400);
    await 펴기('문짝');
    맞나('수납장 — 옛 이름 그대로', await 칸들(),
      [['도어 위 유격','아웃위','2'], ['도어 아래 유격','아웃아래걸레','5']]);
    await 접기('문짝');
    await 손가락('input[name="품목"][value="서랍장"]'); await 잠(600);
    await 펴기('문짝');
    맞나('서랍장 외부 — 이름만 갈린다', await 칸들(),
      [['상부유격','아웃위','2'], ['하부유격','아웃아래걸레','5']]);
    await p.evaluate(() => window.__probe.set({ doorMode:'in' })); await 잠(400);
    맞나('서랍장 내부 — 이름만 갈린다', await 칸들(),
      [['상부유격','인위','3'], ['하부유격','인아래','3']]);
    맞나('값이 먹는다 — 상부유격 9', await (async () => {
      await 쳐넣기('.opt[data-opt="문짝"] input[data-rule="인위"]', 9);
      await 누르기('.opt[data-opt="문짝"] [data-optsave]');
      return p.evaluate(() => { const m = window.__probe.model();
        const d = m.parts.filter(x => x.name === '마이다');          // 분할된 맨 윗장의 윗끝
        return [+Math.max(...d.map(q => q.z + q.h)).toFixed(1), window.__probe.rule().인위]; }); })(), [1773, 9]);
    await p.evaluate(() => { window.__probe.rule().인위 = 3; window.__probe.set({ doorMode:'out' }); }); await 잠(400);
    await 접기('문짝');
    await 손가락('input[name="품목"][value="수납장"]'); await 잠(600);
    await 펴기('문짝');
    맞나('수납장으로 돌아오면 옛 이름', await 칸들(),
      [['도어 위 유격','아웃위','2'], ['도어 아래 유격','아웃아래걸레','5']]);
    await 접기('문짝'); }

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

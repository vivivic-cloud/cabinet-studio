#!/usr/bin/env node
/* 10-01 사장님 말씀 (하판 「측판 사이」 를 짚으시고)
     「하판 옵션 측판사이 일때 하판의 전면부는 **측판과 맞는게 기본세팅** 입니다. 이는 상판의 측판위 옵션
      상태에서 측판들임으로 측판 사이즈 변경시 **유동적으로 변경**되는것이 기본세팅이며, 하판의 측판사이
      옵션시 **하판유격** 옵션이 생성되어 **측판의 안쪽으로 0.5mm단위로 줄어들게** 할 수 있어야 합니다」
     「상판의 측판사이 옵션시에도 하판유격 옵션이 생성되어야 합니다」
     「전면밴드 옵션에 **전면밴드유격** 이 … 측판안으로 0.5mm 단위로 들어가 위치 할수 있어야 합니다」
     「전면밴드의 **기본위치는 하판의 유격 세팅에 맞춰 변경**되는것이 기본위치 세팅값입니다」

     ① 하판유격 0 · 측판 들임 0 이면 예전과 한 톨도 같다
     ② 하판 앞면 = 측판 앞면 + 하판유격 — **갈래가 하나다**
     ③ 측판 들임을 고치면 하판이 **따라 움직인다**
     ④ 전면밴드 앞면 = 하판 앞면 + 전면밴드유격(`걸레앞`) — 하판을 따라간다
     ⑤ **「하판 올림」 은 10-02 에 지웠다** — 칸도 없고 담긴 옛 값도 안 먹는다
     ⑩ 옛 `하판올림` 은 **`plinth` 로 합쳐진다** — 도면이 한 톨도 안 바뀐다 (되돌리기 역사도)
     ⑥ 「하판 측판 아래」 에서는 하판 앞면 0 그대로 · 칸도 안 선다
     ⑦ 실제 외경이 안 변한다 · 재단 치수(cut.W)가 따라간다
     ⑧ 화면 — 네 갈래의 칸 · 관계제어판에서 `걸레앞` 줄이 빠졌다 · **진짜 손가락**으로 저장하면 먹는다

   돌리는 법:  node tests/하판유격.js
   three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
  await ctx.addInitScript(() => localStorage.setItem('cabinet-studio.부속', JSON.stringify([{ 이름:'보호대', T:18 }])));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(700);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x + r.width/2, y:r.y + r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(350); return true; };

  // 깊 = 하판유격 · 측 = 측판 들임(깊이) · 밴 = 전면밴드유격 · 올 = 옛 `하판올림`(이제 아무것도 안 가리킨다)
  const 재 = (깊, 측, 밴, 위 = 'inset', 아래 = 'inset', 올 = 0) => p.evaluate(v => {
    const R = window.__probe.rule();
    R.하판유격 = v.깊; R.측판깊이들임 = v.측; R.전면밴드유격 = v.밴; R.하판올림 = v.올;
    window.__probe.set({ topStyle:v.위, botStyle:v.아래, backMode:'cover', doorMode:'in', plinth:80 });
    const m = window.__probe.model(), 것 = n => m.parts.find(q => q.name === n);
    const 측판 = 것('측판'), 하 = 것('하판'), 밴드 = 것('전면밴드'), 보 = 것('보호대');
    return { 측판앞: 측판.y, 하판:[하.y, +하.d.toFixed(2), +하.cut.W.toFixed(2)],
             전면밴드: 밴드 ? [밴드.y, 밴드.h, 밴드.cut.W] : null,
             밴드틈: (밴드 && 하) ? +(하.z - (밴드.z + 밴드.h)).toFixed(2) : null,
             보호대: 보 ? [보.y, +(보.y + 보.d).toFixed(2)] : null,
             외경:[m.외경.W, m.외경.D, m.외경.H] };
  }, { 깊, 측, 밴, 위, 아래, 올 });

  console.log('① 하판유격 0 · 측판 들임 0 이면 예전과 한 톨도 같다');
  const 처음 = { 측판앞:0, 하판:[0, 400, 400], 전면밴드:[30, 80, 80], 밴드틈:0, 보호대:[382, 400], 외경:[800, 402.7, 1800] };
  맞나('기본', await 재(0, 0, 30), 처음);

  console.log('② 하판 앞면 = 측판 앞면 + 하판유격');
  for (const [깊, y] of [[0.5, 0.5], [3, 3], [10, 10]])
    맞나(`하판유격 ${깊}`, await 재(깊, 0, 30),
      Object.assign({}, 처음, { 하판:[y, 400 - y, 400 - y], 전면밴드:[30 + y, 80, 80] }));

  console.log('③ 측판 들임을 고치면 하판이 따라 움직인다 (상판이 측판 위일 때)');
  맞나('측판 들임 5', await 재(0, 5, 30, 'overlay'),
    Object.assign({}, 처음, { 측판앞:5, 하판:[5, 395, 395], 전면밴드:[35, 80, 80] }));
  맞나('측판 들임 5 · 하판유격 3', await 재(3, 5, 30, 'overlay'),
    Object.assign({}, 처음, { 측판앞:5, 하판:[8, 392, 392], 전면밴드:[38, 80, 80] }));

  console.log('④ 전면밴드 앞면 = 하판 앞면 + 전면밴드유격');
  for (const [밴, 깊] of [[0, 0], [45, 0], [45, 3], [30.5, 0]]) {
    const r = await 재(깊, 0, 밴);
    맞나(`전면밴드유격 ${밴} · 하판유격 ${깊}`, [r.하판[0], r.전면밴드[0]], [깊, 깊 + 밴]);
  }

  /* ⑤ 10-02 사장님 말씀: 「**하판올림 옵션은 전면밴드 사이즈높이 설정과 겹치므로 삭제**해 주세요」.
        그래서 칸도 열쇠도 없앴다. 담긴 옛 값은 **아무것도 안 가리킨다**(경첩 좌·우와 같은 길 · §4.94). */
  console.log('⑤ 「하판 올림」 은 지웠다 — 담긴 옛 값이 아무것도 안 가리킨다');
  for (const 올 of [2, 5, 12.5]) {
    const r = await 재(0, 0, 30, 'inset', 'inset', 올);
    맞나(`옛 하판올림 ${올} — 전면밴드 키·재단 · 틈 · 하판 밑면(다 그대로)`,
      [r.전면밴드[1], r.전면밴드[2], r.밴드틈, r.하판[0]], [80, 80, 0, 0]);
  }
  { const r = await 재(3, 0, 30, 'inset', 'inset', 2);
    맞나('옛 하판올림 2 · 하판유격 3 — 하판유격만 먹는다', [r.하판[0], r.하판[1], r.전면밴드[0], r.전면밴드[1], r.밴드틈],
      [3, 397, 33, 80, 0]); }
  await 재(0, 0, 30);

  console.log('⑥ 「하판 측판 아래」 에서는 앞면 0 그대로 (전면밴드·보호대가 아예 없다 · §4.9892)');
  맞나('측판 아래 · 하판유격 10', await 재(10, 0, 30, 'inset', 'under'),
    { 측판앞:0, 하판:[0, 400, 400], 전면밴드:null, 밴드틈:null, 보호대:null, 외경:[800, 402.7, 1800] });

  console.log('⑦ 실제 외경이 안 변한다 · 보호대는 뒤끝에 맞춰 안 따라간다 (§4.87)');
  for (const [깊, 측, 위] of [[0,0,'inset'], [10,0,'inset'], [0,5,'overlay'], [10,5,'overlay'], [50,0,'inset']]) {
    const r = await 재(깊, 측, 30, 위);
    맞나(`하판유격 ${깊} · 측판 들임 ${측} — 외경 · 보호대`, [r.외경, r.보호대], [[800, 402.7, 1800], [382, 400]]);
  }
  await 재(0, 0, 30);

  console.log('⑧ 화면 — 칸이 서는 자리 · 관계제어판에서 빠졌다 · 진짜 손가락으로 저장하면 먹는다');
  { const 판줄 = async (위, 아래, 이름) => { await p.evaluate(v => {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        window.__probe.set({ topStyle:v.위, botStyle:v.아래 }); }, { 위, 아래 }); await 잠(350);
      const b2 = p.locator(`.pname[data-opt="${이름}"]`);
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${이름}"]`);
      const r = await p.evaluate(n => [...document.querySelectorAll(`.opt[data-opt="${n}"] .optnum label`)].map(l => l.textContent), 이름);
      await 손가락(`.pname[data-opt="${이름}"]`); return r; };
    맞나('하판 판 — 상판 사이 · 하판 사이', await 판줄('inset', 'inset', '하판'), ['하판유격']);
    맞나('하판 판 — 상판 **위** · 하판 사이 (상판과 상관없이 선다)', await 판줄('overlay', 'inset', '하판'), ['하판유격']);
    맞나('하판 판 — 하판 측판 아래', await 판줄('inset', 'under', '하판'), []);
    맞나('하판 판 — 상판 위 · 하판 아래', await 판줄('overlay', 'under', '하판'), []);
    맞나('전면밴드 판', await 판줄('inset', 'inset', '전면밴드'), ['전면밴드유격']);
    맞나('관계제어판에 `걸레앞` 줄', await p.evaluate(() => { document.querySelector('#btnRules').click();
      const n = document.querySelectorAll('#rTable input[data-rule="걸레앞"]').length;
      const d = document.querySelector('#rulesDlg'); if (d && d.open) d.close(); return n; }), 0);

    const 펴 = async n => { const b2 = p.locator(`.pname[data-opt="${n}"]`);
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${n}"]`); };
    await 펴('하판');
    const 자 = '.opt[data-opt="하판"] input[data-rule="하판유격"]';
    맞나('하판유격 칸 크기 · 걸음', await p.evaluate(x => { const i = document.querySelector(x);
      if (!i) return null; const r = i.getBoundingClientRect();
      return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step]; }, 자), ['52.6×23', '0.5']);
    if (await p.locator(자).count()){
      await 손가락(자);
      await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
      await p.keyboard.type('2.5'); await 잠(300);
      맞나('치는 동안에는 안 먹는다 (§4.9893)',
        await p.evaluate(() => window.__probe.model().parts.find(q => q.name === '하판').y), 0);
      await 손가락('.opt[data-opt="하판"] [data-optsave]');
      맞나('저장하면 먹는다 — 하판 앞면 · 전면밴드 앞면', await p.evaluate(() => { const m = window.__probe.model();
        return [m.parts.find(q => q.name === '하판').y, m.parts.find(q => q.name === '전면밴드').y]; }), [2.5, 32.5]);
    } else 맞나('하판 판에 「하판유격」 칸이 있나', false, true);
    await p.evaluate(() => { window.__probe.rule().하판유격 = 0; window.__probe.set({}); }); await 잠(300); }

  console.log('⑨ 옛 `걸레앞` 은 숫자 그대로 「전면밴드유격」 이 된다');
  { const ctx2 = await b.newContext({ viewport:{ width:375, height:780 } });
    await ctx2.addInitScript(() => localStorage.setItem('cabinet-studio.규칙',
      JSON.stringify({ 이름:'옛 설정', 걸레앞:45, 아웃좌우:3 })));
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(600);
    맞나('옛 설정 {걸레앞:45} — 전면밴드유격 · 옛 열쇠 · 다른 값 · 전면밴드 y',
      await p2.evaluate(() => { const R = window.__probe.rule();
        return [R.전면밴드유격, R.걸레앞 === undefined, R.아웃좌우,
                window.__probe.model().parts.find(q => q.name === '전면밴드').y]; }), [45, true, 3, 45]);
    await ctx2.close(); }

  /* ⑩ 10-02 관리자 — **그냥 지우면 사장님 도면의 하판이 그만큼 뚝 떨어진다.**
        둘이 같은 일을 하므로 담긴 `하판올림` 을 `plinth` 에 **합치고** 열쇠를 버린다. 도면은 한 톨도 안 바뀐다. */
  console.log('⑩ 옛 `하판올림` 은 `plinth` 로 합쳐진다 — 도면이 안 바뀐다');
  { const 열기 = async (올, pl, 아래, 다시) => {
      const c = await b.newContext({ viewport:{ width:375, height:780 } });
      await c.addInitScript(`localStorage.setItem('cabinet-studio.품목','수납장');
        localStorage.setItem('cabinet-studio.수납장.규칙', JSON.stringify({이름:'옛 설정', 하판올림:${올}, 아웃좌우:3}));
        localStorage.setItem('cabinet-studio.수납장.상태', JSON.stringify({plinth:${pl}, botStyle:'${아래}'}));`);
      const q = await c.newPage();
      await q.goto(주소, { waitUntil:'domcontentloaded' });
      await q.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(600);
      if (다시){ await q.reload({ waitUntil:'domcontentloaded' });
        await q.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(600); }
      const r = await q.evaluate(() => { const m = window.__probe.model(), R = window.__probe.rule(), S = window.__probe.st();
        const 밴 = m.parts.find(x => x.name === '전면밴드');
        return [S.plinth, R.하판올림 === undefined, m.bz, 밴 ? 밴.h : null, R.이름, R.아웃좌우]; });
      await c.close(); return r; };
    맞나('하판올림 20 · plinth 80 → 합쳐진다', await 열기(20, 80, 'inset', false),
      [100, true, 100, 100, '옛 설정', 3]);
    맞나('다시 열어도 또 안 더해진다', await 열기(20, 80, 'inset', true),
      [100, true, 100, 100, '옛 설정', 3]);
    맞나('하판올림 0 — 아무것도 안 더한다', await 열기(0, 80, 'inset', false),
      [80, true, 80, 80, '옛 설정', 3]);
    맞나('「측판 아래」 — 전면밴드가 없으니 도면이 안 변한다', await 열기(20, 80, 'under', false),
      [100, true, 0, null, '옛 설정', 3]);

    // 되돌리기 역사에 담긴 옛 한 벌도 같은 길로 지나간다
    const 옛한벌 = JSON.stringify({ 규칙:{ 이름:'옛 설정', 하판올림:20, 아웃좌우:3 }, 부속:[],
      손질:{ 숨김:[], 지움:[], 복제:{} }, 지난부속:[], 결:{}, 상태:{ plinth:80 } });
    const c2 = await b.newContext({ viewport:{ width:375, height:780 }, hasTouch:true, isMobile:true });
    await c2.addInitScript(`localStorage.setItem('cabinet-studio.품목','수납장');
      localStorage.setItem('cabinet-studio.수납장.역사', JSON.stringify([${JSON.stringify(옛한벌)}]));`);
    const q2 = await c2.newPage(); const cdp2 = await c2.newCDPSession(q2);
    await q2.goto(주소, { waitUntil:'domcontentloaded' });
    await q2.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    { const e = await q2.$('#btnUndo'); if (e){ const r = await e.boundingBox();
        await cdp2.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x + r.width/2, y:r.y + r.height/2 }] });
        await cdp2.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(700); } }
    맞나('되돌리기 역사의 옛 한 벌도 합쳐진다', await q2.evaluate(() => {
      const m = window.__probe.model(), R = window.__probe.rule(), S = window.__probe.st();
      return [S.plinth, R.하판올림 === undefined, m.bz,
              m.parts.find(x => x.name === '전면밴드').h, R.이름]; }), [100, true, 100, 100, '옛 설정']);
    await c2.close(); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 10-02 사장님 말씀 (「NRS · 전면밴드」 를 짚으시고)
     「**하판이 측판사이 인경우 전면밴드에 두가지 형태를 선택**하게 해줘 **하판아래/하판커버** 두가지 이고
      하판아래는 지금과 같은 방식이고 **하판커버는 전면밴드가 하판의 전면을 막는 스타일**이야.
      이때 **전면밴드의 유격에 따라 하판의 깊이가 조정**되어야 하고 이때의 옵션으로 **전면밴드유격은
      전면밴드가 0.5mm단위로 하판의 위로 위치** 하게 해줘. 이때 **전면밴드의 설정 사이즈는 변동이 되면 안 되고**
      실상은 **전면밴드 뒤로 숨은 하판이 아래로 내려가는** 형태가 되는거지」

     ① 하판아래(기본)가 예전과 한 톨도 같다
     ② 고르개 — 전면밴드 판 안 · 44px · 「측판 아래」·전면밴드 0 에서는 안 보인다
     ③ 하판커버 유격 0 — 밴드 윗면과 하판 윗면이 같은 높이
     ④ 유격을 키우면 하판만 더 내려간다 · **밴드 높이는 설정값 그대로**(부품표도)
     ⑤ 하판 깊이가 밴드 두께만큼 줄고 재단 치수가 따라간다 · 밴드는 앞면에 딱 선다
     ⑥ 유격을 아주 크게 넣어도 0 에서 멈추고 안 깨진다 · **담긴 숫자는 그대로**
     ⑦ 실제 외경이 한 톨도 안 변한다
     ⑧ 열쇠가 갈린다 — 하판아래 `전면밴드유격`(앞뒤) · 하판커버 `밴드커버유격`(위아래) · 서로 안 덮어쓴다
     ⑨ `bz` 를 따라가는 것들 — 보호대 키 · 도어 아랫끝 · 뒷판 아랫끝 · 안쪽 높이
     ⑩ **전면밴드는 측판보다 앞설 수 없다** (10-03 사장님 판정) — 64갈래에서 앞선 것 0 ·
        밴드 앞면 = 측판 앞면 · **밴드 뒤와 하판 앞이 안 겹친다** · `측판깊이들임` 0 이면 예전 그대로

   돌리는 법:  node tests/전면밴드꼴.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'build:(x)=>buildModel(x),st:()=>state,rule:()=>규칙,bom:()=>bomRows(buildModel(state))};' + 못);
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
  await ctx.addInitScript(() => localStorage.setItem('cabinet-studio.수납장.부속',
    JSON.stringify([{ 이름:'보호대', T:18 }])));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(800);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x + r.width/2, y:r.y + r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(350); return true; };

  // 꼴 = 하판아래|하판커버 · 유 = 밴드커버유격 · 더 = 덮어쓸 state
  const 재 = (꼴, 유, 더 = {}) => p.evaluate(v => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const R = window.__probe.rule(); R.밴드커버유격 = v.유;
    window.__probe.set(Object.assign({ 밴드꼴:v.꼴, botStyle:'inset', topStyle:'inset', backMode:'cover',
      doorMode:'out', plinth:80, Tbot:18, Tplinth:18, doors:2 }, v.더));
    const m = window.__probe.model(), 것 = n => m.parts.find(q => q.name === n);
    const 하 = 것('하판'), 밴 = 것('전면밴드'), 보 = 것('보호대'), 문 = 것('문짝'), 뒤 = 것('뒷판');
    const 표 = window.__probe.bom(), 줄 = n => { const r = 표.find(x => x.name === n); return r ? [r.L, r.W, r.T] : null; };
    return { bz:m.bz,
      하판:[하.y, +하.d.toFixed(2), 하.z, +(하.z + 하.h).toFixed(2)], 하판재단:줄('하판'),
      밴드:밴 ? [밴.y, 밴.z, 밴.h] : null, 밴드재단:줄('전면밴드'),
      보호대:보 ? [보.z, 보.h] : null, 문짝아래:문 ? 문.z : null, 뒷판아래:뒤.z,
      innerH:+m.innerH.toFixed(2), 외경:[m.외경.W, m.외경.D, m.외경.H] };
  }, { 꼴, 유, 더 });

  console.log('① 하판아래(기본)가 예전과 한 톨도 같다');
  const 아래 = { bz:80, 하판:[0, 400, 80, 98], 하판재단:[764, 400, 18], 밴드:[30, 0, 80], 밴드재단:[764, 80, 18],
                 보호대:[0, 80], 문짝아래:85, 뒷판아래:82, innerH:1684, 외경:[800, 422.7, 1800] };
  맞나('하판아래 · 유격 0', await 재('하판아래', 0), 아래);
  맞나('하판아래 — 유격을 넣어도 한 톨도 안 움직인다', await 재('하판아래', 30), 아래);
  맞나('처음 꼴은 하판아래다', await p.evaluate(() => window.__probe.st().밴드꼴), '하판아래');

  console.log('③④⑤ 하판커버 — 밴드는 그대로 서고 하판만 내려간다');
  const 커버 = (bz, 윗면) => ({ bz, 하판:[18, 382, bz, 윗면], 하판재단:[764, 382, 18],
    밴드:[0, 0, 80], 밴드재단:[764, 80, 18], 보호대:[0, bz], 문짝아래:bz + 5, 뒷판아래:bz + 2,
    innerH:+(1782 - (bz + 18)).toFixed(2), 외경:[800, 422.7, 1800] });
  맞나('유격 0 — 하판 윗면 80 = 밴드 윗면 80', await 재('하판커버', 0), 커버(62, 80));
  맞나('유격 0.5', await 재('하판커버', 0.5), 커버(61.5, 79.5));
  맞나('유격 10 — 하판이 10 더 내려간다', await 재('하판커버', 10), 커버(52, 70));
  맞나('유격 30', await 재('하판커버', 30), 커버(32, 50));
  { const r = await 재('하판커버', 0, { Tplinth:25 });
    맞나('밴드 25T — 하판이 25 뒤에서 시작하고 깊이가 375', [r.하판, r.하판재단, r.밴드, r.밴드재단],
      [[25, 375, 62, 80], [764, 375, 18], [0, 0, 80], [764, 80, 25]]); }
  { const r = await 재('하판커버', 0, { plinth:120 });
    맞나('전면밴드 120 — 밴드 높이 120 그대로 · 하판 윗면 120', [r.밴드[2], r.밴드재단[1], r.하판[3], r.bz],
      [120, 120, 120, 102]); }
  { const r = await 재('하판커버', 0, { Tbot:25 });
    맞나('하판 25T — 윗면은 밴드 윗면 그대로', [r.bz, r.하판[3]], [55, 80]); }

  console.log('⑥ 아주 큰 유격 — 0 에서 멈추고 담긴 숫자는 그대로다');
  for (const [유, bz] of [[62, 0], [62.5, 0], [200, 0]])
    맞나(`유격 ${유} — bz · 밴드 높이 · 외경`, await p.evaluate(v => {
      const R = window.__probe.rule(); R.밴드커버유격 = v;
      window.__probe.set({ 밴드꼴:'하판커버' });
      const m = window.__probe.model();
      return [m.bz, m.parts.find(q => q.name === '전면밴드').h, [m.외경.W, m.외경.D, m.외경.H], R.밴드커버유격];
    }, 유), [bz, 80, [800, 422.7, 1800], 유]);

  console.log('⑦ 실제 외경이 한 톨도 안 변한다 (여덟 갈래)');
  { const 본 = [];
    for (const 꼴 of ['하판아래', '하판커버']) for (const 유 of [0, 10, 62])
      for (const [뒤, 문] of [['cover','out'], ['cover','in'], ['insert','out'], ['insert','in']]) {
        const r = await 재(꼴, 유, { backMode:뒤, doorMode:문 });
        본.push(r.외경.join('×')); }
    맞나('외경 갈래', [...new Set(본)].sort(), ['800×400×1800', '800×402.7×1800', '800×420×1800', '800×422.7×1800']); }

  console.log('⑨ 하판커버는 하판이 측판 사이일 때만 — 「측판 아래」·전면밴드 0 에서는 안 먹는다');
  맞나('측판 아래', await 재('하판커버', 10, { botStyle:'under' }),
    { bz:0, 하판:[0, 400, 0, 18], 하판재단:[800, 400, 18], 밴드:null, 밴드재단:null, 보호대:null,
      문짝아래:2, 뒷판아래:2, innerH:1764, 외경:[800, 422.7, 1800] });
  맞나('전면밴드 0', await p.evaluate(() => {
    window.__probe.rule().밴드커버유격 = 10;
    window.__probe.set({ 밴드꼴:'하판커버', botStyle:'inset', plinth:0 });
    const m = window.__probe.model();
    return [m.bz, !!m.parts.find(q => q.name === '전면밴드')]; }), [0, false]);
  await 재('하판아래', 0);

  console.log('② 화면 — 고르개가 전면밴드 판 안 · 44px · 「측판 아래」 에서는 안 보인다');
  { const 펴 = async () => { const b2 = p.locator('.pname[data-opt="전면밴드"]');
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락('.pname[data-opt="전면밴드"]'); };
    const 접 = async () => { const b2 = p.locator('.pname[data-opt="전면밴드"]');
      if (await b2.getAttribute('aria-expanded') === 'true') await 손가락('.pname[data-opt="전면밴드"]'); };
    await 펴();
    맞나('고르개 — 글 · 닿는 자리', await p.evaluate(() =>
      [...document.querySelectorAll('.opt[data-opt="전면밴드"] input[name="밴드꼴"]')].map(i => {
        const l = i.closest('label');
        return [l.textContent.trim(), getComputedStyle(l, '::after').height]; })),
      [['하판아래', '44px'], ['하판커버', '44px']]);
    맞나('다른 판에는 없다', await p.evaluate(() =>
      document.querySelectorAll('.opt:not([data-opt="전면밴드"]) input[name="밴드꼴"]').length), 0);
    await 접();
    await p.evaluate(() => window.__probe.set({ botStyle:'under' })); await 잠(350); await 펴();
    맞나('「측판 아래」 — 고르개 0개', await p.evaluate(() =>
      document.querySelectorAll('.opt[data-opt="전면밴드"] input[name="밴드꼴"]').length), 0);
    await 접();
    await p.evaluate(() => window.__probe.set({ botStyle:'inset', plinth:0 })); await 잠(350); await 펴();
    맞나('전면밴드 0 — 고르개 0개', await p.evaluate(() =>
      document.querySelectorAll('.opt[data-opt="전면밴드"] input[name="밴드꼴"]').length), 0);
    await 접();
    await p.evaluate(() => window.__probe.set({ plinth:80 })); await 잠(350);
    // ⚠ 10-03 — 폰 좌우 여백 0(§4.9862) 뒤로는 **가로로 굴러가나**로 잰다.
    맞나('375 · 손가락으로 가로로 밀리나', await p.evaluate(() => { const n = document.querySelector('.params');
      const c = getComputedStyle(n); n.scrollLeft = 999; const v = n.scrollLeft; n.scrollLeft = 0;
      return (c.overflowX === 'auto' || c.overflowX === 'scroll') ? v : 0; }), 0); }

  console.log('⑧ 유격 칸이 가리키는 열쇠가 꼴에 따라 갈린다 · 진짜 손가락으로 저장하면 먹는다');
  { const 펴 = async () => { const b2 = p.locator('.pname[data-opt="전면밴드"]');
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락('.pname[data-opt="전면밴드"]'); };
    const 열쇠 = () => p.evaluate(() =>
      [...document.querySelectorAll('.opt[data-opt="전면밴드"] input[data-rule]')].map(i => i.dataset.rule));
    await 펴();
    맞나('하판아래 — 앞뒤 열쇠', await 열쇠(), ['전면밴드유격']);
    await 손가락('.opt[data-opt="전면밴드"] input[value="하판커버"]');
    맞나('하판커버 — 위아래 열쇠', await 열쇠(), ['밴드커버유격']);
    맞나('고른 것이 담겼다', await p.evaluate(() => window.__probe.st().밴드꼴), '하판커버');
    const 자 = '.opt[data-opt="전면밴드"] input[data-rule="밴드커버유격"]';
    if (await p.locator(자).count()){
      await 손가락(자);
      await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
      await p.keyboard.type('12.5'); await 잠(300);
      맞나('칸에 들어갔나', await p.evaluate(x => document.querySelector(x).value, 자), '12.5');
      맞나('칸 크기 · 걸음', await p.evaluate(x => { const i = document.querySelector(x);
        if (!i) return null; const r = i.getBoundingClientRect();
        return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step]; }, 자), ['52.6×23', '0.5']);
      맞나('치는 동안에는 안 먹는다 (§4.9893)',
        await p.evaluate(() => window.__probe.model().bz), 62);
      await 손가락('.opt[data-opt="전면밴드"] [data-optsave]');
      맞나('저장하면 먹는다 — bz · 밴드 높이', await p.evaluate(() => { const m = window.__probe.model();
        return [m.bz, m.parts.find(q => q.name === '전면밴드').h]; }), [49.5, 80]);
    } else 맞나('전면밴드 판에 「전면밴드유격」 칸이 있나', false, true);
    // 앞뒤 열쇠는 안 덮어썼다 — 하판아래로 돌아오면 그대로다
    맞나('옛 `전면밴드유격` 은 그대로 30', await p.evaluate(() => window.__probe.rule().전면밴드유격), 30);
    await 재('하판아래', 0);
    맞나('하판아래로 돌아오면 밴드 앞면 30 · 하판 깊이 400',
      await p.evaluate(() => { const m = window.__probe.model();
        return [m.parts.find(q => q.name === '전면밴드').y, m.parts.find(q => q.name === '하판').d]; }), [30, 400]); }

  /* ⑩ 10-03 사장님 판정: 「**전면밴드는 측판보다 앞설 수 없어**」
     커버 꼴의 밴드 앞면이 `0`(몸통 맨 앞)으로 박혀 있어 `측판깊이들임` 을 켠 만큼 밴드가 측판보다 앞섰다.
     ⚠ 밴드 앞면을 `측깊들` 로 옮길 때 **하판 앞면도 `측깊들 + Tplinth` 로 같이 옮겨야 한다** —
        안 옮기면 밴드 뒤와 하판 앞이 `측깊들` 만큼 겹친다. 그 둘을 한 벌로 못 박는다. */
  {
    const ctx2 = await b.newContext({ viewport:{ width:1280, height:900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil:'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(600);
    console.log('⑩ 전면밴드는 측판보다 앞설 수 없다 (10-03 사장님 판정)');
    const 쓸기 = () => p2.evaluate(() => {
      const 기본 = JSON.parse(JSON.stringify(window.__probe.rule()));
      let 앞선것 = 0, 밴하겹침 = 0, 갈래 = 0; const 표 = {};
      for (const a of ['하판아래','하판커버']) for (const c of ['inset','overlay'])
        for (const d of ['inset','under']) for (const e of [0, 12.5])
          for (const f of [0, 2]) for (const g of ['out','in']){
            Object.assign(window.__probe.rule(), 기본, { 측판깊이들임: e });
            const m = window.__probe.build(Object.assign({}, window.__probe.st(),
              { 밴드꼴:a, topStyle:c, botStyle:d, doors:f, doorMode:g }));
            갈래++;
            const S = m.parts.find(q => q.name === '측판'), B = m.parts.find(q => q.name === '전면밴드'),
                  H = m.parts.find(q => q.name === '하판');
            if (!B) continue;
            if (S && S.y - B.y > 0.001) 앞선것++;
            // 판끼리 진짜로 겹치는가 — 세 축이 다 겹쳐야 겹침이다
            if (H){ const ox = Math.min(B.x+B.w, H.x+H.w) - Math.max(B.x, H.x);
              const oy = Math.min(B.y+B.d, H.y+H.d) - Math.max(B.y, H.y);
              const oz = Math.min(B.z+B.h, H.z+H.h) - Math.max(B.z, H.z);
              if (ox > 0.001 && oy > 0.001 && oz > 0.001) 밴하겹침++; }
            const k = [a, c, '깊들'+e].join('·');
            if (!표[k]) 표[k] = { 측판앞:S ? S.y : null, 밴드앞:+B.y.toFixed(2),
              밴드뒤:+(B.y+B.d).toFixed(2), 하판앞:H ? +H.y.toFixed(2) : null,
              외경:[m.외경.W, +m.외경.D.toFixed(2), m.외경.H].join('×') };
          }
      Object.assign(window.__probe.rule(), 기본);
      return { 갈래, 앞선것, 밴하겹침, 표 };
    });
    const z = await 쓸기();
    맞나('64갈래 · 밴드가 측판보다 앞선 것 · 밴드↔하판 겹침',
      [z.갈래, z.앞선것, z.밴하겹침], [64, 0, 0]);
    맞나('하판커버 · 상판 위 · 측판 들임 12.5 — 측판앞 · 밴드앞 · 밴드뒤 · 하판앞',
      [z.표['하판커버·overlay·깊들12.5'].측판앞, z.표['하판커버·overlay·깊들12.5'].밴드앞,
       z.표['하판커버·overlay·깊들12.5'].밴드뒤, z.표['하판커버·overlay·깊들12.5'].하판앞],
      [12.5, 12.5, 30.5, 30.5]);
    맞나('측판 들임 0 이면 예전 그대로 — 밴드앞 0 · 하판앞 18',
      [z.표['하판커버·overlay·깊들0'].밴드앞, z.표['하판커버·overlay·깊들0'].하판앞], [0, 18]);
    맞나('하판아래는 한 톨도 안 바뀐다 — 밴드앞 30 · 하판앞 0',
      [z.표['하판아래·inset·깊들0'].밴드앞, z.표['하판아래·inset·깊들0'].하판앞], [30, 0]);
    맞나('실제 외경은 그대로다', [...new Set(Object.values(z.표).map(x => x.외경))], ['800×402.7×1800']);
    await ctx2.close();
  }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

#!/usr/bin/env node
/* 10-09 사장님 말씀: 「**제작도면에 스펙서를 추가해서 제시한 사진과 같은 양식의 제품스펙서가 생성되게 해줘**」
   보여 주신 사진 — Volumen 「Aspen / Armchair AS10S」 제품 스펙서 한 장(Page 02 / 04).

     ① **1쪽 바로 뒤**에 「제품 스펙서」 한 쪽이 는다 — 1쪽 차례·썸네일·「크게」 까지 (진짜 손가락)
     ② 사진 양식의 **여섯 켜**가 다 있다 — 상표 · 「제품 스펙서」 · 제품명 · 사양표 · 치수 띠 ·
        선 도면 셋(측면·정면·평면) · 바닥 글
     ③ 사양표 값이 설정을 따라간다 — 두께 · 결합 방식 · 뒷판 · 도어 · 엣지 · 결
     ④ 치수 띠 값이 **모델 값과 같다**(높이 · 내부 폭 · 내부 높이 · 선반 간격)
     ⑤ 여덟 갈래에서 **A4(210×297) 밖으로 한 톨도 안 나가고 글자가 안 겹친다**(폰 375)
     ⑥ **이미 나가던 것이 한 톨도 안 바뀐다** — 부속 쪽 이름·차례 · 부속 쪽 그림 md5 · 재단 치수 일곱 줄
     ⑦ 부속이 하나도 없으면 **쪽도 없다**
     ⑧ 품목구분명이 이긴다 · 서랍장에서는 「가로대 · 마이다」 로 적힌다

   돌리는 법:  node tests/스펙서.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');

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
    'rule:()=>규칙,st:()=>state,행:()=>부속행들(buildModel(state)),본:(n)=>본이름(n),손질:()=>손질,' +
    '쪽:()=>부속쪽들(buildModel(state)),결:()=>결설정};' + 못);
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
const md5 = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);

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
  await p.evaluate(() => { const a = document.querySelector('.app'); a.classList.remove('m3d'); a.classList.add('m2d'); });
  await 잠(400);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(340); return true; };
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(700); };
  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(400); };

  const 쪽들 = () => p.evaluate(() => window.__probe.쪽().map(z => z.이름들.join('·')));
  // 스펙서 쪽의 글자를 그대로 뽑는다. 쪽이 없으면 null.
  const 스펙글 = () => p.evaluate(() => {
    const z = window.__probe.쪽()[0];
    // ⚠ 고치기 전 판에는 이 쪽이 **아예 없다** — 널로 돌리면 시험이 터져 깨진 수를 못 센다(§4.9842 의 그 자리).
    if (!z || z.이름들.join('') !== '제품 스펙서') return { 글:[], 있나:false, 길이:0 };
    const 글 = [...z.svg.matchAll(/>([^<>]+)<\/text>/g)].map(x => x[1]);
    const 값 = 이름 => { const i = 글.indexOf(이름); return i < 0 ? null : 글[i+1]; };
    return { 글, 있나:true, 길이: z.svg.length };
  });
  const 값 = (g, 이름) => { const i = g.글.indexOf(이름); return i < 0 ? null : g.글[i+1]; };

  console.log('① 1쪽 바로 뒤에 「제품 스펙서」 한 쪽');
  맞나('쪽 차례 (부속쪽들)', await 쪽들(), ['제품 스펙서', '측판·상판', '하판·문짝·고정선반', '전면밴드·뒷판']);
  맞나('1쪽 차례에 든다', await p.evaluate(() => [...document.querySelectorAll('.toc > div')].map(d => d.textContent)),
       ['1쪽전체 도면', '2쪽제품 스펙서', '3쪽측판 · 상판', '4쪽하판 · 문짝 · 고정선반', '5쪽전면밴드 · 뒷판']);
  맞나('썸네일 수', await p.evaluate(() => document.querySelectorAll('#thumbs button').length), 5);
  await 손가락('#thumbs button[data-th="1"]');
  맞나('손가락으로 골라 보는 쪽', await p.evaluate(() => (document.querySelector('#pageBox > .page.보는쪽 .pnum')||{}).textContent), '2 / 5');
  const 큰 = await p.$('#pageBox > .page.보는쪽 button.big');
  맞나('「크게」 단추 크기', await 큰.boundingBox().then(r => [Math.round(r.width), Math.round(r.height)]), [56, 44]);
  await 손가락('#pageBox > .page.보는쪽 button.big');
  맞나('「크게」 가 그 쪽을 연다', await p.evaluate(() => [ !!document.querySelector('#zoomDlg').open,
       (document.querySelector('#zoomTitle')||{}).textContent || '' ]), [true, '2쪽 · 제품 스펙서']);
  await p.evaluate(() => document.querySelector('#zoomDlg').close()); await 잠(300);

  console.log('② 사진 양식의 여섯 켜');
  let g = await 스펙글();
  맞나('스펙서 쪽이 있나', g.있나, true);
  맞나('① 머리 — 상표 · 제품 스펙서 · 품명', g.글.slice(0, 3), ['NRS', '제품 스펙서', '수납장']);
  맞나('② 제품명 · 치수', [g.글[3], g.글[4]], ['수납장', '수납장 · W800 × D400 × H1800']);
  맞나('③ 사양표 머리', g.글.includes('사양'), true);
  맞나('④ 치수 띠 네 이름', ['높이','내부 폭','내부 높이','선반 간격'].map(n => g.글.includes(n)), [true,true,true,true]);
  맞나('⑤ 선 도면 셋', ['측면','정면','평면'].map(n => g.글.includes(n)), [true,true,true]);
  맞나('⑥ 바닥 글', [g.글.includes('제3각법 · 치수 mm'), g.글.includes('재단 여유 미포함')], [true,true]);
  맞나('쪽 번호는 안 적는다 (.pnum 이 이미 있다)', g.글.some(t => /^\d+ \/ \d+$/.test(t)), false);

  console.log('③ 사양표 값이 설정을 따라간다');
  맞나('기본 — 측판·상판·하판', [값(g,'측판'), 값(g,'상판'), 값(g,'하판')],
       ['18T', '18T · 측판 사이', '18T · 측판 사이']);
  맞나('기본 — 고정선반·문짝·전면밴드·뒷판', [값(g,'고정선반'), 값(g,'문짝'), 값(g,'전면밴드'), 값(g,'뒷판')],
       ['3단 · 18T', '2짝 · 아웃도어', '80 · 18T', '2.7T · 덮기']);
  맞나('기본 — 엣지 · 우라홈 없음 · 결 없음',
       [값(g,'엣지'), g.글.includes('우라홈'), g.글.includes('결 방향')], ['필름 1 · RT 0.5', false, false]);
  await 두기({ backMode:'insert', topStyle:'overlay', botStyle:'under', Tside:25, doors:1, doorMode:'in', shelvesM:2 });
  g = await 스펙글();
  맞나('바꾼 뒤 — 측판·상판·하판', [값(g,'측판'), 값(g,'상판'), 값(g,'하판')],
       ['25T', '18T · 측판 위', '18T · 측판 아래']);
  맞나('바꾼 뒤 — 이동선반·문짝·뒷판·우라홈',
       [값(g,'이동선반'), 값(g,'문짝'), 값(g,'뒷판'), 값(g,'우라홈')],
       ['2단 · 18T', '1짝 · 인도어', '2.7T · 끼우기', '9']);
  맞나('전면밴드는 「측판 아래」 에서 사라진다', g.글.includes('전면밴드'), false);
  await 두기({ backMode:'cover', topStyle:'inset', botStyle:'inset', Tside:18, doors:2, doorMode:'out', shelvesM:0 });

  console.log('④ 치수 띠 값이 모델 값과 같다');
  const 모 = await p.evaluate(() => { const m = window.__probe.model(), s = window.__probe.st();
    const f = n => { const r = Math.round(n*10)/10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
    return [f(s.H), f(m.innerW), f(m.innerH), f(m.pitch)]; });
  g = await 스펙글();
  맞나('높이·내부 폭·내부 높이·선반 간격',
       [값(g,'높이'), 값(g,'내부 폭'), 값(g,'내부 높이'), 값(g,'선반 간격')], 모);

  console.log('⑤ 여덟 갈래 — A4 밖 0 · 글자 겹침 0 (폰 375)');
  const 재기 = async () => p.evaluate(() => {
    const sp = document.querySelector('#pageBox > .page.보는쪽 svg.pg');
    if (!sp) return { 밖:-1, 겹:-1 };
    let 밖 = 0; const 안 = (x,y) => x >= -0.01 && x <= 210.01 && y >= -0.01 && y <= 297.01;
    sp.querySelectorAll('line').forEach(l => ['1','2'].forEach(i => {
      if (!안(+l.getAttribute('x'+i), +l.getAttribute('y'+i))) 밖++; }));
    sp.querySelectorAll('rect').forEach(q => { const x=+q.getAttribute('x'), y=+q.getAttribute('y');
      if (!안(x,y)) 밖++; if (!안(x+ +q.getAttribute('width'), y+ +q.getAttribute('height'))) 밖++; });
    const ts = [...sp.querySelectorAll('text')].map(t => t.getBoundingClientRect()).filter(r => r.width > 0);
    let 겹 = 0;
    for (let i = 0; i < ts.length; i++) for (let j = i+1; j < ts.length; j++){
      const ox = Math.min(ts[i].right, ts[j].right) - Math.max(ts[i].left, ts[j].left);
      const oy = Math.min(ts[i].bottom, ts[j].bottom) - Math.max(ts[i].top, ts[j].top);
      if (ox > 1 && oy > 1) 겹++; }
    return { 밖, 겹 };
  });
  const 갈래 = [['기본', {}], ['끼우기', {backMode:'insert'}], ['인도어', {doorMode:'in'}],
                ['상판위·이동2', {topStyle:'overlay', shelvesM:2}], ['하판아래', {botStyle:'under'}],
                ['작은 장', {W:300, D:200, H:300, shelves:0, doors:0, plinth:0}],
                ['큰 장', {W:2400, D:800, H:2400, shelves:8, shelvesM:8}],
                ['문0·선반0', {doors:0, shelves:0, shelvesM:0, plinth:0}]];
  const 쓸기 = [];
  for (const [nm, st] of 갈래){
    await 두기(Object.assign({ W:800, D:400, H:1800, Tside:18, shelves:3, shelvesM:0, doors:2,
      doorMode:'out', topStyle:'inset', botStyle:'inset', backMode:'cover', plinth:80 }, st));
    await 손가락('#thumbs button[data-th="1"]');
    const r = await 재기(); 쓸기.push([nm, r.밖, r.겹]);
  }
  /* ⚠ 사양표가 가장 길 때 — **열한 줄**(끼우기 · 이동선반 · 결까지 다 켠 것). 8.2 로 박으면 여기서 치수 띠를 덮는다. */
  await 두기({ W:800, D:400, H:1800, shelves:3, shelvesM:2, doors:2, doorMode:'out',
               topStyle:'inset', botStyle:'inset', backMode:'insert', plinth:80 });
  await p.evaluate(() => { const 결 = window.__probe.결();
    ['측판','상판','하판','고정선반','이동선반','문짝','전면밴드','뒷판'].forEach(n => 결[n] = '세로');
    window.__probe.set({}); });
  await 잠(450); await 손가락('#thumbs button[data-th="1"]');
  const 열한 = await 재기();
  const 이름열하나 = ['측판','상판','하판','고정선반','이동선반','문짝','전면밴드','뒷판','우라홈','엣지','결 방향'];
  const 열한글 = (await 스펙글()).글;
  쓸기.push(['열한 줄', 열한.밖, 열한.겹]);
  맞나('사양표가 가장 길 때 열한 줄이 다 있다', 이름열하나.filter(n => 열한글.includes(n)).length, 11);
  맞나('A4 밖으로 나간 점', 쓸기.map(x => x[1]), [0,0,0,0,0,0,0,0,0]);
  맞나('글자 겹침', 쓸기.map(x => x[2]), [0,0,0,0,0,0,0,0,0]);
  await p.evaluate(() => { const 결 = window.__probe.결();
    Object.keys(결).forEach(k => delete 결[k]); window.__probe.set({}); }); await 잠(400);

  console.log('⑥ 이미 나가던 것이 한 톨도 안 바뀐다');
  await 두기({ W:800, D:400, H:1800, Tside:18, shelves:3, shelvesM:0, doors:2,
    doorMode:'out', topStyle:'inset', botStyle:'inset', backMode:'cover', plinth:80 });
  맞나('부속 쪽 이름·차례', (await 쪽들()).slice(1), ['측판·상판', '하판·문짝·고정선반', '전면밴드·뒷판']);
  맞나('부속 쪽 그림 md5 (스펙서를 뺀 것)',
       md5(await p.evaluate(() => window.__probe.쪽().filter(z => z.이름들[0] !== '제품 스펙서').map(z => z.svg).join(''))),
       '1d7dc306b07b');
  맞나('재단 치수 일곱 줄',
       await p.evaluate(() => window.__probe.행().map(r => `${r.name} ${r.qty} ${r.L}×${r.W}×${r.T}`)),
       ['측판 2 1800×400×18','상판 1 764×400×18','하판 1 764×400×18','문짝 2 1713×396×18',
        '고정선반 3 764×400×18','전면밴드 1 764×80×18','뒷판 1 1716×796×2.7']);

  console.log('⑦ 부속이 하나도 없으면 쪽도 없다');
  await p.evaluate(() => { const 손 = window.__probe.손질(), m = window.__probe.model();
    손.지움 = m.parts.map(x => x.단열쇠 || (x.name + '@짝:0')); window.__probe.set({}); });
  await 잠(500);
  맞나('쪽 수 · 썸네일 숨김', await p.evaluate(() => [document.querySelectorAll('#pageBox > .page').length,
       document.querySelector('#thumbs').hidden, window.__probe.model().parts.length]), [1, true, 0]);
  await p.evaluate(() => { window.__probe.손질().지움 = []; window.__probe.set({}); }); await 잠(500);

  console.log('⑧ 품목구분명 · 서랍장 이름');
  await p.evaluate(() => { const r = document.querySelector('#rName'); r.value = 'NRS-1000 장';
    r.dispatchEvent(new Event('input', { bubbles:true })); }); await 잠(500);
  g = await 스펙글();
  맞나('품목구분명이 이긴다', [g.글[2], g.글[3]], ['NRS-1000 장', 'NRS-1000 장']);
  await p.evaluate(() => { const r = document.querySelector('#rName'); r.value = '';
    r.dispatchEvent(new Event('input', { bubbles:true })); }); await 잠(500);
  await 품목('서랍장');
  g = await 스펙글();
  맞나('서랍장 — 가로대 · 마이다', [g.글.includes('가로대'), g.글.includes('마이다'), g.글.includes('고정선반'), g.글.includes('문짝')],
       [true, true, false, false]);
  맞나('서랍장에도 1쪽 바로 뒤', (await 쪽들())[0], '제품 스펙서');
  await 품목('수납장');

  맞나('오류', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**서랍장 품목의 도어의 명칭은 마이다 입니다. — 마이다는 8개까지 분할이 가능하며
   분할시 현재 설정된 도어의 높이에서 각 분할 마이다 간 4mm의 빈공간이 생기며 동일사이즈로 분할 되게
   해주세요. 도어의 인도어 아웃도어 와 동일 개념의 외부/내부 선택이 가능하게 해주세요**」

     ① 수납장은 한 톨도 안 바뀐다 — 줄 이름표 「도어」 · 단추 0·1·2 · 「아웃도어/인도어」 · 부속 이름 「문짝」
     ② **진짜 손가락**으로 서랍장 → 줄 이름표·부속 이름·도면·3D 가 다 **「마이다」** · 단추 **0~8** · **「외부/내부」**
     ③ **위아래로 고르게 나뉜다** — 폭은 다 쓰고 높이는 (도어높이 − 4×(n−1)) ÷ n · **틈이 꼭 4mm**
     ④ 8 까지 된다 · 0 이면 0장
     ⑤ 외부/내부를 바꿔도 같은 규칙이고 **도어 위·아래 유격이 그대로 먹는다**
     ⑥ 겹치는 마이다가 없고 도어 칸(z0~z1)을 안 넘는다
     ⑦ 숨김·지움 열쇠가 `마이다@짝:k` 다 · 수납장으로 가면 문짝 0·1·2 로 돌아온다

   돌리는 법:  node tests/마이다.js
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
    'rule:()=>규칙,st:()=>state,draw:()=>drawing,손질:()=>손질,build:(x)=>buildModel(x)};' + 못);
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
const 반 = n => Math.round(n * 1000) / 1000;

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

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  /* 10-03 사장님 말씀 — 품목은 **드롭다운**이다. 진짜 손가락으로 고르개를 짚고 목록에서 고른다
     (붙박이 목록은 브라우저가 그리는 것이라 이 방에서 그 목록 자체를 손가락으로 못 짚는다 · §7). */
  const 품목고르기 = async 품 => { const r = await 손가락('#itemSel');
    await p.selectOption('#itemSel', 품); await 잠(500); return r; };
  const 펴기 = async () => {
    const 접힘 = await p.evaluate(() =>
      document.querySelector('.pname[data-opt="문짝"]').getAttribute('aria-expanded') !== 'true');
    if (접힘) await 손가락('.pname[data-opt="문짝"]'); };

  const 이름표 = () => p.evaluate(() => document.querySelector('.field[data-part="문짝"] .pname').textContent);
  const 단추들 = () => p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="문짝"] input[name="doors"]')].map(i => i.value));
  const 모드글 = () => p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="문짝"] input[name="doorMode"]')]
    .map(i => i.parentElement.textContent));
  const 도어들 = 이름 => p.evaluate(n => window.__probe.model().parts.filter(x => x.name === n)
    .map(x => ({ x:+x.x.toFixed(3), z:+x.z.toFixed(3), w:+x.w.toFixed(3), h:+x.h.toFixed(3) })), 이름);
  const 표제 = () => p.evaluate(() => window.__probe.draw().P
    .filter(x => x.t === 'text' && /(문짝|마이다)/.test(x.str)).map(x => x.str));

  console.log('① 수납장은 예전 그대로');
  await 펴기();
  맞나('줄 이름표 · 단추 · 모드', [await 이름표(), await 단추들(), await 모드글()],
    ['도어', ['0','1','2'], ['아웃도어', '인도어']]);
  const 수납문 = await 도어들('문짝');
  맞나('문짝 2장 · 좌우로 나뉜다', 수납문, [{x:2,z:85,w:396,h:1713},{x:402,z:85,w:396,h:1713}]);
  맞나('표제란', await 표제(), ['문짝', '뒷판 2.7T · 고정선반 3단 · 이동선반 0단 · 문짝 2', '문짝 2짝 · 아웃도어']);

  console.log('② 서랍장 — 명칭이 마이다고 8까지 분할된다');
  맞나('서랍장을 눌렀나', await 품목고르기('서랍장'), true);
  await 펴기();
  맞나('줄 이름표', await 이름표(), '마이다');
  맞나('단추 0~8', await 단추들(), ['0','1','2','3','4','5','6','7','8']);
  맞나('외부 / 내부', await 모드글(), ['외부', '내부']);
  맞나('부속 이름 (문짝 없고 마이다 있다)', await p.evaluate(() => {
    const n = window.__probe.model().parts.map(x => x.name);
    return [n.includes('문짝'), n.includes('마이다')]; }), [false, true]);

  console.log('③ 위아래로 고르게 나뉘고 틈이 4mm 다');
  // 아웃도어 도어 칸 z0 85 ~ z1 1798 → 높이 1713. n=2 면 (1713 − 4) ÷ 2 = 854.5
  맞나('2분할 — 폭 다 쓰고 높이 반', await 도어들('마이다'),
    [{x:2,z:85,w:796,h:854.5},{x:2,z:943.5,w:796,h:854.5}]);
  const 틈 = async n => { await p.evaluate(v => window.__probe.set({ doors: v }), n); await 잠(350);
    const d = await 도어들('마이다');
    const 틈들 = d.slice(1).map((x,i) => Math.round((x.z - (d[i].z + d[i].h)) * 100) / 100);
    const 키들 = [...new Set(d.map(x => 반(x.h)))];
    return { 장수: d.length, 틈: [...new Set(틈들)], 키: 키들,
      아랫끝: d.length ? 반(d[0].z) : null, 윗끝: d.length ? 반(d[d.length-1].z + d[d.length-1].h) : null }; };
  맞나('3분할 — (1713 − 4×2) ÷ 3', await 틈(3), { 장수:3, 틈:[4], 키:[568.333], 아랫끝:85, 윗끝:1798 });
  맞나('5분할 — (1713 − 4×4) ÷ 5', await 틈(5), { 장수:5, 틈:[4], 키:[339.4], 아랫끝:85, 윗끝:1798 });

  console.log('④ 8 까지 · 0 이면 0장');
  맞나('8분할 — 틈 하나 · 키 하나 · 칸을 안 넘는다', await 틈(8),
    { 장수:8, 틈:[4], 키:[210.625], 아랫끝:85, 윗끝:1798 });
  맞나('0 이면 0장', (await 틈(0)).장수, 0);
  await p.evaluate(() => window.__probe.set({ doors: 4 })); await 잠(300);

  console.log('⑤ 외부 / 내부 · 도어 위·아래 유격이 그대로 먹는다');
  await p.evaluate(() => window.__probe.set({ doorMode: 'in' })); await 잠(350);
  const 내부 = await 틈(4);
  맞나('내부 — 4분할 · 틈 4 · 키 하나', [내부.장수, 내부.틈, 내부.키.length], [4, [4], 1]);
  맞나('내부는 몸통 안이다 (y 0)', await p.evaluate(() =>
    (window.__probe.model().parts.find(x => x.name === '마이다') || {}).y), 0);
  const 전높이 = 내부.윗끝 - 내부.아랫끝;
  await p.evaluate(() => { window.__probe.rule().인위 = 10; window.__probe.rule().인아래 = 8; window.__probe.set({}); });
  await 잠(350);
  const 유격 = await 틈(4);
  맞나('위 10 · 아래 8 만큼 칸이 줄고 틈은 그대로 4',
    [반(유격.아랫끝 - 내부.아랫끝), 반((내부.윗끝 - 유격.윗끝)), 유격.틈, 유격.키.length],
    [5, 7, [4], 1]);
  맞나('키가 (칸 − 4×3) ÷ 4 다', 유격.키[0], 반(((유격.윗끝 - 유격.아랫끝) - 12) / 4));
  await p.evaluate(() => { window.__probe.rule().인위 = 3; window.__probe.rule().인아래 = 3;
    window.__probe.set({ doorMode: 'out' }); }); await 잠(350);

  console.log('⑥ 겹치지 않는다');
  맞나('마이다끼리 겹친 짝 0 (1~8 분할 다)', await p.evaluate(() => {
    let 겹침 = 0;
    for (let n = 1; n <= 8; n++){
      const m = window.__probe.build({ ...window.__probe.st(), doors: n });
      const d = m.parts.filter(x => x.name === '마이다');
      for (let i = 0; i < d.length; i++) for (let j = i+1; j < d.length; j++)
        if (d[i].z < d[j].z + d[j].h - 1e-9 && d[j].z < d[i].z + d[i].h - 1e-9) 겹침++;
    }
    return 겹침; }).catch(() => 'build 없음'), 0);

  console.log('⑦ 열쇠 · 수납장으로 되돌리기');
  await p.evaluate(() => window.__probe.set({ doors: 3 })); await 잠(350);
  맞나('짝 열쇠가 마이다다', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '마이다').map(x => x.자리)),
    ['마이다@짝:0','마이다@짝:1','마이다@짝:2']);
  맞나('표제란이 마이다·가로대·외부로', await 표제(), ['마이다',
    '뒷판 2.7T · 가로대 3단 · 이동선반 0단 · 마이다 3', '마이다 3개 · 외부']);
  await p.evaluate(() => window.__probe.set({ doors: 8 })); await 잠(300);
  /* ⚠ 10-02 사장님 말씀(§4.9872)으로 `doors` 도 품목마다 갈렸다 —
     수납장은 **제 값(2)** 을 쥐고 있고 서랍장의 8 은 서랍장에 남는다. */
  맞나('수납장은 제 값(문짝 2짝)이다', await 품목고르기('수납장') &&
    [(await 도어들('문짝')).length, await p.evaluate(() => window.__probe.st().doors)], [2, 2]);
  await 품목고르기('서랍장');
  맞나('도로 서랍장이면 8분할 그대로', [(await 도어들('마이다')).length,
    await p.evaluate(() => window.__probe.st().doors)], [8, 8]);
  // 수납장에서 8 을 넣으면 셈으로만 2 로 본다 (담긴 숫자는 안 지운다)
  await 품목고르기('수납장');
  await p.evaluate(() => window.__probe.set({ doors: 8 })); await 잠(300);
  맞나('수납장에 8 을 넣으면 문짝 2짝으로 본다 · 담긴 8 은 그대로',
    [(await 도어들('문짝')).length, await p.evaluate(() => window.__probe.st().doors)], [2, 8]);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

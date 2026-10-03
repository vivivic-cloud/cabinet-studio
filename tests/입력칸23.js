#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**입력부 칸의 높이가 여전히 큽니다. 현재의 3분의 2 수준으로 줄여줘**」
   34 × 2/3 = 22.67 → **23px**. 09-28 의 그 자(§4.989)를 한 번 더 조인 것이다.

     ① 글자 넣는 칸이 다 23px 이다 (유격 · 전면밴드 · 우라홈 · 밴드 높이 · 부속 이름 · 띠 · 두께 고르개 · 가로대)
     ② 줄(`.optnum`)도 36 → 25 로 같이 내려간다 — 칸만 줄이면 눈에 안 띈다(09-28 에 헛일했다)
     ③ 단추 — 「추가」 44 · 알약 닿는 44 · 체크 줄 44 · 모드 44 는 그대로다.
        ⚠ × 와 부속명 단추는 **10-03 사장님 말씀으로 더 내려갔다**(§4.9866) — 여기 잰 값을 그때 옮겨 적었다.
     ④ 값이 하나도 안 잘린다 (2.7 · 12.5 · 2400)
     ⑤ **진짜 손가락**으로 초점이 잡히고 글자가 들어가고 먹는다
     ⑥ 375·1280 가로 넘침 0 · 2D 에서 A4 한 쪽과 「크게」 가 그대로다

   돌리는 법:  node tests/입력칸23.js
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
    'st:()=>state,rule:()=>규칙};' + 못);
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
  for (const 폭 of [375, 1280]){
    console.log(`\n■ ${폭}px`);
    const ctx = await b.newContext({ viewport:{ width:폭, height:900 }, hasTouch:true, isMobile:폭 < 800 });
    await ctx.addInitScript(() => localStorage.setItem('cabinet-studio.수납장.부속',
      JSON.stringify([{ 이름:'밴드', T:12 }])));
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
    const 펴 = async n => { const b2 = p.locator(`.pname[data-opt="${n}"]`);
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${n}"]`); };
    const 접 = async n => { const b2 = p.locator(`.pname[data-opt="${n}"]`);
      if (await b2.getAttribute('aria-expanded') === 'true') await 손가락(`.pname[data-opt="${n}"]`); };
    const 높 = 자 => p.evaluate(x => { const e = document.querySelector(x);
      return e ? Math.round(e.getBoundingClientRect().height) : null; }, 자);

    console.log('① 글자 넣는 칸이 다 23px · ② 줄도 25 로 따라 내려간다');
    맞나('두께 고르개 (select)', await 높('.field[data-part="측판"] select'), 23);
    맞나('부속 이름 칸', await 높('.addrow input'), 23);
    맞나('도면 위 띠 칸', await 높('#dimsBar input[data-key="W"]'), 23);
    await 펴('측판');
    맞나('유격 칸', await 높('.opt[data-opt="측판"] .optnum .num input'), 23);
    맞나('유격 줄', await 높('.opt[data-opt="측판"] .optnum'), 25);
    await 접('측판');
    await 펴('전면밴드');
    맞나('전면밴드 숫자 칸', await 높('.opt[data-opt="전면밴드"] .optwide>.num input'), 23);
    await 접('전면밴드');
    await p.evaluate(() => window.__probe.set({ backMode:'insert' })); await 잠(400);
    await 펴('뒷판');
    맞나('우라홈 칸', await 높('.opt[data-opt="뒷판"] input[data-rule="우라홈"]'), 23);
    await 접('뒷판');
    await p.evaluate(() => window.__probe.set({ backMode:'cover' })); await 잠(400);
    await 펴('밴드');
    맞나('밴드 높이 칸', await 높('.opt[data-opt="밴드"] input[data-cfield="높이"]'), 23);
    await 접('밴드');
    await p.evaluate(() => window.__probe.set({ 품목:'서랍장' })); await 잠(100);
    await 손가락('#itemSel'); await p.selectOption('#itemSel', '서랍장'); await 잠(500);
    맞나('서랍장 가로대 숫자 칸', await p.evaluate(() => { const e = document.querySelector('.field[data-part="고정선반"] input');
      return e ? [e.tagName, Math.round(e.getBoundingClientRect().height)] : null; }), ['INPUT', 23]);
    await 손가락('#itemSel'); await p.selectOption('#itemSel', '수납장'); await 잠(500);

    console.log('③ 단추 — 「추가」·알약·체크 줄·모드는 그대로다');
    await 펴('측판');
    // 10-03 사장님 말씀으로 × 는 28 → 20(넓이 절반) · 닿는 자리는 줄 23 + 틈 4 = 27 이다 (§4.9866)
    맞나('× — 보이는 것 · 닿는 자리', await p.evaluate(() => {
      const x = document.querySelector('.field[data-part="측판"] .x'); const r = x.getBoundingClientRect();
      const a = getComputedStyle(x, '::after');
      return [Math.round(r.width) + '×' + Math.round(r.height), a.width + '×' + a.height]; }), ['20×20', '40px×27px']);
    맞나('「추가」 단추', await 높('.addrow button'), 44);
    맞나('체크 줄', await 높('.opt[data-opt="측판"] .optrow'), 44);
    // 10-03 부터 부속명 단추도 입력칸과 같은 23 이다 — 부속 사이를 좁히려면 이것이 따라 내려가야 한다
    맞나('부속명 단추', await 높('.pname[data-opt="측판"]'), 23);
    맞나('모드 단추', await 높('.modeseg button'), 44);
    맞나('저장 단추 (§4.9891 그대로)', await 높('.opt[data-opt="측판"] [data-optsave]'), 28);
    await 접('측판');
    await 펴('상판');
    맞나('세그먼트 알약 — 보이는 것 · 닿는 자리', await p.evaluate(() => {
      const l = document.querySelector('.opt[data-opt="상판"] .seg.mini label');
      return [Math.round(l.getBoundingClientRect().height), getComputedStyle(l, '::after').height]; }), [31, '44px']);
    await 접('상판');

    console.log('④⑤ 값이 안 잘린다 · 진짜 손가락으로 쳐진다');
    await p.evaluate(() => window.__probe.set({ W:2400, D:800, H:2400, TB:2.7 })); await 잠(500);
    맞나('띠·고르개 잘림 (2400 · 2.7)', await p.evaluate(() =>
      [...document.querySelectorAll('#dimsBar input, .two select')]
        .filter(i => i.scrollWidth - i.clientWidth > 0).length), 0);
    await p.evaluate(() => window.__probe.set({ W:800, D:400, H:1800 })); await 잠(500);
    await 펴('측판');
    { const 자 = '.opt[data-opt="측판"] input[data-rule="측판내밈"]';
      await 손가락(자);
      await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
      await p.keyboard.type('12.5'); await 잠(300);
      맞나('초점 · 친 값 · 안 잘림', await p.evaluate(x => { const i = document.querySelector(x);
        return [document.activeElement === i, i.value, i.scrollWidth - i.clientWidth]; }, 자), [true, '12.5', 0]);
      await 손가락('.opt[data-opt="측판"] [data-optsave]');
      맞나('저장하면 먹는다 — 상판 앞면', await p.evaluate(() =>
        window.__probe.model().parts.find(q => q.name === '상판').y), 12.5);
      await p.evaluate(() => { window.__probe.rule().측판내밈 = 0; window.__probe.set({}); }); await 잠(300); }
    await 접('측판');

    console.log('⑥ 가로 넘침 0 · 2D 에서 A4 한 쪽과 「크게」 가 그대로다');
    맞나('설정 칸 가로 넘침', await p.evaluate(() => { const n = document.querySelector('.params');
      return n.scrollWidth - n.clientWidth; }), 0);
    await 손가락('.modeseg button[data-mode="2d"]'); await 잠(1200);
    맞나('A4 한 쪽', await p.evaluate(() => { const e = document.querySelector('#pageBox .page');
      const r = e.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height); }),
      폭 === 375 ? '355×502' : '453×641');
    맞나('띠가 가린 도면 글자', await p.evaluate(() => {
      const 띠 = document.querySelector('#dimsBar').getBoundingClientRect();
      return [...document.querySelectorAll('#pageBox .page text')].filter(x => { const r = x.getBoundingClientRect();
        return r.right > 띠.left && r.left < 띠.right && r.bottom > 띠.top && r.top < 띠.bottom; }).length; }), 0);
    // ⚠ 폰에서는 쪽이 화면 밖에 있어 `elementFromPoint` 가 늘 거짓이 된다 — 먼저 끌어온다(§7.5)
    await p.evaluate(() => { const e = document.querySelector('#pageBox .page .big');
      if (e) e.scrollIntoView({ block:'center' }); }); await 잠(400);
    맞나('「크게」 가 제것', await p.evaluate(() => { const 크 = document.querySelector('#pageBox .page .big');
      if (!크) return null; const r = 크.getBoundingClientRect();
      const 위 = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
      return !!(위 && (위.classList.contains('big') || 위.closest('.big'))); }), true);

    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

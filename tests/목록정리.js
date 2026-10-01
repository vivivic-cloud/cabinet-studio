#!/usr/bin/env node
/* 10-01 사장님 말씀 둘
     「우라홈은 뒷판 끼우기 옵션 적용시 뒷판의 옵션조정에 나타나게 해줘」
     「삭제된 부속은 목록에서 없애줘 비활성 부속이라고 해도 어차피 부속추가로 다시 살릴 수 있는거잖아」

     ① 「비활성 부속」 칸이 아예 없다
     ② 우라홈 칸은 **뒷판 판 안**에 있고 **끼우기일 때만** 뜬다 (덮기면 칸이 없다)
     ③ 지운 붙박이 줄은 목록에서 **사라지고** 「부속추가」 로 **제자리에** 돌아온다
     ④ 지운 만든 부속도 사라지고 **두께·단 그대로** 돌아온다
     ⑤ **설정 때문에 없는 것은 안 사라진다** — 도어 0짝 · 이동선반 0단 · 전면밴드 0

   돌리는 법:  node tests/목록정리.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),rule:()=>규칙,st:()=>state,부속:()=>만든부속};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:375, height:780 } });
  await ctx.addInitScript(() => localStorage.setItem('cabinet-studio.부속',
    JSON.stringify([{ 이름:'밴드', T:12, 단:['상','하'] }])));
  // ⚠ 25T 로 두면 끼우기에서 「15mm 로 맞췄습니다」 경고판이 떠 클릭을 가로챈다(§4.8).
  //    12T 는 두께가 15 를 안 넘어 경고가 안 뜬다 — 여기서 보는 것은 두께 보존이지 경고가 아니다.
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(600);

  // 보이는 줄만 센다 — 지운 줄은 `style.display:none` 이라 높이가 0 이다
  const 줄들 = () => p.evaluate(() => [...document.querySelectorAll('.params .field[data-part]')]
    .filter(x => x.getBoundingClientRect().height > 0).map(x => x.dataset.part));
  const 만든줄 = () => p.evaluate(() => [...document.querySelectorAll('#customList .pname')].map(x => x.textContent));
  const 붙박이 = ['상판','측판','고정선반','이동선반','문짝','하판','전면밴드','뒷판'];

  console.log('① 「비활성 부속」 칸이 아예 없다');
  맞나('#deadWrap · #deadList · #deadCustom',
    await p.evaluate(() => ['#deadWrap','#deadList','#deadCustom'].map(s => !!document.querySelector(s))),
    [false, false, false]);

  console.log('② 우라홈은 뒷판 판 안에 · 끼우기일 때만');
  { 맞나('줄 밑에 홀로 선 칸(#backInWrap)', await p.evaluate(() => !!document.querySelector('#backInWrap')), false);
    const 펴 = async () => { const b2 = p.locator('.pname[data-opt="뒷판"]');
      if (await b2.getAttribute('aria-expanded') !== 'true'){ await b2.click(); await 잠(300); } };
    await 펴();
    맞나('덮기 — 칸 없음', await p.locator('.opt[data-opt="뒷판"] input[data-rule="우라홈"]').count(), 0);
    await p.click('.opt[data-opt="뒷판"] label:has(input[name=backMode][value="insert"])'); await 잠(450);
    await 펴();
    맞나('끼우기 — 칸 하나 · 34px · 0~40 · 0.5 걸음', await p.evaluate(() => {
      const i = document.querySelector('.opt[data-opt="뒷판"] input[data-rule="우라홈"]');
      if (!i) return null; const r = i.getBoundingClientRect();
      return [i.value, i.min, i.max, i.step, +r.height.toFixed(0)]; }), ['9', '0', '40', '0.5', 34]);
    /* 고치기 전 판에는 이 칸이 뒷판 판에 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다.
       (그 판에서는 이 시험이 깨진 것으로 빨개져야 맞다.) */
    const 있나 = await p.locator('.opt[data-opt="뒷판"] input[data-rule="우라홈"]').count() > 0;
    if (!있나) 맞나('뒷판 판에 우라홈 칸이 있나', false, true);
    // 저장을 눌러야 먹는다(§4.9893)
    if (있나){
    await p.fill('.opt[data-opt="뒷판"] input[data-rule="우라홈"]', '15'); await 잠(200);
    await p.click('.opt[data-opt="뒷판"] [data-optsave]'); await 잠(400);
    맞나('15 저장 → 홈 안쪽선 · 선반 깊이', await p.evaluate(() => { const m = window.__probe.model();
      return [window.__probe.rule().우라홈, m.홈.앞, m.parts.find(q => q.name === '고정선반').d]; }), [15, 385, 385]);
    await 펴(); await p.fill('.opt[data-opt="뒷판"] input[data-rule="우라홈"]', '9'); await 잠(200);
    await p.click('.opt[data-opt="뒷판"] [data-optsave]'); await 잠(400); }
    await 펴();
    await p.click('.opt[data-opt="뒷판"] label:has(input[name=backMode][value="cover"])'); await 잠(400);
    await 펴();
    if (await p.locator('.opt[data-opt="뒷판"] [data-optclose]').count()) {
      await p.click('.opt[data-opt="뒷판"] [data-optclose]'); } else { await p.click('.pname[data-opt="뒷판"]'); }
    await 잠(300); }

  console.log('③ 지운 붙박이 줄은 사라지고 「부속추가」 로 제자리에 돌아온다');
  { 맞나('처음 줄', await 줄들(), 붙박이);
    await p.click('.x[data-kill="상판"]'); await 잠(400);
    맞나('상판 지움 — 줄 · 장수',
      [await 줄들(), await p.evaluate(() => window.__probe.model().parts.filter(q => q.name === '상판').length)],
      [붙박이.filter(x => x !== '상판'), 0]);
    await p.fill('#newPart', '상판'); await 잠(200);
    await p.click('.addrow button'); await 잠(450);
    맞나('「추가」 로 되살림 — 제자리 · 장수',
      [await 줄들(), await p.evaluate(() => window.__probe.model().parts.filter(q => q.name === '상판').length)],
      [붙박이, 1]); }

  console.log('④ 지운 만든 부속도 사라지고 두께·단 그대로 돌아온다');
  { 맞나('만든 부속 줄', await 만든줄(), ['밴드']);
    await p.click('#customList .x'); await 잠(450);
    맞나('밴드 지움 — 만든 부속 줄', await 만든줄(), []);
    await p.fill('#newPart', '밴드'); await 잠(200);
    await p.click('.addrow button'); await 잠(450);
    맞나('되살림 — 줄 · 두께·단', [await 만든줄(), await p.evaluate(() => window.__probe.부속()[0])],
      [['밴드'], { 이름:'밴드', T:12, 단:['상','하'] }]); }

  console.log('⑤ 설정 때문에 없는 것은 안 사라진다');
  { await p.evaluate(() => window.__probe.set({ doors:0, shelvesM:0, plinth:0 })); await 잠(450);
    맞나('도어 0 · 이동선반 0 · 전면밴드 0', await 줄들(), 붙박이);
    await p.evaluate(() => window.__probe.set({ doors:2, shelvesM:0, plinth:80 })); await 잠(300); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

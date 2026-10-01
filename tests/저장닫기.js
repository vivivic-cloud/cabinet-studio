#!/usr/bin/env node
/* 10-01 사장님 말씀
     「부속옵션 설정부에 저장/닫기 버튼을 만들어 주세요. 이로서 수치입력후 저장 버튼을 누르지 않으면
      적용되지 않으며 이전의 세팅을 유지 합니다」

     ① 판마다 「저장」·「닫기」 가 있고 둘 다 44px 이다
     ② 수치를 치고 **닫기** → 안 먹고 이전 세팅 그대로 · 다시 펴면 칸도 이전 값
     ③ 수치를 치고 **저장** → 먹고 판이 접힌다
     ④ 부속명을 다시 눌러 접는 것도 닫기와 같다 (친 것을 버린다)
     ⑤ 상세옵션의 **숫자 칸**(전면밴드)도 같다
     ⑥ **끌개·라디오는 예전처럼 바로 먹는다** — 사장님 말씀이 「수치입력」 이다
     ⑦ **관계제어판은 예전 그대로** 바로 먹는다 — 사장님이 짚으신 곳이 아니다

   돌리는 법:  node tests/저장닫기.js
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
  const ctx = await b.newContext({ viewport:{ width:375, height:780 } });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(500);

  const 펴기 = async 이름 => { const b2 = p.locator(`.pname[data-opt="${이름}"]`);
    if (await b2.getAttribute('aria-expanded') !== 'true'){ await b2.click(); await 잠(300); } };
  const 접혔나 = 이름 => p.evaluate(n => document.querySelector(`.pname[data-opt="${n}"]`).getAttribute('aria-expanded') === 'false', 이름);
  const 규 = k => p.evaluate(x => window.__probe.rule()[x], k);
  /* 고치기 전 판에는 저장·닫기 단추가 없다 — 거기서 30초 멎지 않게 먼저 세고 넘어간다.
     (그 판에서는 이 시험이 깨진 것으로 빨개져야 맞다.) */
  const 누르기 = async 자 => { if (!await p.locator(자).count()){ 맞나('단추가 있나 — ' + 자, false, true); return false; }
    await p.click(자); await 잠(350); return true; };
  const 칸값 = (이름, r) => p.evaluate(v => { const i = document.querySelector(`.opt[data-opt="${v.이름}"] input[data-rule="${v.r}"]`);
    return i ? i.value : null; }, { 이름, r });

  /* 10-01 사장님 말씀 — 「저장 닫기 버튼 너무 크다 너무 커요 지금의 4분의 1수준으로 조절해줘」.
     보이는 크기를 154.5×44 → **54×28** 로 줄였다(넓이로 약 1/4). 닿는 자리는 `::after` 로 **54×36** 이다 —
     위 틈 8 + 아래 여백 6 안이라 윗줄과 안 겹친다(§4.9891). */
  console.log('① 판마다 저장·닫기가 있고 보이는 크기는 54×28 · 닿는 자리는 54×36 이다');
  { await 펴기('상판');
    맞나('단추 이름', await p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="상판"] .optbtns button')].map(x => x.textContent)),
      ['저장', '닫기']);
    맞나('보이는 크기', await p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="상판"] .optbtns button')]
      .map(x => { const r = x.getBoundingClientRect(); return +r.width.toFixed(1) + '×' + r.height.toFixed(0); })),
      ['54×28', '54×28']);
    맞나('닿는 자리 세로 (::after 로 넓힌 것)', await p.evaluate(() => {
      const b2 = document.querySelector('.opt[data-opt="상판"] .optbtns button');
      const r = b2.getBoundingClientRect(), a = getComputedStyle(b2, '::after');
      return +(r.height + parseFloat(a.top) * -1 * 2).toFixed(0); }), 36);
    맞나('윗줄과 닿는 자리가 겹치나', await p.evaluate(() => {
      const b2 = document.querySelector('.opt[data-opt="상판"] .optbtns button');
      const 줄 = [...document.querySelectorAll('.opt[data-opt="상판"] .optrow')].pop();
      if (!줄) return 0;
      return (줄.getBoundingClientRect().bottom > b2.getBoundingClientRect().top - 4) ? 1 : 0; }), 0); }

  console.log('② 수치를 치고 닫기 — 안 먹고 이전 세팅 그대로');
  { await p.fill('.opt[data-opt="상판"] input[data-rule="상판내림"]', '4'); await 잠(250);
    맞나('치는 동안에는 안 먹는다', await 규('상판내림'), 0);
    await 누르기('.opt[data-opt="상판"] [data-optclose]');
    맞나('닫기 뒤 규칙 · 판이 접혔나', [await 규('상판내림'), await 접혔나('상판')], [0, true]);
    await 펴기('상판');
    맞나('다시 펴면 칸도 이전 값', await 칸값('상판', '상판내림'), '0'); }

  console.log('③ 수치를 치고 저장 — 먹고 판이 접힌다');
  { await p.fill('.opt[data-opt="상판"] input[data-rule="상판내림"]', '4'); await 잠(200);
    await 누르기('.opt[data-opt="상판"] [data-optsave]');
    맞나('저장 뒤 규칙 · 판이 접혔나', [await 규('상판내림'), await 접혔나('상판')], [4, true]);
    맞나('도면이 따라온다 (상판 z)', await p.evaluate(() => window.__probe.model().parts.find(q => q.name === '상판').z), 1778);
    await 펴기('상판');
    await p.fill('.opt[data-opt="상판"] input[data-rule="상판내림"]', '0'); await 잠(200);
    await 누르기('.opt[data-opt="상판"] [data-optsave]');
    맞나('0 으로 되돌림', await 규('상판내림'), 0); }

  console.log('④ 부속명을 다시 눌러 접는 것도 닫기와 같다');
  { await 펴기('상판');
    await p.fill('.opt[data-opt="상판"] input[data-rule="상판내림"]', '7'); await 잠(200);
    await p.click('.pname[data-opt="상판"]'); await 잠(300);
    맞나('규칙 · 접혔나', [await 규('상판내림'), await 접혔나('상판')], [0, true]);
    await 펴기('상판');
    맞나('칸도 이전 값', await 칸값('상판', '상판내림'), '0');
    await 누르기('.opt[data-opt="상판"] [data-optclose]'); }

  console.log('⑤ 상세옵션의 숫자 칸(전면밴드)도 같다');
  { const 밴 = () => p.evaluate(() => window.__probe.st().plinth);
    await 펴기('전면밴드');
    await p.fill('.opt[data-opt="전면밴드"] input[data-key="plinth"]', '120'); await 잠(250);
    맞나('치는 동안에는 안 먹는다', await 밴(), 80);
    await 누르기('.opt[data-opt="전면밴드"] [data-optclose]');
    맞나('닫기 뒤', await 밴(), 80);
    await 펴기('전면밴드');
    await p.fill('.opt[data-opt="전면밴드"] input[data-key="plinth"]', '120'); await 잠(200);
    await 누르기('.opt[data-opt="전면밴드"] [data-optsave]');
    맞나('저장 뒤', await 밴(), 120);
    await 펴기('전면밴드');
    await p.fill('.opt[data-opt="전면밴드"] input[data-key="plinth"]', '80'); await 잠(200);
    await 누르기('.opt[data-opt="전면밴드"] [data-optsave]'); }

  console.log('⑥ 끌개·라디오는 예전처럼 바로 먹는다 (사장님 말씀이 「수치입력」 이다)');
  { await 펴기('고정선반');
    await p.evaluate(() => { const i = document.querySelector('#shelves'); i.value = '5';
      i.dispatchEvent(new Event('input', { bubbles:true })); }); await 잠(350);
    맞나('선반 끌개 5 — 바로 먹는다',
      await p.evaluate(() => [window.__probe.st().shelves, window.__probe.model().parts.filter(q => q.name === '고정선반').length]), [5, 5]);
    await p.evaluate(() => { const i = document.querySelector('#shelves'); i.value = '3';
      i.dispatchEvent(new Event('input', { bubbles:true })); }); await 잠(300);
    await 누르기('.opt[data-opt="고정선반"] [data-optclose]');
    await 펴기('뒷판');
    // 라디오는 알약 `label` 이 덮고 있다 — 그 알약을 누른다(진짜 손가락과 같은 자리)
    const 알약 = v => `.opt[data-opt="뒷판"] input[name=backMode][value=${v}] + , .opt[data-opt="뒷판"] label:has(input[value="${v}"])`;
    await p.click(`.opt[data-opt="뒷판"] label:has(input[name=backMode][value="insert"])`); await 잠(350);
    맞나('덮기/끼우기 — 바로 먹는다', await p.evaluate(() => window.__probe.st().backMode), 'insert');
    await p.click(`.opt[data-opt="뒷판"] label:has(input[name=backMode][value="cover"])`); await 잠(300);
    await 누르기('.opt[data-opt="뒷판"] [data-optclose]'); }

  console.log('⑦ 관계제어판은 예전 그대로 바로 먹는다');
  { await p.click('#btnRules'); await 잠(400);
    await p.fill('#rTable input[data-rule="아웃경첩"]', '5'); await 잠(350);
    맞나('관계제어판 아웃경첩 5', await 규('아웃경첩'), 5);
    await p.fill('#rTable input[data-rule="아웃경첩"]', '2'); await 잠(300);
    await p.evaluate(() => { const d = document.querySelector('#rulesDlg'); if (d && d.open) d.close(); }); await 잠(200); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

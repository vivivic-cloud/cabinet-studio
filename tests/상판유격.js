#!/usr/bin/env node
/* 10-01 사장님 말씀
     「지금 측판 들임의 개념은 측판사이의 간격을 조정하는것이니 명칭을 달리해야겠다 — 이것의 명칭을
      상판유격 으로해서 상판의 측판위 옵션일때 작동하게해줘 … 상판의 사이즈가 늘어나는것이 아니라
      그냥 측판의 간격이 줄어드는것일뿐 / 이전의 측판들임의 개념은 이전과 똑같은 조건일때
      측판의 깊이가 줄어들도록해줘 … 이또한 설정한 최대외경에 영향을 주어서는 안되니」

     ① 둘 다 0 이면 고치기 전 자리 그대로다
     ② 「상판유격」(옛 `측판들임`) — 좌우 간격만 줄인다 · 깊이·상판은 안 움직인다 · 외경 안 변함
     ③ 「측판 들임」(새 `측판깊이들임`) — 측판 깊이만 줄인다 · 상판·하판은 안 움직인다 · 외경 안 변함
     ④ 둘은 서로 안 섞인다 — 같이 켜면 좌우·깊이가 따로 먹는다
     ⑤ 상판이 「측판 사이」 면 깊이 칸은 칸도 없고 셈에서도 0 이다 — 담긴 값은 안 지운다
     ⑥ 칸 이름 네 갈래 · 같은 이름 두 줄 없음 · 한 마디(「큰 쪽만 들어갑니다」)는 좌우 두 줄 바로 아래

   돌리는 법:  node tests/상판유격.js
   화면을 보는 시험이라 **three 허수아비를 안 쓴다**(§4.9899 와 같은 길).
   three.min.js 사본이 있어야 돈다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),rule:()=>규칙};' + 못);
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
  await p.evaluate(() => ['상판','하판','측판'].forEach(n => {
    const b = document.querySelector('.pname[data-opt="' + n + '"]');
    if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); }));
  await 잠(400);

  // 초점을 떼고 바꾼다 — 숫자 칸에 손이 얹혀 있으면 판을 다시 안 그린다(§4.94)
  const 두기 = async o => { await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.evaluate(x => window.__probe.set(x), o); await 잠(300); };
  /* 10-01 사장님 말씀(§4.9887)으로 「상판유격」 은 **상판 판**으로 갔다. 그래서 칸이 어느 판에 있든 찾는다.
     수치는 「저장」 을 눌러야 먹고(§4.9893) 저장이 판을 접으므로 다시 편다. */
  const 펴기 = async (...이름들) => { for (const n of 이름들){ const b2 = p.locator(`.pname[data-opt="${n}"]`);
    if (await b2.getAttribute('aria-expanded') !== 'true'){ await b2.click(); await 잠(250); } } };
  const 넣 = async (r, v) => { await 펴기('상판', '하판', '측판');
    const 판 = await p.evaluate(x => { const i = document.querySelector(`.opt[data-opt] input[data-rule="${x}"]`);
      return i ? i.closest('.opt').dataset.opt : null; }, r);
    if (!판){ 맞나('「' + r + '」 칸이 어느 판에든 있나', false, true); return false; }
    await p.fill(`.opt[data-opt="${판}"] input[data-rule="${r}"]`, String(v)); await 잠(150);
    await p.click(`.opt[data-opt="${판}"] [data-optsave]`); await 잠(350);
    await 펴기('상판', '하판', '측판'); return true; };
  // 측판 좌우·깊이 · 상판 · 하판 · 실제외경 — 한 번에 잰다
  const 재 = () => p.evaluate(() => { const m = window.__probe.model();
    const 측 = m.parts.filter(q => q.name === '측판'), 상 = m.parts.find(q => q.name === '상판'),
          하 = m.parts.find(q => q.name === '하판');
    return { 측판: [측.map(q => q.x), 측[0].y, 측[0].d, 측[0].cut.W], 내부폭: m.innerW,
             상판: [상.y, 상.d, 상.cut.W], 하판: [하.y, 하.d],
             외경: [m.외경.W, m.외경.D, m.외경.H] }; });

  // 인도어라야 실제외경이 깊이를 그대로 따라간다(아웃도어는 경첩유격+도어 두께가 더 붙는다 · §4.93)
  await 두기({ topStyle:'overlay', botStyle:'inset', backMode:'cover', doorMode:'in', W:800, D:400, H:1800 });

  console.log('① 둘 다 0 — 고치기 전 자리 그대로');
  const 처음 = { 측판: [[0, 782], 0, 400, 400], 내부폭: 764, 상판: [0, 400, 400], 하판: [0, 400],
                 외경: [800, 402.7, 1800] };
  맞나('기본', await 재(), 처음);

  console.log('② 「상판유격」 — 좌우만 줄인다 (이름만 바뀐 옛 `측판들임`)');
  { if (await 넣('측판들임', 2)){
      맞나('상판유격 2', await 재(), { 측판: [[2, 780], 0, 400, 400], 내부폭: 760, 상판: [0, 400, 400],
                                      하판: [0, 400], 외경: [800, 402.7, 1800] }); }
    await 넣('측판들임', 0);
    맞나('도로 0', await 재(), 처음); }

  console.log('③ 「측판 들임」 — 깊이만 줄인다 · 상판·하판·외경은 그대로');
  { if (await 넣('측판깊이들임', 12.5)){
      // 10-01 사장님 말씀(§4.9884)으로 **하판 앞면이 측판 앞면을 따라간다** — 그만큼 깊이도 준다
      맞나('측판 들임 12.5', await 재(), { 측판: [[0, 782], 12.5, 387.5, 387.5], 내부폭: 764,
                                         상판: [0, 400, 400], 하판: [12.5, 387.5], 외경: [800, 402.7, 1800] }); }
    if (await 넣('측판깊이들임', 3)){
      맞나('측판 들임 3', await 재(), { 측판: [[0, 782], 3, 397, 397], 내부폭: 764,
                                      상판: [0, 400, 400], 하판: [3, 397], 외경: [800, 402.7, 1800] }); } }

  console.log('④ 둘은 서로 안 섞인다 — 좌우·깊이가 따로 먹는다');
  { await 넣('측판들임', 2);
    맞나('상판유격 2 · 측판 들임 3', await 재(), { 측판: [[2, 780], 3, 397, 397], 내부폭: 760,
                                                상판: [0, 400, 400], 하판: [3, 397], 외경: [800, 402.7, 1800] }); }

  console.log('⑤ 상판이 「측판 사이」 면 깊이 칸은 칸도 셈도 없다 — 담긴 값은 남는다');
  { await 두기({ topStyle:'inset' });
    맞나('측판 사이 — 깊이 0 이고 좌우도 0 (상판유격은 「측판 위」 전용)',
      await 재(), { 측판: [[0, 782], 0, 400, 400], 내부폭: 764, 상판: [0, 400, 400], 하판: [0, 400],
                    외경: [800, 402.7, 1800] });
    맞나('측판 판에 깊이 칸 없다',
      await p.locator('.opt[data-opt="측판"] input[data-rule="측판깊이들임"]').count(), 0);
    맞나('상판 판에 상판유격 칸도 없다 (측판 사이라서)',
      await p.locator('.opt[data-opt="상판"] input[data-rule="측판들임"]').count(), 0);
    맞나('담긴 값은 남는다',
      await p.evaluate(() => [window.__probe.rule().측판들임, window.__probe.rule().측판깊이들임]), [2, 3]);
    await 두기({ topStyle:'overlay' });
    맞나('도로 측판 위 — 둘이 살아난다', await 재(), { 측판: [[2, 780], 3, 397, 397], 내부폭: 760,
                                                   상판: [0, 400, 400], 하판: [3, 397], 외경: [800, 402.7, 1800] });
    await 넣('측판들임', 0); await 넣('측판깊이들임', 0);
    맞나('0 으로 되돌림', await 재(), 처음); }

  console.log('⑥ 칸 이름 — 네 갈래 · 같은 이름 두 줄 없음 · 한 마디는 좌우 두 줄 바로 아래');
  const 줄 = async o => { await 두기(o); await 펴기('상판', '하판', '측판');
    return p.evaluate(() => [...document.querySelector('.opt[data-opt="측판"]').children]
      .filter(c => c.classList.contains('optnum') || c.classList.contains('opthead'))
      .map(c => { const l = c.querySelector('label'); return l ? l.textContent : c.textContent.trim(); })); };
  { 맞나('상판 사이 · 하판 사이', await 줄({ topStyle:'inset', botStyle:'inset' }), ['측판유격']);
    맞나('상판 위 · 하판 사이 (상판유격은 상판 판으로 갔다)', await 줄({ topStyle:'overlay', botStyle:'inset' }), ['측판 들임']);
    맞나('상판 사이 · 하판 아래', await 줄({ topStyle:'inset', botStyle:'under' }), ['측판유격', '측판 들임 (하판)']);
    const r = await 줄({ topStyle:'overlay', botStyle:'under' });
    맞나('상판 위 · 하판 아래 — 한 마디가 좌우 줄 바로 아래다',
      r, ['측판 들임 (하판)', '「상판유격」 과 큰 쪽만 들어갑니다', '측판 들임']);
    맞나('상판유격은 상판 판에 있고 거기에도 한 마디가 붙는다',
      await p.evaluate(() => [...document.querySelector('.opt[data-opt="상판"]').children]
        .filter(c => c.classList.contains('optnum') || (c.classList.contains('opthead') && c.querySelector('small')))
        .map(c => { const l = c.querySelector('label'); return l ? l.textContent : c.textContent.trim(); })),
      ['상판유격', '「측판 들임 (하판)」 과 큰 쪽만 들어갑니다']);
    맞나('같은 이름 두 줄', r.length - new Set(r).size, 0); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

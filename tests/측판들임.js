#!/usr/bin/env node
/* 측판 상세옵션 — 09-30 사장님 말씀 둘
     「상판이 측판위로 올라갈때는 측판들임 옵션이 나타나야 합니다」
     「상판이 측판위 옵션일때 측판에서 측판내밈 옵션은 필요없어」
     ① 네 갈래(상판 사이·위 × 하판 사이·아래)에서 어느 판에 어느 줄이 뜨나
     ② 상판·하판 판에서 「측판 들임」 이 사라졌나 · 측판 판에 같은 이름 두 줄이 안 나오나
     ③ 둘 다 보일 때만 「큰 쪽만 들어갑니다」 한 마디가 붙나
     ④ 값이 도면에 먹나 — 둘이 한 자리를 다퉈 **큰 쪽만** 먹는다(셈은 안 건드렸다)
     ⑤ 상판이 측판 위면 「측판 내밈」 은 칸도 없고 **셈에서도 0** 이다 — 담긴 값은 안 지운다

   돌리는 법:  node tests/측판들임.js
   이 시험은 화면을 보므로 **three 허수아비를 쓰지 않는다** — 진짜로 띄워 `__probe` 로 값을 넣는다.
   그래서 three.min.js 사본이 필요하다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

// 이 방은 CDN 이 막혀 있다(§7). three 사본이 있어야 화면이 뜬다.
const 스리 = process.env.TH || path.join(뿌리, 'tests', 'three.min.js');
if (!fs.existsSync(스리)){
  console.log('건너뜀 — three.min.js 사본이 없다 (TH=<경로> 로 알려 줄 수 있다)'); process.exit(0); }

const 손질 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');   // 바깥 손잡이는 이 방에 안 온다
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
  // 세 판을 펴 둔다
  await p.evaluate(() => ['상판','하판','측판'].forEach(n => {
    const b = document.querySelector('.pname[data-opt="' + n + '"]');
    if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); }));
  await 잠(400);

  /* 초점을 떼고 바꾼다 — 숫자 칸에 손이 얹혀 있으면 `결단추갱신()` 이 판을 다시 안 그린다(§4.94).
     진짜 손가락은 다른 데를 눌러 초점이 저절로 옮겨 가므로 이것이 실제와 같은 자리다. */
  const 판 = async o => { await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.evaluate(x => window.__probe.set(x), o); await 잠(300);
    return p.evaluate(() => { const 읽 = n => { const el = document.querySelector('.opt[data-opt="' + n + '"]');
        return el && !el.hidden ? [...el.querySelectorAll('.optnum label')].map(l => l.textContent) : null; };
      return { 측판: 읽('측판'), 상판: 읽('상판'), 하판: 읽('하판'),
               말: [...document.querySelectorAll('.opt[data-opt="측판"] small')].map(x => x.textContent),
               낮은칸: [...document.querySelectorAll('.opt[data-opt="측판"] .optnum input')]
                 .filter(i => Math.abs(i.getBoundingClientRect().height - 34) > 0.6).length }; }); };

  console.log('① 상판 사이 · 하판 사이 — 예전 그대로');
  { const r = await 판({ topStyle:'inset', botStyle:'inset' });
    맞나('측판 판', r.측판, ['측판유격']);
    맞나('상판 판 · 하판 판', [r.상판, r.하판], [['상부유격'], ['하판 올림']]);
    맞나('한 마디', r.말, []); }

  console.log('② 상판 위 · 하판 사이 — 측판 판에 (상판) 줄이 뜬다');
  { const r = await 판({ topStyle:'overlay', botStyle:'inset' });
    // 「측판 내밈」 은 안 나온다 — 상판이 측판을 덮으면 쓸 자리가 없다(09-30 둘째 말씀)
    // 10-01 사장님 말씀으로 이름이 「상판유격」 이 되고 그 아래 깊이 칸이 하나 붙었다(§4.9896)
    맞나('측판 판', r.측판, ['측판 들임']);
    맞나('상판 판 — 상판유격이 여기 있다(10-01)', r.상판, ['상판유격']);
    맞나('하판 판은 그대로', r.하판, ['하판 올림']);
    맞나('한 마디 (한 쪽뿐이라 안 붙는다)', r.말, []); }

  console.log('③ 상판 사이 · 하판 아래 — 측판 판에 (하판) 줄이 뜬다');
  { const r = await 판({ topStyle:'inset', botStyle:'under' });
    맞나('측판 판', r.측판, ['측판유격', '측판 들임 (하판)']);
    맞나('하판 판에서 사라짐', r.하판, []);
    맞나('상판 판은 그대로', r.상판, ['상부유격']);
    맞나('한 마디', r.말, []); }

  console.log('④ 상판 위 · 하판 아래 — 두 줄이 다 뜨고 한 마디가 붙는다');
  { const r = await 판({ topStyle:'overlay', botStyle:'under' });
    맞나('측판 판 · 이름이 갈려 있다', r.측판, ['측판 들임 (하판)', '측판 들임']);
    맞나('같은 이름 두 줄', r.측판.length - new Set(r.측판).size, 0);
    맞나('상판 판 · 하판 판', [r.상판, r.하판], [['상판유격'], []]);
    맞나('한 마디 (어느 것과 다투는지 적는다 — 판이 갈렸다)', r.말, ['「상판유격」 과 큰 쪽만 들어갑니다']);
    맞나('34px 아닌 입력칸', r.낮은칸, 0); }

  console.log('⑤ 값이 도면에 먹는다 — 둘은 한 자리를 다퉈 큰 쪽만 먹는다');
  const 재 = () => p.evaluate(() => { const m = window.__probe.model();
    return [m.안왼, m.innerW, m.parts.filter(q => q.name === '측판').map(q => q.x)]; });
  // 칸이 없으면 기다리지 않는다 — 고치기 전 판에서는 측판 판에 이 칸이 없어 30초를 멎는다
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
  맞나('0 · 0 (고치기 전과 같은 자리)', await 재(), [18, 764, [0, 782]]);
  await 넣('측판들임', 2);      맞나('상판 2 · 하판 0', await 재(), [20, 760, [2, 780]]);
  await 넣('하판측판들임', 3);  맞나('상판 2 · 하판 3 → 큰 쪽 3', await 재(), [21, 758, [3, 779]]);
  await 넣('측판들임', 5);      맞나('상판 5 · 하판 3 → 큰 쪽 5', await 재(), [23, 754, [5, 777]]);
  await 넣('측판들임', 0); await 넣('하판측판들임', 0);
  맞나('도로 0 · 0', await 재(), [18, 764, [0, 782]]);

  console.log('⑥ 상판이 측판 위면 「측판 내밈」 은 칸도 없고 셈에서도 0 이다');
  /* 10-01 사장님 둘째 말씀으로 **측판은 겉면 자리에 그대로 있고 상판이 뒤로 들어간다**(§4.9899 아래).
     그래서 측판 y 는 늘 0 · 깊이는 CD 고, 실제외경도 측밈 을 넣어도 안 변한다.
     여기서 보는 것은 **「측판 위」 면 측밈이 0 이 되고 담긴 값은 남는가**이므로 그 자리만 고쳤다. */
  const 측 = () => p.evaluate(() => { const m = window.__probe.model();
    const q = m.parts.filter(x => x.name === '측판')[0];
    return [q.y, q.cut.W, m.측밈, m.외경.D, window.__probe.rule().측판내밈]; });
  { await 판({ topStyle:'inset', botStyle:'inset', doorMode:'in' });   // 인도어라야 외경이 내밈을 따라간다
    await 넣('측판내밈', 2.5);
    맞나('측판 사이 · 내밈 2.5', await 측(), [0, 400, 2.5, 402.7, 2.5]);
    await 판({ topStyle:'overlay' });
    // 담긴 값(2.5)은 그대로 두고 **보고 쓰는 것만** 막는다
    맞나('측판 위 — 내밈 0 과 같고 담긴 값은 남는다', await 측(), [0, 400, 0, 402.7, 2.5]);
    맞나('측판 위 — 측판 판에 내밈 칸 없다',
      await p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="측판"] .optnum label')].map(l => l.textContent)),
      ['측판 들임']);   // 「측판 내밈」 은 안 나온다 · 「상판유격」 은 상판 판에 있다
    await 판({ topStyle:'inset' });
    맞나('도로 측판 사이 — 2.5 가 살아난다', await 측(), [0, 400, 2.5, 402.7, 2.5]);
    await 넣('측판내밈', 0);
    맞나('0 으로 되돌림', await 측(), [0, 400, 0, 402.7, 0]);
    await 판({ doorMode:'out' }); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

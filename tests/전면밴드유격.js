#!/usr/bin/env node
/* 10-01 사장님 말씀 셋
     「…하판유격 옵션이 생성되어야 합니다」
     「전면밴드 옵션에 **전면밴드유격** 이 있어야 하며 이는 전면밴드가 **측판안으로 0.5mm 단위로 들어가** 위치 할수 있어야 합니다」
     「전면밴드의 **기본위치는 하판의 유격 세팅에 맞춰 변경**되는것이 기본위치 세팅값입니다」

     ① 둘 다 0 이면 예전 그대로다 (전면밴드 y 30 · 키 80 · 재단 80)
     ② 「전면밴드유격」 은 **앞뒤로만** 움직인다 — 측판 안으로 들어간다. 키·재단·다른 부속은 그대로
     ③ 「하판유격」 을 올리면 전면밴드가 **따라 올라간다** — 하판 밑면과 틈 0
     ④ 둘을 같이 켜도 서로 안 섞인다
     ⑤ 화면 — 하판 판은 「하판유격」, 전면밴드 판에 「전면밴드유격」(34px · 0.5 걸음) · **진짜 손가락**으로 저장하면 먹는다
     ⑥ 유격을 아무리 줘도 부속끼리 안 겹친다

   돌리는 법:  node tests/전면밴드유격.js
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
  const 재 = (유, 올) => p.evaluate(v => {
    const R = window.__probe.rule(); R.전면밴드유격 = v.유; R.하판올림 = v.올;
    window.__probe.set({ topStyle:'inset', botStyle:'inset', backMode:'cover', doorMode:'in', plinth:80 });
    const m = window.__probe.model(), 것 = n => m.parts.find(q => q.name === n);
    const 밴 = 것('전면밴드'), 하 = 것('하판'), 측 = 것('측판'), 보 = 것('보호대');
    return { 전면밴드:[밴.y, 밴.z, 밴.h, 밴.cut.W, 밴.w, 밴.d], 하판:[하.x, 하.z, 하.d],
             측판:[측.x, 측.y, 측.d], 보호대키: 보 ? 보.h : null,
             틈: +((하.z) - (밴.z + 밴.h)).toFixed(2), 외경H: m.외경.H };
  }, { 유, 올 });

  console.log('① 둘 다 0 이면 예전 그대로다');
  const 처음 = { 전면밴드:[30, 0, 80, 80, 764, 18], 하판:[18, 80, 400], 측판:[0, 0, 400], 보호대키:80, 틈:0, 외경H:1800 };
  맞나('기본', await 재(0, 0), 처음);

  console.log('② 「전면밴드유격」 은 앞뒤로만 — 측판 안으로 들어간다');
  for (const [유, y] of [[0.5, 30.5], [3, 33], [10, 40]]) {
    const r = await 재(유, 0);
    맞나(`전면밴드유격 ${유}`, r, Object.assign({}, 처음, { 전면밴드:[y, 0, 80, 80, 764, 18] }));
  }

  console.log('③ 「하판유격」 을 올리면 전면밴드가 따라 올라간다 (틈 0)');
  for (const [올, 키] of [[2, 82], [5, 85], [12.5, 92.5]]) {
    const r = await 재(0, 올);
    맞나(`하판유격 ${올} — 전면밴드 키·재단 · 하판 밑 · 틈`,
      [r.전면밴드[2], r.전면밴드[3], r.하판[1], r.틈], [키, 키, 80 + 올, 0]);
  }

  console.log('④ 둘을 같이 켜도 안 섞인다');
  { const r = await 재(3, 2);
    맞나('전면밴드유격 3 · 하판유격 2', r.전면밴드, [33, 0, 82, 82, 764, 18]);
    맞나('하판·측판은 그대로', [r.하판[0], r.하판[2], r.측판], [18, 400, [0, 0, 400]]); }
  await 재(0, 0);

  console.log('⑤ 화면 — 이름과 칸 · 진짜 손가락으로 저장하면 먹는다');
  { const 펴 = async n => { const b2 = p.locator(`.pname[data-opt="${n}"]`);
      if (await b2.getAttribute('aria-expanded') !== 'true') await 손가락(`.pname[data-opt="${n}"]`); };
    await 펴('하판');
    맞나('하판 판 줄', await p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="하판"] .optnum label')].map(l => l.textContent)),
      ['하판유격']);
    await 손가락('.pname[data-opt="하판"]');
    await 펴('전면밴드');
    맞나('전면밴드 판 줄', await p.evaluate(() => [...document.querySelectorAll('.opt[data-opt="전면밴드"] .optnum label')].map(l => l.textContent)),
      ['전면밴드유격']);
    const 자 = '.opt[data-opt="전면밴드"] input[data-rule="전면밴드유격"]';
    맞나('칸 크기 · 걸음', await p.evaluate(x => { const i = document.querySelector(x);
      if (!i) return null; const r = i.getBoundingClientRect();
      return [+r.width.toFixed(1) + '×' + r.height.toFixed(0), i.step]; }, 자), ['52.6×34', '0.5']);
    if (await p.locator(자).count()){
      await 손가락(자);
      await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
      await p.keyboard.type('4.5'); await 잠(300);
      맞나('치는 동안에는 안 먹는다 (§4.9893)',
        await p.evaluate(() => window.__probe.model().parts.find(q => q.name === '전면밴드').y), 30);
      await 손가락('.opt[data-opt="전면밴드"] [data-optsave]');
      맞나('저장하면 먹는다',
        await p.evaluate(() => [window.__probe.rule().전면밴드유격,
                                window.__probe.model().parts.find(q => q.name === '전면밴드').y]), [4.5, 34.5]);
    } else 맞나('전면밴드 판에 「전면밴드유격」 칸이 있나', false, true);
    await p.evaluate(() => { window.__probe.rule().전면밴드유격 = 0; window.__probe.set({}); }); await 잠(300); }

  console.log('⑥ 유격을 아무리 줘도 부속끼리 안 겹친다');
  { const r = await p.evaluate(() => {
      const 겹 = (a, b2) => { const o = (a1,a2,b1,b3) => Math.min(a2,b3) - Math.max(a1,b1);
        return o(a.x,a.x+a.w,b2.x,b2.x+b2.w) > 0.001 && o(a.y,a.y+a.d,b2.y,b2.y+b2.d) > 0.001 && o(a.z,a.z+a.h,b2.z,b2.z+b2.h) > 0.001; };
      const R = window.__probe.rule(); const 짝 = {}; let 갈래 = 0;
      for (const 유 of [0, 3, 10, 50]) for (const 올 of [0, 2, 10]) for (const 밴 of [80, 120]){
        R.전면밴드유격 = 유; R.하판올림 = 올;
        window.__probe.set({ topStyle:'inset', botStyle:'inset', backMode:'cover', doorMode:'in', plinth:밴 });
        const ps = window.__probe.model().parts; 갈래++;
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++)
          if (겹(ps[i], ps[j])) 짝[[ps[i].name, ps[j].name].sort().join('↔')] = 1;
      }
      R.전면밴드유격 = 0; R.하판올림 = 0; return { 갈래, 겹친갈래: Object.keys(짝) }; });
    맞나('덮기 ' + r.갈래 + '갈래 — 겹친 짝', r.겹친갈래, []); }

  맞나('오류', 터짐, []);
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

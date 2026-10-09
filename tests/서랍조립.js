#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**서랍장 품목의 2D 도면에 조립된 서랍(마이다+서랍)에 대한 정보가 포함 되어야 합니다.**」

     ① 서랍장에만 **맨 뒤에 한 쪽**이 는다 — 앞 쪽들의 이름·차례가 그대로고 1쪽 차례에도 든다
     ② 쪽에 적힌 조립 치수가 **조각을 감싼 네모**와 같다 — 마이다측판유격 0 과 10 **둘 다**
     ③ 한 벌에 든 장수(마이다1 · 서랍재W2 · 서랍재D2 · 서랍바닥1) · 벌 수 · 레일길이
     ④ 쪽이 A4(210×297) 밖으로 **한 톨도 안 나간다** — 여덟 갈래
     ⑤ 폰 375 — 썸네일 단추가 **44px** 이고 진짜 손가락으로 눌러 그 쪽이 보인다 · 「크게」 44 · 가로 넘침 0
     ⑥ 서랍재가 안 서면 쪽도 **없다** (수납장 · 서랍재를 다 지운 서랍장)
     ⑦ **수납장은 한 톨도 안 바뀐다** — 쪽 수·부속서·도면 조각

   돌리는 법:  node tests/서랍조립.js
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
    'rule:()=>규칙,st:()=>state,행:()=>부속행들(buildModel(state)),본:(n)=>본이름(n),손질:()=>손질,' +
    'draw:()=>buildDrawing(state,buildModel(state)),쪽:()=>부속쪽들(buildModel(state))};' + 못);
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
  const ctx = await b.newContext({ viewport:{ width:375, height:874 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(600);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(320); return true; };
  const 품목 = async 품 => { await 손가락('#itemSel'); await p.selectOption('#itemSel', 품); await 잠(600); };
  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(350); };
  const 규칙두기 = async o => { await p.evaluate(x => { Object.assign(window.__probe.rule(), x); window.__probe.set({}); }, o); await 잠(350); };

  // 쪽 목록 — 고치기 전 판에도 `쪽()` 은 있으므로 널 걱정이 없다.
  const 쪽들 = () => p.evaluate(() => window.__probe.쪽().map(z => z.이름들.join('·')));
  // 조립 쪽의 글자를 그대로 뽑는다. 쪽이 없으면 null.
  const 조립글 = () => p.evaluate(() => {
    const z = window.__probe.쪽().slice(-1)[0];
    if (!z || z.이름들.join('') !== '서랍 조립도') return null;
    const 글 = [...z.svg.matchAll(/>([^<>]+)<\/text>/g)].map(x => x[1]);
    const 값 = 이름 => { const i = 글.indexOf(이름); return i < 0 ? null : 글[i+1]; };
    return { 글, 값:이름 => null, 조립:[값('조립 폭'), 값('조립 깊이'), 값('조립 높이')],
             서랍:[값('서랍 폭'), 값('서랍 깊이'), 값('서랍 높이')],
             벌:값('벌 수'), 레일:값('레일길이'),
             장수:글.filter(t => /장$/.test(t)) };
  });
  // 조각을 감싼 네모 — 쪽이 보는 것과 **같은 자**로 여기서 따로 센다
  const 감싼네모 = () => p.evaluate(() => {
    const m = window.__probe.model(), 문 = n => window.__probe.본(n) === '문짝';
    const 한벌 = m.parts.filter(x => x.서랍번호 === 0), 재 = 한벌.filter(x => !문(x.name));
    if (!재.length) return null;
    const 네 = 목 => [+(Math.max(...목.map(q=>q.x+q.w))-Math.min(...목.map(q=>q.x))).toFixed(3),
                      +(Math.max(...목.map(q=>q.y+q.d))-Math.min(...목.map(q=>q.y))).toFixed(3),
                      +(Math.max(...목.map(q=>q.z+q.h))-Math.min(...목.map(q=>q.z))).toFixed(3)];
    return { 조립:네(한벌), 서랍:네(재), 칸수:m.서랍칸수, 레일:m.레일길이 };
  });
  const fmt1 = n => String(Math.round(n*10)/10);

  console.log('① 서랍장에만 맨 뒤에 한 쪽이 는다');
  await 품목('서랍장');
  await 두기({ W:800, D:400, H:1800, doors:4, backMode:'cover', doorMode:'out', plinth:80 });
  const 서랍쪽 = await 쪽들();
  // 10-09 — 맨 앞에 「제품 스펙서」 한 쪽이 늘었다(§4.9834). **조립도가 맨 뒤라는 것**이 여기서 보는 것이다.
  맞나('쪽 이름 — 맨 뒤가 조립도', 서랍쪽, ['제품 스펙서','측판·상판','하판·마이다·서랍재W','서랍재D·서랍바닥·가로대','전면밴드·뒷판','서랍 조립도']);

  console.log('② 쪽에 적힌 조립 치수 = 조각을 감싼 네모');
  for (const 유격 of [0, 10]){
    await 규칙두기({ 마이다측판유격: 유격 });
    const g = await 조립글(), n = await 감싼네모();
    맞나(`유격 ${유격} — 조립 폭·깊이·높이`, g && g.조립, n && n.조립.map(fmt1));
    맞나(`유격 ${유격} — 서랍 폭·깊이·높이`, g && g.서랍, n && n.서랍.map(fmt1));
  }
  await 규칙두기({ 마이다측판유격: 0 });

  console.log('③ 한 벌에 든 장수 · 벌 수 · 레일길이');
  { const g = await 조립글(), n = await 감싼네모();
    맞나('장수', g && g.장수, ['마이다 1장','서랍재W 2장','서랍재D 2장','서랍바닥 1장']);
    맞나('벌 수 = 서랍 칸수', [g && g.벌, String(n && n.칸수)], ['4','4']);
    맞나('레일길이', g && g.레일, String(n && n.레일)); }

  console.log('④ 쪽이 A4 밖으로 안 나간다');
  const 밖 = async () => p.evaluate(() => {
    const z = window.__probe.쪽().slice(-1)[0];
    if (!z || z.이름들.join('') !== '서랍 조립도') return null;
    const s = z.svg; let 밖 = 0;
    const 봄 = (x,y) => { if (x < 0 || x > 210 || y < 0 || y > 297) 밖++; };
    for (const m of s.matchAll(/x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)){ 봄(+m[1],+m[2]); 봄(+m[3],+m[4]); }
    for (const m of s.matchAll(/<rect[^>]*x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/g)){ 봄(+m[1],+m[2]); 봄(+m[1]+ +m[3], +m[2]+ +m[4]); }
    for (const m of s.matchAll(/<text[^>]*x="([-\d.]+)" y="([-\d.]+)"/g)) 봄(+m[1],+m[2]);
    return 밖; });
  const 갈래 = [['2칸',{doors:2}], ['8칸',{doors:8}], ['1칸',{doors:1}],
                ['내부',{doors:4,doorMode:'in'}], ['끼우기',{doorMode:'out',backMode:'insert'}],
                ['바닥 덮기',{backMode:'cover',서랍바닥꼴:'cover'}],
                ['작은 장',{W:600,D:500,H:900,서랍바닥꼴:'insert'}],
                ['큰 장',{W:2400,D:800,H:2400,doors:8}]];
  const 밖들 = [];
  for (const [nm, st] of 갈래){ await 두기(st); 밖들.push([nm, await 밖()]); }
  맞나('여덟 갈래 — A4 밖으로 나간 점', 밖들, 갈래.map(([nm]) => [nm, 0]));

  console.log('⑤ 폰 375 — 썸네일 44px · 진짜 손가락 · 「크게」 · 가로 넘침');
  await 두기({ W:800, D:400, H:1800, doors:4, backMode:'cover', doorMode:'out' });
  await p.evaluate(() => document.querySelector('.modeseg button[data-mode="2d"]').click());
  await 잠(500);
  const 썸 = await p.$$('#thumbs .thumb');
  const 끝 = 썸[썸.length - 1];
  await 끝.scrollIntoViewIfNeeded(); await 잠(150);
  const 썸크기 = await 끝.boundingBox();
  맞나('썸네일 단추 — 닿는 자리 44 이상', [썸.length, Math.round(썸크기.width) >= 44, Math.round(썸크기.height) >= 44], [7, true, true]);
  const r = await 끝.boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await 잠(450);
  맞나('손가락으로 눌러 그 쪽이 보인다', await p.evaluate(() => {
    const pg = document.querySelector('#pageBox>.page.보는쪽'), q = pg.getBoundingClientRect();
    return { 번호: pg.querySelector('.pnum').textContent,
             크게: (() => { const z = pg.querySelector('.big').getBoundingClientRect(); return [Math.round(z.width), Math.round(z.height)]; })(),
             쪽: [Math.round(q.width), Math.round(q.height)],
             넘침: document.documentElement.scrollWidth }; }),
    { 번호:'7 / 7', 크게:[56,44], 쪽:[375,530], 넘침:375 });
  맞나('1쪽 차례에 든다', await p.evaluate(() =>
    [...document.querySelectorAll('.toc div span')].length && document.querySelector('.toc').textContent.includes('서랍 조립도')), true);
  await p.evaluate(() => document.querySelector('.modeseg button[data-mode="3d"]').click());
  await 잠(300);

  console.log('⑥ 서랍재가 안 서면 쪽도 없다');
  await p.evaluate(() => { const h = window.__probe.손질();
    h.지움 = ['서랍재D@짝:0','서랍재D@짝:1','서랍재D@짝:2','서랍재D@짝:3','서랍재D@짝:4','서랍재D@짝:5','서랍재D@짝:6','서랍재D@짝:7',
              '서랍재W@짝:0','서랍재W@짝:1','서랍재W@짝:2','서랍재W@짝:3','서랍재W@짝:4','서랍재W@짝:5','서랍재W@짝:6','서랍재W@짝:7',
              '서랍바닥@짝:0','서랍바닥@짝:1','서랍바닥@짝:2','서랍바닥@짝:3']; window.__probe.set({}); });
  await 잠(350);
  맞나('서랍재를 다 지우면 조립 쪽이 없다', await p.evaluate(() =>
    window.__probe.쪽().some(z => z.이름들.join('') === '서랍 조립도')), false);
  await p.evaluate(() => { window.__probe.손질().지움 = []; window.__probe.set({}); });
  await 잠(350);

  console.log('⑦ 수납장은 한 톨도 안 바뀐다');
  await 품목('수납장');
  await 두기({ W:800, D:400, H:1800, doors:2, backMode:'cover', doorMode:'out', plinth:80 });
  맞나('수납장 쪽 이름', await 쪽들(), ['제품 스펙서','측판·상판','하판·문짝·고정선반','전면밴드·뒷판']);
  맞나('수납장에는 조립 쪽이 없다', await 조립글(), null);
  맞나('수납장 부속서 · 도면 조각', await p.evaluate(() => ({
    부속서: window.__probe.행().map(r => `${r.name}|${r.qty}|${r.L}|${r.W}|${r.T}`).join('|'),
    조각: window.__probe.draw().P.length })),
    { 부속서:'측판|2|1800|400|18|상판|1|764|400|18|하판|1|764|400|18|문짝|2|1713|396|18|고정선반|3|764|400|18|전면밴드|1|764|80|18|뒷판|1|1716|796|2.7',
      조각: 968 });

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

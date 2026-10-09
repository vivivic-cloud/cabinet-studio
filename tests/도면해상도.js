#!/usr/bin/env node
/* 10-09 사장님 말씀: 「**도면의 해상도가 너무 떨어져 확대시 도면라인과 텍스트 등이 명확하지 않습니다**」

   「크게」 가 `transform: scale` 로 키우고 있었다 — 브라우저가 **375px 로 그려 둔 그림을 늘인다.**
   `zoom` 으로 바꾸면 레이아웃을 다시 잡아 **그 크기 그대로 벡터로 그린다.** 보이는 모습은 같다.

     ① 「크게」 에서 **그려 내는 폭 = 보이는 폭** 이다 (전에는 375 에 박혀 있었다)
     ② `transform` 에 `scale` 이 없고 `will-change:transform` 도 없다
     ③ **보이는 모습이 전과 같다** — 배율·자리·선 굵기·글자 크기·차례 글자가 배만큼 커진다
     ④ 밀기·가두기·맞춤·휠·두 손가락이 그대로 된다
     ⑤ **화면 도면(#pageBox)은 한 톨도 안 건드렸다** — 참 SVG 이고 굳힌 그림이 한 군데도 없다
     ⑥ DXF 네 기준값(글자수)·재단 치수 여덟 개가 그대로 · 오류 0

   돌리는 법:  node tests/도면해상도.js
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

const 원본 = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
const 손질 = () => {
  let s = 원본;
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},' +
    'dxf:()=>buildDXF(drawing),행:()=>부속행들(모델||buildModel(state))};' + 못);
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

// 「크게」 한 판을 재는 자. 보이는 값은 다 **화면 픽셀**로 환산해 적는다 —
// `zoom` 이든 `scale` 이든 보이는 모습이 같으면 이 값들이 같아야 한다.
const 큰그림재기 = p => p.evaluate(() => {
  const box = document.querySelector('#zoomBox'), wrap = document.querySelector('#zoomWrap');
  if (!box || !wrap || !box.firstElementChild) return { 없음:true };
  const cs = getComputedStyle(box), 줌 = parseFloat(cs.zoom) || 1;
  const r = box.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  const 보임배 = r.width / parseFloat(cs.width);            // 보이는 폭 ÷ 레이아웃 폭
  const page = box.firstElementChild, svg = page.querySelector('svg');
  const ln = svg.querySelector('.OUTLINE'), t = svg.querySelector('text'), toc = page.querySelector('.toc>div');
  return {
    배: document.querySelector('#zoomPct').textContent,
    그린폭: Math.round(parseFloat(cs.width) * 줌),            // 브라우저가 **그려 내는** 폭
    보임폭: Math.round(r.width), 보임높: Math.round(r.height),
    왼: Math.round(r.left - w.left), 위: Math.round(r.top - w.top),
    선: +(parseFloat(getComputedStyle(ln).strokeWidth) * 보임배).toFixed(2),
    글자: +(parseFloat(getComputedStyle(t).fontSize) * 보임배).toFixed(1),
    차례: toc ? +(parseFloat(getComputedStyle(toc).fontSize) * 보임배).toFixed(1) : null,
    스케일있나: /matrix\(\s*(?!1[,)])/.test(cs.transform) && !/matrix\(1, 0, 0, 1/.test(cs.transform),
    굳힘: cs.willChange,
  };
});

const 이디 = async p => {
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('.modeseg button[data-mode="2d"]')].find(x => x.offsetParent !== null)
           || document.querySelector('.modeseg button[data-mode="2d"]');
    b.click(); });
  await 잠(1300);
};
const 크게 = async p => { await p.evaluate(() => document.querySelector('#pageBox .page.보는쪽 .big').click()); await 잠(900); };
const 올리기 = async (p, 목표) => {
  for (let i = 0; i < 25; i++){
    const v = await p.evaluate(() => Number(document.querySelector('#zoomPct').textContent.replace('%','')));
    if (v >= 목표 - 1) break;
    await p.click('#zoomIn'); await 잠(60);
  }
  await 잠(420);
};

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{ width:375, height:812 }, deviceScaleFactor:3, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(900);

  /* ───────── ⑤ 화면 도면은 참 SVG 다 — 굳힌 그림이 한 군데도 없다 ───────── */
  console.log('⑤ 화면 도면은 참 SVG');
  맞나('굳힌 그림(canvas·toDataURL·<image>·xlink:href) 자리',
    (원본.match(/toDataURL|<image\b|xlink:href/g) || []).length, 0);
  await 이디(p);
  const 화면 = await p.evaluate(() => {
    const svg = document.querySelector('#pageBox .page.보는쪽 svg');
    const cs = getComputedStyle(svg), pb = getComputedStyle(document.querySelector('#pageBox'));
    return { 꼴: svg.tagName, 폭속성: svg.getAttribute('width'), 뷰박스있나: !!svg.getAttribute('viewBox'),
      굳힘: cs.willChange, 변형: cs.transform, 쪽변형: getComputedStyle(svg.parentNode).transform,
      칸변형: pb.transform };
  });
  맞나('화면 도면', 화면,
    { 꼴:'svg', 폭속성:null, 뷰박스있나:true, 굳힘:'auto', 변형:'none', 쪽변형:'none', 칸변형:'none' });

  /* ───────── ①②③ 「크게」 ───────── */
  console.log('①②③ 「크게」 — 그려 내는 폭 = 보이는 폭');
  await 크게(p);
  const 맞춤 = await 큰그림재기(p);
  맞나('맞춤 — 그린폭·보임폭', [맞춤.그린폭, 맞춤.보임폭], [375, 375]);
  맞나('맞춤 — 선·글자·차례', [맞춤.선, 맞춤.글자, 맞춤.차례], [1.4, 117, 13]);

  for (const [목표, 보임, 높, 왼, 위, 선, 글자, 차례] of
       [[274, 1029, 1455, -327, -365, 3.84, 321, 35.7],
        [538, 2017, 2852, -821, -1063, 7.53, 629.3, 69.9],
        [800, 3000, 4243, -1312, -1758, 11.2, 936, 104]]){
    await 올리기(p, 목표);
    const z = await 큰그림재기(p);
    맞나(`${목표}% — **그려 내는 폭 = 보이는 폭**`, [z.그린폭, z.보임폭], [보임, 보임]);
    맞나(`${목표}% — 보이는 모습(높이·자리)`, [z.보임높, z.왼, z.위], [높, 왼, 위]);
    맞나(`${목표}% — 선·글자·차례가 배만큼 커진다`, [z.선, z.글자, z.차례], [선, 글자, 차례]);
    맞나(`${목표}% — scale 없음 · 굳힘 없음`, [z.스케일있나, z.굳힘], [false, 'auto']);
  }

  /* ───────── ④ 밀기·가두기·맞춤·휠·두 손가락 ───────── */
  console.log('④ 밀기·가두기·맞춤·휠·두 손가락');
  await p.mouse.move(180, 400); await p.mouse.down(); await p.mouse.move(60, 250, { steps:6 }); await p.mouse.up();
  await 잠(300);
  const 민 = await 큰그림재기(p);
  맞나('민 뒤 — 자리가 움직인다', [민.왼, 민.위], [-1432, -1908]);
  for (let i = 0; i < 4; i++){ await p.mouse.move(100, 400); await p.mouse.down();
    await p.mouse.move(360, 700, { steps:4 }); await p.mouse.up(); await 잠(80); }
  await 잠(300);
  const 끝 = await 큰그림재기(p);
  맞나('끝까지 밀어도 안 벗어난다', [끝.왼 <= 0, 끝.위 <= 0, 끝.왼 >= 375 - 끝.보임폭, 끝.위 >= 724 - 끝.보임높],
    [true, true, true, true]);
  await p.click('#zoomFit'); await 잠(420);
  const 맞2 = await 큰그림재기(p);
  맞나('맞춤으로 돌아온다', [맞2.배, 맞2.그린폭, 맞2.보임폭, 맞2.왼, 맞2.위], ['100%', 375, 375, 0, 97]);
  await p.mouse.move(180, 400); await p.mouse.wheel(0, -600); await 잠(500);
  const 휠 = await 큰그림재기(p);
  맞나('휠 — 그려 내는 폭이 따라온다', [휠.배, 휠.그린폭, 휠.보임폭], ['138%', 516, 516]);
  await p.click('#zoomFit'); await 잠(420);
  const cdp = await ctx.newCDPSession(p);
  const 손 = (t, a, c) => cdp.send('Input.dispatchTouchEvent',
    { type:t, touchPoints: t === 'touchEnd' ? [] : [{x:a[0],y:a[1],id:1},{x:c[0],y:c[1],id:2}] });
  await 손('touchStart', [150,380], [230,420]); await 잠(60);
  await 손('touchMove', [90,320], [290,480]); await 잠(80);
  await 손('touchMove', [40,260], [340,540]); await 잠(80);
  await 손('touchEnd'); await 잠(420);
  const 핀 = await 큰그림재기(p);
  맞나('두 손가락 — 그려 내는 폭이 따라온다', [핀.배, 핀.그린폭, 핀.보임폭], ['459%', 1721, 1721]);
  await p.evaluate(() => document.querySelector('#zoomClose').click()); await 잠(400);

  /* ───────── ⑥ 내보내는 것은 한 글자도 안 바뀐다 ───────── */
  console.log('⑥ DXF·재단 치수 그대로');
  const dxf = await p.evaluate(() => window.__probe.dxf().length);
  맞나('DXF 글자수(덮기 기본)', dxf, 70745);
  const 재단 = await p.evaluate(() => window.__probe.행().map(r => `${r.name}|${r.qty}|${r.L}|${r.W}|${r.T}`));
  맞나('재단 치수 일곱', 재단, ['측판|2|1800|400|18','상판|1|764|400|18','하판|1|764|400|18',
    '문짝|2|1713|396|18','고정선반|3|764|400|18','전면밴드|1|764|80|18','뒷판|1|1716|796|2.7']);
  맞나('오류', 터짐.length, 0);

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

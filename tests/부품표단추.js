#!/usr/bin/env node
/* 10-01 사장님 말씀: 「**부품표는 부품표보기 버튼으로 보이게 해줘 도면에 집중할 수 있도록**」

     ① 부품표 칸이 화면에서 안 보인다 (3D·2D 두 모드 다)
     ② 머리에 「부품표」 단추가 있고 누르면 판이 열린다 (예전 「크게 보기」 판 그대로)
     ③ 판 안에 표가 그려진다 · 닫으면 다시 닫힌다
     ④ 부품표 줄은 그대로 채워진다 (숨긴 것이지 끈 것이 아니다 — PDF·판이 그것을 쓴다)
     ⑤ 그만큼 도면 칸이 넓어진다 (1280 에서 A4 한 쪽이 커진다)

   돌리는 법:  node tests/부품표단추.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();}};' + 못);
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
  for (const 폭 of [375, 1280]) {
    console.log(`■ ${폭}px`);
    const ctx = await b.newContext({ viewport:{ width:폭, height:폭 === 375 ? 780 : 900 } });
    const p = await ctx.newPage();
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
    await 잠(700);
    const 보임 = s => p.evaluate(x => { const e = document.querySelector(x);
      if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    const 모드 = async 쪽 => { await p.evaluate(n => {
        const b2 = [...document.querySelectorAll('.modeseg label,.modeseg button')].find(x => x.textContent.toUpperCase().includes(n));
        if (b2) b2.click(); }, 쪽); await 잠(800); };

    console.log('① 부품표 칸이 화면에서 안 보인다');
    맞나('3D 모드', await 보임('.bom'), false);
    await 모드('2D');
    맞나('2D 모드', await 보임('.bom'), false);

    console.log('② 머리에 「부품표」 단추');
    맞나('단추가 있나', await p.locator('#btnBomOpen').count(), 1);
    맞나('판이 닫혀 있나', await p.evaluate(() => document.querySelector('#bomDlg').open === true), false);
    if (await p.locator('#btnBomOpen').count()){
      await p.click('#btnBomOpen'); await 잠(600);
      console.log('③ 판이 열리고 표가 그려진다');
      맞나('판 열림 · 표 SVG',
        await p.evaluate(() => [document.querySelector('#bomDlg').open === true,
                               document.querySelectorAll('#bomBig svg').length]), [true, 1]);
      await p.click('#bClose'); await 잠(400);
      맞나('닫힘', await p.evaluate(() => document.querySelector('#bomDlg').open === true), false);
    }

    console.log('④ 부품표 줄은 그대로 채워진다');
    맞나('부품표 줄 수', await p.evaluate(() => document.querySelectorAll('#bomBody tr').length), 7);

    console.log('⑤ 도면 칸이 넓어졌다');
    { const r = await p.evaluate(() => { const d = document.querySelector('.draw').getBoundingClientRect();
        const pg = document.querySelector('#pageBox .page').getBoundingClientRect();
        return [+d.height.toFixed(0), +pg.width.toFixed(0) + '×' + pg.height.toFixed(0)]; });
      맞나('도면 칸 높이 · A4 한 쪽', r, 폭 === 375 ? [655, '329×465'] : [831, '453×641']); }

    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

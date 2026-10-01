#!/usr/bin/env node
/* 10-01 사장님 말씀: 「**2D /3D 변환시 외경입력부의 이질감이 없도록 해줘 두가지의 입력부가 너무 다르게
   생겼고 위치도 다름**」

     ① 두 모드에서 띠 크기가 같다 (270×36 · 칸 셋 87.3)
     ② 두 모드에서 자리가 같다 — 칸 왼쪽에서 14 · **보이는 속 윗끝에서 12**
     ③ 가장 긴 값(2400·800·2400)이 안 잘리고 한 줄이다
     ④ 두 모드에서 다 고쳐진다
     ⑤ 2D 에서 도면 글자를 안 가린다 · `.hud` 와 안 겹친다

   돌리는 법:  node tests/외형띠.js
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state)};' + 못);
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
    const 모드 = async n => { await p.evaluate(x => {
        const b2 = [...document.querySelectorAll('.modeseg label,.modeseg button')].find(y => y.textContent.toUpperCase().includes(x));
        if (b2) b2.click(); }, n); await 잠(900); };
    // 띠의 크기와 **칸 속 윗끝에서의 자리** — 2D 는 머리줄 밑이 속 윗끝이다
    const 띠 = () => p.evaluate(() => { const t = document.querySelector('#dimsBar');
      const r = t.getBoundingClientRect(), 칸 = t.parentElement.getBoundingClientRect();
      const 머리 = t.parentElement.querySelector('.panelhead');
      const 윗 = (머리 && 머리.offsetHeight) ? 칸.top + 머리.getBoundingClientRect().height : 칸.top;
      return { 크기: +r.width.toFixed(0) + '×' + r.height.toFixed(0), 왼: +(r.left - 칸.left).toFixed(0),
               윗: +(r.top - 윗).toFixed(0),
               칸셋: [...t.querySelectorAll('.d')].map(x => +x.getBoundingClientRect().width.toFixed(1)) }; });
    const 긴값 = async () => { const 값 = ['2400','800','2400'];
      for (let i = 0; i < 3; i++){ await p.click(`#dimsBar input >> nth=${i}`);
        await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
        await p.keyboard.type(값[i]); await 잠(250); }
      return p.evaluate(() => { const t = document.querySelector('#dimsBar');
        return { 잘림: [...t.querySelectorAll('input')].map(i => i.scrollWidth - i.clientWidth),
                 넘침: t.scrollWidth - t.clientWidth,
                 줄수: new Set([...t.querySelectorAll('.d')].map(x => Math.round(x.getBoundingClientRect().top))).size }; }); };

    await 모드('3D'); const a = await 띠();
    await 모드('2D'); const c = await 띠();
    console.log('① 크기가 같다  ② 자리가 같다');
    맞나('3D 띠', a, { 크기:'270×36', 왼:14, 윗:12, 칸셋:[87.3, 87.3, 87.3] });
    맞나('2D 띠', c, { 크기:'270×36', 왼:14, 윗:12, 칸셋:[87.3, 87.3, 87.3] });
    맞나('두 모드가 한 글자도 안 다르다', JSON.stringify(a) === JSON.stringify(c), true);

    console.log('③ 가장 긴 값이 안 잘리고 한 줄이다 · ④ 두 모드에서 다 고쳐진다');
    맞나('2D — 2400·800·2400', await 긴값(), { 잘림:[0,0,0], 넘침:0, 줄수:1 });
    맞나('2D 에서 고쳐진다 (내부폭)', await p.evaluate(() => window.__probe.model().innerW), 2364);
    await 모드('3D');
    맞나('3D — 2400·800·2400', await 긴값(), { 잘림:[0,0,0], 넘침:0, 줄수:1 });
    await p.click('#dimsBar input >> nth=0');
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.type('1000'); await 잠(400);
    맞나('3D 에서 고쳐진다 (내부폭)', await p.evaluate(() => window.__probe.model().innerW), 964);

    console.log('⑤ 도면 글자를 안 가린다 · `.hud` 와 안 겹친다');
    맞나('3D — .hud 와 겹침', await p.evaluate(() => {
      const t = document.querySelector('#dimsBar').getBoundingClientRect();
      const h = document.querySelector('.hud').getBoundingClientRect();
      return (t.right > h.left && t.left < h.right && t.bottom > h.top && t.top < h.bottom) ? 1 : 0; }), 0);
    await 모드('2D');
    맞나('2D — 가린 도면 글자', await p.evaluate(() => {
      const t = document.querySelector('#dimsBar').getBoundingClientRect();
      const svg = document.querySelector('#pageBox .page svg'); if (!svg) return -1;
      let n = 0; svg.querySelectorAll('text').forEach(x => { const r = x.getBoundingClientRect();
        if (r.width > 0 && r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom) n++; });
      return n; }), 0);

    맞나('오류', 터짐, []);
    await ctx.close();
  }
  await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

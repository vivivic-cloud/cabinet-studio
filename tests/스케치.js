#!/usr/bin/env node
/* 스케치 — 3D 도면의 「캡쳐본」. 한 번에 한 그림이다.

   10-14 사장님 말씀 「스케치 버전을 추가하여 … 제품의 형태를 파악할 수 있는 … 가벼운 도면」 (a1791965818)
   10-15 사장님 말씀 「**움직이는 도면이 아닌** … **고정된 그림** — 단 부속으로 정의된 각객체를 클릭하면
          이 스케치 도면에서도 해당 부속이 선택 되어야해」 (a1792027375)
   10-15 사장님 말씀 「이 그림은 **3d도면과 같은 도면의 캡쳐본** 이었으면 좋겠습니다. **네가지 모습을 모두
          보여주지말고 등각을 기본으로** 보여주면서 그림 상부에 **등각좌/등각우/ 정면/뒷면** 선택으로
          **각 그림만** 보여지게 해주세요」 (a1792029131)

     ① 스케치는 **3D 와 같은 모습**이다 — 조각이 그대로 보이고 선 덩이(와이어프레임)가 없다
     ② 그림 위에 고르개 넷(**등각좌·등각우·정면·뒷면**) · **44px** · 처음은 **등각우**
     ③ 넷을 누르면 **각각 다른 그림**이고 **한 번에 하나만** 눌려 있다
     ④ **네 모습 모두에서** 부속을 눌러 고를 수 있고 그 부속이 붉어진다
     ⑤ **돌리기·줌이 없다** — 끌어도 휠을 굴려도 카메라가 한 톨도 안 움직인다
     ⑥ **분해·동작으로 모델이 바뀌면 그림이 따라온다**
     ⑦ **3D 로 돌아오면 처음과 같다** — 고르개가 숨고 시점줄이 돌아온다
     ⑧ 폰 375 — 고르개와 그림이 다 보이고 **가로로 안 넘친다**

   돌리는 법:  node tests/스케치.js
   three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).
   ⚠ `cdnjs` 는 이 방에서 막혀 있다 — 사본을 옆에 두고 주소를 갈아 끼운다(아래 `손질()`).
   ⚠ 집 전체가 `(function(){ … })();` 로 싸여 있다 — 엿은 그 **안**에 끼워야 속이 보인다.
   ⚠ 고치기 전 판에는 이 이름들이 **아예 없다** — 터지지 않게 다 감쌌다(그래야 깨진 수를 셀 수 있다 · §4.9834). */
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
  const 엿 = 'window.__probe={grp:()=>group,scn:()=>scene,sel:()=>selPid,cam:()=>camera,model:()=>모델,'
           + '스캠:()=>{try{return 스케치캠;}catch(e){return null;}},'
           + '스보기:()=>{try{return 스케치보기;}catch(e){return null;}}};';
  return s.replace(못, 엿 + 못);
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

/* ⚠ 단추가 없어도 **터지지 않는다** — 고치기 전 판에 대고 돌려 깨진 수를 세려면 그래야 한다(§4.9834) */
const 모드누르기 = async (p, m) => {
  const 있나 = await p.evaluate(mm => {
    const b = [...document.querySelectorAll('.modeseg button[data-mode="' + mm + '"]')]
      .find(x => x.getBoundingClientRect().width > 0);
    if (!b) return false;
    b.click(); return true;
  }, m);
  맞나('「' + m + '」 단추가 눈에 보인다', 있나, true);
  await 잠(800);
};
const 시점누르기 = async (p, i) => { await p.evaluate(k => {
  const b = document.querySelector('.skv button[data-skv="' + k + '"]'); if (b) b.click(); }, i); await 잠(600); };
const 캔네모 = p => p.evaluate(() => { const r = document.querySelector('#c3d').getBoundingClientRect();
  return { x:r.x, y:r.y, w:r.width, h:r.height }; });
/* ⚠ 고치기 전 판에서는 이 이름이 **카메라 넷의 배열**이었다 — 배열은 참이라 `c ?` 로는 안 걸린다 */
const 스캠자리 = p => p.evaluate(() => { const c = window.__probe.스캠();
  return (c && c.position) ? [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.position.z.toFixed(1)] : null; });

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();

  /* ═════════ 1280 ═════════ */
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe && window.__probe.grp(), null, { timeout: 20000 });
  await 잠(900);

  const 처음 = await p.evaluate(() => ({ 조각: window.__probe.grp().children.length,
    보임: window.__probe.grp().visible, 판: document.querySelector('.app').className,
    시점줄: getComputedStyle(document.querySelector('.hud .views')).display }));
  console.log('처음 — 3D');
  맞나('조각 수 · 보임', [처음.조각, 처음.보임], [11, true]);

  /* ───────── ① 3D 와 같은 모습 ───────── */
  console.log('① 스케치는 3D 와 같은 모습이다 — 선만 그린 와이어프레임이 아니다');
  await 모드누르기(p, 'sk');
  const 스 = await p.evaluate(() => ({
    판: document.querySelector('.app').className,
    조각: window.__probe.grp().children.length, 보임: window.__probe.grp().visible,
    선덩이: window.__probe.scn().children.filter(o => o.isLineSegments && o.visible).length }));
  맞나('판 클래스', 스.판, 'app m3d sk');
  맞나('조각이 그대로 보인다 · 선 덩이 없음', [스.조각, 스.보임, 스.선덩이], [11, true, 0]);

  /* ───────── ② 고르개 넷 ───────── */
  console.log('② 그림 위에 등각좌·등각우·정면·뒷면 — 처음은 등각우');
  const 단 = await p.evaluate(() => [...document.querySelectorAll('.skv button[data-skv]')].map(x => {
    const r = x.getBoundingClientRect();
    return { 글: x.textContent, w: Math.round(r.width), h: Math.round(r.height), 눌림: x.getAttribute('aria-pressed') }; }));
  맞나('이름 넷', 단.map(x => x.글), ['등각좌','등각우','정면','뒷면']);
  맞나('닿는 자리 44px 이상', 단.length ? 단.every(x => x.h >= 44 && x.w >= 44) : false, true);
  맞나('처음 눌린 것은 등각우 하나', [단.filter(x => x.눌림 === 'true').map(x => x.글), await p.evaluate(() => window.__probe.스보기())],
       [['등각우'], 1]);

  /* ───────── ③ 넷이 각각 다른 그림 ───────── */
  console.log('③ 넷을 누르면 각각 다른 그림이고 한 번에 하나만 눌린다');
  const 자리들 = [], 눌린것 = [];
  for (let i = 0; i < 4; i++){
    await 시점누르기(p, i);
    자리들.push(await 스캠자리(p));
    눌린것.push(await p.evaluate(() => [...document.querySelectorAll('.skv button[data-skv]')]
      .filter(x => x.getAttribute('aria-pressed') === 'true').length));
  }
  맞나('네 자리가 다 다르다', new Set(자리들.map(x => JSON.stringify(x))).size, 4);
  맞나('늘 하나만 눌려 있다', 눌린것, [1,1,1,1]);

  /* ───────── ④ 네 모습 모두에서 부속을 고를 수 있다 ───────── */
  console.log('④ 네 모습 모두에서 부속을 눌러 고를 수 있다');
  const 고른것 = [];
  for (let i = 0; i < 4; i++){
    await 시점누르기(p, i);
    const q = await 캔네모(p);
    let 결 = null;
    for (const [fx, fy] of [[0.5,0.55],[0.5,0.45],[0.45,0.6],[0.55,0.5],[0.5,0.7]]){
      await p.mouse.click(q.x + q.w*fx, q.y + q.h*fy); await 잠(350);
      결 = await p.evaluate(() => { const s = window.__probe.sel();
        if (s === null || s === undefined) return null;
        const g = window.__probe.grp().children.find(c => c.userData.pid === s);
        const m = window.__probe.model(), pp = m && m.parts.find(z => z.pid === s);
        return { 이름: pp ? pp.name : null, 색: g ? g.material.color.getHexString() : null }; });
      if (결) break;
    }
    고른것.push(결 ? 결.이름 : null);
    await p.mouse.click(q.x + 2, q.y + q.h - 2); await 잠(300);     // 빈 데를 눌러 푼다
  }
  맞나('네 모습에서 다 골라진다', 고른것.map(x => x !== null), [true,true,true,true]);

  /* ───────── ⑤ 돌리기·줌이 없다 ───────── */
  console.log('⑤ 고정된 그림이다 — 끌어도 휠을 굴려도 안 움직인다');
  await 시점누르기(p, 1);
  const 캠전 = await 스캠자리(p);
  const cr = await 캔네모(p);
  await p.mouse.move(cr.x + cr.w/2, cr.y + cr.h/2); await p.mouse.down();
  await p.mouse.move(cr.x + cr.w/2 + 180, cr.y + cr.h/2 + 90, { steps:8 }); await p.mouse.up(); await 잠(500);
  await p.mouse.wheel(0, -600); await 잠(500);
  맞나('끌고 굴려도 카메라 그대로', await 스캠자리(p), 캠전);

  /* ───────── ⑥ 분해를 따라온다 ───────── */
  console.log('⑥ 분해로 모델이 바뀌면 그림이 따라온다');
  const 밀대 = v => p.evaluate(x => { const s = document.querySelector('#explode');
    if (s){ s.value = String(x); s.dispatchEvent(new Event('input', { bubbles:true })); } }, v);
  const 길이 = async () => { const c = await 스캠자리(p);
    return c ? +Math.hypot(c[0], c[1], c[2]).toFixed(0) : null; };
  const 분해0 = await 길이();
  await 밀대(60); await 잠(700);
  const 분해60 = await 길이();
  await 밀대(0); await 잠(700);
  맞나('분해하면 더 멀리서 잡고 0 으로 돌아온다',
       [분해0 !== null && 분해60 !== null && 분해60 > 분해0 + 50, await 길이() === 분해0], [true, true]);

  /* ───────── ⑦ 3D 로 돌아오기 ───────── */
  console.log('⑦ 3D 로 돌아오면 처음과 같다');
  await 모드누르기(p, '3d');
  const 되 = await p.evaluate(() => ({ 판: document.querySelector('.app').className,
    조각: window.__probe.grp().children.length, 보임: window.__probe.grp().visible,
    고르개: document.querySelector('.skv') ? getComputedStyle(document.querySelector('.skv')).display : 'none',
    시점줄: getComputedStyle(document.querySelector('.hud .views')).display }));
  맞나('판·조각·보임', [되.판, 되.조각, 되.보임], ['app m3d', 처음.조각, true]);
  맞나('고르개는 숨고 시점줄은 돌아온다', [되.고르개, 되.시점줄 !== 'none'], ['none', true]);
  맞나('오류', 터짐.length, 0);
  await ctx.close();

  /* ═════════ ⑧ 폰 375 ═════════ */
  console.log('⑧ 폰 375 — 고르개와 그림이 다 보이고 안 넘친다');
  const ctx2 = await b.newContext({ viewport:{ width:375, height:812 }, hasTouch:true, isMobile:true });
  const p2 = await ctx2.newPage();
  const 터짐2 = []; p2.on('pageerror', e => 터짐2.push(String(e)));
  await p2.goto(주소, { waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => window.__probe && window.__probe.grp(), null, { timeout: 20000 });
  await 잠(900);
  await 모드누르기(p2, 'sk');
  const 폰 = await p2.evaluate(() => {
    const bs = [...document.querySelectorAll('.skv button[data-skv]')];
    const cv = document.querySelector('#c3d').getBoundingClientRect();
    return { 단추: bs.length, 44: bs.length ? bs.every(x => x.getBoundingClientRect().height >= 44) : false,
      그림위: bs.length ? bs[0].getBoundingClientRect().bottom <= cv.top + 1 : false,
      캔: [Math.round(cv.width), Math.round(cv.height)],
      넘침: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; });
  맞나('고르개 넷 · 44px · 그림 위', [폰.단추, 폰['44'], 폰.그림위], [4, true, true]);
  맞나('캔버스 · 가로 넘침 없음', [폰.캔, 폰.넘침], [[375,487], true]);
  맞나('폰 오류', 터짐2.length, 0);

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

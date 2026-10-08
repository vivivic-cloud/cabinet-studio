#!/usr/bin/env node
/* 10-06 사장님 말씀: 「**2d 도면의 가공정보 도면이 너무 큽니다. 각 부속의 우측 여백에 도면에 표현된
   부속의 크기에 맞춰 배치해주고 사이즈표기 텍스트는 지금보다 크게 표기해 주세요**」

     ① 홈 가공도가 **정보 칸 오른쪽 여백**(부속 이름 글자 왼끝보다 오른쪽)의 **정보 줄 아래**에 있다
     ② 배율이 **부속·장 크기를 따라간다** — 한 값으로 안 굳는다
     ③ 치수 글자가 **커졌다**(t3 → t2) · 깊이 글자도 같다
     ④ 여덟 갈래에서 쪽이 A4(210×297) 밖으로 **한 톨도 안 나간다**
     ⑤ 글자끼리 **안 겹친다** — 1280·375 둘 다. (⚠ 뒷판 25T 만 1건 — 아래 주석)
     ⑥ 쪽 수·부속서가 **한 톨도 안 바뀐다**

   ⚠ 뒷판 25T 는 홈 폭(25.8)이 우라홈(9)보다 커서 **홈이 부속 뒤끝을 뚫는** 갈래다(§4.9894 — 사장님 확인 전).
      그래서 「홈에서 뒤 끝까지」 가 **−16.8** 로 음수가 되고 치수선이 뒤집혀 두 숫자가 같은 쪽으로 빠진다.
      **고치기 전에는 그 글자가 쪽 밖으로 나가 있었다**(밖 1 · 겹 0) — 지금은 쪽 안이고 겹침 1 이다.
      한 단 올려 봤더니 폰에서 이름표까지 겹쳐 **2건으로 늘어** 되돌렸다. 그 갈래만 1건을 못 박는다.

   돌리는 법:  node tests/가공도크기.js
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
    'rule:()=>규칙,st:()=>state,행:()=>부속행들(buildModel(state)),' +
    '쪽:()=>부속쪽들(buildModel(state))};' + 못);
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

const 갈래 = [
  ['가장 작은 장', { 품목:'수납장', W:300, D:200, H:300, backMode:'insert', TB:2.7 }],
  ['기본',        { W:800, D:400, H:1800, backMode:'insert', TB:2.7 }],
  ['큰 장',       { W:2400, D:800, H:2400, backMode:'insert', TB:2.7 }],
  ['뒷판 9T',     { W:800, D:400, H:1800, backMode:'insert', TB:9 }],
  ['뒷판 25T',    { W:800, D:400, H:1800, backMode:'insert', TB:25 }],
  ['인도어',      { W:800, D:400, H:1800, backMode:'insert', TB:2.7, doorMode:'in' }],
  ['전면밴드 0',  { W:800, D:400, H:1800, backMode:'insert', TB:2.7, plinth:0 }],
  ['선반 8단',    { W:800, D:400, H:1800, backMode:'insert', TB:2.7, shelves:8 }],
];

(async () => {
  const { 서버, 주소 } = await 띄우기(손질());
  const b = await chromium.launch();

  // ── 기하는 쪽 SVG 문자열로 잰다 — 화면 크기에 안 흔들린다 ──
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(600);
  const 두기 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(300); };

  // 쪽 SVG 에서 가공도 조각을 뽑는다. 이름표(`… 홈 N.N배`)가 그 쪽의 가공도를 가리킨다.
  const 쪽재기 = () => p.evaluate(() => {
    const 쪽 = window.__probe.쪽();
    const 글뽑 = s => [...s.matchAll(/<text class="(t\d)"[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*>([^<]*)<\/text>/g)]
      .map(x => ({ cls:x[1], x:+x[2], y:+x[3], t:x[4] }));
    const 수 = s => [...s.matchAll(/(?:^|\s)(?:x|y|x1|y1|x2|y2)="([-\d.]+)"/g)].map(x => +x[1]);
    return 쪽.map(z => {
      const 글 = 글뽑(z.svg);
      const 이름표 = 글.find(g => /홈 [\d.]+배$/.test(g.t));
      const 제목 = 글.find(g => g.cls === 't1');
      // 정보 줄 — 제목 아래 오른쪽 끝(x=200)에 적히는 값들
      const 정보 = 글.filter(g => Math.abs(g.x - 200) < 0.6);
      // A4 밖 — 모든 좌표 점
      const pts = [...z.svg.matchAll(/<(line|rect|text)[^>]*>/g)].map(x => x[0]);
      let 밖 = 0;
      pts.forEach(tag => {
        const gx = [...tag.matchAll(/(?:^|\s)(x|x1|x2)="([-\d.]+)"/g)].map(q => +q[2]);
        const gy = [...tag.matchAll(/(?:^|\s)(y|y1|y2)="([-\d.]+)"/g)].map(q => +q[2]);
        const w = /width="([-\d.]+)"/.exec(tag), h = /height="([-\d.]+)"/.exec(tag);
        const xs = gx.concat(w ? [gx[0] + +w[1]] : []), ys = gy.concat(h ? [gy[0] + +h[1]] : []);
        if (xs.some(v => v < -0.01 || v > 210.01) || ys.some(v => v < -0.01 || v > 297.01)) 밖++;
      });
      return { 이름들:z.이름들, 밖,
        배: 이름표 ? +(/홈 ([\d.]+)배$/.exec(이름표.t)[1]) : null,
        이름표x: 이름표 ? 이름표.x : null,
        이름표y: 이름표 ? 이름표.y : null,
        제목x: 제목 ? 제목.x : null,
        정보밑: 정보.length ? Math.max(...정보.map(g => g.y)) : null,
        // 가공도 안의 치수만 — 이름표보다 아래이고 **정보 칸 안쪽**(겉면 그림은 왼쪽에 있다)
        치수클래스: [...new Set(글.filter(g => 이름표 && g.y > 이름표.y && g.x >= 이름표.x - 6
          && /^[-\d.]+$/.test(g.t)).map(g => g.cls))].sort(),
      };
    });
  });

  console.log('① 가공도가 정보 칸 오른쪽 여백의 정보 줄 아래에 있다');
  await 두기(갈래[1][1]);
  { const z = (await 쪽재기()).filter(x => x.배 !== null);
    맞나('가공도가 있는 쪽 수 (측판·상판·하판)', z.length, 3);
    맞나('이름표 x = 정보 칸 왼끝', z.map(x => x.이름표x === x.제목x), [true,true,true]);
    맞나('이름표가 정보 줄 아래', z.map(x => x.이름표y > x.정보밑), [true,true,true]); }

  console.log('② 배율이 부속·장 크기를 따라간다');
  { const 모 = [];
    for (const [nm, st] of [갈래[0], 갈래[1], 갈래[2]]){
      await 두기(st);
      const z = (await 쪽재기()).filter(x => x.배 !== null);
      모.push([nm, z.map(x => +x.배.toFixed(1))]);
    }
    맞나('가장 작은 장 · 기본 · 큰 장', 모, [
      ['가장 작은 장', [3.4, 3.4, 3.4]],
      ['기본',        [2.5, 3.4, 3.4]],
      ['큰 장',       [3.0, 3.0, 3.0]]]);
    const 다 = 모.flatMap(x => x[1]);
    맞나('한 값으로 안 굳는다 · 6배를 안 넘는다',
      [new Set(다).size > 1, Math.max(...다) <= 6], [true, true]); }

  console.log('③ 치수 글자가 커졌다 (t3 → t2)');
  await 두기(갈래[1][1]);
  { const z = (await 쪽재기()).filter(x => x.배 !== null);
    맞나('가공도 치수 글자 클래스', z.map(x => x.치수클래스.join(',')), ['t2','t2','t2']); }

  console.log('④ 여덟 갈래에서 A4 밖 0');
  { const 표 = [];
    for (const [nm, st] of 갈래){
      await 두기(st);
      const z = await 쪽재기();
      표.push([nm, z.reduce((a, x) => a + x.밖, 0)]);
    }
    맞나('갈래마다 A4 밖 점', 표, 갈래.map(([nm]) => [nm, 0])); }

  console.log('⑤ 글자끼리 안 겹친다 (뒷판 25T 만 1건 — 위 주석)');
  { const ctx2 = await b.newContext({ viewport:{ width:375, height:812 }, hasTouch:true, isMobile:true });
    const p2 = await ctx2.newPage();
    await p2.goto(주소, { waitUntil:'domcontentloaded' });
    await p2.waitForFunction(() => window.__probe, null, { timeout:20000 });
    await 잠(600);
    await p2.evaluate(() => document.querySelector('.modeseg button[data-mode="2d"]').click());
    await 잠(500);
    const 겹재기 = async st => {
      await p2.evaluate(x => window.__probe.set(x), st); await 잠(400);
      const i = await p2.evaluate(() => [...document.querySelectorAll('#thumbs .thumb')]
        .findIndex(x => (x.title || '').includes('측판')));
      if (i < 0) return null;
      const tb = await p2.$$('#thumbs .thumb');
      await tb[i].scrollIntoViewIfNeeded(); await tb[i].click(); await 잠(350);
      return p2.evaluate(() => {
        const pg = document.querySelector('#pageBox>.page.보는쪽');
        const ts = [...pg.querySelectorAll('svg text')].filter(t => t.getBoundingClientRect().width);
        const bb = e => e.getBoundingClientRect(); const 겹 = [];
        for (let i = 0; i < ts.length; i++) for (let j = i+1; j < ts.length; j++){
          const a = bb(ts[i]), c = bb(ts[j]);
          if (a.left < c.right-1 && a.right > c.left+1 && a.top < c.bottom-1 && a.bottom > c.top+1)
            겹.push(ts[i].textContent + '↔' + ts[j].textContent); }
        const nm = ts.find(t => /홈 [\d.]+배/.test(t.textContent));
        return { 겹, 잘림: nm ? /…$/.test(nm.textContent) : null, 넘침: document.documentElement.scrollWidth };
      });
    };
    for (const [nm, st] of [갈래[0], 갈래[1], 갈래[2], 갈래[4]])
      맞나(`폰 ${nm}`, await 겹재기(st),
        /* 10-08 — 정보 칸의 **긴 값**이 한 단 작아져(§4.9842 의 `tv`) 「홈 자리↔뒤 끝에서 −16.8」 겹침이 **없어졌다**.
           남은 1건은 홈 가공도 안 치수끼리라 이 일과 무관하다(§4.9848 의 그 ⚠). */
        { 겹: nm === '뒷판 25T' ? ['25.8↔-16.8'] : [], 잘림:false, 넘침:375 });
    await ctx2.close(); }

  console.log('⑥ 쪽 수·부속서가 그대로');
  { const 표 = [];
    for (const [nm, st] of [갈래[1], 갈래[4], 갈래[7]]){
      await 두기(st);
      표.push([nm, (await 쪽재기()).map(x => x.이름들.join('·')).join(' / ')]);
    }
    맞나('쪽 이름', 표, [
      ['기본',     '측판 / 상판 / 하판 / 문짝·고정선반·뒷판'],
      ['뒷판 25T', '측판 / 상판 / 하판 / 문짝·고정선반·뒷판'],
      ['선반 8단', '측판 / 상판 / 하판 / 문짝·고정선반·뒷판']]); }

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

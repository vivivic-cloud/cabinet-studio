#!/usr/bin/env node
/* 10-02 사장님 말씀: 「**서랍장 품목에는 이동선반 부속이 발생하지 않습니다.**」

     ① 수납장에서 이동 2단이면 이동선반 2장 · 도면 머리·표제란도 2단 (예전 그대로)
     ② **진짜 손가락**으로 서랍장을 고르면 이동선반 0장 · 도면 머리·표제란도 0단 ·
        부품표에 이동선반 줄이 없고 `pitch` 가 고정선반만으로 다시 셈된다
     ③ 서랍장에서는 이동선반 **줄 자체가 안 보이고** 「선반유격」 칸도 없고 되살리기 고르개에도 없다
     ④ **수납장으로 도로 가면 이동 2단이 그대로 살아난다** (담긴 `state.shelvesM` 을 안 지운다 — 제일 중요하다)
     ⑤ 고정선반 0단 + 서랍장에서도 안 터진다 (`단수 0` · `pitch` 가 0 으로 안 나뉜다)
     ⑥ 밴드 「중」 은 고정선반만 보므로 영향이 없다
     ⑦ 고정선반은 두 품목에서 똑같다 (사장님은 이동선반만 말씀하셨다)

   돌리는 법:  node tests/서랍장이동선반.js
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
    'rule:()=>규칙,st:()=>state,draw:()=>drawing,parts:()=>만든부속,손질:()=>손질,되살릴것:()=>되살릴것()};' + 못);
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
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout: 20000 });
  await 잠(500);

  /* **진짜 손가락**으로 누른다 — `.click()` 은 확인으로 치지 않는다. */
  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); const r = await e.boundingBox(); if (!r) return false;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(350); return true; };
  const 품목고르기 = async 품 => {
    if (!await p.locator(`#itemBox input[value="${품}"]`).count()){
      맞나('품목 단추가 있나 — ' + 품, false, true); return false; }
    const r = await 손가락(`#itemBox label:has(input[value="${품}"])`); await 잠(450); return r; };

  const 장수 = 이름 => p.evaluate(n => window.__probe.model().parts.filter(x => x.name === n).length, 이름);
  const 이동단 = () => p.evaluate(() => window.__probe.model().이동단);
  const pitch = () => p.evaluate(() => +window.__probe.model().pitch.toFixed(3));
  // 도면 머리(옛 표제란)와 표제란 — 둘 다 「이동선반 n단」 을 적는다
  const 도면단 = () => p.evaluate(() => window.__probe.draw().P
    .filter(x => x.t === 'text' && /이동선반 \d+단/.test(x.str)).map(x => x.str.match(/이동선반 (\d+)단/)[1]));
  const 표이름 = () => p.evaluate(() => [...document.querySelectorAll('#bomBody tr td:first-child')].map(td => td.textContent));
  const 보이는줄 = () => p.evaluate(() => [...document.querySelectorAll('.params .field[data-home]')]
    .filter(f => getComputedStyle(f).display !== 'none').map(f => f.dataset.part));
  const 유격칸수 = () => p.evaluate(() => document.querySelectorAll('.opt[data-opt="이동선반"] input').length);
  const 되살릴 = () => p.evaluate(() => window.__probe.되살릴것().map(x => x.이름));

  console.log('① 수납장에서 이동 2단 — 예전 그대로');
  await p.evaluate(() => window.__probe.set({ shelvesM: 2 })); await 잠(400);
  맞나('이동선반 2장 · 고정선반 3장', [await 장수('이동선반'), await 장수('고정선반')], [2, 3]);
  맞나('m.이동단', await 이동단(), 2);
  맞나('도면 머리·표제란 (머리 · 표제)', await 도면단(), ['2', '2']);
  맞나('부품표에 이동선반 줄', (await 표이름()).includes('이동선반'), true);
  맞나('이동선반 줄이 보인다', (await 보이는줄()).includes('이동선반'), true);
  const 수납pitch = await pitch(), 고정자리 = await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '고정선반').map(x => x.z).join(','));

  console.log('② 진짜 손가락으로 서랍장 — 이동선반이 발생하지 않는다');
  맞나('서랍장을 눌렀나', await 품목고르기('서랍장'), true);
  맞나('state.품목', await p.evaluate(() => window.__probe.st().품목), '서랍장');
  // 서랍장에서 고정선반의 명칭은 「가로대」 다 (10-02 사장님 말씀 · §4.9874)
  맞나('이동선반 0장 · 가로대 3장', [await 장수('이동선반'), await 장수('가로대')], [0, 3]);
  맞나('m.이동단 0', await 이동단(), 0);
  맞나('도면 머리·표제란 0단', await 도면단(), ['0', '0']);
  맞나('부품표에 이동선반 줄 없다', (await 표이름()).includes('이동선반'), false);
  맞나('담긴 state.shelvesM 은 그대로 2', await p.evaluate(() => window.__probe.st().shelvesM), 2);
  // 수납장(고정3+이동2) 265.667 → 서랍장(고정3만) (1684 − 3×18) ÷ 4 = 407.5
  맞나('pitch 가 고정선반만으로 다시 셈된다', [수납pitch, await pitch()], [265.667, 407.5]);
  맞나('#stPitch 도 따라간다', await p.evaluate(() => document.querySelector('#stPitch').textContent), '407.5 mm');

  console.log('③ 줄도 없다 — 칸·고르개에도 안 나온다');
  맞나('보이는 줄 여덟 → 일곱 (이동선반만 빠진다)', await 보이는줄(),
    ['상판','측판','고정선반','문짝','하판','전면밴드','뒷판']);
  맞나('「선반유격」 칸 0개', await 유격칸수(), 0);
  await p.evaluate(() => { window.__probe.손질().지움.push('이동선반@짝:0'); window.__probe.set({}); }); await 잠(400);
  맞나('되살리기 고르개에 없다', (await 되살릴()).includes('이동선반'), false);
  await p.evaluate(() => { const z = window.__probe.손질().지움; z.splice(z.indexOf('이동선반@짝:0'), 1); window.__probe.set({}); }); await 잠(300);

  console.log('④ 수납장으로 도로 — 사장님 단수가 그대로 살아난다');
  맞나('수납장을 눌렀나', await 품목고르기('수납장'), true);
  맞나('이동선반 2장 그대로', await 장수('이동선반'), 2);
  맞나('m.이동단 2 · pitch 제자리', [await 이동단(), await pitch() === 수납pitch], [2, true]);
  맞나('도면 머리·표제란 2단', await 도면단(), ['2', '2']);
  맞나('부품표에 이동선반 줄', (await 표이름()).includes('이동선반'), true);
  맞나('이동선반 줄이 도로 보인다', (await 보이는줄()).includes('이동선반'), true);

  console.log('⑤ 고정선반 0단 + 서랍장 — 안 터진다');
  await p.evaluate(() => window.__probe.set({ shelves: 0, shelvesM: 2 })); await 잠(300);
  맞나('수납장 · 고정 0 이동 2', [await 장수('고정선반'), await 장수('이동선반')], [0, 2]);
  await 품목고르기('서랍장');
  맞나('서랍장 · 선반 0장 · pitch = 안높이', [await 장수('가로대'), await 장수('이동선반'),
    await p.evaluate(() => +window.__probe.model().pitch.toFixed(1) === +window.__probe.model().innerH.toFixed(1))], [0, 0, true]);
  맞나('#stPitch 는 안높이를 적는다', await p.evaluate(() => document.querySelector('#stPitch').textContent), '1684 mm');
  await p.evaluate(() => window.__probe.set({ shelves: 3, shelvesM: 2 })); await 잠(300);

  console.log('⑥ 밴드 「중」 은 고정선반만 본다 — 영향 없음');
  /* 「중」 밴드는 `고정센터` 에 기대므로 이동 단수와 무관해야 한다.
     ⚠ 품목을 바꾸면 `만든부속` 도 그 품목 것으로 다시 읽힌다(§4.9876) — 그래서 품목마다 새로 세운다. */
  const 중밴드 = async () => { await p.evaluate(() => { window.__probe.parts().length = 0;
    window.__probe.parts().push({ 이름:'밴드', T:12, 단:['중'] }); window.__probe.set({ backMode:'insert' }); });
    await 잠(400); return 장수('밴드'); };
  await 품목고르기('서랍장');
  const 서랍중 = await 중밴드();
  await p.evaluate(() => window.__probe.set({ shelvesM: 8 })); await 잠(300);
  const 서랍중8 = await 장수('밴드');
  await p.evaluate(() => window.__probe.set({ shelvesM: 2 })); await 잠(300);
  await 품목고르기('수납장');
  const 수납중 = await 중밴드();
  맞나('「중」 밴드는 고정선반 3장만큼 — 서랍장·이동8단·수납장이 다 같다', [서랍중, 서랍중8, 수납중], [3, 3, 3]);
  await p.evaluate(() => { window.__probe.parts().length = 0; window.__probe.set({ backMode:'cover' }); }); await 잠(300);

  console.log('⑦ 고정선반은 두 품목에서 똑같다');
  맞나('수납장 고정선반 자리', await p.evaluate(() =>
    window.__probe.model().parts.filter(x => x.name === '고정선반').map(x => x.z).join(',')), 고정자리);
  await p.evaluate(() => window.__probe.set({ shelvesM: 0 })); await 잠(300);
  const 이동없음 = await p.evaluate(() => window.__probe.model().parts
    .map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('\n'));
  await p.evaluate(() => window.__probe.set({ shelvesM: 2 })); await 품목고르기('서랍장');
  /* 도어는 서랍장에서 마이다로 갈려 자리가 다르다(§4.9873) — 여기서 보는 것은 **선반**이므로 뺀다. */
  const 도어빼기 = 글 => 글.split('\n').filter(x => !/^(문짝|마이다)\|/.test(x)).join('\n');
  맞나('서랍장(이동 2단) 의 선반·몸통이 수납장 이동 0단과 같다 (이름만 가로대)', 도어빼기((await p.evaluate(() =>
    window.__probe.model().parts.map(x => `${x.name}|${x.x}|${x.y}|${x.z}|${x.w}|${x.d}|${x.h}`).join('\n')))
    .split('가로대').join('고정선반')) === 도어빼기(이동없음), true);

  맞나('오류', 터짐, []);
  await ctx.close(); await b.close(); 서버.close();
  console.log(깬것 ? '\n✘ 깨진 것 ' + 깬것 + '개' : '\n✔ 다 맞다');
  process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error('시험이 터졌다:', e.message); process.exit(1); });

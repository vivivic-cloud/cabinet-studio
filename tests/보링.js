#!/usr/bin/env node
/* 11-02 사장님 말씀
     「도면에 보링 정보를 추가해야 합니다. … 각 품목의 도면에 보링항목을 두어 첫번째 체결방식인 미니픽스를
       선택하게 해주세요 … 아직 정해진것이 없으니 이또한 짚어서 지시하기 기능으로 코드수정할 수 있도록 합시다」

     ① 설정 칸에 「보링」 무리 · 단추 「없음 · 미니픽스」 · 닿는 자리 44px · 처음은 없음 · 가로 넘침 0
     ② **진짜 손가락**으로 미니픽스를 고르면 `state.보링` · 그 품목 `.상태` 에 담긴다
     ③ 품목마다 따로다 — 서랍장 첫 고르기는 베껴 오고 그 뒤로는 안 묻는다 · 다시 열어도 그대로
     ④ 스펙서(1쪽) 사양표에 「보링 · 미니픽스」 줄 — 없음이면 줄이 없다
     ⑤ 2D 짚을 자리(.pick)에 「보링 · 미니픽스 · 부속이름」 이 붙는다 — 없음이면 안 붙는다
     ⑥ **보링 구멍은 안 그린다** — DXF·저장 SVG 가 없음/미니픽스에서 바이트까지 같다
     ⑦ 모르는 값이 담겨 있으면 버린다(없음)

   돌리는 법:  node tests/보링.js   (TH=<three.min.js> · PW=<playwright> · 없으면 건너뛴다) */
const fs = require('fs'), path = require('path'), http = require('http');
const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }
const 스리 = process.env.TH || path.join(뿌리, 'tests', 'three.min.js');
if (!fs.existsSync(스리)){ console.log('건너뜀 — three.min.js 사본이 없다 (TH=<경로> 로 알려 줄 수 있다)'); process.exit(0); }

const 손질 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  return s.replace(못, 'window.__probe={st:()=>state,svgf:()=>svgForFile(drawing),dxf:()=>buildDXF(drawing)};' + 못);
};
const 띄우기 = html => new Promise(res => {
  const 서버 = http.createServer((q, a) => {
    if (q.url.indexOf('three.min.js') >= 0){ a.writeHead(200, {'Content-Type':'application/javascript'}); return a.end(fs.readFileSync(스리)); }
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
  const ctx = await b.newContext({ viewport:{ width:375, height:812 }, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  const 열기 = async () => { await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(400); };
  await 열기();
  const 지금 = () => p.evaluate(() => { const i = [...document.querySelectorAll('#boringSeg input')].find(x => x.checked); return i ? i.value : null; });
  const 탭 = async 값 => {                                     // 진짜 손가락
    const l = p.locator(`#boringSeg label:has(input[value="${값}"])`);
    if (!(await l.count())) return;                            // 고치기 전 판에는 없다 — 터지지 말고 깨진 것으로 센다
    await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox();
    await p.touchscreen.tap(r.x + r.width/2, r.y + r.height/2); await 잠(300);
  };
  const 품목 = async v => { await p.selectOption('#itemSel', v); await 잠(300); };

  console.log('① 모양 @375');
  맞나('무리 · 단추', await p.evaluate(() => {
    const ls = [...document.querySelectorAll('#boringBox #boringSeg label')];
    return [document.querySelector('#boringBox h2')?.textContent, ls.map(l => l.textContent),
            ls.map(l => getComputedStyle(l, '::after').height)];
  }), ['보링', ['없음','미니픽스'], ['44px','44px']]);
  맞나('처음은 없음 · 가로 넘침 0', [await 지금(), await p.evaluate(() => document.documentElement.scrollWidth)], ['', 375]);

  const 기본DXF = await p.evaluate(() => __probe.dxf().length), 기본SVG = await p.evaluate(() => __probe.svgf().length);
  console.log('② 고르기 · 담기');
  await 탭('미니픽스');
  맞나('state · 담긴 값 · data-area', await p.evaluate(() => [__probe.st().보링,
    JSON.parse(localStorage.getItem('cabinet-studio.수납장.상태') || '{}').보링, document.querySelector('#boringBox')?.dataset.area]),
    ['미니픽스', '미니픽스', '보링 · 미니픽스']);

  console.log('④ 스펙서 줄 · ⑤ 짚을 자리 이름 · ⑥ 구멍 안 그림');
  const 줄 = () => p.evaluate(() => { const t = [...document.querySelectorAll('#pageBox .page')[0].querySelectorAll('text')].map(x => x.textContent);
    const i = t.indexOf('보링'); return i < 0 ? null : t.slice(i, i + 2); });
  const 이름 = () => p.evaluate(() => [...new Set([...document.querySelectorAll('#pageBox .pick')].map(r => r.dataset.area || ''))].sort());
  맞나('스펙서 「보링 · 미니픽스」', await 줄(), ['보링', '미니픽스']);
  맞나('짚을 자리 이름', (await 이름()).includes('보링 · 미니픽스 · 측판') && (await 이름()).every(x => x.startsWith('보링 · 미니픽스 · ')), true);
  맞나('DXF·저장 SVG 바이트 그대로', [await p.evaluate(() => __probe.dxf().length), await p.evaluate(() => __probe.svgf().length)], [기본DXF, 기본SVG]);

  console.log('③ 품목마다 따로');
  await 품목('서랍장'); 맞나('서랍장 첫 고르기 = 베껴 옴', await 지금(), '미니픽스');
  await 탭(''); 맞나('서랍장 없음 · 스펙 줄 없음 · 이름 없음', [await 지금(), await 줄(), await 이름()], ['', null, ['']]);
  await 품목('수납장'); 맞나('수납장은 그대로', await 지금(), '미니픽스');
  await 열기(); 맞나('다시 열어도 그대로(수납장)', await 지금(), '미니픽스');
  await 품목('서랍장'); 맞나('서랍장도 그대로', await 지금(), '');

  console.log('⑦ 모르는 값');
  await p.evaluate(() => { const k = 'cabinet-studio.서랍장.상태', s = JSON.parse(localStorage.getItem(k) || '{}'); s.보링 = '없는방식'; localStorage.setItem(k, JSON.stringify(s)); });
  await 열기(); 맞나('없음으로 떨어진다', [await p.evaluate(() => __probe.st().보링 ?? ''), await 지금()], ['', '']);

  맞나('오류', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깬 것 ${깬것}개` : '\n다 맞다'); process.exit(깬것 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

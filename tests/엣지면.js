#!/usr/bin/env node
/* 10-07 사장님 말씀: 「지금 설정된 엣지상태로 엣지면이 어디인지 알 수 있지? 즉 고정선반의 경우 w면이 1 인데
   w면은 두면 이잖아 이럴때 **어느면인지 특정이 되는지**를 알아야해 그렇게 해서 해당면에 실재 엣지필름의
   두께에 맞는 표시를 도면에 해주어야 하는데」 → 「**해봐**」 · 「**도면상에 엣지 작업 모습이 보이게 해줘**」
   그리고 10-07 a1791346026: 「바닥에 닿는면 · 부속과 부속이 만나는 면에는 엣지가 없다」

     ① 판에 **면 알약 넷**(상·하·좌·우) · 보이는 86.8×30.7 · **닿는 자리 44px** · 고르개 둘 · 가로 넘침 0
     ② **사장님 보기 넷** — 끼우기·상판 측판위에서 도어 2,2 · 상판 2,2 · 측판 2,0 · 선반 1,0  (1순위)
     ③ **어느 면인지 특정된다** — 고정선반은 「상」(앞) 하나다
     ④ **뒷판 2.7·3·5·6·9T 는 면 다 꺼지고 RT 가 「RT없음」**(0) · 12T 부터는 안 그렇다
     ⑤ 손으로 켜고 **「저장」 을 눌러야 먹는다** · 「닫기」 는 버린다
     ⑥ **옛 꼴(숫자 W·D)이 면 이름으로 옮겨 담긴다** — 1 은 기본세팅이 내는 쪽으로
     ⑦ 도면에 **굵은 변**과 정보 칸 「엣지」 줄 · 여덟 갈래에서 **A4 밖 0**
     ⑧ **DXF 네 기준값 불변** · 부속서 불변

   돌리는 법:  node tests/엣지면.js
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
  // ⚠ 고치기 전 판에는 엣지설정이 아예 없다 — 널에 견디게 감싼다(§4.986-모바일 과 같은 자리).
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),' +
    'sel:()=>selPid,고르기:(n)=>select(n),dxf:()=>buildDXF(drawing),쪽:()=>부속쪽들(모델||buildModel(state)),' +
    '엣지:()=>(typeof 엣지설정!=="undefined"?엣지설정:null),' +
    '엣지값:(n)=>(typeof 엣지==="function"?엣지(n):null),' +
    '엣지넣기:(o)=>(typeof 엣지넣기==="function"?(엣지넣기(o),update(),true):false),' +
    '재단:(n,l,w)=>(typeof 재단사이즈==="function"?재단사이즈(n,l,w):null)};' + 못);
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
  await 잠(700);

  const 손가락 = async 자 => { const e = await p.$(자); if (!e) return false;
    await e.scrollIntoViewIfNeeded(); await 잠(150); const r = await e.boundingBox(); if (!r) return false;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await 잠(320); return true; };
  const 세팅 = o => p.evaluate(x => window.__probe.set(x), o);
  const 되돌 = () => 세팅({ W:800, D:400, H:1800, shelves:3, shelvesM:0, backMode:'cover', topStyle:'inset',
                            botStyle:'inset', TB:2.7, doorMode:'out', doors:2, 품목:'수납장' });
  const 값 = 이름 => p.evaluate(n => { const e = window.__probe.엣지값(n);
    if (!e || !Array.isArray(e.면)) return null;              // 고치기 전 판에는 면이 없다
    return [e.면.join('·') || '없음', e.W, e.D, e.RT]; }, 이름);
  const 폄 = async 이름 => { await 손가락(`.pname[data-opt="${이름}"]`); await 잠(250); };

  console.log('① 판에 면 알약 넷 · 닿는 자리 44px');
  await 세팅({ backMode:'insert', topStyle:'overlay' });
  await 폄('고정선반');
  { const r = await p.evaluate(() => {
      const o = document.querySelector('.opt[data-opt="고정선반"]'); if (!o) return null;
      const 알 = [...o.querySelectorAll('.seg.mini label')].map(x => { const q = x.getBoundingClientRect();
        return [Math.round(q.width*10)/10, Math.round(q.height*10)/10]; });
      const lb = o.querySelector('.seg.mini label');
      return { 체크: o.querySelectorAll('input[data-edgef]').length,
               고르개: o.querySelectorAll('select[data-edge]').length,
               알약: [...new Set(알.map(x => x.join('×')))],
               닿: lb ? getComputedStyle(lb, '::after').height : null,
               켠: [...o.querySelectorAll('input[data-edgef]')].filter(i => i.checked).map(i => i.value),
               넘침: Math.round(document.documentElement.scrollWidth) }; });
    맞나('면 체크 넷 · 고르개 둘(필름·RT)', r && [r.체크, r.고르개], [4, 2]);
    맞나('알약 한 가지 크기 86.8×30.7', r && r.알약, ['86.8×30.7']);
    맞나('닿는 자리 44px', r && r.닿, '44px');
    맞나('고정선반 기본은 「상」 하나', r && r.켠, ['상']);
    맞나('가로 넘침 0', r && r.넘침, 375);
  }
  await 폄('고정선반');

  console.log('② 사장님 보기 넷 — 끼우기 · 상판 측판위  (1순위)');
  await 세팅({ backMode:'insert', topStyle:'overlay', shelvesM:2 });
  맞나('문짝 — 네 면 다 (2,2)',   await 값('문짝'),   ['상·하·좌·우', 2, 2, 0.5]);
  맞나('상판 — 네 면 다 (2,2)',   await 값('상판'),   ['상·하·좌·우', 2, 2, 0.5]);
  맞나('측판 — 상·하만 (2,0)',    await 값('측판'),   ['상·하', 2, 0, 0.5]);
  맞나('고정선반 — 「상」 만 (1,0)', await 값('고정선반'), ['상', 1, 0, 0.5]);
  맞나('이동선반 — 「상」 만 (1,0)', await 값('이동선반'), ['상', 1, 0, 0.5]);
  맞나('전면밴드 — 없음',          await 값('전면밴드'), ['없음', 0, 0, 0.5]);

  console.log('③ 어느 면인지 특정된다 — 바닥·이웃에 닿으면 꺼진다');
  맞나('측판 아랫끝은 바닥 · 윗끝은 상판 → D 0', (await 값('측판') || [])[2], 0);
  await 세팅({ topStyle:'inset' });
  맞나('상판이 측판 사이면 측판 윗끝이 노출 → D 1', (await 값('측판') || [])[2], 1);
  await 되돌();

  console.log('④ 뒷판 두께 — 2.7·3·5·6·9T 는 엣지를 아예 안 한다');
  { const r = [];
    for (const t of [2.7, 3, 5, 6, 9, 12]) { await 세팅({ backMode:'cover', TB:t }); const v = await 값('뒷판') || [null,0,0,null];
      r.push([t, v[0], v[3]]); }
    맞나('얇은 다섯 — 면 없음 · RT 0', r.slice(0,5).map(x => [x[1], x[2]]),
         [['없음',0],['없음',0],['없음',0],['없음',0],['없음',0]]);
    맞나('12T — RT 0.5 로 돌아온다', r[5][2], 0.5); }
  await 되돌();

  console.log('⑤ 손으로 켜고 「저장」 을 눌러야 먹는다');
  await 세팅({ backMode:'insert', topStyle:'overlay' });
  await 폄('고정선반');
  { const 켜 = await p.evaluateHandle(() => [...document.querySelectorAll('.opt[data-opt="고정선반"] .seg.mini label')]
      .find(l => l.textContent.trim() === '우'));
    const el = 켜.asElement();
    if (el){ await el.scrollIntoViewIfNeeded(); const q = await el.boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:q.x+q.width/2, y:q.y+q.height/2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(300); }
    맞나('치기만 하면 안 담긴다', await p.evaluate(() => JSON.stringify(window.__probe.엣지())), '{}');
    await 손가락('.opt[data-opt="고정선반"] [data-optsave]'); await 잠(400);
    맞나('저장하면 담긴다', await p.evaluate(() => JSON.stringify(window.__probe.엣지())), '{"고정선반":{"면":["상","우"]}}');
    맞나('도면이 따라온다', await 값('고정선반'), ['상·우', 1, 1, 0.5]);
    // 닫기는 버린다
    await 폄('고정선반');
    const 켜2 = (await p.evaluateHandle(() => [...document.querySelectorAll('.opt[data-opt="고정선반"] .seg.mini label')]
      .find(l => l.textContent.trim() === '하'))).asElement();
    if (켜2){ await 켜2.scrollIntoViewIfNeeded(); const q = await 켜2.boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:q.x+q.width/2, y:q.y+q.height/2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(300); }
    await 손가락('.opt[data-opt="고정선반"] [data-optclose]'); await 잠(400);
    맞나('닫기는 버린다', await p.evaluate(() => JSON.stringify(window.__probe.엣지())), '{"고정선반":{"면":["상","우"]}}');
  }

  console.log('⑥ 옛 꼴(숫자 W·D)이 면 이름으로 옮겨 담긴다');
  { const r = await p.evaluate(() => {
      const ok = window.__probe.엣지넣기({ 고정선반:{W:1,D:0}, 측판:{W:2,D:0}, 상판:{W:0,D:2}, 문짝:{W:1,D:1,필름:1.5} });
      if (!ok) return null; return JSON.parse(JSON.stringify(window.__probe.엣지())); });
    맞나('W1 → 기본세팅이 내는 쪽(「상」)', r && r.고정선반.면, ['상']);
    맞나('W2 → 상·하',                     r && r.측판.면,     ['상','하']);
    맞나('D2 → 좌·우',                     r && r.상판.면,     ['좌','우']);
    맞나('W1·D1 → 한 쪽씩 · 필름은 그대로', r && [r.문짝.면, r.문짝.필름], [['상','좌'], 1.5]);
    맞나('옛 열쇠는 사라진다', r && JSON.stringify(r).indexOf('"W"') < 0 && JSON.stringify(r).indexOf('"_W"') < 0, true);
    await p.evaluate(() => window.__probe.엣지넣기(null)); }
  await 되돌();

  console.log('⑦ 도면에 굵은 변 · 정보 칸 「엣지」 줄 · A4 밖 0');
  { await p.evaluate(() => { document.querySelector('.modeseg button[data-mode="2d"]').click(); }); await 잠(700);
    const 갈래 = [['기본',{}], ['끼우기·측판위',{backMode:'insert',topStyle:'overlay'}],
      ['끼우기·이동2',{backMode:'insert',shelvesM:2}], ['뒷판 25T',{backMode:'insert',TB:25}],
      ['작은 장',{W:300,D:200,H:300}], ['큰 장',{W:2400,D:800,H:2400,shelves:8}],
      ['인도어',{doorMode:'in'}], ['서랍장',{품목:'서랍장',doors:4,backMode:'insert'}]];
    const 밖들 = [], 선들 = [];
    for (const [이름, st] of 갈래){ await 세팅(st); await 잠(400);
      const r = await p.evaluate(() => {
        const 쪽들 = [...document.querySelectorAll('#pageBox>.page')]; let 밖 = 0, 선 = 0;
        쪽들.forEach((pp, i) => { const svg = pp.querySelector('svg'); if (!svg || i === 0) return;
          선 += svg.querySelectorAll('line.엣지').length;
          svg.querySelectorAll('line,rect,text').forEach(el => { try { const bb = el.getBBox();
            if (bb.x < -0.01 || bb.y < -0.01 || bb.x+bb.width > 210.01 || bb.y+bb.height > 297.01) 밖++; } catch(e){} }); });
        return [밖, 선]; });
      밖들.push(r[0]); 선들.push(r[1]); await 되돌(); await 잠(250); }
    맞나('여덟 갈래에서 A4 밖 0', [...new Set(밖들)], [0]);
    맞나('갈래마다 굵은 변이 선다', 선들.every(x => x > 0), true);
    await 세팅({ backMode:'insert', topStyle:'overlay' }); await 잠(400);
    const 줄 = await p.evaluate(() => {
      const t = [...document.querySelectorAll('#pageBox>.page text')];
      const i = t.findIndex(x => x.textContent === '엣지');
      return i < 0 ? null : t[i+1].textContent; });
    맞나('정보 칸에 「엣지」 줄', 줄, '상·하 · 1');
    await p.evaluate(() => { document.querySelector('.modeseg button[data-mode="3d"]').click(); }); await 잠(500); }
  await 되돌();

  console.log('⑧ DXF 네 기준값 불변 · 부속서 불변');
  { const 넷 = [];
    for (const [뒤, t] of [['cover',2.7], ['insert',2.7], ['cover',9], ['insert',9]]){
      await 세팅({ backMode:뒤, TB:t }); await 잠(300);
      넷.push(await p.evaluate(() => window.__probe.dxf().length)); }
    맞나('DXF 네 기준값', 넷, [71286, 109007, 70496, 109073]);
    await 되돌();
    const 행 = await p.evaluate(() => window.__probe.쪽() && true);
    맞나('부속 쪽이 선다', 행, true); }

  맞나('오류 0', 터짐.length, 0);
  console.log(깬것 ? `깨진 것 ${깬것}개` : '다 맞다');
  await b.close(); 서버.close(); process.exit(깬것 ? 1 : 0);
})();

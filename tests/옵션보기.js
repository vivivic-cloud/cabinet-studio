#!/usr/bin/env node
/* 10-04 사장님 말씀
     「**도면에서 부속선택시 옵션보기 드롭다운목록을 추가 하여 선택시 해당부속의 옵션조정 화면이 팝업되도록 해주세요**」

     ① 차림표에 「옵션보기」 가 있고 **44px 이상** · 숨기기·삭제·복제 셋은 이름·차례·크기가 그대로
     ② 수납장에서 도면의 측판을 골라 누르면 **측판 판**이 뜬다 · 판은 **하나뿐**(베낀 것이 없다)
     ③ 서랍장에서 **마이다 → 문짝 판 · 가로대 → 고정선반 판** (이름이 갈리는 자리 · §4.9874)
     ④ 팝업에서 수치를 치고 「저장」 → **도면에 먹고** 팝업이 닫히고 판이 **제자리로 돌아온다**
     ⑤ 「닫기」 · 바깥 누르기 · Esc 로 닫히고 **안 저장한 값은 버려진다**(10-01 사장님 말씀 그대로)
     ⑥ 판이 없는 부속은 「옵션보기」 가 **안 보인다** (빈 팝업을 띄우지 않는다)
     ⑦ **왼쪽 묶음에서 부속명을 눌러 펴는 길이 그대로 살아 있다**
     ⑧ 도면이 첫 화면에 보이는 것 · 가로 넘침 · 오류 0 이 그대로
     ⑨ **보이는 화면이 깔린 화면보다 작아져도 팝업이 안 잘린다** (10-04 사장님 말씀
       「옵션화면이 상부일부만 나오고 모두 잘려요」). 아이폰은 글쇠가 올라오거나 주소창이 보이거나
       손가락으로 벌리면 `visualViewport` 가 작아지는데 `100vh`·`top:50%` 는 그것을 안 본다 —
       그래서 **배율을 올려 보이는 화면을 줄여** 재고, **가장 긴 판**(마이다 · 결 있음)으로 잰다.
       ⚠ **네 변을 다 잰다.** 처음에 이 자가 세로만 재서 **초록인데 그림은 오른쪽이 잘려 있었다**
       (10-04 관리자). 그리고 배율만 올리면 `offsetLeft` 가 0 이라 가로 가운데가 안 걸리므로
       **진짜 두 손가락으로 벌리고 밀어 `offsetLeft > 0` 인 자리**에서도 잰다.
     ⑩ **어떤 배율에서도 이름이 온전히 읽힌다** (10-04 관리자). ⑨ 는 판이 들어갔는지만 보고
       **글이 읽히는지는 안 봤다** — 그래서 초록인데 「상부유격」 이 깎여 있었다(배율 2.5 에서 폭 0).
       `scrollWidth <= clientWidth` 로 일곱 판 × 네 배율을 쓸고, 끝에는 **좁은 자리에서 이름을 읽고
       그 밑 칸에 숫자를 쳐서 저장**해 본다 — 사장님이 그 화면에서 실제로 하시는 일이다.
     ⑪ **판 안의 것이 판 밖으로 안 나간다** (10-04 관리자). ⑩ 이 `label` 만 재서 **눈금(`.seg.mini`)을
       놓쳤다** — 배율 2.5 에서 「8」 이 16px 밖이라 **아홉 칸 중 여덟만 보였다.** 이제 `#optDlg` 안
       **모든 자**를 쓴다 — 깎임 0 · 판 좌우 밖 0. 세로는 굴러가는 것이 맞아 「굴리면 닿나」 로 잰다.

   돌리는 법:  node tests/옵션보기.js
   화면을 보는 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7).

   ⚠ 도면에서 부속을 짚을 자리는 **프로그램과 같은 자**로 고른다 — 겹치면 `짚힌부속()` 이
      **작은 것**을 고르므로, 마이다 네모 한가운데를 찍으면 그 위의 가로대가 잡힌다(한 번 그렇게 헛짚었다). */
const fs = require('fs'), path = require('path'), http = require('http');

const 뿌리 = path.join(__dirname, '..');
let chromium;
try { chromium = require(process.env.PW || '/opt/node22/lib/node_modules/playwright').chromium; }
catch { try { chromium = require('playwright').chromium; }
  catch { console.log('건너뜀 — playwright 가 없다 (PW=<경로> 로 알려 줄 수 있다)'); process.exit(0); } }

const 스리 = process.env.TH || path.join(뿌리, 'tests', 'three.min.js');
if (!fs.existsSync(스리)){
  console.log('건너뜀 — three.min.js 사본이 없다 (TH=<경로> 로 알려 줄 수 있다)'); process.exit(0); }

const 손질글 = () => {
  let s = fs.readFileSync(process.env.SRC || path.join(뿌리, 'index.html'), 'utf8');
  s = s.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three[^"']+/, 'three.min.js');
  s = s.replace(/\s*<script[^>]*jszip[^>]*><\/script>/i, '');
  s = s.replace(/\s*<script[^>]*viggle[^>]*><\/script>/i, '');
  const 못 = 'init3D();';
  if (!s.includes(못)) throw new Error('init3D() 자리를 못 찾았다 — 시험을 고쳐야 한다');
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},model:()=>buildModel(state),'
    + 'rule:()=>규칙,st:()=>state,sel:()=>selPid};' + 못);
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

/* 프로그램의 `짚힌부속()` 과 같은 자로, 그 부속이 실제로 잡히는 점을 찾는다 */
const 짚을자리 = (n) => {
  const 모 = window.__probe.model();
  const 작은 = (x, y) => {
    const 것 = document.elementsFromPoint(x, y).filter(e => e.classList && e.classList.contains('pick'));
    if (!것.length) return null;
    const 잰 = 것.map(e => { const r = e.getBoundingClientRect();
      return { pid:e.dataset.pid, 넓이:r.width*r.height, 안:x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom }; });
    const 안 = 잰.filter(z => z.안);
    return (안.length ? 안 : 잰).sort((a, b) => a.넓이 - b.넓이)[0].pid; };
  const 것들 = [...document.querySelectorAll('#pageBox>.page.\uBCF4\uB294\uCABD rect.pick')]
    .map(r => ({ r, pid:String(r.dataset.pid) })).filter(x => (모.parts[Number(x.pid)]||{}).name === n);
  for (const t of 것들){
    t.r.scrollIntoView({ block:'center' });
    const q = t.r.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++){
      const x = Math.round(q.left + q.width*i/10), y = Math.round(q.top + q.height*j/10);
      if (x < 2 || y < 2 || x > window.innerWidth - 2 || y > window.innerHeight - 2) continue;
      if (작은(x, y) === t.pid) return { x, y }; } }
  return null; };

(async () => {
  const { 서버, 주소 } = await 띄우기(손질글());
  const b = await chromium.launch();

  for (const 폭 of [375, 1280]){
    const ctx = await b.newContext({ viewport:{ width:폭, height:폭 < 800 ? 812 : 900 }, hasTouch:true, isMobile:폭 < 800 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
    await p.goto(주소, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => window.__probe, null, { timeout:20000 }); await 잠(700);
    console.log('── ' + 폭 + 'px');

    const 톡 = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await 잠(420); };
    const 손 = (t, 점) => cdp.send('Input.dispatchTouchEvent',   // 두 손가락 — 벌리기·밀기
      { type:t, touchPoints:점.map((q, i) => ({ x:q[0], y:q[1], id:i })) });
    const 톡자 = async 자 => {                       // ⚠ 짚기 전에 굴려 넣는다 (§7.5)
      const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
        if (e.scrollIntoView) e.scrollIntoView({ block:'center' });
        const q = e.getBoundingClientRect();
        return { x:Math.round(q.left + q.width/2), y:Math.round(q.top + q.height/2) }; }, 자);
      if (!r) return false; await 톡(r.x, r.y); return true; };
    const 모드 = async m => { await p.evaluate(x =>
        document.querySelector(`.modeseg button[data-mode="${x}"]`).click(), m); await 잠(900); };
    const 품목 = async v => { await p.evaluate(x => { const s = document.querySelector('#itemSel');
        s.value = x; s.dispatchEvent(new Event('change', { bubbles:true })); }, v); await 잠(800); };
    const 켜짐 = () => p.evaluate(() => document.querySelector('#pmenu').classList.contains('on'));
    const 차림표 = async 이름 => {                    // 도면에서 그 부속을 골라 차림표를 띄운다
      const 자리 = await p.evaluate(짚을자리, 이름);
      if (!자리) return null;
      for (let i = 0; i < 4 && !(await 켜짐()); i++){ await 톡(자리.x, 자리.y); await 잠(250); }
      return p.evaluate(() => { const b2 = document.querySelector('#pmenu button[data-act="opt"]');
        return { on:document.querySelector('#pmenu').classList.contains('on'),
          이름:document.querySelector('#pmenuName').textContent, 보임:!!b2 && !b2.hidden }; });
    };
    const 팝 = () => p.evaluate(() => { const d = document.querySelector('#optDlg');
      if (!d || !d.open) return { 열림:false };
      const o = d.querySelector('.opt[data-opt]');
      return { 열림:true, 이름:(document.querySelector('#optDlgName')||{}).textContent,
        판:o ? o.dataset.opt : null,
        찬판:[...document.querySelectorAll('.opt[data-opt]')].filter(e => e.innerHTML).length }; });
    const 팝닫기단추 = '#optDlg [data-optclose]';
    const 닫혔나 = () => p.evaluate(() => { const d = document.querySelector('#optDlg');
      return [!(d && d.open), document.querySelectorAll('#optDlgBody>*').length]; });

    await 모드('2d');

    console.log('① 차림표에 「옵션보기」 · 셋은 그대로');
    맞나('측판 차림표 · 「옵션보기」 보임', await 차림표('측판'), { on:true, 이름:'측판', 보임:true });
    맞나('차림표 단추 (이름 · 크기)', await p.evaluate(() =>
      [...document.querySelectorAll('#pmenu button[data-act]')].map(x => {
        const r = x.getBoundingClientRect();
        return [x.dataset.act, x.textContent, Math.round(r.height) >= 44]; })),
      [['hide','숨기기',true],['del','삭제',true],['dup','복제',true],['opt','옵션보기',true]]);

    console.log('② 누르면 그 부속 판이 뜬다 · 판은 하나뿐');
    await 톡자('#pmenu button[data-act="opt"]');
    맞나('측판 팝업', await 팝(), { 열림:true, 이름:'측판', 판:'측판', 찬판:1 });

    console.log('④ 치고 「저장」 → 도면에 먹고 판이 제자리로');
    await 톡자('#optDlg input[data-rule="측판내밈"]');
    await p.keyboard.press('Control+a'); await p.keyboard.type('3.5'); await 잠(200);
    맞나('치기만 해서는 안 먹는다', await p.evaluate(() => window.__probe.rule().측판내밈), 0);
    await 톡자('#optDlg [data-optsave]'); await 잠(700);
    맞나('저장 뒤 규칙 · 상판 깊이 · 팝업 닫힘', await p.evaluate(() => [window.__probe.rule().측판내밈,
      window.__probe.model().parts.find(x => x.name === '상판').d,
      !(document.querySelector('#optDlg')||{}).open]), [3.5, 396.5, true]);
    맞나('판이 제자리로 돌아왔나', await p.evaluate(() => {
      const o = document.querySelector('.opt[data-opt="측판"]');
      return [!!o, o ? (o.closest('.field')||{}).dataset.part : null, o ? o.hidden : null,
        document.querySelectorAll('#optDlgBody>*').length]; }), [true, '측판', true, 0]);
    await p.evaluate(() => { window.__probe.rule().측판내밈 = 0; window.__probe.set({}); }); await 잠(400);

    console.log('⑤ 닫기 · 바깥 · Esc — 안 저장한 값은 버려진다');
    for (const 길 of ['닫기', '바깥', 'Esc']){
      await 차림표('측판'); await 톡자('#pmenu button[data-act="opt"]');
      if (!(await 톡자('#optDlg input[data-rule="측판내밈"]'))){ 맞나(길, '칸이 없다', '칸'); continue; }
      await p.keyboard.press('Control+a'); await p.keyboard.type('7'); await 잠(150);
      if (길 === '닫기') await 톡자(팝닫기단추);
      else if (길 === '바깥') await 톡(폭 - 6, 6);
      else { await p.keyboard.press('Escape'); await 잠(300); }
      await 잠(300);
      맞나(길 + ' — [닫혔나, 묶음에 남은 것, 규칙]',
        [...(await 닫혔나()), await p.evaluate(() => window.__probe.rule().측판내밈)], [true, 0, 0]);
    }

    console.log('③ 서랍장 — 마이다 → 문짝 판 · 가로대 → 고정선반 판');
    await 품목('서랍장');
    맞나('마이다 차림표', await 차림표('마이다'), { on:true, 이름:'마이다', 보임:true });
    await 톡자('#pmenu button[data-act="opt"]');
    맞나('마이다 팝업', await 팝(), { 열림:true, 이름:'마이다', 판:'문짝', 찬판:1 });
    await 톡자('#optDlg input[data-rule="아웃위"]');
    await p.keyboard.press('Control+a'); await p.keyboard.type('9'); await 잠(150);
    await 톡자('#optDlg [data-optsave]'); await 잠(700);
    맞나('마이다 윗끝이 따라온다', await p.evaluate(() => { const d = window.__probe.model().parts.filter(x => x.name === '마이다');
      return [d.length, Math.round((d[d.length-1].z + d[d.length-1].h)*1000)/1000, window.__probe.rule().아웃위]; }),
      [2, 1791, 9]);
    await p.evaluate(() => { window.__probe.rule().아웃위 = 2; window.__probe.set({}); }); await 잠(400);
    맞나('가로대 차림표', await 차림표('가로대'), { on:true, 이름:'가로대', 보임:true });
    await 톡자('#pmenu button[data-act="opt"]');
    맞나('가로대 팝업', await 팝(), { 열림:true, 이름:'가로대', 판:'고정선반', 찬판:1 });
    await 톡자(팝닫기단추); await 잠(300);
    await 품목('수납장');

    console.log('⑥ 판이 없는 부속은 「옵션보기」 가 안 보인다');
    await p.evaluate(() => { const r = document.querySelector('.field[data-part="측판"]');
      if (r) r.style.display = 'none'; });                   // 지워서 내린 줄과 같은 꼴 (§4.9891)
    맞나('줄이 없으면 숨는다', await 차림표('측판'), { on:true, 이름:'측판', 보임:false });
    await p.evaluate(() => { const m = document.querySelector('#pmenu');
      if (m) m.classList.remove('on');
      const r = document.querySelector('.field[data-part="측판"]'); if (r) r.style.display = ''; });
    await 잠(300);

    console.log('⑦ 왼쪽 묶음에서 펴는 길이 그대로');
    await 톡자('.params .pname[data-opt="측판"]'); await 잠(300);
    맞나('부속명으로 펴면 묶음 안에서 펴진다', await p.evaluate(() => {
      const o = document.querySelector('.opt[data-opt="측판"]');
      return [!!o && !o.hidden, !!o && !!o.closest('.params'),
        !!(document.querySelector('#optDlg')||{}).open]; }), [true, true, false]);
    await 톡자('.params .pname[data-opt="측판"]'); await 잠(300);

    console.log('⑧ 도면 첫 화면 · 넘침 · 오류');
    await 모드('3d');
    맞나('열자마자 캔버스 y · 첫 화면', await p.evaluate(() => { window.scrollTo(0, 0);
      const c = document.querySelector('#c3d').getBoundingClientRect();
      return [Math.round(c.top), Math.round(Math.max(0, Math.min(c.bottom, innerHeight) - Math.max(c.top, 0)))]; }),
      폭 === 375 ? [440, 372] : [69, 831]);
    맞나('가로 넘침', await p.evaluate(() => document.documentElement.scrollWidth), 폭);

    console.log('⑨ 보이는 화면이 줄어도 안 잘린다 — 글쇠·주소창·벌리기');
    await 모드('2d'); await 품목('서랍장');
    // 가장 긴 판으로 — 마이다에 「결 있음」 을 켜면 방향 줄 둘이 더 붙는다
    await p.evaluate(() => { const b2 = document.querySelector('.pname[data-opt="문짝"]');
      const o = document.querySelector('.opt[data-opt="문짝"]');
      if (b2 && o && o.hidden) b2.click(); });
    await 잠(350);
    await p.evaluate(() => { const c = document.querySelector('.opt[data-opt="문짝"] input[data-grainon]');
      if (c && !c.checked) c.click(); });
    await 잠(400);
    await p.evaluate(() => { const b2 = document.querySelector('.pname[data-opt="문짝"]');
      const o = document.querySelector('.opt[data-opt="문짝"]');
      if (b2 && o && !o.hidden) b2.click(); });                 // 묶음 쪽은 도로 접는다
    await 잠(300);
    await 차림표('마이다'); await 톡자('#pmenu button[data-act="opt"]'); await 잠(350);
    /* ⚠ **네 변을 다 잰다.** 10-04 에 이 자가 세로만 재서 **초록인데 그림은 오른쪽이 잘려 있었다**.
       고친 그 축만 재지 마라 — 사장님이 보시는 것은 화면 전체다. */
    const 잘림 = () => p.evaluate(() => {
      const d = document.querySelector('#optDlg');
      if (!d || !d.open) return { 밖:-1, 변:[-1,-1,-1,-1], 안든다:false, 굴러가나:false };
      const q = d.getBoundingClientRect(), vv = window.visualViewport, bd = document.querySelector('#optDlgBody');
      const 보위 = vv ? vv.offsetTop : 0,  보키 = vv ? vv.height : window.innerHeight;
      const 보왼 = vv ? vv.offsetLeft : 0, 보폭 = vv ? vv.width  : window.innerWidth;
      const 위 = Math.max(0, 보위 - q.top),  아래 = Math.max(0, q.bottom - (보위 + 보키));
      const 왼 = Math.max(0, 보왼 - q.left), 오   = Math.max(0, q.right  - (보왼 + 보폭));
      const 줄 = document.querySelector('#optDlgBody .optrow');
      return { 밖:Math.round(위 + 아래 + 왼 + 오),
        변:[위, 아래, 왼, 오].map(v => Math.round(v)),
        안든다:q.height > 보키 - 12 || q.width > 보폭 - 12,
        굴러가나:bd ? (bd.scrollHeight > bd.clientHeight || bd.scrollWidth > bd.clientWidth) : false,
        줄키:줄 ? Math.round(줄.getBoundingClientRect().height) : 0 }; });
    맞나('보통 배율 — 네 변 밖으로 나간 px', (await 잘림()).밖, 0);
    for (const 배 of [1.5, 2, 2.5]){
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:배 }); await 잠(350);
      const z = await 잘림();
      // 네 변 어디로도 안 나가고, 다 안 들어가면 판 안에서 굴러가고, 줄 높이 44 는 그대로다
      맞나('배율 ' + 배 + ' — [밖, 안 들어가면 굴러가나, 줄키]',
        [z.밖, z.안든다 ? z.굴러가나 : true, z.줄키], [0, true, 44]);
    }
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(300);
    /* **진짜 손가락으로 벌리고 옆으로 민 상태** — 배율만 올리면 `offsetLeft` 가 0 이라
       **가로 가운데가 안 걸린다.** 두 손가락으로 벌려야 `visualViewport.offsetLeft > 0` 이 된다.
       ⚠ `Emulation.setPageScaleFactor`·`Input.synthesizePinchGesture`·`synthesizeScrollGesture` 로는
          안 밀린다(셋 다 재 봤다 · §7.5). ⚠ **판 안에서** 벌려야 한다 — 바깥을 짚으면 팝업이 닫힌다.
       판은 열린 채로 두고, `visualViewport` 의 `resize`·`scroll` 로 따라오는지를 본다. */
    const 가운 = await p.evaluate(() => { const q = document.querySelector('#optDlg').getBoundingClientRect();
      return [Math.round(q.left + q.width/2), Math.round(q.top + q.height/2)]; });
    let 벌 = 20; await 손('touchStart', [[가운[0] - 벌, 가운[1]], [가운[0] + 벌, 가운[1]]]);
    for (벌 = 30; 벌 <= 90; 벌 += 10){
      await 손('touchMove', [[가운[0] - 벌, 가운[1]], [가운[0] + 벌, 가운[1]]]); await 잠(30); }
    await 손('touchEnd', []); await 잠(600);
    const 벌린자 = await 잘림();
    맞나('두 손가락으로 벌림 — [밖, 안 들어가면 굴러가나, 줄키]',
      [벌린자.밖, 벌린자.안든다 ? 벌린자.굴러가나 : true, 벌린자.줄키], [0, true, 44]);
    /* 옆으로 민다 — 짚는 자리는 **보이는 화면 기준**이다.
       ⚠ CDP 의 손가락 자리는 `깔린 자리 = 보낸 자리 + visualViewport 오프셋` 이다 — **배율로 나누지 않는다**
          (한 번 배율을 곱해 1280 에서 엉뚱한 데를 짚어 팝업이 닫혔다 · 재서 잡았다).
       머리띠(`.optpophead`)를 미는 것은 거기가 안 굴러가는 자리라서다 — 판 속을 밀면 판이 굴러간다. */
    const 민점 = await p.evaluate(() => { const v = window.visualViewport;
      const q = document.querySelector('#optDlg .optpophead').getBoundingClientRect();
      const 왼 = Math.max(q.left, v.offsetLeft), 오 = Math.min(q.right, v.offsetLeft + v.width);
      const 위 = Math.max(q.top, v.offsetTop),  아래 = Math.min(q.bottom, v.offsetTop + v.height);
      return [Math.round((왼 + 오)/2 - v.offsetLeft), Math.round((위 + 아래)/2 - v.offsetTop)]; });
    await 손('touchStart', [민점]);
    for (let x = 민점[0] - 15; x >= 20; x -= 15){ await 손('touchMove', [[x, 민점[1]]]); await 잠(25); }
    await 손('touchEnd', []); await 잠(600);
    const 민것 = await p.evaluate(() => { const v = window.visualViewport;
      return v ? [Math.round(v.offsetLeft) > 0, Math.round(v.width) < window.innerWidth] : [false, false]; });
    맞나('옆으로 밀렸나 (자가 제대로 섰나)', 민것, [true, true]);
    const 민자 = await 잘림();
    맞나('옆으로 민 상태 — [밖, 안 들어가면 굴러가나, 줄키]',
      [민자.밖, 민자.안든다 ? 민자.굴러가나 : true, 민자.줄키], [0, true, 44]);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(500);   // 도로 배율 1
    맞나('배율 1 로 돌아오면 제자리 — [밖, 폭]',
      await p.evaluate(() => { const d = document.querySelector('#optDlg'), q = d.getBoundingClientRect();
        const v = window.visualViewport;
        const 밖 = Math.max(0, v.offsetTop - q.top) + Math.max(0, q.bottom - (v.offsetTop + v.height))
                 + Math.max(0, v.offsetLeft - q.left) + Math.max(0, q.right - (v.offsetLeft + v.width));
        return [Math.round(밖), Math.round(q.width)]; }), [0, 330]);
    맞나('팝업이 최상위 층(모달)인가', await p.evaluate(() => { const d = document.querySelector('#optDlg');
      try { return !!d && d.open && d.matches(':modal'); } catch (e){ return 'x'; } }), true);
    await 톡자('#optDlg [data-optclose]'); await 잠(300);

    /* ⑩ **어떤 배율에서도 이름이 온전히 읽힌다** (10-04 관리자).
       ⑨ 는 **판이 들어갔는지만** 보고 **글이 읽히는지는 안 봤다** — 그래서 초록인데
       「상부유격」 이 「상부유」 로 깎이고(배율 2) 아예 안 보이기까지 했다(배율 2.5).
       이름 없는 수치칸 둘이 나란히 서면 **위 유격인지 아래 유격인지 모른 채 숫자를 치시게 된다.**
       자는 `scrollWidth <= clientWidth` 다. 끝에는 **실제로 하시는 일**까지 해 본다 —
       좁은 자리에서 이름을 읽고, 그 이름 밑 칸에 숫자를 치고, 저장해서 그 열쇠에 들어가나. */
    console.log('⑩ 어떤 배율에서도 이름이 안 깎인다');
    await 품목('서랍장');
    await p.evaluate(() => window.__probe && window.__probe.set
      ? window.__probe.set({ backMode:'insert', topStyle:'overlay', botStyle:'under' }) : null);
    await 잠(500);
    const 깎임 = [];
    /* 두 갈래로 나눠 쓴다 — 하판이 「측판 아래」 면 전면밴드가 아예 안 선다(§4.9892).
       「측판 아래」 에서만 뜨는 「측판 들임 (하판)」 과 전면밴드 판을 둘 다 보려면 이렇게 갈라야 한다. */
    for (const 판 of ['마이다', '가로대', '측판', '상판', '뒷판', '·', '전면밴드', '하판']){
      if (판 === '·'){ await p.evaluate(() => window.__probe.set({ botStyle:'inset' })); await 잠(500); continue; }
      await 차림표(판); await 톡자('#pmenu button[data-act="opt"]'); await 잠(350);
      for (const 배 of [1, 1.5, 2, 2.5]){
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:배 }); await 잠(300);
        const 깎 = await p.evaluate(() => { const d = document.querySelector('#optDlg');
          if (!d || !d.open) return ['안 열림'];
          return [...d.querySelectorAll('label, .opthead small')]
            .filter(e => e.scrollWidth > e.clientWidth + 0.5)
            .map(e => e.textContent.trim().slice(0, 10) + ' ' + e.clientWidth + '/' + e.scrollWidth); });
        if (깎.length) 깎임.push(판 + ' 배율 ' + 배 + ': ' + 깎.join(' · '));
      }
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(250);
      await 톡자('#optDlg [data-optclose]'); await 잠(250);
    }
    맞나('일곱 판 × 네 배율 — 깎인 이름', 깎임, []);
    await p.evaluate(() => window.__probe.set({ botStyle:'under' })); await 잠(400);

    // 좁은 자리에서 이름을 읽고 그 밑 칸에 숫자를 쳐서 저장한다 — 사장님이 하시는 그 일
    await p.evaluate(() => window.__probe.set({ doorMode:'out' })); await 잠(400);
    await 차림표('마이다'); await 톡자('#pmenu button[data-act="opt"]'); await 잠(350);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:2.5 }); await 잠(400);
    const 상부 = await p.evaluate(() => {
      const 줄 = [...document.querySelectorAll('#optDlg .optnum')]
        .find(r => r.querySelector('label').textContent.trim() === '상부유격');
      if (!줄) return null;
      const l = 줄.querySelector('label'), i = 줄.querySelector('.num input');
      const lr = l.getBoundingClientRect(), ir = i.getBoundingClientRect();
      i.id && i.focus();
      return { 읽히나:l.scrollWidth <= l.clientWidth + 0.5,
        쌓임:ir.top > lr.bottom - 2,                     // 칸이 이름 **밑**에 선다
        칸:[Math.round(ir.left + ir.width/2), Math.round(ir.top + ir.height/2)] }; });
    /* 1280 에서는 배율 2.5 라도 보이는 폭이 512 라 판이 330 그대로다 — 쌓일 까닭이 없다.
       **쌓이는지는 좁아지는 폰에서만** 보고, **읽히는지는 두 폭에서 다** 본다. */
    맞나('배율 2.5 — 「상부유격」 [읽히나, 폰이면 칸이 이름 밑에]',
      상부 ? [상부.읽히나, 폭 === 375 ? 상부.쌓임 : true] : null, [true, true]);
    if (상부) await 톡(상부.칸[0], 상부.칸[1]); await 잠(250);
    await p.keyboard.press('Control+A'); await p.keyboard.type('9'); await 잠(250);   // 치던 값을 지우고 친다
    await 톡자('#optDlg [data-optsave]'); await 잠(450);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(300);
    /* 그 이름의 열쇠(`아웃위`)로만 들어가고(아랫유격은 안 건드려진다), 도면의 마이다 윗끝이 따라온다.
       상판이 「측판 위」 라 윗끝은 `H − 아웃위` 다 — 기본 2 에서 1798, 9 를 치면 **1791**. */
    맞나('친 숫자가 그 이름의 열쇠로 들어가 도면까지 갔나',
      await p.evaluate(() => { const r = window.__probe.rule(), m = window.__probe.model();
        const 윗 = Math.round(m.parts.filter(x => x.name === '마이다')
          .map(x => x.z + x.h).sort((a, b) => b - a)[0] || 0);
        return [r.아웃위, r.아웃아래걸레, 윗]; }),
      [9, 5, 1791]);

    /* ⑪ **판 안의 것이 판 밖으로 안 나간다** (10-04 관리자).
       ⑩ 은 `label` 만 재서 **`.seg.mini`(눈금 0~8)를 놓쳤다** — 배율 2.5 에서 「8」 이 16px 밖으로
       나가 **아예 안 보였고**(마이다 0~8 중 8 을 못 고르신다) 「저장」 도 판 밖이었다.
       자는 둘이다 — ㄱ) 모든 자가 `scrollWidth <= clientWidth` ㄴ) 모든 자의 네모가 **판 좌우 안**.
       ⚠ 세로는 **판 밖이 맞다** — 길면 `#optDlgBody` 가 굴러간다(§4.98619 의 그 규칙).
          그래서 세로는 「굴리면 닿나」 로 잰다. */
    console.log('⑪ 판 안의 것이 판 밖으로 안 나간다 — 눈금·단추까지');
    const 넘친것 = [];
    for (const 판 of ['마이다', '가로대', '측판', '상판', '뒷판']){
      await 차림표(판); await 톡자('#pmenu button[data-act="opt"]'); await 잠(350);
      for (const 배 of [1, 1.5, 2, 2.5]){
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:배 }); await 잠(300);
        const 난것 = await p.evaluate(() => { const d = document.querySelector('#optDlg');
          if (!d || !d.open) return ['안 열림'];
          const dr = d.getBoundingClientRect(), 난 = [];
          d.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect();
            if (!r.width && !r.height) return;
            const 이 = e.tagName.toLowerCase() + '«' + (e.textContent || '').trim().slice(0, 6) + '»';
            if (e.scrollWidth > e.clientWidth + 0.5) 난.push(이 + ' 깎임 ' + e.clientWidth + '/' + e.scrollWidth);
            const 가로 = Math.max(0, r.right - dr.right) + Math.max(0, dr.left - r.left);
            if (가로 > 0.5) 난.push(이 + ' 가로 ' + Math.round(가로)); });
          return 난; });
        if (난것.length) 넘친것.push(판 + ' 배율 ' + 배 + ': ' + 난것.join(' · '));
      }
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(250);
      await 톡자('#optDlg [data-optclose]'); await 잠(250);
    }
    맞나('다섯 판 × 네 배율 — 판 밖으로 나간 것', 넘친것, []);

    // 눈금 0~8 이 아홉 칸 다 보이고, 굴리면 「저장」 이 판 안에 든다 (배율 2.5 · 가장 좁은 자리)
    await 차림표('마이다'); await 톡자('#pmenu button[data-act="opt"]'); await 잠(350);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:2.5 }); await 잠(350);
    맞나('배율 2.5 — [눈금 수, 판 안에 든 눈금 수]',
      await p.evaluate(() => { const d = document.querySelector('#optDlg');
        const dr = d.getBoundingClientRect();
        // 분할 눈금 줄만 — 같은 판의 「외부/내부」 도 `.seg.mini` 라 그냥 쓸면 11개로 잡힌다
        const 들 = [...d.querySelectorAll('.seg.mini label')].filter(e => e.querySelector('input[name=doors]'));
        return [들.length, 들.filter(e => { const r = e.getBoundingClientRect();
          return r.left >= dr.left - 0.5 && r.right <= dr.right + 0.5; }).length]; }), [9, 9]);
    맞나('굴리면 「저장」 이 판 안에 드나',
      await p.evaluate(() => { const bd = document.querySelector('#optDlgBody');
        bd.scrollTop = bd.scrollHeight;
        const d = document.querySelector('#optDlg'), dr = d.getBoundingClientRect();
        const b2 = d.querySelector('[data-optsave]'); if (!b2) return 'x';
        const r = b2.getBoundingClientRect();
        return r.left >= dr.left - 0.5 && r.right <= dr.right + 0.5
            && r.top >= dr.top - 0.5 && r.bottom <= dr.bottom + 0.5; }), true);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(250);
    await 톡자('#optDlg [data-optclose]'); await 잠(250);

    await 품목('수납장'); await 모드('3d');

    맞나('오류 0', 터짐.length, 0);
    if (터짐.length) console.log('    ' + 터짐.join('\n    '));
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

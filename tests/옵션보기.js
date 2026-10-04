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
    const 잘림 = () => p.evaluate(() => {
      const d = document.querySelector('#optDlg');
      if (!d || !d.open) return { 밖:-1, 안든다:false, 굴러가나:false };
      const q = d.getBoundingClientRect(), vv = window.visualViewport, bd = document.querySelector('#optDlgBody');
      const 보위 = vv ? vv.offsetTop : 0, 보키 = vv ? vv.height : window.innerHeight;
      return { 밖:Math.round(Math.max(0, q.bottom - (보위 + 보키)) + Math.max(0, 보위 - q.top)),
        안든다:q.height > 보키 - 12, 굴러가나:bd ? bd.scrollHeight > bd.clientHeight : false }; });
    맞나('보통 배율 — 밖으로 나간 px', (await 잘림()).밖, 0);
    for (const 배 of [1.5, 2, 2.5]){
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:배 }); await 잠(350);
      const z = await 잘림();
      // 밖으로 한 픽셀도 안 나가고, 다 안 들어가면 판 안에서 굴러간다
      맞나('배율 ' + 배 + ' — [밖, 안 들어가면 굴러가나]', [z.밖, z.안든다 ? z.굴러가나 : true], [0, true]);
    }
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor:1 }); await 잠(300);
    맞나('팝업이 최상위 층(모달)인가', await p.evaluate(() => { const d = document.querySelector('#optDlg');
      try { return !!d && d.open && d.matches(':modal'); } catch (e){ return 'x'; } }), true);
    await 톡자('#optDlg [data-optclose]'); await 잠(300);
    await 품목('수납장'); await 모드('3d');

    맞나('오류 0', 터짐.length, 0);
    if (터짐.length) console.log('    ' + 터짐.join('\n    '));
    await ctx.close();
  }

  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

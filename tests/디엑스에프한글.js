#!/usr/bin/env node
/* 10-09 사장님 말씀: 「**엔에스알 - dxf 파일 - 사진과 같은 물음표가 나타난다**」
   캐드로 연 DXF 에서 숫자는 멀쩡한데 **한글만 한 자마다 `?`** 였다.

     ① 머리에 `$DWGCODEPAGE = ansi_949` 가 있다
     ② `\U+XXXX` 이스케이프가 **하나도 없다** (그건 AC1015 것이고 이 판은 R12 다)
     ③ 내려받은 **바이트**를 CP949 로 풀면 한글이 한글로 돌아온다 (「부품표  BOM」·「정면도  FRONT VIEW」)
     ④ `?`(0x3F) 바이트 **0개**
     ⑤ STYLE 에 **한글 글꼴**이 달려 있다 (본글꼴 TTF · 큰글꼴 SHX)
     ⑥ **선·좌표는 한 톨도 안 바뀐다** — LINE 개수 · TEXT 개수 · `$EXTMIN`/`$EXTMAX`
     ⑦ 네 기준값(바이트) — 덮기 2.7T 70,843 · 끼우기 2.7T 108,269 · 덮기 9T 70,053 · 끼우기 9T 108,335

   돌리는 법:  node tests/디엑스에프한글.js
   화면을 띄워 **진짜로 내려받는** 시험이라 three.min.js 사본이 있어야 한다(`TH=<경로>`). 없으면 건너뛴다(끝값 0 · §7). */
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
  return s.replace(못, 'window.__probe={set:(o)=>{Object.assign(state,o);update();},' +
    'dxf:()=>buildDXF(drawing)};' + 못);
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
  const b = await chromium.launch({ acceptDownloads:true });
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 }, acceptDownloads:true });
  const p = await ctx.newPage();
  const 터짐 = []; p.on('pageerror', e => 터짐.push(String(e)));
  await p.goto(주소, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__probe, null, { timeout:20000 });
  await 잠(700);

  const 상태 = async o => { await p.evaluate(x => window.__probe.set(x), o); await 잠(400); };
  const 받기 = async () => { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#btnDxf')]);
    return fs.readFileSync(await d.path()); };
  const 풀기 = buf => new TextDecoder('euc-kr').decode(buf);
  // ⚠ `anchor` 와 **같은 자리에서** 재야 네 기준값이 맞는다 — 뒷판 방식과 두께 말고는 **기본값 그대로** 둔다
  const 기본 = {};

  await 상태(Object.assign({}, 기본, { backMode:'insert', TB:2.7 }));
  const buf = await 받기(), 글 = 풀기(buf);

  console.log('① 머리에 $DWGCODEPAGE = ansi_949');
  맞나('$DWGCODEPAGE 줄', /\$DWGCODEPAGE\r\n3\r\nansi_949\r\n/.test(글), true);
  맞나('판은 R12 그대로', /\$ACADVER\r\n1\r\nAC1009\r\n/.test(글), true);

  console.log('② \\U+ 이스케이프가 하나도 없다');
  맞나('\\U+ 개수', (글.match(/\\U\+/g) || []).length, 0);

  console.log('③ 바이트를 CP949 로 풀면 한글이 돌아온다');
  맞나('한글 글자 수', (글.match(/[가-힣]/g) || []).length, 138);
  맞나('「부품표  BOM」', 글.includes('부품표  BOM'), true);
  맞나('「정면도  FRONT VIEW」', 글.includes('정면도  FRONT VIEW'), true);
  맞나('「측판 2장 · 안쪽면」', 글.includes('측판 2장 · 안쪽면'), true);
  // 한글은 CP949 두 바이트다 — 아스키로만 적혔으면 여기서 걸린다
  맞나('0x81~0xFE 바이트가 있다', buf.some(x => x >= 0x81 && x <= 0xFE), true);

  console.log('④ ?(0x3F) 바이트 0개');
  맞나('? 바이트', buf.filter(x => x === 0x3F).length, 0);

  console.log('⑤ STYLE 에 한글 글꼴');
  맞나('본글꼴 · 큰글꼴', /STYLE\r\n2\r\nSTANDARD\r\n[\s\S]*?\r\n3\r\nmalgun\.ttf\r\n4\r\nwhgtxt\.shx\r\n/.test(글), true);
  맞나('txt.shx 하나만 쓰던 옛 꼴이 아니다', /\r\n3\r\ntxt\r\n4\r\n\r\n/.test(글), false);

  console.log('⑥ 선·좌표는 한 톨도 안 바뀐다');
  const 재기 = async st => { await 상태(Object.assign({}, 기본, st));
    const s = await p.evaluate(() => window.__probe.dxf()), L = s.split('\r\n');
    const 줄 = k => { const i = L.indexOf(k); return i < 0 ? null : L.slice(i+1, i+7).join('|'); };
    const by = (await 받기()).length;
    return { LINE:(s.match(/\r\nLINE\r\n/g) || []).length, TEXT:(s.match(/\r\nTEXT\r\n/g) || []).length,
             EXTMIN:줄('$EXTMIN'), EXTMAX:줄('$EXTMAX'), 바이트:by }; };
  const 덮 = await 재기({ backMode:'cover', TB:2.7 }), 끼 = await 재기({ backMode:'insert', TB:2.7 });
  const 덮9 = await 재기({ backMode:'cover', TB:9 }), 끼9 = await 재기({ backMode:'insert', TB:9 });
  맞나('LINE 개수 (덮기 2.7 · 끼우기 2.7 · 덮기 9 · 끼우기 9)',
    [덮.LINE, 끼.LINE, 덮9.LINE, 끼9.LINE], [859, 1310, 860, 1311]);
  맞나('TEXT 개수', [덮.TEXT, 끼.TEXT, 덮9.TEXT, 끼9.TEXT], [75, 109, 75, 109]);
  맞나('$EXTMIN 덮기·끼우기', [덮.EXTMIN, 끼.EXTMIN], ['10|-9|20|-316|30|0', '10|-164|20|-1576|30|0']);
  맞나('$EXTMAX 덮기·끼우기', [덮.EXTMAX, 끼.EXTMAX], ['10|3160|20|2829|30|0', '10|3460|20|2829|30|0']);

  console.log('⑦ 네 기준값 (바이트)');
  맞나('덮기 2.7T · 끼우기 2.7T · 덮기 9T · 끼우기 9T',
    [덮.바이트, 끼.바이트, 덮9.바이트, 끼9.바이트], [70843, 108269, 70053, 108335]);

  맞나('오류 0', 터짐.length, 0);
  await b.close(); 서버.close();
  console.log(깬것 ? `\n깨진 것 ${깬것}개` : '\n다 맞다');
  process.exit(깬것 ? 1 : 0);
})();

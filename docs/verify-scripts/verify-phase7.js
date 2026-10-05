/* 阶段七浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8797）
   覆盖（Task 68/70 兜底验证）：正常打开 / 14 页走查无 JS 错误 / 空态文案 /
   IDB+localStorage 双禁用 → 红条 / 仅 IDB 禁用 → 黄条 / file:// 协议运行 */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8797;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json'
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(path.join(ROOT, ''))) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

const results = [];
function record(item, pass, detail) {
  results.push({ item, pass });
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + item + (detail ? ' | ' + detail : ''));
}

(async () => {
  const srv = await startServer();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const URL = 'http://127.0.0.1:' + PORT + '/index.html';

  // ============ 上下文 A：正常打开 ============
  const ctxA = await browser.newContext();
  const page = await ctxA.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (loc.includes('favicon') || m.text().indexOf('favicon') >= 0) return;
    jsErrors.push(m.text() + ' @ ' + loc);
  });

  // 1. 正常打开无 JS 错误
  await page.goto(URL);
  await page.waitForTimeout(1000);
  record('1 正常打开无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 14 个导航页逐页走查（空态也是合法渲染，只要不报错、不空白）
  const labels = ['今日建议', '项目管理', '我的项目专属清单', '全量手续库', '模板库',
    '材料清单', '平台办事导航', '退回原因库', '招标工作时间计划', '进度计划与倒排',
    '投资估算计算器', '数据管理', '方案与效果图', '导出中心'];
  const blanks = [];
  for (const lb of labels) {
    await page.locator('.app-side .app-nav__item', { hasText: lb }).first().click();
    await page.waitForTimeout(350);
    const len = await page.evaluate(() => document.querySelector('.app-main').textContent.trim().length);
    if (len < 10) blanks.push(lb);
  }
  record('2 14 个页面逐页走查：全部有内容、无 JS 错误', blanks.length === 0 && jsErrors.length === 0,
    '空白页=[' + blanks.join('/') + '] jsErr=' + jsErrors.length);

  // 3. 清空状态（全新库）空态文案：项目管理 / 专属清单
  await page.locator('.app-side .app-nav__item', { hasText: '项目管理' }).first().click();
  await page.waitForTimeout(400);
  const projText = await page.locator('.app-main').textContent();
  await page.locator('.app-side .app-nav__item', { hasText: '我的项目专属清单' }).first().click();
  await page.waitForTimeout(400);
  const clText = await page.locator('.app-main').textContent();
  const dbTables = await page.evaluate(async () => {
    try {
      const names = (await indexedDB.databases()).map((d) => d.name);
      return names.indexOf('sjsq-engineering') >= 0 ? '库存在（空）' : '库不存在';
    } catch (e) { return 'databases() 不可用'; }
  });
  record('3 清空 IndexedDB 后空态文案（还没有项目 / 还没有选择项目）',
    projText.indexOf('还没有项目') >= 0 && clText.indexOf('还没有选择项目') >= 0, dbTables);

  // 4. 详情页坏 id：不白屏、有「找不到手续」空态
  await page.goto(URL + '#/detail?id=zzz-不存在');
  await page.waitForTimeout(500);
  const badIdText = await page.locator('.app-main').textContent();
  record('4 坏 id 详情页不白屏（找不到手续空态）', badIdText.indexOf('找不到手续') >= 0, '');

  await ctxA.close();

  // ============ 上下文 B：仅 IndexedDB 禁用 → 黄条 warn ============
  const ctxB = await browser.newContext();
  const pB = await ctxB.newPage();
  await pB.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch (e) {}
  });
  await pB.goto(URL);
  await pB.waitForTimeout(900);
  const warnBar = await pB.locator('.degrade-bar.warn').count();
  const warnText = warnBar ? await pB.locator('.degrade-bar.warn .degrade-text').textContent() : '';
  const warnLink = await pB.locator('.degrade-bar .degrade-link').getAttribute('href').catch(() => null);
  record('5 仅 IndexedDB 禁用 → 黄条（localStorage 降级文案 + 去导出备份链接）',
    warnBar === 1 && /localStorage/.test(warnText) && warnLink === '#/data',
    'text=' + warnText.slice(0, 40));
  await ctxB.close();

  // ============ 上下文 C：IndexedDB + localStorage 双禁用 → 红条 danger ============
  const ctxC = await browser.newContext();
  const pC = await ctxC.newPage();
  await pC.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch (e) {}
    try { Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true }); } catch (e) {}
  });
  await pC.goto(URL);
  await pC.waitForTimeout(900);
  const dangerBar = await pC.locator('.degrade-bar.danger').count();
  const dangerText = dangerBar ? await pC.locator('.degrade-bar.danger .degrade-text').textContent() : '';
  record('6 双禁用 → 红条（内存模式提示刷新会丢失 + 导出备份指引）',
    dangerBar === 1 && /刷新|丢失/.test(dangerText) && /数据管理|导出/.test(dangerText),
    'text=' + dangerText.slice(0, 50));
  await ctxC.close();

  // ============ 上下文 D：file:// 协议直接打开 ============
  const ctxD = await browser.newContext();
  const pD = await ctxD.newPage();
  const fileErrs = [];
  pD.on('pageerror', (e) => fileErrs.push('pageerror: ' + e.message));
  pD.on('console', (m) => {
    if (m.type() === 'error' && m.text().indexOf('favicon') < 0) fileErrs.push(m.text());
  });
  const fileUrl = 'file:///' + encodeURI('D:/4workbuddy工作空间/2毕业设计/3代码实施/index.html');
  await pD.goto(fileUrl);
  await pD.waitForTimeout(1200);
  const adviceLen = await pD.evaluate(() => {
    const el = document.querySelector('.app-main');
    return el ? el.textContent.trim().length : 0;
  });
  const fileBars = await pD.locator('.degrade-bar').count();
  const fileKind = await pD.evaluate(() => (window.SJSQ && window.SJSQ.app && window.SJSQ.app.storeInfo)
    ? window.SJSQ.app.storeInfo.kind : 'unknown');
  record('7 file:// 协议双击等价打开：无 JS 错误、页面有内容',
    fileErrs.length === 0 && adviceLen > 10, 'storeKind=' + fileKind + ' jsErr=' + fileErrs.length);
  // file:// 下 IndexedDB 可用时不应出现降级横幅（若浏览器禁用则横幅出现也属正确行为，记录即可）
  record('8 file:// 降级横幅状态记录（可用时不出现横幅）',
    fileBars === 0 || fileKind !== 'idb', 'bars=' + fileBars + ' kind=' + fileKind);
  await ctxD.close();

  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段七兜底核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

/* 阶段六浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8796）
   覆盖：数据备份恢复闭环 / 平台导航 / 退回原因库 / 建议页 / 全局搜索 */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8796;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json'
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
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (loc.includes('favicon') || m.text().indexOf('favicon') >= 0) return;
    jsErrors.push(m.text() + ' @ ' + loc);
  });

  const nav = async (label) => {
    await page.locator('.app-side .app-nav__item', { hasText: label }).click();
    await page.waitForTimeout(500);
  };

  // 1. 打开页面，控制台无 JS 错误
  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForTimeout(900);
  record('1 页面打开无 JS 错误（忽略 favicon）', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 建项目「验证学校E」并勾 2 项手续为已办结
  await nav('项目管理');
  await page.locator('.page__actions .ui-btn', { hasText: '新建项目' }).click();
  await page.locator('.ui-modal input[name="name"]').fill('验证学校E');
  await page.locator('.ui-modal input[name="unit"]').fill('备份恢复验收单位');
  await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '保存' }).click();
  await page.waitForTimeout(500);
  await page.locator('.ui-table .ui-btn', { hasText: '打开清单' }).first().click();
  await page.waitForTimeout(600);
  await page.locator('select.cl-status').nth(0).selectOption('done');
  await page.waitForTimeout(300);
  await page.locator('select.cl-status').nth(1).selectOption('done');
  await page.waitForTimeout(400);
  const doneSel = await page.locator('select.cl-status').evaluateAll(
    (els) => els.filter((e) => e.value === 'done').length);
  record('2 项目「验证学校E」已建 + 勾 2 项手续为已办结', doneSel >= 2, 'done 选项数=' + doneSel);

  // 3. 建议页：建议卡不为空（顺带截图，稍后与搜索页拼成 verify-11）
  await nav('今日建议');
  await page.waitForTimeout(500);
  const adviceCount = await page.locator('.advice-item').count();
  record('3 建议页输出建议卡（不为空）', adviceCount > 0, 'advice-item=' + adviceCount);
  const adviceShot = await page.screenshot({ fullPage: true });

  // 4. 数据管理页：导出快照 → 校验 JSON 结构
  await nav('数据管理');
  await page.waitForTimeout(400);
  const snapFile = path.join(ROOT, 'docs', '.tmp-phase6-snapshot.json');
  const dlName = await (async () => {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.locator('.view-data .ui-btn', { hasText: '导出全部数据' }).click(),
    ]);
    await dl.saveAs(snapFile);
    return dl.suggestedFilename();
  })();
  const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  const projRow = (snap.tables.projects || []).find((p) => p.name === '验证学校E');
  const doneRows = (snap.tables.checklist || []).filter((r) => r.status === 'done');
  record('4 导出快照结构合法（tables.projects/checklist/meta 白名单）',
    snap.version === 1 && Array.isArray(snap.tables.projects) && Array.isArray(snap.tables.checklist)
      && !!projRow && doneRows.length === 2 && Object.keys(snap.tables).every(
        (k) => ['projects', 'checklist', 'meta'].indexOf(k) >= 0),
    'filename=' + dlName + ' projects=' + (snap.tables.projects || []).length +
    ' checklist=' + (snap.tables.checklist || []).length + ' done=' + doneRows.length +
    ' meta=' + ((snap.tables.meta || []).map((m) => m.id).join(',') || '无'));
  await page.screenshot({ path: path.join(ROOT, 'docs/verify-10-数据管理.png'), fullPage: true });

  // 5. 清空全部数据（二次确认）→ 页面刷新、数据归零
  await page.locator('.view-data .ui-btn', { hasText: '清空全部数据' }).click();
  await page.waitForTimeout(300);
  await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '确认清空' }).click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(1200);
  await nav('项目管理');
  const emptyText = await page.locator('.app-main').textContent();
  record('5 清空全部数据生效（项目清零）', emptyText.indexOf('还没有项目') >= 0, '');

  // 6. 导入快照（合并）→ 项目与勾选状态还原
  await nav('数据管理');
  await page.waitForTimeout(400);
  await page.locator('.view-data input[type=file]').setInputFiles({
    name: 'phase6-snapshot.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snap)),
  });
  const importRes = await (async () => {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.locator('.view-data .ui-btn', { hasText: /^导入$/ }).click(),
    ]);
    return { rollback: dl.suggestedFilename() };
  })();
  await page.waitForTimeout(600);
  const statusText = await page.locator('.view-data .data-status').textContent();
  await nav('项目管理');
  const backText = await page.locator('.app-main').textContent();
  await page.locator('.ui-table .ui-btn', { hasText: '打开清单' }).first().click();
  await page.waitForTimeout(600);
  const doneSel2 = await page.locator('select.cl-status').evaluateAll(
    (els) => els.filter((e) => e.value === 'done').length);
  record('6 导入快照后数据还原（回滚点已下载 + 项目与勾选恢复）',
    statusText.indexOf('导入完成') >= 0 && backText.indexOf('验证学校E') >= 0 && doneSel2 === 2,
    'rollback=' + importRes.rollback + ' done=' + doneSel2);

  // 7. 平台导航页：两平台 Tab 切换 + 外链 target=_blank
  await nav('平台办事导航');
  await page.waitForTimeout(500);
  const tab1 = await page.locator('.tabs .tab.active').textContent();
  const tabTexts = await page.locator('.tabs .tab').allTextContents();
  await page.locator('.tabs .tab', { hasText: tabTexts[1] }).click();
  await page.waitForTimeout(500);
  const tab2 = await page.locator('.tabs .tab.active').textContent();
  const blankCnt = await page.locator('.app-main a[target="_blank"]').count();
  const platText = await page.locator('.app-main').textContent();
  record('7 平台导航：Tab 切换生效 + 外链 _blank 存在',
    tabTexts.length === 2 && tab1 !== tab2 && blankCnt >= 1 && platText.indexOf('入口：') >= 0,
    'tabs=[' + tabTexts.join('/') + '] ' + tab1 + '→' + tab2 + ' blank=' + blankCnt);

  // 8. 退回原因库：27 条 + 类目 Tab + 按手续筛选
  await nav('退回原因库');
  await page.waitForTimeout(500);
  const before = await page.locator('.app-main').textContent();
  const totalM = before.match(/共 (\d+) 条/);
  const catTabs = await page.locator('.tabs .tab').allTextContents();
  await page.locator('.reasons-filter select[name="procedureId"]').selectOption({ index: 1 });
  await page.waitForTimeout(400);
  const after = (await page.locator('.app-main').textContent()).match(/共 (\d+) 条/);
  record('8 退回原因库：27 条 + 类目 Tab + 按手续筛选生效',
    totalM && totalM[1] === '27' && catTabs.length >= 5 && after && +after[1] > 0 && +after[1] < 27,
    'tabs=[' + catTabs.join('/') + '] 筛选后 ' + (after ? after[1] : '?') + ' 条');

  // 9. 全局搜索「施工」：手续与模板混合结果 + <mark> 高亮（截图与建议页拼 verify-11）
  await page.locator('.shell-search input[name="q"]').fill('施工');
  await page.locator('.shell-search button[type="submit"]').click();
  await page.waitForTimeout(600);
  const searchInfo = await page.evaluate(() => {
    const marks = document.querySelectorAll('.search-hit mark, td span mark').length;
    const kinds = Array.from(document.querySelectorAll('.ui-table tbody tr td:first-child'))
      .map((td) => td.textContent.trim());
    const summary = (document.querySelector('.app-main').textContent.match(/找到 (\d+) 条（([^）]*)）/) || []);
    return { marks, kinds: Array.from(new Set(kinds)), summary: summary[0] || '' };
  });
  record('9 全局搜索「施工」：混合结果 + mark 高亮',
    searchInfo.marks > 0 && searchInfo.kinds.indexOf('手续') >= 0 && searchInfo.kinds.indexOf('模板') >= 0,
    searchInfo.summary + ' kinds=[' + searchInfo.kinds.join('/') + '] mark=' + searchInfo.marks);
  const searchShot = await page.screenshot({ fullPage: true });
  const compose = await ctx.newPage();
  await compose.setContent('<html><body style="margin:0">' +
    '<img style="display:block;width:100%" src="data:image/png;base64,' + adviceShot.toString('base64') + '">' +
    '<img style="display:block;width:100%" src="data:image/png;base64,' + searchShot.toString('base64') + '">' +
    '</body></html>');
  await compose.waitForTimeout(400);
  await compose.screenshot({ path: path.join(ROOT, 'docs/verify-11-建议与搜索.png'), fullPage: true });
  await compose.close();

  // 10. 全程 JS 错误复查
  record('10 全流程无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  fs.unlinkSync(snapFile);
  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段六核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

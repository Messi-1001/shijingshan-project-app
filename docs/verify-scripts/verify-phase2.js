/* 阶段二浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8792） */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8792;
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

// 统计 7 个手续板块表的行数（排除 ⑧ 说明与"不列入备忘"表）
const SECTION_NAMES = ['前期立项', '用地手续', '规划报建', '各类评价', '招标与合同', '施工许可', '竣工验收'];
const countRows = (page) => page.evaluate((names) => {
  let n = 0;
  document.querySelectorAll('.ui-section').forEach((sec) => {
    const h2 = sec.querySelector('h2');
    if (!h2) return;
    if (names.some((nm) => h2.textContent.indexOf(nm) >= 0)) {
      n += sec.querySelectorAll('tbody tr').length;
    }
  });
  return n;
}, SECTION_NAMES);

(async () => {
  const srv = await startServer();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (loc.includes('favicon') || m.text().indexOf('favicon') >= 0) return;
    jsErrors.push(m.text() + ' @ ' + loc);
  });

  // 1. 打开页面，控制台无 JS 错误
  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForTimeout(800);
  record('1 页面打开无 JS 错误（忽略 favicon）', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 侧边栏点「全量手续库」：七板块渲染、总数 40、⑧ 说明出现、无「项目储备入库」
  await page.locator('.app-side .app-nav__item', { hasText: '全量手续库' }).click();
  await page.waitForTimeout(400);
  const libText = await page.locator('.app-main').textContent();
  const headings = await page.evaluate((names) => {
    const found = [];
    document.querySelectorAll('.ui-section h2').forEach((h) => {
      names.forEach((nm) => { if (h.textContent.indexOf(nm) >= 0) found.push(nm); });
    });
    return found;
  }, SECTION_NAMES);
  const totalRows = await countRows(page);
  const hasClosing = libText.indexOf('⑧ 收尾结算') >= 0 && libText.indexOf('不提供结算计算器') >= 0;
  // spec 第 4 节 ①（用户冻结口径）：「项目储备入库」不写、不列——整页任何位置（含备忘表）均不得出现；
  // 「建设用地规划许可证」仍应出现在备忘表，证明备忘表功能本身正常。
  const stashCheck = await page.evaluate(() => {
    const main = document.querySelector('.app-main');
    return {
      anywhere: main.textContent.indexOf('项目储备入库') >= 0,
      memoHasGui: main.textContent.indexOf('建设用地规划许可证') >= 0
    };
  });
  record('2.1 七板块均渲染', headings.length === 7, '命中=' + headings.join('/'));
  record('2.2 手续总行数 = 40', totalRows === 40, 'rows=' + totalRows);
  record('2.3 ⑧ 收尾结算一句话说明出现', hasClosing, '');
  record('2.4 整页无「项目储备入库」且备忘表仍含「建设用地规划许可证」',
    stashCheck.anywhere === false && stashCheck.memoHasGui === true,
    '页面出现储备入库=' + stashCheck.anywhere + ' 备忘表含规证=' + stashCheck.memoHasGui);
  await page.screenshot({ path: 'docs/verify-3-全量库.png', fullPage: true });

  // 3. 检索「施工」：行数 < 40 且含「建筑工程施工许可证」
  await page.locator('.lib-search').fill('施工');
  await page.waitForTimeout(500);
  const searchRows = await countRows(page);
  const searchText = await page.locator('.app-main').textContent();
  record('3.1 检索「施工」结果行数 < 40', searchRows > 0 && searchRows < 40, 'rows=' + searchRows);
  record('3.2 命中「建筑工程施工许可证」', searchText.indexOf('建筑工程施工许可证') >= 0, '');
  await page.locator('.lib-search').fill('');
  await page.waitForTimeout(500);

  // 4. 点「建筑工程施工许可证」进详情：URL、7 信息块、返回库页
  await page.locator('.app-main a', { hasText: '建筑工程施工许可证' }).first().click();
  await page.waitForTimeout(400);
  const hash = await page.evaluate(() => location.hash);
  record('4.1 URL 变为 #/detail/<id>', /^#\/detail\/sg-1$/.test(hash), 'hash=' + hash);
  const detailText = await page.locator('.app-main').textContent();
  const blocks = ['① 办理依据', '② 前置条件', '③ 办理部门 / ④ 参考时限', '⑤ 所需材料清单', '⑥ 关联模板', '⑦ 常见退回原因'];
  const missingBlocks = blocks.filter((b) => detailText.indexOf(b) < 0);
  record('4.2 详情 7 信息块容器存在', missingBlocks.length === 0, missingBlocks.length ? '缺=' + missingBlocks.join('/') : '6 卡片标题齐全（③④合并为一张卡）');
  await page.screenshot({ path: 'docs/verify-4-详情页.png', fullPage: true });
  await page.locator('.breadcrumb a', { hasText: '返回全量手续库' }).click();
  await page.waitForTimeout(400);
  const backHash = await page.evaluate(() => location.hash);
  const backRows = await countRows(page);
  record('4.3 返回库页正常', backHash === '#/library' && backRows === 40, 'hash=' + backHash + ' rows=' + backRows);

  // 5. 串/并联标注出现在 35–38 行
  const paraCheck = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ui-section tbody tr').forEach((tr) => {
      const t = tr.textContent;
      ['档案验收', '人防验收', '消防验收', '规划核验'].forEach((nm) => {
        if (t.indexOf(nm) >= 0) out.push({ name: nm, tagged: t.indexOf('可并联') >= 0 });
      });
      if (t.indexOf('竣工验收（五方责任主体）') >= 0) out.push({ name: '五方验收(39)', tagged: t.indexOf('串联') >= 0 });
    });
    return out;
  });
  const paraOk = paraCheck.length >= 5 && paraCheck.slice(0, 4).every((x) => x.tagged) && paraCheck[4].tagged;
  record('5 串/并联标注出现在 35–38 行（39 为串联）', paraOk, JSON.stringify(paraCheck));

  // 6. 全程 JS 错误复查
  record('6 全流程无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段二核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

/* 阶段三浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8793） */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8793;
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

// 统计 7 个手续板块表的行数（排除「命中依据」「未覆盖」等表）
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

  // 2. 建项目「验证学校B」→ 打开清单 → 40 行 + ⑧ 说明
  await page.locator('.app-side .app-nav__item', { hasText: '项目管理' }).click();
  await page.waitForTimeout(400);
  await page.locator('.page__actions .ui-btn', { hasText: '新建项目' }).click();
  await page.locator('.ui-modal input[name="name"]').fill('验证学校B');
  await page.locator('.ui-modal input[name="unit"]').fill('自动核对建设单位');
  await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '保存' }).click();
  await page.waitForTimeout(500);
  const projRow = await page.locator('.app-main tbody tr', { hasText: '验证学校B' }).count();
  record('2.1 项目「验证学校B」已创建', projRow >= 1, 'rows=' + projRow);

  await page.locator('.app-main tbody tr', { hasText: '验证学校B' })
    .locator('.ui-btn', { hasText: '打开清单' }).click();
  await page.waitForTimeout(600);
  const listHash = await page.evaluate(() => location.hash);
  const listRows = await countRows(page);
  const listText = await page.locator('.app-main').textContent();
  record('2.2 进入专属清单页', /^#\/checklist\//.test(listHash), 'hash=' + listHash);
  record('2.3 清单 40 行手续', listRows === 40, 'rows=' + listRows);
  record('2.4 ⑧ 收尾结算一句话说明出现',
    listText.indexOf('⑧ 收尾结算') >= 0 && listText.indexOf('不提供结算计算器') >= 0, '');

  // 3. 进度环初始 0%
  const ring0 = await page.locator('.ui-ring__label strong').textContent();
  record('3.1 进度环初始 0%', ring0 === '0%', 'ring=' + ring0);

  // 4. 勾 3 项已办结、1 项办理中（按行索引：第 1–3 行 done、第 4 行 doing；
  //    每次 change 触发 persist→paint 重建 DOM，locator 逐次重查、逐个等待）
  for (let i = 0; i < 4; i++) {
    const val = i < 3 ? 'done' : 'doing';
    await page.locator('.cl-status').nth(i).selectOption(val);
    await page.waitForTimeout(500);
  }
  const picked = await page.evaluate(() => {
    const out = { done: [], doing: [], note: null };
    document.querySelectorAll('.cl-status').forEach((sel) => {
      if (sel.value === 'done') out.done.push(sel.dataset.pid);
      if (sel.value === 'doing') out.doing.push(sel.dataset.pid);
    });
    return out;
  });
  // 给「办理中」那一行填备注（去抖 600ms 保存，等 1s）
  await page.locator('.cl-status').evaluateAll((sels) => {
    const doing = sels.find((s) => s.value === 'doing');
    if (doing) {
      const tr = doing.closest('tr');
      const note = tr && tr.querySelector('.cl-note');
      if (note) {
        note.value = '自动核对备注X9';
        note.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(1200);

  // 5. 进度环 / 总统计 / 分项看板联动：done=3 doing=1；lixiang 3/7（43%）
  const ring1 = await page.locator('.ui-ring__label strong').textContent();
  const stats = await page.evaluate(() => {
    const block = document.querySelector('.cl-stats');
    const strongs = block ? Array.from(block.querySelectorAll('strong')).map((s) => s.textContent) : [];
    return strongs;
  });
  const boardFirst = await page.locator('.board__item').first()
    .evaluate((el) => ({
      name: el.querySelector('.board__name').textContent,
      num: el.querySelector('.board__num').textContent
    }));
  const boardCount = await page.locator('.board__item').count();
  record('5.1 进度环联动（3/40 → 8%）', ring1 === '8%', 'ring=' + ring1);
  record('5.2 总统计 done=3、doing=1', stats[0] === '3' && stats[1] === '1', 'strongs=' + stats.join(','));
  record('5.3 分项看板 7 板块且首项 3/7（43%）',
    boardCount === 7 && boardFirst.name === '前期立项' && boardFirst.num === '3/7（43%）',
    'board=' + boardCount + ' first=' + JSON.stringify(boardFirst));

  await page.screenshot({ path: path.join(ROOT, 'docs/verify-5-专属清单.png'), fullPage: true });

  // 6. F5 刷新 → 勾选状态与备注仍在（IndexedDB）
  await page.reload();
  await page.waitForTimeout(800);
  const after = await page.evaluate((pick) => {
    const out = { done: 0, doing: 0, note: null, ring: null };
    document.querySelectorAll('.cl-status').forEach((sel) => {
      if (sel.value === 'done') out.done += 1;
      if (sel.value === 'doing') out.doing += 1;
    });
    document.querySelectorAll('.cl-note').forEach((n) => {
      if (n.value === '自动核对备注X9') out.note = n.value;
    });
    const ring = document.querySelector('.ui-ring__label strong');
    out.ring = ring ? ring.textContent : null;
    return out;
  }, picked);
  record('6.1 刷新后勾选状态保留（done=3 doing=1）', after.done === 3 && after.doing === 1,
    'done=' + after.done + ' doing=' + after.doing);
  record('6.2 刷新后备注保留', after.note === '自动核对备注X9', 'note=' + after.note);
  record('6.3 刷新后进度环仍 8%', after.ring === '8%', 'ring=' + after.ring);

  // 7. 导出 Word：捕获 download 事件
  let dlOk = false, dlName = '';
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.locator('.page__actions .ui-btn', { hasText: '导出 Word' }).click()
    ]);
    dlOk = true;
    dlName = dl.suggestedFilename();
  } catch (e) {
    dlOk = false;
    dlName = e.message.split('\n')[0];
  }
  record('7 导出清单 Word 触发 download', dlOk, 'file=' + dlName);

  // 8. 安全网：判定依据表出现；「对照全量库」链接可达
  const netText = await page.locator('.app-main').textContent();
  record('8.1 判定依据表（命中依据）出现', netText.indexOf('命中依据') >= 0, '');
  await page.locator('.page__actions .ui-btn', { hasText: '对照全量手续库' }).click();
  await page.waitForTimeout(600);
  const libHash = await page.evaluate(() => location.hash);
  const libRows = await countRows(page);
  record('8.2 「对照全量库」链接可达（#/library 且 40 行）',
    libHash === '#/library' && libRows === 40, 'hash=' + libHash + ' rows=' + libRows);

  // 9. 全程 JS 错误复查
  record('9 全流程无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段三核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

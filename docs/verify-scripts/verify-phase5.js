/* 阶段五浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8795） */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8795;
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

  // 1. 打开页面，控制台无 JS 错误
  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForTimeout(800);
  record('1 页面打开无 JS 错误（忽略 favicon）', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 建项目「验证学校D」（投资估算填 20000 万 = 200000000 元）
  await page.locator('.app-side .app-nav__item', { hasText: '项目管理' }).click();
  await page.waitForTimeout(400);
  await page.locator('.page__actions .ui-btn', { hasText: '新建项目' }).click();
  await page.locator('.ui-modal input[name="name"]').fill('验证学校D');
  await page.locator('.ui-modal input[name="unit"]').fill('集成验收建设单位');
  await page.locator('.ui-modal input[name="investEstimate"]').fill('200000000');
  await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '保存' }).click();
  await page.waitForTimeout(500);
  const projText = await page.locator('.app-main').textContent();
  const projOk = projText.indexOf('验证学校D') >= 0 && projText.indexOf('200,000,000') >= 0;
  record('2 项目「验证学校D」已创建（投资估算 20000 万元）', projOk, '');

  // 3. 招标计划页：四类时间轴 + 方式建议
  await page.locator('.app-side .app-nav__item', { hasText: '招标工作时间计划' }).click();
  await page.waitForTimeout(600);
  const tenderInfo = await page.evaluate(() => {
    const main = document.querySelector('.app-main').textContent;
    const types = ['设计招标', '勘察招标', '监理招标', '施工招标'];
    const cards = Array.from(document.querySelectorAll('.ui-card h3')).map((h) => h.textContent);
    const tlOk = types.every((t) => cards.some((c) => c.indexOf(t) >= 0 && /共 \d+ 天，至 \d{4}-\d{2}-\d{2}/.test(c)));
    const phaseRows = document.querySelectorAll('tbody tr').length;
    const advice = main.indexOf('建议采用：') >= 0;
    const m = main.match(/建议采用：(资格预审|资格后审)/);
    const period = main.match(/预估招标周期：(\d+) 天/);
    const reasons = main.indexOf('判定理由') >= 0 && main.indexOf('风险提示') >= 0;
    return { tlOk, phaseRows, advice, method: m ? m[1] : '', period: period ? period[1] : '', reasons };
  });
  record('3.1 四类招标时间轴渲染（4 卡片 + 总天数 + 截止日）',
    tenderInfo.tlOk, 'rows=' + tenderInfo.phaseRows);
  record('3.2 施工招标方式建议输出判定（预审/后审）+ 周期天数',
    tenderInfo.advice && tenderInfo.method !== '' && tenderInfo.period !== '' && tenderInfo.reasons,
    'method=' + tenderInfo.method + ' period=' + tenderInfo.period + '天');
  // 切换紧迫度 → 建议随输入重算
  await page.locator('.view .form-grid select[name="urgency"], .app-main select[name="urgency"]').last().selectOption('紧张');
  await page.waitForTimeout(500);
  const adv2 = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('.ui-card h3')).find((h) => h.textContent.indexOf('建议采用：') >= 0);
    return c ? c.textContent : '';
  });
  record('3.3 紧迫度切换后建议卡仍输出且随输入重算', adv2.indexOf('建议采用：') >= 0, adv2);
  await page.screenshot({ path: path.join(ROOT, 'docs/verify-8-招标计划.png'), fullPage: true });

  // 4. 进度计划页：甘特图 + 倒排
  await page.locator('.app-side .app-nav__item', { hasText: '进度计划与倒排' }).click();
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => {
    const bars = document.querySelectorAll('.gantt-bar').length;
    const rows = document.querySelectorAll('.gantt-row').length;
    const today = document.querySelectorAll('.gantt-today').length;
    const m = document.querySelector('.app-main').textContent.match(/共 (\d+) 天/);
    const critCard = Array.from(document.querySelectorAll('.ui-card'))
      .find((c) => c.querySelector('h3') && c.querySelector('h3').textContent.indexOf('关键路径') >= 0);
    const critStart = critCard ? critCard.querySelector('tbody tr td:nth-child(3)').textContent : '';
    return { bars, rows, today, totalDays: m ? +m[1] : 0, critStart };
  });
  record('4.1 甘特图渲染（40 行条块 + 今日线）',
    before.rows === 40 && before.bars === 40 && before.today >= 1,
    'rows=' + before.rows + ' bars=' + before.bars + ' today=' + before.today + ' 正排天数=' + before.totalDays);
  // 切倒排 + 目标竣工日 → 末项完成日 = 目标日，且排期整体平移（关键路径首项开工日变化）
  await page.locator('.view-schedule select[name="mode"]').selectOption('backward');
  await page.waitForTimeout(300);
  await page.locator('.view-schedule input[name="targetEndDate"]').fill('2027-06-30');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const txt = document.querySelector('.app-main').textContent;
    const m = txt.match(/共 (\d+) 天/);
    const milestones = Array.from(document.querySelectorAll('.ui-card'))
      .filter((c) => c.querySelector('h3') && c.querySelector('h3').textContent.indexOf('关键节点') >= 0)
      .map((c) => c.textContent).join('');
    const critCard = Array.from(document.querySelectorAll('.ui-card'))
      .find((c) => c.querySelector('h3') && c.querySelector('h3').textContent.indexOf('关键路径') >= 0);
    const critStart = critCard ? critCard.querySelector('tbody tr td:nth-child(3)').textContent : '';
    return { totalDays: m ? +m[1] : 0, hasTarget: milestones.indexOf('2027-06-30') >= 0, critStart };
  });
  record('4.2 输入目标竣工日 2027-06-30 倒排生效（末项完成日=目标日，整体平移）',
    after.hasTarget && after.critStart !== before.critStart && after.totalDays > 0,
    '关键路径首项开工 ' + before.critStart + '→' + after.critStart + '，倒排天数=' + after.totalDays);
  const schedShot = await page.screenshot({ fullPage: true });

  // 5. 估算页：合计=分项和 + 两页纸预览 + 导出文件名含日期
  await page.locator('.app-side .app-nav__item', { hasText: '投资估算计算器' }).click();
  await page.waitForTimeout(700);
  await page.locator('.view-estimate input[name="projectName"]').fill('验证学校D');
  await page.locator('.view-estimate input[name="gcfy"]').fill('20000');
  await page.locator('.view-estimate .ui-btn', { hasText: '计算' }).click();
  await page.waitForTimeout(500);
  const est = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ui-card'));
    function card(title) {
      return cards.find((c) => c.querySelector('h3') && c.querySelector('h3').textContent.indexOf(title) >= 0);
    }
    const p1 = card('第一页'), p2 = card('第二页'), sum = card('估算汇总');
    function nums(root, colIdx) {
      return Array.from(root.querySelectorAll('tbody tr')).map((tr) =>
        +tr.children[colIdx].textContent.replace(/,/g, '')).filter((n) => !isNaN(n) && n > 0);
    }
    const p1sum = p1 ? nums(p1, 4).reduce((a, b) => a + b, 0) : 0; // 第 5 列=金额
    const p1foot = p1 ? +(p1.querySelector('tfoot td:nth-child(5)').textContent.replace(/,/g, '')) : 0;
    const p2foot = p2 ? +(p2.querySelector('tfoot td:last-child').textContent.replace(/,/g, '')) : 0;
    const sumTotal = sum ? (sum.textContent.match(/项目总投资([\d,]+)/) || [])[1] : '';
    return {
      has2pages: !!p1 && !!p2,
      p1rows: p1 ? p1.querySelectorAll('tbody tr').length : 0,
      p2rows: p2 ? p2.querySelectorAll('tbody tr').length : 0,
      p1sum, p1foot, p2foot,
      sumTotal: sumTotal || '',
      page2Title: p2 ? p2.querySelector('h3').textContent : '',
    };
  });
  record('5.1 两页纸预览出现（第一页明细 + 第二页构成）',
    est.has2pages && est.p1rows >= 5 && est.p2rows >= 4,
    'p1rows=' + est.p1rows + ' p2rows=' + est.p2rows);
  record('5.2 合计 = 分项之和（第一页其他费合计）',
    est.p1sum > 0 && Math.abs(est.p1sum - est.p1foot) < 0.5,
    '分项和=' + est.p1sum + ' 合计=' + est.p1foot);
  record('5.3 第二页总投资 = 汇总卡项目总投资',
    est.p2foot > 0 && String(est.p2foot) === est.sumTotal.replace(/,/g, ''),
    'p2foot=' + est.p2foot + ' 汇总=' + est.sumTotal);

  const dlName = await (async () => {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.locator('.view-estimate .ui-btn', { hasText: '导出为 Word' }).click(),
    ]);
    return dl.suggestedFilename();
  })();
  record('5.4 导出 Word 文件名含日期（-YYYY-MM-DD.doc）',
    /^验证学校D-投资估算表-\d{4}-\d{2}-\d{2}\.doc$/.test(dlName), 'filename=' + dlName);
  // verify-9 = 进度页 + 估算页 纵向拼接
  const estShot = await page.screenshot({ fullPage: true });
  const compose = await ctx.newPage();
  await compose.setContent('<html><body style="margin:0">' +
    '<img style="display:block;width:100%" src="data:image/png;base64,' + schedShot.toString('base64') + '">' +
    '<img style="display:block;width:100%" src="data:image/png;base64,' + estShot.toString('base64') + '">' +
    '</body></html>');
  await compose.waitForTimeout(400);
  await compose.screenshot({ path: path.join(ROOT, 'docs/verify-9-进度与估算.png'), fullPage: true });
  await compose.close();

  // 6. 全程 JS 错误复查
  record('6 全流程无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段五核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

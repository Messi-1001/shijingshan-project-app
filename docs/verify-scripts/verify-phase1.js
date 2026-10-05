/* 阶段一浏览器实机自动核对脚本 */
const { chromium } = require('playwright-core');

const APP = 'http://127.0.0.1:8791/index.html';
const results = [];
function record(item, pass, detail) {
  results.push({ item, pass, detail: detail || '' });
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + item + (detail ? ' | ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (loc.includes('favicon') || m.text().indexOf('favicon') >= 0) return;
    if (/Failed to load resource/.test(m.text()) && /favicon/.test(loc)) return;
    jsErrors.push(m.text() + ' @ ' + loc);
  });

  await page.goto(APP);
  await page.waitForTimeout(800);

  // 1. 页面打开 + 无 JS 报错
  record('1.1 页面打开无JS报错', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 三栏布局
  const hasSide = await page.locator('.app-side').count();
  const hasTop = await page.locator('.app-top').count();
  const hasMain = await page.locator('.app-main').count();
  record('1.2 三栏布局(侧边/顶栏/主区)', hasSide === 1 && hasTop === 1 && hasMain === 1,
    'side=' + hasSide + ' top=' + hasTop + ' main=' + hasMain);

  // 3. 导航 4 组 11 项
  const groupCount = await page.locator('.app-side .nav-group, .app-side [class*="group"]').count();
  const navItems = await page.locator('.app-side li').count();
  record('1.3 左侧导航 4 组 11 项', navItems === 11, 'items=' + navItems + ' groups=' + groupCount);
  await page.screenshot({ path: 'docs/verify-1-首页.png', fullPage: true });

  // 4. 默认进入项目管理 + 空态
  const h1 = await page.locator('h1').first().textContent();
  const emptyText = await page.locator('.ui-empty, [class*="empty"]').first().textContent().catch(() => '');
  record('1.4 默认项目管理页+空态', h1.includes('项目管理') && emptyText.includes('还没有项目'),
    'h1=' + h1 + ' empty=' + emptyText.trim().slice(0, 20));

  // 5. hash 跟随导航
  await page.locator('.app-side li', { hasText: '模板库' }).click();
  await page.waitForTimeout(300);
  const hash1 = await page.evaluate(() => location.hash);
  await page.locator('.app-side li', { hasText: '项目管理' }).click();
  await page.waitForTimeout(300);
  record('1.5 导航点击 hash 变化', hash1.length > 0, 'hash=' + hash1);

  // 6. 新建项目：空表单校验
  await page.getByRole('button', { name: /新建项目/ }).click();
  await page.waitForTimeout(300);
  const modalVisible = await page.locator('.ui-modal').count();
  // 直接点保存（确认按钮）
  await page.locator('.ui-modal__foot button', { hasText: /保存|确定/ }).click();
  await page.waitForTimeout(300);
  const errBanner = await page.locator('.form-errors').textContent().catch(() => '');
  const modalStill = await page.locator('.ui-modal').count();
  record('3.1 空表单校验:黄条提示+弹窗不关', modalVisible === 1 && errBanner.includes('项目名称') && modalStill === 1,
    'banner=' + errBanner.trim().slice(0, 30));

  // 7. 填必填项保存
  await page.locator('.ui-modal input[name="name"]').fill('测试学校A');
  await page.locator('.ui-modal input[name="unit"]').fill('某代建单位');
  await page.locator('.ui-modal__foot button', { hasText: /保存|确定/ }).click();
  await page.waitForTimeout(500);
  const rowText = await page.locator('.ui-table tbody tr').first().textContent().catch(() => '');
  record('3.2 建项目成功:表格出现一行', rowText.includes('测试学校A') && rowText.includes('某代建单位'),
    'row=' + rowText.trim().slice(0, 40));
  await page.screenshot({ path: 'docs/verify-2-建项目.png', fullPage: true });

  // 8. storeInfo
  const storeInfo = await page.evaluate(() => JSON.stringify(window.SJSQ && window.SJSQ.app && window.SJSQ.app.storeInfo));
  record('2.1 storeInfo={kind:idb,degraded:false}', storeInfo && storeInfo.indexOf('idb') >= 0 && storeInfo.indexOf('"degraded":false') >= 0, storeInfo);

  // 9. F5 刷新数据仍在
  await page.reload();
  await page.waitForTimeout(800);
  const rowAfter = await page.locator('.ui-table tbody tr').first().textContent().catch(() => '');
  record('3.3 刷新后数据仍在(IndexedDB)', rowAfter.includes('测试学校A'), 'row=' + rowAfter.trim().slice(0, 30));

  // 10. 编辑
  await page.locator('.ui-table tbody tr').first().locator('button', { hasText: '编辑' }).click();
  await page.waitForTimeout(300);
  await page.locator('.ui-modal input[name="name"]').fill('测试学校A-改');
  await page.locator('.ui-modal__foot button', { hasText: /保存|确定/ }).click();
  await page.waitForTimeout(500);
  const rowEdit = await page.locator('.ui-table tbody tr').first().textContent().catch(() => '');
  record('3.4 编辑保存生效', rowEdit.includes('测试学校A-改'), 'row=' + rowEdit.trim().slice(0, 30));

  // 11. 组件抽查
  const comp = await page.evaluate(() => {
    var u = SJSQ.views.ui, d = SJSQ.core.dom, main = document.querySelector('.app-main');
    main.appendChild(u.card('测试卡', u.tag('已办结', 'done')));
    main.appendChild(u.ring(62, '已完成'));
    main.appendChild(u.timelineBar([{ name: '公告', duration: 20 }, { name: '开标', duration: 1 }, { name: '评标', duration: 3 }]));
    var opened = false;
    u.modal({ title: '弹窗测试', body: d.h('p', { text: '内容' }), onConfirm: function () { opened = true; } }).open();
    var dlg = document.querySelector('.ui-modal__dialog');
    var btns = dlg ? dlg.querySelectorAll('.ui-modal__foot button') : [];
    if (btns.length) btns[btns.length - 1].click();
    return {
      card: !!main.querySelector('.ui-card, [class*="card"]'),
      ring: main.innerHTML.indexOf('svg') >= 0 && main.textContent.indexOf('62') >= 0,
      tl: main.textContent.indexOf('公告') >= 0 && main.textContent.indexOf('评标') >= 0,
      modalConfirm: opened
    };
  });
  record('4.1 组件:卡片/进度环62%/时间轴/弹窗回调', comp.card && comp.ring && comp.tl && comp.modalConfirm, JSON.stringify(comp));

  // 12. 打印样式：@media print 隐藏导航（用 emulate media 检查计算样式）
  const printHidden = await page.evaluate(() => {
    var side = document.querySelector('.app-side');
    var st = document.createElement('style');
    st.textContent = '@media print { .app-side, .app-top { display: none !important; } }';
    return !!side; // 实际 print 检查在下面用 page.emulateMedia
  });
  await page.emulateMedia({ media: 'print' });
  const sideDisplay = await page.evaluate(() => getComputedStyle(document.querySelector('.app-side')).display);
  await page.emulateMedia({ media: 'screen' });
  record('1.6 打印下导航隐藏(G11)', sideDisplay === 'none', 'display=' + sideDisplay);

  // 13. 删除（确认弹窗）
  await page.locator('.ui-table tbody tr').first().locator('button', { hasText: '删除' }).click();
  await page.waitForTimeout(300);
  await page.locator('.ui-modal__foot button', { hasText: /删除|确定/ }).last().click();
  await page.waitForTimeout(500);
  const emptyAfter = await page.locator('.app-main').textContent();
  record('3.5 删除项目生效', emptyAfter.indexOf('测试学校A-改') < 0 && emptyAfter.indexOf('还没有项目') >= 0, '');

  // 14. 全程 JS 错误复查
  record('5.1 全流程无JS报错', jsErrors.length === 0, jsErrors.join('; '));

  await browser.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

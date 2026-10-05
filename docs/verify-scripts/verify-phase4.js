/* 阶段四浏览器实机自动核对脚本（playwright-core + msedge，内嵌静态服务器 :8794） */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const PORT = 8794;
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
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:' + PORT });
  const page = await ctx.newPage();
  const jsErrors = [];
  const dialogs = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = (m.location() && m.location().url) || '';
    if (loc.includes('favicon') || m.text().indexOf('favicon') >= 0) return;
    jsErrors.push(m.text() + ' @ ' + loc);
  });
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept().catch(() => {}); });

  // 1. 打开页面，控制台无 JS 错误
  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForTimeout(800);
  record('1 页面打开无 JS 错误（忽略 favicon）', jsErrors.length === 0, jsErrors.join('; '));

  // 2. 建项目「验证学校C」
  await page.locator('.app-side .app-nav__item', { hasText: '项目管理' }).click();
  await page.waitForTimeout(400);
  await page.locator('.page__actions .ui-btn', { hasText: '新建项目' }).click();
  await page.locator('.ui-modal input[name="name"]').fill('验证学校C');
  await page.locator('.ui-modal input[name="unit"]').fill('集成验收建设单位');
  await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '保存' }).click();
  await page.waitForTimeout(500);
  const projRow = await page.locator('.app-main tbody tr', { hasText: '验证学校C' }).count();
  record('2.1 项目「验证学校C」已创建', projRow >= 1, 'rows=' + projRow);

  // 3. 详情页：yd-3 ⑥ 关联模板块存在（该手续数据未挂接模板 → 空态提示正常）
  await page.evaluate(() => { location.hash = '#/detail/yd-3'; });
  await page.waitForTimeout(500);
  const ydHash = await page.evaluate(() => location.hash);
  const ydText = await page.locator('.app-main').textContent();
  record('3.1 #/detail/yd-3 打开且 ⑥ 关联模板块存在',
    /^#\/detail\/yd-3$/.test(ydHash) && ydText.indexOf('⑥ 关联模板') >= 0, 'hash=' + ydHash);
  record('3.2 yd-3 无挂接模板时显示空态提示（数据如此，不编造）',
    ydText.indexOf('本项暂无关联模板') >= 0, '');

  // 3.3 jg-1（档案验收）⑥ 出现模板卡片：可复用/参考标签 + 扫描件置灰提示
  await page.evaluate(() => { location.hash = '#/detail/jg-1'; });
  await page.waitForTimeout(500);
  const jg = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ui-card'));
    const card = cards.find((c) => c.querySelector('h3') && c.querySelector('h3').textContent.indexOf('⑥ 关联模板') >= 0);
    if (!card) return { found: false };
    const rows = Array.from(card.querySelectorAll('tbody tr'));
    const tags = Array.from(card.querySelectorAll('.ui-tag')).map((t) => t.textContent);
    const copyBtns = Array.from(card.querySelectorAll('button')).filter((b) => b.textContent.indexOf('复制待填字段') >= 0);
    return {
      found: true, rowCount: rows.length, tags: tags,
      disabledCopy: copyBtns.filter((b) => b.disabled).length,
      enabledCopy: copyBtns.filter((b) => !b.disabled).length
    };
  });
  record('3.3 jg-1 详情 ⑥ 出现模板卡片（≥2 行）', jg.found && jg.rowCount >= 2,
    jg.found ? 'rows=' + jg.rowCount : '未找到卡片');
  record('3.4 模板卡片含「可复用」与「参考」两类标签',
    jg.found && jg.tags.indexOf('可复用') >= 0 && jg.tags.indexOf('参考') >= 0,
    jg.found ? 'tags=' + jg.tags.join('/') : '');
  record('3.5 扫描件行「复制待填字段」置灰且可复用行可用',
    jg.found && jg.disabledCopy >= 1 && jg.enabledCopy >= 1,
    jg.found ? 'disabled=' + jg.disabledCopy + ' enabled=' + jg.enabledCopy : '');

  // 4. 模板库页：35 条存量、5 组分类
  await page.locator('.app-side .app-nav__item', { hasText: '模板库' }).click();
  await page.waitForTimeout(600);
  const tplCount = () => page.evaluate(() => {
    let n = 0, groups = 0;
    document.querySelectorAll('.ui-section').forEach((sec) => {
      const h2 = sec.querySelector('h2');
      if (!h2) return;
      if (['土地手续', '规划手续', '发改委手续', '各类评价', '联合验收', '招标与合同', '施工许可', '其他']
        .some((nm) => h2.textContent.indexOf(nm) >= 0)) {
        groups += 1;
        n += sec.querySelectorAll('tbody tr').length;
      }
    });
    return { rows: n, groups: groups };
  });
  let c = await tplCount();
  record('4.1 存量模板 35 条（全新 profile 无自定义）', c.rows === 35, 'rows=' + c.rows);
  record('4.2 存量分类 5 组（其余 3 组待自定义补齐）', c.groups === 5, 'groups=' + c.groups);

  // 4.3 模糊搜索「请示」有结果
  await page.locator('.lib-search').fill('请示');
  await page.waitForTimeout(500);
  const cSearch = await tplCount();
  const searchText = await page.locator('.app-main').textContent();
  record('4.3 模糊搜索「请示」有结果', cSearch.rows > 0 && cSearch.rows < 35,
    'rows=' + cSearch.rows);
  record('4.4 命中「土地的请示函模板」', searchText.indexOf('土地的请示函模板') >= 0, '');
  await page.locator('.lib-search').fill('');
  await page.waitForTimeout(500);

  // 4.5 点「复制内容」→ alert 弹出 + 剪贴板文本含项目名称占位与下划线
  //     （spec 3.5 的「填入项目信息」在本期实现为「复制待填字段」清单：{{项目名称}}：＿＿＿＿）
  await page.locator('.app-main tbody tr', { hasText: '土地的请示函模板' })
    .locator('.ui-btn', { hasText: '复制内容' }).first().click();
  await page.waitForTimeout(600);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const alertOk = dialogs.some((d) => d.indexOf('已复制到剪贴板') >= 0);
  record('4.5 复制触发 alert 提示', alertOk, 'dialogs=' + JSON.stringify(dialogs));
  record('4.6 复制文本含「{{项目名称}}」占位与「＿＿＿＿」下划线',
    clip.indexOf('{{项目名称}}') >= 0 && clip.indexOf('＿＿＿＿') >= 0,
    'len=' + clip.length);

  // 5. 材料清单页
  await page.locator('.app-side .app-nav__item', { hasText: '材料清单' }).click();
  await page.waitForTimeout(600);
  const matInfo = await page.evaluate(() => {
    const strongs = Array.from(document.querySelectorAll('.cl-stats strong')).map((s) => s.textContent);
    const flatRows = (() => {
      let n = 0;
      document.querySelectorAll('.ui-section').forEach((sec) => {
        const h2 = sec.querySelector('h2');
        if (h2 && h2.textContent.indexOf('全部材料') >= 0) n += sec.querySelectorAll('tbody tr').length;
      });
      return n;
    })();
    const warn = document.querySelector('.cl-dropped');
    return {
      strongs: strongs, flatRows: flatRows,
      warnPresent: !!warn, warnText: warn ? warn.querySelector('summary').textContent : ''
    };
  });
  record('5.1 概览：材料条目>60 且合并后<条目', +matInfo.strongs[0] > 60 && +matInfo.strongs[1] < +matInfo.strongs[0],
    'strongs=' + matInfo.strongs.join(','));
  record('5.2 汇总行数 > 0（同名合并后）', matInfo.flatRows > 0, 'rows=' + matInfo.flatRows);
  record('5.3 警告区状态正常（有缺项则显示可展开警告条）',
    !matInfo.warnPresent || matInfo.warnText.indexOf('⚠') >= 0,
    matInfo.warnPresent ? 'warn=' + matInfo.warnText : '全部材料信息齐全，无警告（0 处）');
  await page.locator('.page__actions .ui-btn', { hasText: '按提供方分组' }).click();
  await page.waitForTimeout(500);
  const grp = await page.evaluate(() => {
    const provs = ['建设单位', '区发改委', '评价机构', '一级开发单位', '未标注提供方'];
    const secs = [];
    document.querySelectorAll('.ui-section').forEach((sec) => {
      const h2 = sec.querySelector('h2');
      if (!h2) return;
      if (provs.some((p) => h2.textContent.indexOf(p) >= 0)) {
        secs.push({ title: h2.textContent, rows: sec.querySelectorAll('tbody tr').length });
      }
    });
    return secs;
  });
  record('5.4 按提供方分组出现（≥4 组且每组非空）',
    grp.length >= 4 && grp.every((g) => g.rows > 0),
    grp.map((g) => g.title).join(' | '));
  await page.screenshot({ path: path.join(ROOT, 'docs/verify-7-材料清单.png'), fullPage: true });

  // 6. 自定义模板：新增 3 条（补齐 招标与合同 / 施工许可 / 其他 三组）
  async function addCustom(fileName, category, type, editable) {
    await page.locator('.page__actions .ui-btn', { hasText: '新增模板' }).click();
    await page.waitForTimeout(300);
    await page.locator('.ui-modal input[name="fileName"]').fill(fileName);
    await page.locator('.ui-modal select[name="category"]').selectOption(category);
    await page.locator('.ui-modal select[name="type"]').selectOption(type);
    await page.locator('.ui-modal select[name="editable"]').selectOption(editable);
    await page.locator('.ui-modal .ui-modal__foot .ui-btn', { hasText: '保存' }).click();
    await page.waitForTimeout(1200); // onConfirm 保存后 onDone 触发 location.reload()
  }
  await page.locator('.app-side .app-nav__item', { hasText: '模板库' }).click();
  await page.waitForTimeout(500);
  await addCustom('施工招标文件（空白）.pdf', '招标与合同', '可复用', 'true');
  await addCustom('施工许可申请表（自制）.pdf', '施工许可', '可复用', 'true');
  await addCustom('内部会议纪要.docx', '其他', '参考', 'true');

  const c2 = await tplCount();
  const tplText = await page.locator('.app-main').textContent();
  record('6.1 自定义模板 3 条入库（存量 35 + 自定义 3 = 38 行）', c2.rows === 38, 'rows=' + c2.rows);
  record('6.2 分类 8 组全部出现', c2.groups === 8, 'groups=' + c2.groups);
  record('6.3 描述文案出现「自定义模板 3 个」', tplText.indexOf('自定义模板 3 个') >= 0, '');
  const customBtn = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tbody tr'));
    const tr = trs.find((r) => r.textContent.indexOf('施工招标文件（空白）.pdf') >= 0);
    if (!tr) return null;
    const btn = Array.from(tr.querySelectorAll('button')).find((b) => b.textContent.indexOf('打开文件') >= 0);
    if (!btn) return null;
    return { disabled: btn.disabled, title: btn.title };
  });
  record('6.4 自定义模板「打开文件」按钮置灰并带提示',
    !!customBtn && customBtn.disabled === true && customBtn.title.indexOf('自定义模板仅可复制/导出') >= 0,
    customBtn ? 'disabled=' + customBtn.disabled + ' title=' + customBtn.title : '未找到按钮');
  await page.screenshot({ path: path.join(ROOT, 'docs/verify-6-模板库.png'), fullPage: true });

  // 7. 全程 JS 错误复查
  record('7 全流程无 JS 错误', jsErrors.length === 0, jsErrors.join('; '));

  await browser.close();
  srv.close();
  const fails = results.filter((r) => !r.pass).length;
  console.log('==== 阶段四核对完成: ' + (results.length - fails) + '/' + results.length + ' 通过 ====');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });

/* verify-tplfix.js —— 验证模板「打开文件」路径修复（2026-10-05 文件迁移后）
 * 服务器根 = 2毕业设计/（与 file:// 下 index.html 的 ../ 跳级语义对齐） */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const APP = 'D:/4workbuddy工作空间/2毕业设计/3代码实施';
const ROOT = 'D:/4workbuddy工作空间/2毕业设计'; // 服务器根 = 仓库上一级，../ 可跳出 3代码实施
const PORT = 8793;
const results = [];
function check(name, ok, extra) {
  results.push({ name, ok });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) jsErrors.push(m.text()); });

  await page.goto('http://127.0.0.1:' + PORT + '/3%E4%BB%A3%E7%A0%81%E5%AE%9E%E6%96%BD/index.html', { waitUntil: 'networkidle' });
  check('页面打开无 JS 错误', jsErrors.length === 0, jsErrors.join('; ').slice(0, 200));

  await page.goto('http://127.0.0.1:' + PORT + '/3%E4%BB%A3%E7%A0%81%E5%AE%9E%E6%96%BD/index.html#/templates', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.trim() === '打开文件' && !b.disabled);
    if (!btns.length) return false;
    btns[0].click();
    return true;
  });
  check('存在可点击的「打开文件」按钮', clicked);
  const popup = await popupPromise;
  check('点击后弹出新窗口', !!popup, popup ? '' : '未捕获 popup');
  if (popup) {
    const u = new URL(popup.url());
    const fsPath = path.join(ROOT, decodeURIComponent(u.pathname));
    const exists = fs.existsSync(fsPath);
    check('弹出 URL 指向真实存在的文件', exists, fsPath);
    await popup.close();
  }

  await browser.close();
  server.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log('---');
  console.log(results.length + '/' + results.length + ' 项，失败 ' + fails);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });

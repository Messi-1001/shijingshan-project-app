/* tests/budget.test.js —— 体积预算护栏（Task 66）
 * 只统计交付目录：js/ css/ assets/ vendor/ index.html（tests/、docs/、scripts/、build/ 不随 file:// 交付，不计入）。
 * 预算依据 spec/brief：JS≤700KB、单 JS≤160KB、CSS≤90KB、index.html≤40KB、代码合计≤900KB、
 * 效果图≤1.5MB、资源总计≤4.5MB。超预算时的处理纪律：删冗余，不加工具（见 brief Step 4）。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = path.join(__dirname, '..');
const KB = 1024;

function walk(dir, acc) {
  acc = acc || [];
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  });
  return acc;
}

function sumBytes(files) {
  return files.reduce(function (s, f) { return s + fs.statSync(f).size; }, 0);
}

const DELIVERED = ['js', 'css', 'assets', 'vendor']
  .map(function (d) { return walk(path.join(APP, d)); })
  .reduce(function (a, b) { return a.concat(b); }, []);
DELIVERED.push(path.join(APP, 'index.html'));

const JS_FILES = DELIVERED.filter(function (f) { return f.endsWith('.js'); });
const CSS_FILES = DELIVERED.filter(function (f) { return f.endsWith('.css'); });

test('全部 JS 体积在预算内（≤ 700KB）', () => {
  const n = sumBytes(JS_FILES);
  assert.ok(n <= 700 * KB, 'JS 合计 ' + (n / KB).toFixed(1) + ' KB，超预算');
});

test('单个 JS 文件 ≤ 160KB', () => {
  JS_FILES.forEach(function (f) {
    const n = fs.statSync(f).size;
    assert.ok(n <= 160 * KB, path.relative(APP, f) + ' 为 ' + (n / KB).toFixed(1) + ' KB，超预算');
  });
});

test('全部 CSS ≤ 90KB', () => {
  const n = sumBytes(CSS_FILES);
  assert.ok(n <= 90 * KB, 'CSS 合计 ' + (n / KB).toFixed(1) + ' KB，超预算');
});

test('index.html ≤ 40KB', () => {
  const f = path.join(APP, 'index.html');
  assert.ok(fs.existsSync(f), 'index.html 不存在');
  const n = fs.statSync(f).size;
  assert.ok(n <= 40 * KB, 'index.html 为 ' + (n / KB).toFixed(1) + ' KB，超预算');
});

test('代码合计 ≤ 900KB（js + css + index.html）', () => {
  const n = sumBytes(JS_FILES) + sumBytes(CSS_FILES) + fs.statSync(path.join(APP, 'index.html')).size;
  assert.ok(n <= 900 * KB, '代码合计 ' + (n / KB).toFixed(1) + ' KB，超预算');
});

test('效果图各 ≤ 1.5MB（超了就等比缩尺寸，不改格式）', () => {
  ['scheme-a.jpg', 'scheme-b.jpg'].forEach(function (n) {
    const f = path.join(APP, 'assets', n);
    if (!fs.existsSync(f)) return; // 图尚未生成时允许缺失
    const b = fs.statSync(f).size;
    assert.ok(b <= 1.5 * 1024 * KB, n + ' 为 ' + (b / KB / 1024).toFixed(2) + ' MB，超预算');
  });
});

test('资源总计（含图，交付目录全量）≤ 4.5MB', () => {
  const n = sumBytes(DELIVERED);
  assert.ok(n <= 4.5 * 1024 * KB, '资源总计 ' + (n / KB / 1024).toFixed(2) + ' MB，超预算');
});

test('index.html 引用的每个本地资源都存在（file:// 缺文件即白屏）', () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const refs = [];
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^(https?:)?\/\//.test(u) || u.startsWith('data:') || u.startsWith('#')) continue;
    refs.push(u);
  }
  assert.ok(refs.length > 5, '引用数过少，正则可能失效');
  refs.forEach(function (u) {
    assert.ok(fs.existsSync(path.join(APP, u)), '引用了不存在的文件：' + u);
  });
});

test('没有任何 CDN 外链（G2 file:// 纪律，也是"断网可用"的验收证据）', () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  assert.ok(!/https?:\/\/[^"']*\.(js|css)/.test(html), 'index.html 含外部 JS/CSS 链接');
});

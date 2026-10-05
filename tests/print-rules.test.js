/* tests/print-rules.test.js —— A4 打印规则审计（Task 65）
   定位：回归护栏，不是功能测试。后续改动 print.css 若删掉关键打印规则，这里立刻变红。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '..', 'css', 'print.css');
const css = fs.readFileSync(cssPath, 'utf8');

test('print.css 存在且非空', () => {
  assert.ok(css.length > 200, 'print.css 内容过少，可能没写');
});

test('声明了 A4 纵向与页边距', () => {
  assert.match(css, /@page\s*\{[^}]*size\s*:\s*A4/);
  assert.match(css, /@page\s*\{[^}]*margin\s*:/);
});

test('跨页表头重复', () => {
  assert.match(css, /thead\s*\{[^}]*display\s*:\s*table-header-group/);
});

test('合计行跟随表尾', () => {
  assert.match(css, /tfoot\s*\{[^}]*display\s*:\s*table-footer-group/);
});

test('行与卡片不被截断', () => {
  assert.match(css, /break-inside\s*:\s*avoid/);
});

test('隐藏交互元素（导航/按钮/搜索/Tab）', () => {
  ['nav', 'button', 'shell-search', 'tabs'].forEach((sel) => {
    assert.ok(css.includes(sel), 'print.css 未处理 ' + sel);
  });
});

test('打印字号与表格边框已设定', () => {
  assert.match(css, /font-size\s*:\s*10\.5pt/);
  assert.match(css, /border\s*:\s*1px\s+solid/);
});

test('图形容器（甘特/效果图/流程图）整块不跨页', () => {
  ['.gantt', '.scheme-figure', '.flow-figure'].forEach((sel) => {
    assert.ok(css.includes(sel), 'print.css 未处理图形容器 ' + sel);
  });
});

test('携带数据的表单控件不被隐藏（清单备注/状态随打印稿保留）', () => {
  // 提取所有 display:none !important 规则的选择器组，禁止出现裸 input/select
  const hideBlocks = css.match(/[^{}]+\{[^}]*display\s*:\s*none\s*!important[^}]*\}/g) || [];
  assert.ok(hideBlocks.length > 0, '应存在隐藏规则');
  hideBlocks.forEach((b) => {
    const sels = b.slice(0, b.indexOf('{'));
    assert.ok(!/(^|,)\s*input\s*(,|$)/.test(sels), '不得整体隐藏 input（清单备注会消失）: ' + sels.trim());
    assert.ok(!/(^|,)\s*select\s*(,|$)/.test(sels), '不得整体隐藏 select（清单状态会消失）: ' + sels.trim());
  });
  assert.match(css, /input\[type="file"\]/, '文件选择框应隐藏');
});

test('index.html 已引入 print.css', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /css\/print\.css/);
});

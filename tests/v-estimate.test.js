/* tests/v-estimate.test.js —— 投资估算页：纯函数部分（defaultInput / buildRows）+ ui.table foot */
const test = require('node:test');
const assert = require('node:assert/strict');

// DOM 桩：dom.h 需要 createElement / createTextNode；元素需支持属性赋值与 appendChild
function makeEl() {
  return {
    style: {}, dataset: {}, children: [], className: '', textContent: '', innerHTML: '',
    classList: { add() {} },
    appendChild(c) { this.children.push(c); },
    removeChild() {}, insertBefore() {},
    setAttribute() {}, addEventListener() {},
  };
}
global.document = {
  createElement: () => makeEl(),
  createTextNode: (t) => ({ text: String(t) }),
};
global.window = global;

// dom.js 在 CommonJS 下只导出、不挂命名空间，手动挂给 ui.js 的 D() 用
global.SJSQ = global.SJSQ || {};
global.SJSQ.core = global.SJSQ.core || {};
global.SJSQ.core.dom = require('../js/core/dom.js');
const ui = require('../js/views/ui.js');
const ve = require('../js/views/v-estimate.js');

test('defaultInput 默认工程费用为正数', () => {
  const d = ve.defaultInput();
  assert.ok(d.工程费用 > 0);
});

test('buildRows 含两页与合计行', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  assert.ok(r.page1.rows.length > 0);
  assert.equal(r.page1.total.length, 2); // ["其他费合计", 金额]
  assert.equal(r.page2.rows.length, 4); // 3 行构成 + 基本预备费（合计走 tfoot）
  assert.ok(r.page2.total[1] > 0);
});

test('合计行金额与内核一致', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  assert.equal(r.page1.total[1], r.summary.其他费合计);
  assert.equal(r.summary.projectTotal, r.page2.total[1]);
});

test('page2 末行是基本预备费，费率与内核一致', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  const last = r.page2.rows[r.page2.rows.length - 1];
  assert.equal(last[1], '基本预备费');
  assert.equal(last[2], (require('../js/logic/estimate.js').RESERVE_RATE * 100).toFixed(0) + '%');
});

test('金额列千分位格式化', () => {
  const r = ve.buildRows({ 工程费用: 20000 });
  const amountCell = r.page2.rows[0][3]; // 建筑工程费 60% = 12000 万，必带千分位
  assert.ok(/,/.test(String(amountCell)), '千位以上应带千分位逗号: ' + amountCell);
  assert.ok(!/[.]/.test(String(amountCell)), '金额不应带小数');
});

test('ui.table 支持 opts.foot 渲染 tfoot', () => {
  const el = ui.table(['A', 'B'], [['1', '2']], { foot: [['', '合计', '9']] });
  // 桩元素无 tagName：递归收集整棵子树，foot 合计行文本应被渲染进来
  // （文本节点是 { text } 形态，元素节点是 { textContent } 形态，两者都取）
  function collect(node, out) {
    (node.children || []).forEach(function (c) { out.push(c); collect(c, out); });
    return out;
  }
  const texts = collect(el, []).map(function (n) { return n.textContent || n.text; }).filter(Boolean);
  assert.ok(texts.some(function (t) { return String(t).indexOf('合计') >= 0; }), 'tfoot 合计行应被渲染');
});

test('ui.table 无 foot 时不渲染多余行', () => {
  const el = ui.table(['A', 'B'], [['1', '2']]);
  function collect(node, out) {
    (node.children || []).forEach(function (c) { out.push(c); collect(c, out); });
    return out;
  }
  const texts = collect(el, []).map(function (n) { return n.textContent; }).filter(Boolean);
  assert.ok(!texts.some(function (t) { return String(t).indexOf('合计') >= 0; }));
});

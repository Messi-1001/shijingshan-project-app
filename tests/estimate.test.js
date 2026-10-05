/* tests/estimate.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../js/logic/estimate.js');

test('累进分档：2 亿工程费用的建设单位管理费 = 312 万', () => {
  assert.equal(e.calcBracketFee(20000, e.BRACKETS_MGMT), 312);
});

test('分档：1000 万以内全额 2%', () => {
  assert.equal(e.calcBracketFee(500, e.BRACKETS_MGMT), 10);
});

test('分档：1000 万整档', () => {
  assert.equal(e.calcBracketFee(1000, e.BRACKETS_MGMT), 20);
});

test('估算收敛且迭代次数有限', () => {
  const r = e.calcEstimate({ 工程费用: 20000 });
  assert.ok(r.iterations <= 20, '必须收敛');
  assert.ok(r.projectTotal > 20000);
  assert.ok(r.projectTotal < 26000);
});

test('项目总投资 = 工程费用 + 其他费 + 预备费', () => {
  const r = e.calcEstimate({ 工程费用: 20000 });
  const sum = 20000 + r.otherSubtotal + r.reserve;
  assert.ok(Math.abs(sum - r.projectTotal) < 0.5);
});

test('其他费明细含管理费与全部费率项', () => {
  const r = e.calcEstimate({ 工程费用: 20000 });
  assert.equal(r.items.length, 1 + e.RATE_ITEMS.length);
  assert.equal(r.items[0].ref, '财建〔2016〕504号');
  assert.ok(r.items.every((i) => typeof i.amount === 'number' && i.amount >= 0));
});

test('工程费用越大，总投资越大（单调）', () => {
  const a = e.calcEstimate({ 工程费用: 10000 }).projectTotal;
  const b = e.calcEstimate({ 工程费用: 30000 }).projectTotal;
  assert.ok(b > a);
});

test('第二页构成比例合计为 1', () => {
  const rows = e.buildCostBreakdown(20000);
  const sum = rows.reduce((s, r) => s + r.ratio, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(rows.reduce((s, r) => s + r.amount, 0), 20000);
});

test('buildTwopage 两页都有数据', () => {
  const r = e.calcEstimate({ 工程费用: 20000 });
  const tp = e.buildTwopage(r);
  assert.ok(tp.page1.length > 0);
  assert.equal(tp.page2.length, 3);
  assert.ok(tp.summary.projectTotal === r.projectTotal);
});

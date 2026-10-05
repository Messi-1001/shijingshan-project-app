/* tests/v-reasons.test.js —— 退回原因库页：纯函数（filterReasons / buildGroupedView / appliesLabel） */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {}, querySelector: () => ({ value: '' }) }) };
global.window = global;
const vr = require('../js/views/v-reasons.js');
const data = require('../js/data/reject-reasons.js');

test('filterReasons 按类目过滤', () => {
  const r = vr.filterReasons(data.REASONS, { category: '形式类' });
  assert.ok(r.length > 0);
  assert.ok(r.every((x) => x.category === '形式类'));
});

test('filterReasons 按手续过滤时保留通用项', () => {
  const r = vr.filterReasons(data.REASONS, { procedureId: 'lx-1' });
  assert.ok(r.some((x) => x.appliesTo === 'ALL'));
  assert.ok(r.some((x) => Array.isArray(x.appliesTo) && x.appliesTo.includes('lx-1')));
  assert.ok(!r.some((x) => Array.isArray(x.appliesTo) && x.appliesTo.includes('sg-1')));
});

test('filterReasons 不传条件时返回全部', () => {
  assert.equal(vr.filterReasons(data.REASONS, {}).length, data.REASONS.length);
});

test('buildGroupedView 按类目分组且顺序固定', () => {
  const g = vr.buildGroupedView(data.REASONS.filter((x) => x.appliesTo === 'ALL'));
  assert.ok(g.length > 0);
  const cats = g.map((x) => x.category);
  const order = data.CATEGORIES.filter((c) => cats.includes(c));
  assert.deepEqual(cats, order, '分组顺序应与 CATEGORIES 一致');
});

test('buildGroupedView 空输入返回空数组', () => {
  assert.deepEqual(vr.buildGroupedView([]), []);
});

test('appliesLabel 把 ALL 显示为"全部手续"', () => {
  assert.equal(vr.appliesLabel('ALL'), '全部手续');
  assert.equal(vr.appliesLabel(['lx-1', 'lx-2']), 'lx-1、lx-2');
});

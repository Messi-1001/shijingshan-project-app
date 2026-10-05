/* tests/reject-reasons.test.js —— 退回原因库数据：条目规模 / 字段完整 / 排序与筛选 / 校验 */
const test = require('node:test');
const assert = require('node:assert/strict');
const r = require('../js/data/reject-reasons.js');

test('条目数在 20–30 之间', () => {
  assert.ok(r.REASONS.length >= 20 && r.REASONS.length <= 30, '实际 ' + r.REASONS.length);
});

test('每条都有 reason 与 fix，且 fix 是动作描述', () => {
  r.REASONS.forEach((x) => {
    assert.ok(x.reason && x.reason.length >= 4, x.id);
    assert.ok(x.fix && x.fix.length >= 4, x.id + ' 缺 fix');
    assert.ok(CATEGORIES_INCLUDES(x.category), x.id + ' 类目非法: ' + x.category);
    assert.ok(['常见', '偶发'].includes(x.freq), x.id + ' freq 非法');
    // 接口契约：appliesTo 允许 'ALL'（字符串）或非空 id 数组
    assert.ok(x.appliesTo === 'ALL' || (Array.isArray(x.appliesTo) && x.appliesTo.length > 0), x.id + ' appliesTo 为空');
  });
  function CATEGORIES_INCLUDES(c) { return r.CATEGORIES.includes(c); }
});

test('id 唯一', () => {
  const ids = r.REASONS.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('reasonsFor 把通用原因排在前面', () => {
  const list = r.reasonsFor('lx-1');
  assert.ok(list.length > 0);
  assert.ok(list.some((x) => x.appliesTo === 'ALL'));
});

test('reasonsFor 未知手续返回通用原因', () => {
  const list = r.reasonsFor('不存在的id');
  assert.ok(list.every((x) => x.appliesTo === 'ALL'));
  assert.ok(list.length > 0);
});

test('highFrequencyFor 只返回常见项', () => {
  assert.ok(r.highFrequencyFor('lx-1').every((x) => x.freq === '常见'));
});

test('byCategory 四类齐全', () => {
  const g = r.byCategory();
  r.CATEGORIES.forEach((c) => assert.ok(Array.isArray(g[c])));
});

test('validateReasons 抓出未知手续与非法类目', () => {
  const bad = [{ id: 'x', category: '瞎写', appliesTo: ['不存在'], freq: '常见', reason: 'aaaa', fix: 'bbbb' }];
  const errs = r.validateReasons(bad, ['lx-1']);
  assert.ok(errs.length >= 2);
});

test('validateReasons 对真实数据返回空', () => {
  const known = ['lx-1', 'lx-2', 'lx-3', 'lx-4', 'yd-1', 'yd-2', 'yd-3', 'yd-4', 'gh-1', 'gh-2', 'gh-3', 'gh-4', 'gh-5', 'pj-1', 'pj-2', 'pj-3', 'zb-2', 'zb-3', 'zb-4', 'sg-1', 'jg-1', 'jg-2', 'jg-3', 'jg-4', 'jg-5', 'jg-6'];
  const errs = r.validateReasons(r.REASONS, known);
  assert.deepEqual(errs, []);
});

/* tests/util.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const u = require('../js/core/util.js');

test('pad2 补零', () => {
  assert.equal(u.pad2(3), '03');
  assert.equal(u.pad2(12), '12');
});

test('formatDate 默认格式与自定义格式', () => {
  const d = new Date(2026, 8, 25, 9, 5); // 2026-09-25 09:05
  assert.equal(u.formatDate(d), '2026-09-25');
  assert.equal(u.formatDate(d, 'YYYY-MM-DD HH:mm'), '2026-09-25 09:05');
  assert.equal(u.formatDate('not-a-date'), '');
});

test('formatMoney 千分位', () => {
  assert.equal(u.formatMoney(1234567), '1,234,567');
  assert.equal(u.formatMoney(0), '0');
  assert.equal(u.formatMoney('abc'), '');
});

test('parseNum 去逗号', () => {
  assert.equal(u.parseNum('1,234,567'), 1234567);
  assert.equal(Number.isNaN(u.parseNum('x')), true);
});

test('sortZh 返回新数组且按拼音序', () => {
  const src = ['乙', '甲', '丙'];
  const out = u.sortZh(src);
  assert.deepEqual(out, ['丙', '甲', '乙']); // bing < jia < yi
  assert.deepEqual(src, ['乙', '甲', '丙']);  // 原数组未被改动
});

test('sortZh 支持 key 取属性', () => {
  const out = u.sortZh([{ n: '乙' }, { n: '甲' }], 'n');
  assert.deepEqual(out.map((x) => x.n), ['甲', '乙']);
});

test('deepClone 深拷贝', () => {
  const a = { x: [1, { y: 2 }] };
  const b = u.deepClone(a);
  b.x[1].y = 99;
  assert.equal(a.x[1].y, 2);
});

test('uid 递增且带前缀', () => {
  const a = u.uid('p');
  const b = u.uid('p');
  assert.match(a, /^p-\d+$/);
  assert.notEqual(a, b);
});

test('groupBy 分组', () => {
  const g = u.groupBy([{ s: 'A', v: 1 }, { s: 'B', v: 2 }, { s: 'A', v: 3 }], 's');
  assert.deepEqual(Object.keys(g).sort(), ['A', 'B']);
  assert.equal(g.A.length, 2);
});

test('percent 计算', () => {
  assert.equal(u.percent(1, 4), 25);
  assert.equal(u.percent(0, 0), 0);
});

test('debounce 只在静默后执行一次', async () => {
  let n = 0;
  const f = u.debounce(() => { n += 1; }, 20);
  f(); f(); f();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(n, 1);
});

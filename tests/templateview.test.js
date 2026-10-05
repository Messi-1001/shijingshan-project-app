/* tests/templateview.test.js —— 模板库页面（Task 33） */
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../js/views/v-templates.js');
const t = require('../js/data/templates.js');

test('groupByCategory 按固定顺序输出 5 组', () => {
  t.build();
  const groups = v.groupByCategory(t.search(''));
  assert.deepEqual(groups.map((g) => g.category),
    ['土地手续', '规划手续', '发改委手续', '各类评价', '联合验收']);
});

test('每组条数正确', () => {
  t.build();
  const g = v.groupByCategory(t.search(''));
  assert.equal(g.find((x) => x.category === '联合验收').items.length, 19);
});

test('空输入返回空数组', () => {
  assert.deepEqual(v.groupByCategory([]), []);
});

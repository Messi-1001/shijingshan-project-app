/* tests/library.test.js —— v-library 纯辅助函数 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const lib = require('../js/views/v-library.js');

const lists = [
  H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
  H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
  H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
  H.req('js/data/procedures-07-jungong.js')
];

test('groupForDisplay 按板块顺序输出 7 组', () => {
  const all = lists.flat();
  const groups = lib.groupForDisplay(all);
  assert.equal(groups.length, 7);
  assert.deepEqual(groups.map((g) => g.section),
    ['lixiang', 'yongdi', 'guihua', 'pingjia', 'zhaobiao', 'shigong', 'jungong']);
});

test('groupForDisplay 每组带板块元信息与条数', () => {
  const groups = lib.groupForDisplay(lists.flat());
  const sg = groups.find((g) => g.section === 'shigong');
  assert.equal(sg.meta.no, '⑤');
  assert.equal(sg.meta.name, '施工许可');
  assert.equal(sg.items.length, 1);
  assert.equal(sg.empty, false);
});

test('groupForDisplay 空板块标记 empty 且仍出现在结果里', () => {
  const groups = lib.groupForDisplay([]);
  assert.equal(groups.length, 7);
  assert.ok(groups.every((g) => g.empty === true));
});

/* tests/custom-template.test.js —— 自定义模板（Task 38） */
const test = require('node:test');
const assert = require('node:assert/strict');
const ct = require('../js/views/v-templates-custom.js');

test('buildCustomTemplate 生成合法条目', () => {
  const t = ct.buildCustomTemplate({
    fileName: '招标文件（施工）.pdf', category: '招标与合同',
    type: '可复用', editable: true, procedureIds: ['zb-5']
  });
  assert.match(t.id, /^tpl-custom-/);
  assert.equal(t.custom, true);
  assert.equal(t.category, '招标与合同');
  assert.deepEqual(t.procedureIds, ['zb-5']);
});

test('buildCustomTemplate 非法分类归入"其他"', () => {
  const t = ct.buildCustomTemplate({ fileName: 'x.pdf', category: '不存在的分类' });
  assert.equal(t.category, '其他');
});

test('buildCustomTemplate 缺文件名时不生成', () => {
  assert.equal(ct.buildCustomTemplate({ fileName: '' }), null);
});

test('mergeCustom 追加在对应分类末尾', () => {
  const base = [{ id: 'a', category: '发改委手续', fileName: 'a.pdf' }];
  const merged = ct.mergeCustom(base, [{ id: 'b', category: '发改委手续', fileName: 'b.pdf' }]);
  assert.deepEqual(merged.map((x) => x.id), ['a', 'b']);
});

test('mergeCustom 不产生重复 id', () => {
  const base = [{ id: 'a', category: '发改委手续', fileName: 'a.pdf' }];
  const merged = ct.mergeCustom(base, [{ id: 'a', category: '发改委手续', fileName: '重复.pdf' }]);
  assert.equal(merged.length, 1);
});

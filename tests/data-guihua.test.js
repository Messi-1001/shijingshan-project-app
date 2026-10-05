/* tests/data-guihua.test.js —— ③ 规划报建 6 项数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const guihua = req('js/data/procedures-03-guihua.js');

test('③ 规划报建：共 6 条，编号 15–20', () => {
  assert.equal(guihua.length, 6);
  assert.deepEqual(guihua.map((p) => p.id), ['gh-1', 'gh-2', 'gh-3', 'gh-4', 'gh-5', 'gh-6']);
  assert.deepEqual(guihua.map((p) => p.no), [15, 16, 17, 18, 19, 20]);
  guihua.forEach((p) => assert.equal(p.section, 'guihua'));
});

test('③ 严格串联：gh-1→…→gh-6，且 gh-1 前置为 yd-3', () => {
  assert.deepEqual(guihua[0].prev, ['yd-3']);
  for (let i = 1; i < guihua.length; i++) {
    assert.deepEqual(guihua[i].prev, [guihua[i - 1].id], guihua[i].id + ' 必须紧跟 ' + guihua[i - 1].id);
  }
});

test('③ 顺序要点：勘察图纸备案（gh-4）在规证之后、消防审图之前', () => {
  const order = guihua.map((p) => p.name);
  assert.equal(order[2], '建设工程规划许可证（规证）');
  assert.equal(order[3], '勘察图纸备案');
  assert.equal(order[4], '消防审图（消防设计审查）');
  assert.ok(guihua[3].notes.includes('排在规证之后、消防审图之前'));
});

test('③ 关键形态字段', () => {
  assert.equal(guihua[0].platform, 'tzxm');
  assert.ok(guihua[0].templates.includes('tpl-duogui-tuisong'));
  assert.equal(guihua[2].platform, 'tzxm');
  assert.ok(guihua[4].templates.includes('tpl-xiaofang-shencha'));
  guihua.forEach((p) => p.materials.forEach((m) => assert.ok(m.name && m.copies >= 1)));
  guihua.forEach((p) => assert.ok(p.notes.length > 0));
});

test('③ 通过 schema.validateProcedureSet 契约（累计 ①–③ = 1–20）', () => {
  const all = req('js/data/procedures-01-lixiang.js')
    .concat(req('js/data/procedures-02-yongdi.js'))
    .concat(guihua);
  assert.deepEqual(schema.validateProcedureSet(all), []);
});

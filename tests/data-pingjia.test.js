/* tests/data-pingjia.test.js —— ④′ 各类评价 8 项数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const pingjia = req('js/data/procedures-04-pingjia.js');

test('④′ 评价：共 8 条 = 5 有效 + 3 预留，编号 21–28', () => {
  assert.equal(pingjia.length, 8);
  assert.deepEqual(pingjia.map((p) => p.id), ['pj-1', 'pj-2', 'pj-3', 'pj-4', 'pj-5', 'pj-6', 'pj-7', 'pj-8']);
  assert.deepEqual(pingjia.map((p) => p.no), [21, 22, 23, 24, 25, 26, 27, 28]);
  assert.equal(pingjia.filter((p) => p.reserved).length, 3);
  assert.deepEqual(pingjia.filter((p) => p.reserved).map((p) => p.id), ['pj-6', 'pj-7', 'pj-8']);
  pingjia.forEach((p) => assert.equal(p.section, 'pingjia'));
  pingjia.forEach((p) => assert.equal(p.source, p.reserved ? '预留' : '✅'));
});

test('④′ 常驻不过滤：无 conditions 字段，prev 为空、可并联', () => {
  pingjia.forEach((p) => {
    assert.equal('conditions' in p, false);
    assert.deepEqual(p.prev, []);
  });
  pingjia.forEach((p) => assert.equal(p.parallel, true));
});

test('④′ 每条 notes 写明真实触发条件（常驻策略补偿）', () => {
  pingjia.forEach((p) => {
    assert.ok(p.notes.length > 0);
    assert.ok(
      p.notes.includes('触发条件') || p.notes.includes('触发前提'),
      p.id + ' notes 必须写触发条件'
    );
  });
  assert.equal(pingjia[0].name, '交通影响评价（交评）');
  assert.deepEqual(pingjia[0].templates, ['tpl-jiaoping-baogao', 'tpl-jiaoping-shencha']);
  pingjia.filter((p) => p.reserved).forEach((p) => {
    assert.ok(p.notes.includes('预留项'));
    assert.deepEqual(p.materials, []);
  });
});

test('④′ 通过 schema.validateProcedureSet 契约（累计 ①–④′ = 1–28）', () => {
  const all = req('js/data/procedures-01-lixiang.js')
    .concat(req('js/data/procedures-02-yongdi.js'))
    .concat(req('js/data/procedures-03-guihua.js'))
    .concat(pingjia);
  assert.deepEqual(schema.validateProcedureSet(all), []);
});

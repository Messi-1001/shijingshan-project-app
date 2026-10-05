/* tests/data-zhaobiao.test.js —— ④ 招标与合同 5 项数据契约 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { req } = require('./_helpers.js');
const schema = req('js/data/schema.js');

const zhaobiao = req('js/data/procedures-05-zhaobiao.js');

test('④ 招标与合同：共 5 条，编号 29–33，全部 🆕', () => {
  assert.equal(zhaobiao.length, 5);
  assert.deepEqual(zhaobiao.map((p) => p.id), ['zb-1', 'zb-2', 'zb-3', 'zb-4', 'zb-5']);
  assert.deepEqual(zhaobiao.map((p) => p.no), [29, 30, 31, 32, 33]);
  zhaobiao.forEach((p) => {
    assert.equal(p.section, 'zhaobiao');
    assert.equal(p.source, '🆕');
  });
});

test('④ zb-1 提前勘察设计招标审查，前置 gh-1', () => {
  assert.equal(zhaobiao[0].name, '提前开展勘察设计招标方案审查');
  assert.deepEqual(zhaobiao[0].prev, ['gh-1']);
  assert.equal(zhaobiao[0].platform, 'fgw');
  assert.equal('tenderType' in zhaobiao[0], false);
});

test('④ 四轴 tenderType：设计/勘察/监理/施工，供时间轴使用', () => {
  assert.deepEqual(zhaobiao.slice(1).map((p) => p.tenderType), ['设计', '勘察', '监理', '施工']);
  [1, 2, 3].forEach((i) => {
    assert.equal(zhaobiao[i].parallel, true);
    assert.deepEqual(zhaobiao[i].prev, ['zb-1']);
  });
  assert.deepEqual(zhaobiao[4].prev, ['zb-1', 'gh-6']);
  assert.equal(zhaobiao[4].parallel, false);
});

test('④ 通过 schema.validateProcedureSet 契约（累计 ①–④ = 1–33）', () => {
  const all = req('js/data/procedures-01-lixiang.js')
    .concat(req('js/data/procedures-02-yongdi.js'))
    .concat(req('js/data/procedures-03-guihua.js'))
    .concat(req('js/data/procedures-04-pingjia.js'))
    .concat(zhaobiao);
  assert.deepEqual(schema.validateProcedureSet(all), []);
});

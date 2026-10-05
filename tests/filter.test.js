/* tests/filter.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const f = require('../js/logic/filter.js');
const c = require('../js/data/conditions.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];

test('matchCondition：不限恒真', () => {
  assert.equal(f.matchCondition(['不限'], '装修改造'), true);
});

test('matchCondition：仅新建只在新建时为真', () => {
  assert.equal(f.matchCondition(['仅新建'], '新建'), true);
  assert.equal(f.matchCondition(['仅新建'], '改扩建'), false);
});

test('matchCondition：枚举命中', () => {
  assert.equal(f.matchCondition(['新建', '改扩建'], '改扩建'), true);
  assert.equal(f.matchCondition(['新建', '改扩建'], '装修改造'), false);
});

test('本期固定取值下，40 项全部保留（锁死预期行为）', () => {
  const r = f.filterProcedures(LIST, c.FIXED_VALUES);
  assert.equal(r.kept.length, 40);
  assert.deepEqual(r.dropped, []);
});

test('改成装修改造后，划拨类与施工许可被裁掉', () => {
  const r = f.filterProcedures(LIST, Object.assign({}, c.FIXED_VALUES, { buildNature: '装修改造' }));
  const droppedIds = r.dropped.map((x) => x.id);
  assert.ok(droppedIds.includes('yd-7'), '国有土地划拨应被裁掉');
  assert.ok(droppedIds.includes('sg-1'), '施工许可应被裁掉');
  assert.ok(r.kept.length < 40);
});

test('被裁掉的项带出未命中的维度', () => {
  const r = f.filterProcedures(LIST, Object.assign({}, c.FIXED_VALUES, { buildNature: '装修改造' }));
  const sg = r.dropped.find((x) => x.id === 'sg-1');
  assert.deepEqual(sg.miss, ['建设性质']);
});

test('explainHit 给出命中说明', () => {
  const hits = f.explainHit('yd-7', c.FIXED_VALUES);
  assert.ok(hits.some((h) => h.dim === '建设性质' && h.value === '新建'));
});

test('safeFilter 在无裁剪时无告警', () => {
  const r = f.safeFilter(LIST, c.FIXED_VALUES);
  assert.equal(r.warning, '');
  assert.equal(r.kept.length, 40);
});

test('safeFilter 在有裁剪时给出告警文案', () => {
  const r = f.safeFilter(LIST, Object.assign({}, c.FIXED_VALUES, { buildNature: '装修改造' }));
  assert.ok(r.warning.includes('项'));
  assert.ok(r.warning.includes('原因'));
});

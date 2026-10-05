/* tests/safetynet.test.js —— 安全网三重防护之第三重（spec 5.5） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');
const vc = require('../js/views/v-checklist.js');
const c = require('../js/data/conditions.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];

test('本期固定取值下无裁剪、无未覆盖项', () => {
  const s = vc.buildSafetyNet(LIST, c.FIXED_VALUES);
  assert.equal(s.droppedCount, 0);
  assert.deepEqual(s.unhandled, []);
  assert.equal(s.warning, '');
});

test('装修改造时施工许可进入"本期未覆盖"而非静默隐藏', () => {
  const s = vc.buildSafetyNet(LIST, Object.assign({}, c.FIXED_VALUES, { buildNature: '装修改造' }));
  assert.ok(s.unhandled.some((u) => u.procedureId === 'sg-1'));
  assert.ok(s.unhandled.find((u) => u.procedureId === 'sg-1').reason.includes('城市更新'));
});

test('有裁剪时给出可展开的告警', () => {
  const s = vc.buildSafetyNet(LIST, Object.assign({}, c.FIXED_VALUES, { buildNature: '装修改造' }));
  assert.ok(s.droppedCount > 0);
  assert.ok(s.warning.includes(String(s.droppedCount)));
  assert.ok(s.dropped.every((d) => Array.isArray(d.miss) && d.miss.length));
});

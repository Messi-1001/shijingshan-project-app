/* tests/v-schedule.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = { createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, setAttribute() {} }) };
global.window = global;
const vs = require('../js/views/v-schedule.js');

const LIST = [
  { id: 'lx-1', no: '1', name: '项目建议书', duration: 5, prev: [] },
  { id: 'pj-1', no: '2', name: '立项批复', duration: 5, prev: ['lx-1'] },
  { id: 'jg-6', no: '3', name: '竣工验收备案', duration: 5, prev: ['pj-1'] },
];

test('defaultInput 给出正排模式与合理默认日期', () => {
  const d = vs.defaultInput();
  assert.equal(d.mode, 'forward');
  assert.match(d.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(d.targetEndDate > d.startDate);
});

test('buildView 正排：区间起点等于开工日期', () => {
  const v = vs.buildView({ list: LIST, byId: {} }, { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' });
  assert.equal(v.range.start, '2026-10-01');
  assert.equal(v.rows.length, 3);
});

test('buildView 倒排：区间终点等于目标竣工日期', () => {
  const v = vs.buildView({ list: LIST, byId: {} }, { mode: 'backward', startDate: '2026-10-01', targetEndDate: '2026-12-31' });
  assert.equal(v.range.end, '2026-12-31');
});

test('milestones 只挑已登记的关键节点', () => {
  const v = vs.buildView({ list: LIST, byId: {} }, { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' });
  assert.ok(v.milestones.every((m) => ['lx-1', 'pj-1', 'jg-6'].includes(m.id)));
});

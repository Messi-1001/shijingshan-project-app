/* tests/gantt.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
global.document = {}; // gantt.js 需可被 Node require（仅测纯函数）
const g = require('../js/views/gantt.js');

const ROWS = [
  { id: 'a', no: '1', name: 'A', est: '2026-10-01', eft: '2026-10-10' }, // 10 天
  { id: 'b', no: '2', name: 'B', est: '2026-10-11', eft: '2026-10-20' }, // 10 天
];
const RANGE = { start: '2026-10-01', end: '2026-10-20' }; // 20 天

test('首行从 0% 起步，宽度 50%', () => {
  const lay = g.ganttLayout(ROWS, RANGE);
  assert.equal(lay[0].left, 0);
  assert.equal(lay[0].width, 50);
});

test('第二行 left=50%', () => {
  const lay = g.ganttLayout(ROWS, RANGE);
  assert.equal(lay[1].left, 50);
  assert.equal(lay[1].width, 50);
});

test('宽度有下限 1.2%', () => {
  const tight = { start: '2026-01-01', end: '2026-12-31' };
  const lay = g.ganttLayout([{ id: 'x', no: '1', name: 'X', est: '2026-06-01', eft: '2026-06-01' }], tight);
  assert.equal(lay[0].width, 1.2);
});

test('toneOf 标关键路径', () => {
  assert.equal(g.toneOf({ critical: true }), 'critical');
  assert.equal(g.toneOf({}), 'normal');
});

test('monthTicks 按月分界给出刻度', () => {
  const ticks = g.monthTicks({ start: '2026-10-01', end: '2026-12-31' });
  assert.ok(ticks.length >= 3);
  assert.equal(ticks[0].left, 0);
});

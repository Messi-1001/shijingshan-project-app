/* tests/schedule.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../js/logic/schedule.js');

const FIX = [
  { id: 'a1', no: '1', name: 'A', duration: 3, prev: [] },
  { id: 'a2', no: '2', name: 'B', duration: 2, prev: ['a1'] },
  { id: 'a3', no: '3', name: 'C', duration: 5, prev: ['a1'] },
  { id: 'a4', no: '4', name: 'D', duration: 1, prev: ['a2', 'a3'] },
];

test('durationOf 取 duration 优先', () => {
  assert.equal(s.durationOf({ id: 'x', duration: 4 }), 4);
});

// durationOf 前缀缺省兜底
test('durationOf 无 duration 时按编号前缀取缺省', () => {
  assert.equal(s.durationOf({ id: 'yd-2' }), 7);
  assert.equal(s.durationOf({ id: 'sg-3' }), 10);
  assert.equal(s.durationOf({ id: 'zz-9' }), 10); // 未知前缀走 default
});

test('正排：est 紧随前置 eft', () => {
  const rows = s.forward(FIX, '2026-10-01');
  const m = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(m.a1.est, '2026-10-01');
  assert.equal(m.a1.eft, '2026-10-03');
  assert.equal(m.a2.est, '2026-10-04'); // a1 完 +1
  assert.equal(m.a2.eft, '2026-10-05');
  assert.equal(m.a3.est, '2026-10-04');
  assert.equal(m.a3.eft, '2026-10-08');
  assert.equal(m.a4.est, '2026-10-09'); // 等 a3（更晚的那个）
  assert.equal(m.a4.eft, '2026-10-09');
});

// parallel:true 的项不等待前置，按开始日期起算
test('正排：parallel 项忽略前置从 startDate 起算', () => {
  const rows = s.forward([
    { id: 'p1', no: '1', name: 'P', duration: 3, prev: [] },
    { id: 'p2', no: '2', name: 'Q', duration: 2, prev: ['p1'], parallel: true },
  ], '2026-10-01');
  const m = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(m.p2.est, '2026-10-01');
  assert.equal(m.p2.eft, '2026-10-02');
});

test('backward 算出总时差，关键路径时差为 0', () => {
  const fwd = s.forward(FIX, '2026-10-01');
  const bwd = s.backward(FIX, fwd[fwd.length - 1].eft);
  const m = Object.fromEntries(bwd.map((r) => [r.id, r]));
  assert.equal(m.a1.slack, 0); // a1→a3→a4 是关键链
  assert.equal(m.a3.slack, 0);
  // brief 原稿此处写 4，与其自身 forward 约定矛盾（LS 10-07 − ES 10-04 = 3），
  // 按正确 CPM 修正为 3：a1→a3→a4 共 9 天，a1→a2→a4 共 6 天，差 3。
  assert.equal(m.a2.slack, 3); // a2 有富余
});

test('关键路径链完整', () => {
  const cp = s.criticalPath(FIX, '2026-10-01');
  assert.deepEqual(cp.chain, ['a1', 'a3', 'a4']);
});

test('prev 指向未知 id 直接抛错', () => {
  assert.throws(() => s.forward([{ id: 'x', no: '1', name: 'X', duration: 1, prev: ['不存在'] }], '2026-10-01'), /未知前置/);
});

test('detectCycles 识别成环', () => {
  const cyc = [
    { id: 'x', no: '1', name: 'X', duration: 1, prev: ['y'] },
    { id: 'y', no: '2', name: 'Y', duration: 1, prev: ['x'] },
  ];
  assert.equal(s.detectCycles(cyc).length, 1);
  assert.equal(s.detectCycles(FIX).length, 0);
});

test('buildSchedule 正排/倒排两种模式给出同一区间的两端', () => {
  const f = s.buildSchedule(FIX, { mode: 'forward', startDate: '2026-10-01' });
  assert.equal(f.range.start, '2026-10-01');
  assert.equal(f.range.end, '2026-10-09');
  const b = s.buildSchedule(FIX, { mode: 'backward', targetEndDate: '2026-12-31' });
  assert.equal(b.range.end, '2026-12-31');
  assert.ok(b.range.start < '2026-12-31');
});

test('daysBetween 纯日期差', () => {
  assert.equal(s.daysBetween('2026-10-01', '2026-10-09'), 8);
  assert.equal(s.daysBetween('2026-10-01', '2026-10-01'), 0);
});

// 空清单守卫：不崩溃，返回空结构
test('buildSchedule 空清单返回空 rows 与零总天数', () => {
  const f = s.buildSchedule([], { mode: 'forward', startDate: '2026-10-01' });
  assert.deepEqual(f.rows, []);
  assert.equal(f.totalDays, 0);
  const b = s.buildSchedule([], { mode: 'backward', targetEndDate: '2026-12-31' });
  assert.deepEqual(b.rows, []);
  assert.equal(b.totalDays, 0);
});

test('criticalPath 空清单返回空链', () => {
  const cp = s.criticalPath([], '2026-10-01');
  assert.deepEqual(cp.chain, []);
  assert.deepEqual(cp.items, []);
});

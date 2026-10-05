/* tests/perf.test.js —— 运行性能冒烟护栏（Task 66）
 * 边界纪律：Node 里跑的时间和浏览器里不同，阈值在 spec 要求上放宽（搜索/排期/布局 200ms，
 * 已是"≤1 秒 / ≤300ms"验收口径的宽松版），只用来抓"突然慢了一个数量级"的退化。
 * 浏览器侧的真实测量（首屏 ≤300ms / 搜索 ≤200ms）见 scripts/perf-measure.js（无头浏览器）。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const proceduresIndex = require('../js/data/procedures-index.js').buildIndex([H.loadAllProcedures()]);
assert.equal(proceduresIndex.list.length, 40, '全量登记应为 40 条');

const T = 200; // ms，宽松阈值

test('全量搜索（40 手续 + 34 模板 + 27 原因 + 2 平台）平均 < 200ms', () => {
  const search = require('../js/logic/search.js');
  const data = {
    proceduresIndex: proceduresIndex,
    templatesIndex: { list: require('../js/data/templates-index.js').RAW },
    rejectReasons: require('../js/data/reject-reasons.js'),
    platforms: require('../js/data/platforms.js'),
  };
  const idx = search.buildSearchIndex(data);
  assert.equal(idx.length, 40 + 34 + 27 + 2, '检索项总数应为 103');
  const t0 = Date.now();
  const N = 20;
  for (let i = 0; i < N; i++) search.search('施工', { index: idx });
  const dt = (Date.now() - t0) / N;
  assert.ok(dt < T, '平均 ' + dt.toFixed(1) + 'ms');
});

test('排期计算 40 项平均 < 200ms', () => {
  const sc = require('../js/logic/schedule.js');
  const t0 = Date.now();
  const N = 20;
  for (let i = 0; i < N; i++) sc.buildSchedule(proceduresIndex.list, { mode: 'forward', startDate: '2026-10-01' });
  const dt = (Date.now() - t0) / N;
  assert.ok(dt < T, '平均 ' + dt.toFixed(1) + 'ms');
});

test('流程图布局 40 节点平均 < 200ms', () => {
  const flow = require('../js/logic/flow.js');
  const t0 = Date.now();
  const N = 20;
  for (let i = 0; i < N; i++) flow.buildFlowSvg(flow.flowLayout(proceduresIndex));
  const dt = (Date.now() - t0) / N;
  assert.ok(dt < T, '平均 ' + dt.toFixed(1) + 'ms');
});

test('估算迭代求解 < 50ms 且收敛轮数 ≤ 20', () => {
  const e = require('../js/logic/estimate.js');
  const t0 = Date.now();
  const r = e.calcEstimate({ 工程费用: 20000 });
  const dt = Date.now() - t0;
  assert.ok(dt < 50, '耗时 ' + dt + 'ms');
  assert.ok(r.iterations <= 20, '迭代 ' + r.iterations + ' 轮，超过终止上限 20');
  assert.ok(r.items.length > 0);
});

test('PPTX 生成 8 页 < 500ms', () => {
  const P = require('../js/logic/pptx.js');
  const slides = [{ layout: 'title', title: 'T', subtitle: 'S' }];
  for (let i = 0; i < 7; i++) slides.push({ title: '第' + (i + 2) + '页', bullets: ['a', 'b', 'c', 'd', 'e'] });
  const t0 = Date.now();
  const bytes = P.buildPptx(slides);
  const dt = Date.now() - t0;
  assert.ok(dt < 500, '耗时 ' + dt + 'ms');
  assert.ok(bytes.length > 3000);
});

/* tests/stage5.integration.test.js —— 阶段五集成验收（Task 49）：
   排期 / 甘特 / 招标 / 估算四模块共用同一份全量清单，必须互相自洽 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const tender = H.req('js/logic/tender.js');
const schedule = H.req('js/logic/schedule.js');
const estimate = H.req('js/logic/estimate.js');
const gantt = H.req('js/views/gantt.js');
const vs = H.req('js/views/v-schedule.js');
const ve = H.req('js/views/v-estimate.js');

// 用真实数据装配 index（与阶段二同一入口）
const lists = [
  H.req('js/data/procedures-01-lixiang.js'), H.req('js/data/procedures-02-yongdi.js'),
  H.req('js/data/procedures-03-guihua.js'),  H.req('js/data/procedures-04-pingjia.js'),
  H.req('js/data/procedures-05-zhaobiao.js'), H.req('js/data/procedures-06-shigong.js'),
  H.req('js/data/procedures-07-jungong.js')
];
const buildIndex = H.req('js/data/procedures-index.js').buildIndex;
const index = buildIndex(lists);

test('真实全量清单排期不抛错且总天数合理', () => {
  const v = vs.buildView(index, { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' });
  assert.equal(v.rows.length, index.list.length);
  // 总天数由数据 durationDays / duration 字符串驱动（关键链 266 天），
  // 下限防「工期全丢成 1 天」，上限防「依赖写错成全串行」
  assert.ok(v.totalDays > 180, '40 项手续至少半年，实际 ' + v.totalDays);
  assert.ok(v.totalDays < 365 * 8, '不应超过 8 年（说明依赖写错成串行），实际 ' + v.totalDays);
});

test('甘特图区间与排期区间同源', () => {
  const v = vs.buildView(index, { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' });
  const lay = gantt.ganttLayout(v.rows, v.range);
  assert.equal(lay.length, v.rows.length);
  assert.ok(lay.every((l) => l.left >= 0 && l.left <= 100));
  assert.ok(lay.every((l) => l.left + l.width <= 100.01), '所有条都不应超出右边界');
});

test('关键路径长度不超过总项数且至少一项', () => {
  const v = vs.buildView(index, { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' });
  assert.ok(v.critical.length >= 1 && v.critical.length <= index.list.length,
    '实际 ' + v.critical.length);
});

test('倒排后正排的区间终点等于目标竣工日', () => {
  const b = vs.buildView(index, { mode: 'backward', startDate: '2026-10-01', targetEndDate: '2027-06-30' });
  assert.equal(b.range.end, '2027-06-30');
  const f = vs.buildView(index, { mode: 'forward', startDate: b.range.start, targetEndDate: '2027-06-30' });
  assert.ok(f.range.end <= '2027-06-30', '从倒排出的最早开始日正推，不应晚于目标竣工日');
});

test('招标时间轴总时长与排期内核共用 addDays 语义', () => {
  const tl = tender.buildTimeline('施工', { startDate: '2026-10-01' });
  assert.equal(tl.endDate, tender.addDays('2026-10-01', tl.totalDays - 1));
  assert.equal(schedule.daysBetween('2026-10-01', tl.endDate), tl.totalDays - 1,
    'tender 与 schedule 的日期运算必须同语义');
});

test('估算：两亿级项目总投资落在合理区间', () => {
  const r = estimate.calcEstimate({ 工程费用: 20000 });
  assert.ok(r.projectTotal > 21000 && r.projectTotal < 24000, '实际: ' + r.projectTotal);
  const rows = ve.buildRows({ 工程费用: 20000 });
  assert.equal(rows.summary.projectTotal, r.projectTotal);
});

test('估算其他费占比在 5%~12% 之间（防止费率写错数量级）', () => {
  const r = estimate.calcEstimate({ 工程费用: 20000 });
  const pct = r.otherSubtotal / r.projectTotal * 100;
  assert.ok(pct > 5 && pct < 12, '实际: ' + pct.toFixed(2) + '%');
});

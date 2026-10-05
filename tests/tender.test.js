const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('../js/logic/tender.js');

test('addDays 基本运算', () => {
  assert.equal(t.addDays('2026-09-25', 1), '2026-09-26');
  assert.equal(t.addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(t.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(t.addDays('2026-09-25', 0), '2026-09-25');
});

test('addDays 跨月跨年边界', () => {
  assert.equal(t.addDays('2024-02-28', 1), '2024-02-29'); // 闰年
  assert.equal(t.addDays('2026-02-28', 1), '2026-03-01'); // 平年
});

test('addDays 负数回退', () => {
  assert.equal(t.addDays('2026-10-01', -1), '2026-09-30');
});

test('四类招标各生成一条时间轴', () => {
  const all = t.buildAllTimelines({ startDate: '2026-10-01' });
  assert.equal(all.length, 4);
  assert.deepEqual(all.map((x) => x.type), ['设计', '勘察', '监理', '施工']);
});

test('时间轴各环节首尾相接', () => {
  const tl = t.buildTimeline('施工', { startDate: '2026-10-01' });
  assert.equal(tl.phases[0].startDate, '2026-10-01');
  for (let i = 1; i < tl.phases.length; i++) {
    assert.equal(tl.phases[i].startDate, t.addDays(tl.phases[i - 1].endDate, 1));
  }
});

test('总天数等于各环节之和', () => {
  const tl = t.buildTimeline('设计', { startDate: '2026-10-01' });
  const sum = tl.phases.reduce((s, p) => s + p.days, 0);
  assert.equal(tl.totalDays, sum);
  assert.equal(tl.endDate, t.addDays('2026-10-01', sum - 1));
});

test('资格预审会拉长公告期', () => {
  const a = t.buildTimeline('施工', { startDate: '2026-10-01', preQualification: false });
  const b = t.buildTimeline('施工', { startDate: '2026-10-01', preQualification: true });
  assert.ok(b.totalDays > a.totalDays);
});

test('不同类型总天数不同（监理通常最短）', () => {
  const all = t.buildAllTimelines({ startDate: '2026-10-01' });
  const byType = {};
  all.forEach((x) => { byType[x.type] = x.totalDays; });
  assert.ok(byType['设计'] >= byType['监理']);
});

test('STATUS_MAP 与常量导出', () => {
  assert.deepEqual(t.STATUS_MAP, { '未开始': 'idle', '办理中': 'doing', '已办结': 'done' });
  assert.deepEqual(t.TENDER_TYPES, ['设计', '勘察', '监理', '施工']);
  assert.equal(t.PHASES.length, 7);
});

test('adviseMethod：技术复杂 → 资格预审', () => {
  const r = t.adviseMethod({ techComplexity: true, complexity: '高', urgency: '正常' });
  assert.equal(r.method, '资格预审');
  assert.ok(r.reasons.length >= 1);
});

test('adviseMethod：工期紧张 → 资格后审', () => {
  const r = t.adviseMethod({ urgency: '紧张', complexity: '中' });
  assert.equal(r.method, '资格后审');
});

test('adviseMethod：条件中性默认资格后审', () => {
  assert.equal(t.adviseMethod({}).method, '资格后审');
});

test('adviseMethod：给出周期天数与关键节点', () => {
  const r = t.adviseMethod({ urgency: '紧张' });
  assert.ok(r.periodDays > 0);
  assert.ok(r.keyNodes.length >= 5);
  assert.ok(r.keyNodes.every((n) => typeof n.days === 'number'));
});

test('adviseMethod：预审周期必然长于后审（同类型）', () => {
  const pre = t.adviseMethod({ techComplexity: true });
  const post = t.adviseMethod({ techComplexity: false });
  assert.ok(pre.periodDays > post.periodDays);
});

test('adviseMethod：特殊要求触发预审并给出风险提示', () => {
  const r = t.adviseMethod({ hasSpecialRequirements: true });
  assert.equal(r.method, '资格预审');
  assert.ok(r.risks.some((x) => x.includes('周期')));
});

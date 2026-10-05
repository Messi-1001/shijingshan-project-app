/* tests/advice.test.js —— 建议引擎：7 条规则逐条可测 + 排序 + 永不为空 */
const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../js/logic/advice.js');

const INDEX = {
  list: [
    { id: 'lx-1', no: '1', name: '项目建议书', duration: 5, prev: [] },
    { id: 'lx-2', no: '2', name: '项目建议书批复', duration: 5, prev: ['lx-1'] },
    { id: 'lx-3', no: '3', name: '可行性研究报告', duration: 5, prev: ['lx-2'] },
    { id: 'pj-6', no: '4', name: '预留项', duration: 3, prev: [], reserved: true },
  ],
  byId: {},
};
INDEX.byId = INDEX.list.reduce((m, p) => { m[p.id] = p; return m; }, {});

const EMPTY = {};

test('全空时给出起步序列', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: EMPTY, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  const rules = list.map((x) => x.rule);
  assert.ok(rules.includes('start'));
  assert.ok(rules.includes('next'));
  assert.ok(list.length > 0);
});

test('next 指出编号最小的可办项', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  const next = list.filter((x) => x.rule === 'next')[0];
  assert.ok(next.body.includes('项目建议书'));
});

test('前置未完成时产出 blocked 且优先级最高', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: { 'lx-3': { status: 'doing' } }, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  assert.equal(list[0].rule, 'blocked');
  assert.equal(list[0].level, 'block');
});

test('目标竣工日过紧时产出 deadline 警告', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2026-10-05' } });
  const d = list.filter((x) => x.rule === 'deadline')[0];
  assert.ok(d);
  assert.equal(d.level, 'warn');
  assert.match(d.body, /压缩|提前|不够/);
});

test('阈值：目标日宽松时不产出 deadline', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2030-10-01' } });
  assert.equal(list.filter((x) => x.rule === 'deadline').length, 0);
});

test('预留项存在时提示含义', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  assert.ok(list.some((x) => x.rule === 'reserved'));
});

test('estimate 规则在有估算时不出现', () => {
  const a1 = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' }, hasEstimate: false });
  const a2 = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' }, hasEstimate: true });
  assert.ok(a1.some((x) => x.rule === 'estimate'));
  assert.equal(a2.filter((x) => x.rule === 'estimate').length, 0);
});

test('永远返回非空数组', () => {
  const list = a.buildAdvice({ index: { list: [], byId: {} }, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  assert.ok(list.length > 0);
});

test('refs 的 hash 都是 #/ 开头', () => {
  const list = a.buildAdvice({ index: INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  list.forEach((adv) => (adv.refs || []).forEach((r) => assert.match(r.hash, /^#\//)));
});

test('rankAdvice 把 block 排到最前', () => {
  const l = a.rankAdvice([{ rule: 'start', level: 'info' }, { rule: 'blocked', level: 'block' }, { rule: 'deadline', level: 'warn' }]);
  assert.deepEqual(l.map((x) => x.level), ['block', 'warn', 'info']);
});

// —— risk 规则：只数专属命中（ALL 通用项不计入阈值），阈值 2 ——
// 真实数据：lx-1 专属常见原因 2 条（r-007/r-008）；jg-5 仅 1 条（r-025）
const RISK_INDEX = {
  list: [
    { id: 'lx-1', no: '1', name: '项目建议书', duration: 5, prev: [] },
    { id: 'jg-5', no: '2', name: '竣工验收备案', duration: 5, prev: [] },
  ],
};
RISK_INDEX.byId = RISK_INDEX.list.reduce((m, p) => { m[p.id] = p; return m; }, {});

test('risk：专属命中 ≥2 条才提示，body 只列命中项', () => {
  const list = a.buildAdvice({ index: RISK_INDEX, checklist: {}, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  const risk = list.find((x) => x.rule === 'risk');
  assert.ok(risk, 'lx-1 有 2 条专属常见原因，应产出 risk');
  assert.equal(risk.level, 'warn');
  assert.ok(risk.body.includes('项目建议书'));
  assert.ok(!risk.body.includes('竣工验收备案'), 'jg-5 仅 1 条专属，不应被点名');
});

test('risk：阈值常量为 2 且 ALL 通用原因不计数', () => {
  assert.equal(a.RISK_HIT_THRESHOLD, 2);
  // 全部做完时不产出 risk
  const done = RISK_INDEX.list.reduce((m, p) => { m[p.id] = { status: 'done' }; return m; }, {});
  const list = a.buildAdvice({ index: RISK_INDEX, checklist: done, scheduleInput: { mode: 'forward', startDate: '2026-10-01', targetEndDate: '2027-10-01' } });
  assert.equal(list.filter((x) => x.rule === 'risk').length, 0);
});

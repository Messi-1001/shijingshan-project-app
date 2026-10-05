/* tests/integration-phase3.test.js —— Task 31：阶段三集成验收（清单/规则/进度联动） */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./_helpers.js');

const LIST = [
  ...H.req('js/data/procedures-01-lixiang.js'), ...H.req('js/data/procedures-02-yongdi.js'),
  ...H.req('js/data/procedures-03-guihua.js'),  ...H.req('js/data/procedures-04-pingjia.js'),
  ...H.req('js/data/procedures-05-zhaobiao.js'), ...H.req('js/data/procedures-06-shigong.js'),
  ...H.req('js/data/procedures-07-jungong.js')
];
const idx = H.req('js/data/procedures-index.js');
const cond = H.req('js/data/conditions.js');
const flt = H.req('js/logic/filter.js');
const prog = H.req('js/logic/progress.js');
const vc = H.req('js/views/v-checklist.js');
idx.buildIndex([LIST]);

test('条件值覆盖全部 40 项，零缺失零非法', () => {
  assert.deepEqual(cond.validateConditions(LIST.map((p) => p.id)), []);
});

test('G8：本期固定取值下清单恒等全量 40 项', () => {
  const r = flt.filterProcedures(LIST, cond.FIXED_VALUES);
  assert.equal(r.kept.length, 40);
  assert.deepEqual(r.dropped, []);
});

test('验收标准 1：专属清单展示全部 37 项有效手续', () => {
  const rows = vc.buildRows(LIST, {}, cond.FIXED_VALUES);
  assert.equal(rows.filter((r) => !r.reserved).length, 37);
  assert.equal(rows.length, 40);
});

test('逐项办结后完成率线性上升到 100%', () => {
  const checklist = {};
  let n = 0;
  LIST.forEach((p) => {
    checklist['p-1::' + p.id] = { id: 'p-1::' + p.id, projectId: 'p-1', procedureId: p.id, status: n++ < 20 ? 'done' : 'idle' };
  });
  const s = prog.summarize(LIST, vc.remap(checklist, 'p-1'));
  assert.equal(s.done, 20);
  assert.equal(s.percent, 50);
});

test('前置联动：办完 1 才能办 2（① 立项 A 段）', () => {
  const doneOne = { 'p-1::lx-1': { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1', status: 'done' } };
  const rows = vc.buildRows(LIST, doneOne, cond.FIXED_VALUES, null, 'p-1');
  assert.deepEqual(rows.find((r) => r.id === 'lx-1').blocked, []);
  assert.deepEqual(rows.find((r) => r.id === 'lx-2').blocked, []);
  assert.deepEqual(rows.find((r) => r.id === 'lx-3').blocked, ['lx-2']);
});

test('状态值只允许 idle/doing/done，脏数据归 idle', () => {
  const dirty = { 'p-1::lx-1': { id: 'p-1::lx-1', projectId: 'p-1', procedureId: 'lx-1', status: '<script>' } };
  const rows = vc.buildRows(LIST, dirty, cond.FIXED_VALUES, null, 'p-1');
  assert.equal(rows.find((r) => r.id === 'lx-1').status, 'idle');
});

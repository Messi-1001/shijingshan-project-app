/* tests/state.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../js/core/state.js');
const vp = require('../js/views/v-projects.js');

test('state 初始与 set 合并', () => {
  const s = state.createState({ projects: [], currentId: null });
  assert.deepEqual(s.get().projects, []);
  s.set({ currentId: 'p-1' });
  assert.equal(s.get().currentId, 'p-1');
  assert.deepEqual(s.get().projects, []);
});

test('state.get 返回浅拷贝，外部改动不影响内部', () => {
  const s = state.createState({ a: 1 });
  const snap = s.get();
  snap.a = 99;
  assert.equal(s.get().a, 1);
});

test('subscribe 收到通知且可退订', () => {
  const s = state.createState({ n: 0 });
  const seen = [];
  const off = s.subscribe((st) => seen.push(st.n));
  s.set({ n: 1 });
  s.set({ n: 2 });
  off();
  s.set({ n: 3 });
  assert.deepEqual(seen, [1, 2]);
});

test('select 取值', () => {
  const s = state.createState({ projects: [{ id: 'a' }, { id: 'b' }], currentId: 'b' });
  assert.equal(s.select((st) => st.projects.length), 2);
});

test('createProjectObject 带入四维固定默认值', () => {
  const obj = vp.createProjectObject({ name: 'X 学校', unit: '某代建' });
  assert.equal(obj.name, 'X 学校');
  assert.equal(obj.buildNature, '新建');
  assert.equal(obj.investScale, '3000万以上');
  assert.equal(obj.fundSource, '财政资金');
  assert.equal(obj.approvalLevel, '市级');
  assert.equal(typeof obj.id, 'string');
  assert.ok(obj.id.length > 0);
});

test('validateProject 必填校验', () => {
  const errs = vp.validateProject(vp.createProjectObject({}));
  assert.ok(errs.some((e) => e.includes('项目名称')));
  assert.ok(errs.some((e) => e.includes('建设单位')));
});

test('validateProject 通过时返回空数组', () => {
  const errs = vp.validateProject(vp.createProjectObject({ name: 'A', unit: 'B' }));
  assert.deepEqual(errs, []);
});

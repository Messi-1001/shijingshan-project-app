/* tests/schema.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../js/data/schema.js');

test('七个板块定义正确', () => {
  assert.equal(s.SECTION_ORDER.length, 7);
  assert.deepEqual(Object.keys(s.SECTIONS), s.SECTION_ORDER);
  assert.equal(s.SECTIONS.lixiang.from, 1);
  assert.equal(s.SECTIONS.lixiang.to, 7);
  assert.equal(s.SECTIONS.shigong.from, 34);
  assert.equal(s.SECTIONS.shigong.to, 34);
  assert.equal(s.SECTIONS.jungong.from, 35);
  assert.equal(s.SECTIONS.jungong.to, 40);
});

test('createProcedure 补默认值', () => {
  const p = s.createProcedure({ id: 'lx-1', name: '线下沟通', section: 'lixiang' });
  assert.equal(p.no, null);
  assert.deepEqual(p.prev, []);
  assert.deepEqual(p.materials, []);
  assert.deepEqual(p.templates, []);
  assert.equal(p.parallel, false);
  assert.equal(p.durationDays, null);
  assert.equal(p.source, '✅');
});

test('validateProcedure 报缺项', () => {
  const errs = s.validateProcedure({ id: '', name: '', section: '不存在' });
  assert.ok(errs.some((e) => e.includes('id')));
  assert.ok(errs.some((e) => e.includes('name')));
  assert.ok(errs.some((e) => e.includes('section')));
});

test('validateProcedure 对合规项返回空数组', () => {
  const p = s.createProcedure({ id: 'lx-1', name: '线下沟通', section: 'lixiang' });
  assert.deepEqual(s.validateProcedure(p), []);
});

test('validateProcedureSet 抓出编号重复', () => {
  const a = s.createProcedure({ id: 'a', name: 'A', section: 'lixiang' }); a.no = 1;
  const b = s.createProcedure({ id: 'b', name: 'B', section: 'lixiang' }); b.no = 1;
  const errs = s.validateProcedureSet([a, b]);
  assert.ok(errs.some((e) => e.includes('编号重复')), errs.join('|'));
});

test('validateProcedureSet 抓出 prev 指向不存在的手续', () => {
  const a = s.createProcedure({ id: 'a', name: 'A', section: 'lixiang' });
  a.no = 1; a.prev = ['不存在'];
  const errs = s.validateProcedureSet([a]);
  assert.ok(errs.some((e) => e.includes('前置')), errs.join('|'));
});

test('validateProcedureSet 抓出环', () => {
  const a = s.createProcedure({ id: 'a', name: 'A', section: 'lixiang' }); a.no = 1; a.prev = ['b'];
  const b = s.createProcedure({ id: 'b', name: 'B', section: 'lixiang' }); b.no = 2; b.prev = ['a'];
  const errs = s.validateProcedureSet([a, b]);
  assert.ok(errs.some((e) => e.includes('环')), errs.join('|'));
});

test('validateProcedureSet 抓出编号不连续', () => {
  const a = s.createProcedure({ id: 'a', name: 'A', section: 'lixiang' }); a.no = 1;
  const b = s.createProcedure({ id: 'b', name: 'B', section: 'lixiang' }); b.no = 3;
  const errs = s.validateProcedureSet([a, b]);
  assert.ok(errs.some((e) => e.includes('连续')), errs.join('|'));
});

test('CLOSING_NOTE 有内容且不含编号', () => {
  assert.ok(s.CLOSING_NOTE.length > 10);
  assert.equal(/\d+\s*项/.test(s.CLOSING_NOTE), false);
});

/* tests/v-tender.test.js —— 招标计划页：meta 持久化辅助纯函数（defaultInput / mergeInput，G22） */
const test = require('node:test');
const assert = require('node:assert/strict');
const vt = require('../js/views/v-tender.js');

test('defaultInput 默认值合法且无 startDate（由 render 按当天补齐）', () => {
  const d = vt.defaultInput();
  assert.equal(d.urgency, '正常');
  assert.equal(d.complexity, '中');
  assert.equal(d.techComplexity, false);
  assert.equal(d.hasSpecialRequirements, false);
  assert.equal(d.startDate, '');
});

test('mergeInput：meta 表记录读回后完整覆盖默认值（刷新恢复）', () => {
  const saved = { startDate: '2026-09-01', urgency: '紧张', complexity: '高',
    techComplexity: true, hasSpecialRequirements: true };
  const m = vt.mergeInput(saved);
  assert.deepEqual(m, saved);
});

test('mergeInput：脏数据 / 缺字段回退默认值，不产生脏状态', () => {
  const m = vt.mergeInput({ startDate: 123, urgency: '随便填', complexity: null,
    techComplexity: 'true', hasSpecialRequirements: undefined });
  assert.equal(m.startDate, '', '非法 startDate 回退空（render 再按当天补齐）');
  assert.equal(m.urgency, '正常');
  assert.equal(m.complexity, '中');
  assert.equal(m.techComplexity, false, '非布尔 true 一律按 false');
  assert.equal(m.hasSpecialRequirements, false);
  assert.deepEqual(vt.mergeInput(null), vt.defaultInput(), '无记录时即默认值');
  assert.deepEqual(vt.mergeInput('垃圾字符串'), vt.defaultInput());
});

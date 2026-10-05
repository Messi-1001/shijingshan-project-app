/* tests/materials.test.js —— 材料清单汇总（同名合并/按提供方分组/缺项告警） */
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../js/logic/materials.js');

const L = [
  { no: 1, id: 'a', name: 'A 手续', materials: [
    { name: '营业执照副本', copies: 2, seal: '加盖建设单位公章', provider: '建设单位' },
    { name: '申请表', copies: 1, seal: '', provider: '建设单位' }
  ]},
  { no: 2, id: 'b', name: 'B 手续', materials: [
    { name: '营业执照副本', copies: 3, seal: '加盖建设单位公章', provider: '建设单位' }
  ]},
  { no: 3, id: 'c', name: 'C 手续', materials: [] }
];

test('collect 拍平所有材料并带上手续来源', () => {
  const rows = m.collect(L);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].procedureNo, 1);
  assert.equal(rows[0].procedureName, 'A 手续');
});

test('collect 支持只取指定手续', () => {
  assert.equal(m.collect(L, { onlyIds: ['b'] }).length, 1);
});

test('mergeDuplicates 同名材料份数相加', () => {
  const rows = m.collect(L);
  const merged = m.mergeDuplicates(rows);
  const biz = merged.find((x) => x.name === '营业执照副本');
  assert.equal(biz.copies, 5);
  assert.deepEqual(biz.from.sort(), ['A 手续', 'B 手续']);
});

test('mergeDuplicates 盖章要求并集去重', () => {
  const merged = m.mergeDuplicates([
    { name: 'X', copies: 1, seal: '盖章A', provider: 'P', procedureName: '一' },
    { name: 'X', copies: 1, seal: '盖章B', provider: 'P', procedureName: '二' },
    { name: 'X', copies: 1, seal: '盖章A', provider: 'P', procedureName: '三' }
  ]);
  assert.equal(merged[0].seal, '盖章A、盖章B');
});

test('groupByProvider 按提供方分组', () => {
  const g = m.groupByProvider(m.collect(L));
  assert.equal(g.length, 1);
  assert.equal(g[0].provider, '建设单位');
  assert.equal(g[0].items.length, 2); // 申请表 + 合并后的营业执照
});

test('warnings 报出缺份数与缺盖章', () => {
  const w = m.warnings([{ name: '申请表', copies: null, seal: '', provider: '建设单位' }]);
  assert.ok(w.some((x) => x.includes('份数')));
  assert.ok(w.some((x) => x.includes('盖章')));
});

test('空输入不炸', () => {
  assert.deepEqual(m.collect([]), []);
  assert.deepEqual(m.mergeDuplicates([]), []);
  assert.deepEqual(m.groupByProvider([]), []);
});

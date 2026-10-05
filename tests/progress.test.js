/* tests/progress.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../js/logic/progress.js');

function P(id, no, section, prev) {
  return { id, no, section, name: id, prev: prev || [] };
}
const L = [
  P('a', 1, 'lixiang', []),
  P('b', 2, 'lixiang', ['a']),
  P('c', 3, 'yongdi', ['b'])
];

test('summarize 计数与完成率', () => {
  const s = p.summarize(L, { a: { status: 'done' }, b: { status: 'doing' } });
  assert.equal(s.total, 3);
  assert.equal(s.done, 1);
  assert.equal(s.doing, 1);
  assert.equal(s.idle, 1);
  assert.equal(s.percent, 33);
});

test('summarize 空清单不炸', () => {
  const s = p.summarize([], {});
  assert.equal(s.total, 0);
  assert.equal(s.percent, 0);
});

test('summarize 按板块给出分项', () => {
  const s = p.summarize(L, { a: { status: 'done' } });
  const lx = s.bySection.find((x) => x.section === 'lixiang');
  assert.equal(lx.total, 2);
  assert.equal(lx.done, 1);
  assert.equal(lx.percent, 50);
});

test('nextUp 返回编号最小且前置已完成的未办项', () => {
  const n = p.nextUp(L, { a: { status: 'done' } });
  assert.equal(n.id, 'b');
});

test('nextUp 全都办完返回 null', () => {
  const n = p.nextUp(L, { a: { status: 'done' }, b: { status: 'done' }, c: { status: 'done' } });
  assert.equal(n, null);
});

test('crossSectionBlockers 列出等待中的项与原因', () => {
  const b = p.crossSectionBlockers(L, { a: { status: 'doing' } });
  assert.ok(b.some((x) => x.id === 'b' && x.waitingFor.includes('a')));
});
